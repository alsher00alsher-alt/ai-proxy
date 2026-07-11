export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString();
        const { prompt } = JSON.parse(raw);
        
        if (!prompt) return res.json({ error: 'اكتب وصف' });

        const https = require('https');
        const data = JSON.stringify({
            model: 'agnes-image-2.1-flash',
            prompt: prompt,
            size: '1024x768',
            extra_body: { response_format: 'url' }
        });

        const result = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'apihub.agnes-ai.com',
                path: '/v1/images/generations',
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

        if (result.data?.[0]?.url) {
            return res.json({ success: true, image_url: result.data[0].url });
        }
        return res.json({ success: false, error: result.error?.message || result.error || 'فشل' });
    } catch (error) {
        return res.json({ success: false, error: error.message });
    }
}
