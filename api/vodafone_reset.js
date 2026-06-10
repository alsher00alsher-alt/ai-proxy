const https = require('https');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, step, otp, newPassword } = req.body;

        // خطوة 1: طلب OTP
        if (step === 1 || !step) {
            const result = await sendOTP(number);
            if (result.success) {
                return res.json({ success: true, message: '✅ تم إرسال كود OTP إلى هاتفك', step: 2 });
            } else {
                return res.json({ error: result.error || 'فشل إرسال OTP' });
            }
        }

        // خطوة 2: تغيير كلمة السر
        if (step === 2) {
            if (!otp || !newPassword) {
                return res.json({ error: 'مطلوب OTP وكلمة سر جديدة' });
            }
            const result = await changePassword(number, otp, newPassword);
            if (result.success) {
                return res.json({ success: true, message: '🎉 تم تغيير كلمة مرور فودافون بنجاح!' });
            } else {
                return res.json({ error: result.error || 'فشل تغيير كلمة المرور' });
            }
        }

        return res.json({ error: 'خطوة غير معروفة' });

    } catch (error) {
        return res.json({ error: error.message });
    }
};

async function sendOTP(number) {
    return new Promise((resolve) => {
        const url = 'https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=ana-vodafone-app';
        
        https.get(url, { headers: { 'User-Agent': 'vodafoneandroid' } }, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => {
                const match = data.match(/action="([^"]+)"/);
                if (!match) { resolve({ success: false, error: 'فشل تحميل الصفحة' }); return; }
                
                const actionUrl = match[1].replace(/&amp;/g, '&');
                const postData = `username=${encodeURIComponent(number)}`;
                const urlObj = new URL(actionUrl);
                
                const postReq = https.request({
                    hostname: urlObj.hostname,
                    path: urlObj.pathname + urlObj.search,
                    method: 'POST',
                    headers: {
                        'User-Agent': 'vodafoneandroid',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                }, (postResp) => {
                    let postResData = '';
                    postResp.on('data', chunk => postResData += chunk);
                    postResp.on('end', () => {
                        resolve({ success: true });
                    });
                });
                postReq.on('error', (e) => resolve({ success: false, error: e.message }));
                postReq.write(postData);
                postReq.end();
            });
        }).on('error', (e) => resolve({ success: false, error: e.message }));
    });
}

async function changePassword(number, otp, newPassword) {
    return new Promise((resolve) => {
        // معقد شوية، محتاج session
        resolve({ success: false, error: 'جاري تطوير هذه الميزة' });
    });
}
