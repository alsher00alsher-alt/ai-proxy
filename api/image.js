export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        let body = '';
        for await (const chunk of req) { body += chunk; }
        const { prompt } = JSON.parse(body || '{}');
        
        if (!prompt) return res.status(400).json({ error: 'اكتب وصف' });

        const https = require('https');
        
        const result = await new Promise((resolve, reject) => {
            const data = JSON.stringify({
                model: 'agnes-image-2.1-flash',
                prompt: prompt,
                size: '1024x768',
                extra_body: { response_format: 'url' }
            });

            const options = {
                hostname: 'apihub.agnes-ai.com',
                path: '/v1/images/generations',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer sk-SAwghndWW0bkWHuPwsUALep6iAOC8Oo5jZBVKCWCcYMlmHTJ',
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req2 = https.request(options, (res2) => {
                let responseBody = '';
                res2.on('data', (chunk) => responseBody += chunk);
                res2.on('end', () => {
                    try { resolve(JSON.parse(responseBody)); }
                    catch(e) { resolve({ error: responseBody }); }
                });
            });
            
            req2.on('error', reject);
            req2.write(data);
            req2.end();
        });

        if (result.data && result.data[0] && result.data[0].url) {
            return res.json({ success: true, image_url: result.data[0].url });
        } else {
            return res.json({ success: false, error: result.error?.message || 'فشل' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
