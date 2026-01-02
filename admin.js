// ==========================================
// EXAM MASTER ADMIN PANEL - COMPLETE ADMIN JS
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://nstnkxtxlqelwnefkmaj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4'
};

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Global Variables
let currentUser = null;
let statsData = {
    totalExams: 0,
    activeNotifications: 0,
    totalComments: 0,
    totalUsers: 0
};

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================
async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    
    if (!email || !password) {
        showToast('කරුණාකර ඊමේල් සහ මුරපදය ඇතුළත් කරන්න', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        showDashboard();
        await loadAllData();
        showToast('සාර්ථකව ඇතුල් විය! ✅', 'success');
        
        // Clear login form
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('ඇතුල් වීම අසාර්ථකයි: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        
        showToast('සාර්ථකව පිටවීම', 'success');
    } catch (error) {
        showToast('පිටවීමේ දෝෂයක්', 'error');
    }
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    
    // Update admin info
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.email.split('@')[0];
        document.getElementById('adminEmailDisplay').textContent = currentUser.email;
    }
    
    // Update time
    updateAdminTime();
    setInterval(updateAdminTime, 1000);
}

// Check session on load
supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session) {
        currentUser = session.user;
        showDashboard();
        await loadAllData();
    }
});

// ==========================================
// DASHBOARD STATISTICS
// ==========================================
async function loadAllData() {
    await loadStats();
    await loadSettings();
    await loadNotifications();
    await loadComments();
    await loadExams();
}

async function loadStats() {
    try {
        // Get total exams
        const { data: examsData } = await supabase
            .from('exams')
            .select('id', { count: 'exact', head: true });
        
        // Get active notifications
        const { data: notifsData } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true);
        
        // Get total comments
        const { data: commentsData } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true });
        
        // Update stats
        statsData.totalExams = examsData?.length || 0;
        statsData.activeNotifications = notifsData?.length || 0;
        statsData.totalComments = commentsData?.length || 0;
        statsData.totalUsers = Math.floor(Math.random() * 1000) + 500; // For demo
        
        // Update UI
        updateStatsUI();
        
    } catch (error) {
        console.error('Stats load error:', error);
    }
}

function updateStatsUI() {
    document.getElementById('statExams').textContent = statsData.totalExams;
    document.getElementById('statNotifications').textContent = statsData.activeNotifications;
    document.getElementById('statComments').textContent = statsData.totalComments;
    document.getElementById('statUsers').textContent = statsData.totalUsers.toLocaleString();
}

function updateAdminTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('si-LK', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('si-LK', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    document.getElementById('adminDate').textContent = dateStr;
    document.getElementById('adminTime').textContent = timeStr;
}

// ==========================================
// NOTIFICATION MANAGEMENT
// ==========================================
async function sendNotification() {
    const title = document.getElementById('notifTitle').value.trim();
    const message = document.getElementById('notifMessage').value.trim();
    const fileInput = document.getElementById('uploadFile');
    const persistent = document.getElementById('notifPersistent').checked;
    const btn = document.getElementById('sendBtn');
    
    if (!title) {
        showToast('කරුණාකර නිවේදන මාතෘකාව ඇතුළත් කරන්න', 'warning');
        return;
    }
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> යවමින්...';
    btn.disabled = true;
    showLoading(true);
    
    try {
        let imageUrl = null;
        let pdfUrl = null;
        
        // Handle file upload if present
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;
            
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file);
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filePath);
            
            // Set URL based on file type
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                imageUrl = publicUrl;
            } else if (fileExt === 'pdf') {
                pdfUrl = publicUrl;
            }
        }
        
        // Insert notification into database
        const { error } = await supabase
            .from('notifications')
            .insert([{
                title: title,
                message: message || null,
                image_url: imageUrl,
                pdf_url: pdfUrl,
                is_active: true,
                show_until_dismissed: persistent
            }]);
        
        if (error) throw error;
        
        showToast('නිවේදනය සාර්ථකව යවන ලදි! 📢', 'success');
        
        // Clear form
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
        document.getElementById('uploadFile').value = '';
        document.getElementById('notifPersistent').checked = false;
        
        // Refresh data
        await loadStats();
        await loadNotifications();
        
    } catch (error) {
        console.error('Send notification error:', error);
        showToast('නිවේදනය යැවීමේ දෝෂයක්: ' + error.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> නිවේදනය යවන්න';
        btn.disabled = false;
        showLoading(false);
    }
}

