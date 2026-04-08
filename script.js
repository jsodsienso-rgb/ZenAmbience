// 宣告全域變數，確保 config.js 已載入
let currentSceneKey = null;
let chatHistory = [];

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.activeNodes = {}; 
        this.bufferCache = {}; 
        this.isMuted = false;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
    }

    async loadAudio(url) {
        if (this.bufferCache[url]) return this.bufferCache[url];
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) { return null; }
    }

    async toggleSound(id, url, targetVolume, isActive) {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (isActive) {
            if (!this.activeNodes[id]) {
                const buffer = await this.loadAudio(url);
                if (!buffer) return;
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                const gainNode = this.ctx.createGain();
                gainNode.gain.value = 0;
                gainNode.connect(this.masterGain);
                source.connect(gainNode);
                source.start(0);
                gainNode.gain.linearRampToValueAtTime(targetVolume, this.ctx.currentTime + 1.5);
                this.activeNodes[id] = { source, gain: gainNode };
            }
        } else if (this.activeNodes[id]) {
            const { source, gain } = this.activeNodes[id];
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
            setTimeout(() => { try { source.stop(); } catch(e) {} delete this.activeNodes[id]; }, 1600);
        }
    }

    updateVolume(id, value) {
        if (this.activeNodes[id]) this.activeNodes[id].gain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.3);
    }

    stopAll() {
        Object.keys(this.activeNodes).forEach(id => {
            const { source, gain } = this.activeNodes[id];
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
            setTimeout(() => { try { source.stop(); } catch(e) {} delete this.activeNodes[id]; }, 1600);
        });
    }

    toggleMasterMute() {
        if (!this.masterGain) return false;
        this.isMuted = !this.isMuted;
        this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.5);
        return this.isMuted;
    }
}

const engine = new AudioEngine();
const messagesContainer = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

