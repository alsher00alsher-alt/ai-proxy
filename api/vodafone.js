const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, password } = req.body;
        const tp = new URLSearchParams();
        tp.append('grant_type', 'password'); tp.append('username', number); tp.append('password', password);
        tp.append('client_secret', '95fd95fb-7489-4958-8ae6-d31a525cd20a'); tp.append('client_id', 'ana-vodafone-app');

        const tr = await axios.post('https://mobile.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/token', tp.toString(), {
            headers: { 'User-Agent': 'okhttp/4.11.0', 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000
        });
        if (!tr.data.access_token) return res.json({ error: 'رقم أو باسورد غلط' });
        const tok = tr.data.access_token;

        const pr = await axios.post('https://web.vodafone.com.eg/services/dxl/promo/promotion', {
            '@type': 'Promo', channel: { id: '1' }, context: { type: 'youtubePromo' },
            pattern: [{ characteristics: [{ name: 'param1', value: '6' }, { name: 'param2', value: 1 }] }]
        }, { headers: { 'User-Agent': 'vodafoneandroid', 'Authorization': `Bearer ${tok}`, 'msisdn': number, 'channel': 'APP_PORTAL', 'clientId': 'WebsiteConsumer', 'Content-Type': 'application/json' }, timeout: 20000 });

        if (!pr.data.id) return res.json({ error: 'لا يوجد هدايا، جرب بكره' });
        const { id, characteristics } = pr.data;
        const mg = characteristics[0].value, mg2 = characteristics[0]['value@type'] || '';

        const ar = await axios.patch(`https://web.vodafone.com.eg/services/dxl/promo/promotion/${id}`, {
            '@type': 'Promo', channel: { id: '1' }, context: { type: 'youtubePromo' },
            pattern: [{ characteristics: [{ name: 'shortCode', value: '' }] }]
        }, { headers: { 'User-Agent': 'vodafoneandroid', 'Authorization': `Bearer ${tok}`, 'msisdn': number, 'channel': 'APP_PORTAL', 'clientId': 'WebsiteConsumer', 'Content-Type': 'application/json' }, timeout: 20000 });

        if (ar.status === 204) return res.json({ success: true, message: `🎉 ${mg}${mg2} يوتيوب فودافون!` });
        return res.json({ error: 'فشل التفعيل' });
    } catch (e) { return res.json({ error: e.message }); }
};
