const axios = require('axios');

// صورة base64 مضغوطة (placeholder - هنستبدلها بالصورة الحقيقية)
const IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, password } = req.body;

        // خطوة 1: تسجيل الدخول
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
                    'x-agent-device': 'OPPO CPH2565',
                    'x-agent-version': '2026.4.1',
                    'x-agent-build': '1139',
                    'digitalId': '28LZHSGCX7QC4',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 20000
            }
        );

        const token = tokenRes.data.access_token;
        if (!token) return res.json({ error: 'رقم أو باسورد غلط' });

        // خطوة 2: جلب العروض
        const promoRes = await axios.get(
            'https://web.vodafone.com.eg/services/dxl/promo/promotion',
            {
                params: {
                    '@type': 'Promo',
                    '$.context.type': 'worldCupWow26'
                },
                headers: {
                    'User-Agent': 'vodafoneandroid',
                    'Authorization': `Bearer ${token}`,
                    'msisdn': number,
                    'clientId': 'WebsiteConsumer',
                    'channel': 'APP_PORTAL',
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            }
        );

        const promos = promoRes.data;
        if (!Array.isArray(promos) || promos.length === 0) {
            return res.json({ error: 'لا توجد عروض World Cup متاحة' });
        }

        const promoId = promos[0].id;

        // خطوة 3: إرسال الصورة وتفعيل العرض
        const activateRes = await axios.post(
            'https://web.vodafone.com.eg/services/dxl/pj/wc/journey/promoJourney',
            {
                '@type': 'worldCupWow26',
                id: promoId,
                attachment: [{
                    attachmentType: 'Image',
                    content: IMAGE_BASE64,
                    mimeType: 'image/jpeg'
                }],
                characteristics: [{
                    name: 'pharaohName',
                    value: 'tutankhamun'
                }]
            },
            {
                headers: {
                    'User-Agent': 'vodafoneandroid',
                    'Authorization': `Bearer ${token}`,
                    'msisdn': number,
                    'clientId': 'WebsiteConsumer',
                    'channel': 'APP_PORTAL',
                    'Content-Type': 'application/json',
                    'Origin': 'https://web.vodafone.com.eg',
                    'Referer': 'https://web.vodafone.com.eg/portal/bf/worldCup26/camera?isPostMessages=false'
                },
                timeout: 60000
            }
        );

        if (activateRes.status === 201) {
            return res.json({ success: true, message: '🎉 تم إرسال 500 وحدة فودافون! صالحة 6 ساعات.' });
        } else {
            const err = activateRes.data;
            return res.json({ error: err.reason || err.message || 'فشل التفعيل' });
        }

    } catch (error) {
        const msg = error.response?.data ? JSON.stringify(error.response.data).substring(0, 300) : error.message;
        return res.json({ error: msg });
    }
};
