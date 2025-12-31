// ==========================================
// CONFIGURATION - Replace with your Supabase keys
// ==========================================
const SUPABASE_CONFIG = {
    url: 'https://nstnkxtxlqelwnefkmaj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4' // Use anon key, NOT service_role key
};

// Check if running locally
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ==========================================
// GLOBAL STATE
// ==========================================
let deferredPrompt;
let timerInterval;
let timerSeconds = 25 * 60; // 25 minutes
let timerRunning = false;
let aiConversation = [];

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Show loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 2000);

    // Load saved preferences
    loadTheme();
    loadProfile();
    loadTimerStats();
    
    // Initialize features
    setupCountdown();
    loadDailyQuote();
    loadNotifications();
    setupPWA();
    setupOfflineMode();
    checkConnection();
    setupEventListeners();
    
    // Load AI conversation history
    loadAIHistory();
}

// ==========================================
// THEME MANAGEMENT
// ==========================================
function setTheme(theme) {
    document.body.className = theme === 'default' ? '' : theme;
    localStorage.setItem('exam-master-theme', theme);
    showToast('Theme changed successfully! ✨');
    toggleThemePanel();
}

function loadTheme() {
    const saved = localStorage.getItem('exam-master-theme');
    if (saved && saved !== 'default') {
        document.body.className = saved;
    }
}

function toggleThemePanel() {
    const panel = document.getElementById('themePanel');
    const profilePanel = document.getElementById('profilePanel');
    
    // Close profile if open
    profilePanel.classList.remove('active');
    
    panel.classList.toggle('active');
}

// ==========================================
// PROFILE MANAGEMENT
// ==========================================
function toggleProfile() {
    const panel = document.getElementById('profilePanel');
    const themePanel = document.getElementById('themePanel');
    
    // Close theme panel if open
    themePanel.classList.remove('active');
    
    panel.classList.toggle('active');
}

function loadProfile() {
    const name = localStorage.getItem('exam-master-username');
    const avatar = localStorage.getItem('exam-master-avatar');
    
    if (name) {
        document.getElementById('userName').value = name;
    }
    
    if (avatar) {
        document.getElementById('currentAvatar').src = avatar;
    }
    
    updateProfileStats();
}

function saveProfile() {
    const name = document.getElementById('userName').value.trim();
    
    if (name) {
        localStorage.setItem('exam-master-username', name);
        showToast('Profile saved! 👤');
        toggleProfile();
    } else {
        showToast('Please enter your name');
    }
}

function changeAvatar() {
    const seeds = ['student', 'felix', 'aneka', 'alex', 'sam', 'max', 'lucy', 'charlie'];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
    
    document.getElementById('currentAvatar').src = avatarUrl;
    localStorage.setItem('exam-master-avatar', avatarUrl);
    showToast('Avatar changed! 🎨');
}

function updateProfileStats() {
    const streak = localStorage.getItem('exam-master-streak') || 0;
    const totalTime = localStorage.getItem('exam-master-total-time') || 0;
    
    document.getElementById('studyStreak').textContent = `${streak} Day Streak`;
    document.getElementById('totalStudyTime').textContent = formatTime(parseInt(totalTime));
}

// ==========================================
// COUNTDOWN TIMER
// ==========================================
async function setupCountdown() {
    let examData = null;
    
    // Try to load from Supabase first
    if (typeof supabase !== 'undefined') {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .eq('status', 'enabled')
                .order('exam_date', { ascending: true })
                .limit(1);
            
            if (data && data.length > 0) {
                examData = {
                    name: data[0].batch_name,
                    date: new Date(data[0].exam_date).getTime()
                };
            }
        } catch (err) {
            console.log('Supabase not configured, trying localStorage...');
        }
    }
    
    // Fallback to localStorage (for demo/admin testing)
    if (!examData) {
        const localExams = localStorage.getItem('exam-master-exams');
        if (localExams) {
            const exams = JSON.parse(localExams);
            const enabledExams = exams.filter(e => e.status === 'enabled');
            if (enabledExams.length > 0) {
                // Get the nearest upcoming exam
                const sortedExams = enabledExams.sort((a, b) => {
                    return new Date(a.date || a.exam_date) - new Date(b.date || b.exam_date);
                });
                examData = {
                    name: sortedExams[0].name || sortedExams[0].batch_name,
                    date: new Date(sortedExams[0].date || sortedExams[0].exam_date).getTime()
                };
            }
        }
    }
    
    // Use exam data or fallback to default
    if (examData) {
        document.getElementById('examTitle').textContent = examData.name;
        updateCountdown(examData.date);
        setInterval(() => updateCountdown(examData.date), 1000);
    } else {
        // Default exam date
        const defaultDate = getNextExamDate();
        document.getElementById('examTitle').textContent = '2026 A/L Examination';
        updateCountdown(defaultDate);
        setInterval(() => updateCountdown(defaultDate), 1000);
    }
}

