export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'اكتب رسالة' });

        const https = require('https');
        
        const result = await new Promise((resolve, reject) => {
            const data = JSON.stringify({
                model: 'agnes-2.0-flash',
                messages: [{ role: 'user', content: message }]
            });

            const options = {
                hostname: 'apihub.agnes-ai.com',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer sk-SAwghndWW0bkWHuPwsUALep6iAOC8Oo5jZBVKCWCcYMlmHTJ',
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req2 = https.request(options, (res2) => {
                let body = '';
                res2.on('data', (chunk) => body += chunk);
                res2.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch(e) {
                        resolve({ error: body });
                    }
                });
            });
            
            req2.on('error', reject);
            req2.write(data);
            req2.end();
        });

        if (result.choices && result.choices[0]) {
            return res.json({ success: true, message: result.choices[0].message.content });
        } else {
            return res.json({ success: false, error: result.error?.message || 'خطأ' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
