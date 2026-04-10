/**
 * ZenAmbience - 場景與音效設定
 * 圖片路徑已更新為您上傳的實體檔案名稱
 * 音訊路徑已預留為 ./sounds/ 資料夾
 */
const CONFIG = {
    scenes: {
        'nature': {
            name: '大自然', 
            color: 'bg-emerald-950', 
            image: '177355595477477_P31837636.jpg', // 您的圖片
            sounds: [
                { id: 'birds', name: '林間鳥鳴', url: './sounds/birds.mp3', volume: 0.3 },
                { id: 'stream', name: '音樂', url: './sounds/Swan.mp3', volume: 0.4 }
            ],
            thinking: "林間微涼的風正緩緩拂過，紳士貓正靜靜地陪在您身邊..."
        },
        'cafe': {
            name: '咖啡廳', 
            color: 'bg-stone-900', 
            image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'jazz', name: '氛圍爵士', url: './sounds/jazz.mp3', volume: 0.15 }
            ],
            thinking: "暖色調的牆面讓心靈放鬆下來，紳士貓正安靜地坐在對面..."
        },
        'bar': {
            name: '酒吧', 
            color: 'bg-neutral-950', 
            image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'bass', name: '低頻節奏', url: './sounds/bar_vibes.mp3', volume: 0.2 }
            ],
            thinking: "昏黃的光影在酒牆前交錯，紳士貓正沈穩地看著光點..."
        },
        'rainy': {
            name: '雨天', 
            color: 'bg-slate-900', 
            image: 'images.jpeg', // 您的圖片
            sounds: [
                { id: 'rain', name: '窗外雨聲', url: './sounds/rain.mp3', volume: 0.5 },
                { id: 'thunder', name: '遠處雷鳴', url: './sounds/thunder.mp3', volume: 0.2 }
            ],
            thinking: "雨滴在玻璃窗上劃過痕跡，紳士貓正伏在溫暖的角落聽著雨聲..."
        },
        'urban': {
            name: '都市氛圍', 
            color: 'bg-indigo-950', 
            image: 'e7e80b1744fbcf0483fb76160205a40b.jpg', // 您的圖片
            sounds: [
                { id: 'traffic', name: '遠處車流', url: './sounds/city.mp3', volume: 0.2 }
            ],
            thinking: "落地窗外是璀璨的流光，紳士貓正與您一同凝視著黑夜..."
        }
    }
};
