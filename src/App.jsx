// src/App.jsx
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import Home from './components/Home';
import Inventory from './components/Inventory';
import PatientRecords from './components/PatientRecords';
import DailyRecords from './components/DailyRecords';
import Expense from './components/Expense';
import { calculateOverallTotals } from './utils/calculations';
import { INITIAL_MEDICINES } from './utils/constants';

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

initializeApp(firebaseConfig);
const db = getFirestore();

export default function MedicalRecordsApp() {
  const [currentTab, setCurrentTab] = useState('home');
  const [inventory, setInventory] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const inventorySnapshot = await getDocs(collection(db, 'medicines'));
        const inventoryData = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventory(inventoryData.length ? inventoryData : INITIAL_MEDICINES);

        const recordsSnapshot = await getDocs(collection(db, 'patientRecords'));
        const recordsData = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecords(recordsData);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Using defaults.');
        setInventory(INITIAL_MEDICINES);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This will delete all inventory and patient records.')) {
      try {
        const recordsSnapshot = await getDocs(collection(db, 'patientRecords'));
        const recordDeletes = recordsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(recordDeletes);

        const inventorySnapshot = await getDocs(collection(db, 'medicines'));
        const inventoryDeletes = inventorySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(inventoryDeletes);

        const inventorySets = INITIAL_MEDICINES.map(med => setDoc(doc(db, 'medicines', med.id.toString()), med));
        await Promise.all(inventorySets);

        setInventory(INITIAL_MEDICINES);
        setRecords([]);
        alert('All data cleared successfully!');
        setCurrentTab('home');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Failed to clear data.');
      }
    }
  };

  const overallTotals = calculateOverallTotals(records);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Naeem Medicare...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {currentTab === 'home' && (
        <Home
          setCurrentPage={setCurrentTab}
          inventory={inventory}
          setInventory={setInventory}
          records={records}
          setRecords={setRecords}
          overallTotals={overallTotals}
        />
      )}
      {currentTab === 'inventory' && (
        <Inventory
          inventory={inventory}
          setInventory={setInventory}
          setCurrentPage={setCurrentTab}
          clearAllData={clearAllData}
        />
      )}
      {currentTab === 'patientRecords' && (
        <PatientRecords
          records={records}
          setRecords={setRecords}
          inventory={inventory}
          setInventory={setInventory}
          setCurrentPage={setCurrentTab}
        />
      )}
      {currentTab === 'dailyRecords' && (
        <DailyRecords records={records} setCurrentPage={setCurrentTab} />
      )}
      {currentTab === 'expense' && (
        <Expense records={records} setCurrentPage={setCurrentTab} />
      )}
    </div>
  );
}