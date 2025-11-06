// src/components/DailyRecords.jsx
import React, { useState, useMemo } from 'react';
import { Calculator, Home, Download, Search, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { calculateRecordTotals, exportToCSV } from '../utils/calculations';

export default function DailyRecords({ records, setCurrentPage }) {
  const [dailySearch, setDailySearch] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  // -------------------------------------------------------------
  // TODAY'S DATE (auto-updates)
  // -------------------------------------------------------------
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // -------------------------------------------------------------
  // GROUP & TOTAL BY DATE
  // -------------------------------------------------------------
  const dailyRecords = useMemo(() => {
    const grouped = records.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          records: [],
          totals: {
            medicineSale: 0,
            medicineCost: 0,
            doctorFees: 0,
            totalSale: 0,
            profit: 0,
          },
        };
      }
      acc[date].records.push(record);
      const recTotals = calculateRecordTotals(record);
      acc[date].totals.medicineSale += recTotals.medicineSale;
      acc[date].totals.medicineCost += recTotals.medicineCost;
      acc[date].totals.doctorFees += parseFloat(record.doctorFees || 0);
      acc[date].totals.totalSale += recTotals.totalSale;
      acc[date].totals.profit += recTotals.profit;
      return acc;
    }, {});

    // Sort dates newest to oldest
    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  // -------------------------------------------------------------
  // FILTER BY SEARCH / DATE-PICKER
  // -------------------------------------------------------------
  const filteredDailyRecords = useMemo(() => {
    return dailyRecords.filter((day) => day.date.includes(dailySearch));
  }, [dailyRecords, dailySearch]);

  // -------------------------------------------------------------
  // DATE-PICKER HANDLER
  // -------------------------------------------------------------
  const handleDateSelect = (e) => {
    const selected = e.target.value; // native <input type="date">
    setDailySearch(selected);
    setShowCalendar(false);
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">

          {/* ---------- HEADER ---------- */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-0">
              <Calculator className="text-green-600" size={28} />
              <h1 className="text-2xl sm:text-3xl font-bold text-green-900">
                Daily Sales Records
              </h1>
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

          {/* ---------- TODAY'S DATE ---------- */}
          <div className="text-center mb-4">
            <p className="text-lg font-medium text-green-800">
              Today: <span className="font-bold">{today}</span>
            </p>
          </div>

          {/* ---------- SEARCH + CALENDAR ---------- */}
          <div className="mb-6">
            <div className="relative flex items-center gap-2">
              {/* Search input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by date (YYYY-MM-DD)..."
                  value={dailySearch}
                  onChange={(e) => setDailySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Calendar button */}
              <button
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                title="Pick a date"
              >
                <Calendar size={20} />
                <span className="hidden sm:inline">Pick Date</span>
              </button>
            </div>

            {/* Native date picker (shown as a dropdown) */}
            {showCalendar && (
              <div className="mt-2 p-2 bg-white border border-green-300 rounded-lg shadow-md">
                <input
                  type="date"
                  value={dailySearch}
                  onChange={handleDateSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}
          </div>

          {/* ---------- RECORDS ---------- */}
          <div className="space-y-4">
            {filteredDailyRecords.length > 0 ? (
              filteredDailyRecords.map((daily) => (
                <div key={daily.date} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-bold text-lg text-green-800 mb-3">
                    Date: {daily.date}
                  </h3>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Medicine Sale</p>
                      <p className="font-semibold text-green-700">
                        Rs. {daily.totals.medicineSale.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Doctor Fees</p>
                      <p className="font-semibold text-blue-700">
                        Rs. {daily.totals.doctorFees.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Sale</p>
                      <p className="font-semibold text-indigo-700">
                        Rs. {daily.totals.totalSale.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Profit</p>
                      <p className="font-semibold text-emerald-700">
                        Rs. {daily.totals.profit.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Details table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="px-2 py-1 text-left">Patient</th>
                          <th className="px-2 py-1 text-left">Diagnosis</th>
                          <th className="px-2 py-1 text-right">Medicine Sale</th>
                          <th className="px-2 py-1 text-right">Doctor Fees</th>
                          <th className="px-2 py-1 text-right">Total Sale</th>
                          <th className="px-2 py-1 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daily.records.map((record) => {
                          const totals = calculateRecordTotals(record);
                          return (
                            <tr key={record.id} className="border-b">
                              <td className="px-2 py-1">{record.patientName}</td>
                              <td className="px-2 py-1">{record.diagnosis || 'None'}</td>
                              <td className="px-2 py-1 text-right text-green-600">
                                {totals.medicineSale.toFixed(2)}
                              </td>
                              <td className="px-2 py-1 text-right text-blue-600">
                                {Number(record.doctorFees || 0).toFixed(2)}
                              </td>
                              <td className="px-2 py-1 text-right text-indigo-600">
                                {totals.totalSale.toFixed(2)}
                              </td>
                              <td className="px-2 py-1 text-right text-emerald-600">
                                {totals.profit.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No daily records found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}