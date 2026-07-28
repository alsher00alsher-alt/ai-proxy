export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, email, token } = req.body || {};

    if (action === 'create') {
        try {
            // Guerrilla Mail - إنشاء بريد
            const r = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address&ip=127.0.0.1&agent=Mozilla', {
                headers: { 'Accept': 'application/json' }
            });
            const data = await r.json();
            
            if (data.email_addr) {
                return res.json({
                    ok: true,
                    email: data.email_addr,
                    token: data.sid_token || '',
                    password: ''
                });
            }
            return res.json({ ok: false, msg: 'فشل إنشاء البريد' });
        } catch(e) {
            return res.json({ ok: false, msg: e.message });
        }
    }

    if (action === 'check') {
        if (!token) return res.json({ ok: false, msg: 'Token مطلوب' });
        try {
            const r = await fetch(`https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${token}`, {
                headers: { 'Accept': 'application/json' }
            });
            const data = await r.json();
            const msgs = data.list || [];

            const details = [];
            for (const m of msgs) {
                // جلب محتوى الرسالة
                const r2 = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${m.mail_id}&sid_token=${token}`, {
                    headers: { 'Accept': 'application/json' }
                });
                const d = await r2.json();
                
                details.push({
                    id: m.mail_id,
                    from: m.mail_from || 'غير معروف',
                    subject: m.mail_subject || 'بدون موضوع',
                    text: (d.mail_body || '').replace(/<[^>]+>/g, '').trim()
                });
            }
            return res.json({ ok: true, messages: details });
        } catch(e) {
            return res.json({ ok: false, msg: e.message });
        }
    }

    return res.json({ ok: false, msg: 'خطأ' });
}
