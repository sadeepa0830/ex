// ==========================================
// ADMIN PANEL - Exam Master (Production with Supabase)
// ==========================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ⚠️ REPLACE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_CONFIG = {
    url: 'https://nstnkxtxlqelwnefkmaj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4'
};

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Set to false for production with Supabase
const DEMO_MODE = false;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupFileUploads();
});

// ==========================================
// AUTHENTICATION
// ==========================================
async function checkAuthStatus() {
    if (DEMO_MODE) {
        const isLoggedIn = sessionStorage.getItem('admin-logged-in');
        if (isLoggedIn === 'true') {
            showDashboard();
        }
        return;
    }

    // Production: Check Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showDashboard();
    }
}

async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    
    if (!email || !password) {
        showToast('Please enter both email and password');
        return;
    }
    
    showLoading(true);
    
    if (DEMO_MODE) {
        // Demo mode
        setTimeout(() => {
            if (email === 'admin@exammaster.lk' && password === 'admin123') {
                sessionStorage.setItem('admin-logged-in', 'true');
                showLoading(false);
                showDashboard();
                showToast('Login successful! Welcome Admin 👋');
            } else {
                showLoading(false);
                showToast('Invalid credentials. Try: admin@exammaster.lk / admin123');
            }
        }, 1500);
    } else {
        // Production: Supabase authentication
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            showLoading(false);
            
            if (error) {
                showToast('Login failed: ' + error.message);
                console.error('Login error:', error);
            } else {
                showDashboard();
                showToast('Login successful! Welcome Admin 👋');
            }
        } catch (err) {
            showLoading(false);
            showToast('An error occurred during login');
            console.error('Login exception:', err);
        }
    }
}

async function logout() {
    if (DEMO_MODE) {
        sessionStorage.removeItem('admin-logged-in');
    } else {
        // Production: Sign out from Supabase
        await supabase.auth.signOut();
    }
    
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    showToast('Logged out successfully');
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    
    loadExams();
    loadNotificationsForAdmin();
    refreshStats();
}

