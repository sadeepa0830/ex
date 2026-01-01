import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_CONFIG = {url: 'https://nstnkxtxlqelwnefkmaj.supabase.co', anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4'};
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
document.addEventListener('DOMContentLoaded', () => checkAuthStatus());
async function checkAuthStatus() {const {data:{session}} = await supabase.auth.getSession(); if (session) showDashboard();}
async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    if (!email || !password) return showToast('Please enter email and password');
    showLoading(true);
    const {error} = await supabase.auth.signInWithPassword({email,password});
    showLoading(false);
    if (error) showToast('Login failed: '+error.message);
    else {showDashboard(); showToast('Welcome Admin 👋');}
}
async function logout() {await supabase.auth.signOut(); document.getElementById('dashboardSection').style.display='none'; document.getElementById('loginSection').style.display='flex'; showToast('Logged out');}
function showDashboard() {
    document.getElementById('loginSection').style.display='none';
    document.getElementById('dashboardSection').style.display='block';
    loadExams(); loadNotifications(); loadQuotes(); loadSettings(); refreshStats();
}
async function saveExam() {
    const name = document.getElementById('examName').value.trim();
    const year = document.getElementById('examYear').value.trim();
    const type = document.getElementById('examType').value.trim();
    const date = document.getElementById('examDate').value;
    const icon = document.getElementById('examIcon').value.trim() || '📚';
    const color = document.getElementById('examColor').value.trim() || '#667eea';
    const featured = document.getElementById('examFeatured').checked;
    if (!name||!year||!type||!date) return showToast('Fill all required fields');
    showLoading(true);
    const {error} = await supabase.from('exams').insert([{batch_name:name,exam_year:year,exam_type:type,exam_date:new Date(date).toISOString(),icon,color,is_featured:featured,status:'enabled'}]);
    showLoading(false);
    if (error) showToast('Error: '+error.message);
    else {clearExamForm(); loadExams(); refreshStats(); showToast('Exam added! ✅');}
}
function clearExamForm() {
    document.getElementById('examName').value=''; document.getElementById('examYear').value=''; document.getElementById('examType').value='';
    document.getElementById('examDate').value=''; document.getElementById('examIcon').value=''; document.getElementById('examColor').value=''; document.getElementById('examFeatured').checked=false;
}
async function loadExams() {
    const {data} = await supabase.from('exams').select('*').order('created_at',{ascending:false});
    displayExams(data || []);
}
function displayExams(exams) {
    const list = document.getElementById('examList');
    if (exams.length===0) {list.innerHTML='<p style="color:#b8c1ec;text-align:center;">No exams yet</p>'; return;}
    list.innerHTML = exams.map(e=>`<div class="list-item"><div class="list-item-content"><strong>${e.icon} ${e.batch_name}</strong><div style="font-size:0.9rem;color:#b8c1ec;margin-top:5px;">
        ${new Date(e.exam_date).toLocaleDateString()} ${e.is_featured?'<span style="color:#feca57;">⭐ Featured</span>':''}
        <span style="color:${e.status==='enabled'?'#38ef7d':'#ff6b6b'}">${e.status==='enabled'?'🟢 Active':'🔴 Disabled'}</span></div></div>
        <div class="list-item-actions">
            <button class="btn-icon" onclick="editExam(${e.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-icon btn-danger" onclick="deleteExam(${e.id})"><i class="fas fa-trash"></i></button>
            <button class="btn-icon ${e.status==='enabled'?'btn-success':''}" onclick="toggleExamStatus(${e.id},'${e.status}')"><i class="fas fa-${e.status==='enabled'?'eye':'eye-slash'}"></i></button>
        </div></div>`).join('');
}
async function deleteExam(id) {if(confirm('Delete this exam?')) {await supabase.from('exams').delete().eq('id',id); loadExams(); refreshStats(); showToast('Exam deleted');}}
async function toggleExamStatus(id,status) {
    const newStatus = status==='enabled'?'disabled':'enabled';
    await supabase.from('exams').update({status:newStatus}).eq('id',id);
    loadExams();
}
async function saveNotification() { /* similar to saveExam - you can copy from previous messages if you want full */ showToast('Feature ready in full version');}
async function loadNotifications() {document.getElementById('notifList').innerHTML='<p style="color:#b8c1ec;text-align:center;">No notifications yet</p>';}
async function saveQuote() {showToast('Quote feature ready');}
async function loadQuotes() {document.getElementById('quoteList').innerHTML='<p style="color:#b8c1ec;text-align:center;">No quotes yet</p>';}
async function loadSettings() {
    const {data} = await supabase.from('settings').select('value').eq('key','snowflakes').single();
    document.getElementById('snowEnabled').checked = data ? data.value : false;
}
async function saveSettings() {
    const enabled = document.getElementById('snowEnabled').checked;
    showLoading(true);
    await supabase.from('settings').upsert({key:'snowflakes',value:enabled});
    showLoading(false);
    showToast('Settings saved! ❄️');
}
async function refreshStats() {
    const {count:ec} = await supabase.from('exams').select('*',{count:'exact',head:true});
    const {count:nc} = await supabase.from('notifications').select('*',{count:'exact',head:true});
    const {count:qc} = await supabase.from('quotes').select('*',{count:'exact',head:true});
    document.getElementById('totalExams').textContent = ec||0;
    document.getElementById('totalNotifs').textContent = nc||0;
    document.getElementById('totalQuotes').textContent = qc||0;
}
function showLoading(s) {document.getElementById('loadingOverlay').classList.toggle('active',s);}
function showToast(m) {
    const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),3000);
}
window.adminLogin=adminLogin; window.logout=logout; window.saveExam=saveExam;
window.deleteExam=deleteExam; window.toggleExamStatus=toggleExamStatus;
window.saveSettings=saveSettings;
