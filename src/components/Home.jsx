// C:/Users/haide/Desktop/Naeem Medicare/src/components/Home.jsx
import React, { useState } from 'react';
import { Plus, X, Calculator, Package } from 'lucide-react';
import AddMedicineForm from './AddMedicineForm';
import SummaryCard from './SummaryCard';
import { calculateRecordTotals, exportToCSV } from '../utils/calculations';

const getCurrentDate = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export default function Home({ setCurrentPage, inventory, setInventory, records, setRecords, overallTotals }) {
  const [currentRecord, setCurrentRecord] = useState({
    patientName: '',
    date: getCurrentDate(),
    medicines: [],
    doctorFees: 0,
    diagnosis: '',
  });

  const clearHomeScreen = () => {
    setCurrentRecord({
      patientName: '',
      date: getCurrentDate(),
      medicines: [],
      doctorFees: 0,
      diagnosis: '',
    });
  };

  const saveRecord = () => {
    if (currentRecord.patientName && (currentRecord.medicines.length > 0 || currentRecord.doctorFees > 0)) {
      setRecords([...records, { ...currentRecord, id: Date.now() }]);
      clearHomeScreen();
    } else {
      alert('Please enter a patient name and at least one medicine or doctor fees.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                ✨ Naeem Medicare ✨
              </h1>
              {/* <p className="text-base sm:text-lg text-gray-600 font-medium">Medical Practice Management System</p> */}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setCurrentPage('inventory')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2 w-full sm:w-auto"
              >
                <Package size={18} /> Manage Inventory
              </button>
              <button
                onClick={() => setCurrentPage('patientRecords')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto"
              >
                <Calculator size={18} /> Patient Records
              </button>
              <button
                onClick={() => setCurrentPage('dailyRecords')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 w-full sm:w-auto"
              >
                <Calculator size={18} /> Daily Records
              </button>
            </div>
          </div>
          <div className="border-2 border-indigo-200 rounded-lg p-4 sm:p-6 mb-6 bg-indigo-50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-indigo-800">New Patient Record</h2>
              <button
                onClick={clearHomeScreen}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
              >
                <X size={18} /> Clear Form
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
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
                  value={currentRecord.doctorFees}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, doctorFees: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                <input
                  type="text"
                  value={currentRecord.diagnosis}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, diagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter diagnosis"
                />
              </div>
            </div>
            <AddMedicineForm
              inventory={inventory}
              setInventory={setInventory}
              currentRecord={currentRecord}
              setCurrentRecord={setCurrentRecord}
            />
            <button
              onClick={saveRecord}
              disabled={!currentRecord.patientName}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 font-semibold flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <Calculator size={18} /> Save Record
            </button>
          </div>
          {records.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4 sm:mb-0">Overall Summary</h2>
                <button
                  onClick={() => exportToCSV(records)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 w-full sm:w-auto"
                >
                  <Calculator size={18} /> Export to CSV
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
    </div>
  );
}