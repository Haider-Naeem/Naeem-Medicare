// src/components/Insurance.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Trash2, FileText, ArrowLeft } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../utils/firebase';

const getCurrentDate = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const generateInsuranceNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INS-${timestamp}-${random}`;
};

export default function Insurance({ setCurrentPage, records }) {
  const [formData, setFormData] = useState({
    insuranceNumber: generateInsuranceNumber(),
    patientName: '',
    patientAge: '',
    patientContact: '',
    patientCNIC: '',
    gender: 'Male',
    date: getCurrentDate(),
    diagnosis: '',
    medicinesPrescribed: [],
    labsOrdered: [],
    medicineTotal: '0',
    doctorFees: '0',
    totalAmount: '0',
  });

  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState([]);

  // Get unique patient names from records for autocomplete
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

  const handlePatientNameChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, patientName: value }));

    if (value.trim() === '') {
      setFilteredPatients([]);
      setShowPatientSuggestions(false);
      return;
    }

    const filtered = patientSuggestions.filter((item) =>
      item.name.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredPatients(filtered);
    setShowPatientSuggestions(true);
  };

  const selectPatient = (name) => {
    setFormData((prev) => ({ ...prev, patientName: name }));
    setShowPatientSuggestions(false);
    setFilteredPatients([]);
  };

  // Auto-calculate total amount
  useEffect(() => {
    const medTotal = parseFloat(formData.medicineTotal || 0);
    const docFees = parseFloat(formData.doctorFees || 0);
    const total = medTotal + docFees;
    setFormData((prev) => ({ ...prev, totalAmount: total.toFixed(2) }));
  }, [formData.medicineTotal, formData.doctorFees]);

  const addMedicine = () => {
    setFormData((prev) => ({
      ...prev,
      medicinesPrescribed: [
        ...prev.medicinesPrescribed,
        { name: '', morning: '', daily: '', evening: '', dosage: '' },
      ],
    }));
  };

  const removeMedicine = (index) => {
    setFormData((prev) => ({
      ...prev,
      medicinesPrescribed: prev.medicinesPrescribed.filter((_, i) => i !== index),
    }));
  };

  const updateMedicine = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      medicinesPrescribed: prev.medicinesPrescribed.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      ),
    }));
  };

  const addLab = () => {
    setFormData((prev) => ({
      ...prev,
      labsOrdered: [...prev.labsOrdered, { name: '' }],
    }));
  };

  const removeLab = (index) => {
    setFormData((prev) => ({
      ...prev,
      labsOrdered: prev.labsOrdered.filter((_, i) => i !== index),
    }));
  };

  const updateLab = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      labsOrdered: prev.labsOrdered.map((lab, i) => (i === index ? { name: value } : lab)),
    }));
  };

  const resetForm = () => {
    setFormData({
      insuranceNumber: generateInsuranceNumber(),
      patientName: '',
      patientAge: '',
      patientContact: '',
      patientCNIC: '',
      gender: 'Male',
      date: getCurrentDate(),
      diagnosis: '',
      medicinesPrescribed: [],
      labsOrdered: [],
      medicineTotal: '0',
      doctorFees: '0',
      totalAmount: '0',
    });
    setShowPatientSuggestions(false);
    setFilteredPatients([]);
  };

  const saveInsuranceBill = async () => {
    try {
      if (!formData.patientName.trim()) return alert('Patient name is required.');
      if (!formData.patientAge.trim()) return alert('Patient age is required.');
      if (!formData.patientCNIC.trim()) return alert('Patient CNIC is required.');
      if (!formData.diagnosis.trim()) return alert('Diagnosis is required.');

      const billData = {
        ...formData,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'insuranceBills'), billData);
      await alert(
        `Insurance bill saved successfully!\nInsurance Number: ${formData.insuranceNumber}`
      );

      resetForm();
      setCurrentPage('insuranceBills');
    } catch (error) {
      console.error('Error saving insurance bill:', error);
      alert('Failed to save insurance bill: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-6 border-b-4 border-teal-600">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600 mb-2">
              Insurance Bill
            </h1>
            <p className="text-gray-600 font-semibold">Insurance No: {formData.insuranceNumber}</p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button
            onClick={() => setCurrentPage('home')}
            className="sm:w-64 bg-gray-700 text-white px-6 py-4 rounded-xl hover:bg-gray-800 transition-all font-semibold flex items-center justify-center gap-2 shadow-md"
          >
            <ArrowLeft size={20} /> Back to Home
          </button>
            <button
              onClick={() => setCurrentPage('insuranceBills')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-bold flex items-center gap-2"
            >
              <FileText size={20} /> View Bills
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all font-bold flex items-center gap-2"
            >
              <X size={20} /> Clear
            </button>
          </div>
        </div>

        {/* Section 1: Patient Information */}
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-6 mb-6 border-2 border-teal-200">
          <h2 className="text-2xl font-black text-teal-800 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            Patient Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Patient Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter patient name"
                value={formData.patientName}
                onChange={handlePatientNameChange}
                onFocus={() => {
                  if (patientSuggestions.length > 0) {
                    setShowPatientSuggestions(true);
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-semibold"
              />
              {showPatientSuggestions && (
                <ul className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((item, index) => (
                      <li
                        key={index}
                        className="px-4 py-3 hover:bg-teal-50 cursor-pointer transition-colors flex justify-between items-center font-semibold"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectPatient(item.name);
                        }}
                      >
                        <span>{item.name}</span>
                        <span className="text-xs text-gray-500">
                          {item.count > 1 ? `${item.count}x` : ''}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-3 text-sm text-gray-500 italic">New patient</li>
                  )}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Age <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter age"
                value={formData.patientAge}
                onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Contact Number</label>
              <input
                type="text"
                placeholder="03XX-XXXXXXX"
                value={formData.patientContact}
                onChange={(e) => setFormData({ ...formData, patientContact: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                CNIC <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="XXXXX-XXXXXXX-X"
                value={formData.patientCNIC}
                onChange={(e) => setFormData({ ...formData, patientCNIC: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-semibold"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Diagnosis */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border-2 border-blue-200">
          <h2 className="text-2xl font-black text-blue-800 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            Diagnosis
          </h2>
          <textarea
            placeholder="Enter diagnosis details..."
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-semibold"
            rows={4}
          />
        </div>

        {/* Section 3: Medicines Prescribed */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border-2 border-purple-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black text-purple-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              Medicines Prescribed
            </h2>
            <button
              onClick={addMedicine}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-bold flex items-center gap-2"
            >
              <Plus size={18} /> Add Medicine
            </button>
          </div>

          {formData.medicinesPrescribed.length === 0 ? (
            <p className="text-gray-500 italic text-center py-4 font-semibold">
              No medicines added yet
            </p>
          ) : (
            <div className="space-y-3">
              {formData.medicinesPrescribed.map((med, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg p-4 border-2 border-purple-200 hover:border-purple-400 transition-all"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Medicine Name
                      </label>
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={med.name}
                        onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Morning</label>
                      <input
                        type="text"
                        placeholder="1"
                        value={med.morning}
                        onChange={(e) => updateMedicine(index, 'morning', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Daily</label>
                      <input
                        type="text"
                        placeholder="1"
                        value={med.daily}
                        onChange={(e) => updateMedicine(index, 'daily', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Evening</label>
                      <input
                        type="text"
                        placeholder="1"
                        value={med.evening}
                        onChange={(e) => updateMedicine(index, 'evening', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Dosage</label>
                      <input
                        type="text"
                        placeholder="e.g., 500mg, 10ml"
                        value={med.dosage}
                        onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => removeMedicine(index)}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all font-bold flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Labs Ordered */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 mb-6 border-2 border-green-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black text-green-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              Labs Ordered
            </h2>
            <button
              onClick={addLab}
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-bold flex items-center gap-2"
            >
              <Plus size={18} /> Add Lab
            </button>
          </div>

          {formData.labsOrdered.length === 0 ? (
            <p className="text-gray-500 italic text-center py-4 font-semibold">No labs ordered yet</p>
          ) : (
            <div className="space-y-3">
              {formData.labsOrdered.map((lab, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg p-4 border-2 border-green-200 hover:border-green-400 transition-all flex gap-3"
                >
                  <input
                    type="text"
                    placeholder="Lab test name (e.g., CBC, Lipid Profile)"
                    value={lab.name}
                    onChange={(e) => updateLab(index, e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-semibold"
                  />
                  <button
                    onClick={() => removeLab(index)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all font-bold flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Billing */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 mb-6 border-2 border-orange-200">
          <h2 className="text-2xl font-black text-orange-800 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
              5
            </div>
            Billing Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Medicine Total (₨)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.medicineTotal}
                onChange={(e) => setFormData({ ...formData, medicineTotal: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-bold text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Doctor Fees (₨)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.doctorFees}
                onChange={(e) => setFormData({ ...formData, doctorFees: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-bold text-lg"
              />
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white rounded-lg p-4">
              <label className="block text-sm font-bold mb-2">Total Amount (₨)</label>
              <p className="text-3xl font-black">{parseFloat(formData.totalAmount).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveInsuranceBill}
          disabled={
            !formData.patientName.trim() ||
            !formData.patientAge.trim() ||
            !formData.patientCNIC.trim() ||
            !formData.diagnosis.trim()
          }
          className="w-full bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:shadow-2xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-black text-xl flex items-center justify-center gap-3"
        >
          <FileText size={24} /> Save Insurance Bill
        </button>
      </div>
    </div>
  );
}