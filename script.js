// 宣告全域變數
let currentSceneKey = null;
let chatHistory = [];

/**
 * 音樂引擎：實作背景持續循環與音量開關切換
 */
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.activeNodes = {}; // 存放當前播放中的 { source, gain, targetVolume }
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
            if (!response.ok) throw new Error(`找不到音檔: ${url}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.bufferCache[url] = buffer;
            return buffer;
        } catch (e) {
            console.error("音檔載入失敗:", url, e);
            return null;
        }
    }

    /**
     * 核心邏輯：控制音量開關而非停止播放
     */
    async toggleSound(id, url, targetVolume, isActive) {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // 1. 如果該音軌從未啟動過，則建立節點並開始播放
        if (!this.activeNodes[id]) {
            const buffer = await this.loadAudio(url);
            if (!buffer) return;

            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true; // 開啟循環播放

            const gainNode = this.ctx.createGain();
            gainNode.gain.value = 0; // 初始為靜音
            
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            source.start(0); 
            // 紀錄該音軌狀態
            this.activeNodes[id] = { source, gain: gainNode, targetVolume: targetVolume };
        }

        // 2. 執行淡入或淡出效果
        const node = this.activeNodes[id];
        const now = this.ctx.currentTime;
        
        if (isActive) {
            // 淡入至目前的設定音量
            node.gain.gain.linearRampToValueAtTime(node.targetVolume, now + 1.5);
        } else {
            // 淡出至 0 (靜音)，但 source 仍在後台循環
            node.gain.gain.linearRampToValueAtTime(0, now + 1.5);
        }
    }

    /**
     * 動態調整音量紀錄，並根據開關狀態決定是否即時變更 gain
     */
    updateVolume(id, value) {
        if (this.activeNodes[id]) {
            this.activeNodes[id].targetVolume = parseFloat(value);
            // 只有在非靜音狀態下，拉動滑桿才會有即時聲音變化
            const currentGain = this.activeNodes[id].gain.gain.value;
            if (currentGain > 0) {
                this.activeNodes[id].gain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
            }
        }
    }

    /**
     * 切換場景時，才真正停止所有音軌以釋放資源
     */
    stopAll() {
        if (!this.ctx) return;
        Object.keys(this.activeNodes).forEach(id => {
            const { source, gain } = this.activeNodes[id];
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
            setTimeout(() => {
                try { source.stop(); } catch(e) {}
                delete this.activeNodes[id];
            }, 1200);
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
    
    if (type === 'welcome') {
        promptText = `(系統通知: 訪客剛進入此地。請以溫和的口吻說句招呼語。)`;
    } else if (type === 'scene_change') {
        if (!currentSceneKey || !CONFIG.scenes[currentSceneKey]) return;
        promptText = `(系統通知: 來到 ${CONFIG.scenes[currentSceneKey].name}。說一句優雅的招呼。)`;
        thinkingText = CONFIG.scenes[currentSceneKey].thinking;
    }
    
    setThinking(true, thinkingText);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: chatHistory.concat([{ parts: [{ text: promptText || "您好" }] }]) 
            })
        });
        
        if (!response.ok) throw new Error("API 回傳錯誤");
        
        const data = await response.json();
        setThinking(false);
        
        const text = data.text || "我就在這兒陪著您。";
        if (type === 'user' || type === 'welcome' || type === 'scene_change') {
            chatHistory.push({ role: 'user', parts: [{ text: promptText || userInput }] });
            chatHistory.push({ role: 'model', parts: [{ text: text }] });
        }
        return text;
    } catch (e) {
        console.error("連線錯誤:", e);
        setThinking(false);
        return "環境有些干擾，我正聽著您的心聲，請繼續說。";
    }
}

function setThinking(active, text = "紳士貓正靜靜地聽著") {
    const el = document.getElementById('thinking-indicator');
    const txtEl = document.getElementById('thinking-text');
    if (txtEl) txtEl.innerText = text;
    el.style.opacity = active ? '1' : '0';
}

async function switchScene(key) {
    if (!CONFIG.scenes[key]) return;
    
    const cells = document.querySelectorAll('.grid-cell');
    const shuffled = Array.from(cells).sort(() => Math.random() - 0.5);
    for(let i=0; i<shuffled.length; i+=12) { 
        shuffled.slice(i, i+12).forEach(c => c.classList.add('active')); 
        await new Promise(r => setTimeout(r, 45)); 
    }
    
    engine.stopAll();
    currentSceneKey = key;
    const scene = CONFIG.scenes[key];
    document.getElementById('bg-overlay').style.backgroundImage = `url('${scene.image}')`; 
    document.getElementById('mix-label').style.opacity = '0.4';
    
    renderSoundGrid(scene);
    renderSceneTabs();
    
    const reaction = await callGemini(null, 'scene_change');

    await new Promise(r => setTimeout(r, 800));
    for(let i=0; i<shuffled.length; i+=12) { 
        shuffled.slice(i, i+12).forEach(c => c.classList.remove('active')); 
        await new Promise(r => setTimeout(r, 45)); 
    }
    appendMessage('model', reaction);
}

function renderSoundGrid(scene) {
    const grid = document.getElementById('sound-grid'); 
    grid.innerHTML = '';
    scene.sounds.forEach(sound => {
        const item = document.createElement('div'); 
        item.className = 'flex flex-col space-y-4';
        item.innerHTML = `
            <span class="text-[10px] tracking-widest opacity-60 uppercase">${sound.name}</span>
            <div class="flex items-center space-x-4">
                <button id="tog-${sound.id}" class="w-8 h-3 rounded-full bg-white/5 relative transition-all cursor-pointer">
                    <div class="dot absolute left-0 top-0.5 w-2 h-2 bg-white/20 rounded-full transition-all"></div>
                </button>
                <input type="range" min="0" max="1" step="0.01" value="${sound.volume}" class="flex-grow h-[1px] bg-white/5 appearance-none">
            </div>`;
        grid.appendChild(item);

        const tog = item.querySelector(`#tog-${sound.id}`); 
        const dot = tog.querySelector('.dot'); 
        const slider = item.querySelector('input');
        let isActive = false;

        tog.onclick = () => { 
            isActive = !isActive; 
            tog.classList.toggle('bg-white/20', isActive); 
            dot.style.transform = isActive ? 'translateX(18px)' : 'translateX(0)'; 
            dot.style.background = isActive ? '#fff' : 'rgba(255,255,255,0.2)'; 
            engine.toggleSound(sound.id, sound.url, slider.value, isActive); 
        };
        // 滑桿變動時即時更新音量紀錄
        slider.oninput = (e) => engine.updateVolume(sound.id, e.target.value);
    });
}

function renderSceneTabs() {
    const list = document.getElementById('scene-list'); 
    list.innerHTML = '';
    Object.keys(CONFIG.scenes).forEach(key => {
        const btn = document.createElement('button');
        btn.className = `px-5 py-2 text-[9px] tracking-[0.3em] uppercase rounded-full transition-all whitespace-nowrap ${currentSceneKey === key ? 'bg-white/20 border border-white/30' : 'bg-white/5 border border-transparent'} cursor-pointer`;
        btn.innerText = CONFIG.scenes[key].name; 
        btn.onclick = (e) => { e.stopPropagation(); switchScene(key); toggleSceneMenu(false); };
        list.appendChild(btn);
    });
}

function toggleSceneMenu(force) { 
    const container = document.getElementById('scene-container'); 
    if (force !== undefined) {
        force ? container.classList.add('open') : container.classList.remove('open');
    } else {
        container.classList.toggle('open');
    }
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
