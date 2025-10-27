// C:/Users/haide/Desktop/Naeem Medicare/src/components/Home.jsx
import React, { useState } from 'react';
import { Plus, X, Calculator, Package, Download } from 'lucide-react';
import AddMedicineForm from './AddMedicineForm';
import SummaryCard from './SummaryCard';
import { exportToCSV as exportRecordsToCSV, calculateRecordTotals } from '../utils/calculations'; // Added calculateRecordTotals
import { addDoc, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

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

const getCurrentDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' });

export default function Home({ setCurrentPage, inventory, setInventory, records, setRecords, overallTotals }) {
  const [currentRecord, setCurrentRecord] = useState({
    patientName: '',
    diagnosis: '',
    date: getCurrentDate(),
    medicines: [],
    doctorFees: '0',
    bloodPressure: '',
    glucose: '',
    temperature: ''
  });

  const resetForm = () => {
    setCurrentRecord({
      patientName: '',
      diagnosis: '',
      date: getCurrentDate(),
      medicines: [],
      doctorFees: '0',
      bloodPressure: '',
      glucose: '',
      temperature: ''
    });
  };

  const saveRecord = async () => {
    try {
      if (!currentRecord.patientName.trim()) return alert('Patient name is required.');
      if (!currentRecord.diagnosis.trim()) return alert('Diagnosis is required.');
      const doctorFees = parseFloat(currentRecord.doctorFees);
      if (isNaN(doctorFees)) return alert('Enter a valid doctor fee.');
      if (currentRecord.medicines.length === 0 && doctorFees === 0) return alert('Add at least one medicine or non-zero doctor fees.');
      if (!currentRecord.date) return alert('Select a valid date.');

      const newRecord = {
        ...currentRecord,
        id: Date.now().toString(),
        doctorFees: doctorFees.toFixed(2),
        createdAt: new Date().toISOString(),
        bloodPressure: currentRecord.bloodPressure || 'Not recorded',
        glucose: currentRecord.glucose || 'Not recorded',
        temperature: currentRecord.temperature || 'Not recorded'
      };

      const totals = calculateRecordTotals(newRecord);
      const docRef = await addDoc(collection(db, 'patientRecords'), newRecord);
      setRecords(prev => [...prev, { ...newRecord, id: docRef.id }]);
      alert(`Record saved successfully! Total Amount: Rs. ${totals.totalSale.toFixed(2)}`);
      resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save record.');
    }
  };

  const restoreFromCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split('\n').map(r => r.trim()).filter(Boolean);
      const headers = rows.shift().split(',');

      const restoredRecords = rows.map(row => {
        const values = row.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header.trim()] = values[index] ? values[index].trim() : '';
          return obj;
        }, {});
      });

      setRecords(restoredRecords);
      alert('Backup restored successfully!');
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Failed to restore backup file.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">Naeem Medicare</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setCurrentPage('inventory')} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2">
              <Package size={18} /> Inventory
            </button>
            <button onClick={() => setCurrentPage('patientRecords')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
              <Calculator size={18} /> Patient Records
            </button>
            <button onClick={() => setCurrentPage('dailyRecords')} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2">
              <Calculator size={18} /> Daily Records
            </button>
          </div>
        </div>
        <div className="border-2 border-indigo-200 rounded-lg p-6 bg-indigo-50 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-indigo-800">New Patient Record</h2>
            <button onClick={resetForm} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2">
              <X size={18} /> Clear
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
              <input
                type="text"
                value={currentRecord.patientName}
                onChange={(e) => setCurrentRecord({ ...currentRecord, patientName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter patient name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
              <textarea
                value={currentRecord.diagnosis}
                onChange={(e) => setCurrentRecord({ ...currentRecord, diagnosis: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter diagnosis"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
              <input
                type="text"
                value={currentRecord.bloodPressure}
                onChange={(e) => setCurrentRecord({ ...currentRecord, bloodPressure: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 120/80 mmHg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Glucose</label>
              <input
                type="text"
                value={currentRecord.glucose}
                onChange={(e) => setCurrentRecord({ ...currentRecord, glucose: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 100 mg/dL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="text"
                value={currentRecord.temperature}
                onChange={(e) => setCurrentRecord({ ...currentRecord, temperature: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 98.6 °F"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={currentRecord.date}
                onChange={(e) => setCurrentRecord({ ...currentRecord, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Fees (Rs.)</label>
              <input
                type="text"
                inputMode="decimal"
                value={currentRecord.doctorFees}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) setCurrentRecord({ ...currentRecord, doctorFees: value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Medicine</h3>
            <AddMedicineForm
              inventory={inventory}
              setInventory={setInventory}
              currentRecord={currentRecord}
              setCurrentRecord={setCurrentRecord}
            />
          </div>
          <button
            onClick={saveRecord}
            disabled={!currentRecord.patientName.trim() || !currentRecord.diagnosis.trim() || isNaN(parseFloat(currentRecord.doctorFees))}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Calculator size={18} /> Save Record
          </button>
        </div>
        {records.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-800 mb-4 sm:mb-0">Overall Summary</h2>
              <button
                onClick={() => exportRecordsToCSV(records)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={18} /> Export to CSV
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard title="Total Costs" value={`Rs. ${overallTotals.totalCosts.toFixed(2)}`} color="text-red-700" />
              <SummaryCard title="Doctor Fees" value={`Rs. ${overallTotals.totalDoctorFees.toFixed(2)}`} color="text-blue-700" />
              <SummaryCard title="Total Sales" value={`Rs. ${overallTotals.totalSales.toFixed(2)}`} color="text-green-700" />
              <SummaryCard title="Total Profit" value={`Rs. ${overallTotals.totalProfit.toFixed(2)}`} color="text-emerald-700" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}