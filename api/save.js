export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    if (req.method === 'POST') {
        res.json({ success: true, message: 'Saved!', time: new Date().toISOString() });
    } else {
        res.json({ success: false, error: 'POST only' });
    }
}
