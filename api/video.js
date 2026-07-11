import fetch from 'node-fetch';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = 'sk-SAwghndWW0bkWHuPwsUALep6iAOC8Oo5jZBVKCWCcYMlmHTJ';
    
    try {
        const { prompt, video_id } = req.body;

        // إنشاء فيديو جديد
        if (prompt && !video_id) {
            const response = await fetch('https://apihub.agnes-ai.com/v1/videos', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'agnes-video-v2.0',
                    prompt: prompt,
                    num_frames: 121,
                    frame_rate: 24
                })
            });

            const data = await response.json();
            
            if (data.video_id) {
                return res.json({ success: true, video_id: data.video_id, status: 'queued' });
            } else {
                return res.json({ success: false, error: 'فشل' });
            }
        }

        // التحقق من حالة الفيديو
        if (video_id) {
            const response = await fetch(`https://apihub.agnes-ai.com/v1/videos/${video_id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });

            const data = await response.json();
            
            if (data.status === 'completed') {
                const url = data.metadata?.url || data.url;
                return res.json({ success: true, status: 'completed', video_url: url, progress: 100 });
            }
            
            return res.json({ success: true, status: data.status || 'in_progress', progress: data.progress || 0 });
        }

        res.json({ status: 'ok' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
