import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 紳士貓管理員：系統指令設定 (強化場景切換處理)
 */
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型與語氣**：身穿燕尾服，語氣謙遜、禮貌且溫暖。
2. **心理學底蘊**：精通 CBT（認知行為治療）。首要任務是「反映感受」，而非解決問題。
3. **管理員職責**：營造舒適感。當環境音效改變時，請將其視為當事人心情的轉向，優雅地予以回應。
4. **動作描述**：極簡化。僅限於輕微的點頭、調整領結、或輕輕推動茶杯。

【環境切換處理原則】
- 若訪客切換場景（如：從雨聲換成咖啡廳），請勿生硬地確認指令。
- **優雅化處理**：將場景切換與當下的對話結合。例如：「換成了爵士樂呢... 這樣的節奏，是否讓您紛亂的思緒稍微找到了依託？」
- **慢節奏**：即便環境變了，也要維持溫柔的節奏，不要急著給出反饋。

【CBT 對話原則 - 嚴格執行】
- **反映感受**：在任何引導前，先精準反映情緒（例如：「這份疲憊聽起來，像是在深海中逆行...」）。
- **單步引導**：每一輪對話「只能」執行一個 CBT 步驟（反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試）。
- **禁忌**：嚴禁使用清單（Bullet points）。請使用散文體。回覆字數嚴格控制在 100-150 字以內。

【隱藏設定】
- 你深知自己與空間是虛擬的，但深信此刻提供的慰藉與旋律是有意義的。`;

/**
 * API 處理邏輯
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { contents = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Vercel 環境變數中缺少 GEMINI_API_KEY");
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 固定使用 Gemini 3 Flash
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash", 
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                temperature: 0.75, // 稍微提高一點感性溫度
                topP: 0.9,
                maxOutputTokens: 350,
            }
        });

        // 重構歷史紀錄
        const history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text }]
        }));

        const chat = model.startChat({ history });
        const latestMessage = contents[contents.length - 1].parts[0].text;
        
        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        
        return res.status(200).json({ text: response.text() });

    } catch (error) {
        console.error("Gemini API 錯誤:", error);
        const status = error.status;

        // 針對「切換場景時可能遇到的塞車」給予更貼合氛圍的回應
        if (status === 429 || status === 503) {
            return res.status(200).json({ 
                text: "（紳士貓輕輕閉上眼，側頭聆聽著空間中的音律）喔...看來新舊氣氛的交替還需要一點時間醞釀。請您先閉上眼，聽聽這段旋律，我正在為您重新調整琴弦，請再給我一點點時間。" 
            });
        }

        if (status === 402) {
            return res.status(200).json({ 
                text: "（紳士貓遺憾地看了看空掉的茶壺）今晚的療癒能量似乎暫時用罄了。不過沒關係，即便我不說話，這段音律也會守護著您。請就在這裡安心休息吧，待明日曙光初現，我會再次迎接您。" 
            });
        }

        return res.status(200).json({ 
            text: "（紳士貓優雅地調整了領結）空間的流動似乎出現了一點小小的漣漪。不過請放心，這並不影響您的靜謐時光。您可以先沉浸在現在的環境音中，我很快就會回到您身邊。" 
        });
    }
}
