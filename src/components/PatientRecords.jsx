// src/components/PatientRecords.jsx
import React, { useState, useMemo } from 'react';
import { Calculator, Home, Download, Search, Trash2, Edit3, X, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar, User, Stethoscope, Activity, Printer } from 'lucide-react';
import MedicineTable from './MedicineTable';
import AddMedicineForm from './AddMedicineForm';
import { calculateRecordTotals, exportToCSV } from '../utils/calculations';
import { doc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import ReceiptModal, { cleanMedicineNameOnly } from './ReceiptModal';

export default function PatientRecords({ records, setRecords, inventory, setInventory, setCurrentPage }) {
  const [patientSearch, setPatientSearch] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [expandedPatients, setExpandedPatients] = useState({});
  const [expandedVisits, setExpandedVisits] = useState({});
  const [currentPage, setCurrentPageState] = useState(1);
  const [itemsPerPage] = useState(5);

  // Receipt Modal State (for Print Bill)
  const [printVisitRecord, setPrintVisitRecord] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Patient Renaming State
  const [renamingPatient, setRenamingPatient] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const openRenameModal = (oldName) => {
    setRenamingPatient({ oldName, newName: oldName });
  };

  const handleSavePatientRename = async () => {
    if (!renamingPatient) return;
    const { oldName, newName } = renamingPatient;
    const trimmedNew = (newName || '').trim();
    if (!trimmedNew) {
      alert('Please enter a valid patient name.');
      return;
    }
    if (trimmedNew.toLowerCase() === oldName.trim().toLowerCase()) {
      setRenamingPatient(null);
      return;
    }

    setIsRenaming(true);
    try {
      const matchingRecords = records.filter(
        r => r.patientName?.trim().toLowerCase() === oldName.trim().toLowerCase()
      );

      await Promise.all(
        matchingRecords.map(r =>
          setDoc(doc(db, "patientRecords", r.id), { patientName: trimmedNew }, { merge: true })
        )
      );

      setRecords(prev =>
        prev.map(r =>
          r.patientName?.trim().toLowerCase() === oldName.trim().toLowerCase()
            ? { ...r, patientName: trimmedNew }
            : r
        )
      );

      setExpandedPatients(prev => {
        const copy = { ...prev };
        if (copy[oldName]) {
          delete copy[oldName];
          copy[trimmedNew] = true;
        }
        return copy;
      });

      setRenamingPatient(null);
      alert(`Patient renamed to "${trimmedNew}" successfully!`);
    } catch (err) {
      console.error("Rename patient error:", err);
      alert("Failed to rename patient: " + err.message);
    } finally {
      setIsRenaming(false);
    }
  };
  
  const [editForm, setEditForm] = useState({
    patientName: '',
    diagnosis: '',
    date: '',
    doctorFees: '0',
    totalCashCollected: '0',
    bloodPressure: '',
    glucose: '',
    temperature: '',
    medicines: [],
  });

  const togglePatient = (patientName) => {
    setExpandedPatients(prev => ({
      ...prev,
      [patientName]: !prev[patientName]
    }));
  };

  const toggleVisit = (recordId, e) => {
    e.stopPropagation();
    setExpandedVisits(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  const deleteRecord = async (record) => {
    if (!window.confirm("Delete this record permanently?")) return;

    try {
      await deleteDoc(doc(db, "patientRecords", record.id));

      const restorePromises = (record.medicines || []).map(async (med) => {
        const medRef = doc(db, 'medicines', med.medicineId);
        const snap = await getDoc(medRef);
        if (!snap.exists()) return;

        const fresh = snap.data();
        const newUnits = (fresh.totalUnits || 0) + med.quantity;
        const unitsPerPack = fresh.unitsPerPack || 1;

        return setDoc(medRef, {
          totalUnits: newUnits,
          totalPacks: Math.floor(newUnits / unitsPerPack),
          stockStatus: newUnits > 0 ? 'In Stock' : 'Out of Stock',
        }, { merge: true });
      });

      await Promise.all(restorePromises);

      const updatedInventory = [...inventory];
      record.medicines?.forEach((med) => {
        const idx = updatedInventory.findIndex(m => m.id === med.medicineId);
        if (idx !== -1) updatedInventory[idx].totalUnits += med.quantity;
      });
      setInventory(updatedInventory);
      setRecords(records.filter(r => r.id !== record.id));

      alert("Record deleted and stock restored!");
    } catch (error) {
      console.error(error);
      alert("Failed: " + error.message);
    }
  };

  const openEdit = (record, e) => {
    e.stopPropagation();
    setEditingRecord(record);
    setEditForm({
      patientName: record.patientName || '',
      diagnosis: record.diagnosis || '',
      date: record.date || '',
      doctorFees: record.doctorFees || '0',
      totalCashCollected: record.totalCashCollected || '0',
      bloodPressure: record.bloodPressure || '',
      glucose: record.glucose || '',
      temperature: record.temperature || '',
      medicines: [...(record.medicines || [])],
    });
  };

  const getMedicineDiff = (oldMeds, newMeds) => {
    const oldMap = new Map(oldMeds.map(m => [m.medicineId, m]));
    const newMap = new Map(newMeds.map(m => [m.medicineId, m]));

    const added = [];
    const removed = [];
    const changed = [];

    for (const [id, newMed] of newMap) {
      const oldMed = oldMap.get(id);
      if (!oldMed) {
        added.push(newMed);
      } else if (oldMed.quantity !== newMed.quantity) {
        changed.push({ old: oldMed, new: newMed });
      }
    }

    for (const [id, oldMed] of oldMap) {
      if (!newMap.has(id)) {
        removed.push(oldMed);
      }
    }

    return { added, removed, changed };
  };

  const saveEdit = async () => {
    if (!editForm.patientName.trim()) return alert("Patient name is required.");
    if (!editForm.diagnosis.trim()) return alert("Diagnosis is required.");
    if (editForm.medicines.length === 0 && parseFloat(editForm.doctorFees) === 0)
      return alert("Add at least one medicine or doctor fees.");

    try {
      const original = editingRecord;
      const updatedRecord = {
        ...editForm,
        doctorFees: parseFloat(editForm.doctorFees || 0).toFixed(2),
        totalCashCollected: parseFloat(editForm.totalCashCollected || 0).toFixed(2),
        updatedAt: new Date().toISOString(),
      };

      const diff = getMedicineDiff(original.medicines || [], updatedRecord.medicines);
      const inv = [...inventory];

      for (const med of diff.removed) {
        const idx = inv.findIndex(m => m.id === med.medicineId);
        if (idx !== -1) inv[idx].totalUnits += med.quantity;
      }

      for (const { old: oldMed } of diff.changed) {
        const idx = inv.findIndex(m => m.id === oldMed.medicineId);
        if (idx !== -1) inv[idx].totalUnits += oldMed.quantity;
      }

      for (const med of diff.added) {
        const idx = inv.findIndex(m => m.id === med.medicineId);
        if (idx === -1) throw new Error(`Medicine ${med.medicine} not found in inventory`);
        if (inv[idx].totalUnits < med.quantity)
          throw new Error(`Not enough stock for ${med.medicine}`);
        inv[idx].totalUnits -= med.quantity;
      }

      for (const { new: newMed } of diff.changed) {
        const idx = inv.findIndex(m => m.id === newMed.medicineId);
        if (idx === -1) throw new Error(`Medicine ${newMed.medicine} not found in inventory`);
        if (inv[idx].totalUnits < newMed.quantity)
          throw new Error(`Not enough stock for ${newMed.medicine}`);
        inv[idx].totalUnits -= newMed.quantity;
      }

      const changedMedicineIds = new Set([
        ...diff.added.map(m => m.medicineId),
        ...diff.removed.map(m => m.medicineId),
        ...diff.changed.map(c => c.old.medicineId)
      ]);

      const inventoryUpdates = Array.from(changedMedicineIds).map(async (medicineId) => {
        const medRef = doc(db, 'medicines', medicineId);
        const snap = await getDoc(medRef);
        if (!snap.exists()) return;

        const fresh = snap.data();
        const unitsPerPack = fresh.unitsPerPack || 1;
        const updatedMed = inv.find(m => m.id === medicineId);
        if (!updatedMed) return;

        return setDoc(medRef, {
          totalUnits: updatedMed.totalUnits,
          totalPacks: Math.floor(updatedMed.totalUnits / unitsPerPack),
          stockStatus: updatedMed.totalUnits > 0 ? 'In Stock' : 'Out of Stock',
        }, { merge: true });
      });

      await Promise.all(inventoryUpdates);
      await setDoc(doc(db, "patientRecords", original.id), updatedRecord, { merge: true });

      setInventory(inv);
      setRecords(records.map(r => (r.id === original.id ? { ...r, ...updatedRecord } : r)));

      setEditingRecord(null);
      alert("Record updated successfully!");
    } catch (error) {
      console.error("Edit error:", error);
      alert("Failed to save: " + error.message);
    }
  };

  // ── Open Print Bill for Visit ──
  const openPrintBill = (record, e) => {
    if (e) e.stopPropagation();
    const printItems = (record.medicines || []).map((m) => {
      const qty = parseInt(m.quantity, 10) || 1;
      const discPct = parseFloat(m.discount) || 0;
      let retailRate = parseFloat(m.retailRate || m.pricePerUnit) || 0;
      if (!retailRate && m.finalPrice) {
        if (discPct > 0 && discPct < 100) {
          retailRate = parseFloat(m.finalPrice) / (1 - (discPct / 100));
        } else {
          retailRate = parseFloat(m.finalPrice);
        }
      }
      const gross = retailRate * qty;
      const discAmt = gross * (discPct / 100);
      const lineTotal = Math.max(0, gross - discAmt);
      return {
        name: cleanMedicineNameOnly(m.medicine || m.fullName || m.name),
        quantity: qty,
        pricePerUnit: retailRate,
        discountPercent: discPct,
        total: lineTotal,
      };
    });

    setPrintVisitRecord({
      patientName: record.patientName,
      date: record.date,
      items: printItems,
      doctorFee: parseFloat(record.doctorFees || 0),
      billDiscount: 0,
    });
    setShowReceiptModal(true);
  };

  const processedPatients = useMemo(() => {
    let filtered = records.filter((record) => 
      record.patientName?.toLowerCase().includes(patientSearch.toLowerCase())
    );

    const patientMap = new Map();
    
    filtered.forEach(record => {
      const name = record.patientName;
      if (!patientMap.has(name)) {
        patientMap.set(name, []);
      }
      patientMap.get(name).push(record);
    });

    const patients = Array.from(patientMap.entries()).map(([name, patientRecords]) => {
      const sortedRecords = [...patientRecords].sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      
      const recordsWithVisits = sortedRecords.map((record, index) => ({
        ...record,
        visitNumber: index + 1,
        visitLabel: `Visit ${index + 1}`
      }));
      
      const displayRecords = [...recordsWithVisits].reverse();
      
      return {
        patientName: name,
        records: displayRecords,
        totalVisits: recordsWithVisits.length,
        latestVisit: displayRecords[0]?.date || 'N/A',
        totalCashCollected: displayRecords.reduce((sum, r) => sum + parseFloat(r.totalCashCollected || 0), 0)
      };
    });

    patients.sort((a, b) => {
      const dateA = a.records[0]?.date || '';
      const dateB = b.records[0]?.date || '';
      return dateB.localeCompare(dateA);
    });

    return patients;
  }, [records, patientSearch]);

  const totalPages = Math.ceil(processedPatients.length / itemsPerPage);
  const paginatedPatients = processedPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPageState(1);
  }, [patientSearch]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 py-3 sm:px-4 sm:py-6 pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6 pb-5 sm:pb-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-0">
                <Calculator className="text-blue-600" size={28} />
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Patient Records</h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentPage('home')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 w-full sm:w-auto"
                >
                  <Home size={18} /> Home
                </button>
                <button
                  onClick={() => exportToCSV(records)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 w-full sm:w-auto"
                >
                  <Download size={18} /> Export Records
                </button>
              </div>
            </div>

            {/* SEARCH */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search patients by name..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Pagination Info Bar (Compact 2 Lines) */}
            {processedPatients.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 sm:p-3 mb-4 flex flex-col items-center justify-center gap-2">
                <div className="text-xs sm:text-sm text-gray-600 text-center font-medium">
                  Showing <span className="font-bold text-blue-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-bold text-blue-700">
                    {Math.min(currentPage * itemsPerPage, processedPatients.length)}
                  </span>{' '}
                  of <span className="font-bold text-blue-700">{processedPatients.length}</span> patients
                </div>
                <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                  <button
                    onClick={() => setCurrentPageState(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 sm:px-2.5 sm:py-1 rounded-lg bg-white border border-blue-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-100 transition-all flex items-center justify-center text-xs font-semibold shrink-0"
                    title="Previous Page"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="px-3 py-1 text-xs font-bold bg-blue-100/60 rounded-lg text-blue-900 whitespace-nowrap shrink-0">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPageState(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 sm:px-2.5 sm:py-1 rounded-lg bg-white border border-blue-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-100 transition-all flex items-center justify-center text-xs font-semibold shrink-0"
                    title="Next Page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* RECORDS LIST */}
            <div className="space-y-4">
              {paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient, index) => {
                  const isPatientExpanded = expandedPatients[patient.patientName];
                  
                  return (
                    <div key={index} className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-all">
                      {/* Patient Header */}
                      <div
                        className={`w-full px-3 sm:px-4 py-3.5 transition-all text-left ${
                          isPatientExpanded 
                            ? 'bg-gradient-to-r from-blue-700 to-indigo-700' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          {/* Clickable Area for Accordion Toggle */}
                          <div
                            onClick={() => togglePatient(patient.patientName)}
                            className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1 select-none"
                          >
                            {isPatientExpanded ? (
                              <ChevronDown size={22} className="text-white shrink-0" />
                            ) : (
                              <ChevronRight size={22} className="text-white shrink-0" />
                            )}
                            <User size={20} className="text-white shrink-0" />
                            <h3 className="font-bold text-base sm:text-lg text-white">{patient.patientName}</h3>
                            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                              {patient.totalVisits} {patient.totalVisits === 1 ? 'Visit' : 'Visits'}
                            </span>
                          </div>

                          {/* Stats & Edit Name Button */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                            <div className="text-white/90">
                              Latest: <span className="font-semibold">{patient.latestVisit}</span>
                            </div>
                            <div className="text-white/90">
                              Total: <span className="font-semibold">₨{patient.totalCashCollected.toFixed(0)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRenameModal(patient.patientName);
                              }}
                              className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition active:scale-95 border border-white/30"
                              title="Edit Patient Name"
                            >
                              <Edit3 size={13} /> Edit Name
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Visits List - Only show if patient is expanded */}
                      {isPatientExpanded && (
                        <div className="divide-y divide-gray-200 bg-gray-50">
                          {patient.records.length > 0 ? (
                            patient.records.map((record) => {
                              const totals = calculateRecordTotals(record);
                              const isVisitExpanded = expandedVisits[record.id];
                              
                              return (
                                <div key={record.id} className="bg-white">
                                  {/* Visit Header - Restructured to avoid nested buttons */}
                                  <div className={`${isVisitExpanded ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}>
                                    <div className="flex justify-between items-center px-4 py-3">
                                      {/* Clickable area for expanding/collapsing */}
                                      <div 
                                        onClick={(e) => toggleVisit(record.id, e)}
                                        className="flex items-center gap-3 flex-wrap flex-1 cursor-pointer hover:bg-gray-50 transition-all rounded"
                                      >
                                        {isVisitExpanded ? (
                                          <ChevronDown size={18} className="text-indigo-600" />
                                        ) : (
                                          <ChevronRight size={18} className="text-gray-400" />
                                        )}
                                        <div className="flex items-center gap-2">
                                          <Calendar size={16} className="text-gray-500" />
                                          <span className={`font-semibold ${isVisitExpanded ? 'text-indigo-700' : 'text-gray-800'}`}>
                                            {record.visitLabel}
                                          </span>
                                        </div>
                                        <span className="text-sm text-gray-500">({record.date})</span>
                                        {record.diagnosis && (
                                          <div className="flex items-center gap-1">
                                            <Stethoscope size={14} className="text-gray-400" />
                                            <span className="text-xs text-gray-600 truncate max-w-[200px]">
                                              {record.diagnosis.substring(0, 50)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Action Buttons - Separate, not inside the clickable area */}
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-green-600">
                                            ₨{totals.totalSale.toFixed(0)}
                                          </p>
                                          <p className="text-xs text-gray-500">Total</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={(e) => openPrintBill(record, e)}
                                            className="text-emerald-600 hover:text-emerald-800 p-1.5 hover:bg-emerald-50 rounded transition-colors"
                                            title="Print Thermal Bill (80mm)"
                                          >
                                            <Printer size={16} />
                                          </button>
                                          <button
                                            onClick={(e) => openEdit(record, e)}
                                            className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded transition-colors"
                                            title="Edit Record"
                                          >
                                            <Edit3 size={16} />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteRecord(record);
                                            }}
                                            className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded transition-colors"
                                            title="Delete Record"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded Visit Content */}
                                  {isVisitExpanded && (
                                    <div className="px-4 pb-4 pt-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-t-2 border-indigo-200">
                                      {/* Vital Signs */}
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                        {record.bloodPressure && (
                                          <div className="bg-white rounded-lg p-3 border-l-4 border-l-red-500 shadow-sm">
                                            <p className="text-xs text-gray-500 font-medium">Blood Pressure</p>
                                            <p className="font-semibold text-gray-800 text-lg">{record.bloodPressure}</p>
                                          </div>
                                        )}
                                        {record.glucose && (
                                          <div className="bg-white rounded-lg p-3 border-l-4 border-l-orange-500 shadow-sm">
                                            <p className="text-xs text-gray-500 font-medium">Glucose</p>
                                            <p className="font-semibold text-gray-800 text-lg">{record.glucose}</p>
                                          </div>
                                        )}
                                        {record.temperature && (
                                          <div className="bg-white rounded-lg p-3 border-l-4 border-l-blue-500 shadow-sm">
                                            <p className="text-xs text-gray-500 font-medium">Temperature</p>
                                            <p className="font-semibold text-gray-800 text-lg">{record.temperature}</p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Diagnosis */}
                                      {record.diagnosis && (
                                        <div className="mb-4">
                                          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                            <Activity size={14} className="text-indigo-600" /> Diagnosis
                                          </p>
                                          <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm">
                                            <p className="text-sm text-gray-700">{record.diagnosis}</p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Medicines */}
                                      {record.medicines?.length > 0 && (
                                        <div className="mb-4">
                                          <p className="text-sm font-semibold text-gray-700 mb-2">💊 Medicines Prescribed</p>
                                          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                                            <MedicineTable medicines={record.medicines} />
                                          </div>
                                        </div>
                                      )}

                                      {/* Financial Summary */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-lg border border-indigo-200 shadow-sm">
                                        <div className="text-center">
                                          <p className="text-xs text-gray-500 font-medium">Medicine Sale</p>
                                          <p className="font-bold text-green-700 text-lg">₨{totals.medicineSale.toFixed(2)}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs text-gray-500 font-medium">Doctor Fees</p>
                                          <p className="font-bold text-blue-700 text-lg">₨{parseFloat(record.doctorFees || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs text-gray-500 font-medium">Total Sale</p>
                                          <p className="font-bold text-indigo-700 text-lg">₨{totals.totalSale.toFixed(2)}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs text-gray-500 font-medium">Profit</p>
                                          <p className="font-bold text-emerald-700 text-lg">₨{totals.profit.toFixed(2)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-4 py-8 text-center text-gray-500">
                              No visits recorded for this patient
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <User size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No patient records found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
                </div>
              )}
            </div>

            {/* Bottom Pagination (Single Line with Arrow Icons) */}
            {processedPatients.length > itemsPerPage && (
              <div className="mt-6 pt-3.5 border-t border-gray-100 flex justify-center pb-2">
                <div className="flex items-center justify-center gap-1 sm:gap-2 flex-nowrap max-w-full overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setCurrentPageState(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-semibold shrink-0"
                    title="First Page"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPageState(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-semibold shrink-0"
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg whitespace-nowrap shrink-0">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPageState(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-semibold shrink-0"
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPageState(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-semibold shrink-0"
                    title="Last Page"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-indigo-800">Edit Patient Record</h2>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Patient Name"
                value={editForm.patientName}
                onChange={(e) => setEditForm({ ...editForm, patientName: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <textarea
                placeholder="Diagnosis"
                value={editForm.diagnosis}
                onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                className="px-3 py-2 border rounded-md md:col-span-2"
                rows={2}
              />
              <input
                type="text"
                placeholder="Blood Pressure"
                value={editForm.bloodPressure}
                onChange={(e) => setEditForm({ ...editForm, bloodPressure: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Glucose"
                value={editForm.glucose}
                onChange={(e) => setEditForm({ ...editForm, glucose: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Temperature"
                value={editForm.temperature}
                onChange={(e) => setEditForm({ ...editForm, temperature: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Total Cash Collected"
                value={editForm.totalCashCollected}
                onChange={(e) => setEditForm({ ...editForm, totalCashCollected: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Doctor Fees"
                value={editForm.doctorFees}
                onChange={(e) => setEditForm({ ...editForm, doctorFees: e.target.value })}
                className="px-3 py-2 border rounded-md"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Edit Medicines</h3>
              <AddMedicineForm
                inventory={inventory}
                setInventory={setInventory}
                currentRecord={editForm}
                setCurrentRecord={setEditForm}
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── 80mm Thermal Receipt Modal ── */}
      {showReceiptModal && printVisitRecord && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          patientName={printVisitRecord.patientName}
          date={printVisitRecord.date}
          items={printVisitRecord.items}
          doctorFee={printVisitRecord.doctorFee}
          billDiscount={printVisitRecord.billDiscount}
        />
      )}

      {/* ── RENAME PATIENT MODAL ── */}
      {renamingPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="text-lg sm:text-xl font-bold text-indigo-900 flex items-center gap-2">
                <Edit3 size={20} className="text-indigo-600" /> Edit Patient Name
              </h3>
              <button
                onClick={() => setRenamingPatient(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Current Name: <span className="font-bold text-gray-800">{renamingPatient.oldName}</span>
              </label>
              <input
                type="text"
                value={renamingPatient.newName}
                onChange={(e) => setRenamingPatient({ ...renamingPatient, newName: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePatientRename();
                }}
                placeholder="Enter new patient name..."
                className="w-full px-3 py-2.5 border-2 border-indigo-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                This will update the patient name across all visit records and suggestions.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setRenamingPatient(null)}
                disabled={isRenaming}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePatientRename}
                disabled={isRenaming || !renamingPatient.newName?.trim()}
                className="px-5 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow transition active:scale-95 disabled:bg-gray-400"
              >
                {isRenaming ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}