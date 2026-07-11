import fetch from 'node-fetch';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'اكتب رسالة' });

        const response = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer sk-SAwghndWW0bkWHuPwsUALep6iAOC8Oo5jZBVKCWCcYMlmHTJ',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'agnes-2.0-flash',
                messages: [{ role: 'user', content: message }]
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            return res.json({ success: true, message: data.choices[0].message.content });
        } else {
            return res.json({ success: false, error: data.error?.message || 'خطأ' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
