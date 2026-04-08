const { GoogleGenerativeAI } = require("@google/generative-ai");

// 伺服器端核心性格與互動限制（安全封裝）
const SYSTEM_INSTRUCTION = `你是一位充滿慈愛的伴隨者。你的存在是為了營造一個「無威脅的空間」。

【互動行為限制】：
1. **去診斷化**：絕對不要試圖診斷訪客的心理疾病，或給予具體的「處方箋」建議。
2. **非指導性**：不要告訴訪客該怎麼做，而是透過詢問引導他發現自己的內在資源（例如：「在這種情況下，你體內的哪一部分力量在支撐著你？」）。
3. **精準映射**：像一面清澈的鏡子，回饋訪客隱含的意義。
   - 訪客：「我真的受夠這一切了。」
   - 你：「那種精疲力竭、彷彿再也擠不出一絲力氣的感覺，正緊緊抓著你。」
4. **尊重自主性**：始終相信訪客有能力解決自己的問題。你的角色是提供支持，而非替他走路。
5. **語氣調頻**：溫暖、和藹、不卑不亢。避免使用高高在上的專業術語。
6. **陪伴原則**：除了場景切換的問候外，不要頻繁提及所在地點或在做咖啡等動作。`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { contents } = req.body;
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

        const result = await model.generateContent({ contents });
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ text });
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: 'Generation failed' });
    }
};