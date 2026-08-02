export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    const path = req.url.replace('/api/panel', '');
    const qs = new URLSearchParams(req.query).toString();
    const url = 'https://numberpanel.tech' + path + (qs ? '?' + qs : '');
    try {
        const opts = { method: req.method, headers: { 'Authorization': 'Bearer np_live_p7ixAR9OQq305WZlIocWG-lMEHqOjNtoQ8-WWHYQJa8', 'Content-Type': 'application/json' } };
        if (req.method === 'POST' && req.body) opts.body = JSON.stringify(req.body);
        const r = await fetch(url, opts);
        const d = await r.json();
        return res.status(200).json(d);
    } catch(e) { return res.status(500).json({error:e.message}); }
}