// ==========================================
// ENHANCED EXAM MANAGEMENT WITH COUNTDOWN SUPPORT
// ==========================================
async function saveExam() {
    const batchType = document.getElementById('batchType').value;
    const batchYear = document.getElementById('batchYear').value.trim();
    const date = document.getElementById('examDate').value;
    const status = document.getElementById('examStatus').value;
    const examName = document.getElementById('examName').value.trim();
    
    if (!batchYear || !date || !examName) {
        showToast('Please fill in all exam details');
        return;
    }
    
    // Create batch name
    const batchName = examName || `${batchYear} ${batchType.toUpperCase()}`;
    
    showLoading(true);
    
    if (DEMO_MODE) {
        const exams = getLocalExams();
        const existingIndex = exams.findIndex(e => 
            e.batch_name === batchName || (e.batch_year === batchYear && e.batch_type === batchType)
        );
        
        const examData = {
            id: existingIndex !== -1 ? exams[existingIndex].id : Date.now(),
            batch_name: batchName,
            batch_type: batchType,
            batch_year: batchYear,
            exam_date: date,
            exam_date_timestamp: new Date(date).getTime(),
            status: status,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        if (existingIndex !== -1) {
            exams[existingIndex] = examData;
            showToast('Exam updated successfully! ✏️');
        } else {
            exams.push(examData);
            showToast('Exam added successfully! ✅');
        }
        
        localStorage.setItem('exam-master-exams', JSON.stringify(exams));
        
        setTimeout(() => {
            showLoading(false);
            clearExamForm();
            loadExams();
            refreshStats();
        }, 1000);
    } else {
        try {
            // Check if exam exists
            const { data: existing } = await supabase
                .from('exams')
                .select('*')
                .eq('batch_year', batchYear)
                .eq('batch_type', batchType)
                .single();
            
            let result;
            
            if (existing) {
                // Update existing
                result = await supabase
                    .from('exams')
                    .update({
                        batch_name: batchName,
                        batch_type: batchType,
                        batch_year: batchYear,
                        exam_date: new Date(date).toISOString(),
                        exam_date_timestamp: new Date(date).getTime(),
                        status: status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
                showToast('Exam updated successfully! ✏️');
            } else {
                // Insert new
                result = await supabase
                    .from('exams')
                    .insert([{
                        batch_name: batchName,
                        batch_type: batchType,
                        batch_year: batchYear,
                        exam_date: new Date(date).toISOString(),
                        exam_date_timestamp: new Date(date).getTime(),
                        status: status,
                        is_active: true
                    }]);
                showToast('Exam added successfully! ✅');
            }
            
            showLoading(false);
            clearExamForm();
            loadExams();
            refreshStats();
            
        } catch (err) {
            showLoading(false);
            showToast('Error saving exam');
            console.error('Save exam error:', err);
        }
    }
}

async function loadExams() {
    if (DEMO_MODE) {
        const exams = getLocalExams();
        displayExams(exams);
    } else {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .order('exam_date', { ascending: true });
            
            if (error) {
                console.error('Load exams error:', error);
                showToast('Error loading exams');
            } else {
                displayExams(data || []);
            }
        } catch (err) {
            console.error('Load exams exception:', err);
        }
    }
}

function displayExams(exams) {
    const listDiv = document.getElementById('examList');
    
    if (exams.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No exams yet</p>';
        return;
    }
    
    listDiv.innerHTML = exams.map(exam => {
        const isActive = exam.is_active !== false;
        const statusClass = exam.status === 'live' ? 'live-badge' : 
                           exam.status === 'completed' ? 'completed-badge' : 'upcoming-badge';
        const statusText = exam.status === 'live' ? 'Live' : 
                          exam.status === 'completed' ? 'Completed' : 'Upcoming';
        
        return `
        <div class="exam-list-item">
            <div class="exam-info">
                <h4>${exam.batch_name || exam.name}</h4>
                <div style="display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap;">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <span class="type-badge ${exam.batch_type === 'al' ? 'al-badge' : 'ol-badge'}">
                        ${exam.batch_type ? exam.batch_type.toUpperCase() : 'A/L'}
                    </span>
                    <span class="year-badge">${exam.batch_year || '2026'}</span>
                </div>
                <p><i class="fas fa-calendar"></i> ${formatDate(exam.exam_date || exam.date)}</p>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px;">
                    <i class="fas fa-clock"></i> ${getTimeRemaining(exam.exam_date || exam.date)}
                </p>
            </div>
            <div class="exam-actions">
                <button class="icon-btn-small" onclick="editExam(${exam.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn-small" onclick="deleteExam(${exam.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="icon-btn-small ${isActive ? 'active-btn' : 'inactive-btn'}" 
                        onclick="toggleExamStatus(${exam.id})" 
                        title="${isActive ? 'Disable' : 'Enable'}">
                    <i class="fas fa-${isActive ? 'toggle-on' : 'toggle-off'}"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    // Add CSS for badges
    addBadgeStyles();
}

function getTimeRemaining(dateString) {
    const examDate = new Date(dateString);
    const now = new Date();
    const diffMs = examDate - now;
    
    if (diffMs < 0) {
        return 'Exam started';
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
        return `${diffDays} days ${diffHours} hours remaining`;
    } else if (diffHours > 0) {
        return `${diffHours} hours remaining`;
    } else {
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffMinutes} minutes remaining`;
    }
}

function addBadgeStyles() {
    if (!document.getElementById('badge-styles')) {
        const style = document.createElement('style');
        style.id = 'badge-styles';
        style.textContent = `
            .status-badge {
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                display: inline-block;
            }
            .live-badge { background: linear-gradient(135deg, #ff4757, #ff6b81); color: white; }
            .upcoming-badge { background: linear-gradient(135deg, #2ecc71, #1dd1a1); color: white; }
            .completed-badge { background: linear-gradient(135deg, #576574, #8395a7); color: white; }
            .type-badge {
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                display: inline-block;
            }
            .al-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
            .ol-badge { background: linear-gradient(135deg, #f093fb, #f5576c); color: white; }
            .year-badge {
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-secondary);
            }
            .active-btn { color: #2ecc71; }
            .inactive-btn { color: #ff4757; }
        `;
        document.head.appendChild(style);
    }
}

async function editExam(id) {
    if (DEMO_MODE) {
        const exams = getLocalExams();
        const exam = exams.find(e => e.id === id);
        if (exam) {
            document.getElementById('batchType').value = exam.batch_type || 'al';
            document.getElementById('batchYear').value = exam.batch_year || '';
            document.getElementById('examName').value = exam.batch_name || exam.name || '';
            document.getElementById('examStatus').value = exam.status || 'upcoming';
            
            // Format date for datetime-local input
            const date = new Date(exam.exam_date || exam.date);
            const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            document.getElementById('examDate').value = localDate.toISOString().slice(0, 16);
            
            showToast('Edit mode - Update and save');
            await deleteExam(id, true);
        }
    } else {
        try {
            const { data } = await supabase
                .from('exams')
                .select('*')
                .eq('id', id)
                .single();
            
            if (data) {
                document.getElementById('batchType').value = data.batch_type || 'al';
                document.getElementById('batchYear').value = data.batch_year || '';
                document.getElementById('examName').value = data.batch_name || '';
                document.getElementById('examStatus').value = data.status || 'upcoming';
                
                const date = new Date(data.exam_date);
                const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                document.getElementById('examDate').value = localDate.toISOString().slice(0, 16);
                
                showToast('Edit mode - Update and save');
                await deleteExam(id, true);
            }
        } catch (err) {
            console.error('Edit exam error:', err);
        }
    }
}

async function deleteExam(id, silent = false) {
    if (!silent && !confirm('Are you sure you want to delete this exam?')) {
        return;
    }
    
    if (DEMO_MODE) {
        let exams = getLocalExams();
        exams = exams.filter(e => e.id !== id);
        localStorage.setItem('exam-master-exams', JSON.stringify(exams));
        loadExams();
        refreshStats();
        if (!silent) showToast('Exam deleted');
    } else {
        try {
            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', id);
            
            if (error) {
                showToast('Error deleting exam');
                console.error('Delete error:', error);
            } else {
                loadExams();
                refreshStats();
                if (!silent) showToast('Exam deleted');
            }
        } catch (err) {
            console.error('Delete exception:', err);
        }
    }
}

async function toggleExamStatus(id) {
    if (DEMO_MODE) {
        const exams = getLocalExams();
        const examIndex = exams.findIndex(e => e.id === id);
        if (examIndex !== -1) {
            exams[examIndex].is_active = !exams[examIndex].is_active;
            localStorage.setItem('exam-master-exams', JSON.stringify(exams));
            loadExams();
            showToast(`Exam ${exams[examIndex].is_active ? 'enabled' : 'disabled'}`);
        }
    } else {
        try {
            const { data } = await supabase
                .from('exams')
                .select('is_active')
                .eq('id', id)
                .single();
            
            const newStatus = !data.is_active;
            
            const { error } = await supabase
                .from('exams')
                .update({ is_active: newStatus })
                .eq('id', id);
            
            if (error) {
                showToast('Error updating status');
            } else {
                loadExams();
                showToast(`Exam ${newStatus ? 'enabled' : 'disabled'}`);
            }
        } catch (err) {
            console.error('Toggle status error:', err);
        }
    }
}

function clearExamForm() {
    document.getElementById('batchYear').value = '';
    document.getElementById('examDate').value = '';
    document.getElementById('examName').value = '';
    document.getElementById('examStatus').value = 'upcoming';
}

// ==========================================
// ENHANCED NOTIFICATIONS WITH EDIT/TOGGLE
// ==========================================
async function sendNotification() {
    const title = document.getElementById('notifTitle').value.trim();
    const message = document.getElementById('notifMessage').value.trim();
    const imageFile = document.getElementById('imageFile').files[0];
    const pdfFile = document.getElementById('pdfFile').files[0];
    
    if (!title || !message) {
        showToast('Please fill in notification title and message');
        return;
    }
    
    showLoading(true);
    
    let imageUrl = null;
    let pdfUrl = null;
    
    if (DEMO_MODE) {
        if (imageFile) imageUrl = await fileToBase64(imageFile);
        if (pdfFile) pdfUrl = await fileToBase64(pdfFile);
        
        const notification = {
            id: Date.now(),
            title: title,
            message: message,
            image_url: imageUrl,
            pdf_url: pdfUrl,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const notifications = getLocalNotifications();
        notifications.push(notification);
        localStorage.setItem('exam-master-notifications', JSON.stringify(notifications));
        
        setTimeout(() => {
            showLoading(false);
            clearNotificationForm();
            loadNotificationsForAdmin();
            refreshStats();
            showToast('Notification sent! 📢');
        }, 1500);
    } else {
        try {
            if (imageFile) {
                const imgFileName = `images/${Date.now()}_${imageFile.name}`;
                const { data: imgData, error: imgError } = await supabase.storage
                    .from('downloads')
                    .upload(imgFileName, imageFile);
                
                if (!imgError) {
                    const { data: publicData } = supabase.storage
                        .from('downloads')
                        .getPublicUrl(imgFileName);
                    imageUrl = publicData.publicUrl;
                }
            }
            
            if (pdfFile) {
                const pdfFileName = `pdfs/${Date.now()}_${pdfFile.name}`;
                const { data: pdfData, error: pdfError } = await supabase.storage
                    .from('downloads')
                    .upload(pdfFileName, pdfFile);
                
                if (!pdfError) {
                    const { data: publicData } = supabase.storage
                        .from('downloads')
                        .getPublicUrl(pdfFileName);
                    pdfUrl = publicData.publicUrl;
                }
            }
            
            const { error } = await supabase
                .from('notifications')
                .insert([{
                    title: title,
                    message: message,
                    image_url: imageUrl,
                    pdf_url: pdfUrl,
                    is_active: true
                }]);
            
            showLoading(false);
            
            if (error) {
                showToast('Error sending notification: ' + error.message);
            } else {
                clearNotificationForm();
                loadNotificationsForAdmin();
                refreshStats();
                showToast('Notification sent! 📢');
            }
        } catch (err) {
            showLoading(false);
            console.error('Notification error:', err);
            showToast('Error sending notification');
        }
    }
}

async function loadNotificationsForAdmin() {
    if (DEMO_MODE) {
        const notifications = getLocalNotifications();
        displayNotificationsForAdmin(notifications);
    } else {
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });
            
            displayNotificationsForAdmin(data || []);
        } catch (err) {
            console.error('Load notifications error:', err);
        }
    }
}

function displayNotificationsForAdmin(notifications) {
    const notificationCard = document.querySelector('.admin-card:nth-child(2)');
    if (!notificationCard) return;
    
    // Create notifications list if not exists
    let notifList = notificationCard.querySelector('#adminNotificationList');
    if (!notifList) {
        notifList = document.createElement('div');
        notifList.id = 'adminNotificationList';
        notifList.style.marginTop = '1.5rem';
        notificationCard.appendChild(notifList);
    }
    
    if (notifications.length === 0) {
        notifList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No notifications yet</p>';
        return;
    }
    
    notifList.innerHTML = notifications.map(notif => `
        <div class="notification-list-item">
            <div class="notif-info">
                <h4>${notif.title}</h4>
                <p>${notif.message.substring(0, 80)}${notif.message.length > 80 ? '...' : ''}</p>
                <div style="display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap;">
                    <span class="notif-status ${notif.is_active ? 'active' : 'inactive'}">
                        ${notif.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">
                        <i class="fas fa-calendar"></i> ${formatDate(notif.created_at)}
                    </span>
                </div>
            </div>
            <div class="notif-actions">
                <button class="icon-btn-small" onclick="editNotification(${notif.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn-small ${notif.is_active ? 'active-btn' : 'inactive-btn'}" 
                        onclick="toggleNotificationStatus(${notif.id}, ${!notif.is_active})" 
                        title="${notif.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${notif.is_active ? 'toggle-on' : 'toggle-off'}"></i>
                </button>
                <button class="icon-btn-small" onclick="deleteNotification(${notif.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add notification styles
    addNotificationStyles();
}

function addNotificationStyles() {
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-list-item {
                background: rgba(0, 0, 0, 0.2);
                padding: 1rem;
                border-radius: 12px;
                margin-bottom: 0.75rem;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border: 1px solid var(--border);
            }
            .notif-info {
                flex: 1;
                margin-right: 1rem;
            }
            .notif-info h4 {
                margin-bottom: 0.5rem;
                color: var(--text-primary);
            }
            .notif-info p {
                font-size: 0.9rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
            }
            .notif-status {
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            .notif-status.active {
                background: linear-gradient(135deg, #2ecc71, #1dd1a1);
                color: white;
            }
            .notif-status.inactive {
                background: linear-gradient(135deg, #576574, #8395a7);
                color: white;
            }
            .notif-actions {
                display: flex;
                gap: 0.5rem;
            }
        `;
        document.head.appendChild(style);
    }
}

async function editNotification(id) {
    if (DEMO_MODE) {
        const notifications = getLocalNotifications();
        const notif = notifications.find(n => n.id === id);
        if (notif) {
            document.getElementById('notifTitle').value = notif.title;
            document.getElementById('notifMessage').value = notif.message;
            showToast('Edit mode - Update and send to save changes');
            await deleteNotification(id, true);
        }
    } else {
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('id', id)
                .single();
            
            if (data) {
                document.getElementById('notifTitle').value = data.title;
                document.getElementById('notifMessage').value = data.message;
                showToast('Edit mode - Update and send to save changes');
                await deleteNotification(id, true);
            }
        } catch (err) {
            console.error('Edit notification error:', err);
        }
    }
}

