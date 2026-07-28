export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, email, password, token } = req.body || {};
    const BASE = 'https://api.mail.tm';

    // ====== إنشاء بريد جديد ======
    if (action === 'create') {
        try {
            // جلب الدومين
            const r1 = await fetch(`${BASE}/domains`);
            const data1 = await r1.json();
            const domains = Array.isArray(data1) ? data1 : (data1['hydra:member'] || []);
            if (!domains.length) return res.json({ ok: false, msg: 'فشل جلب الدومين' });
            
            const domain = domains[0].domain || domains[0];
            const user = Math.random().toString(36).substring(2, 12);
            const mail = `${user}@${domain}`;
            const pass = Math.random().toString(36).substring(2, 16);

            // إنشاء حساب
            const r2 = await fetch(`${BASE}/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: mail, password: pass })
            });

            // جلب token
            const r3 = await fetch(`${BASE}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: mail, password: pass })
            });
            const data3 = await r3.json();
            const tok = data3.token || '';

            return res.json({ ok: true, email: mail, password: pass, token: tok });
        } catch(e) {
            return res.json({ ok: false, msg: e.message });
        }
    }

    // ====== فحص الرسائل ======
    if (action === 'check') {
        if (!token) return res.json({ ok: false, msg: 'Token مطلوب' });
        
        try {
            const r = await fetch(`${BASE}/messages`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            const data = await r.json();
            const msgs = Array.isArray(data) ? data : (data['hydra:member'] || []);

            // جلب تفاصيل كل رسالة
            const details = [];
            for (const m of msgs) {
                const mid = m.id || m;
                const r2 = await fetch(`${BASE}/messages/${mid}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });
                const d = await r2.json();
                details.push({
                    id: mid,
                    from: d.from?.address || 'غير معروف',
                    subject: d.subject || 'بدون موضوع',
                    text: (d.text || d.html || '').replace(/<[^>]+>/g, '').trim()
                });
            }

            return res.json({ ok: true, messages: details });
        } catch(e) {
            return res.json({ ok: false, msg: e.message });
        }
    }

    return res.json({ ok: false, msg: 'إجراء غير معروف' });
}
