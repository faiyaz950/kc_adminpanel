import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDK5I_xmcfK1dMuaqHBRxkOAj4uNw4zIZs",
  authDomain: "karbalaconnect-d711d.firebaseapp.com",
  projectId: "karbalaconnect-d711d",
  storageBucket: "karbalaconnect-d711d.firebasestorage.app",
  messagingSenderId: "889597531293",
  appId: "1:889597531293:web:1c6b5983cde19b806af074",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_UID = 'pnE8vPE7NEVJeec7W1SAy04Q4Yz1';
const ADMIN_EMAIL = 'faiyazmujtaba72@gmail.com';

await setDoc(doc(db, 'admins', ADMIN_UID), {
  email: ADMIN_EMAIL,
  role: 'superadmin',
  createdAt: new Date().toISOString(),
});

console.log('✓ Admin document created for', ADMIN_EMAIL);
process.exit(0);