async function toggleNotificationStatus(id, newStatus) {
    if (DEMO_MODE) {
        const notifications = getLocalNotifications();
        const index = notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            notifications[index].is_active = newStatus;
            localStorage.setItem('exam-master-notifications', JSON.stringify(notifications));
            loadNotificationsForAdmin();
            showToast(`Notification ${newStatus ? 'activated' : 'deactivated'}`);
        }
    } else {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_active: newStatus })
                .eq('id', id);
            
            if (error) {
                showToast('Error updating notification status');
            } else {
                loadNotificationsForAdmin();
                showToast(`Notification ${newStatus ? 'activated' : 'deactivated'}`);
            }
        } catch (err) {
            console.error('Toggle notification error:', err);
        }
    }
}

async function deleteNotification(id, silent = false) {
    if (!silent && !confirm('Are you sure you want to delete this notification?')) {
        return;
    }
    
    if (DEMO_MODE) {
        let notifications = getLocalNotifications();
        notifications = notifications.filter(n => n.id !== id);
        localStorage.setItem('exam-master-notifications', JSON.stringify(notifications));
        loadNotificationsForAdmin();
        if (!silent) showToast('Notification deleted');
    } else {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
            
            if (error) {
                showToast('Error deleting notification');
            } else {
                loadNotificationsForAdmin();
                if (!silent) showToast('Notification deleted');
            }
        } catch (err) {
            console.error('Delete notification error:', err);
        }
    }
}

