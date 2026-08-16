export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        const response = await fetch('https://numberpanel.tech/api/my_otps?limit=200', {
            headers: {
                'Authorization': 'Bearer np_live_6DknI4df2uZ0_BFv6CGGpX_BCBAq60TG1sKev64WPkw'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch(e) {
        res.json({ success: false, error: e.message });
    }
}
