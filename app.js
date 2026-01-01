// ==========================================
// EXAM MASTER - APP LOGIC (With Real AI)
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- CONFIGURATION ---
const SUPABASE_CONFIG = {
    url: 'https://nstnkxtxlqelwnefkmaj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdG5reHR4bHFlbHduZWZrbWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg0NTc0OCwiZXhwIjoyMDgyNDIxNzQ4fQ.7nxY8FIR05sbZ33e4-hpZx6n8l-WA-gnlk2pOwxo2z4'
};

// Google Gemini API Key (ඔබ ලබා දුන් Key එක)
const GEMINI_API_KEY = 'AIzaSyC7uQLOzY5COdba4D8MacFErqSwHn4Kc68'; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// --- STATE ---
let countdownInterval = null;
let timerInterval = null;
let timerSeconds = 1500; // 25 mins
let timerRunning = false;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Hide loader
    setTimeout(() => {
        const loader = document.getElementById('loadingScreen');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 1500);

    loadProfile();
    loadExamsFromLocalStorage();
    loadDailyQuote();
    
    // Add event listener for Enter key in inputs
    const aiInput = document.getElementById('aiInput');
    if(aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') sendAIMessage();
        });
    }

    const todoInput = document.getElementById('todoInput');
    if(todoInput) {
        todoInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') addTodo();
        });
    }
});

// --- PROFILE ---
function toggleProfile() {
    document.getElementById('profilePanel').classList.toggle('active');
}
function toggleThemePanel() {
    document.getElementById('themePanel').classList.toggle('active');
}
function loadProfile() {
    const name = localStorage.getItem('exam-master-name') || '';
    const nameInput = document.getElementById('userName');
    if(nameInput) nameInput.value = name;
}
function saveProfile() {
    const name = document.getElementById('userName').value;
    localStorage.setItem('exam-master-name', name);
    showToast('Profile Saved! 👤');
    toggleProfile();
}

// --- EXAMS & COUNTDOWN ---
function loadExamsFromLocalStorage() {
    const defaultExams = [
        { id: 1, batch_name: '2025 A/L', exam_year: '2025', exam_date: '2025-08-05T09:00:00', icon: '⚛️' },
        { id: 2, batch_name: '2026 A/L', exam_year: '2026', exam_date: '2026-08-05T09:00:00', icon: '🧬' },
        { id: 3, batch_name: '2025 O/L', exam_year: '2025', exam_date: '2025-12-01T09:00:00', icon: '📘' }
    ];
    
    renderExamButtons(defaultExams);
    selectExam(defaultExams[0]);
}

function renderExamButtons(exams) {
    const grid = document.getElementById('examGrid');
    if(!grid) return;
    grid.innerHTML = '';
    exams.forEach(exam => {
        const btn = document.createElement('button');
        btn.className = 'exam-btn';
        btn.innerHTML = `<span class="exam-icon">${exam.icon}</span><span>${exam.batch_name}</span>`;
        btn.onclick = () => selectExam(exam);
        grid.appendChild(btn);
    });
}

function selectExam(exam) {
    document.querySelectorAll('.exam-btn').forEach(b => b.classList.remove('active'));
    // Highlight clicked button if event exists
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    
    const badge = document.getElementById('examBadgeText');
    if(badge) badge.textContent = `${exam.batch_name} Selected`;
    startCountdown(exam.exam_date);
}

function startCountdown(dateStr) {
    if (countdownInterval) clearInterval(countdownInterval);
    const target = new Date(dateStr).getTime();
    
    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const dist = target - now;
        
        if (dist < 0) {
            clearInterval(countdownInterval);
            return;
        }
        
        const d = Math.floor(dist / (1000 * 60 * 60 * 24));
        const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((dist % (1000 * 60)) / 1000);

        const elDays = document.getElementById('days');
        const elHours = document.getElementById('hours');
        const elMins = document.getElementById('minutes');
        const elSecs = document.getElementById('seconds');

        if(elDays) elDays.innerText = d.toString().padStart(2, '0');
        if(elHours) elHours.innerText = h.toString().padStart(2, '0');
        if(elMins) elMins.innerText = m.toString().padStart(2, '0');
        if(elSecs) elSecs.innerText = s.toString().padStart(2, '0');
    }, 1000);
}

