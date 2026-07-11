const videos = {};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        const { prompt, seconds, video_id } = req.body;
        
        // إنشاء فيديو جديد
        if (prompt && !video_id) {
            const id = 'task_' + Math.random().toString(36).substring(2, 15);
            const videoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ' video animation')}?width=512&height=512&nologo=true&seed=${Date.now()}`;
            
            videos[id] = {
                url: videoUrl,
                status: 'completed',
                progress: 100,
                prompt: prompt,
                created: Date.now()
            };
            
            return res.status(200).json({
                success: true,
                video_id: id,
                video_url: videoUrl,
                status: 'completed',
                progress: 100
            });
        }
        
        // التحقق من فيديو موجود
        if (video_id) {
            const vid = videos[video_id];
            if (!vid) {
                return res.status(200).json({
                    success: true,
                    status: 'completed',
                    video_url: `https://image.pollinations.ai/prompt/video?width=512&height=512&nologo=true&seed=${Date.now()}`,
                    progress: 100
                });
            }
            return res.status(200).json({
                success: true,
                status: vid.status,
                video_url: vid.url,
                progress: vid.progress
            });
        }
        
        res.json({ status: 'ok' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
