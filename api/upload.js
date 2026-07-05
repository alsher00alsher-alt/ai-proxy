export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'GET') {
        return res.json({ status: 'online', message: 'Upload API Ready' });
    }
    
    if (req.method === 'POST') {
        try {
            const { name, url, size, type } = req.body;
            return res.json({ success: true, message: 'تم استلام الملف' });
        } catch(e) {
            return res.json({ success: false, error: e.message });
        }
    }
    
    res.json({ status: 'ok' });
}