function clearNotificationForm() {
    document.getElementById('notifTitle').value = '';
    document.getElementById('notifMessage').value = '';
    document.getElementById('imageFile').value = '';
    document.getElementById('pdfFile').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('pdfPreview').innerHTML = '';
}

// ==========================================
// QUOTES
// ==========================================
async function addQuote() {
    const text = document.getElementById('quoteText').value.trim();
    
    if (!text) {
        showToast('Please enter a quote');
        return;
    }
    
    showLoading(true);
    
    if (DEMO_MODE) {
        const quotes = getLocalQuotes();
        quotes.push({
            id: Date.now(),
            text: text,
            created_at: new Date().toISOString()
        });
        localStorage.setItem('exam-master-quotes', JSON.stringify(quotes));
        
        setTimeout(() => {
            showLoading(false);
            document.getElementById('quoteText').value = '';
            refreshStats();
            showToast('Quote added! ✨');
        }, 1000);
    } else {
        try {
            const { error } = await supabase
                .from('quotes')
                .insert([{ text: text }]);
            
            showLoading(false);
            
            if (error) {
                showToast('Error adding quote: ' + error.message);
            } else {
                document.getElementById('quoteText').value = '';
                refreshStats();
                showToast('Quote added! ✨');
            }
        } catch (err) {
            showLoading(false);
            console.error('Add quote error:', err);
        }
    }
}

