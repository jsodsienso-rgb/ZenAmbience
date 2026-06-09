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
            image: 'https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?q=80&w=2940&auto=format&fit=crop', // 您的圖片
            sounds: [
                { id: 'bird', name: '林間鳥鳴', url: './sounds/bird.mp3', volume: 0.4 },
                { id: 'wind', name: '微風拂過', url: './sounds/wind.mp3', volume: 0.45 },
                { id: 'cicada', name: '蟬聲不息', url: './sounds/cicada.mp3', volume: 0.25 },
                { id: 'leave', name: '落葉有痕', url: './sounds/leave.mp3', volume: 0.4 }
            ],
            thinking: "林間微涼的風正緩緩拂過，紳士貓正靜靜地陪在您身邊..."
        },
        'cafe': {
            name: '咖啡廳', 
            color: 'bg-stone-900', 
            image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'jazz', name: '氛圍爵士', url: './sounds/coffee jazz.mp3', volume: 0.45 },
                { id: 'coffemaker', name: '咖啡研磨', url: './sounds/coffee maker.mp3', volume: 0.6 }
            ],
            thinking: "暖色調的牆面讓心靈放鬆下來，紳士貓正安靜地坐在對面..."
        },
        'bar': {
            name: '酒吧', 
            color: 'bg-neutral-950', 
            image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'barband', name: '酒吧樂隊', url: './sounds/bar band.mp3', volume: 0.4 },
                { id: 'barpeople', name: '吵雜人群', url: './sounds/bar people.mp3', volume: 0.8 },
                { id: 'barspace', name: '愉快乾杯', url: './sounds/bar space.mp3', volume: 0.75 }
            ],
            thinking: "昏黃的光影在酒牆前交錯，紳士貓正沈穩地看著光點..."
        },
        'rainy': {
            name: '雨天', 
            color: 'bg-slate-900', 
            image: 'https://images.unsplash.com/photo-1552703042-01a6d1fc5abe?q=80&w=2070&auto=format&fit=crop', // 您的圖片
            sounds: [
                { id: 'rainy', name: '窗外雨聲', url: './sounds/rainy.mp3', volume: 0.6 },
                { id: 'thunder', name: '電台音樂', url: './sounds/Swan.mp3', volume: 0.3 }
            ],
            thinking: "雨滴在玻璃窗上劃過痕跡，紳士貓正伏在溫暖的角落聽著雨聲..."
        },
        'urban': {
            name: '都市氛圍', 
            color: 'bg-indigo-950', 
            image: 'https://images.unsplash.com/photo-1618340338709-027f57b98a16?q=80&w=2070&auto=format&fit=crop', // 您的圖片
            sounds: [
                { id: 'city', name: '街道行人', url: './sounds/city.mp3', volume: 0.7 },
                { id: 'citynoise', name: '都市噪音', url: './sounds/citynoise.mp3', volume: 0.7 },
                { id: 'citytraffic', name: '遠處車流', url: './sounds/citytraffic.mp3', volume: 0.7 }
            ],
            thinking: "落地窗外是璀璨的流光，紳士貓正與您一同凝視著黑夜..."
        }
    }
};
