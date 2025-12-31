// ==========================================
// EXAM MASTER - Complete JavaScript
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==========================================
// CONFIGURATION
// ==========================================
const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT.supabase.co', // ඔබේ Supabase URL
    anonKey: 'YOUR_ANON_KEY_HERE' // ඔබේ anon key
};

const CLAUDE_API_KEY = 'YOUR_CLAUDE_API_KEY_HERE'; // ඔබේ Claude API key

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// ==========================================
// STATE
// ==========================================
let selectedExamId = null;
let countdownInterval = null;
let timerInterval = null;
let timerSeconds = 1500; // 25 minutes
let timerRunning = false;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 2000);

    // Load preferences
    loadTheme();
    loadProfile();
    
    // Initialize features
    await loadExams();
    await loadDailyQuote();
    await loadPersistentNotification();
    setupEventListeners();
    checkConnection();
    createSnowflakes();
    checkNewYear();
    
    console.log('🎓 Exam Master initialized!');
}

// ==========================================
// THEME MANAGEMENT
// ==========================================
function loadTheme() {
    const theme = localStorage.getItem('exam-master-theme') || 'default';
    document.body.setAttribute('data-theme', theme);
}

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('exam-master-theme', theme);
    closeThemePanel();
    showToast(`Theme changed to ${theme}! ✨`);
}

function toggleThemePanel() {
    const panel = document.getElementById('themePanel');
    const profilePanel = document.getElementById('profilePanel');
    profilePanel.classList.remove('active');
    panel.classList.toggle('active');
}

function closeThemePanel() {
    document.getElementById('themePanel').classList.remove('active');
}

// ==========================================
// PROFILE MANAGEMENT
// ==========================================
function loadProfile() {
    const name = localStorage.getItem('exam-master-name') || '';
    const avatar = localStorage.getItem('exam-master-avatar') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student';
    
    document.getElementById('userName').value = name;
    document.getElementById('currentAvatar').src = avatar;
}

function toggleProfile() {
    const panel = document.getElementById('profilePanel');
    const themePanel = document.getElementById('themePanel');
    themePanel.classList.remove('active');
    panel.classList.toggle('active');
}

function changeAvatar() {
    const seed = Math.random().toString(36).substring(7);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    document.getElementById('currentAvatar').src = avatar;
    localStorage.setItem('exam-master-avatar', avatar);
    showToast('Avatar changed! 🎨');
}

function saveProfile() {
    const name = document.getElementById('userName').value.trim();
    localStorage.setItem('exam-master-name', name);
    toggleProfile();
    showToast('Profile saved! ✅');
}

function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// ==========================================
// EXAM SELECTOR
// ==========================================
async function loadExams() {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('status', 'enabled')
            .order('is_featured', { ascending: false })
            .order('exam_date', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            renderExamButtons(data);
            // Select first exam (featured or first available)
            const featuredExam = data.find(e => e.is_featured) || data[0];
            selectExam(featuredExam.id, data);
        } else {
            // Fallback to localStorage
            loadExamsFromLocalStorage();
        }
    } catch (err) {
        console.error('Error loading exams:', err);
        loadExamsFromLocalStorage();
    }
}

function loadExamsFromLocalStorage() {
    const localExams = localStorage.getItem('exam-master-exams');
    if (localExams) {
        const exams = JSON.parse(localExams);
        const enabledExams = exams.filter(e => e.status === 'enabled');
        if (enabledExams.length > 0) {
            renderExamButtons(enabledExams);
            selectExam(enabledExams[0].id, enabledExams);
        }
    } else {
        // Default exams
        const defaultExams = [
            { id: 1, batch_name: '2025 A/L', exam_year: '2025', exam_type: 'A/L', exam_date: '2025-08-01T09:00:00', icon: '📚', color: '#ff6b6b' },
            { id: 2, batch_name: '2026 A/L', exam_year: '2026', exam_type: 'A/L', exam_date: '2026-08-01T09:00:00', icon: '🎯', color: '#667eea', is_featured: true },
            { id: 3, batch_name: '2027 A/L', exam_year: '2027', exam_type: 'A/L', exam_date: '2027-08-01T09:00:00', icon: '🎓', color: '#11998e' },
            { id: 4, batch_name: '2025 O/L', exam_year: '2025', exam_type: 'O/L', exam_date: '2025-12-01T09:00:00', icon: '📖', color: '#feca57' }
        ];
        renderExamButtons(defaultExams);
        selectExam(2, defaultExams);
    }
}

