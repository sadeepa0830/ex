// ==========================================
// EXAM MASTER ADMIN PANEL - Complete JavaScript
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==========================================
// CONFIGURATION
// ==========================================
const SUPABASE_CONFIG = {
    url: 'https://nstnkxtxlqelwnefkmaj.supabase.co', // ඔබේ Supabase URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4' // ඔබේ anon key
};

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// ==========================================
// AUTHENTICATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

async function checkAuthStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showDashboard();
    }
}

async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    
    if (!email || !password) {
        showToast('Please enter email and password');
        return;
    }
    
    showLoading(true);
    
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

async function logout() {
    await supabase.auth.signOut();
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'flex';
    showToast('Logged out successfully');
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    
    loadExams();
    loadNotifications();
    loadQuotes();
    refreshStats();
}

// ==========================================
// EXAM MANAGEMENT
// ==========================================
async function saveExam() {
    const name = document.getElementById('examName').value.trim();
    const year = document.getElementById('examYear').value.trim();
    const type = document.getElementById('examType').value.trim();
    const date = document.getElementById('examDate').value;
    const icon = document.getElementById('examIcon').value.trim() || '📚';
    const color = document.getElementById('examColor').value.trim() || '#667eea';
    const featured = document.getElementById('examFeatured').checked;
    
    if (!name || !year || !type || !date) {
        showToast('Please fill in all required fields');
        return;
    }
    
    showLoading(true);
    
    try {
        const { data, error } = await supabase
            .from('exams')
            .insert([{
                batch_name: name,
                exam_year: year,
                exam_type: type,
                exam_date: new Date(date).toISOString(),
                icon: icon,
                color: color,
                is_featured: featured,
                status: 'enabled'
            }])
            .select();
        
        showLoading(false);
        
        if (error) {
            showToast('Error adding exam: ' + error.message);
            console.error('Insert error:', error);
        } else {
            // Clear form
            document.getElementById('examName').value = '';
            document.getElementById('examYear').value = '';
            document.getElementById('examType').value = '';
            document.getElementById('examDate').value = '';
            document.getElementById('examIcon').value = '';
            document.getElementById('examColor').value = '';
            document.getElementById('examFeatured').checked = false;
            
            loadExams();
            refreshStats();
            showToast('Exam added successfully! ✅');
        }
    } catch (err) {
        showLoading(false);
        showToast('An error occurred');
        console.error('Exception:', err);
    }
}

async function loadExams() {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false });
        
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

