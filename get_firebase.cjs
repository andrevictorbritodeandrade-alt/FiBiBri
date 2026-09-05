const admin = require('firebase-admin');
const serviceAccount = require('./firebase-applet-config.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const userId = 'andrevictorbritodeandrade@gmail.com'; // using email since UID is typically handled, but wait - how is data stored? Let's check App.tsx
