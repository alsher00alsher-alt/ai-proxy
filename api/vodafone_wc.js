const axios = require('axios');
const https = require('https');

// قائمة بروكسيات مصرية
const PROXIES = [
    { host: '41.32.30.114', port: 1976 },
    { host: '41.65.236.162', port: 1976 },
    { host: '41.215.78.109', port: 1976 }
];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, password } = req.body;
        if (!number || !password) return res.json({ error: 'الرقم وكلمة المرور مطلوبين' });

        // تجربة كل بروكسي
        let lastError = '';
        
        for (const proxy of PROXIES) {
            try {
                const agent = new https.Agent({
                    host: proxy.host,
                    port: proxy.port,
                    rejectUnauthorized: false
                });

                // تسجيل الدخول
                const tokenRes = await axios.post(
                    'https://mobile.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/token',
                    new URLSearchParams({
                        grant_type: 'password',
                        username: number,
                        password: password,
                        client_secret: 'dca0pbLUWXVhXR266Gw1iT5rqwvvJQoN',
                        client_id: 'AnaVF'
                    }).toString(),
                    {
                        headers: {
                            'User-Agent': 'okhttp/4.12.0',
                            'Accept': 'application/json',
                            'msisdn': number,
                            'clientId': 'AnaVodafoneAndroid',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        httpsAgent: agent,
                        timeout: 15000
                    }
                );

                if (!tokenRes.data.access_token) continue;

                const token = tokenRes.data.access_token;

                // تحميل الصورة
                const imgRes = await axios.get(
                    'https://i.postimg.cc/XNg5L1r6/IMG-20260609-182037.jpg',
                    { headers: { 'User-Agent': 'Mozilla/5.0' }, responseType: 'arraybuffer', timeout: 15000 }
                );
                const imageBase64 = Buffer.from(imgRes.data).toString('base64');

                // جلب العروض
                const WEB = {
                    'User-Agent': 'vodafoneandroid',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'msisdn': number,
                    'clientId': 'WebsiteConsumer',
                    'channel': 'APP_PORTAL',
                    'Content-Type': 'application/json',
                    'Origin': 'https://web.vodafone.com.eg',
                    'Referer': 'https://web.vodafone.com.eg/portal/bf/worldCup26/home'
                };

                const promosRes = await axios.get(
                    'https://web.vodafone.com.eg/services/dxl/promo/promotion',
                    {
                        params: { '@type': 'Promo', '$.context.type': 'worldCupWow26' },
                        headers: WEB,
                        httpsAgent: agent,
                        timeout: 15000
                    }
                );

                const promos = promosRes.data;
                if (!Array.isArray(promos) || promos.length === 0) {
                    lastError = 'لا توجد عروض';
                    continue;
                }

                const promoId = promos[0].id;

                // تفعيل
                const activateRes = await axios.post(
                    'https://web.vodafone.com.eg/services/dxl/pj/wc/journey/promoJourney',
                    {
                        '@type': 'worldCupWow26',
                        id: promoId,
                        attachment: [{ attachmentType: 'Image', content: imageBase64, mimeType: 'image/jpeg' }],
                        characteristics: [{ name: 'pharaohName', value: 'tutankhamun' }]
                    },
                    {
                        headers: { ...WEB, 'Referer': 'https://web.vodafone.com.eg/portal/bf/worldCup26/camera' },
                        httpsAgent: agent,
                        timeout: 60000
                    }
                );

                if (activateRes.status === 201) {
                    return res.json({ success: true, message: '🎉 تم إرسال 500 ميجا! صالحة 6 ساعات.' });
                } else {
                    lastError = 'Status: ' + activateRes.status;
                    continue;
                }

            } catch (e) {
                lastError = e.message;
                continue;
            }
        }

        return res.json({ error: 'فشل بعد تجربة كل البروكسيات: ' + lastError });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
