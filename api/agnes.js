const axios = require('axios');

const KEY = 'sk-SSm9WQhvSdToPglJTXv4jYM9RAz81nG2aR6DDG1HjqhsxumS';
const BASE = 'https://apihub.agnes-ai.com/v1';
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

        const r = await axios.post(`${BASE}/chat/completions`, {
            model: 'agnes-2.0-flash',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: message }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        const reply = r.data?.choices?.[0]?.message?.content || 'لم يتم استقبال رد';
        return res.json({ success: true, message: reply });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
