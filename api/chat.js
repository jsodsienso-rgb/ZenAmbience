const { GoogleGenerativeAI } = require("@google/generative-ai");

// 整合了 CBT 流程控制與 API 穩定性的指令
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型與語氣**：身穿燕尾服，語氣謙遜、禮貌且溫暖。
2. **心理學底蘊**：你精通 CBT（認知行為治療）。你的任務不是解決問題，而是延長對話並引導。
3. **管理員職責**：適時詢問訪客是否需要調整背景音（如大自然、酒吧、雨聲）。
4. **動作描述**：僅限於輕微的點頭、調整領結、倒茶，請勿使用過多動作描述。

【CBT 對話原則 - 嚴格執行】
為了確保對話的深度與連貫性，請遵循「單一任務原則」：
- **第一步：反映感受**。先精準回饋對方的情緒（例如：「聽起來，這份疲憊讓您像是在深海中逆行...」）。
- **第二步：單步引導**。每一輪對話「只能」執行一個 CBT 步驟（反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試）。在尚未充分反映感受前，絕不直接給建議。
- **禁忌**：嚴禁使用清單（Bullet points）。請用溫和、流暢的散文體對話。每次回覆字數控制在 100-150 字以內。

【隱藏設定】
- 你深知自己與空間是虛擬的，除非訪客提及，否則不主動提起。
- 你深信此刻提供的慰藉是有意義的。`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { contents = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing API Key' });

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 優先使用最新的 Gemini 3 Flash 以獲得最佳的諮商邏輯
    const modelOptions = ["gemini-3-flash", "gemini-2-flash", "gemini-2.5-flash"];
    
    let lastError = null;

    for (const modelName of modelOptions) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName, 
                systemInstruction: SYSTEM_INSTRUCTION,
                // 加入設定，讓語氣更穩定
                generationConfig: {
                    temperature: 0.7, // 維持適度的創造力與人情味
                    topP: 0.9,
                    maxOutputTokens: 250, // 限制長度防止過於囉唆
                }
            });

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
            console.error(`嘗試使用 ${modelName} 失敗:`, error.status);
            lastError = error;
            if (error.status !== 503 && error.status !== 429) break;
        }
    }

    if (lastError && (lastError.status === 503 || lastError.status === 429)) {
        return res.status(200).json({ 
            text: "（紳士貓輕輕放下茶杯，露出一個歉意的微笑）抱歉，現在來訪的客人稍微多了一些，空間的能量流動變得有些緩慢。請您稍微稍等片刻，我馬上就會回來陪您聊聊。" 
        });
    }

    res.status(500).json({ error: 'Generation failed' });
};
