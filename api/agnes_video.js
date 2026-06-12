const axios = require('axios');

const KEY = 'sk-SSm9WQhvSdToPglJTXv4jYM9RAz81nG2aR6DDG1HjqhsxumS';

function calcFrames(seconds) {
    const fps = 24;
    let frames = seconds * fps;
    // قاعدة 8n+1
    frames = Math.floor(frames / 8) * 8 + 1;
    if (frames > 441) frames = 441;
    if (frames < 81) frames = 81;
    return frames;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { prompt, video_id, image_url, seconds } = req.body;

        // استعلام عن فيديو موجود
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

        const duration = Math.min(Math.max(parseInt(seconds) || 5, 5), 120);
        const num_frames = calcFrames(duration);

        const payload = {
            model: 'agnes-video-v2.0',
            prompt: prompt,
            num_frames: num_frames,
            frame_rate: 24,
            height: 768,
            width: 1152
        };

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
            seconds: duration,
            frames: num_frames,
            message: `🎬 تم إنشاء مهمة الفيديو (${duration} ثانية). استعلم عن النتيجة بعد دقائق.`
        });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
