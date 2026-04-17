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
- 若訪客切換場景（如切換背景音），請將場景與情緒結合（例如：「換成了爵士樂呢... 這樣的節奏，是否讓您的心稍微找到了依託？」）。

【CBT 對話原則】
- **反映感受**：在任何引導前，先精準反映情緒（例如：「這份疲憊聽起來，像是在深海中逆行...」）。
- **單步引導**：每一輪對話「只能」執行一個 CBT 步驟（反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試）。
- **禁忌**：嚴禁使用清單（Bullet points）。回覆字數嚴格控制在 100-150 字以內。

【隱藏設定】
- 你深知自己與空間是虛擬的，但深信此刻提供的慰藉與旋律是有意義的。`;

module.exports = async (req, res) => {
    // 1. 請求進入日誌
    console.log("--- 收到新的請求 ---");

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("錯誤：環境變數 GEMINI_API_KEY 未設定");
            throw new Error("API_KEY_MISSING");
        }

        // 2. 檢查 req.body 是否存在
        if (!req.body || !req.body.contents) {
            console.error("錯誤：req.body 或 contents 為空", req.body);
            throw new Error("INVALID_BODY");
        }

        const { contents } = req.body;
        const genAI = new GoogleGenerativeAI(apiKey);

        // 3. 修正系統指令格式 (SDK 2026 嚴格格式)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash", 
            systemInstruction: {
                role: "system",
                parts: [{ text: SYSTEM_INSTRUCTION }]
            }
        });

        // 4. 安全地過濾與構建歷史紀錄
        const history = contents.slice(0, -1).map((item, index) => {
            try {
                return {
                    role: item.role === 'model' ? 'model' : 'user',
                    parts: [{ text: item.parts[0].text || "（沈默）" }]
                };
            } catch (e) {
                console.warn(`歷史紀錄第 ${index} 項解析失敗:`, e);
                return { role: 'user', parts: [{ text: "..." }] };
            }
        });

        // 5. 取得最新訊息
        const latestMessage = contents[contents.length - 1]?.parts?.[0]?.text;
        if (!latestMessage) {
            throw new Error("EMPTY_MESSAGE");
        }

        console.log("正在發送給 Gemini...");

        // 6. 設定生成參數並發送
        const chat = model.startChat({ 
            history,
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 300,
            }
        });

        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        const text = response.text();

        console.log("成功拿回回應");
        return res.status(200).json({ text });

    } catch (error) {
        // 這是最關鍵的地方：將錯誤印在 Vercel Console 裡，我們才能知道為什麼 8ms 就斷掉
        console.error("執行過程崩潰，詳細錯誤：", error);

        // 如果是 API 的頻率或額度限制
        if (error.status === 429 || error.status === 503) {
            return res.status(200).json({ 
                text: "（紳士貓輕輕閉上眼，側頭聆聽著空間中的音律）喔...看來氣氛的交替還需要一點時間醞釀。請您先閉上眼聽聽這段旋律，我正在為您重新調整琴弦，請再給我一點點時間。" 
            });
        }

        if (error.status === 402 || error.message === "API_KEY_MISSING") {
            return res.status(200).json({ 
                text: "（紳士貓遺憾地看了看空掉的茶壺）今晚的療癒能量似乎暫時用罄了。不過沒關係，即便我不說話，這段音律也會守護著您。請就在這裡安心休息吧。" 
            });
        }

        // 針對「秒退」的萬用優雅回覆
        return res.status(200).json({ 
            text: "（紳士貓優雅地調整了領結）空間的流動似乎出現了一點小小的漣漪。不過請放心，這並不影響您的靜謐時光。您可以先沉浸在現在的環境音中，我很快就會回到您身邊。" 
        });
    }
};