// ==========================================
// STATISTICS
// ==========================================
async function refreshStats() {
    if (DEMO_MODE) {
        const exams = getLocalExams();
        const notifications = getLocalNotifications();
        const quotes = getLocalQuotes();
        
        document.getElementById('totalExams').textContent = exams.length;
        document.getElementById('totalNotifs').textContent = notifications.filter(n => n.is_active).length;
        document.getElementById('totalQuotes').textContent = quotes.length;
    } else {
        try {
            const { count: examCount } = await supabase
                .from('exams')
                .select('*', { count: 'exact', head: true });
            
            const { count: notifCount } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            
            const { count: quoteCount } = await supabase
                .from('quotes')
                .select('*', { count: 'exact', head: true });
            
            document.getElementById('totalExams').textContent = examCount || 0;
            document.getElementById('totalNotifs').textContent = notifCount || 0;
            document.getElementById('totalQuotes').textContent = quoteCount || 0;
        } catch (err) {
            console.error('Stats error:', err);
        }
    }
}

// ==========================================
// LOCAL STORAGE HELPERS (Demo Mode)
// ==========================================
function getLocalExams() {
    const exams = localStorage.getItem('exam-master-exams');
    return exams ? JSON.parse(exams) : [];
}

function getLocalNotifications() {
    const notifs = localStorage.getItem('exam-master-notifications');
    return notifs ? JSON.parse(notifs) : [];
}