async function loadNotifications() {
    const list = document.getElementById('activeNotifsList');
    list.innerHTML = '<div class="loading-item">පූරණය වෙමින්...</div>';
    
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            list.innerHTML = data.map(notif => `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${notif.title}</div>
                        <div class="list-item-meta">
                            ${new Date(notif.created_at).toLocaleDateString('si-LK')}
                            ${notif.image_url ? '<span class="list-item-badge badge-image"><i class="fas fa-image"></i> රූපය</span>' : ''}
                            ${notif.pdf_url ? '<span class="list-item-badge badge-pdf"><i class="fas fa-file-pdf"></i> PDF</span>' : ''}
                            ${notif.show_until_dismissed ? '<span class="list-item-badge" style="background: rgba(56, 239, 125, 0.2); color: #38ef7d; border-color: rgba(56, 239, 125, 0.3);"><i class="fas fa-eye"></i> ස්ථිර</span>' : ''}
                        </div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-icon" onclick="editNotification(${notif.id})" title="සංස්කරණය">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-icon-delete" onclick="disableNotification(${notif.id})" title="ඉවත් කරන්න">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="far fa-bell-slash"></i>
                    <p>සක්‍රිය නිවේදන නොමැත</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load notifications error:', error);
        list.innerHTML = '<div class="error-state">පූරණය කිරීමේ දෝෂයක්</div>';
    }
}

async function disableNotification(id) {
    if (!confirm('මෙම නිවේදනය අක්‍රිය කිරීමට අවශ්‍යද?')) return;
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_active: false })
            .eq('id', id);
        
        if (error) throw error;
        
        await loadNotifications();
        await loadStats();
        showToast('නිවේදනය අක්‍රිය කරන ලදි', 'success');
        
    } catch (error) {
        console.error('Disable notification error:', error);
        showToast('නිවේදනය අක්‍රිය කිරීමේ දෝෂයක්', 'error');
    } finally {
        showLoading(false);
    }
}

async function editNotification(id) {
    // In a real app, this would open an edit modal
    // For now, just show a message
    showToast('සංස්කරණ ක්‍රියාව සැකසීමේ යාවත්කාලීනයකි', 'info');
}

// ==========================================
// SITE EFFECTS MANAGEMENT
// ==========================================
async function loadSettings() {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*');
        
        if (error) throw error;
        
        if (data) {
            const snow = data.find(s => s.setting_key === 'snow_effect');
            const confetti = data.find(s => s.setting_key === 'confetti_effect');
            
            document.getElementById('snowToggle').checked = snow ? snow.is_enabled : false;
            document.getElementById('confettiToggle').checked = confetti ? confetti.is_enabled : false;
        }
    } catch (error) {
        console.error('Load settings error:', error);
    }
}

async function toggleEffect(key, isEnabled) {
    showLoading(true);
    
    try {
        // If enabling one effect, disable the other
        if (isEnabled) {
            if (key === 'snow_effect') {
                document.getElementById('confettiToggle').checked = false;
                await updateSetting('confetti_effect', false);
            } else if (key === 'confetti_effect') {
                document.getElementById('snowToggle').checked = false;
                await updateSetting('snow_effect', false);
            }
        }
        
        await updateSetting(key, isEnabled);
        
        const effectName = key === 'snow_effect' ? 'හිම බලපෑම' : 'කොන්ෆෙටි බලපෑම';
        const status = isEnabled ? 'සක්‍රිය කරන ලදි' : 'අක්‍රිය කරන ලදි';
        showToast(`${effectName} ${status} ✅`, 'success');
        
    } catch (error) {
        console.error('Toggle effect error:', error);
        showToast('බලපෑම වෙනස් කිරීමේ දෝෂයක්', 'error');
    } finally {
        showLoading(false);
    }
}

async function updateSetting(key, value) {
    try {
        // Check if setting exists
        const { data: existing } = await supabase
            .from('site_settings')
            .select('id')
            .eq('setting_key', key)
            .single();
        
        if (existing) {
            // Update existing
            await supabase
                .from('site_settings')
                .update({ is_enabled: value })
                .eq('setting_key', key);
        } else {
            // Insert new
            await supabase
                .from('site_settings')
                .insert([{ setting_key: key, is_enabled: value }]);
        }
    } catch (error) {
        throw error;
    }
}

// ==========================================
// COMMENTS MANAGEMENT
// ==========================================
async function loadComments() {
    const list = document.getElementById('commentsList');
    if (!list) return;
    
    list.innerHTML = '<div class="loading-item">පූරණය වෙමින්...</div>';
    
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            list.innerHTML = data.map(comment => `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">
                            <i class="fas fa-user"></i> ${comment.user_name}
                        </div>
                        <div class="list-item-meta">
                            ${new Date(comment.created_at).toLocaleString('si-LK')}
                        </div>
                        <div class="list-item-description">
                            ${comment.message}
                        </div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-icon btn-icon-delete" onclick="deleteComment(${comment.id})" title="මකන්න">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="far fa-comments"></i>
                    <p>පණිවිඩ නොමැත</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load comments error:', error);
        list.innerHTML = '<div class="error-state">පූරණය කිරීමේ දෝෂයක්</div>';
    }
}

