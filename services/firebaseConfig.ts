import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import rawFirebaseConfig from "../firebase-applet-config.json";

let app: any = null;
let auth: any = null;
let db: any = null;
let isConfigured = false;

try {
    const config = (rawFirebaseConfig && (rawFirebaseConfig as any).projectId) ? rawFirebaseConfig : {
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    };

    if (config && (config as any).projectId) {
        app = initializeApp(config as any);
        auth = getAuth(app);
        
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
        }, (config as any).firestoreDatabaseId || "(default)");
        
        isConfigured = true;
    }
} catch (error) {
    console.warn("Error initializing Firebase:", error);
    isConfigured = false;
}

export { db, auth, isConfigured, onAuthStateChanged, signInAnonymously };
