export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { endpoint, params } = req.query;
    const BASE_URL = 'https://numberpanel.tech';
    
    try {
        const url = `${BASE_URL}${endpoint}${params ? '?' + params : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
