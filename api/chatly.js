const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { message } = req.body;
        if (!message) return res.json({ error: 'الرسالة مطلوبة' });

        // تسجيل حساب جديد
        const signup = await axios.post('https://chatlyapp.ai/api/v1/signup/', {}, {
            headers: { 'User-Agent': 'okhttp/4.12.0', 'Content-Length': '0' },
            timeout: 15000
        });
        const token = signup.data.accessToken;

        // إرسال الرسالة
        const chat = await axios.post('https://chatlyapp.ai/api/v1/chats', {
            model: 'gpt-5-nano',
            systemContent: 'أنت مساعد ذكي ومفيد. أجب بالعربية.',
            text: message
        }, {
            headers: {
                'User-Agent': 'okhttp/4.12.0',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            responseType: 'text'
        });

        // تجميع الرد من stream
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

        return res.json({ success: true, message: finalText.trim() });

    } catch (e) {
        return res.json({ error: e.message });
    }
};