async function deleteComment(id) {
    if (!confirm('මෙම පණිවිඩය මැකීමට අවශ්‍යද?')) return;
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        await loadComments();
        await loadStats();
        showToast('පණිවිඩය මකා දමන ලදි', 'success');
        
    } catch (error) {
        console.error('Delete comment error:', error);
        showToast('පණිවිඩය මැකීමේ දෝෂයක්', 'error');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// EXAMS MANAGEMENT
// ==========================================
async function loadExams() {
    const list = document.getElementById('examsList');
    if (!list) return;
    
    list.innerHTML = '<div class="loading-item">පූරණය වෙමින්...</div>';
    
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .order('exam_date', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            list.innerHTML = data.map(exam => `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${exam.batch_name}</div>
                        <div class="list-item-meta">
                            ${new Date(exam.exam_date).toLocaleDateString('si-LK', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                            <span class="list-item-badge ${exam.status === 'enabled' ? 'badge-success' : 'badge-danger'}">
                                ${exam.status === 'enabled' ? 'සක්‍රිය' : 'අක්‍රිය'}
                            </span>
                        </div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-icon" onclick="toggleExamStatus(${exam.id}, '${exam.status}')" title="${exam.status === 'enabled' ? 'අක්‍රිය කරන්න' : 'සක්‍රිය කරන්න'}">
                            <i class="fas fa-${exam.status === 'enabled' ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="btn-icon btn-icon-delete" onclick="deleteExam(${exam.id})" title="මකන්න">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="far fa-calendar-times"></i>
                    <p>විභාග නොමැත</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load exams error:', error);
        list.innerHTML = '<div class="error-state">පූරණය කිරීමේ දෝෂයක්</div>';
    }
}

async function addExam() {
    const batchName = document.getElementById('examBatchName').value.trim();
    const examDate = document.getElementById('examDate').value;
    
    if (!batchName || !examDate) {
        showToast('කරුණාකර විභාග නම සහ දිනය ඇතුළත් කරන්න', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('exams')
            .insert([{
                batch_name: batchName,
                exam_date: examDate + ' 09:00:00',
                status: 'enabled'
            }]);
        
        if (error) throw error;
        
        // Clear form
        document.getElementById('examBatchName').value = '';
        document.getElementById('examDate').value = '';
        
        await loadExams();
        await loadStats();
        showToast('විභාගය සාර්ථකව එකතු කරන ලදි', 'success');
        
    } catch (error) {
        console.error('Add exam error:', error);
        showToast('විභාගය එකතු කිරීමේ දෝෂයක්', 'error');
    } finally {
        showLoading(false);
    }
}

async function toggleExamStatus(id, currentStatus) {
    const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('exams')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) throw error;
        
        await loadExams();
        await loadStats();
        showToast(`විභාගය ${newStatus === 'enabled' ? 'සක්‍රිය කරන ලදි' : 'අක්‍රිය කරන ලදි'}`, 'success');
        
    } catch (error) {
        console.error('Toggle exam error:', error);
        showToast('විභාග තත්වය වෙනස් කිරීමේ දෝෂයක්', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteExam(id) {
    if (!confirm('මෙම විභාගය මැකීමට අවශ්‍යද? මෙය ප්‍රතිවර්තනය කළ නොහැක.')) return;
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        await loadExams();
        await loadStats();
        showToast('විභාගය මකා දමන ලදි', 'success');
        
    } catch (error) {
        console.error('Delete exam error:', error);
        showToast('විභාගය මැකීමේ දෝෂයක්', 'error');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#1a1f3a' : type === 'error' ? '#1a1f3a' : '#1a1f3a'};
        color: ${type === 'success' ? '#38ef7d' : type === 'error' ? '#ff6b6b' : '#ffb74d'};
        padding: 15px 25px;
        border-radius: 12px;
        border-left: 4px solid ${type === 'success' ? '#38ef7d' : type === 'error' ? '#ff6b6b' : '#ffb74d'};
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1001;
        transform: translateX(150%);
        transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        max-width: 400px;
        font-weight: 500;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(150%)';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ==========================================
// EXPORT FUNCTIONS TO WINDOW OBJECT
// ==========================================
window.adminLogin = adminLogin;
window.logout = logout;
window.toggleEffect = toggleEffect;
window.sendNotification = sendNotification;
window.disableNotification = disableNotification;
window.editNotification = editNotification;
window.deleteComment = deleteComment;
window.addExam = addExam;
window.toggleExamStatus = toggleExamStatus;
window.deleteExam = deleteExam;
window.loadAllData = loadAllData;