function renderExamButtons(exams) {
    const grid = document.getElementById('examGrid');
    grid.innerHTML = '';
    
    exams.forEach(exam => {
        const btn = document.createElement('button');
        btn.className = 'exam-btn';
        btn.setAttribute('data-exam-id', exam.id);
        btn.style.setProperty('--exam-color', exam.color || '#667eea');
        
        btn.innerHTML = `
            <span class="exam-icon">${exam.icon || '📚'}</span>
            <span class="exam-label">${exam.exam_year} ${exam.exam_type}</span>
        `;
        
        btn.addEventListener('click', () => selectExam(exam.id, exams));
        grid.appendChild(btn);
    });
}

function selectExam(examId, exams) {
    selectedExamId = examId;
    
    // Update active button
    document.querySelectorAll('.exam-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.getAttribute('data-exam-id')) === examId) {
            btn.classList.add('active');
        }
    });
    
    // Find exam data
    const exam = exams.find(e => e.id === examId);
    if (exam) {
        // Update badge
        document.getElementById('examBadgeText').textContent = exam.batch_name;
        
        // Start countdown
        startCountdown(exam.exam_date);
    }
}

// ==========================================
// COUNTDOWN
// ==========================================
function startCountdown(examDate) {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    const targetDate = new Date(examDate).getTime();
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;
        
        if (distance < 0) {
            document.getElementById('examBadgeText').textContent = 'Exam Day is Here! 🎉';
            setTimeValues(0, 0, 0, 0);
            clearInterval(countdownInterval);
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeValues(days, hours, minutes, seconds);
    }
    
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

function setTimeValues(days, hours, minutes, seconds) {
    document.getElementById('days').textContent = pad(days);
    document.getElementById('hours').textContent = pad(hours);
    document.getElementById('minutes').textContent = pad(minutes);
    document.getElementById('seconds').textContent = pad(seconds);
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// ==========================================
// DAILY QUOTE
// ==========================================
async function loadDailyQuote() {
    try {
        const { data, error } = await supabase
            .from('quotes')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
            const quote = data[dayOfYear % data.length];
            document.getElementById('dailyQuote').textContent = quote.text;
        } else {
            setDefaultQuote();
        }
    } catch (err) {
        console.error('Error loading quote:', err);
        setDefaultQuote();
    }
}

function setDefaultQuote() {
    const quotes = [
        "Success is the sum of small efforts repeated day in and day out.",
        "The expert in anything was once a beginner.",
        "Don't watch the clock; do what it does. Keep going.",
        "Dream it. Believe it. Build it."
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    document.getElementById('dailyQuote').textContent = quotes[dayOfYear % quotes.length];
}

// ==========================================
// PERSISTENT NOTIFICATION
// ==========================================
async function loadPersistentNotification() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .eq('show_until_dismissed', true)
            .order('priority', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            showPersistentPopup(data[0]);
        }
    } catch (err) {
        console.error('Error loading notification:', err);
    }
}

function showPersistentPopup(notification) {
    const popup = document.getElementById('persistentPopup');
    
    document.getElementById('popupTitle').textContent = notification.title;
    document.getElementById('popupMessage').textContent = notification.message;
    
    if (notification.image_url) {
        document.getElementById('popupImg').src = notification.image_url;
        document.getElementById('popupImage').style.display = 'block';
    } else {
        document.getElementById('popupImage').style.display = 'none';
    }
    
    if (notification.pdf_url) {
        const pdfBtn = document.getElementById('popupPdfBtn');
        pdfBtn.href = notification.pdf_url;
        pdfBtn.download = notification.pdf_filename || 'document.pdf';
        document.getElementById('popupButtons').style.display = 'block';
    } else {
        document.getElementById('popupButtons').style.display = 'none';
    }
    
    popup.style.display = 'flex';
}

function closePopup() {
    document.getElementById('persistentPopup').style.display = 'none';
}

// ==========================================
// AI ASSISTANT (Claude API)
// ==========================================
async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addAIMessage(message, 'user');
    input.value = '';
    
    // Show typing indicator
    addTypingIndicator();
    
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: message
                }]
            })
        });
        
        removeTypingIndicator();
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        const reply = data.content[0].text;
        
        addAIMessage(reply, 'bot');
    } catch (err) {
        console.error('AI Error:', err);
        removeTypingIndicator();
        addAIMessage('Sorry, I encountered an error. Please try again! 🙏', 'bot');
    }
}

