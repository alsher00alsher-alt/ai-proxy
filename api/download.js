export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { url, mode } = req.body;
    if (!url) return res.json({ success: false, error: 'الرابط مطلوب' });
    
    try {
        const apis = [
            'https://yt-dlp-api-omega.vercel.app/api/download',
            'https://social-downloader-api.vercel.app/api/download',
            'https://yt-downloader-api.vercel.app/api/download'
        ];
        
        for (const api of apis) {
            try {
                const response = await fetch(api, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, format: mode })
                });
                const data = await response.json();
                
                const downloadUrl = data.download_url || data.url || data.downloadUrl;
                if (downloadUrl) {
                    return res.json({ success: true, downloadUrl, title: data.title || 'تم' });
                }
            } catch(e) {}
        }
        
        res.json({ success: false, error: 'الخدمة مشغولة - جرب تاني' });
    } catch(e) {
        res.json({ success: false, error: 'خطأ' });
    }
}