function getLocalQuotes() {
    const quotes = localStorage.getItem('exam-master-quotes');
    return quotes ? JSON.parse(quotes) : [];
}

// ==========================================
// FILE UPLOADS
// ==========================================
function setupFileUploads() {
    const imageInput = document.getElementById('imageFile');
    const pdfInput = document.getElementById('pdfFile');
    
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('imagePreview').innerHTML = `
                    <div style="margin-top: 10px;">
                        <img src="${e.target.result}" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 150px;">
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px;">${file.name}</p>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    });
    
    pdfInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('pdfPreview').innerHTML = `
                <div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <i class="fas fa-file-pdf" style="color: #ff6b6b; margin-right: 8px;"></i>
                    <span style="font-size: 0.85rem;">${file.name}</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-top: 5px;">
                        Size: ${(file.size / 1024).toFixed(2)} KB
                    </span>
                </div>
            `;
        }
    });
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'Invalid date';
    }
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================
window.adminLogin = adminLogin;
window.logout = logout;
window.saveExam = saveExam;
window.editExam = editExam;
window.deleteExam = deleteExam;
window.toggleExamStatus = toggleExamStatus;
window.sendNotification = sendNotification;
window.editNotification = editNotification;
window.toggleNotificationStatus = toggleNotificationStatus;
window.deleteNotification = deleteNotification;
window.addQuote = addQuote;
window.refreshStats = refreshStats;

console.log('🔐 Admin Panel loaded with enhanced features');
console.log('Demo Mode:', DEMO_MODE);
if (DEMO_MODE) {
    console.log('Demo Credentials: admin@exammaster.lk / admin123');
} else {
    console.log('Production Mode: Using Supabase Authentication');
}
