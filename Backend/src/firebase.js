import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBRq8lvXWDQLpdeXL3oz59TBx38LvUPGRk",
  authDomain: "mshashazwinepe-8489d.firebaseapp.com",
  projectId: "mshashazwinepe-8489d",
  storageBucket: "mshashazwinepe-8489d.firebasestorage.app",
  messagingSenderId: "1020679564289",
  appId: "1:1020679564289:web:93a9c669415deeaf42a400"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

export { db, storage };
export default firebaseApp;