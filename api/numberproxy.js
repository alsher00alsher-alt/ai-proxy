export default async function handler(req, res) {
    const API_KEY = "np_live_6DknI4df2uZ0_BFv6CGGpX_BCBAq60TG1sKev64WPkw";
    const BASE_URL = "https://numberpanel.tech/api";
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.searchParams.get('path') || '';
    const apiUrl = `${BASE_URL}/${path}`;
    
    try {
        const options = {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (req.method === 'POST') {
            options.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(apiUrl, options);
        const data = await response.json();
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
