// C:/Users/haide/Desktop/Naeem Medicare/src/components/PatientRecords.jsx
import React, { useState } from 'react';
import { Calculator, Home, Download, Search, Trash2 } from 'lucide-react';
import MedicineTable from './MedicineTable';
import { calculateRecordTotals, exportToCSV } from '../utils/calculations';

export default function PatientRecords({ records, setRecords, inventory, setInventory, setCurrentPage }) {
  const [patientSearch, setPatientSearch] = useState('');

  const deleteRecord = (id) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;

    const updatedInventory = [...inventory];
    record.medicines?.forEach((medicine) => {
      const medIndex = updatedInventory.findIndex((m) => m.id === medicine.medicineId);
      if (medIndex !== -1) {
        updatedInventory[medIndex].totalUnits += medicine.quantity || 0;
      }
    });

    setInventory(updatedInventory);
    setRecords(records.filter((r) => r.id !== id));
  };

  const filteredRecords = records
    .filter((record) => record.patientName?.toLowerCase().includes(patientSearch.toLowerCase()))
    .reduce((acc, record) => {
      const existing = acc.find((r) => r.patientName.toLowerCase() === record.patientName.toLowerCase());
      if (existing) {
        existing.records.push(record);
      } else {
        acc.push({
          patientName: record.patientName,
          records: [record],
        });
      }
      return acc;
    }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
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
                          <button onClick={() => deleteRecord(record.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 size={20} />
                          </button>
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
  );
}