import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyA5LuJwdTckc6V2zClBeRiozM_tdMx5fAQ",
    authDomain: "otp-5acda.firebaseapp.com",
    databaseURL: "https://otp-5acda-default-rtdb.firebaseio.com",
    projectId: "otp-5acda",
    storageBucket: "otp-5acda.firebasestorage.app",
    messagingSenderId: "984953913771",
    appId: "1:420708694416:android:e1188071fa261c04215b15"
};

let app;
try { app = initializeApp(firebaseConfig); } catch(e) { app = initializeApp(firebaseConfig, 'app2'); }
const db = getDatabase(app);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    if (req.method === 'POST') {
        const { type, data } = req.body;
        
        try {
            const dbRef = ref(db, 'panel/' + Date.now());
            await set(dbRef, { type, data, time: new Date().toISOString() });
            res.json({ success: true, message: 'Saved to Firebase!' });
        } catch(e) {
            res.json({ success: false, error: e.message });
        }
    } else {
        res.json({ success: true, message: 'GET works' });
    }
}