function displayExams(exams) {
    const listDiv = document.getElementById('examList');
    
    if (exams.length === 0) {
        listDiv.innerHTML = '<p style="color: #b8c1ec; text-align: center;">No exams yet</p>';
        return;
    }
    
    listDiv.innerHTML = exams.map(exam => `
        <div class="list-item">
            <div class="list-item-content">
                <strong>${exam.icon} ${exam.batch_name}</strong>
                <div style="font-size: 0.9rem; color: #b8c1ec; margin-top: 5px;">
                    ${new Date(exam.exam_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                    ${exam.is_featured ? '<span style="color: #feca57;">⭐ Featured</span>' : ''}
                    <span style="color: ${exam.status === 'enabled' ? '#38ef7d' : '#ff6b6b'};">
                        ${exam.status === 'enabled' ? '🟢 Active' : '🔴 Disabled'}
                    </span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" onclick="editExam(${exam.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteExam(${exam.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon ${exam.status === 'enabled' ? 'btn-success' : ''}" 
                        onclick="toggleExamStatus(${exam.id}, '${exam.status}')" 
                        title="${exam.status === 'enabled' ? 'Disable' : 'Enable'}">
                    <i class="fas fa-${exam.status === 'enabled' ? 'eye' : 'eye-slash'}"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function editExam(id) {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('id', id)
            .single();
        
        if (data) {
            document.getElementById('examName').value = data.batch_name;
            document.getElementById('examYear').value = data.exam_year;
            document.getElementById('examType').value = data.exam_type;
            const d = new Date(data.exam_date);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            document.getElementById('examDate').value = d.toISOString().slice(0, 16);
            document.getElementById('examIcon').value = data.icon || '';
            document.getElementById('examColor').value = data.color || '';
            document.getElementById('examFeatured').checked = data.is_featured;
            
            showToast('Edit mode - Update and save');
            await deleteExam(id, true);
        }
    } catch (err) {
        console.error('Edit exam error:', err);
    }
}

async function deleteExam(id, silent = false) {
    if (!silent && !confirm('Are you sure you want to delete this exam?')) {
        return;
    }
    
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

async function toggleExamStatus(id, currentStatus) {
    const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
    
    try {
        const { error } = await supabase
            .from('exams')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) {
            showToast('Error updating status');
        } else {
            loadExams();
            showToast(`Exam ${newStatus}`);
        }
    } catch (err) {
        console.error('Toggle status error:', err);
    }
}

// ==========================================
// NOTIFICATION MANAGEMENT
// ==========================================
async function saveNotification() {
    const title = document.getElementById('notifTitle').value.trim();
    const message = document.getElementById('notifMessage').value.trim();
    const imageFile = document.getElementById('notifImage').files[0];
    const pdfFile = document.getElementById('notifPDF').files[0];
    const showUntil = document.getElementById('showUntilDismissed').checked;
    
    if (!title || !message) {
        showToast('Please enter title and message');
        return;
    }
    
    showLoading(true);
    
    let imageUrl = null;
    let pdfUrl = null;
    let pdfFilename = null;
    
    try {
        // Upload image
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
        
        // Upload PDF
        if (pdfFile) {
            pdfFilename = pdfFile.name;
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
        
        // Insert notification
        const { error } = await supabase
            .from('notifications')
            .insert([{
                title: title,
                message: message,
                image_url: imageUrl,
                pdf_url: pdfUrl,
                pdf_filename: pdfFilename,
                is_active: true,
                show_until_dismissed: showUntil,
                priority: showUntil ? 10 : 0
            }]);
        
        showLoading(false);
        
        if (error) {
            showToast('Error sending notification: ' + error.message);
        } else {
            // Clear form
            document.getElementById('notifTitle').value = '';
            document.getElementById('notifMessage').value = '';
            document.getElementById('notifImage').value = '';
            document.getElementById('notifPDF').value = '';
            document.getElementById('showUntilDismissed').checked = false;
            
            loadNotifications();
            refreshStats();
            showToast('Notification sent! 📢');
        }
    } catch (err) {
        showLoading(false);
        console.error('Notification error:', err);
        showToast('Error sending notification');
    }
}

async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Load notifications error:', error);
        } else {
            displayNotifications(data || []);
        }
    } catch (err) {
        console.error('Load notifications exception:', err);
    }
}

function displayNotifications(notifications) {
    const listDiv = document.getElementById('notifList');
    
    if (notifications.length === 0) {
        listDiv.innerHTML = '<p style="color: #b8c1ec; text-align: center;">No notifications yet</p>';
        return;
    }
    
    listDiv.innerHTML = notifications.map(notif => `
        <div class="list-item">
            <div class="list-item-content">
                <strong>${notif.title}</strong>
                <div style="font-size: 0.9rem; color: #b8c1ec; margin-top: 5px;">
                    ${notif.message.substring(0, 80)}${notif.message.length > 80 ? '...' : ''}
                </div>
                <div style="font-size: 0.85rem; color: #b8c1ec; margin-top: 5px;">
                    ${new Date(notif.created_at).toLocaleDateString()}
                    ${notif.show_until_dismissed ? '<span style="color: #feca57;">🔔 Persistent</span>' : ''}
                    ${notif.image_url ? '<span style="color: #48dbfb;">🖼️ Image</span>' : ''}
                    ${notif.pdf_url ? '<span style="color: #ff6b6b;">📄 PDF</span>' : ''}
                    <span style="color: ${notif.is_active ? '#38ef7d' : '#ff6b6b'};">
                        ${notif.is_active ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" onclick="editNotification(${notif.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteNotification(${notif.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon ${notif.is_active ? 'btn-success' : ''}" 
                        onclick="toggleNotificationStatus(${notif.id}, ${notif.is_active})" 
                        title="${notif.is_active ? 'Turn Off' : 'Turn On'}">
                    <i class="fas fa-${notif.is_active ? 'toggle-on' : 'toggle-off'}"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function editNotification(id) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', id)
            .single();
        
        if (data) {
            document.getElementById('notifTitle').value = data.title;
            document.getElementById('notifMessage').value = data.message;
            document.getElementById('showUntilDismissed').checked = data.show_until_dismissed;
            
            showToast('Edit mode - Update and save');
            await deleteNotification(id, true);
        }
    } catch (err) {
        console.error('Edit notification error:', err);
    }
}

async function deleteNotification(id, silent = false) {
    if (!silent && !confirm('Are you sure you want to delete this notification?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        
        if (error) {
            showToast('Error deleting notification');
        } else {
            loadNotifications();
            refreshStats();
            if (!silent) showToast('Notification deleted');
        }
    } catch (err) {
        console.error('Delete notification error:', err);
    }
}

async function toggleNotificationStatus(id, currentStatus) {
    const newStatus = !currentStatus;
    
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_active: newStatus })
            .eq('id', id);
        
        if (error) {
            showToast('Error updating status');
        } else {
            loadNotifications();
            showToast(`Notification ${newStatus ? 'enabled' : 'disabled'}`);
        }
    } catch (err) {
        console.error('Toggle notification status error:', err);
    }
}

// ==========================================
// QUOTE MANAGEMENT
// ==========================================
async function saveQuote() {
    const text = document.getElementById('quoteText').value.trim();
    const author = document.getElementById('quoteAuthor').value.trim();
    const category = document.getElementById('quoteCategory').value;
    
    if (!text) {
        showToast('Please enter a quote');
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('quotes')
            .insert([{
                text: text,
                author: author || null,
                category: category,
                is_active: true
            }]);
        
        showLoading(false);
        
        if (error) {
            showToast('Error adding quote: ' + error.message);
        } else {
            document.getElementById('quoteText').value = '';
            document.getElementById('quoteAuthor').value = '';
            
            loadQuotes();
            refreshStats();
            showToast('Quote added! ✨');
        }
    } catch (err) {
        showLoading(false);
        console.error('Add quote error:', err);
    }
}

async function loadQuotes() {
    try {
        const { data, error } = await supabase
            .from('quotes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Load quotes error:', error);
        } else {
            displayQuotes(data || []);
        }
    } catch (err) {
        console.error('Load quotes exception:', err);
    }
}

function displayQuotes(quotes) {
    const listDiv = document.getElementById('quoteList');
    
    if (quotes.length === 0) {
        listDiv.innerHTML = '<p style="color: #b8c1ec; text-align: center;">No quotes yet</p>';
        return;
    }
    
    listDiv.innerHTML = quotes.map(quote => `
        <div class="list-item">
            <div class="list-item-content">
                <div style="font-style: italic;">"${quote.text}"</div>
                <div style="font-size: 0.9rem; color: #b8c1ec; margin-top: 5px;">
                    ${quote.author ? `- ${quote.author}` : ''}
                    <span style="color: #667eea;">${quote.category}</span>
                    <span style="color: ${quote.is_active ? '#38ef7d' : '#ff6b6b'};">
                        ${quote.is_active ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" onclick="editQuote(${quote.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteQuote(${quote.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon ${quote.is_active ? 'btn-success' : ''}" 
                        onclick="toggleQuoteStatus(${quote.id}, ${quote.is_active})" 
                        title="${quote.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${quote.is_active ? 'toggle-on' : 'toggle-off'}"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function editQuote(id) {
    try {
        const { data, error } = await supabase
            .from('quotes')
            .select('*')
            .eq('id', id)
            .single();
        
        if (data) {
            document.getElementById('quoteText').value = data.text;
            document.getElementById('quoteAuthor').value = data.author || '';
            document.getElementById('quoteCategory').value = data.category;
            
            showToast('Edit mode - Update and save');
            await deleteQuote(id, true);
        }
    } catch (err) {
        console.error('Edit quote error:', err);
    }
}

async function deleteQuote(id, silent = false) {
    if (!silent && !confirm('Are you sure you want to delete this quote?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('quotes')
            .delete()
            .eq('id', id);
        
        if (error) {
            showToast('Error deleting quote');
        } else {
            loadQuotes();
            refreshStats();
            if (!silent) showToast('Quote deleted');
        }
    } catch (err) {
        console.error('Delete quote error:', err);
    }
}

async function toggleQuoteStatus(id, currentStatus) {
    const newStatus = !currentStatus;
    
    try {
        const { error } = await supabase
            .from('quotes')
            .update({ is_active: newStatus })
            .eq('id', id);
        
        if (error) {
            showToast('Error updating status');
        } else {
            loadQuotes();
            showToast(`Quote ${newStatus ? 'activated' : 'deactivated'}`);
        }
    } catch (err) {
        console.error('Toggle quote status error:', err);
    }
}

// ==========================================
// STATISTICS
// ==========================================
async function refreshStats() {
    try {
        const { count: examCount } = await supabase
            .from('exams')
            .select('*', { count: 'exact', head: true });
        
        const { count: notifCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true });
        
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

// ==========================================
// EXPORT FUNCTIONS
// ==========================================
window.adminLogin = adminLogin;
window.logout = logout;
window.saveExam = saveExam;
window.editExam = editExam;
window.deleteExam = deleteExam;
window.toggleExamStatus = toggleExamStatus;
window.saveNotification = saveNotification;
window.editNotification = editNotification;
window.deleteNotification = deleteNotification;
window.toggleNotificationStatus = toggleNotificationStatus;
window.saveQuote = saveQuote;
window.editQuote = editQuote;
window.deleteQuote = deleteQuote;
window.toggleQuoteStatus = toggleQuoteStatus;

console.log('🔐 Admin Panel loaded successfully!');
