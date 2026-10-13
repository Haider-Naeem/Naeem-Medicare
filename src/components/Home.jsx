// src/components/Home.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, X, Calculator, Package, Download, TrendingUp,
  DollarSign, Wallet, FileText, Activity, Menu, ChevronDown,
  BarChart3, Receipt, User, Stethoscope, Heart, Droplets,
  Thermometer, Trash2, Search, Calendar, CheckCircle2, ShieldCheck
} from 'lucide-react';
import AddMedicineForm from './AddMedicineForm';
import { exportToCSV as exportRecordsToCSV, calculateRecordTotals } from '../utils/calculations';
import { addDoc, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import ReceiptModal, { cleanMedicineNameOnly } from './ReceiptModal';

const getCurrentDate = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

// ── Nav items config ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'inventory', label: 'Inventory', icon: Package, color: 'bg-purple-600 hover:bg-purple-700' },
  { key: 'patientRecords', label: 'Patient Records', icon: Calculator, color: 'bg-blue-600 hover:bg-blue-700' },
  { key: 'dailyRecords', label: 'Daily Records', icon: Calculator, color: 'bg-green-600 hover:bg-green-700' },
  { key: 'expense', label: 'Expense', icon: Wallet, color: 'bg-orange-600 hover:bg-orange-700' },
  { key: 'financials', label: 'Financials', icon: BarChart3, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { key: 'billing', label: 'Billing', icon: Receipt, color: 'bg-cyan-600 hover:bg-cyan-700' },
  { key: 'insurance', label: 'Insurance', icon: FileText, color: 'bg-teal-600 hover:bg-teal-700' },
  { key: 'tbPatients', label: 'TB Patients', icon: Activity, color: 'bg-rose-600 hover:bg-rose-700' },
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
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-semibold shadow transition-all active:scale-95"
        title="Navigation Menu"
      >
        <Menu size={18} />
        <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Menu</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
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
    purple: 'from-purple-600 to-indigo-600',
    blue: 'from-blue-600 to-cyan-600',
    green: 'from-green-600 to-emerald-600',
    orange: 'from-orange-600 to-red-600',
    emerald: 'from-emerald-600 to-teal-600',
  };

  return (
    <div
      className={`bg-gradient-to-r ${colorClasses[color] || colorClasses.purple} rounded-xl shadow-md p-3.5 sm:p-4 text-white transition-all relative overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white rounded-full" />
        <div className="absolute -left-2 -bottom-2 w-16 h-16 bg-white rounded-full" />
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-1.5">
          <p className="text-white/80 text-xs sm:text-sm font-medium">{title}</p>
          {Icon && <Icon size={18} className="text-white/60" />}
        </div>
        <p className="text-xl sm:text-2xl font-bold mt-0.5">
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
    age: '',
    gender: 'Male',
    diagnosis: '',
    date: getCurrentDate(),
    medicines: [],
    doctorFees: '0',
    totalCashCollected: '0',
    bloodPressure: '',
    glucose: '',
    temperature: '',
    pulse: '',
  });

  // Patient Name Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Left Column Scroll Container Ref (for desktop synchronized scroll)
  const leftColRef = useRef(null);

  // Receipt Modal State (for Save & Print Bill)
  const [receiptModalData, setReceiptModalData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const patientSuggestions = useMemo(() => {
    const nameMap = new Map();
    records.forEach((record) => {
      const name = record.patientName?.trim();
      if (!name) return;
      if (!nameMap.has(name)) {
        nameMap.set(name, {
          count: 1,
          lastVisit: record.date,
        });
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

  const selectPatient = (item) => {
    setCurrentRecord((prev) => ({
      ...prev,
      patientName: item.name,
    }));
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

  // Global wheel listener on desktop: scrolling anywhere on the screen scrolls the left clinical column
  useEffect(() => {
    const handleGlobalWheel = (e) => {
      if (window.innerWidth >= 1024 && leftColRef.current) {
        // If cursor is already inside the left column, let native browser scroll handle it
        if (!leftColRef.current.contains(e.target)) {
          leftColRef.current.scrollTop += e.deltaY;
        }
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, []);

  const resetForm = () => {
    setCurrentRecord({
      patientName: '',
      age: '',
      gender: 'Male',
      diagnosis: '',
      date: getCurrentDate(),
      medicines: [],
      doctorFees: '0',
      totalCashCollected: '0',
      bloodPressure: '',
      glucose: '',
      temperature: '',
      pulse: '',
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

  // Save Record (Strict backend logic preserved)
  const saveRecord = async (andPrint = false) => {
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

      // Check Inventory Stock
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
        age: currentRecord.age || '',
        gender: currentRecord.gender || 'Male',
        doctorFees: doctorFees.toFixed(2),
        totalCashCollected: cashCollected.toFixed(2),
        createdAt: new Date().toISOString(),
        bloodPressure: currentRecord.bloodPressure || 'Not recorded',
        glucose: currentRecord.glucose || 'Not recorded',
        temperature: currentRecord.temperature || 'Not recorded',
        pulse: currentRecord.pulse || 'Not recorded',
      };

      // Deduct inventory locally
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

      // Firestore writes
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

      if (andPrint) {
        const printItems = (newRecord.medicines || []).map((m) => {
          const qty = parseInt(m.quantity, 10) || 1;
          const discPct = parseFloat(m.discount) || 0;
          const rate = parseFloat(m.retailRate || m.pricePerUnit || m.finalPrice) || 0;
          const amt = parseFloat(m.medicineTotal !== undefined ? m.medicineTotal : (rate * qty) * (1 - discPct / 100)) || 0;
          return {
            name: cleanMedicineNameOnly(m.medicine || m.fullName || m.name),
            quantity: qty,
            pricePerUnit: rate,
            discountPercent: discPct,
            total: Math.max(0, amt),
          };
        });

        setReceiptModalData({
          patientName: newRecord.patientName,
          date: newRecord.date,
          items: printItems,
          doctorFee: doctorFees,
          billDiscount: 0,
        });
        setShowReceiptModal(true);
      } else {
        alert(
          `Record saved successfully!\nMedicine Total: Rs. ${medicineTotalAmount.toFixed(2)}\nDoctor Fees: Rs. ${doctorFees.toFixed(2)}\nTotal Cash Collected: Rs. ${cashCollected.toFixed(2)}`
        );
      }
      resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save: ' + error.message);
    }
  };

  const totalMedicineDiscounts = useMemo(() => {
    return currentRecord.medicines.reduce((sum, m) => {
      const qty = parseInt(m.quantity, 10) || 1;
      const rate = parseFloat(m.retailRate || m.pricePerUnit || 0);
      const discPct = parseFloat(m.discount) || 0;
      const discAmt = (rate * qty) * (discPct / 100);
      return sum + (discAmt > 0 ? discAmt : 0);
    }, 0);
  }, [currentRecord.medicines]);

  // Net total grand payable amount
  const grandPayableAmount = useMemo(() => {
    const cash = parseFloat(currentRecord.totalCashCollected || 0);
    if (cash > 0) return cash;
    return medicineTotalAmount + parseFloat(currentRecord.doctorFees || 0);
  }, [currentRecord.totalCashCollected, medicineTotalAmount, currentRecord.doctorFees]);

  // Enhanced overall totals across all patient records (Medical Only)
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

  // Overall summary card with 4 stat cards (rendered in left column on desktop, below OPD billing on mobile)
  const renderOverallSummary = () => {
    if (records.length === 0) return null;
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200/90 border-l-4 border-l-indigo-600 shadow-sm relative">
        <div className="bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 text-white rounded-t-xl px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 text-indigo-300 rounded-lg">
              <BarChart3 size={16} />
            </div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              Overall Summary (Medical Only)
            </h2>
          </div>
          <button
            onClick={() => exportRecordsToCSV(records)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Download size={14} />
            <span>Export to CSV</span>
          </button>
        </div>

        <div className="p-3.5 sm:p-5 rounded-b-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsCard title="Medicine Cost" value={enhancedOverallTotals.medicineCost} isCurrency icon={Package} color="orange" />
            <StatsCard title="Medicine Profit" value={enhancedOverallTotals.medicineProfit} isCurrency icon={TrendingUp} color="emerald" />
            <StatsCard title="Doctor Fees" value={enhancedOverallTotals.doctorFees} isCurrency icon={Calculator} color="blue" />
            <StatsCard title="Total Profit" value={enhancedOverallTotals.totalProfit} isCurrency icon={DollarSign} color="purple" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50/70 text-slate-800 flex flex-col">
      {/* ── Single Unified Max-Width Wrapper: Perfectly aligns header, left section, and right section ── */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 md:px-6 flex flex-col flex-1 lg:overflow-hidden">
        {/* ── Fixed Top Header (Does not scroll, perfectly aligned with left & right sections) ── */}
        <header className="shrink-0 pt-2.5 pb-2.5 sm:pt-3 sm:pb-3">
          <div className="w-full bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 text-white rounded-2xl border-2 border-slate-700/70 border-l-4 border-l-indigo-500 shadow-md px-3.5 py-2.5 sm:px-6 sm:py-3 flex justify-between items-center gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-md shrink-0">
                <Activity size={20} className="stroke-[2.5] text-indigo-300" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-tight bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
                  Naeem Medicare
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={resetForm}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                title="Clear and reset form"
              >
                <X size={15} />
                <span>Clear</span>
              </button>
              <Navigation setCurrentPage={setCurrentPage} />
            </div>
          </div>
        </header>

        {/* ── Main Layout: Fixed on Desktop, Scrolls on Mobile ── */}
        <main className="w-full flex-1 lg:overflow-hidden pt-1 pb-16 sm:pb-20 lg:pb-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-5 h-auto lg:h-full items-start">
            {/* ════ LEFT COLUMN (8 cols): Clinical Workflow (Independent Smooth Scroll on Desktop) ════ */}
            <div
              ref={leftColRef}
              className="lg:col-span-8 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1 pb-0 lg:pb-28 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {/* 1. PATIENT REGISTRATION (Age and Gender removed per user request) */}
              <div className="bg-white rounded-2xl border-2 border-slate-200/90 border-l-4 border-l-indigo-600 shadow-sm relative">
                {/* Section Header with lighter refined gradient */}
                <div className="bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 text-white rounded-t-xl px-4 py-3 sm:px-5 sm:py-3.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/10 text-indigo-300 rounded-lg">
                      <User size={16} />
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                      Patient Registration
                    </h2>
                  </div>
                </div>

                <div className="p-3.5 sm:p-5 rounded-b-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    {/* Patient Name with autocomplete (8 cols desktop, full width mobile) */}
                    <div className="sm:col-span-8 relative" ref={inputRef}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Patient Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User size={15} />
                        </div>
                        <input
                          type="text"
                          placeholder="Type or select patient name..."
                          value={currentRecord.patientName}
                          onChange={handlePatientNameChange}
                          onFocus={() => {
                            if (patientSuggestions.length > 0) setShowSuggestions(true);
                          }}
                          className="w-full pl-9 pr-3.5 py-2.5 border-2 border-slate-300 border-l-4 border-l-indigo-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 outline-none text-sm font-medium bg-slate-50/50 focus:bg-white transition"
                        />
                      </div>
                      {/* Unclipped High Z-Index Suggestions Dropdown */}
                      {showSuggestions && (
                        <ul className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-300 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-gray-100">
                          {filteredSuggestions.length > 0 ? (
                            filteredSuggestions.map((item, index) => (
                              <li
                                key={index}
                                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center text-gray-800"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  selectPatient(item);
                                }}
                              >
                                <span className="font-semibold text-sm">{item.name}</span>
                                <span className="text-xs text-gray-500">
                                  {item.count > 1 ? `${item.count}x • ` : ''}
                                  {item.lastVisit}
                                </span>
                              </li>
                            ))
                          ) : currentRecord.patientName.trim().length > 1 ? (
                            <li className="px-4 py-3 text-xs text-gray-500 italic">
                              New patient – will be registered automatically
                            </li>
                          ) : null}
                        </ul>
                      )}
                    </div>

                    {/* Record Date - Auto default to today (4 cols desktop, full width mobile) */}
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Record Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={currentRecord.date || getCurrentDate()}
                        onChange={(e) => setCurrentRecord({ ...currentRecord, date: e.target.value })}
                        className="w-full px-3 py-2.5 border-2 border-slate-300 border-l-4 border-l-indigo-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 outline-none text-sm font-medium bg-slate-50/50 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. DIAGNOSIS & CLINICAL NOTES */}
              <div className="bg-white rounded-2xl border-2 border-slate-200/90 border-l-4 border-l-indigo-600 shadow-sm relative">
                {/* Section Header with lighter refined gradient */}
                <div className="bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 text-white rounded-t-xl px-4 py-3 sm:px-5 sm:py-3.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/10 text-indigo-300 rounded-lg">
                      <Stethoscope size={16} />
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                      Diagnosis & Clinical Notes <span className="text-red-400">*</span>
                    </h2>
                  </div>
                </div>

                <div className="p-3.5 sm:p-5 rounded-b-xl">
                  {/* Quick tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick tags:</span>
                    {[
                      'Viral Fever',
                      'Hypertension',
                      'Type 2 DM',
                      'URI / Cough',
                      'Gastritis',
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setCurrentRecord((prev) => ({
                            ...prev,
                            diagnosis: prev.diagnosis.trim()
                              ? `${prev.diagnosis.trim()}, ${tag}`
                              : tag,
                          }));
                        }}
                        className="text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200/80 transition active:scale-95"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Enter clinical assessment, symptoms and diagnosis."
                    value={currentRecord.diagnosis}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, diagnosis: e.target.value })}
                    className="w-full px-3.5 py-2.5 border-2 border-slate-300 border-l-4 border-l-indigo-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 outline-none text-sm font-medium bg-slate-50/50 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* 3. VITAL SIGNS MEASUREMENT */}
              <div className="bg-white rounded-2xl border-2 border-slate-200/90 border-l-4 border-l-indigo-600 shadow-sm relative">
                {/* Section Header with lighter refined gradient */}
                <div className="bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 text-white rounded-t-xl px-4 py-3 sm:px-5 sm:py-3.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/10 text-rose-300 rounded-lg">
                      <Heart size={16} />
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                      Vital Signs Measurement
                    </h2>
                  </div>
                </div>

                <div className="p-3.5 sm:p-5 rounded-b-xl">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {/* Blood Pressure */}
                    <div className="bg-slate-50/70 border-2 border-slate-300 border-l-4 border-l-rose-500 rounded-xl p-3 focus-within:border-rose-600 focus-within:bg-white transition">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Blood Pressure</label>
                        <Heart size={13} className="text-rose-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="120/80"
                        value={currentRecord.bloodPressure}
                        onChange={(e) => setCurrentRecord({ ...currentRecord, bloodPressure: e.target.value })}
                        className="w-full bg-transparent outline-none font-bold text-base text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Standard mmHg</p>
                    </div>

                    {/* RBS / Glucose */}
                    <div className="bg-slate-50/70 border-2 border-slate-300 border-l-4 border-l-amber-500 rounded-xl p-3 focus-within:border-amber-600 focus-within:bg-white transition">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Glucose</label>
                        <Droplets size={13} className="text-amber-500" />
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="110"
                        value={currentRecord.glucose}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          if ((val.match(/\./g) || []).length <= 1) {
                            setCurrentRecord({ ...currentRecord, glucose: val });
                          }
                        }}
                        className="w-full bg-transparent outline-none font-bold text-base text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Unit: mg/dL</p>
                    </div>

                    {/* Temperature */}
                    <div className="bg-slate-50/70 border-2 border-slate-300 border-l-4 border-l-orange-500 rounded-xl p-3 focus-within:border-orange-600 focus-within:bg-white transition">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Temperature</label>
                        <Thermometer size={13} className="text-orange-500" />
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="98.6"
                        value={currentRecord.temperature}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          if ((val.match(/\./g) || []).length <= 1) {
                            setCurrentRecord({ ...currentRecord, temperature: val });
                          }
                        }}
                        className="w-full bg-transparent outline-none font-bold text-base text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Degrees °F</p>
                    </div>

                    {/* Pulse / SpO2 */}
                    <div className="bg-slate-50/70 border-2 border-slate-300 border-l-4 border-l-teal-500 rounded-xl p-3 focus-within:border-teal-600 focus-within:bg-white transition">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Pulse / SpO2</label>
                        <Activity size={13} className="text-teal-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="78 / 98%"
                        value={currentRecord.pulse}
                        onChange={(e) => setCurrentRecord({ ...currentRecord, pulse: e.target.value })}
                        className="w-full bg-transparent outline-none font-bold text-base text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">bpm / % Oxygen</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. MEDICINE */}
              <div className="bg-white rounded-2xl border-2 border-slate-200/90 border-l-4 border-l-indigo-600 shadow-sm relative">
                {/* Section Header with lighter refined gradient */}
                <div className="bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 text-white rounded-t-xl px-4 py-3 sm:px-5 sm:py-3.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/10 text-emerald-300 rounded-lg">
                      <Package size={16} />
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                      Medicine
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-lg">
                      MEDS TOTAL: Rs. {medicineTotalAmount.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-slate-200 bg-white/10 px-2.5 py-1 rounded-lg">
                      {currentRecord.medicines.length} {currentRecord.medicines.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {/* Integrated AddMedicineForm */}
                <div className="p-3.5 sm:p-5 rounded-b-xl">
                  <AddMedicineForm
                    inventory={inventory}
                    setInventory={setInventory}
                    currentRecord={currentRecord}
                    setCurrentRecord={setCurrentRecord}
                  />
                </div>
              </div>

              {/* 5. OVERALL SUMMARY (Desktop Only: In left column below Medicine) */}
              <div className="hidden lg:block">
                {renderOverallSummary()}
              </div>
            </div>

            {/* ════ RIGHT COLUMN (4 cols): OPD Billing & Actions (100% Static on Desktop, Zero Movement) ════ */}
            <div className="lg:col-span-4 space-y-4 self-start">
              <div className="bg-white rounded-2xl border-2 border-slate-200/90 border-l-4 border-l-indigo-600 shadow-md overflow-hidden">
                {/* Top Banner (Matching lighter refined gradient) */}
                <div className="bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 text-white p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full text-indigo-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      OPD Billing Summary
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Rs. {grandPayableAmount.toFixed(2)}
                    </span>
                    <span className="text-xs text-white/60 font-semibold">(Total)</span>
                  </div>
                </div>

                {/* Billing Body */}
                <div className="p-3.5 sm:p-5 space-y-4">
                  {/* Total Cash Collected Input */}
                  <div className="border-2 border-indigo-300 border-l-4 border-l-indigo-600 bg-indigo-50/40 rounded-xl p-3 focus-within:border-indigo-600 focus-within:bg-white transition">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Total Cash Collected (Rs.) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center text-2xl font-black text-indigo-950">
                      <span className="text-slate-400 mr-1.5 font-normal text-lg">Rs.</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={currentRecord.totalCashCollected}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          if ((val.match(/\./g) || []).length <= 1) {
                            setCurrentRecord({ ...currentRecord, totalCashCollected: val });
                          }
                        }}
                        className="w-full bg-transparent outline-none font-black text-2xl text-indigo-950"
                      />
                    </div>
                  </div>

                  {/* 4 Financial Stat Cards (2x2 Grid) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 border-2 border-slate-200 border-l-4 border-l-slate-700 rounded-xl p-2.5 sm:p-3">
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide">Medicine Total</p>
                      <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                        Rs. {medicineTotalAmount.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-slate-50 border-2 border-slate-200 border-l-4 border-l-indigo-600 rounded-xl p-2.5 sm:p-3">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide">Doctor Fee</p>
                        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded">Auto</span>
                      </div>
                      <p className="text-base sm:text-lg font-black text-indigo-700 mt-0.5">
                        Rs. {calculatedDoctorFees().toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-slate-50 border-2 border-slate-200 border-l-4 border-l-amber-500 rounded-xl p-2.5 sm:p-3">
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Discount</p>
                      <p className="text-base sm:text-lg font-black text-amber-600 mt-0.5">
                        Rs. {totalMedicineDiscounts.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-emerald-50/70 border-2 border-emerald-200 border-l-4 border-l-emerald-600 rounded-xl p-2.5 sm:p-3">
                      <p className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Balance / Change</p>
                      <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                        Rs. {(parseFloat(currentRecord.totalCashCollected || 0) - medicineTotalAmount).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons: Save & Print Bill & Save Record Only */}
                  {/* Note: No keyboard shortcuts (no F9, Ctrl+S) per user instructions */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      onClick={() => saveRecord(true)}
                      disabled={!currentRecord.patientName.trim() || !currentRecord.diagnosis.trim()}
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Receipt size={18} />
                      <span>Save & Print Bill</span>
                    </button>

                    <button
                      onClick={() => saveRecord(false)}
                      disabled={!currentRecord.patientName.trim() || !currentRecord.diagnosis.trim()}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Calculator size={18} />
                      <span>Save Record Only</span>
                    </button>
                  </div>

                  {/* Footer preview note */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-3 border-t border-gray-100">
                  </div>
                </div>
              </div>

              {/* 5. OVERALL SUMMARY (Mobile Only: Placed below OPD Billing) */}
              <div className="block lg:hidden pb-10">
                {renderOverallSummary()}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── 57mm Thermal Receipt Modal ── */}
      {showReceiptModal && receiptModalData && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          patientName={receiptModalData.patientName}
          date={receiptModalData.date}
          items={receiptModalData.items}
          doctorFee={receiptModalData.doctorFee}
          billDiscount={receiptModalData.billDiscount}
        />
      )}
    </div>
  );
}