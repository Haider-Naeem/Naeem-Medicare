// src/components/Home.jsx
import React, { useState } from 'react';
import { Plus, X, Calculator, Package, Download, TrendingUp, DollarSign } from 'lucide-react';
import AddMedicineForm from './AddMedicineForm';
import { exportToCSV as exportRecordsToCSV, calculateRecordTotals } from '../utils/calculations';
import { addDoc, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const getCurrentDate = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

// Modern StatsCard Component (matching DailyRecords style)
function StatsCard({ title, value, isCurrency = false, icon: Icon, color = 'purple' }) {
  const colorClasses = {
    purple: 'from-purple-600 to-indigo-600',
    blue: 'from-blue-600 to-cyan-600',
    green: 'from-green-600 to-emerald-600',
    orange: 'from-orange-600 to-red-600',
    emerald: 'from-emerald-600 to-teal-600'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} rounded-xl shadow-lg p-4 text-white transition-all relative overflow-hidden`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white rounded-full"></div>
        <div className="absolute -left-2 -bottom-2 w-16 h-16 bg-white rounded-full"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          {Icon && <Icon size={20} className="text-white/50" />}
        </div>
        
        <p className="text-3xl font-bold mt-1">
          {isCurrency && '₨'}
          {isCurrency 
            ? typeof value === 'number' ? value.toFixed(0) : value 
            : value
          }
        </p>
      </div>
    </div>
  );
}

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
    totalCashCollected: '0',
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
      totalCashCollected: '0',
      bloodPressure: '',
      glucose: '',
      temperature: '',
    });
  };

  // Calculate medicine total from current record
  const medicineTotalAmount = currentRecord.medicines.reduce((sum, m) => sum + m.medicineTotal, 0);

  // Auto-calculate doctor fees based on cash collected
  const calculatedDoctorFees = () => {
    const cashCollected = parseFloat(currentRecord.totalCashCollected || 0);
    const fees = cashCollected - medicineTotalAmount;
    return fees >= 0 ? fees : 0;
  };

  // Update doctor fees whenever cash collected or medicine total changes
  React.useEffect(() => {
    const fees = calculatedDoctorFees();
    setCurrentRecord(prev => ({
      ...prev,
      doctorFees: fees.toFixed(2)
    }));
  }, [currentRecord.totalCashCollected, medicineTotalAmount]);

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
      const cashCollected = parseFloat(currentRecord.totalCashCollected || 0);
      
      if (isNaN(doctorFees)) return alert('Enter a valid doctor fee.');
      if (isNaN(cashCollected)) return alert('Enter valid cash collected amount.');

      if (currentRecord.medicines.length === 0 && doctorFees === 0)
        return alert('Add at least one medicine or non-zero doctor fees.');

      // Validate cash collected vs medicine total
      if (cashCollected < medicineTotalAmount) {
        return alert(`Cash collected (Rs. ${cashCollected.toFixed(2)}) is less than medicine total (Rs. ${medicineTotalAmount.toFixed(2)})`);
      }

      // ---- STEP 1: Validate stock availability (check ORIGINAL inventory) ----
      for (const med of currentRecord.medicines) {
        const invMed = inventory.find(m => m.id === med.medicineId);
        if (!invMed) {
          return alert(`Medicine not found in inventory.`);
        }
        
        // Calculate total quantity already used in this record
        const totalUsed = currentRecord.medicines
          .filter(m => m.medicineId === med.medicineId)
          .reduce((sum, m) => sum + m.quantity, 0);
        
        if (invMed.totalUnits < totalUsed) {
          return alert(`Not enough stock for ${invMed.name}. Available: ${invMed.totalUnits}, Required: ${totalUsed}`);
        }
      }

      // Build record object
      const newRecord = {
        ...currentRecord,
        doctorFees: doctorFees.toFixed(2),
        totalCashCollected: cashCollected.toFixed(2),
        createdAt: new Date().toISOString(),
        bloodPressure: currentRecord.bloodPressure || 'Not recorded',
        glucose: currentRecord.glucose || 'Not recorded',
        temperature: currentRecord.temperature || 'Not recorded',
      };

      // ---- STEP 2: Calculate inventory updates ----
      const updatedInventory = [...inventory];
      const medicineUpdates = new Map(); // Track qty changes per medicine

      // Sum up quantities for each unique medicine
      for (const med of newRecord.medicines) {
        const current = medicineUpdates.get(med.medicineId) || 0;
        medicineUpdates.set(med.medicineId, current + med.quantity);
      }

      // Apply deductions
      for (const [medicineId, totalQty] of medicineUpdates) {
        const idx = updatedInventory.findIndex(m => m.id === medicineId);
        if (idx !== -1) {
          updatedInventory[idx] = {
            ...updatedInventory[idx],
            totalUnits: updatedInventory[idx].totalUnits - totalQty
          };
        }
      }

      // ---- STEP 3: Save record to Firestore ----
      const docRef = await addDoc(collection(db, 'patientRecords'), newRecord);
      const recordWithId = { ...newRecord, id: docRef.id };
      await setDoc(doc(db, 'patientRecords', docRef.id), { id: docRef.id }, { merge: true });

      // ---- STEP 4: PERSIST INVENTORY CHANGES TO FIRESTORE (only changed medicines) ----
      const batchWrites = Array.from(medicineUpdates.keys()).map(async (medicineId) => {
        const medRef = doc(db, 'medicines', medicineId);
        const snap = await getDoc(medRef);
        if (!snap.exists()) return;

        const fresh = snap.data();
        const unitsPerPack = fresh.unitsPerPack || 1;
        const updatedMed = updatedInventory.find(m => m.id === medicineId);
        if (!updatedMed) return;

        return setDoc(medRef, {
          totalUnits: updatedMed.totalUnits,
          totalPacks: Math.floor(updatedMed.totalUnits / unitsPerPack),
          stockStatus: updatedMed.totalUnits > 0 ? 'In Stock' : 'Out of Stock',
        }, { merge: true });
      });
      await Promise.all(batchWrites);

      // ---- STEP 5: Update UI state ----
      setRecords((prev) => [...prev, recordWithId]);
      setInventory(updatedInventory);

      const totals = calculateRecordTotals(recordWithId);
      alert(`Record saved!\nMedicine Total: Rs. ${medicineTotalAmount.toFixed(2)}\nDoctor Fees: Rs. ${doctorFees.toFixed(2)}\nTotal Cash Collected: Rs. ${cashCollected.toFixed(2)}`);

      resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save: ' + error.message);
    }
  };

  // Calculate overall stats with proper profit calculations
  const enhancedOverallTotals = React.useMemo(() => {
    let medicineCost = 0;
    let medicineSale = 0;
    let doctorFees = 0;

    records.forEach(record => {
      const recordTotals = calculateRecordTotals(record);
      medicineCost += recordTotals.medicineCost;
      medicineSale += recordTotals.medicineSale;
      doctorFees += parseFloat(record.doctorFees || 0);
    });

    const medicineProfit = medicineSale - medicineCost;
    const totalProfit = medicineProfit + doctorFees;

    return {
      medicineCost,
      medicineProfit,
      doctorFees,
      totalProfit
    };
  }, [records]);

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter patient name"
                value={currentRecord.patientName}
                onChange={(e) => setCurrentRecord({ ...currentRecord, patientName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={currentRecord.date}
                onChange={(e) => setCurrentRecord({ ...currentRecord, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Enter diagnosis details"
                value={currentRecord.diagnosis}
                onChange={(e) => setCurrentRecord({ ...currentRecord, diagnosis: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Pressure
              </label>
              <input
                type="text"
                placeholder="e.g., 120/80"
                value={currentRecord.bloodPressure}
                onChange={(e) => setCurrentRecord({ ...currentRecord, bloodPressure: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Glucose
              </label>
              <input
                type="text"
                placeholder="e.g., 100 mg/dL"
                value={currentRecord.glucose}
                onChange={(e) => setCurrentRecord({ ...currentRecord, glucose: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <input
                type="text"
                placeholder="e.g., 98.6°F"
                value={currentRecord.temperature}
                onChange={(e) => setCurrentRecord({ ...currentRecord, temperature: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cash Collected (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter total cash collected"
                value={currentRecord.totalCashCollected}
                onChange={(e) => setCurrentRecord({ ...currentRecord, totalCashCollected: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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

          {/* ---- Financial Summary Box ---- */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-indigo-800 mb-3">Financial Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Medicine Total</p>
                <p className="text-lg font-bold text-green-600">₨{medicineTotalAmount.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Cash Collected</p>
                <p className="text-lg font-bold text-blue-600">₨{parseFloat(currentRecord.totalCashCollected || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Doctor Fees (Auto)</p>
                <p className="text-lg font-bold text-purple-600">₨{calculatedDoctorFees().toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-indigo-300 bg-indigo-50">
                <p className="text-xs text-indigo-700 font-medium mb-1">Balance</p>
                <p className="text-lg font-bold text-indigo-700">
                  ₨{(parseFloat(currentRecord.totalCashCollected || 0) - medicineTotalAmount).toFixed(2)}
                </p>
              </div>
            </div>
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
          <div className="bg-white border-2 border-indigo-200 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-indigo-800 mb-4 sm:mb-0">
                Overall Summary
              </h2>
              <button
                onClick={() => exportRecordsToCSV(records)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Download size={18} /> Export to CSV
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard 
                title="Medicine Cost"
                value={enhancedOverallTotals.medicineCost}
                isCurrency
                icon={Package}
                color="orange"
              />
              <StatsCard 
                title="Medicine Profit"
                value={enhancedOverallTotals.medicineProfit}
                isCurrency
                icon={TrendingUp}
                color="emerald"
              />
              <StatsCard 
                title="Doctor Fees"
                value={enhancedOverallTotals.doctorFees}
                isCurrency
                icon={Calculator}
                color="blue"
              />
              <StatsCard 
                title="Total Profit"
                value={enhancedOverallTotals.totalProfit}
                isCurrency
                icon={DollarSign}
                color="purple"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}