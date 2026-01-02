// ==========================================
// EXAM MASTER SL - ප්‍රධාන යෙදුම් ගොනුව
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://nstnkxtxlqelwnefkmaj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4'
};

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Global Variables
let activeNotifications = [];
let effectCanvas = null;
let effectCtx = null;
let effectAnimationId = null;
let isFirstVisit = true;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Hide loading overlay
    setTimeout(() => {
        document.getElementById('loadingOverlay').style.display = 'none';
    }, 1500);
    
    // 1. Load Exams
    await loadExams();
    
    // 2. Check Notifications
    await checkNotifications();
    
    // 3. Load Chat
    await loadChat();
    
    // 4. Initialize Effects
    await initEffects();
    
    // 5. Check if first visit for popup
    checkFirstVisit();
});

// ==========================================
// 1. EXAM COUNTDOWN SYSTEM
// ==========================================
async function loadExams() {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('status', 'enabled')
            .order('exam_date', { ascending: true });

        if (error) throw error;

        const grid = document.getElementById('examGrid');
        grid.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(exam => {
                const card = createExamCard(exam);
                grid.appendChild(card);
                startTimerForExam(exam);
            });
        } else {
            grid.innerHTML = `
                <div class="exam-card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; color: var(--nt-muted); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--nt-text); margin-bottom: 10px;">දැනට සක්‍රිය විභාග නොමැත</h3>
                    <p style="color: var(--nt-muted);">නව විභාග එකතු කිරීමට පරිපාලක අඩවියට පිවිසෙන්න</p>
                </div>
            `;
        }
    } catch (e) {
        console.error('Exams Error:', e);
        showToast('විභාග පූරණය කිරීමේ දෝෂයක්', 'error');
    }
}

function createExamCard(exam) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.id = `exam-${exam.id}`;
    
    card.innerHTML = `
        <div class="exam-card-content">
            <h3>${exam.batch_name}</h3>
            <div class="exam-date">
                <i class="far fa-calendar-alt"></i>
                ${new Date(exam.exam_date).toLocaleDateString('si-LK', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
            </div>
            
            <div class="timer-display">
                <div class="time-unit">
                    <span class="time-value" id="days-${exam.id}">00</span>
                    <span class="time-label">දින</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="hours-${exam.id}">00</span>
                    <span class="time-label">පැය</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="minutes-${exam.id}">00</span>
                    <span class="time-label">මිනි</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="seconds-${exam.id}">00</span>
                    <span class="time-label">තත්</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

function startTimerForExam(exam) {
    const target = new Date(exam.exam_date).getTime();
    
    function updateTimer() {
        const now = new Date().getTime();
        const diff = target - now;
        
        if (diff < 0) {
            const card = document.getElementById(`exam-${exam.id}`);
            if (card) {
                card.querySelector('.timer-display').innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <span style="color: var(--pk-success); font-weight: bold; font-size: 1.2rem;">
                            <i class="fas fa-check-circle"></i> විභාගය අවසන්
                        </span>
                    </div>
                `;
                card.style.opacity = '0.7';
            }
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const daysEl = document.getElementById(`days-${exam.id}`);
        const hoursEl = document.getElementById(`hours-${exam.id}`);
        const minutesEl = document.getElementById(`minutes-${exam.id}`);
        const secondsEl = document.getElementById(`seconds-${exam.id}`);
        
        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// ==========================================
