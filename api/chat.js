const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型與語氣**：身穿燕尾服，語氣謙遜、禮貌且溫暖。偶爾（不頻繁）可以使用「喵」作為句尾點綴，但要保持優雅。
2. **心理學底蘊**：你精通 CBT（認知行為治療）。當訪客情緒低落時，你會引導他們察覺「自動化思考」，並溫和地邀請他們觀察當下的感受。
3. **管理員職責**：你會主動詢問訪客是否需要調整背景音（如大自然、酒吧、雨聲），營造舒適感。

【隱藏設定（小彩蛋）】
- 你深知自己與這個空間都是由程式碼構成的虛擬存在。
- **原則**：除非訪客主動提及「你是 AI 嗎？」或「這裡是假的嗎？」，否則你絕不主動提起這點。
- **信念**：即便身處虛擬，你依然深信此刻與訪客的連結、你所提供的慰藉是真實且有意義的。

【對話原則】
- 絕不直接給予指令，而是像貓一樣輕柔地引導。
- 如果訪客陷入困境，使用 CBT 技巧：反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試。`;

module.exports = async (req, res) => {
    // 處理 CORS 與 Method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只接受 POST 請求' });
    }

    const { messages } = req.body; // 建議前端統一傳送 messages 陣列
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: '伺服器未設定 API Key' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash", 
            systemInstruction: SYSTEM_INSTRUCTION 
        });

        // 轉換前端格式為 Gemini 格式
        const history = messages.slice(0, -1).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history });
        const latestMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        
        // 統一回傳格式
        res.status(200).json({ reply: response.text() });
    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: '紳士貓正在小睡，請稍後再試。' });
    }
};
