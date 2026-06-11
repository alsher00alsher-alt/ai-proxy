const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { image_base64, prompt } = req.body;
        
        // نستخدم Koala.sh لإنشاء صورة من النص (بديل أبسط)
        return res.json({ 
            success: true, 
            message: 'استخدم Koala.sh للصور والفيديو',
            tip: 'جرب /api/koala مع prompt يصف الفيديو'
        });

    } catch (e) {
        return res.json({ error: e.message });
    }
};
