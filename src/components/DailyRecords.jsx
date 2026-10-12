import React, { useState, useMemo } from 'react';
import { Calculator, Home, Download, Search, Calendar, TrendingUp, DollarSign, Trash2, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { calculateRecordTotals, exportToCSV } from '../utils/calculations';
import ReceiptModal, { cleanMedicineNameOnly } from './ReceiptModal';

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
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white rounded-full"></div>
        <div className="absolute -left-2 -bottom-2 w-16 h-16 bg-white rounded-full"></div>
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
            : value
          }
        </p>
      </div>
    </div>
  );
}

export default function DailyRecords({ records, setCurrentPage: onSetCurrentPage }) {
  const [recordsFilter, setRecordsFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dailySearch, setDailySearch] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Number of days per page

  // Receipt Modal State (for Print Bill)
  const [printDailyRecord, setPrintDailyRecord] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // ── Open Print Bill for Record ──
  const openPrintBill = (record) => {
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

    setPrintDailyRecord({
      patientName: record.patientName,
      date: record.date,
      items: printItems,
      doctorFee: parseFloat(record.doctorFees || 0),
      billDiscount: 0,
    });
    setShowReceiptModal(true);
  };

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

    if (dailySearch) {
      filtered = filtered.filter(record => record.date.includes(dailySearch));
    }

    return filtered;
  };

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
            totalCashCollected: 0,
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
      acc[date].totals.totalCashCollected += parseFloat(record.totalCashCollected || recTotals.totalSale || 0);
      acc[date].totals.medicineSale += recTotals.medicineSale;
      acc[date].totals.medicineCost += recTotals.medicineCost;
      acc[date].totals.doctorFees += parseFloat(record.doctorFees || 0);
      acc[date].totals.totalSale += recTotals.totalSale;
      acc[date].totals.profit += recTotals.profit;

      return acc;
    }, {});

    return Object.values(grouped)
      .map((day) => ({
        ...day,
        records: [...day.records].sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, recordsFilter, customStartDate, customEndDate, dailySearch]);

  // Pagination logic
  const paginatedDailyRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return dailyRecords.slice(start, end);
  }, [dailyRecords, currentPage]);

  const totalPages = Math.ceil(dailyRecords.length / itemsPerPage);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [recordsFilter, customStartDate, customEndDate, dailySearch]);

  // Calculate overall stats (for all records, not just current page)
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
    switch (recordsFilter) {
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-3 sm:p-6 pb-16 sm:pb-20">
      <div className="max-w-7xl mx-auto pb-4 sm:pb-6">

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
                onClick={() => onSetCurrentPage('home')}
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

        {/* Filters & Actions (Compact 2 Lines) */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-3 sm:p-4 mb-3.5 space-y-2.5">
          {/* Line 1: Filter Dropdown & Delete Period Button */}
          <div className="flex items-center gap-2">
            <select
              value={recordsFilter}
              onChange={e => setRecordsFilter(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none font-semibold text-xs sm:text-sm text-gray-700 bg-white"
            >
              <option value="all">All Time</option>
              <option value="daily">Today</option>
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            <button
              onClick={deletePeriodRecords}
              className="shrink-0 bg-gradient-to-r from-red-600 to-rose-600 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
              title="Delete records in selected period (Inventory NOT affected)"
            >
              <Trash2 size={15} /> Delete Period
            </button>
          </div>

          {/* Line 2: Search Input & Pick Date Button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by date (YYYY-MM-DD)..."
                value={dailySearch}
                onChange={(e) => setDailySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none text-xs sm:text-sm font-medium"
              />
            </div>

            <button
              onClick={() => setShowCalendar((v) => !v)}
              className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all whitespace-nowrap"
            >
              <Calendar size={15} />
              Pick Date
            </button>
          </div>

          {showCalendar && (
            <div className="pt-1">
              <input
                type="date"
                value={dailySearch}
                onChange={(e) => {
                  setDailySearch(e.target.value);
                  setShowCalendar(false);
                }}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none text-xs sm:text-sm font-medium"
              />
            </div>
          )}

          {recordsFilter === 'custom' && (
            <div className="flex items-center gap-2 pt-1 text-xs sm:text-sm">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border-2 border-gray-200 rounded-lg focus:border-green-500 outline-none text-xs"
              />
              <span className="text-gray-500 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border-2 border-gray-200 rounded-lg focus:border-green-500 outline-none text-xs"
              />
            </div>
          )}

          {recordsFilter === 'custom' && getFilteredRecords().length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2.5">
              <p className="text-yellow-800 text-xs font-semibold">
                Warning: Delete Period will permanently remove {getFilteredRecords().length} patient records without restocking inventory. Export data first!
              </p>
            </div>
          )}
        </div>

        {/* Pagination Info Bar (Compact 2 Lines) */}
        {dailyRecords.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-2.5 sm:p-3.5 mb-4 flex flex-col items-center justify-center gap-2">
            {/* Line 1: Showing info */}
            <div className="text-xs sm:text-sm text-gray-600 text-center font-medium">
              Showing <span className="font-bold text-green-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
              <span className="font-bold text-green-700">
                {Math.min(currentPage * itemsPerPage, dailyRecords.length)}
              </span>{' '}
              of <span className="font-bold text-green-700">{dailyRecords.length}</span> days
            </div>

            {/* Line 2: All buttons in one row */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 transition-all flex items-center gap-1 text-xs font-semibold shrink-0"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <div className="flex gap-1 shrink-0">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${currentPage === pageNum
                          ? 'bg-green-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 transition-all flex items-center gap-1 text-xs font-semibold shrink-0"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Daily Records */}
        <div className="space-y-4">
          {paginatedDailyRecords.length > 0 ? (
            paginatedDailyRecords.map((daily) => (
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-5">
                  <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl p-3 sm:p-4 border-2 border-blue-200">
                    <p className="text-xs text-blue-700 font-bold mb-1">Total Cash Collected</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">
                      ₨{daily.totals.totalCashCollected.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-3 sm:p-4 border-2 border-green-200">
                    <p className="text-xs text-green-700 font-medium mb-1">Medicine Sale</p>
                    <p className="text-xl font-bold text-green-800">
                      ₨{daily.totals.medicineSale.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl p-3 sm:p-4 border-2 border-emerald-200">
                    <p className="text-xs text-emerald-700 font-medium mb-1">Medicine Profit</p>
                    <p className="text-xl font-bold text-emerald-800">
                      ₨{(daily.totals.medicineSale - daily.totals.medicineCost).toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl p-3 sm:p-4 border-2 border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">Doctor Fees</p>
                    <p className="text-xl font-bold text-blue-800">
                      ₨{daily.totals.doctorFees.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl p-3 sm:p-4 border-2 border-purple-200 col-span-2 sm:col-span-1">
                    <p className="text-xs text-purple-700 font-medium mb-1">Total Profit</p>
                    <p className="text-xl font-bold text-purple-800">
                      ₨{((daily.totals.medicineSale - daily.totals.medicineCost) + daily.totals.doctorFees).toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Records Table */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 sm:p-5 border-2 border-green-100">
                  <p className="font-bold mb-3 sm:mb-4 text-green-800 text-base sm:text-lg">Patient Records:</p>
                  <div className="space-y-3">
                    {daily.records.map((record) => {
                      const totals = calculateRecordTotals(record);
                      return (
                        <div
                          key={record.id}
                          className="bg-white rounded-lg p-3 sm:p-4 border-2 border-green-200 hover:border-green-300 transition-all shadow-sm"
                        >
                          <div className="flex flex-col lg:flex-row justify-between gap-3 sm:gap-4">
                            {/* Patient Info */}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
                                  {record.patientName}
                                </h4>
                                <button
                                  onClick={() => openPrintBill(record)}
                                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 transition"
                                  title="Print 57mm Thermal Bill"
                                >
                                  <Printer size={13} /> Print Bill
                                </button>
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">Diagnosis:</span>{' '}
                                {record.diagnosis || 'None'}
                              </p>
                            </div>

                            {/* Financial Details: Shows Total Cash Collected prominently */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 text-sm">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-2.5">
                                <p className="text-blue-700 text-xs font-bold">Cash Collected</p>
                                <p className="font-bold text-blue-900 text-base sm:text-lg">
                                  ₨{parseFloat(record.totalCashCollected || totals.totalSale || 0).toFixed(0)}
                                </p>
                              </div>
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

        {/* Bottom Pagination (Compact 2 Lines) */}
        {dailyRecords.length > itemsPerPage && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-2.5 sm:p-3.5 mt-4 mb-3 flex flex-col items-center justify-center gap-2">
            {/* Line 1: Showing info */}
            <div className="text-xs sm:text-sm text-gray-600 text-center font-medium">
              Showing <span className="font-bold text-green-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
              <span className="font-bold text-green-700">
                {Math.min(currentPage * itemsPerPage, dailyRecords.length)}
              </span>{' '}
              of <span className="font-bold text-green-700">{dailyRecords.length}</span> days
            </div>

            {/* Line 2: All buttons in one row */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 transition-all flex items-center gap-1 text-xs font-semibold shrink-0"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <div className="flex gap-1 shrink-0">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${currentPage === pageNum
                          ? 'bg-green-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 transition-all flex items-center gap-1 text-xs font-semibold shrink-0"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 57mm Thermal Receipt Modal ── */}
      {showReceiptModal && printDailyRecord && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          patientName={printDailyRecord.patientName}
          date={printDailyRecord.date}
          items={printDailyRecord.items}
          doctorFee={printDailyRecord.doctorFee}
          billDiscount={printDailyRecord.billDiscount}
        />
      )}
    </div>
  );
}