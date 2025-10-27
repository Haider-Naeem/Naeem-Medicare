// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBOzvqESqaxVJUDZBSb-y79Lgg_WYysBNg",
  authDomain: "education-world-1f773.firebaseapp.com",
  databaseURL: "https://education-world-1f773.firebaseio.com",
  projectId: "education-world-1f773",
  storageBucket: "education-world-1f773.appspot.com", // ✅ FIXED
  messagingSenderId: "468123709060",
  appId: "1:468123709060:web:42800d9ad83ba3890c9cd1",
  measurementId: "G-XR0CDQZEQ2"
};

const app = initializeApp(firebaseConfig);

// ✅ Optional — Only run analytics if it's a browser environment
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

console.log('✅ Firebase initialized:', app.name);

export const db = getFirestore(app);
export const storage = getStorage(app);
export { analytics };
