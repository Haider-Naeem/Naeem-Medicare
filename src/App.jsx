// C:/Users/haide/Desktop/Naeem Medicare/src/App.jsx
import React, { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import Home from './components/Home';
import Inventory from './components/Inventory';
import PatientRecords from './components/PatientRecords';
import DailyRecords from './components/DailyRecords';
import { INITIAL_MEDICINES } from './utils/constants';
import { calculateOverallTotals } from './utils/calculations';

export default function MedicalRecordsApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [inventory, setInventory] = useState(INITIAL_MEDICINES);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Starting data fetch from IndexedDB...');
        const inventoryResult = await get('medicalInventory');
        const recordsResult = await get('medicalRecords');

        if (inventoryResult) {
          console.log('Inventory loaded:', inventoryResult);
          setInventory(inventoryResult);
        } else {
          console.log('No inventory in IndexedDB, using INITIAL_MEDICINES');
        }
        if (recordsResult) {
          console.log('Records loaded:', recordsResult);
          setRecords(recordsResult);
        } else {
          console.log('No records in IndexedDB');
        }
      } catch (error) {
        console.error('Error loading data from IndexedDB:', error, error.stack);
        alert('Failed to load data. Using defaults.');
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save inventory to IndexedDB
  useEffect(() => {
    if (!loading) {
      const saveInventory = async () => {
        try {
          console.log('Saving inventory to IndexedDB:', inventory);
          await set('medicalInventory', inventory);
        } catch (error) {
          console.error('Error saving inventory to IndexedDB:', error, error.stack);
          alert('Failed to save inventory.');
        }
      };
      saveInventory();
    }
  }, [inventory, loading]);

  // Save records to IndexedDB
  useEffect(() => {
    if (!loading) {
      const saveRecords = async () => {
        try {
          console.log('Saving records to IndexedDB:', records);
          await set('medicalRecords', records);
        } catch (error) {
          console.error('Error saving records to IndexedDB:', error, error.stack);
          alert('Failed to save records.');
        }
      };
      saveRecords();
    }
  }, [records, loading]);

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This will delete all inventory and patient records.')) {
      try {
        console.log('Clearing all data from IndexedDB...');
        await set('medicalInventory', INITIAL_MEDICINES);
        await set('medicalRecords', []);
        setInventory(INITIAL_MEDICINES);
        setRecords([]);
        alert('All data cleared successfully!');
        setCurrentPage('home');
      } catch (error) {
        console.error('Error clearing data from IndexedDB:', error, error.stack);
        alert('Error clearing data. Please try again.');
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
      {currentPage === 'home' && (
        <Home
          setCurrentPage={setCurrentPage}
          inventory={inventory}
          setInventory={setInventory}
          records={records}
          setRecords={setRecords}
          overallTotals={overallTotals}
        />
      )}
      {currentPage === 'inventory' && (
        <Inventory
          inventory={inventory}
          setInventory={setInventory}
          setCurrentPage={setCurrentPage}
          clearAllData={clearAllData}
        />
      )}
      {currentPage === 'patientRecords' && (
        <PatientRecords
          records={records}
          setRecords={setRecords}
          inventory={inventory}
          setInventory={setInventory}
          setCurrentPage={setCurrentPage}
        />
      )}
      {currentPage === 'dailyRecords' && (
        <DailyRecords
          records={records}
          setCurrentPage={setCurrentPage}
        />
      )}
    </div>
  );
}