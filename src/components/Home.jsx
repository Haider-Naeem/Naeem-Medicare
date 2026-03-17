// src/components/Home.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, X, Calculator, Package, Download, TrendingUp,
  DollarSign, Wallet, FileText, Activity, Menu, ChevronDown
} from 'lucide-react';
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

// ── Nav items config ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'inventory',      label: 'Inventory',       icon: Package,    color: 'bg-purple-600 hover:bg-purple-700' },
  { key: 'patientRecords', label: 'Patient Records',  icon: Calculator, color: 'bg-blue-600 hover:bg-blue-700' },
  { key: 'dailyRecords',   label: 'Daily Records',    icon: Calculator, color: 'bg-green-600 hover:bg-green-700' },
  { key: 'expense',        label: 'Expense',          icon: Wallet,     color: 'bg-orange-600 hover:bg-orange-700' },
  { key: 'insurance',      label: 'Insurance',        icon: FileText,   color: 'bg-teal-600 hover:bg-teal-700' },
  { key: 'tbPatients',     label: 'TB Patients',      icon: Activity,   color: 'bg-rose-600 hover:bg-rose-700' },
];

// ── Navigation Component ──────────────────────────────────────────────────────
function Navigation({ setCurrentPage }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNav = (key) => {
    setCurrentPage(key);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow transition-all"
      >
        <Menu size={18} />
        <span className="hidden sm:inline"></span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="p-1.5">
            {NAV_ITEMS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => handleNav(key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
              >
                <span className={`${color.split(' ')[0]} p-1.5 rounded-lg`}>
                  <Icon size={14} className="text-white" />
                </span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── StatsCard ─────────────────────────────────────────────────────────────────
function StatsCard({ title, value, isCurrency = false, icon: Icon, color = 'purple' }) {
  const colorClasses = {
    purple:  'from-purple-600 to-indigo-600',
    blue:    'from-blue-600 to-cyan-600',
    green:   'from-green-600 to-emerald-600',
    orange:  'from-orange-600 to-red-600',
    emerald: 'from-emerald-600 to-teal-600',
  };

  return (
    <div
      className={`bg-gradient-to-r ${colorClasses[color]} rounded-xl shadow-lg p-4 text-white transition-all relative overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white rounded-full" />
        <div className="absolute -left-2 -bottom-2 w-16 h-16 bg-white rounded-full" />
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          {Icon && <Icon size={20} className="text-white/50" />}
        </div>
        <p className="text-3xl font-bold mt-1">
          {isCurrency && '₨'}
          {isCurrency
            ? typeof value === 'number' ? value.toFixed(0) : value
            : value}
        </p>
      </div>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
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

  // Patient Name Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const patientSuggestions = useMemo(() => {
    const nameMap = new Map();
    records.forEach((record) => {
      const name = record.patientName?.trim();
      if (!name) return;
      if (!nameMap.has(name)) {
        nameMap.set(name, { count: 1, lastVisit: record.date });
      } else {
        const existing = nameMap.get(name);
        nameMap.set(name, {
          count: existing.count + 1,
          lastVisit:
            new Date(record.date) > new Date(existing.lastVisit)
              ? record.date
              : existing.lastVisit,
        });
      }
    });
    return Array.from(nameMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [records]);

  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  const handlePatientNameChange = (e) => {
    const value = e.target.value;
    setCurrentRecord((prev) => ({ ...prev, patientName: value }));
    if (value.trim() === '') {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = patientSuggestions.filter((item) =>
      item.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredSuggestions(filtered);
    setShowSuggestions(true);
  };

  const selectPatient = (name) => {
    setCurrentRecord((prev) => ({ ...prev, patientName: name }));
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  const medicineTotalAmount = currentRecord.medicines.reduce(
    (sum, m) => sum + (m.medicineTotal || 0),
    0
  );

  const calculatedDoctorFees = () => {
    const cash = parseFloat(currentRecord.totalCashCollected || 0);
    const fees = cash - medicineTotalAmount;
    return fees >= 0 ? fees : 0;
  };

  useEffect(() => {
    const fees = calculatedDoctorFees();
    setCurrentRecord((prev) => ({ ...prev, doctorFees: fees.toFixed(2) }));
  }, [currentRecord.totalCashCollected, medicineTotalAmount]);

  const saveRecord = async () => {
    try {
      if (!currentRecord.patientName.trim()) return alert('Patient name is required.');
      if (!currentRecord.diagnosis.trim()) return alert('Diagnosis is required.');
      if (!currentRecord.date) return alert('Select a valid date.');

      const doctorFees = parseFloat(currentRecord.doctorFees || 0);
      const cashCollected = parseFloat(currentRecord.totalCashCollected || 0);

      if (isNaN(doctorFees)) return alert('Enter a valid doctor fee.');
      if (isNaN(cashCollected)) return alert('Enter valid cash collected amount.');
      if (currentRecord.medicines.length === 0 && doctorFees === 0)
        return alert('Add at least one medicine or non-zero doctor fees.');
      if (cashCollected < medicineTotalAmount) {
        return alert(
          `Cash collected (Rs. ${cashCollected.toFixed(2)}) is less than medicine total (Rs. ${medicineTotalAmount.toFixed(2)})`
        );
      }

      for (const med of currentRecord.medicines) {
        const invMed = inventory.find((m) => m.id === med.medicineId);
        if (!invMed) return alert(`Medicine not found in inventory.`);
        const totalUsed = currentRecord.medicines
          .filter((m) => m.medicineId === med.medicineId)
          .reduce((sum, m) => sum + m.quantity, 0);
        if (invMed.totalUnits < totalUsed) {
          return alert(
            `Not enough stock for ${invMed.name}. Available: ${invMed.totalUnits}, Required: ${totalUsed}`
          );
        }
      }

      const newRecord = {
        ...currentRecord,
        doctorFees: doctorFees.toFixed(2),
        totalCashCollected: cashCollected.toFixed(2),
        createdAt: new Date().toISOString(),
        bloodPressure: currentRecord.bloodPressure || 'Not recorded',
        glucose: currentRecord.glucose || 'Not recorded',
        temperature: currentRecord.temperature || 'Not recorded',
      };

      const updatedInventory = [...inventory];
      const medicineUpdates = new Map();
      for (const med of newRecord.medicines) {
        const current = medicineUpdates.get(med.medicineId) || 0;
        medicineUpdates.set(med.medicineId, current + med.quantity);
      }
      for (const [medicineId, totalQty] of medicineUpdates) {
        const idx = updatedInventory.findIndex((m) => m.id === medicineId);
        if (idx !== -1) {
          updatedInventory[idx] = {
            ...updatedInventory[idx],
            totalUnits: updatedInventory[idx].totalUnits - totalQty,
          };
        }
      }

      const docRef = await addDoc(collection(db, 'patientRecords'), newRecord);
      const recordWithId = { ...newRecord, id: docRef.id };
      await setDoc(doc(db, 'patientRecords', docRef.id), { id: docRef.id }, { merge: true });

      const batchWrites = Array.from(medicineUpdates.keys()).map(async (medicineId) => {
        const medRef = doc(db, 'medicines', medicineId);
        const snap = await getDoc(medRef);
        if (!snap.exists()) return;
        const fresh = snap.data();
        const unitsPerPack = fresh.unitsPerPack || 1;
        const updatedMed = updatedInventory.find((m) => m.id === medicineId);
        if (!updatedMed) return;
        return setDoc(medRef, {
          totalUnits: updatedMed.totalUnits,
          totalPacks: Math.floor(updatedMed.totalUnits / unitsPerPack),
          stockStatus: updatedMed.totalUnits > 0 ? 'In Stock' : 'Out of Stock',
        }, { merge: true });
      });
      await Promise.all(batchWrites);

      setRecords((prev) => [...prev, recordWithId]);
      setInventory(updatedInventory);

      alert(
        `Record saved!\nMedicine Total: Rs. ${medicineTotalAmount.toFixed(2)}\nDoctor Fees: Rs. ${doctorFees.toFixed(2)}\nTotal Cash Collected: Rs. ${cashCollected.toFixed(2)}`
      );
      resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save: ' + error.message);
    }
  };

  const enhancedOverallTotals = useMemo(() => {
    let medicineCost = 0;
    let medicineSale = 0;
    let doctorFees = 0;
    records.forEach((record) => {
      const totals = calculateRecordTotals(record);
      medicineCost += totals.medicineCost || 0;
      medicineSale += totals.medicineSale || 0;
      doctorFees += parseFloat(record.doctorFees || 0);
    });
    const medicineProfit = medicineSale - medicineCost;
    const totalProfit = medicineProfit + doctorFees;
    return { medicineCost, medicineProfit, doctorFees, totalProfit };
  }, [records]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Naeem Medicare
          </h1>
          {/* ── Dropdown navigation ── */}
          <Navigation setCurrentPage={setCurrentPage} />
        </div>

        {/* New Patient Record Form */}
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

          {/* Patient Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Patient Name with Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type or select patient name..."
                value={currentRecord.patientName}
                onChange={handlePatientNameChange}
                onFocus={() => {
                  if (patientSuggestions.length > 0) setShowSuggestions(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              {showSuggestions && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((item, index) => (
                      <li
                        key={index}
                        className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center text-gray-800"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectPatient(item.name);
                        }}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-gray-500">
                          {item.count > 1 ? `${item.count}x • ` : ''}
                          {item.lastVisit}
                        </span>
                      </li>
                    ))
                  ) : currentRecord.patientName.trim().length > 1 ? (
                    <li className="px-4 py-3 text-sm text-gray-500 italic">
                      New patient – will be saved automatically
                    </li>
                  ) : null}
                </ul>
              )}
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

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Enter diagnosis details"
                value={currentRecord.diagnosis}
                onChange={(e) => setCurrentRecord({ ...currentRecord, diagnosis: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
              <input
                type="text"
                placeholder="e.g., 120/80"
                value={currentRecord.bloodPressure}
                onChange={(e) => setCurrentRecord({ ...currentRecord, bloodPressure: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Glucose</label>
              <input
                type="text"
                placeholder="e.g., 100 mg/dL"
                value={currentRecord.glucose}
                onChange={(e) => setCurrentRecord({ ...currentRecord, glucose: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="text"
                placeholder="e.g., 98.6°F"
                value={currentRecord.temperature}
                onChange={(e) => setCurrentRecord({ ...currentRecord, temperature: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cash Collected (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter total cash collected"
                value={currentRecord.totalCashCollected}
                onChange={(e) => setCurrentRecord({ ...currentRecord, totalCashCollected: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Add Medicine Section */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Medicine</h3>
            <AddMedicineForm
              inventory={inventory}
              setInventory={setInventory}
              currentRecord={currentRecord}
              setCurrentRecord={setCurrentRecord}
            />
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-indigo-800 mb-3">Financial Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Medicine Total</p>
                <p className="text-lg font-bold text-green-600">₨{medicineTotalAmount.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Cash Collected</p>
                <p className="text-lg font-bold text-blue-600">
                  ₨{parseFloat(currentRecord.totalCashCollected || 0).toFixed(2)}
                </p>
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

          {/* Save Button */}
          <button
            onClick={saveRecord}
            disabled={!currentRecord.patientName.trim() || !currentRecord.diagnosis.trim()}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Calculator size={18} /> Save Record
          </button>
        </div>

        {/* Overall Summary */}
        {records.length > 0 && (
          <div className="bg-white border-2 border-indigo-200 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-indigo-800 mb-4 sm:mb-0">
                Overall Summary (Medical Only)
              </h2>
              <button
                onClick={() => exportRecordsToCSV(records)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Download size={18} /> Export to CSV
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Medicine Cost"    value={enhancedOverallTotals.medicineCost}    isCurrency icon={Package}    color="orange" />
              <StatsCard title="Medicine Profit"  value={enhancedOverallTotals.medicineProfit}  isCurrency icon={TrendingUp} color="emerald" />
              <StatsCard title="Doctor Fees"      value={enhancedOverallTotals.doctorFees}      isCurrency icon={Calculator} color="blue" />
              <StatsCard title="Total Profit"     value={enhancedOverallTotals.totalProfit}     isCurrency icon={DollarSign} color="purple" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}