function appendMessage(role, text) {
    if (!text) return;
    const div = document.createElement('div');
    div.className = `flex justify-end animate-fade-in mb-6 shrink-0 w-full`;
    const bubbleClass = role === 'user' ? 'bubble-user' : 'bubble-gemini';
    const colorClass = role === 'user' ? 'text-slate-100' : 'text-slate-200';
    div.innerHTML = `<div class="${bubbleClass} p-4 max-w-[90%] text-sm leading-relaxed ${colorClass} font-light tracking-wide shadow-xl text-left whitespace-pre-wrap">${text}</div>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
}

async function callGemini(userInput, type = 'user') {
    let promptText = userInput;
    let thinkingText = "紳士貓正靜靜地聽著";
    if (type === 'welcome') promptText = `(系統通知: 訪客剛進入此地。請以溫和的口吻說句招呼語。)`;
    else if (type === 'scene_change') {
        promptText = `(系統通知: 來到 ${CONFIG.scenes[currentSceneKey].name}。說一句優雅的招呼。)`;
        thinkingText = CONFIG.scenes[currentSceneKey].thinking;
    }
    
    setThinking(true, thinkingText);
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: chatHistory.concat([{ parts: [{ text: promptText || "您好" }] }]) })
        });
        const data = await response.json();
        setThinking(false);
        const text = data.text || "我就在這兒陪著您。";
        if (type === 'user') chatHistory.push({ role: 'user', parts: [{ text: userInput }] }, { role: 'model', parts: [{ text: text }] });
        return text;
    } catch (e) {
        setThinking(false);
        return "環境有些干擾，我正聽著您的心聲。";
    }
}

function setThinking(active, text = "紳士貓正靜靜地聽著") {
    const el = document.getElementById('thinking-indicator');
    const txtEl = document.getElementById('thinking-text');
    if (txtEl) txtEl.innerText = text;
    el.style.opacity = active ? '1' : '0';
}

async function switchScene(key) {
    const cells = document.querySelectorAll('.grid-cell');
    const shuffled = Array.from(cells).sort(() => Math.random() - 0.5);
    for(let i=0; i<shuffled.length; i+=12) { shuffled.slice(i, i+12).forEach(c => c.classList.add('active')); await new Promise(r => setTimeout(r, 45)); }
    
    engine.stopAll();
    currentSceneKey = key;
    const scene = CONFIG.scenes[key];
    document.getElementById('bg-overlay').style.backgroundImage = `url('${scene.image}')`; 
    renderSoundGrid(scene);
    renderSceneTabs();
    
    const reaction = await callGemini(null, 'scene_change');
    await new Promise(r => setTimeout(r, 800));
    for(let i=0; i<shuffled.length; i+=12) { shuffled.slice(i, i+12).forEach(c => c.classList.remove('active')); await new Promise(r => setTimeout(r, 45)); }
    appendMessage('model', reaction);
}

function renderSoundGrid(scene) {
    const grid = document.getElementById('sound-grid'); grid.innerHTML = '';
    scene.sounds.forEach(sound => {
        const item = document.createElement('div'); item.className = 'flex flex-col space-y-4';
        item.innerHTML = `<span class="text-[10px] tracking-widest opacity-60 uppercase">${sound.name}</span><div class="flex items-center space-x-4"><button id="tog-${sound.id}" class="w-8 h-3 rounded-full bg-white/5 relative transition-all cursor-pointer"><div class="dot absolute left-0 top-0.5 w-2 h-2 bg-white/20 rounded-full transition-all"></div></button><input type="range" min="0" max="1" step="0.01" value="${sound.volume}" class="flex-grow h-[1px] bg-white/5 appearance-none"></div>`;
        grid.appendChild(item);
        const tog = item.querySelector(`#tog-${sound.id}`); const dot = tog.querySelector('.dot'); let active = false;
        tog.onclick = () => { 
            active = !active; 
            tog.classList.toggle('bg-white/20', active); 
            dot.style.transform = active ? 'translateX(18px)' : 'translateX(0)'; 
            dot.style.background = active ? '#fff' : 'rgba(255,255,255,0.2)'; 
            engine.toggleSound(sound.id, sound.url, item.querySelector('input').value, active); 
        };
        item.querySelector('input').oninput = (e) => engine.updateVolume(sound.id, e.target.value);
    });
}

function renderSceneTabs() {
    const list = document.getElementById('scene-list'); list.innerHTML = '';
    Object.keys(CONFIG.scenes).forEach(key => {
        const btn = document.createElement('button');
        btn.className = `px-5 py-2 text-[9px] tracking-[0.3em] uppercase rounded-full transition-all whitespace-nowrap ${currentSceneKey === key ? 'bg-white/20 border border-white/30' : 'bg-white/5 border border-transparent'} cursor-pointer`;
        btn.innerText = CONFIG.scenes[key].name; btn.onclick = (e) => { e.stopPropagation(); switchScene(key); toggleSceneMenu(false); };
        list.appendChild(btn);
    });
}

function toggleSceneMenu(force) { 
    const container = document.getElementById('scene-container'); 
    force !== undefined ? (force ? container.classList.add('open') : container.classList.remove('open')) : container.classList.toggle('open'); 
}

document.getElementById('scene-toggle-btn').onclick = (e) => { e.stopPropagation(); toggleSceneMenu(); };
window.onclick = () => toggleSceneMenu(false);

chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    appendMessage('user', text);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    const response = await callGemini(text);
    appendMessage('model', response);
};

window.onload = async () => {
    const grid = document.getElementById('transition-grid');
    for(let i=0; i<144; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        grid.appendChild(cell);
    }
    renderSceneTabs();
    const welcome = await callGemini(null, 'welcome');
    appendMessage('model', welcome);
    document.getElementById('scene-toggle-btn').classList.add('hint-pulse');
};

document.getElementById('global-mute').onclick = () => {
    const muted = engine.toggleMasterMute();
    document.getElementById('mute-icon').style.opacity = muted ? '1' : '0.3';
};
