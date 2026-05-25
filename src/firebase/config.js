import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDK5I_xmcfK1dMuaqHBRxkOAj4uNw4zIZs",
  authDomain: "karbalaconnect-d711d.firebaseapp.com",
  projectId: "karbalaconnect-d711d",
  storageBucket: "karbalaconnect-d711d.firebasestorage.app",
  messagingSenderId: "889597531293",
  appId: "1:889597531293:web:1c6b5983cde19b806af074",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
