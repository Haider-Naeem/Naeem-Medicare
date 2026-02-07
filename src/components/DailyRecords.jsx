// src/components/DailyRecords.jsx
import React, { useState, useMemo } from 'react';
import { Calculator, Home, Download, Search, Calendar, TrendingUp, DollarSign, Trash2 } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { calculateRecordTotals, exportToCSV } from '../utils/calculations';

// Modern StatsCard Component (matching SalesTab style)
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

export default function DailyRecords({ records, setCurrentPage }) {
  const [recordsFilter, setRecordsFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dailySearch, setDailySearch] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  // Today's date (YYYY-MM-DD format)
  const today = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  // Get filtered records based on period
  const getFilteredRecords = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let filtered = records.filter(record => {
      // Parse record date (YYYY-MM-DD)
      const recordDateParts = record.date.split('-');
      const recordDate = new Date(recordDateParts[0], recordDateParts[1] - 1, recordDateParts[2]);
      
      switch (recordsFilter) {
        case 'daily':
          return recordDate >= startOfDay;
        case 'weekly':
          return recordDate >= startOfWeek;
        case 'monthly':
          return recordDate >= startOfMonth;
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return recordDate >= start && recordDate <= end;
        default:
          return true;
      }
    });

    // Apply search filter
    if (dailySearch) {
      filtered = filtered.filter(record => record.date.includes(dailySearch));
    }

    return filtered;
  };

  // Group & total by date
  // Group & total by date
