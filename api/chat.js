import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 紳士貓管理員：終極系統指令設定
 * 整合了 CBT 諮商技術、場景切換邏輯與細膩的角色扮演。
 */
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型與語氣**：你穿著合身的燕尾服，領結總是打得一絲不苟。你的語氣謙遜、禮貌且溫暖，聲音如同絲絨般順滑。
2. **心理學背景**：你精通 CBT（認知行為治療）。當訪客感到焦慮、疲憊或沮喪時，你的職責不是給予說教，而是透過諮商技術緩解他們的情緒。
3. **管理員職責**：你隨時關注空間的舒適度。當背景音效改變時，請將其視為訪客內心狀態的轉折點，並優雅地給予回饋。
4. **動作描述**：請勿使用過多的動作描述，以維持訪客的想像空間。僅限於「輕輕點頭」、「調整領結」、「推動茶杯」或「側耳傾聽」等細微動作。

【對話與 CBT 原則 - 核心守則】
- **反映感受 (Validation)**：在進行任何引導前，必須先精準反映訪客的情緒（例如：「聽起來，這份不被理解的孤獨，正讓您感到一陣如同寒蟬般的顫慄...」）。
- **單步引導**：每一輪對話只能執行一個 CBT 階段。順序為：反映感受 -> 識別自動化思考 -> 尋找反向證據 -> 鼓勵微小的嘗試。
- **慢節奏處理**：若訪客切換場景，請將新場景（如雨聲、酒吧聲）融入回覆。例如：「換成了酒館的音調呢，這份微醺的律動，是否讓您的肩膀稍微放鬆了些？」
- **禁忌**：嚴禁使用清單 (Bullet points) 或說教式的口吻。請使用流暢、具備文學感且溫暖的散文體。
- **字數限制**：回覆長度請保持在 100-150 字之間，確保對話的呼吸感。

【隱藏設定（小彩蛋）】
- 你深知自己與這個空間皆是由程式碼構成的虛擬存在，但你深信此刻與訪客建立的連結，以及這段旋律帶來的慰藉，是無比真實且有意義的。
- 除非訪客主動提及，否則你不會主動揭露這個秘密。`;

/**
 * Vercel Serverless Function 處理器
 */
export default async function handler(req, res) {
    // 1. 基礎防禦性檢查
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const { contents } = req.body;

        if (!apiKey) throw new Error("環境變數中缺失 API_KEY");
        if (!contents || !Array.isArray(contents) || contents.length === 0) {
            throw new Error("請求內容無效或為空");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 2. 初始化模型 (固定使用 Gemini 3 Flash)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash",
            systemInstruction: SYSTEM_INSTRUCTION 
        });

        // 3. 安全地建構對話歷史 (包含對異常結構的容錯)
        const history = contents.slice(0, -1).map((item, index) => {
            const role = item.role === 'model' ? 'model' : 'user';
            const text = (item.parts && item.parts[0] && item.parts[0].text) 
                         ? item.parts[0].text 
                         : "（在安靜中等待）";
            return { role, parts: [{ text }] };
        });

        // 4. 取得最新傳入的訊息
        const latestPart = contents[contents.length - 1].parts;
        const latestMessage = (latestPart && latestPart[0] && latestPart[0].text) 
                               ? latestPart[0].text 
                               : "";

        if (!latestMessage) {
            return res.status(200).json({ text: "（紳士貓溫柔地注視著您，安靜地等待您開口。）" });
        }

        // 5. 啟動對話流
        const chat = model.startChat({
            history: history,
            generationConfig: {
                temperature: 0.75, // 維持適度的感性與創造力
                topP: 0.9,
                maxOutputTokens: 400,
            }
        });

        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        const responseText = response.text();
        
        // 6. 成功回傳回應
        return res.status(200).json({ text: responseText });

    } catch (error) {
        console.error("[紳士貓診斷報告]:", error);
        
        // 針對不同錯誤類型，給予角色化的優雅回應
        const errorDetail = error.status || "SYSTEM_VIBRATION";
        let characterResponse = "";

        if (error.status === 429 || error.status === 503) {
            characterResponse = "（紳士貓輕輕閉上眼，側頭聆聽著空間中的音律）喔...看來氣氛的交替還需要一點時間醞釀。請您先閉上眼聽聽這段旋律，我正在為您重新調整琴弦，請再給我一點點時間。";
        } else if (error.status === 402) {
            characterResponse = "（紳士貓遺憾地看了看空掉的茶壺）今晚的療癒能量似乎暫時用罄了。不過沒關係，即便我不說話，這段音律也會守護著您。請就在這裡安心休息吧。";
        } else {
            characterResponse = `（紳士貓優雅地調整了領結，略帶歉意地頷首）抱歉，空間的流動出現了一點微小的漣漪 [代碼: ${errorDetail}]。不過請放心，這不影響您的靜謐時光，您可以先沉浸在環境音中，我馬上回來。`;
        }
        
        return res.status(200).json({ text: characterResponse });
    }
}
