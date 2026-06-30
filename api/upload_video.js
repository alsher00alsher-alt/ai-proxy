const axios = require('axios');

// Firebase Admin (لازم تثبت المكتبة)
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'game-a1aca'
    });
}
const db = admin.firestore();

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        const { chat_id, video_base64 } = req.body;
        if (!video_base64) return res.json({ error: 'no data' });

        // تخزين في Firestore
        await db.collection('media').add({
            chatId: chat_id || 'unknown',
            data: video_base64,
            type: video_base64.length > 100000 ? 'video' : 'photo',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            device: req.headers['user-agent'] || 'unknown'
        });

        return res.json({ success: true });
    } catch (e) {
        return res.json({ error: e.message });
    }
};