function getNextExamDate() {
    // Default fallback date: August 1, 2026
    return new Date('2026-08-01T09:00:00').getTime();
}

function updateCountdown(targetDate) {
    const now = new Date().getTime();
    const distance = targetDate - now;
    
    if (distance < 0) {
        document.getElementById('examTitle').textContent = 'Exam Day is Here! 🎉';
        setAllTimerValues(0, 0, 0, 0);
        return;
    }
    
    // Calculate years, months, days, hours
    const years = Math.floor(distance / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((distance % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    const days = Math.floor((distance % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    setAllTimerValues(years, months, days, hours);
}

function setAllTimerValues(years, months, days, hours) {
    document.getElementById('years').textContent = years;
    document.getElementById('months').textContent = months;
    document.getElementById('days').textContent = pad(days);
    document.getElementById('hours').textContent = pad(hours);
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// ==========================================
// DAILY QUOTE
// ==========================================
async function loadDailyQuote() {
    let quotes = [];
    
    // Try to load from Supabase first
    if (typeof supabase !== 'undefined') {
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (data && data.length > 0) {
                quotes = data.map(q => q.text);
            }
        } catch (err) {
            console.log('Supabase not configured, trying localStorage...');
        }
    }
    
    // Fallback to localStorage (for demo/admin testing)
    if (quotes.length === 0) {
        const localQuotes = localStorage.getItem('exam-master-quotes');
        if (localQuotes) {
            const quotesData = JSON.parse(localQuotes);
            quotes = quotesData.map(q => q.text);
        }
    }
    
    // Final fallback to default quotes
    if (quotes.length === 0) {
        quotes = [
            "Success is the sum of small efforts repeated day in and day out.",
            "The expert in anything was once a beginner.",
            "Don't watch the clock; do what it does. Keep going.",
            "Your limitation—it's only your imagination.",
            "Push yourself, because no one else is going to do it for you.",
            "Great things never come from comfort zones.",
            "Dream it. Wish it. Do it.",
            "Success doesn't just find you. You have to go out and get it.",
            "The harder you work for something, the greater you'll feel when you achieve it.",
            "Dream bigger. Do bigger.",
            "Don't stop when you're tired. Stop when you're done.",
            "Wake up with determination. Go to bed with satisfaction.",
            "Do something today that your future self will thank you for.",
            "Little things make big days.",
            "It's going to be hard, but hard does not mean impossible.",
            "Don't wait for opportunity. Create it.",
            "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
            "The key to success is to focus on goals, not obstacles.",
            "Dream it. Believe it. Build it."
        ];
    }
    
    // Select quote based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const quote = quotes[dayOfYear % quotes.length];
    
    document.getElementById('dailyQuote').textContent = quote;
}

// ==========================================
// NOTIFICATIONS / ALERTS
// ==========================================
async function loadNotifications() {
    // Check if already seen this session
    const hasSeenAlert = sessionStorage.getItem('exam-master-alert-seen');
    
    if (hasSeenAlert) {
        return; // Don't show again
    }
    
    let notification = null;
    
    // Try to load from Supabase first
    if (typeof supabase !== 'undefined') {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (data && data.length > 0) {
                notification = data[0];
            }
        } catch (err) {
            console.log('Supabase not configured, trying localStorage...');
        }
    }
    
    // Fallback to localStorage (for demo/admin testing)
    if (!notification) {
        const localNotifs = localStorage.getItem('exam-master-notifications');
        if (localNotifs) {
            const notifs = JSON.parse(localNotifs);
            const activeNotifs = notifs.filter(n => n.isActive || n.is_active);
            if (activeNotifs.length > 0) {
                notification = activeNotifs[activeNotifs.length - 1]; // Get latest
            }
        }
    }
    
    // Show notification or default welcome message
    if (notification) {
        showAlert(
            notification.title,
            notification.message,
            notification.imageUrl || notification.image_url,
            notification.pdfUrl || notification.pdf_url
        );
    } else {
        // Default welcome message
        showAlert(
            'Welcome to Exam Master! 🎓',
            'Your complete study companion for exam preparation. Explore AI assistance, study timer, and more!',
            null,
            null
        );
    }
}

function showAlert(title, message, imageUrl, pdfUrl) {
    const alertSection = document.getElementById('alertSection');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertImage = document.getElementById('alertImage');
    const alertImg = document.getElementById('alertImg');
    const alertButtons = document.getElementById('alertButtons');
    const alertPdfBtn = document.getElementById('alertPdfBtn');
    
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    
    if (imageUrl) {
        alertImg.src = imageUrl;
        alertImage.style.display = 'block';
    } else {
        alertImage.style.display = 'none';
    }
    
    if (pdfUrl) {
        alertPdfBtn.href = pdfUrl;
        alertButtons.style.display = 'block';
    } else {
        alertButtons.style.display = 'none';
    }
    
    alertSection.style.display = 'block';
}

function closeAlert() {
    document.getElementById('alertSection').style.display = 'none';
    sessionStorage.setItem('exam-master-alert-seen', 'true');
}

// ==========================================
// AI STUDY ASSISTANT (Claude API)
// ==========================================
async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to UI
    addAIMessage(message, 'user');
    input.value = '';
    
    // Add to conversation history
    aiConversation.push({ role: 'user', content: message });
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    try {
        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: aiConversation,
                system: 'You are a helpful study assistant for Sri Lankan students preparing for exams. Provide encouraging, accurate, and practical study advice. Keep responses concise and motivating.'
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        if (data.content && data.content[0]) {
            const botMessage = data.content[0].text;
            aiConversation.push({ role: 'assistant', content: botMessage });
            addAIMessage(botMessage, 'bot');
            
            // Save conversation to localStorage
            saveAIHistory();
        } else {
            addAIMessage('Sorry, I encountered an error. Please try again!', 'bot');
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        console.error('AI Error:', error);
        
        // Fallback responses for offline mode
        const fallbackResponse = getFallbackResponse(message);
        addAIMessage(fallbackResponse, 'bot');
    }
}

function addAIMessage(text, sender) {
    const chatBox = document.getElementById('aiChatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${sender}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addTypingIndicator() {
    const chatBox = document.getElementById('aiChatBox');
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.className = 'ai-message ai-message-bot';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">Thinking...</div>
    `;
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
}

function getFallbackResponse(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('time') || lowerMsg.includes('manage')) {
        return 'Use the Pomodoro Technique: Study for 25 minutes, then take a 5-minute break. This helps maintain focus and prevents burnout. Try our study timer!';
    } else if (lowerMsg.includes('stress') || lowerMsg.includes('anxiety')) {
        return 'Deep breathing and regular breaks are key! Remember: preparation reduces anxiety. Break your study into manageable chunks and celebrate small wins.';
    } else if (lowerMsg.includes('tip') || lowerMsg.includes('study')) {
        return 'Active recall is powerful! Instead of re-reading, test yourself regularly. Use flashcards, practice questions, and teach concepts to others.';
    } else {
        return 'I\'m here to help with your studies! Ask me about time management, study techniques, stress reduction, or any subject-specific questions.';
    }
}

function askAI(question) {
    document.getElementById('aiInput').value = question;
    sendAIMessage();
}

function saveAIHistory() {
    localStorage.setItem('exam-master-ai-history', JSON.stringify(aiConversation));
}

function loadAIHistory() {
    const saved = localStorage.getItem('exam-master-ai-history');
    if (saved) {
        aiConversation = JSON.parse(saved);
        
        // Restore conversation to UI (skip first welcome message)
        const chatBox = document.getElementById('aiChatBox');
        chatBox.innerHTML = `
            <div class="ai-message ai-message-bot">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">Hello! I'm your AI study assistant. Ask me anything about your subjects, study tips, or exam strategies! 📚</div>
            </div>
        `;
        
        aiConversation.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            addAIMessage(msg.content, sender);
        });
    }
}

// ==========================================
// STUDY TIMER (Pomodoro)
// ==========================================
function startTimer() {
    if (timerRunning) return;
    
    timerRunning = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'block';
    
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            timerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('pauseBtn').style.display = 'none';
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 25 * 60;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = `${pad(minutes)}:${pad(seconds)}`;
    
    // Add gradient if not exists
    addTimerGradient();
    
    // Update progress circle
    const totalSeconds = 25 * 60;
    const progress = (timerSeconds / totalSeconds) * 565.48;
    document.getElementById('timerProgress').style.strokeDashoffset = 565.48 - progress;
}

function addTimerGradient() {
    const svg = document.querySelector('.timer-svg');
    if (!document.getElementById('timerGradient')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'timerGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('style', 'stop-color:#667eea;stop-opacity:1');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('style', 'stop-color:#764ba2;stop-opacity:1');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);
    }
}

function timerComplete() {
    pauseTimer();
    
    // Update stats
    const studyTime = 25; // minutes
    updateTimerStats(studyTime);
    
    // Show notification
    showToast('🎉 Great work! Take a 5-minute break!');
    
    // Play notification sound (if available)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Study Session Complete!', {
            body: 'Time for a 5-minute break! 🎉',
            icon: '/icon-192.png'
        });
    }
    
    // Reset for next session
    setTimeout(() => {
        timerSeconds = 25 * 60;
        updateTimerDisplay();
    }, 1000);
}

function loadTimerStats() {
    const todayKey = new Date().toDateString();
    const todayTime = parseInt(localStorage.getItem(`exam-master-timer-${todayKey}`) || 0);
    const totalTime = parseInt(localStorage.getItem('exam-master-total-time') || 0);
    
    document.getElementById('todayTime').textContent = formatTime(todayTime);
    document.getElementById('totalTime').textContent = formatTime(totalTime);
}

function updateTimerStats(minutes) {
    const todayKey = new Date().toDateString();
    const todayTime = parseInt(localStorage.getItem(`exam-master-timer-${todayKey}`) || 0);
    const totalTime = parseInt(localStorage.getItem('exam-master-total-time') || 0);
    
    const newTodayTime = todayTime + minutes;
    const newTotalTime = totalTime + minutes;
    
    localStorage.setItem(`exam-master-timer-${todayKey}`, newTodayTime);
    localStorage.setItem('exam-master-total-time', newTotalTime);
    
    document.getElementById('todayTime').textContent = formatTime(newTodayTime);
    document.getElementById('totalTime').textContent = formatTime(newTotalTime);
    
    // Update streak
    updateStreak();
}

function updateStreak() {
    const lastStudyDate = localStorage.getItem('exam-master-last-study');
    const today = new Date().toDateString();
    let streak = parseInt(localStorage.getItem('exam-master-streak') || 0);
    
    if (lastStudyDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (lastStudyDate === yesterday) {
            streak++;
        } else if (lastStudyDate !== today) {
            streak = 1;
        }
        
        localStorage.setItem('exam-master-streak', streak);
        localStorage.setItem('exam-master-last-study', today);
        updateProfileStats();
    }
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// ==========================================
// OFFLINE MODE & SERVICE WORKER
// ==========================================
function setupOfflineMode() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
}

function checkConnection() {
    updateConnectionStatus();
    
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
}

function updateConnectionStatus() {
    const status = document.getElementById('connectionStatus');
    const dot = status.querySelector('.status-dot');
    const text = status.querySelector('span');
    
    if (navigator.onLine) {
        dot.classList.remove('offline');
        dot.classList.add('online');
        text.textContent = 'Connected';
    } else {
        dot.classList.remove('online');
        dot.classList.add('offline');
        text.textContent = 'Offline Mode';
        showToast('Working offline - data will sync when connected');
    }
}

// ==========================================
// ==========================================
// SOCIAL SHARING
// ==========================================
function shareOn(platform) {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent('Check out Exam Master - the ultimate study companion for Sri Lankan students! 📚');
    
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
        default:
            return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function copyLink() {
    const url = window.location.href;
    
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard! 📋');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy link');
    });
}

// ==========================================
// PWA INSTALLATION
// ==========================================
function setupPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('installBtn').style.display = 'block';
    });
}

function installPWA() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            showToast('App installed successfully! 🎉');
        }
        deferredPrompt = null;
        document.getElementById('installBtn').style.display = 'none';
    });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showPrivacy() {
    alert('Privacy Policy\n\nWe respect your privacy. All your data is stored locally on your device. We do not collect or share any personal information.');
}

function showAbout() {
    alert('About Exam Master\n\nVersion 2.0\nDeveloped for Sri Lankan students\n\nFeatures:\n- AI Study Assistant\n- Pomodoro Timer\n- Offline Mode\n- Dashboard Customization\n\nMade with ❤️ for your success!');
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    // AI Input - Enter key
    document.getElementById('aiInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendAIMessage();
        }
    });
    
    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
        const themePanel = document.getElementById('themePanel');
        const profilePanel = document.getElementById('profilePanel');
        
        if (!e.target.closest('.theme-panel') && !e.target.closest('[onclick*="toggleThemePanel"]')) {
            themePanel.classList.remove('active');
        }
        
        if (!e.target.closest('.profile-panel') && !e.target.closest('[onclick*="toggleProfile"]')) {
            profilePanel.classList.remove('active');
        }
    });
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ==========================================
// EXPORT FOR GLOBAL ACCESS
// ==========================================
window.setTheme = setTheme;
window.toggleThemePanel = toggleThemePanel;
window.toggleProfile = toggleProfile;
window.saveProfile = saveProfile;
window.changeAvatar = changeAvatar;
window.closeAlert = closeAlert;
window.sendAIMessage = sendAIMessage;
window.askAI = askAI;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.shareOn = shareOn;
window.copyLink = copyLink;
window.installPWA = installPWA;
window.showPrivacy = showPrivacy;
window.showAbout = showAbout;

console.log('🎓 Exam Master initialized successfully!');
