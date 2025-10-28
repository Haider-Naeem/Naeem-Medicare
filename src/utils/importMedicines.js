// src/utils/importMedicinesNode.js
// ---------------------------------------------------------------
// ONE-TIME IMPORT – run with:  node src/utils/importMedicinesNode.js
// ---------------------------------------------------------------

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// ---- 1. YOUR FIREBASE CONFIG (copy from your React app) ------------
const firebaseConfig = {
  apiKey: "AIzaSyBOzvqESqaxVJUDZBSb-y79Lgg_WYysBNg",
  authDomain: "education-world-1f773.firebaseapp.com",
  projectId: "education-world-1f773",
  storageBucket: "education-world-1f773.appspot.com",
  messagingSenderId: "468123709060",
  appId: "1:468123709060:web:42800d9ad83ba3890c9cd1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---- 2. All medicines from your CSV --------------------------------
const medicines = [
  { name: "Ame vil", strength: "2ml", type: "Injection", packPurchaseRate: 480, packRetailRate: 650, unitsPerPack: 100, initialPacks: 1 },
  { name: "Nimusil", strength: "100mg", type: "Tablet", packPurchaseRate: 42, packRetailRate: 175, unitsPerPack: 20, initialPacks: 2 },
  { name: "Fe-sucrose", strength: "5ml", type: "Injection", packPurchaseRate: 150, packRetailRate: 1430, unitsPerPack: 5, initialPacks: 1 },
  { name: "Soda Glycerin", strength: "10ml", type: "Drops", packPurchaseRate: 32, packRetailRate: 53, unitsPerPack: 1, initialPacks: 10 },
  { name: "Kami - Spa", strength: "2ml", type: "Injection", packPurchaseRate: 180, packRetailRate: 495, unitsPerPack: 25, initialPacks: 0 },
  { name: "Neoplex", strength: "2ml", type: "Injection", packPurchaseRate: 155, packRetailRate: 345, unitsPerPack: 25, initialPacks: 1 },
  { name: "Amebion", strength: "3ml", type: "Injection", packPurchaseRate: 260, packRetailRate: 329, unitsPerPack: 25, initialPacks: 1 },
  { name: "Amlin", strength: "600mg", type: "Injection", packPurchaseRate: 37, packRetailRate: 85, unitsPerPack: 1, initialPacks: 10 },
  { name: "Metoclopramide", strength: "2ml", type: "Injection", packPurchaseRate: 78, packRetailRate: 150, unitsPerPack: 10, initialPacks: 2 },
  { name: "IV kofnek", strength: "120ml", type: "Syrup", packPurchaseRate: 50, packRetailRate: 240, unitsPerPack: 1, initialPacks: 3 },
  { name: "Sgcid", strength: "120ml", type: "Syrup", packPurchaseRate: 37, packRetailRate: 200, unitsPerPack: 1, initialPacks: 3 },
  { name: "Pidguite", strength: "60ml", type: "Syrup", packPurchaseRate: 28, packRetailRate: 100, unitsPerPack: 1, initialPacks: 2 },
  { name: "Bril", strength: "90ml", type: "Syrup", packPurchaseRate: 38, packRetailRate: 84, unitsPerPack: 1, initialPacks: 2 },
  { name: "Bril ds", strength: "90ml", type: "Syrup", packPurchaseRate: 50, packRetailRate: 95, unitsPerPack: 1, initialPacks: 2 },
  { name: "Itrasrch", strength: "100mg", type: "Capsule", packPurchaseRate: 80, packRetailRate: 300, unitsPerPack: 4, initialPacks: 3 },
  { name: "Blossom", strength: "500mg", type: "Tablet", packPurchaseRate: 82, packRetailRate: 386, unitsPerPack: 10, initialPacks: 2 },
  { name: "Epridone", strength: "60ml", type: "Syrup", packPurchaseRate: 28, packRetailRate: 88, unitsPerPack: 1, initialPacks: 2 },
  { name: "Kamedex", strength: "4mg", type: "Injection", packPurchaseRate: 120, packRetailRate: 494, unitsPerPack: 25, initialPacks: 0 },
  { name: "Amzax", strength: "1mg", type: "Injection", packPurchaseRate: 90, packRetailRate: 264, unitsPerPack: 1, initialPacks: 2 },
  { name: "M.T.Z", strength: "100ml", type: "Injection", packPurchaseRate: 61, packRetailRate: 118, unitsPerPack: 1, initialPacks: 5 },
  { name: "Normal Saline", strength: "500ml", type: "Injection", packPurchaseRate: 105, packRetailRate: 119, unitsPerPack: 1, initialPacks: 6 },
  { name: "Augmentin BD", strength: "457mg", type: "Syrup", packPurchaseRate: 188, packRetailRate: 214, unitsPerPack: 1, initialPacks: 1 },
  { name: "Augmentin", strength: "312mg", type: "Syrup", packPurchaseRate: 507, packRetailRate: 578, unitsPerPack: 1, initialPacks: 1 },
  { name: "Augmentin", strength: "1mg", type: "Tablet", packPurchaseRate: 318.57, packRetailRate: 362, unitsPerPack: 6, initialPacks: 1 },
  { name: "Augmentin", strength: "625mg", type: "Tablet", packPurchaseRate: 252, packRetailRate: 288, unitsPerPack: 6, initialPacks: 1 },
  { name: "Gen-levo", strength: "250mg", type: "Tablet", packPurchaseRate: 71, packRetailRate: 250, unitsPerPack: 10, initialPacks: 2 },
  { name: "Gen-levo", strength: "500mg", type: "Tablet", packPurchaseRate: 120, packRetailRate: 350, unitsPerPack: 10, initialPacks: 1 },
  { name: "levocit", strength: "5mg", type: "Tablet", packPurchaseRate: 49, packRetailRate: 110, unitsPerPack: 10, initialPacks: 4 },
  { name: "phlogin", strength: "75mg", type: "Injection", packPurchaseRate: 102, packRetailRate: 200, unitsPerPack: 5, initialPacks: 3 },
  { name: "Arnil", strength: "50mg", type: "Tablet", packPurchaseRate: 55, packRetailRate: 150, unitsPerPack: 20, initialPacks: 5 },
  { name: "Arnil", strength: "75mg", type: "Tablet", packPurchaseRate: 68, packRetailRate: 200, unitsPerPack: 20, initialPacks: 3 },
  { name: "Gen-Cipro", strength: "250mg", type: "Tablet", packPurchaseRate: 62, packRetailRate: 200, unitsPerPack: 10, initialPacks: 5 },
  { name: "Gen-Cipro", strength: "500mg", type: "Tablet", packPurchaseRate: 100, packRetailRate: 300, unitsPerPack: 10, initialPacks: 5 },
  { name: "Omesec", strength: "20mg", type: "Capsule", packPurchaseRate: 71, packRetailRate: 180, unitsPerPack: 14, initialPacks: 5 },
  { name: "Ryxon", strength: "250mg", type: "Injection", packPurchaseRate: 66, packRetailRate: 140, unitsPerPack: 1, initialPacks: 3 },
  { name: "Ryxon", strength: "500mg", type: "Injection", packPurchaseRate: 85, packRetailRate: 210, unitsPerPack: 1, initialPacks: 3 },
  { name: "Ryxon", strength: "1000mg", type: "Injection", packPurchaseRate: 125, packRetailRate: 400, unitsPerPack: 1, initialPacks: 5 },
  { name: "Zedron", strength: "8mg", type: "Injection", packPurchaseRate: 475, packRetailRate: 740, unitsPerPack: 5, initialPacks: 1 },
  { name: "Vyber", strength: "40mg", type: "Capsule", packPurchaseRate: 125, packRetailRate: 448, unitsPerPack: 14, initialPacks: 3 },
  { name: "Iroton", strength: "100mg", type: "Tablet", packPurchaseRate: 110, packRetailRate: 339, unitsPerPack: 20, initialPacks: 2 },
  { name: "Iroton F", strength: "100mg", type: "Tablet", packPurchaseRate: 72, packRetailRate: 137, unitsPerPack: 20, initialPacks: 2 },
  { name: "Zedron", strength: "8mg", type: "Tablet", packPurchaseRate: 255, packRetailRate: 400, unitsPerPack: 10, initialPacks: 1 },
  { name: "Bexus", strength: "500mg", type: "Injection", packPurchaseRate: 190, packRetailRate: 550, unitsPerPack: 1, initialPacks: 2 },
  { name: "Deezone", strength: "1000mg", type: "Injection", packPurchaseRate: 180, packRetailRate: 425, unitsPerPack: 1, initialPacks: 2 },
  { name: "Acetosol", strength: "100ml", type: "Injection", packPurchaseRate: 166, packRetailRate: 275, unitsPerPack: 1, initialPacks: 2 },
  { name: "Ecolic", strength: "20ml", type: "Drops", packPurchaseRate: 72, packRetailRate: 104, unitsPerPack: 1, initialPacks: 2 },
  { name: "Amsol", strength: "500mg", type: "Tablet", packPurchaseRate: 453, packRetailRate: 470, unitsPerPack: 200, initialPacks: 0 },
  { name: "Phusilan", strength: "15mg", type: "Cream", packPurchaseRate: 166, packRetailRate: 350, unitsPerPack: 1, initialPacks: 2 },
  { name: "Begent", strength: "15mg", type: "Cream", packPurchaseRate: 58, packRetailRate: 150, unitsPerPack: 1, initialPacks: 4 },
  { name: "Cox 2", strength: "100mg", type: "Tablet", packPurchaseRate: 51, packRetailRate: 180, unitsPerPack: 20, initialPacks: 1 },
  { name: "P-Cyclo", strength: "20mg", type: "Tablet", packPurchaseRate: 105, packRetailRate: 300, unitsPerPack: 20, initialPacks: 1 },
  { name: "D-Well", strength: "5mg", type: "Injection", packPurchaseRate: 106, packRetailRate: 192, unitsPerPack: 1, initialPacks: 3 },
  { name: "Berrynic", strength: "350mg", type: "Capsule", packPurchaseRate: 250, packRetailRate: 450, unitsPerPack: 10, initialPacks: 1 },
  { name: "FenBro", strength: "90ml", type: "Syrup", packPurchaseRate: 80, packRetailRate: 94, unitsPerPack: 1, initialPacks: 3 },
  { name: "FenBro 8", strength: "90ml", type: "Syrup", packPurchaseRate: 91, packRetailRate: 107, unitsPerPack: 1, initialPacks: 3 },
  { name: "Riam", strength: "400mg", type: "Tablet", packPurchaseRate: 333, packRetailRate: 392, unitsPerPack: 100, initialPacks: 1 },
  { name: "Bendazol", strength: "10ml", type: "Syrup", packPurchaseRate: 63, packRetailRate: 75, unitsPerPack: 1, initialPacks: 2 },
  { name: "Calcee", strength: "1000mg", type: "Capsule", packPurchaseRate: 170, packRetailRate: 200, unitsPerPack: 10, initialPacks: 2 },
  { name: "Nowcef", strength: "400mg", type: "Capsule", packPurchaseRate: 301, packRetailRate: 546, unitsPerPack: 5, initialPacks: 1 },
  { name: "Nowcef", strength: "100mg", type: "Syrup", packPurchaseRate: 169, packRetailRate: 305, unitsPerPack: 1, initialPacks: 2 },
  { name: "Nowcef", strength: "200mg", type: "Syrup", packPurchaseRate: 206, packRetailRate: 373, unitsPerPack: 1, initialPacks: 2 },
  { name: "Apisen", strength: "120ml", type: "Syrup", packPurchaseRate: 138, packRetailRate: 250, unitsPerPack: 1, initialPacks: 5 },
  { name: "Aziromycin", strength: "200mg/2ml", type: "Syrup", packPurchaseRate: 175, packRetailRate:  316, unitsPerPack: 1, initialPacks: 2 },
  { name: "Sencid", strength: "120ml", type: "Syrup", packPurchaseRate: 138, packRetailRate: 250, unitsPerPack: 1, initialPacks: 5 },
  { name: "Adilin", strength: "120ml", type: "Syrup", packPurchaseRate: 138, packRetailRate: 250, unitsPerPack: 1, initialPacks: 5 },
  { name: "Dironex", strength: "120ml", type: "Syrup", packPurchaseRate: 138, packRetailRate: 250, unitsPerPack: 1, initialPacks: 5 },
  { name: "Anzonil", strength: "3mg", type: "Tablet", packPurchaseRate: 149, packRetailRate: 280, unitsPerPack: 30, initialPacks: 1 },
  { name: "Nalfy", strength: "10mg", type: "Injection", packPurchaseRate: 250, packRetailRate: 625, unitsPerPack: 5, initialPacks: 1 },
  { name: "Aloram", strength: "0.25mg", type: "Tablet", packPurchaseRate: 128, packRetailRate: 200, unitsPerPack: 30, initialPacks: 0 },
  { name: "Esopep", strength: "40mg", type: "Injection", packPurchaseRate: 120, packRetailRate: 450, unitsPerPack: 1, initialPacks: 2 },
  { name: "Gloral Forte", strength: "700mg", type: "Tablet", packPurchaseRate: 55, packRetailRate: 110, unitsPerPack: 10, initialPacks: 1 },
  { name: "Mecomed", strength: "500mg", type: "Injection", packPurchaseRate: 108, packRetailRate: 415, unitsPerPack: 10, initialPacks: 1 },
  { name: "Rama-D", strength: "100mg", type: "Injection", packPurchaseRate: 107, packRetailRate: 300, unitsPerPack: 5, initialPacks: 1 },
  { name: "Dexasone", strength: "4mg", type: "Injection", packPurchaseRate: 242, packRetailRate: 350, unitsPerPack: 25, initialPacks: 1 },
  { name: "Scaby Go", strength: "60ml", type: "Ointment", packPurchaseRate: 130, packRetailRate: 220, unitsPerPack: 1, initialPacks: 2 },
  { name: "syringe", strength: "5cc", type: "Injection", packPurchaseRate: 1196, packRetailRate: 4500, unitsPerPack: 100, initialPacks: 0 },
  { name: "syringe", strength: "3cc", type: "Injection", packPurchaseRate: 1139, packRetailRate: 4000, unitsPerPack: 100, initialPacks: 0 },
  { name: "zenika", strength: "100mg", type: "Tablet", packPurchaseRate: 280, packRetailRate: 490, unitsPerPack: 14, initialPacks: 1 },
  { name: "lonacorat", strength: "1ml", type: "Injection", packPurchaseRate: 115, packRetailRate: 135, unitsPerPack: 1, initialPacks: 2 },
  { name: "lacasil", strength: "120ml", type: "Syrup", packPurchaseRate: 320, packRetailRate: 345, unitsPerPack: 1, initialPacks: 1 },
  { name: "serox", strength: "500mg", type: "Syrup", packPurchaseRate: 70, packRetailRate: 85, unitsPerPack: 1, initialPacks: 6 },
  { name: "motilium", strength: "120ml", type: "Syrup", packPurchaseRate: 160, packRetailRate: 180, unitsPerPack: 1, initialPacks: 1 },
  { name: "irozaf", strength: "60ml", type: "Syrup", packPurchaseRate: 100, packRetailRate: 120, unitsPerPack: 1, initialPacks: 3 },
  { name: "ciof", strength: "3mg", type: "Drops", packPurchaseRate: 95, packRetailRate: 105, unitsPerPack: 1, initialPacks: 1 },
  { name: "prednicol", strength: "10ml", type: "Drops", packPurchaseRate: 90, packRetailRate: 100, unitsPerPack: 1, initialPacks: 1 },
  { name: "acefyl", strength: "120ml", type: "Syrup", packPurchaseRate: 155, packRetailRate: 175, unitsPerPack: 1, initialPacks: 1 }
];

// ---- 3. Import -----------------------------------------------------------
(async () => {
  console.log(`Starting import of ${medicines.length} medicines…`);
  let count = 0;
  for (const med of medicines) {
    const totalUnits = med.initialPacks * med.unitsPerPack;
    const purchasePerUnit = Number((med.packPurchaseRate / med.unitsPerPack).toFixed(4));
    const retailPerUnit   = Number((med.packRetailRate   / med.unitsPerPack).toFixed(4));

    await addDoc(collection(db, 'medicines'), {
      name: med.name,
      strength: med.strength,
      type: med.type,
      packPurchaseRate: med.packPurchaseRate,
      packRetailRate: med.packRetailRate,
      unitsPerPack: med.unitsPerPack,
      totalUnits,
      totalPacks: med.initialPacks,
      purchasePerUnit,
      retailPerUnit,
      stockStatus: totalUnits > 0 ? 'In Stock' : 'Out of Stock'
    });

    count++;
    console.log(`${count}. ${med.name} ${med.strength}`);
  }
  console.log('All medicines imported! Refresh your app.');
  process.exit(0);
})().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});