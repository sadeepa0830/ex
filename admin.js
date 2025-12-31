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
    refreshStats();
}

// ==========================================
// EXAM MANAGEMENT
// ==========================================
async function saveExam() {
    const name = document.getElementById('examName').value.trim();
    const date = document.getElementById('examDate').value;
    
    if (!name || !date) {
        showToast('Please fill in all exam details');
        return;
    }
    
    showLoading(true);
    
    if (DEMO_MODE) {
        // Demo mode - localStorage
        const exams = getLocalExams();
        const newExam = {
            id: Date.now(),
            name: name,
            date: date,
            status: 'enabled',
            createdAt: new Date().toISOString()
        };
        
        exams.push(newExam);
        localStorage.setItem('exam-master-exams', JSON.stringify(exams));
        
        setTimeout(() => {
            showLoading(false);
            document.getElementById('examName').value = '';
            document.getElementById('examDate').value = '';
            loadExams();
            refreshStats();
            showToast('Exam added successfully! ✅');
        }, 1000);
    } else {
        // Production: Supabase
        try {
            const { data, error } = await supabase
                .from('exams')
                .insert([{
                    batch_name: name,
                    exam_date: new Date(date).toISOString(),
                    status: 'enabled'
                }])
                .select();
            
            showLoading(false);
            
            if (error) {
                showToast('Error adding exam: ' + error.message);
                console.error('Insert error:', error);
            } else {
                document.getElementById('examName').value = '';
                document.getElementById('examDate').value = '';
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
}

async function loadExams() {
    if (DEMO_MODE) {
        const exams = getLocalExams();
        displayExams(exams);
    } else {
        // Production: Load from Supabase
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
}

function displayExams(exams) {
    const listDiv = document.getElementById('examList');
    
    if (exams.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No exams yet</p>';
        return;
    }
    
    listDiv.innerHTML = exams.map(exam => `
        <div class="exam-list-item">
            <div class="exam-info">
                <h4>${exam.batch_name || exam.name}</h4>
                <p>${formatDate(exam.exam_date || exam.date)}</p>
            </div>
            <div class="exam-actions">
                <button class="icon-btn-small" onclick="editExam(${exam.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn-small" onclick="deleteExam(${exam.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="icon-btn-small" onclick="toggleExamStatus(${exam.id})" title="${exam.status === 'enabled' ? 'Disable' : 'Enable'}">
                    <i class="fas fa-${exam.status === 'enabled' ? 'eye' : 'eye-slash'}"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function editExam(id) {
    if (DEMO_MODE) {
        const exams = getLocalExams();
        const exam = exams.find(e => e.id === id);
        if (exam) {
            document.getElementById('examName').value = exam.name;
            document.getElementById('examDate').value = exam.date;
            showToast('Edit mode - Update and save');
            deleteExam(id, true);
        }
    } else {
        // Production: Supabase
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .eq('id', id)
                .single();
            
            if (data) {
                document.getElementById('examName').value = data.batch_name;
                const d = new Date(data.exam_date);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                document.getElementById('examDate').value = d.toISOString().slice(0, 16);
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
        // Production: Supabase
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
        const exam = exams.find(e => e.id === id);
        if (exam) {
            exam.status = exam.status === 'enabled' ? 'disabled' : 'enabled';
            localStorage.setItem('exam-master-exams', JSON.stringify(exams));
            loadExams();
            showToast(`Exam ${exam.status}`);
        }
    } else {
        // Production: Supabase
        try {
            const { data } = await supabase
                .from('exams')
                .select('status')
                .eq('id', id)
                .single();
            
            const newStatus = data.status === 'enabled' ? 'disabled' : 'enabled';
            
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
}

// ==========================================
// NOTIFICATIONS
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
        // Demo mode - convert to base64
        if (imageFile) imageUrl = await fileToBase64(imageFile);
        if (pdfFile) pdfUrl = await fileToBase64(pdfFile);
        
        const notification = {
            id: Date.now(),
            title: title,
            message: message,
            imageUrl: imageUrl,
            pdfUrl: pdfUrl,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        
        const notifications = getLocalNotifications();
        notifications.push(notification);
        localStorage.setItem('exam-master-notifications', JSON.stringify(notifications));
        
        setTimeout(() => {
            showLoading(false);
            clearNotificationForm();
            refreshStats();
            showToast('Notification sent! 📢');
        }, 1500);
    } else {
        // Production: Upload to Supabase Storage
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
            
            // Insert notification
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
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('exam-master-quotes', JSON.stringify(quotes));
        
        setTimeout(() => {
            showLoading(false);
            document.getElementById('quoteText').value = '';
            refreshStats();
            showToast('Quote added! ✨');
        }, 1000);
    } else {
        // Production: Supabase
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
        document.getElementById('totalNotifs').textContent = notifications.filter(n => n.isActive).length;
        document.getElementById('totalQuotes').textContent = quotes.length;
    } else {
        // Production: Supabase
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
                        <img src="${e.target.result}" style="max-width: 100%; height: auto; border-radius: 8px;">
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
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
window.addQuote = addQuote;
window.refreshStats = refreshStats;

console.log('🔐 Admin Panel loaded');
console.log('Demo Mode:', DEMO_MODE);
if (DEMO_MODE) {
    console.log('Demo Credentials: admin@exammaster.lk / admin123');
} else {
    console.log('Production Mode: Using Supabase Authentication');
}