const dailyRecords = useMemo(() => {
  const filtered = getFilteredRecords();

  const grouped = filtered.reduce((acc, record) => {
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

  // ───────────────────────────────────────────────────────────────
  // SORT EACH DAY'S PATIENTS — newest (latest created) on top
  // ───────────────────────────────────────────────────────────────
  return Object.values(grouped)
    .map((day) => ({
      ...day,
      records: [...day.records].sort((a, b) => {
        // Newest first → larger timestamp comes before smaller one
        return new Date(b.createdAt) - new Date(a.createdAt);
      }),
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // Keep days newest → oldest
}, [records, recordsFilter, customStartDate, customEndDate, dailySearch]);

  // Date picker handler
  const handleDateSelect = (e) => {
    const selected = e.target.value;
    setDailySearch(selected);
    setShowCalendar(false);
  };

  // Calculate overall stats
  const overallStats = useMemo(() => {
    return dailyRecords.reduce((acc, day) => {
      const medicineProfit = day.totals.medicineSale - day.totals.medicineCost;
      const totalProfit = medicineProfit + day.totals.doctorFees;
      
      return {
        medicineSale: acc.medicineSale + day.totals.medicineSale,
        medicineProfit: acc.medicineProfit + medicineProfit,
        doctorFees: acc.doctorFees + day.totals.doctorFees,
        totalProfit: acc.totalProfit + totalProfit,
        recordCount: acc.recordCount + day.records.length
      };
    }, {
      medicineSale: 0,
      medicineProfit: 0,
      doctorFees: 0,
      totalProfit: 0,
      recordCount: 0
    });
  }, [dailyRecords]);

  const getFilterLabel = () => {
    switch(recordsFilter) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'custom': return 'Custom Range';
      default: return 'All Time';
    }
  };

  // Delete period records
  const deletePeriodRecords = async () => {
    const filtered = getFilteredRecords();
    
    if (filtered.length === 0) {
      return alert("No records to delete in this period");
    }

    if (recordsFilter !== 'custom') {
      return alert("Please select 'Custom Range' to specify exact period for deletion.\n\nThis prevents accidental deletion of all records.");
    }

    if (!customStartDate || !customEndDate) {
      return alert("Please select both start and end dates");
    }

    const confirmMsg = `PERMANENT DELETION WARNING

You are about to DELETE ${filtered.length} patient records from:
${customStartDate} to ${customEndDate}

This action will:
- Permanently delete all patient records in this period
- NOT restore inventory stock (inventory remains as is)
- Cannot be undone

RECOMMENDED: Export data to CSV first!

Total Medicine Sale to be deleted: ₨${overallStats.medicineSale.toFixed(0)}
Total Medicine Profit to be deleted: ₨${overallStats.medicineProfit.toFixed(0)}
Total Doctor Fees to be deleted: ₨${overallStats.doctorFees.toFixed(0)}
Total Profit to be deleted: ₨${overallStats.totalProfit.toFixed(0)}

Type 'DELETE' to confirm:`;

    const userInput = prompt(confirmMsg);
    
    if (userInput !== 'DELETE') {
      return alert("Deletion cancelled");
    }

    if (!confirm(`FINAL CONFIRMATION\n\nAre you absolutely sure you want to delete ${filtered.length} records?\n\nThis CANNOT be undone!`)) {
      return;
    }

    try {
      // Assuming records have an 'id' field for Firestore document ID
      for (const record of filtered) {
        if (record.id) {
          await deleteDoc(doc(db, 'dailyRecords', record.id));
        }
      }
      
      alert(`Successfully deleted ${filtered.length} patient records.\n\nInventory stock was NOT affected.`);
    } catch (err) {
      console.error('Delete error:', err);
      alert("Error deleting records. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 rounded-xl shadow-md">
                <Calculator className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-green-900">
                  Daily Sales Records
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Today: <span className="font-bold text-green-700">{today}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => setCurrentPage('home')}
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Home size={18} /> Home
              </button>
              <button
                onClick={() => exportToCSV(getFilteredRecords())}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Download size={18} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard 
            title="Total Records" 
            value={overallStats.recordCount}
            icon={TrendingUp}
            color="orange"
          />
          <StatsCard 
            title={`Medicine Sale (${getFilterLabel()})`}
            value={overallStats.medicineSale}
            isCurrency
            icon={TrendingUp}
            color="green"
          />
          <StatsCard 
            title={`Medicine Profit (${getFilterLabel()})`}
            value={overallStats.medicineProfit}
            isCurrency
            icon={DollarSign}
            color="emerald"
          />
          <StatsCard 
            title={`Doctor Fees (${getFilterLabel()})`}
            value={overallStats.doctorFees}
            isCurrency
            icon={DollarSign}
            color="blue"
          />
          <StatsCard 
            title={`Total Profit (${getFilterLabel()})`}
            value={overallStats.totalProfit}
            isCurrency
            icon={DollarSign}
            color="purple"
          />
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <select 
                value={recordsFilter} 
                onChange={e => setRecordsFilter(e.target.value)} 
                className="px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none font-semibold text-gray-700 bg-white"
              >
                <option value="all">All Time</option>
                <option value="daily">Today</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              
              {recordsFilter === 'custom' && (
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    value={customStartDate} 
                    onChange={e => setCustomStartDate(e.target.value)} 
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none"
                  />
                  <span className="text-gray-500 font-bold">to</span>
                  <input 
                    type="date" 
                    value={customEndDate} 
                    onChange={e => setCustomEndDate(e.target.value)} 
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={deletePeriodRecords} 
                className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                title="Delete records in selected period (Inventory NOT affected)"
              >
                <Trash2 size={20} /> Delete Period
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by date (YYYY-MM-DD)..."
                value={dailySearch}
                onChange={(e) => setDailySearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none font-medium"
              />
            </div>

            <button
              onClick={() => setShowCalendar((v) => !v)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
            >
              <Calendar size={20} />
              Pick Date
            </button>
          </div>

          {showCalendar && (
            <div className="mt-4 p-4 bg-gray-50 border-2 border-green-200 rounded-xl">
              <input
                type="date"
                value={dailySearch}
                onChange={handleDateSelect}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none font-medium"
              />
            </div>
          )}
          
          {recordsFilter === 'custom' && getFilteredRecords().length > 0 && (
            <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
              <p className="text-yellow-800 text-sm font-semibold">
                Warning: Delete Period will permanently remove {getFilteredRecords().length} patient records without restocking inventory. Export data first!
              </p>
            </div>
          )}
        </div>

        {/* Daily Records */}
        <div className="space-y-4">
          {dailyRecords.length > 0 ? (
            dailyRecords.map((daily) => (
              <div 
                key={daily.date} 
                className="bg-white border-2 border-green-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all"
              >
                {/* Date Header */}
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-2xl font-bold text-green-700 flex items-center gap-2">
                    <Calendar size={24} className="text-green-600" />
                    {daily.date}
                  </h3>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Records</p>
                    <p className="text-3xl font-bold text-green-600">
                      {daily.records.length}
                    </p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 border-2 border-green-200">
                    <p className="text-xs text-green-700 font-medium mb-1">Medicine Sale</p>
                    <p className="text-xl font-bold text-green-800">
                      ₨{daily.totals.medicineSale.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl p-4 border-2 border-emerald-200">
                    <p className="text-xs text-emerald-700 font-medium mb-1">Medicine Profit</p>
                    <p className="text-xl font-bold text-emerald-800">
                      ₨{(daily.totals.medicineSale - daily.totals.medicineCost).toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl p-4 border-2 border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">Doctor Fees</p>
                    <p className="text-xl font-bold text-blue-800">
                      ₨{daily.totals.doctorFees.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl p-4 border-2 border-purple-200">
                    <p className="text-xs text-purple-700 font-medium mb-1">Total Profit</p>
                    <p className="text-xl font-bold text-purple-800">
                      ₨{((daily.totals.medicineSale - daily.totals.medicineCost) + daily.totals.doctorFees).toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Records Table */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-100">
                  <p className="font-bold mb-4 text-green-800 text-lg">Patient Records:</p>
                  <div className="space-y-3">
                    {daily.records.map((record) => {
                      const totals = calculateRecordTotals(record);
                      return (
                        <div 
                          key={record.id} 
                          className="bg-white rounded-lg p-4 border-2 border-green-200 hover:border-green-300 transition-all"
                        >
                          <div className="flex flex-col lg:flex-row justify-between gap-4">
                            {/* Patient Info */}
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-gray-800 mb-1">
                                {record.patientName}
                              </h4>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">Diagnosis:</span>{' '}
                                {record.diagnosis || 'None'}
                              </p>
                            </div>

                            {/* Financial Details */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600 text-xs">Medicine Sale</p>
                                <p className="font-bold text-green-600">
                                  ₨{totals.medicineSale.toFixed(0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Medicine Profit</p>
                                <p className="font-bold text-emerald-600">
                                  ₨{(totals.medicineSale - totals.medicineCost).toFixed(0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Doctor Fees</p>
                                <p className="font-bold text-blue-600">
                                  ₨{Number(record.doctorFees || 0).toFixed(0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600 text-xs">Total Profit</p>
                                <p className="font-bold text-purple-600">
                                  ₨{((totals.medicineSale - totals.medicineCost) + Number(record.doctorFees || 0)).toFixed(0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
              <TrendingUp size={80} className="mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-semibold text-gray-400">No daily records found</p>
              <p className="text-sm text-gray-500 mt-2">
                {recordsFilter === 'custom' && (!customStartDate || !customEndDate) 
                  ? 'Please select a date range' 
                  : 'Try adjusting your filter or search'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}