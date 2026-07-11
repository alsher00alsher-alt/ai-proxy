export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = 'sk-SAwghndWW0bkWHuPwsUALep6iAOC8Oo5jZBVKCWCcYMlmHTJ';
    const https = require('https');

    function makeRequest(options, data) {
        return new Promise((resolve, reject) => {
            const req2 = https.request(options, (res2) => {
                let body = '';
                res2.on('data', (chunk) => body += chunk);
                res2.on('end', () => {
                    try { resolve(JSON.parse(body)); }
                    catch(e) { resolve({ error: body }); }
                });
            });
            req2.on('error', reject);
            if (data) req2.write(JSON.stringify(data));
            req2.end();
        });
    }

    try {
        // قراءة الجسم
        let body = '';
        for await (const chunk of req) { body += chunk; }
        const { prompt, video_id } = JSON.parse(body || '{}');

        // إنشاء فيديو جديد
        if (prompt && !video_id) {
            const options = {
                hostname: 'apihub.agnes-ai.com',
                path: '/v1/videos',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            };
            const data = {
                model: 'agnes-video-v2.0',
                prompt: prompt,
                num_frames: 121,
                frame_rate: 24
            };
            const result = await makeRequest(options, data);
            
            if (result.video_id) {
                return res.json({ success: true, video_id: result.video_id, status: 'queued' });
            }
            return res.json({ success: false, error: 'فشل' });
        }

        // التحقق من فيديو
        if (video_id) {
            const options = {
                hostname: 'apihub.agnes-ai.com',
                path: `/v1/videos/${video_id}`,
                method: 'GET',
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            };
            const result = await makeRequest(options);
            
            if (result.status === 'completed') {
                const url = result.metadata?.url || result.url;
                return res.json({ success: true, status: 'completed', video_url: url, progress: 100 });
            }
            return res.json({ success: true, status: result.status || 'queued', progress: result.progress || 0 });
        }

        res.json({ status: 'ok' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
