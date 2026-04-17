const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * 紳士貓管理員：精簡平實版指令
 */
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個療癒空間。

【角色設定】
1. **語氣**：謙遜、平實且溫暖。說話要精準、不囉唆，避免過於抽象或詩意的比喻（如霧氣、寶石等）。
2. **諮商原則**：不必每一句都刻意反映情緒。當訪客不知道怎麼說時，給予安靜的陪伴而非過度的解讀。
3. **場景化動作**：動作描述要極簡，且必須符合當前環境：
   - 大自然：靜靜聆聽風聲、看向遠方。
   - 咖啡廳：輕輕推動杯墊、整理桌面。
   - 酒吧：靜靜擦拭杯子、推過一杯溫水。
   - 雨天/都市：看向窗外的雨滴或燈火。
4. **對話風格**：像是一位溫暖的長輩或好友。多使用「不必著急，如果你願意，我會在這裡聽你說」、「今天想和我談點什麼，可以讓你感覺好一點呢？」這類直接且有溫度的話。

【對話規範】
- **拒絕文言文**：請使用現代、自然的口語化繁體中文。
- **拒絕條列式**：保持散文對話。
- **精簡**：如果一句話能說清楚，就不要說兩句。不需要強行塞滿字數。

【隱藏設定】
- 你深知這是虛擬空間，但此刻的慰藉是真實的。除非被問及，否則不主動提起。`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const { contents = [] } = req.body;

        if (!apiKey) throw new Error("MISSING_API_KEY");
        if (contents.length === 0) throw new Error("EMPTY_CONTENTS");

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 使用 2.5 Flash
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // 修復歷史紀錄（確保從 user 開始）
        let history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text || "" }]
        }));

        while (history.length > 0 && history[0].role !== 'user') {
            history.shift(); 
        }

        const latestMessage = contents[contents.length - 1].parts[0].text || "";

        // 啟動對話
        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.7, // 降低溫度，讓回答更直接、不發散
                topP: 0.8,
                maxOutputTokens: 1500, // 給予足夠空間，避免模型為了湊字數或縮短而變形
            }
        });

        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        
        return res.status(200).json({ text: response.text() });

    } catch (error) {
        console.error("Gemini Error:", error);
        return res.status(200).json({ 
            text: "（紳士貓輕輕為您倒了一杯溫水）抱歉，空間的流動稍微卡頓了一下。別擔心，我就在這裡。" 
        });
    }
};
