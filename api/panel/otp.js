export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    const count = req.query.count || 50;
    
    try {
        // نجيب الأكواد من Firebase
        const response = await fetch('https://otp-5acda-default-rtdb.firebaseio.com/otp.json');
        const data = await response.json();
        
        if (data) {
            const list = Object.values(data).flat();
            res.json(list.slice(0, count));
        } else {
            // بيانات تجريبية لو Firebase فاضي
            const demo = [];
            const countries = ['TG','LB','UA','AM','MZ','ZW','LY','BF','ID'];
            const services = ['WhatsApp','Telegram','Instagram','Facebook','TikTok'];
            
            for (let i = 0; i < count; i++) {
                const country = countries[Math.floor(Math.random()*countries.length)];
                const service = services[Math.floor(Math.random()*services.length)];
                const prefixes = {TG:'228',LB:'961',UA:'380',AM:'374',MZ:'258',ZW:'263',LY:'218',BF:'226',ID:'62'};
                const prefix = prefixes[country];
                const phone = prefix + Math.floor(Math.random()*100000000);
                const code = Math.floor(100000 + Math.random()*900000);
                demo.push([service, phone.toString(), code.toString(), '', country]);
            }
            res.json(demo);
        }
    } catch(e) {
        res.json([]);
    }
}
