const CONFIG = {
    scenes: {
        'nature': {
            name: '大自然', color: 'bg-emerald-950', 
            image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'birds', name: '林間鳥鳴', url: 'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg', volume: 0.3 },
                { id: 'stream', name: '溪流聲', url: 'https://actions.google.com/sounds/v1/ambiences/creek_flowing.ogg', volume: 0.4 }
            ],
            thinking: "林間微涼的風正緩緩拂過，紳士貓正靜靜地陪在您身邊..."
        },
        'cafe': {
            name: '咖啡廳', color: 'bg-stone-900', 
            image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'jazz', name: '氛圍爵士', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', volume: 0.15 },
                { id: 'chatter', name: '環境人聲', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg', volume: 0.12 }
            ],
            thinking: "暖色調的牆面讓心靈放鬆下來，紳士貓正安靜地坐在對面..."
        },
        'bar': {
            name: '酒吧', color: 'bg-neutral-950', 
            image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'bass', name: '低頻節奏', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', volume: 0.2 }
            ],
            thinking: "昏黃的光影在酒牆前交錯，紳士貓正沈穩地看著光點..."
        },
        'rainy': {
            name: '雨天', color: 'bg-slate-900', 
            image: 'https://images.unsplash.com/photo-1428592953211-077101b2021b?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'rain', name: '窗外雨聲', url: 'https://actions.google.com/sounds/v1/ambiences/rain_on_roof.ogg', volume: 0.5 },
                { id: 'thunder', name: '遠處雷鳴', url: 'https://actions.google.com/sounds/v1/ambiences/distant_thunder.ogg', volume: 0.2 }
            ],
            thinking: "雨滴在玻璃窗上劃過痕跡，紳士貓正伏在溫暖的角落聽著雨聲..."
        },
        'urban': {
            name: '都市氛圍', color: 'bg-indigo-950', 
            image: 'https://images.unsplash.com/photo-1470219556762-1771e7f9427d?q=80&w=1920&auto=format&fit=crop',
            sounds: [
                { id: 'traffic', name: '遠處車流', url: 'https://actions.google.com/sounds/v1/ambiences/city_street_ambience.ogg', volume: 0.2 }
            ],
            thinking: "落地窗外是璀璨的流光，紳士貓正與您一同凝視著黑夜..."
        }
    }
};