// src/components/PatientRecords.jsx
import React, { useState } from 'react';
import { Calculator, Home, Download, Search, Trash2, Edit3, X } from 'lucide-react';
import MedicineTable from './MedicineTable';
import AddMedicineForm from './AddMedicineForm'; // Re-use the same form
import { calculateRecordTotals, exportToCSV } from '../utils/calculations';
import { doc, deleteDoc, updateDoc,setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";

export default function PatientRecords({ records, setRecords, inventory, setInventory, setCurrentPage }) {
  const [patientSearch, setPatientSearch] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    patientName: '',
    diagnosis: '',
    date: '',
    doctorFees: '0',
    bloodPressure: '',
    glucose: '',
    temperature: '',
    medicines: [],
  });

  // ————————————————————————————————————————
  // DELETE RECORD
  // ————————————————————————————————————————
  const deleteRecord = async (id) => {
    const record = records.find((r) => r.id === id);
    if (!record) return alert("Record not found.");

    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await deleteDoc(doc(db, "patientRecords", id));

      const updatedInventory = [...inventory];
      record.medicines?.forEach((medicine) => {
        const medIndex = updatedInventory.findIndex((m) => m.id === medicine.medicineId);
        if (medIndex !== -1) {
          updatedInventory[medIndex].totalUnits += medicine.quantity || 0;
        }
      });

      setInventory(updatedInventory);
      setRecords(records.filter((r) => r.id !== id));
      alert("Record deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete: " + error.message);
    }
  };

  // ————————————————————————————————————————
  // OPEN EDIT MODAL
  // ————————————————————————————————————————
  const openEdit = (record) => {
    setEditingRecord(record);
    setEditForm({
      patientName: record.patientName || '',
      diagnosis: record.diagnosis || '',
      date: record.date || '',
      doctorFees: record.doctorFees || '0',
      bloodPressure: record.bloodPressure || '',
      glucose: record.glucose || '',
      temperature: record.temperature || '',
      medicines: [...(record.medicines || [])],
    });
  };

  // ————————————————————————————————————————
  // SAVE EDITED RECORD
  // ————————————————————————————————————————
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
      updatedAt: new Date().toISOString(),
    };

    // USE setDoc WITH MERGE — SAFE FOR MISSING DOCS
    await setDoc(doc(db, "patientRecords", original.id), updatedRecord, { merge: true });

    // ——————————————————————
    // INVENTORY: RESTORE OLD → DEDUCT NEW
    // ——————————————————————
    const inv = [...inventory];

    // 1. Restore old medicines
    original.medicines?.forEach((med) => {
      const idx = inv.findIndex((m) => m.id === med.medicineId);
      if (idx !== -1) {
        inv[idx].totalUnits += med.quantity || 0;
      }
    });

    // 2. Deduct new medicines
    updatedRecord.medicines.forEach((med) => {
      const idx = inv.findIndex((m) => m.id === med.medicineId);
      if (idx !== -1) {
        if (inv[idx].totalUnits < med.quantity) {
          throw new Error(`Not enough stock for ${med.medicine}`);
        }
        inv[idx].totalUnits -= med.quantity;
      }
    });

    setInventory(inv);

    // ——————————————————————
    // UPDATE LOCAL STATE
    // ——————————————————————
    setRecords(records.map((r) => (r.id === original.id ? { ...r, ...updatedRecord } : r)));

    // Close modal
    setEditingRecord(null);
    alert("Record updated successfully!");
  } catch (error) {
    console.error("Edit error:", error);
    alert("Failed to save: " + error.message);
  }
};

  // ————————————————————————————————————————
  // FILTER & GROUP RECORDS
  // ————————————————————————————————————————
  const filteredRecords = records
    .filter((record) => record.patientName?.toLowerCase().includes(patientSearch.toLowerCase()))
    .reduce((acc, record) => {
      const existing = acc.find((r) => r.patientName.toLowerCase() === record.patientName.toLowerCase());
      if (existing) {
        existing.records.push(record);
      } else {
        acc.push({ patientName: record.patientName, records: [record] });
      }
      return acc;
    }, []);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
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
            <div className="mb-6">
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

            {/* RECORDS LIST */}
            <div className="space-y-4">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((patient, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-bold text-lg text-blue-800 mb-3">{patient.patientName}</h3>
                    {patient.records.map((record) => {
                      const totals = calculateRecordTotals(record);
                      return (
                        <div key={record.id} className="border-t pt-3 mt-3">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-sm text-gray-600">Date: {record.date}</p>
                              <p className="text-sm text-gray-600">Diagnosis: {record.diagnosis || 'None'}</p>
                              <p className="text-sm text-gray-600">Blood Pressure: {record.bloodPressure || 'Not recorded'}</p>
                              <p className="text-sm text-gray-600">Glucose: {record.glucose || 'Not recorded'}</p>
                              <p className="text-sm text-gray-600">Temperature: {record.temperature || 'Not recorded'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEdit(record)}
                                className="text-indigo-600 hover:text-indigo-800"
                                title="Edit Record"
                              >
                                <Edit3 size={20} />
                              </button>
                              <button
                                onClick={() => deleteRecord(record.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete Record"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>

                          {record.medicines?.length > 0 && <MedicineTable medicines={record.medicines} />}

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded">
                            <div>
                              <p className="text-xs text-gray-600">Medicine Sale</p>
                              <p className="font-semibold text-green-700">Rs. {totals.medicineSale.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Doctor Fees</p>
                              <p className="font-semibold text-blue-700">Rs. {parseFloat(record.doctorFees || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Total Sale</p>
                              <p className="font-semibold text-indigo-700">Rs. {totals.totalSale.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Profit</p>
                              <p className="font-semibold text-emerald-700">Rs. {totals.profit.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No patient records found</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ————————————————————————————————————————
          EDIT MODAL
        ———————————————————————————————————————— */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
    </>
  );
}