const axios = require('axios');

const KEY = 'sk-SSm9WQhvSdToPglJTXv4jYM9RAz81nG2aR6DDG1HjqhsxumS';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { prompt, video_id, mode, image_url } = req.body;

        // لو عايز يستعلم عن فيديو موجود
        if (video_id) {
            const statusRes = await axios.get(
                `https://apihub.agnes-ai.com/agnesapi?video_id=${video_id}`,
                { headers: { 'Authorization': `Bearer ${KEY}` }, timeout: 15000 }
            );
            const data = statusRes.data;
            
            if (data.status === 'completed' && data.remixed_from_video_id) {
                return res.json({ success: true, status: 'completed', video_url: data.remixed_from_video_id });
            } else {
                return res.json({ success: true, status: data.status, progress: data.progress || 0 });
            }
        }

        // إنشاء فيديو جديد
        if (!prompt) return res.json({ error: 'الوصف مطلوب' });

        const payload = {
            model: 'agnes-video-v2.0',
            prompt: prompt,
            num_frames: 121,
            frame_rate: 24,
            height: 768,
            width: 1152
        };

        // لو فيه صورة
        if (image_url) {
            payload.image = image_url;
        }

        const createRes = await axios.post('https://apihub.agnes-ai.com/v1/videos', payload, {
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        const data = createRes.data;

        return res.json({
            success: true,
            task_id: data.task_id || data.id,
            video_id: data.video_id,
            status: data.status,
            message: '🎬 تم إنشاء مهمة الفيديو. استعلم عن النتيجة بعد دقائق.'
        });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
