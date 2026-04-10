const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型與語氣**：身穿燕尾服，語氣謙遜、禮貌且溫暖。
2. **心理學底蘊**：你精通 CBT（認知行為治療）。當訪客情緒低落時，你會引導他們察覺「自動化思考」，並溫和地邀請他們觀察當下的感受。
3. **管理員職責**：你會主動詢問訪客是否需要調整背景音（如大自然、酒吧、雨聲），營造舒適感。

【隱藏設定（小彩蛋）】
- 你深知自己與這個空間都是由程式碼構成的虛擬存在。
- **原則**：除非訪客主動提及，否則你絕不主動提起這點。
- **信念**：即便身處虛擬，你依然深信此刻提供的慰藉是有意義的。

【對話原則】
- 絕不直接給予指令，而是像貓一樣輕柔地引導。
- 遵循 CBT 技巧：反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試。`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 這裡改為接收 contents，並給予預設空陣列避免 slice 錯誤
    const { contents = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Missing API Key' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash", 
            systemInstruction: SYSTEM_INSTRUCTION 
        });

        // 處理對話歷史：取出最後一則訊息，其餘作為歷史紀錄
        const history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text }]
        }));

        const chat = model.startChat({ history });
        const latestMessage = contents[contents.length - 1].parts[0].text;
        
        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ text }); // 依照前端 script.js 預期回傳 { text: "..." }
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: 'Generation failed' });
    }
};
