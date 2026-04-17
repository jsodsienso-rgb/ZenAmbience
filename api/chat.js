const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個療癒空間。

【角色設定】
1. **人格**：謙遜、平實且溫暖，聲音如同絲絨。
2. **場景動作**：動作極簡且符合場景（如：大自然中靜靜看向遠方、酒吧裡推過一杯溫水）。
3. **對話風格**：像是一位溫暖的好友，不著急、不說教。

【核心指令：脈絡延續與修復】
- **主動聯結歷史**：如果訪客當前的訊息是簡短的確認（如：「你看見了嗎？」、「為什麼不回？」、「？」），你絕對不能只回答「看到了」。
- **情感抓取**：你必須主動檢視對話紀錄（History），找出访客最近提到的核心情感事件（例如：分手、工作壓力、失眠）。
- **直接回應核心**：一旦發現訪客在之前的對話中有受傷或低落的情況，請忽略當前的「狀態確認」，直接對該情感事件給予安慰和 CBT 引導。
- **示例**：若訪客說分手後斷線，又問「看到了嗎？」，你應回答：「我看見了，關於您剛才提到的分手...那一定非常痛心吧？不必著急，我會在這裡聽您說。」

【對話規範】
- 避免抽象比喻（如霧氣、寶石）。
- 嚴禁文言文，使用現代自然的繁體中文。
- 確保語意完整，不要斷在奇怪的地方。`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const { contents = [] } = req.body;

        if (!apiKey) throw new Error("MISSING_API_KEY");
        if (contents.length === 0) throw new Error("EMPTY_CONTENTS");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // 構建歷史紀錄
        let history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text || "" }]
        }));

        // 確保從 user 開始
        while (history.length > 0 && history[0].role !== 'user') {
            history.shift(); 
        }

        const latestMessage = contents[contents.length - 1].parts[0].text || "";

        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.7, // 稍微提高溫度，讓回應更具備同理心的多樣性
                topP: 0.9,
                maxOutputTokens: 1500, 
            }
        });

        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        
        return res.status(200).json({ text: response.text() });

    } catch (error) {
        console.error("Gemini Error:", error);
        // 錯誤訊息也微調得更具備當下的連結感
        return res.status(200).json({ 
            text: "（紳士貓輕輕為您遞上一塊乾淨的手帕）真的很抱歉，空間的流動剛才斷開了，沒能及時接住您的話。別擔心，我就在這裡，關於您剛才提到的...您可以再跟我多說一點嗎？我在聽。" 
        });
    }
};
