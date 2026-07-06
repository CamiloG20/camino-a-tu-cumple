import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuración de Firebase - Proyecto: Camino a tu cumple
const firebaseConfig = {
  apiKey: "AIzaSyB-4h5CVwkUe8WX0T284VWDZUFOe0tLfGo",
  authDomain: "camino-a-tu-cumple.firebaseapp.com",
  projectId: "camino-a-tu-cumple",
  storageBucket: "camino-a-tu-cumple.firebasestorage.app",
  messagingSenderId: "492716866781",
  appId: "1:492716866781:web:54bd82329484ceb6096f34",
  measurementId: "G-267MEP9PVT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app; 