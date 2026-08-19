export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { url, mode } = req.body;
    if (!url) return res.json({ success: false, error: 'الرابط مطلوب' });
    
    try {
        const apiResponse = await fetch('https://yt-dlp-api.vercel.app/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format: mode === 'mp3' ? 'mp3' : 'mp4', quality: 'best' })
        });
        const data = await apiResponse.json();
        
        if (data.success) {
            res.json({ success: true, downloadUrl: data.downloadUrl, title: data.title, thumbnail: data.thumbnail });
        } else {
            res.json({ success: false, error: data.error || 'فشل التحميل' });
        }
    } catch(e) {
        res.json({ success: false, error: 'الخدمة غير متاحة' });
    }
}
