const axios = require('axios');
const crypto = require('crypto');

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
        } catch (e) {
            // لو فشل البحث، نكمل بدونه
        }

        // ===== خطوة 2: إرسال إلى DeepAI =====
        const enhancedMessage = searchInfo 
            ? `${searchInfo}\n\nبناءً على المعلومات أعلاه، أجب على سؤال المستخدم: ${message}`
            : message;

        const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
        const chatHistory = JSON.stringify([
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: enhancedMessage }
        ]);

        const data = [
            `--${boundary}`, 'Content-Disposition: form-data; name="chat_style"', '', 'chat',
            `--${boundary}`, 'Content-Disposition: form-data; name="chatHistory"', '', chatHistory,
            `--${boundary}`, 'Content-Disposition: form-data; name="model"', '', 'gpt-4o',
            `--${boundary}--`, ''
        ].join('\r\n');

        const resp = await axios.post('https://api.deepai.org/hacking_is_a_serious_crime', data, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            timeout: 30000,
            responseType: 'text'
        });

        let reply = resp.data.trim();
        
        // إضافة ملاحظة البحث
        if (searchInfo) {
            reply = '🔍 ' + reply;
        }

        return res.json({ success: true, message: reply });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
