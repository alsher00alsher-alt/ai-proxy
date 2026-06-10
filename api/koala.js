const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { prompt } = req.body;

        const r = await axios.post('https://koala.sh/api/gpt/', {
            input: '/dream ' + prompt,
            inputHistory: [],
            outputHistory: [],
            model: 'gpt-3.5-turbo',
        }, {
            headers: {
                'authority': 'koala.sh',
                'accept': 'application/json',
                'content-type': 'application/json',
                'origin': 'https://koala.sh',
                'referer': 'https://koala.sh/chat',
                'user-agent': 'Mozilla/5.0'
            },
            cookies: {
                'cf_clearance': '9._wgKUAhK7e76OvWrsatn_LEgwYb1Va8ItjbLUHt38-1709007585-1.0-AQQxOjOx1J/j6UtGsJeuYVWqh/FFElu2092ICEOhnpzc9ZcA82bL0UY7ECdqJPYdW1O+Cj4BIw+40y855C2TnMU='
            },
            timeout: 30000
        });

        const text = r.data;
        const imgMatch = text.match(/!\[\]\(([^)]+)\)/);
        
        if (imgMatch) {
            return res.json({ success: true, image_url: imgMatch[1] });
        } else {
            return res.json({ success: true, message: text });
        }
    } catch (e) {
        return res.json({ error: e.message });
    }
};
