import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_CONFIG = {url: 'https://nstnkxtxlqelwnefkmaj.supabase.co', anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4'};
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
let selectedExamId = null, countdownInterval = null, timerInterval = null, timerSeconds = 1500, timerRunning = false;

document.addEventListener('DOMContentLoaded', () => initializeApp());
async function initializeApp() {
    setTimeout(() => document.getElementById('loadingScreen').style.display = 'none', 2000);
    loadTheme(); loadProfile(); await loadExams(); await loadDailyQuote(); await loadPersistentNotification();
    setupEventListeners(); checkConnection(); checkNewYear();
    const snowEnabled = await loadSnowSettings();
    if (snowEnabled) createSnowflakes();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
    console.log('Exam Master initialized!');
}
async function loadSnowSettings() {
    try {const {data} = await supabase.from('settings').select('value').eq('key','snowflakes').single(); return data ? data.value : false;}
    catch {return false;}
}
function loadTheme() {document.body.setAttribute('data-theme', localStorage.getItem('exam-master-theme') || 'default');}
function setTheme(t) {document.body.setAttribute('data-theme', t); localStorage.setItem('exam-master-theme', t); closeThemePanel(); showToast(`Theme changed to ${t}! ✨`);}
function toggleThemePanel() {document.getElementById('themePanel').classList.toggle('active'); document.getElementById('profilePanel').classList.remove('active');}
function loadProfile() {
    const name = localStorage.getItem('exam-master-name') || '';
    const avatar = localStorage.getItem('exam-master-avatar') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student';
    document.getElementById('userName').value = name;
    document.getElementById('currentAvatar').src = avatar;
}
function toggleProfile() {document.getElementById('profilePanel').classList.toggle('active'); document.getElementById('themePanel').classList.remove('active');}
function changeAvatar() {
    const seed = Math.random().toString(36).substring(7);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    document.getElementById('currentAvatar').src = avatar;
    localStorage.setItem('exam-master-avatar', avatar);
    showToast('Avatar changed! 🎨');
}
function saveProfile() {localStorage.setItem('exam-master-name', document.getElementById('userName').value.trim()); toggleProfile(); showToast('Profile saved! ✅');}
async function loadExams() {
    try {
        const {data} = await supabase.from('exams').select('*').eq('status','enabled').order('is_featured',{ascending:false}).order('exam_date',{ascending:true});
        if (data && data.length > 0) {renderExamButtons(data); const featured = data.find(e=>e.is_featured) || data[0]; selectExam(featured.id, data);}
        else loadExamsFromLocalStorage();
    } catch {loadExamsFromLocalStorage();}
}
function loadExamsFromLocalStorage() {
    const defaultExams = [
        {id:1,batch_name:'2025 A/L',exam_year:'2025',exam_type:'A/L',exam_date:'2025-08-01T09:00:00',icon:'📚',color:'#ff6b6b'},
        {id:2,batch_name:'2026 A/L',exam_year:'2026',exam_type:'A/L',exam_date:'2026-08-01T09:00:00',icon:'🎯',color:'#667eea',is_featured:true},
        {id:3,batch_name:'2027 A/L',exam_year:'2027',exam_type:'A/L',exam_date:'2027-08-01T09:00:00',icon:'🎓',color:'#11998e'},
        {id:4,batch_name:'2025 O/L',exam_year:'2025',exam_type:'O/L',exam_date:'2025-12-01T09:00:00',icon:'📖',color:'#feca57'}
    ];
    renderExamButtons(defaultExams); selectExam(2, defaultExams);
}
function renderExamButtons(exams) {
    const grid = document.getElementById('examGrid'); grid.innerHTML = '';
    exams.forEach(exam => {
        const btn = document.createElement('button'); btn.className = 'exam-btn'; btn.setAttribute('data-exam-id', exam.id);
        btn.style.setProperty('--exam-color', exam.color || '#667eea');
        btn.innerHTML = `<span class="exam-icon">${exam.icon || '📚'}</span><span class="exam-label">${exam.exam_year} ${exam.exam_type}</span>`;
        btn.addEventListener('click', () => selectExam(exam.id, exams)); grid.appendChild(btn);
    });
}
function selectExam(id, exams) {
    selectedExamId = id;
    document.querySelectorAll('.exam-btn').forEach(b=>b.classList.remove('active'));
    document.querySelector(`.exam-btn[data-exam-id="${id}"]`).classList.add('active');
    const exam = exams.find(e=>e.id===id);
    document.getElementById('examBadgeText').textContent = exam.batch_name;
    startCountdown(exam.exam_date);
}
function startCountdown(targetDate) {
    clearInterval(countdownInterval);
    const target = new Date(targetDate).getTime();
    countdownInterval = setInterval(() => {
        const distance = target - new Date().getTime();
        if (distance < 0) {clearInterval(countdownInterval); showToast('Exam day has arrived! Good luck! 🎉'); return;}
        const d = Math.floor(distance/(1000*60*60*24));
        const h = Math.floor((distance%(1000*60*60*24))/(1000*60*60));
        const m = Math.floor((distance%(1000*60*60))/(1000*60));
        const s = Math.floor((distance%(1000*60))/1000);
        document.getElementById('days').textContent = pad(d);
        document.getElementById('hours').textContent = pad(h);
        document.getElementById('minutes').textContent = pad(m);
        document.getElementById('seconds').textContent = pad(s);
    }, 1000);
}
function pad(n) {return n<10 ? '0'+n : n;}
async function loadDailyQuote() {
    try {
        const {data} = await supabase.from('quotes').select('*').eq('is_active',true).order('created_at',{ascending:false}).limit(1);
        document.getElementById('dailyQuote').textContent = data && data[0] ? `${data[0].text} ${data[0].author ? '- '+data[0].author : ''}` : "Believe you can and you're halfway there.";
    } catch {document.getElementById('dailyQuote').textContent = "Believe you can and you're halfway there.";}
}
async function loadPersistentNotification() {
    try {
        const {data} = await supabase.from('notifications').select('*').eq('is_active',true).eq('show_until_dismissed',true).order('created_at',{ascending:false}).limit(1);
        if (data && data[0]) {
            document.getElementById('popupTitle').textContent = data[0].title;
            document.getElementById('popupMessage').textContent = data[0].message;
            if (data[0].image_url) {document.getElementById('popupImg').src = data[0].image_url; document.getElementById('popupImage').style.display = 'block';}
            if (data[0].pdf_url) {document.getElementById('popupPdfBtn').href = data[0].pdf_url; document.getElementById('popupButtons').style.display = 'block';}
            document.getElementById('persistentPopup').style.display = 'block';
        }
    } catch {}
}
function closePopup() {document.getElementById('persistentPopup').style.display = 'none';}
function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {pauseTimer(); showToast('Timer complete! Great job! 🎉');}
    }, 1000);
}
function pauseTimer() {timerRunning = false; clearInterval(timerInterval); document.getElementById('startBtn').style.display = 'inline-block'; document.getElementById('pauseBtn').style.display = 'none';}
function resetTimer() {pauseTimer(); timerSeconds = 1500; updateTimerDisplay();}
function updateTimerDisplay() {
    const m = Math.floor(timerSeconds/60); const s = timerSeconds%60;
    document.getElementById('timerDisplay').textContent = `${pad(m)}:${pad(s)}`;
    const progress = document.getElementById('timerProgress');
    const percent = (timerSeconds/1500)*565;
    progress.style.strokeDashoffset = 565 - percent;
}
function createSnowflakes() {
    const container = document.getElementById('snowflakes');
    for (let i = 0; i < 50; i++) {
        const s = document.createElement('div'); s.className = 'snowflake'; s.innerHTML = '❄️';
        s.style.left = Math.random()*100 + '%';
        s.style.animationDuration = (Math.random()*3+2)+'s';
        s.style.animationDelay = Math.random()*5+'s';
        s.style.fontSize = (Math.random()*10+10)+'px';
        s.style.opacity = Math.random();
        container.appendChild(s);
    }
}
function checkNewYear() {
    const now = new Date();
    if (now.getMonth() === 0 && now.getDate() === 1) {
        showToast('Happy New Year! Best wishes for your exams! 🎊');
    }
}
function shareOn(p) {
    const url = encodeURIComponent(location.href);
    const text = encodeURIComponent('Check out Exam Master - Study companion for A/L & O/L exams! 📚');
    let shareUrl;
    if (p==='whatsapp') shareUrl = `https://wa.me/?text=${text}%20${url}`;
    if (p==='facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (p==='twitter') shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(shareUrl, '_blank');
}
function copyLink() {navigator.clipboard.writeText(location.href); showToast('Link copied! 📋');}
function checkConnection() {
    const status = document.getElementById('connectionStatus');
    function update() {status.innerHTML = navigator.onLine ? '<div class="status-dot online"></div><span>Connected</span>' : '<div class="status-dot offline"></div><span>Offline</span>';}
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
}
function showToast(msg) {
    const toast = document.getElementById('toast'); toast.textContent = msg; toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
function scrollToTop() {window.scrollTo({top:0,behavior:'smooth'});}
function setupEventListeners() {
    document.getElementById('aiInput').addEventListener('keypress', e => {if (e.key==='Enter') sendAIMessage();});
    document.addEventListener('click', e => {
        const tp = document.getElementById('themePanel');
        const pp = document.getElementById('profilePanel');
        if (!tp.contains(e.target) && !e.target.closest('.icon-btn')) tp.classList.remove('active');
        if (!pp.contains(e.target) && !e.target.closest('.icon-btn')) pp.classList.remove('active');
    });
}
function sendAIMessage() { /* AI part එක ඔයාට ඕන නැත්නම් මේක skip කරන්න */ }
window.setTheme=setTheme; window.toggleThemePanel=toggleThemePanel; window.toggleProfile=toggleProfile;
window.changeAvatar=changeAvatar; window.saveProfile=saveProfile; window.closePopup=closePopup;
window.startTimer=startTimer; window.pauseTimer=pauseTimer; window.resetTimer=resetTimer;
window.shareOn=shareOn; window.copyLink=copyLink; window.scrollToTop=scrollToTop;
