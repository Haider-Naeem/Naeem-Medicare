// C:/Users/haide/Desktop/Naeem Medicare/src/utils/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBOzvqESqaxVJUDZBSb-y79Lgg_WYysBNg",
  authDomain: "education-world-1f773.firebaseapp.com",
  databaseURL: "https://education-world-1f773.firebaseio.com",
  projectId: "education-world-1f773",
  storageBucket: "education-world-1f773.firebasestorage.app",
  messagingSenderId: "468123709060",
  appId: "1:468123709060:web:42800d9ad83ba3890c9cd1",
  measurementId: "G-XR0CDQZEQ2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('Firestore initialized:', app.name);

export { db, collection, getDocs, addDoc, deleteDoc, doc, setDoc };