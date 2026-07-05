export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'GET') return res.json({ status: 'online' });
    if (req.method === 'POST') return res.json({ success: true });
    res.json({ status: 'ok' });
}