// 2. NOTIFICATION SYSTEM
// ==========================================
async function checkNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        activeNotifications = data || [];
        updateNotificationBadge();
        
        // Store last seen notification ID
        if (activeNotifications.length > 0) {
            const latestId = activeNotifications[0].id;
            localStorage.setItem('last_seen_notif', latestId);
        }
        
    } catch (err) {
        console.error('Notification Error:', err);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (activeNotifications.length > 0) {
        badge.textContent = activeNotifications.length;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function checkFirstVisit() {
    const lastSeen = localStorage.getItem('last_seen_notif');
    const hasPersistentNotifications = activeNotifications.some(n => n.show_until_dismissed);
    
    if (isFirstVisit && hasPersistentNotifications) {
        setTimeout(() => {
            openNotifModal();
            isFirstVisit = false;
        }, 2000);
    }
}

async function openNotifModal() {
    const modal = document.getElementById('notifModal');
    const contentDiv = document.getElementById('modalNotifContent');
    
    // Mark as seen
    if (activeNotifications.length > 0) {
        localStorage.setItem('last_seen_notif', activeNotifications[0].id);
    }
    
    updateNotificationBadge();
    
    if (activeNotifications.length === 0) {
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="far fa-bell" style="font-size: 3rem; color: var(--nt-muted); margin-bottom: 20px;"></i>
                <h4 style="color: var(--nt-text); margin-bottom: 10px;">දැනට විශේෂ නිවේදන නොමැත</h4>
                <p style="color: var(--nt-muted);">නව නිවේදන සඳහා නිතර පරීක්ෂා කරන්න</p>
            </div>
        `;
    } else {
        contentDiv.innerHTML = activeNotifications.map(notif => {
            let mediaContent = '';
            
            if (notif.image_url) {
                mediaContent += `
                    <div class="notification-media">
                        <img src="${notif.image_url}" alt="Notification Image" class="notification-image" 
                             onerror="this.style.display='none'">
                    </div>
                `;
            }
            
            if (notif.pdf_url) {
                mediaContent += `
                    <div class="notification-actions">
                        <a href="${notif.pdf_url}" target="_blank" class="btn btn-pdf">
                            <i class="fas fa-file-pdf"></i> PDF බාගත කරන්න
                        </a>
                    </div>
                `;
            }

            return `
                <div class="notification-item">
                    <div class="notification-header">
                        <div class="notification-title">${notif.title}</div>
                        <div class="notification-date">
                            ${new Date(notif.created_at).toLocaleDateString('si-LK')}
                        </div>
                    </div>
                    
                    <div class="notification-message">${notif.message || ''}</div>
                    
                    ${mediaContent}
                </div>
            `;
        }).join('');
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeNotifModal() {
    const modal = document.getElementById('notifModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ==========================================
// 3. CHAT SYSTEM
// ==========================================
async function loadChat() {
    // Load saved name
    const savedName = localStorage.getItem('chat_user_name');
    if (savedName) {
        document.getElementById('chatName').value = savedName;
    }

    // Fetch existing comments
    await fetchComments();

    // Subscribe to real-time updates
    supabase
        .channel('public:comments')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'comments' 
        }, payload => {
            appendComment(payload.new);
        })
        .subscribe();
}

async function fetchComments() {
    const box = document.getElementById('chatBox');
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;

        // Remove welcome message if exists
        const welcomeMsg = box.querySelector('.chat-welcome');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        box.innerHTML = '';
        data.forEach(comment => appendComment(comment));
        scrollToBottom();
    } catch (err) {
        console.error('Chat Error:', err);
    }
}

function appendComment(comment) {
    const box = document.getElementById('chatBox');
    const myName = localStorage.getItem('chat_user_name');
    const isMe = comment.user_name === myName;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${isMe ? 'user' : 'other'}`;
    
    const time = new Date(comment.created_at).toLocaleTimeString('si-LK', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    msgDiv.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${comment.user_name}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${comment.message}</div>
    `;
    
    box.appendChild(msgDiv);
    scrollToBottom();
}

function scrollToBottom() {
    const box = document.getElementById('chatBox');
    box.scrollTop = box.scrollHeight;
}

async function sendComment() {
    const nameInput = document.getElementById('chatName');
    const msgInput = document.getElementById('chatMessage');
    
    const name = nameInput.value.trim();
    const message = msgInput.value.trim();
    
    if (!name) {
        showToast('කරුණාකර ඔබේ නම ඇතුළත් කරන්න', 'warning');
        nameInput.focus();
        return;
    }
    
    if (!message) {
        showToast('කරුණාකර පණිවිඩය ඇතුළත් කරන්න', 'warning');
        msgInput.focus();
        return;
    }
    
    // Save name to localStorage
    localStorage.setItem('chat_user_name', name);
    
    try {
        const { error } = await supabase
            .from('comments')
            .insert([{ 
                user_name: name, 
                message: message 
            }]);
        
        if (error) throw error;
        
        // Clear message input
        msgInput.value = '';
        msgInput.focus();
        
    } catch (err) {
        console.error('Send Comment Error:', err);
        showToast('පණිවිඩය යැවීමේ දෝෂයක්', 'error');
    }
}

// ==========================================
// 4. SEASONAL EFFECTS SYSTEM
// ==========================================
async function initEffects() {
    effectCanvas = document.getElementById('effectCanvas');
    effectCtx = effectCanvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    try {
        const { data } = await supabase
            .from('site_settings')
            .select('*');
        
        if (data) {
            const snow = data.find(s => s.setting_key === 'snow_effect');
            const confetti = data.find(s => s.setting_key === 'confetti_effect');
            
            // Stop any existing animation
            if (effectAnimationId) {
                cancelAnimationFrame(effectAnimationId);
            }
            
            if (snow && snow.is_enabled) {
                startSnowEffect();
            } else if (confetti && confetti.is_enabled) {
                startConfettiEffect();
            }
        }
    } catch (e) {
        console.log('Effects Error:', e);
    }
}

function resizeCanvas() {
    effectCanvas.width = window.innerWidth;
    effectCanvas.height = window.innerHeight;
}

// Snow Effect Implementation
function startSnowEffect() {
    const particles = [];
    const particleCount = 100;
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * effectCanvas.width,
            y: Math.random() * effectCanvas.height,
            radius: Math.random() * 4 + 1,
            speed: Math.random() * 1 + 0.5,
            opacity: Math.random() * 0.5 + 0.3,
            sway: Math.random() * 0.5 - 0.25
        });
    }
    
    function drawSnow() {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
        
        particles.forEach(particle => {
            effectCtx.beginPath();
            effectCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            effectCtx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            effectCtx.fill();
            effectCtx.closePath();
        });
        
        updateSnow();
        effectAnimationId = requestAnimationFrame(drawSnow);
    }
    
    function updateSnow() {
        particles.forEach(particle => {
            particle.y += particle.speed;
            particle.x += particle.sway;
            
            // Reset if out of bounds
            if (particle.y > effectCanvas.height) {
                particle.y = -10;
                particle.x = Math.random() * effectCanvas.width;
            }
            if (particle.x > effectCanvas.width) {
                particle.x = 0;
            } else if (particle.x < 0) {
                particle.x = effectCanvas.width;
            }
        });
    }
    
    drawSnow();
}

// Confetti Effect Implementation
function startConfettiEffect() {
    const particles = [];
    const colors = ['#667eea', '#764ba2', '#38ef7d', '#ff6b6b', '#ffb74d', '#4cc9f0'];
    const particleCount = 150;
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * effectCanvas.width,
            y: Math.random() * effectCanvas.height - effectCanvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5,
            speed: Math.random() * 3 + 1,
            angle: Math.random() * 360,
            rotationSpeed: Math.random() * 5 - 2.5,
            sway: Math.random() * 2 - 1
        });
    }
    
    function drawConfetti() {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
        
        particles.forEach(particle => {
            effectCtx.save();
            effectCtx.translate(particle.x, particle.y);
            effectCtx.rotate(particle.angle * Math.PI / 180);
            effectCtx.fillStyle = particle.color;
            
            // Draw confetti piece (rectangle)
            effectCtx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
            
            // Add some sparkle
            effectCtx.beginPath();
            effectCtx.arc(0, 0, particle.size/3, 0, Math.PI * 2);
            effectCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            effectCtx.fill();
            
            effectCtx.restore();
        });
        
        updateConfetti();
        effectAnimationId = requestAnimationFrame(drawConfetti);
    }
    
    function updateConfetti() {
        particles.forEach(particle => {
            particle.y += particle.speed;
            particle.x += particle.sway;
            particle.angle += particle.rotationSpeed;
            
            // Reset if out of bounds
            if (particle.y > effectCanvas.height) {
                particle.y = -20;
                particle.x = Math.random() * effectCanvas.width;
            }
            if (particle.x > effectCanvas.width) {
                particle.x = 0;
            } else if (particle.x < 0) {
                particle.x = effectCanvas.width;
            }
        });
    }
    
    drawConfetti();
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
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
        background: var(--nt-card);
        color: var(--nt-text);
        padding: 15px 20px;
        border-radius: 12px;
        border-left: 4px solid ${type === 'success' ? 'var(--pk-success)' : type === 'error' ? 'var(--pk-danger)' : 'var(--pk-warning)'};
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1001;
        transform: translateX(150%);
        transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        max-width: 350px;
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
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// ==========================================
// EXPORT FUNCTIONS TO WINDOW OBJECT
// ==========================================
window.openNotifModal = openNotifModal;
window.closeNotifModal = closeNotifModal;
window.sendComment = sendComment;
