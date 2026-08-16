export default async function handler(req, res) {
    const API_KEY = "np_live_6DknI4df2uZ0_BFv6CGGpX_BCBAq60TG1sKev64WPkw";
    const BASE_URL = "https://numberpanel.tech/api";
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.searchParams.get('path') || '';
    const apiUrl = `${BASE_URL}/${path}`;
    
    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        if (req.method === 'POST' && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(apiUrl, fetchOptions);
        const text = await response.text();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch(e) {
            data = { success: false, message: text };
        }
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
