export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, token } = req.body || {};
    const BASE = 'https://api.mail.tm';

    if (action === 'create') {
        try {
            // جلب الدومين
            const r1 = await fetch(`${BASE}/domains`, {
                headers: { 'Accept': 'application/json' }
            });
            const text1 = await r1.text();
            let domains = [];
            try {
                const data1 = JSON.parse(text1);
                domains = Array.isArray(data1) ? data1 : (data1['hydra:member'] || []);
            } catch(e) {}

            if (!domains.length) {
                return res.json({ ok: false, msg: 'فشل جلب الدومين: ' + text1.substring(0, 50) });
            }
            
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
            const text2 = await r2.text();
            
            // جلب token
            const r3 = await fetch(`${BASE}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: mail, password: pass })
            });
            const text3 = await r3.text();
            let tok = '';
            try {
                const data3 = JSON.parse(text3);
                tok = data3.token || '';
            } catch(e) {}

            return res.json({ ok: true, email: mail, password: pass, token: tok });
        } catch(e) {
            return res.json({ ok: false, msg: e.message });
        }
    }

    if (action === 'check') {
        if (!token) return res.json({ ok: false, msg: 'Token مطلوب' });
        try {
            const r = await fetch(`${BASE}/messages`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            const text = await r.text();
            let msgs = [];
            try { 
                const data = JSON.parse(text);
                msgs = Array.isArray(data) ? data : (data['hydra:member'] || []);
            } catch(e) {}

            const details = [];
            for (const m of msgs) {
                const mid = m.id || m;
                const r2 = await fetch(`${BASE}/messages/${mid}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });
                const t2 = await r2.text();
                let d = {};
                try { d = JSON.parse(t2); } catch(e) {}
                
                details.push({
                    id: mid,
                    from: (d.from && d.from.address) || 'غير معروف',
                    subject: d.subject || 'بدون موضوع',
                    text: ((d.text || d.html || '')).replace(/<[^>]+>/g, '').trim()
                });
            }
            return res.json({ ok: true, messages: details });
        } catch(e) {
            return res.json({ ok: false, msg: e.message });
        }
    }

    return res.json({ ok: false, msg: 'خطأ' });
}