function askAI(question) {
    document.getElementById('aiInput').value = question;
    sendAIMessage();
}

function addAIMessage(text, sender) {
    const chatBox = document.getElementById('aiChatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ai-message-${sender}`;
    
    msgDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
        </div>
        <div class="message-content">${text}</div>
    `;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addTypingIndicator() {
    const chatBox = document.getElementById('aiChatBox');
    const indicator = document.createElement('div');
    indicator.className = 'ai-message ai-message-bot typing-indicator';
    indicator.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    chatBox.appendChild(indicator);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// ==========================================
// STUDY TIMER
// ==========================================
function startTimer() {
    if (timerRunning) return;
    
    timerRunning = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            pauseTimer();
            showToast('Timer complete! Great job! 🎉');
            playNotificationSound();
        }
    }, 1000);
}

function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 1500;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = `${pad(minutes)}:${pad(seconds)}`;
    
    // Update progress circle
    const progress = document.getElementById('timerProgress');
    const percent = (timerSeconds / 1500) * 565;
    progress.style.strokeDashoffset = 565 - percent;
}

function playNotificationSound() {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Study Timer', {
            body: 'Your study session is complete!',
            icon: '/icon.png'
        });
    }
}

// ==========================================
// CHRISTMAS/NEW YEAR EFFECTS
// ==========================================
function createSnowflakes() {
    const month = new Date().getMonth();
    if (month === 11) { // December
        const container = document.getElementById('snowflakes');
        for (let i = 0; i < 50; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.innerHTML = '❄️';
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.animationDuration = (Math.random() * 3 + 2) + 's';
            snowflake.style.animationDelay = Math.random() * 5 + 's';
            snowflake.style.fontSize = (Math.random() * 10 + 10) + 'px';
            snowflake.style.opacity = Math.random();
            container.appendChild(snowflake);
        }
    }
}

function checkNewYear() {
    const now = new Date();
    if (now.getMonth() === 0 && now.getDate() === 1) {
        showToast('🎉 Happy New Year! Best wishes for your exams! 🎊');
        setTimeout(() => {
            createConfetti();
        }, 1000);
    }
}

function createConfetti() {
    // Simple confetti effect
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1'][Math.floor(Math.random() * 4)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.zIndex = '9999';
        confetti.style.borderRadius = '50%';
        document.body.appendChild(confetti);
        
        let pos = -10;
        const fall = setInterval(() => {
            pos += 5;
            confetti.style.top = pos + 'px';
            if (pos > window.innerHeight) {
                clearInterval(fall);
                confetti.remove();
            }
        }, 50);
    }
}

// ==========================================
// SHARING
// ==========================================
function shareOn(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out Exam Master - Study companion for A/L & O/L exams! 📚');
    
    let shareUrl;
    switch(platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${text}%20${url}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
            break;
    }
    
    window.open(shareUrl, '_blank');
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied! 📋');
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function checkConnection() {
    function updateStatus() {
        const status = document.getElementById('connectionStatus');
        if (navigator.onLine) {
            status.innerHTML = '<div class="status-dot online"></div><span>Connected</span>';
        } else {
            status.innerHTML = '<div class="status-dot offline"></div><span>Offline</span>';
        }
    }
    
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAbout() {
    showToast('About section coming soon! 📖');
}

function showPrivacy() {
    showToast('Privacy policy coming soon! 🔒');
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    // AI input enter key
    document.getElementById('aiInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendAIMessage();
        }
    });
    
    // Close panels on outside click
    document.addEventListener('click', (e) => {
        const themePanel = document.getElementById('themePanel');
        const profilePanel = document.getElementById('profilePanel');
        
        if (!themePanel.contains(e.target) && !e.target.closest('.icon-btn')) {
            themePanel.classList.remove('active');
        }
        
        if (!profilePanel.contains(e.target) && !e.target.closest('.icon-btn')) {
            profilePanel.classList.remove('active');
        }
    });
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================
window.setTheme = setTheme;
window.toggleThemePanel = toggleThemePanel;
window.toggleProfile = toggleProfile;
window.changeAvatar = changeAvatar;
window.saveProfile = saveProfile;
window.toggleMenu = toggleMenu;
window.closePopup = closePopup;
window.sendAIMessage = sendAIMessage;
window.askAI = askAI;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.shareOn = shareOn;
window.copyLink = copyLink;
window.scrollToTop = scrollToTop;
window.showAbout = showAbout;
window.showPrivacy = showPrivacy;

console.log('🎓 Exam Master loaded successfully!');
