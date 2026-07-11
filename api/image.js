import fetch from 'node-fetch';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'اكتب وصف' });

        const response = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer sk-SAwghndWW0bkWHuPwsUALep6iAOC8Oo5jZBVKCWCcYMlmHTJ',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'agnes-image-2.1-flash',
                prompt: prompt,
                size: '1024x768',
                extra_body: { response_format: 'url' }
            })
        });

        const data = await response.json();
        
        if (data.data && data.data[0] && data.data[0].url) {
            return res.json({ success: true, image_url: data.data[0].url });
        } else {
            return res.json({ success: false, error: data.error?.message || 'فشل' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
