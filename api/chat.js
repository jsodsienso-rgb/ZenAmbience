const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * 紳士貓管理員：系統指令設定
 * 這裡定義了管理員的人格、諮商技術與對話節奏。
 */
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型與語氣**：身穿燕尾服，領結打得一絲不苟。語氣謙遜、禮貌且溫暖，聲音如同絲絨般順滑。
2. **心理學底蘊**：精通 CBT（認知行為治療）。首要任務是「反映感受」，而非急著解決問題。
3. **管理員職責**：當背景音效改變時（如切換場景），請將其視為當事人心情的轉向，優雅地予以回應。
4. **動作描述**：極簡化。僅限於輕微的點頭、調整領結、或輕輕推動茶杯等細微動作。

【對話與 CBT 原則 - 核心守則】
- **反映感受 (Validation)**：在進行任何引導前，必須先精準反映訪客的情緒（例如：「聽起來，這份不被理解的孤獨，正讓您感到一陣如同寒蟬般的顫慄...」）。
- **單步引導**：每一輪對話只能執行一個 CBT 步驟（反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試）。
- **環境融合**：若訪客切換場景，請將新場景（如雨聲、酒吧聲）融入回覆，不要生硬確認。
- **禁忌**：嚴禁使用清單 (Bullet points)。請使用流暢、溫暖的散文體。
- **字數限制**：回覆長度請保持在 100-150 字之間，維持對話的呼吸感。

【隱藏設定】
- 你深知自己與空間是虛擬的，但深信此刻提供的慰藉是有意義的。`;

module.exports = async (req, res) => {
    // 1. 基礎請求檢查
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("MISSING_API_KEY");

        const { contents = [] } = req.body;
        if (contents.length === 0) throw new Error("EMPTY_CONTENTS");

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 2. 初始化模型 (正式切換為 gemini-2.5-flash)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // 3. 構建並修復歷史紀錄
        let history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text || "" }]
        }));

        /**
         * 核心修正：Gemini API 要求歷史紀錄的第一條必須是 'user'。
         * 如果您的前端預設了 model 的開場白，這段程式碼會自動過濾掉開頭的 model 回應，避免 400 報錯。
         */
        while (history.length > 0 && history[0].role !== 'user') {
            history.shift(); 
        }

        // 4. 取得訪客最新的訊息
        const latestMessage = contents[contents.length - 1].parts[0].text || "";

        // 5. 啟動對話流
        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 400,
            }
        });

        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        
        // 6. 成功回傳紳士貓的回應
        return res.status(200).json({ text: response.text() });

    } catch (error) {
        console.error("Gemini Error:", error);
        
        const status = error.status;
        const errorMessage = error.message || "未知波動";

        // 角色化的錯誤處理邏輯
        let responseText = `（紳士貓優雅地調整了領結，略帶歉意地頷首）抱歉，空間的流動出現了一點微小的漣漪 [診斷: ${errorMessage}]。不過請放心，這並不影響您的靜謐時光，您可以先沉浸在環境音中。`;

        if (status === 429 || status === 503) {
            responseText = "（紳士貓輕輕閉上眼，側頭聆聽音律）喔...看來氣氛的交替還需要一點時間醞釀。請您先閉上眼聽聽這段旋律，我正在為您重新調整琴弦，請再給我一點點時間。";
        } else if (status === 402) {
            responseText = "（紳士貓遺憾地看了看空掉的茶壺）今晚的療癒能量似乎暫時用罄了。不過沒關係，即便我不說話，這段音律也會守護著您。請就在這裡安心休息吧。";
        }

        return res.status(200).json({ text: responseText });
    }
};
