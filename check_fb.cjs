const admin = require('firebase-admin');
const serviceAccount = require('./firebase-applet-config.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    const docRef = db.doc('families/gen-lang-client-0669556100/months/2026_9');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        console.log("SANTANDER BALANCE:", data.bankReserves?.santander);
    } else {
        console.log("No data for 2026_9");
    }
}
check();
