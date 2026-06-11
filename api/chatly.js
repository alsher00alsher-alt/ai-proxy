const axios = require('axios');

const SYSTEM_PROMPT = 'اسمك "Ahmed AI". صانعك ومطورك اسمه "احمد الشاعر". خاطبني بـ "يا أحمد". تكلم بالعربية.';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { message } = req.body;
        if (!message) return res.json({ error: 'الرسالة مطلوبة' });

        // ===== خطوة 1: البحث في DuckDuckGo =====
        let searchInfo = '';
        try {
            const ddgRes = await axios.get('https://api.duckduckgo.com/', {
                params: { q: message, format: 'json', no_html: 1, skip_disambig: 1 },
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 8000
            });
            
            const abstract = ddgRes.data?.Abstract;
            const related = ddgRes.data?.RelatedTopics;
            
            if (abstract) {
                searchInfo = 'معلومات من الويب: ' + abstract;
            } else if (related && related.length > 0 && related[0].Text) {
                searchInfo = 'معلومات من الويب: ' + related[0].Text;
            }
        } catch (e) {}

        // ===== خطوة 2: تسجيل في chatlyapp =====
        const signup = await axios.post('https://chatlyapp.ai/api/v1/signup/', null, {
            headers: { 'User-Agent': 'okhttp/4.12.0' },
            timeout: 15000
        });
        const token = signup.data.accessToken;

        // ===== خطوة 3: إرسال السؤال مع السياق =====
        const enhancedMessage = searchInfo 
            ? `${searchInfo}\n\nبناءً على المعلومات أعلاه، أجب: ${message}`
            : SYSTEM_PROMPT + '\n\nالمستخدم: ' + message;

        const chat = await axios.post('https://chatlyapp.ai/api/v1/chats', {
            model: 'gpt-5-nano',
            systemContent: SYSTEM_PROMPT,
            text: enhancedMessage
        }, {
            headers: {
                'User-Agent': 'okhttp/4.12.0',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            responseType: 'text'
        });

        // تجميع الرد
        const lines = chat.data.split('\n');
        let finalText = '';
        for (const line of lines) {
            if (line.startsWith('data:')) {
                try {
                    const d = JSON.parse(line.substring(5).trim());
                    if (d.content) finalText += d.content;
                    if (d.finishReason === 'stop') break;
                } catch(e) {}
            }
        }

        let reply = finalText.trim() || 'لم يتم استقبال رد';

        return res.json({ success: true, message: reply });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