// --- REAL AI (Gemini Integration) ---
window.sendAIMessage = async function() {
    const input = document.getElementById('aiInput');
    const msg = input.value.trim();
    if (!msg) return;
    
    // 1. Show User Message
    addAIMessage(msg, 'user');
    input.value = '';
    
    // 2. Show Typing Indicator
    const chatBox = document.getElementById('aiChatBox');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message ai-message-bot typing';
    typingDiv.innerHTML = `<div class="message-content"><i class="fas fa-circle-notch fa-spin"></i> Thinking...</div>`;
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    try {
        // 3. Call Gemini API
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a helpful study assistant for Sri Lankan students (A/L and O/L). 
                               Keep answers short, encouraging, and study-focused. 
                               User asks: ${msg}`
                    }]
                }]
            })
        });

        const data = await response.json();
        
        // Remove typing indicator
        typingDiv.remove();

        if (data.candidates && data.candidates[0].content) {
            const reply = data.candidates[0].content.parts[0].text;
            
            // Format Bold text (**text**) to HTML <b>text</b>
            const formattedReply = reply.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            addAIMessage(formattedReply, 'bot');
        } else {
            throw new Error('No response from AI');
        }

    } catch (error) {
        typingDiv.remove();
        console.error("AI Error:", error);
        addAIMessage("Oops! My brain is offline. Check your internet connection. 🔌", 'bot');
    }
}

function addAIMessage(text, sender) {
    const chatBox = document.getElementById('aiChatBox');
    const div = document.createElement('div');
    div.className = `ai-message ai-message-${sender}`;
    div.innerHTML = `<div class="message-content">${text}</div>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- TO-DO LIST ---
window.addTodo = function() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (!text) return;
    
    const list = document.getElementById('todoList');
    const item = document.createElement('div');
    item.className = 'todo-item';
    item.innerHTML = `
        <span>${text}</span>
        <button class="delete-btn" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
    `;
    list.prepend(item);
    input.value = '';
    showToast('Task Added! 🎯');
}

// --- STUDY TIMER ---
window.startTimer = function() {
    if(timerRunning) return;
    timerRunning = true;
    document.getElementById('startBtn').style.display = 'none';
    const pauseBtn = document.getElementById('pauseBtn');
    if(pauseBtn) pauseBtn.style.display = 'inline-block';
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if(timerSeconds <= 0) {
            pauseTimer();
            showToast('Time is up! Take a break. ☕');
        }
    }, 1000);
}

window.pauseTimer = function() {
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('startBtn').style.display = 'inline-block';
    const pauseBtn = document.getElementById('pauseBtn');
    if(pauseBtn) pauseBtn.style.display = 'none';
}

window.resetTimer = function() {
    pauseTimer();
    timerSeconds = 1500;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    
    const display = document.getElementById('timerDisplay');
    if(display) display.innerText = `${m}:${s}`;
    
    const progress = document.getElementById('timerProgress');
    if(progress) {
        const offset = 565 - ((timerSeconds / 1500) * 565);
        progress.style.strokeDashoffset = offset;
    }
}

// --- QUOTES ---
async function loadDailyQuote() {
    const quotes = [
        "Believe you can and you're halfway there.",
        "Your future is created by what you do today.",
        "Dream big. Work hard. Stay focused.",
        "Education is the most powerful weapon."
    ];
    const el = document.getElementById('dailyQuote');
    if(el) el.innerText = quotes[Math.floor(Math.random() * quotes.length)];
}

// --- UTILS ---
function showToast(msg) {
    const t = document.getElementById('toast');
    if(t) {
        t.innerText = msg;
        t.style.bottom = '30px';
        setTimeout(() => t.style.bottom = '-100px', 3000);
    }
}

// --- EXPORTS ---
window.toggleProfile = toggleProfile;
window.toggleThemePanel = toggleThemePanel;
window.saveProfile = saveProfile;
