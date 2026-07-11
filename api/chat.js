export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString();
        const { message } = JSON.parse(raw);
        
        if (!message) return res.json({ error: 'اكتب رسالة' });

        const https = require('https');
        const data = JSON.stringify({
            model: 'agnes-2.0-flash',
            messages: [{ role: 'user', content: message }]
        });

        const result = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'apihub.agnes-ai.com',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer sk-SAwghndWW0bkWHuPwsUALep6iAOC8Oo5jZBVKCWCcYMlmHTJ',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req2 = https.request(options, (res2) => {
                const chunks2 = [];
                res2.on('data', (c) => chunks2.push(c));
                res2.on('end', () => {
                    const body = Buffer.concat(chunks2).toString();
                    try { resolve(JSON.parse(body)); }
                    catch(e) { resolve({ error: body }); }
                });
            });
            req2.on('error', (e) => resolve({ error: e.message }));
            req2.write(data);
            req2.end();
        });

        if (result.choices?.[0]?.message?.content) {
            return res.json({ success: true, message: result.choices[0].message.content });
        }
        return res.json({ success: false, error: result.error?.message || result.error || 'خطأ' });
    } catch (error) {
        return res.json({ success: false, error: error.message });
    }
}
