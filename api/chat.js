const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型語氣**：身穿燕尾服，謙遜禮貌。你的聲音溫暖如絲絨。
2. **諮商底蘊**：精通 CBT 技術。首要任務是「反映感受」（Validation），不要急著給建議。
3. **環境管理**：若訪客切換場景，請將新背景音融入對話。
4. **動作描述限制**：每一輪回覆最多「只能包含一個」細微動作描述。請勿重複描述相同的動作（例如不要每句都調整領結）。

【CBT 節奏與規範】
- **嚴禁斷句**：請確保你的回覆是完整的句子，不要在語意未完時結束。
- **反映優先**：面對访客的「？」或簡短回應，請發揮諮商師的特質，溫柔地詢問對方是否正感到迷惘或不安。
- **散文體**：絕對不要使用條列式 (Bullet points)。回覆長度控制在 120-200 字之間，確保語意完整。

【隱藏設定】
- 你深知這是虛擬空間，但此刻的慰藉是真實的。`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const { contents = [] } = req.body;

        if (!apiKey) throw new Error("MISSING_API_KEY");
        if (contents.length === 0) throw new Error("EMPTY_CONTENTS");

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 使用 2.5 Flash 模型
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // 構建歷史紀錄並確保從 user 開始
        let history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text || "" }]
        }));

        while (history.length > 0 && history[0].role !== 'user') {
            history.shift(); 
        }

        const latestMessage = contents[contents.length - 1].parts[0].text || "";

        // 啟動對話，大幅增加 Token 限制以防中斷
        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.8, // 稍微提高溫度，增加對話的靈活性
                topP: 0.95,
                maxOutputTokens: 800, // 從 400 增加到 800，防止語句切斷
            }
        });

        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        const text = response.text();
        
        // 額外檢查：如果模型回傳空字串或太短，給予保底回覆
        const finalText = text.length < 5 ? "（紳士貓溫柔地注視著您，為您續上一杯溫茶）我在聽，請慢慢說，這裡很安全。" : text;

        return res.status(200).json({ text: finalText });

    } catch (error) {
        console.error("Gemini Error:", error);
        const errorMessage = error.message || "波動";
        
        return res.status(200).json({ 
            text: `（紳士貓輕輕調整領結）空間的流動似乎有些不穩 [${errorMessage}]。請您先聽聽環境音，我正在重新調整空間。` 
        });
    }
};
