export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    let apiPath = req.url.replace('/api/panel', '');
    if (!apiPath.startsWith('/')) apiPath = '/' + apiPath;
    
    const qs = new URLSearchParams(req.query).toString();
    const url = 'https://numberpanel.tech' + apiPath + (qs ? '?' + qs : '');
    
    console.log('Proxying to:', url);
    
    try {
        const opts = {
            method: req.method,
            headers: {
                'Authorization': 'Bearer np_live_p7ixAR9OQq305WZlIocWG-lMEHqOjNtoQ8-WWHYQJa8',
                'Content-Type': 'application/json'
            }
        };
        
        if (req.method === 'POST' && req.body) {
            opts.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(url, opts);
        const text = await response.text();
        
        try {
            const json = JSON.parse(text);
            return res.status(200).json(json);
        } catch(e) {
            return res.status(200).send(text);
        }
    } catch(e) {
        return res.status(500).json({error: e.message});
    }
}
