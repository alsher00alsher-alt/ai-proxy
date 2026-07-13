export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Vercel Blob Storage (مجاني لحد 100MB)
    const { put, list, del } = await import('@vercel/blob');
    
    if (req.method === 'POST') {
        try {
            const { name, data, type } = req.body;
            const base64 = data.split(',')[1];
            const buffer = Buffer.from(base64, 'base64');
            
            const blob = await put(`uploads/${type}/${Date.now()}_${name}`, buffer, {
                access: 'public',
                contentType: type === 'photos' ? 'image/jpeg' : 'video/mp4'
            });
            
            res.status(200).json({ success: true, url: blob.url });
        } catch(e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
    
    if (req.method === 'GET') {
        try {
            const { blobs } = await list({ prefix: 'uploads/' });
            const files = blobs.map(b => ({
                url: b.url,
                pathname: b.pathname,
                size: b.size,
                uploadedAt: b.uploadedAt
            }));
            res.status(200).json({ success: true, files });
        } catch(e) {
            res.status(200).json({ success: true, files: [] });
        }
    }
    
    if (req.method === 'DELETE') {
        try {
            const { url } = req.body;
            await del(url);
            res.status(200).json({ success: true });
        } catch(e) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
}
