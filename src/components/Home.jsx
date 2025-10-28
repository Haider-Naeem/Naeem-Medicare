// src/components/Home.jsx
import React, { useState } from 'react';
import { Plus, X, Calculator, Package, Download } from 'lucide-react';
import AddMedicineForm from './AddMedicineForm';
import SummaryCard from './SummaryCard';
import { exportToCSV as exportRecordsToCSV, calculateRecordTotals } from '../utils/calculations';
import { addDoc, collection, doc, setDoc ,getDoc} from 'firebase/firestore';
import { db } from '../utils/firebase';

const getCurrentDate = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

export default function Home({
  setCurrentPage,
  inventory,
  setInventory,
  records,
  setRecords,
  overallTotals,
}) {
  const [currentRecord, setCurrentRecord] = useState({
    patientName: '',
    diagnosis: '',
    date: getCurrentDate(),
    medicines: [],
    doctorFees: '0',
    bloodPressure: '',
    glucose: '',
    temperature: '',
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
      temperature: '',
    });
  };

  // --------------------------------------------------------------
  // SAVE RECORD — Firestore auto-ID + inventory update
  // --------------------------------------------------------------
const saveRecord = async () => {
  try {
    // Validation
    if (!currentRecord.patientName.trim()) return alert('Patient name is required.');
    if (!currentRecord.diagnosis.trim()) return alert('Diagnosis is required.');
    if (!currentRecord.date) return alert('Select a valid date.');

    const doctorFees = parseFloat(currentRecord.doctorFees || 0);
    if (isNaN(doctorFees)) return alert('Enter a valid doctor fee.');

    if (currentRecord.medicines.length === 0 && doctorFees === 0)
      return alert('Add at least one medicine or non-zero doctor fees.');

    // Build record object
    const newRecord = {
      ...currentRecord,
      doctorFees: doctorFees.toFixed(2),
      createdAt: new Date().toISOString(),
      bloodPressure: currentRecord.bloodPressure || 'Not recorded',
      glucose: currentRecord.glucose || 'Not recorded',
      temperature: currentRecord.temperature || 'Not recorded',
    };

    // ---- STEP 1: Validate ONLY (no deduction) ----
    for (const med of newRecord.medicines) {
      const invMed = inventory.find(m => m.id === med.medicineId);
      if (!invMed) {
        return alert(`Medicine not found in inventory.`);
      }
      if (invMed.totalUnits < med.quantity) {
        return alert(`Not enough stock for ${invMed.name}. Available: ${invMed.totalUnits}`);
      }
    }

    // Use the already-updated inventory from AddMedicineForm
    const updatedInventory = [...inventory];

    // ---- STEP 2: Save record to Firestore ----
    const docRef = await addDoc(collection(db, 'patientRecords'), newRecord);
    const recordWithId = { ...newRecord, id: docRef.id };
    await setDoc(doc(db, 'patientRecords', docRef.id), { id: docRef.id }, { merge: true });

    // ---- STEP 3: PERSIST INVENTORY CHANGES TO FIRESTORE ----
    const batchWrites = updatedInventory.map(async (med) => {
      const medRef = doc(db, 'medicines', med.id);
      const snap = await getDoc(medRef);
      const fresh = snap.data();
      const unitsPerPack = fresh.unitsPerPack || 1;

      return setDoc(medRef, {
        totalUnits: med.totalUnits,
        totalPacks: Math.floor(med.totalUnits / unitsPerPack),
        stockStatus: med.totalUnits > 0 ? 'In Stock' : 'Out of Stock',
      }, { merge: true });
    });
    await Promise.all(batchWrites);

    // ---- STEP 4: Update UI state ----
    setRecords((prev) => [...prev, recordWithId]);
    setInventory(updatedInventory);

    const totals = calculateRecordTotals(recordWithId);
    alert(`Record saved!\nTotal Sale: Rs. ${totals.totalSale.toFixed(2)}`);

    resetForm();
  } catch (error) {
    console.error('Error saving record:', error);
    alert('Failed to save: ' + error.message);
  }
};

  // --------------------------------------------------------------
  // RESTORE CSV BACKUP
  // --------------------------------------------------------------
  const restoreFromCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split('\n').map((r) => r.trim()).filter(Boolean);
      const headers = rows.shift().split(',');

      const restoredRecords = rows.map((row) => {
        const values = row.split(',');
        return headers.reduce((obj, header, i) => {
          obj[header.trim()] = values[i] ? values[i].trim() : '';
          return obj;
        }, {});
      });

      setRecords(restoredRecords);
      alert('✅ Backup restored successfully!');
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('❌ Failed to restore backup file.');
    }
  };

  // --------------------------------------------------------------
  // UI
  // --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* ---------- Header ---------- */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Naeem Medicare
          </h1>

          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <button
              onClick={() => setCurrentPage('inventory')}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
            >
              <Package size={18} /> Inventory
            </button>
            <button
              onClick={() => setCurrentPage('patientRecords')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Calculator size={18} /> Patient Records
            </button>
            <button
              onClick={() => setCurrentPage('dailyRecords')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Calculator size={18} /> Daily Records
            </button>
          </div>
        </div>

        {/* ---------- New Record Form ---------- */}
        <div className="border-2 border-indigo-200 rounded-lg p-6 bg-indigo-50 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-indigo-800">New Patient Record</h2>
            <button
              onClick={resetForm}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <X size={18} /> Clear
            </button>
          </div>

          {/* ---- Patient Info ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Patient Name *"
              value={currentRecord.patientName}
              onChange={(e) => setCurrentRecord({ ...currentRecord, patientName: e.target.value })}
              className="px-3 py-2 border rounded-md"
            />
            <input
              type="date"
              value={currentRecord.date}
              onChange={(e) => setCurrentRecord({ ...currentRecord, date: e.target.value })}
              className="px-3 py-2 border rounded-md"
            />
            <textarea
              placeholder="Diagnosis *"
              value={currentRecord.diagnosis}
              onChange={(e) => setCurrentRecord({ ...currentRecord, diagnosis: e.target.value })}
              className="px-3 py-2 border rounded-md sm:col-span-2"
              rows={2}
            />
            <input
              type="text"
              placeholder="Blood Pressure"
              value={currentRecord.bloodPressure}
              onChange={(e) => setCurrentRecord({ ...currentRecord, bloodPressure: e.target.value })}
              className="px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              placeholder="Glucose"
              value={currentRecord.glucose}
              onChange={(e) => setCurrentRecord({ ...currentRecord, glucose: e.target.value })}
              className="px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              placeholder="Temperature"
              value={currentRecord.temperature}
              onChange={(e) => setCurrentRecord({ ...currentRecord, temperature: e.target.value })}
              className="px-3 py-2 border rounded-md"
            />
            <input
              type="number"
              placeholder="Doctor Fees (Rs.)"
              value={currentRecord.doctorFees}
              onChange={(e) => setCurrentRecord({ ...currentRecord, doctorFees: e.target.value })}
              className="px-3 py-2 border rounded-md"
            />
          </div>

          {/* ---- Add Medicines ---- */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Medicine</h3>
            <AddMedicineForm
              inventory={inventory}
              setInventory={setInventory}
              currentRecord={currentRecord}
              setCurrentRecord={setCurrentRecord}
            />
          </div>

          {/* ---- Save Button ---- */}
          <button
            onClick={saveRecord}
            disabled={!currentRecord.patientName.trim() || !currentRecord.diagnosis.trim()}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Calculator size={18} /> Save Record
          </button>
        </div>

        {/* ---------- Overall Summary ---------- */}
        {records.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-800 mb-4 sm:mb-0">
                Overall Summary
              </h2>
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
