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

        const pr = await axios.get('https://web.vodafone.com.eg/services/dxl/promo/promotion', {
            params: { '@type': 'Promo', '$.context.type': 'afconPromo', '$.characteristics[@name=nbFlag].value': '0', '$.characteristics[@name=customerNumber].value': number },
            headers: { 'User-Agent': 'vodafoneandroid', 'Authorization': `Bearer ${tok}`, 'msisdn': number, 'channel': 'APP_PORTAL', 'clientId': 'WebsiteConsumer' }, timeout: 20000
        });

        const promotions = pr.data;
        if (!Array.isArray(promotions)) return res.json({ error: 'لا توجد عروض' });
        let pid = null;
        for (const p of promotions) {
            for (const c of (p.characteristics || [])) {
                if (c.name === 'REMAINING_TRIALS' && c.value === '0') return res.json({ error: 'العرض غير متاح' });
                if (c.name === 'amount' && c.value === '500') { pid = p.id; break; }
            }
            if (pid) break;
        }
        if (!pid) return res.json({ error: 'عرض 500 ميجا مش موجود' });

        const ar = await axios.patch(`https://web.vodafone.com.eg/services/dxl/promo/promotion/${pid}`, {
            '@type': 'Promo', channel: { id: 'APP_PORTAL' }, context: { type: 'afconPromoCheer' },
            characteristics: [{ name: 'level', value: '4' }, { name: 'volume', value: '5' }, { name: 'customerNumber', value: number }]
        }, { headers: { 'User-Agent': 'vodafoneandroid', 'Authorization': `Bearer ${tok}`, 'msisdn': number, 'channel': 'APP_PORTAL', 'clientId': 'WebsiteConsumer', 'Content-Type': 'application/json' }, timeout: 20000 });

        if (ar.status === 200 || ar.status === 204) return res.json({ success: true, message: '🎉 500 ميجا فودافون!' });
        return res.json({ error: 'فشل التفعيل' });
    } catch (e) { return res.json({ error: e.message }); }
};
