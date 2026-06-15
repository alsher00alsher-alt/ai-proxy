const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, password } = req.body;
        if (!number || !password) return res.json({ error: 'الرقم وكلمة المرور مطلوبين' });

        // خطوة 1: تحميل الصورة من الإنترنت
        const imgRes = await axios.get('https://i.postimg.cc/XNg5L1r6/IMG-20260609-182037.jpg', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            responseType: 'arraybuffer',
            timeout: 15000
        });
        const imageBase64 = Buffer.from(imgRes.data).toString('base64');

        // خطوة 2: تسجيل الدخول
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
                    'x-agent-operatingsystem': '15',
                    'clientId': 'AnaVodafoneAndroid',
                    'Accept-Language': 'ar',
                    'x-agent-device': 'OPPO CPH2565',
                    'x-agent-version': '2026.4.1',
                    'x-agent-build': '1139',
                    'digitalId': '28LZHSGCX7QC4',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 15000
            }
        );

        if (!tokenRes.data.access_token) {
            return res.json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
        }

        const token = tokenRes.data.access_token;

        // خطوة 3: جلب العروض
        const WEB = {
            'User-Agent': 'vodafoneandroid',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'msisdn': number,
            'clientId': 'WebsiteConsumer',
            'channel': 'APP_PORTAL',
            'Content-Type': 'application/json'
        };

        const promosRes = await axios.get(
            'https://web.vodafone.com.eg/services/dxl/promo/promotion',
            {
                params: { '@type': 'Promo', '$.context.type': 'worldCupWow26' },
                headers: WEB,
                timeout: 15000
            }
        );

        const promos = promosRes.data;
        if (!Array.isArray(promos) || promos.length === 0) {
            return res.json({ error: 'لا توجد عروض World Cup متاحة حالياً' });
        }

        const promoId = promos[0].id;

        // خطوة 4: تفعيل العرض
        const activateRes = await axios.post(
            'https://web.vodafone.com.eg/services/dxl/pj/wc/journey/promoJourney',
            {
                '@type': 'worldCupWow26',
                id: promoId,
                attachment: [{
                    attachmentType: 'Image',
                    content: imageBase64,
                    mimeType: 'image/jpeg'
                }],
                characteristics: [{
                    name: 'pharaohName',
                    value: 'tutankhamun'
                }]
            },
            {
                headers: {
                    ...WEB,
                    'Origin': 'https://web.vodafone.com.eg',
                    'Referer': 'https://web.vodafone.com.eg/portal/bf/worldCup26/camera'
                },
                timeout: 60000
            }
        );

        if (activateRes.status === 201) {
            return res.json({ success: true, message: '🎉 تم إرسال 500 ميجا بنجاح! صالحة 6 ساعات.' });
        } else {
            const err = activateRes.data;
            return res.json({ error: err.reason || err.message || err.error || 'فشل تفعيل العرض' });
        }

    } catch (error) {
        if (error.response?.data?.error_description) {
            return res.json({ error: error.response.data.error_description });
        }
        return res.json({ error: error.message });
    }
};
