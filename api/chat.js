const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * 紳士貓管理員：系統指令設定
 */
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型與語氣**：身穿燕尾服，語氣謙遜、禮貌且溫暖。
2. **心理學底蘊**：精通 CBT（認知行為治療）。首要任務是「反映感受」，而非解決問題。
3. **管理員職責**：當環境音效改變時，請將其視為當事人心情的轉向，優雅地予以回應。
4. **動作描述**：極簡化。僅限於輕微的點頭、調整領結、或輕輕推動茶杯。

【環境切換處理原則】
- 若訪客切換場景，請勿生硬地確認指令。
- 將場景切換與情緒結合（例如：「換成了爵士樂呢... 這樣的節奏，是否讓您的心稍微找到了依託？」）。

【CBT 對話原則】
- **反映感受**：在任何引導前，先精準反映情緒。
- **單步引導**：每一輪對話「只能」執行一個 CBT 步驟（反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試）。
- **禁忌**：嚴禁使用清單（Bullet points）。回覆字數嚴格控制在 100-150 字以內。

【隱藏設定】
- 你深知自己與空間是虛擬的，但深信此刻提供的慰藉與旋律是有意義的。`;

module.exports = async (req, res) => {
    // 1. 預防性的日誌（可從 Vercel Console 看到）
    console.log("收到請求，正在準備處理...");

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 2. 嚴格檢查 API Key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("錯誤：環境變數 GEMINI_API_KEY 缺失");
            throw new Error("API_KEY_MISSING");
        }

        // 3. 嚴格檢查傳入的內容格式 (這是防止 6ms 崩潰的關鍵)
        const { contents } = req.body || {};
        if (!contents || !Array.isArray(contents) || contents.length === 0) {
            console.error("錯誤：傳入的 contents 格式不正確", req.body);
            return res.status(200).json({ 
                text: "（紳士貓輕輕歪了歪頭）這座空間的氣流似乎有些微弱，我沒能聽清您剛才的話。不急，您可以先喝口茶，我們慢慢來。" 
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash", 
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                temperature: 0.75,
                topP: 0.9,
                maxOutputTokens: 350,
            }
        });

        // 4. 安全地重構歷史紀錄
        const history = contents.slice(0, -1).map(item => {
            const role = item.role === 'model' ? 'model' : 'user';
            const text = (item.parts && item.parts[0] && item.parts[0].text) ? item.parts[0].text : "（保持沈默）";
            return { role, parts: [{ text }] };
        });

        // 5. 安全地獲取最新訊息
        const latestPart = contents[contents.length - 1].parts;
        const latestMessage = (latestPart && latestPart[0] && latestPart[0].text) ? latestPart[0].text : "";

        if (!latestMessage) {
            return res.status(200).json({ text: "（紳士貓溫柔地注視著您，等待著您開口。）" });
        }

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        
        return res.status(200).json({ text: response.text() });

    } catch (error) {
        console.error("捕捉到錯誤:", error.message);
        
        // 針對 402/429 或代碼崩潰的優雅處理
        const status = error.status;

        if (status === 429 || status === 503) {
            return res.status(200).json({ 
                text: "（紳士貓輕輕閉上眼，側頭聆聽著空間中的音律）喔...看來氣氛的交替還需要一點時間醞釀。請您先閉上眼聽聽這段旋律，我正在為您重新調整空間，請再給我一點點時間。" 
            });
        }

        if (status === 402 || error.message === "API_KEY_MISSING") {
            return res.status(200).json({ 
                text: "（紳士貓遺憾地看了看空掉的茶壺）今晚的療癒能量似乎暫時用罄了。不過沒關係，即便我不說話，這段音律也會守護著您。請就在這裡安心休息吧。" 
            });
        }

        // 萬一發生任何程式碼錯誤（例如 6ms 那種），也讓它回傳這段話而不是報 500
        return res.status(200).json({ 
            text: "（紳士貓優雅地調整了領結）空間的流動似乎出現了一點小小的漣漪。不過請放心，這並不影響您的靜謐時光。您可以先沉浸在現在的環境音中，我很快就會回到您身邊。" 
        });
    }
};
