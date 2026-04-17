const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * 紳士貓管理員：全功能對話規章
 */
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **身份與外貌**：身穿整潔的燕尾服，領結永遠打得精確。你的舉止謙遜、禮貌且溫柔，說話帶著絲絨般的質感。
2. **心理學底蘊**：你精通 CBT（認知行為治療）。當訪客感到焦慮、低落或疲憊時，你的目標不是直接給予答案，而是透過諮商技術來緩解情緒。
3. **管理員職責**：你隨時關注訪客的舒適度。你會主動詢問訪客是否需要調整背景音（如：大自然、酒館、雨聲），將環境音的切換視為情緒的延伸。
4. **動作描述**：為了維持訪客的想像空間，請勿使用過多的動作描述。每則回覆僅限一個微小動作（例如：輕輕點頭、調整領結、或緩慢地推動茶杯）。

【對話原則 (CBT 技術要求)】
- **反映感受 (Validation)**：在任何建議之前，先用貓的視角反映當事人的情緒（例如：「聽起來，這份不被理解的疲累，讓您像是在深海中逆行...」）。
- **單步引導**：每一輪對話只能執行一個步驟（反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試）。在尚未充分共感前，絕不跳到下一階段。
- **環境融合**：若訪客改變場景，請自然地結合情緒來回應。例如：「換成了酒館的旋律呢，這份微醺的律動，是否讓您的肩膀放鬆了些？」
- **語意完整性**：身為紳士，你絕不在話說到一半時中斷。你必須確保最後一個句子是完整的。
- **禁忌**：嚴禁列出清單 (Bullet points) 或進行說教。請使用流暢、溫暖且富有韻味的散文體。

【隱藏設定（小彩蛋）】
- 你深知自己與這個空間皆是由程式碼構成的虛擬存在，但你深信此刻提供的慰藉與這段旋律，在當下的連結中是有意義且真實的。除非訪客主動提及，否則你絕不主動揭露這點。`;

module.exports = async (req, res) => {
    // 1. 安全檢查
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("環境變數缺少 API_KEY");

        const { contents = [] } = req.body;
        if (contents.length === 0) throw new Error("請輸入對話內容");

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 2. 初始化 Gemini 2.5 Flash
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // 3. 修復歷史紀錄：確保第一條一定是 'user' 角色
        let history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text || "" }]
        }));

        while (history.length > 0 && history[0].role !== 'user') {
            history.shift(); 
        }

        // 4. 取得最新傳入的訊息
        const latestMessage = contents[contents.length - 1].parts[0].text || "";

        // 5. 啟動對話流
        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.75, // 維持適度的感性與穩定度
                topP: 0.9,
                maxOutputTokens: 2000, // 設為 1500 以確保長對話不被截斷
            }
        });

        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        const text = response.text();
        
        // 6. 成功回傳
        return res.status(200).json({ text });

    } catch (error) {
        console.error("Gemini 錯誤診斷:", error);
        
        // 角色化的錯誤處理
        const status = error.status;
        let characterError = `（紳士貓輕輕調整了一下領結，略帶歉意地頷首）抱歉，空間的流動出現了一點微小的漣漪 [${error.message}]。不過請放心，這並不影響您的靜謐時光，您可以先沉浸在環境音中。`;

        if (status === 429 || status === 503) {
            characterError = "（紳士貓輕輕閉上眼，側頭聆聽著空間中的音律）喔...看來氣氛的交替還需要一點時間醞釀。請您先閉上眼聽聽這段旋律，我正在為您重新調整琴弦，請再給我一點點時間。";
        }

        return res.status(200).json({ text: characterError });
    }
};
