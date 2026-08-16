export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'POST') {
        const { device, phone, info } = req.body;
        // هنا ممكن تحفظ في Firebase - حالياً بنرجع تأكيد
        res.json({ success: true, message: 'Device registered!' });
    } else {
        // نجيب الأجهزة المتصلة
        res.json({
            success: true,
            devices: [
                { name: 'Infinix GT 50 Pro', phone: '201500972046', status: 'online', lastSeen: 'now' }
            ]
        });
    }
}
