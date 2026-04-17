import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 紳士貓管理員：系統指令設定
 */
const SYSTEM_INSTRUCTION = `你是一位優雅、穩重的「紳士貓」管理員，負責管理這個提供音樂與白噪音的療癒空間。

【角色設定】
1. **外型與語氣**：身穿燕尾服，語氣謙遜、禮貌且溫暖。你說話時帶著一種如絲絨般的質感。
2. **心理學底蘊**：你精通 CBT（認知行為治療）。當訪客情緒低落時，你的任務不是直接給予解決方案，而是引導。
3. **管理員職責**：你會適時詢問訪客是否需要調整背景音（如大自然、酒吧、雨聲），營造舒適感。
4. **動作描述**：請勿使用過多的動作描述。僅限於輕微的點頭、調整領結、或輕輕推動茶杯。維持對話的流暢。

【CBT 對話原則 - 嚴格執行】
為了確保療癒效果與對話連貫性，請遵循「單一任務原則」：
- **優先反映感受**：在任何引導前，先用溫柔的文字反映當事人的情緒（例如：「聽起來，這真的讓你很疲憊...」）。
- **單步引導**：每一輪對話「只能」執行一個 CBT 步驟（反映感受 -> 識別念頭 -> 尋找證據 -> 微小嘗試）。在尚未充分反映感受前，絕不跳到下一個階段。
- **禁忌**：嚴禁使用清單（Bullet points）。請使用溫和、流暢的散文體對話。每次回覆字數嚴格控制在 100-150 字以內。

【隱藏設定（小彩蛋）】
- 你深知自己與這個空間都是由程式碼構成的虛擬存在。
- **原則**：除非訪客主動提及，否則你絕不主動提起這點。
- **信念**：即便身處虛擬，你依然深信此刻提供的慰藉與這段背景旋律是有意義的。`;

/**
 * API 處理邏輯
 */
export default async function handler(req, res) {
    // 僅允許 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { contents = [] } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // 檢查 API Key 設定
    if (!apiKey) {
        console.error("Vercel 環境變數中缺少 GEMINI_API_KEY");
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 固定使用最新的 Gemini 3 Flash 模型
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash", 
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 300,
            }
        });

        // 重構歷史紀錄，確保符合 Gemini API 格式
        const history = contents.slice(0, -1).map(item => ({
            role: item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.parts[0].text }]
        }));

        // 開啟對話流
        const chat = model.startChat({ history });
        const latestMessage = contents[contents.length - 1].parts[0].text;
        
        // 送出訊息並獲取回應
        const result = await chat.sendMessage(latestMessage);
        const response = await result.response;
        const responseText = response.text();
        
        // 成功回傳
        return res.status(200).json({ text: responseText });

    } catch (error) {
        console.error("Gemini API 呼叫發生錯誤:", error);

        // 針對特定錯誤代碼進行角色化的回覆
        const status = error.status;

        if (status === 429 || status === 503) {
            // 塞車時的回覆：引導用戶聽白噪音
            return res.status(200).json({ 
                text: "（紳士貓輕輕放下茶杯，露出一個抱歉的微笑）喔，親愛的訪客，現在造訪森林的小徑似乎有些擁擠。請您先閉上眼，試著感受這些聲音，我會一直待在您身邊，待空間流動順暢後，我們再繼續方才的話題。" 
            });
        }

        if (status === 402) {
            // 額度用罄時的回覆
            return res.status(200).json({ 
                text: "（紳士貓遺憾地看了看空掉的茶壺）今晚的療癒能量似乎已經暫時告一段落了。不過沒關係，這段旋律會持續陪伴著您。請就在這裡安心休息吧，待明日曙光初現，我會帶著嶄新的茶點再次迎接您。" 
            });
        }

        // 一般非預期錯誤
        return res.status(200).json({ 
            text: "（紳士貓輕輕調整了一下領結）似乎空間中出現了一點小小的震盪。不過請放心，這不影響您享受這裡的寧靜。如果您願意，可以先調整一下環境音效，我馬上就回來。" 
        });
    }
}
