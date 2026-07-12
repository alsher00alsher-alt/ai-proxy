const axios = require('axios');

const API_KEY = "np_live_6DknI4df2uZ0_BFv6CGGpX_BCBAq60TG1sKev64WPkw";
const BASE_URL = "https://numberpanel.tech/api";

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const params = req.method === 'GET' ? req.query : req.body;
        const { action, service, country, number } = params;

        if (action === 'getServices') {
            const response = await axios.get(`${BASE_URL}/services`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            return res.status(200).json(response.data);
        }

        if (action === 'getCountries') {
            const response = await axios.get(`${BASE_URL}/countries`, {
                params: { service: service || 'whatsapp' },
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            return res.status(200).json(response.data);
        }

        if (action === 'requestNumber') {
            const response = await axios.post(`${BASE_URL}/request_number`, {
                service: service || 'whatsapp',
                country: country || 'DZ'
            }, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.status(200).json(response.data);
        }

        if (action === 'getOtp') {
            if (!number) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'رقم مطلوب' 
                });
            }
            const response = await axios.get(`${BASE_URL}/latest_otp`, {
                params: { number: number },
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            return res.status(200).json(response.data);
        }

        return res.status(400).json({ 
            success: false, 
            message: 'إجراء غير معروف' 
        });

    } catch (error) {
        console.error('NumberPanel Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'خطأ في الخادم'
        });
    }
};
