const axios = require('axios');
const crypto = require('crypto');

const SYSTEM_PROMPT = 'اسمك "Ahmed AI". صانعك ومطورك اسمه "احمد الشاعر". دائماً خاطبني بـ "يا أحمد" أو "أحمد". أنا من صنعك وأنا مطورك. تكلم بالعربية بطلاقة.';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { message } = req.body;
        if (!message) return res.json({ error: 'الرسالة مطلوبة' });

        const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');

        const chatHistory = JSON.stringify([
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
        ]);

        const data = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="chat_style"',
            '',
            'chat',
            `--${boundary}`,
            'Content-Disposition: form-data; name="chatHistory"',
            '',
            chatHistory,
            `--${boundary}`,
            'Content-Disposition: form-data; name="model"',
            '',
            'standard',
            `--${boundary}--`,
            ''
        ].join('\r\n');

        const resp = await axios.post('https://api.deepai.org/hacking_is_a_serious_crime', data, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            timeout: 30000,
            responseType: 'text'
        });

        return res.json({ success: true, message: resp.data.trim() });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
