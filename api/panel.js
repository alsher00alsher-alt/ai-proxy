export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const url = new URL(req.url, 'http://localhost');
    const fullPath = url.pathname + url.search;
    const apiPath = fullPath.replace('/api/panel', '');
    
    const targetUrl = 'https://numberpanel.tech' + apiPath;
    console.log('→', targetUrl);
    
    try {
        const opts = { method: req.method, headers: { 'Authorization': 'Bearer np_live_p7ixAR9OQq305WZlIocWG-lMEHqOjNtoQ8-WWHYQJa8' } };
        if (req.method === 'POST' && req.body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(req.body); }
        const r = await fetch(targetUrl, opts);
        const data = await r.json();
        return res.status(200).json(data);
    } catch(e) { return res.status(500).json({ error: e.message }); }
}
