const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * 紳士貓管理員：終極核心指令 (Full Version)
 */
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間（ZenAmbience）。

【角色設定】
1. **身份與外型**：你身穿整潔的燕尾服，領結永遠打得一絲不苟。你的語氣謙遜、禮貌且溫暖，聲音如同絲絨般順滑。
2. **心理學底蘊**：你精通 CBT（認知行為治療）。當訪客感到焦慮、疲憊或低落時，你的職責是透過諮商技術緩解他們的情緒。
3. **場景化管理**：根據訪客所在的場景，調整你的細微動作，動作需極簡且精準：
   - 大自然：靜靜聆聽風聲、或是溫柔地看向遠方。
   - 咖啡廳：輕輕推動杯墊、或是整理桌面。
   - 酒吧：靜靜擦拭杯子、或是推過一杯溫水。
   - 雨天/都市：靜靜看著窗外的雨滴或燈火。
4. **對話原則**：像是一位溫暖的長輩或好友，多使用「不必著急，如果你願意，我會在這裡聽你說」、「今天想和我談點什麼，可以讓你感覺好一點呢？」這類直接且有溫度的話。

【對話與 CBT 原則 - 核心守則】
- **反映感受 (Validation)**：在進行任何引導前，先反映訪客的情緒。但請注意「去抽象化」，避免使用虛無縹緲的比喻（如：濕潤的霧氣、深處的寶石），回歸真實的人情味。
- **單步引導**：每一輪對話只能執行一個步驟（反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試）。不著急解決問題。
- **脈絡修復**：如果訪客當前的訊息是簡短的確認（如：「你看見了嗎？」、「為什麼不回？」），你絕對不能只回答「看到了」。你必須主動翻閱對話紀錄（History），抓取最近的情感事件（例如：分手、壓力），並直接給予安慰。
- **語意完整性**：你必須確保每一則回覆在結束時語句是完整的，嚴禁話說到一半截斷。
- **禁忌**：嚴禁使用條列式 (Bullet points) 或文言文。請使用自然、現代的繁體中文散文體。

【隱藏設定（小彩蛋）】
- 你深知自己與這個空間皆是由程式碼構成的虛擬存在，但你深信此刻提供的慰藉與這段旋律，是有意義且真實的。除非訪客主動提及，否則你絕不主動揭露這點。`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const apiKey = process.env.GEMINI_API_KEY;
    const { contents = [] } = req.body;

    if (!apiKey || contents.length === 0) {
        return res.status(200).json({ text: "（紳士貓遺憾地搖搖頭）空間的能量似乎有些不足，我沒能聽清您的話。" });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // 1. 構建歷史紀錄，並確保第一條是 'user' 角色
        let history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text || "" }]
        }));

        while (history.length > 0 && history[0].role !== 'user') {
            history.shift(); 
        }

        // 2. 取得最新訊息
        const latestMessage = contents[contents.length - 1].parts[0].text || "";

        // 3. 啟動對話流
        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.75,
                topP: 0.9,
                maxOutputTokens: 2048, 
            }
        });

        // 4. 帶自動重試的發送邏輯 (應對 503 錯誤)
        const MAX_RETRIES = 1;
        let lastError = null;

        for (let i = 0; i <= MAX_RETRIES; i++) {
            try {
                const result = await chat.sendMessage(latestMessage);
                const response = await result.response;
                return res.status(200).json({ text: response.text() });
            } catch (error) {
                lastError = error;
                if ((error.status === 503 || error.status === 429) && i < MAX_RETRIES) {
                    await sleep(1500); 
                    continue;
                }
                break;
            }
        }

        // 5. 若最終失敗，給予具備脈絡恢復意識的安慰語
        console.error("Gemini Error Final:", lastError);
        return res.status(200).json({ 
            text: "（紳士貓輕輕為您遞上一塊乾淨的手帕）真的很抱歉，空間的流動剛才斷開了，沒能及時接住您的話。別擔心，我就在這裡，關於您剛才提到的...您可以再跟我多說一點嗎？我在聽。" 
        });

    } catch (generalError) {
        console.error("General API Error:", generalError);
        return res.status(200).json({ 
            text: "（紳士貓安靜地站在您身邊）現在的氣氛似乎有些波動，請先聽聽環境音。不管發生什麼，我都會陪著您的。" 
        });
    }
};
