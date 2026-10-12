// src/components/Financials.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, TrendingUp, DollarSign, TrendingDown, Wallet,
  Package, Calculator, Filter, PiggyBank, BarChart3,
  Crown, Plus, Calendar, Award, Layers, Edit2, Trash2,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { calculateRecordTotals } from '../utils/calculations';

// ── StatsCard ─────────────────────────────────────────────────────────────────
function StatsCard({ title, value, isCurrency = false, icon: Icon, color = 'purple', subtitle }) {
  const colorClasses = {
    purple: 'from-purple-600 to-indigo-600',
    blue: 'from-blue-600 to-cyan-600',
    green: 'from-green-600 to-emerald-600',
    orange: 'from-orange-600 to-red-600',
    emerald: 'from-emerald-600 to-teal-600',
    red: 'from-red-600 to-pink-600',
    teal: 'from-teal-600 to-cyan-600',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-600',
    indigo: 'from-indigo-600 to-violet-600',
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} rounded-xl shadow-lg p-3 sm:p-4 text-white relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white rounded-full" />
        <div className="absolute -left-2 -bottom-2 w-16 h-16 bg-white rounded-full" />
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-1">
          <p className="text-white/80 text-xs sm:text-sm font-medium">{title}</p>
          {Icon && <Icon size={18} className="text-white/50" />}
        </div>
        <p className="text-xl sm:text-2xl font-bold mt-1">
          {isCurrency && '₨'}
          {isCurrency
            ? typeof value === 'number'
              ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              : value
            : value}
        </p>
        {subtitle && <p className="text-white/60 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Date Range Helper ─────────────────────────────────────────────────────────
const isDateInRange = (dateStr, filterType, customStart, customEnd) => {
  if (filterType === 'all') return true;
  if (!dateStr) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filterType) {
    case 'today':
      return date >= today;
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return date >= monthAgo;
    }
    case 'custom': {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    default:
      return true;
  }
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Financials({ setCurrentPage, records, inventory }) {
  // Filter state
  const [filterType, setFilterType] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Firestore data
  const [otherIncomes, setOtherIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [investment, setInvestment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Investment form
  const [showInvestForm, setShowInvestForm] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investDescription, setInvestDescription] = useState('');

  // Edit addition state
  const [editingAdditionIndex, setEditingAdditionIndex] = useState(null);
  const [editAdditionAmount, setEditAdditionAmount] = useState('');
  const [editAdditionDescription, setEditAdditionDescription] = useState('');
  const [showEditAdditionModal, setShowEditAdditionModal] = useState(false);
  const [additionPage, setAdditionPage] = useState(1);
  const ADDITIONS_PER_PAGE = 5;

  // ── Fetch Firestore data ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incomesSnap, expensesSnap, investSnap] = await Promise.all([
          getDocs(query(collection(db, 'otherIncomes'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))),
          getDoc(doc(db, 'medicineInvestment', 'config')),
        ]);

        setOtherIncomes(incomesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setExpenses(expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        if (investSnap.exists()) {
          setInvestment(investSnap.data());
        }
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Filtered Medical Totals ──
  const filteredMedicalTotals = useMemo(() => {
    let medicineCost = 0;
    let medicineSale = 0;
    let doctorFees = 0;

    records
      .filter((r) => isDateInRange(r.date, filterType, customStartDate, customEndDate))
      .forEach((record) => {
        const totals = calculateRecordTotals(record);
        medicineCost += totals.medicineCost;
        medicineSale += totals.medicineSale;
        doctorFees += totals.doctorFees;
      });

    const medicineProfit = medicineSale - medicineCost;
    return {
      medicineCost,
      medicineSale,
      medicineProfit,
      doctorFees,
      totalProfit: medicineProfit + doctorFees,
    };
  }, [records, filterType, customStartDate, customEndDate]);

  // ── Filtered Other Income ──
  const filteredOtherIncome = useMemo(
    () =>
      otherIncomes
        .filter((i) => isDateInRange(i.createdAt, filterType, customStartDate, customEndDate))
        .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
    [otherIncomes, filterType, customStartDate, customEndDate]
  );

  // ── Filtered Total Expenses ──
  const filteredTotalExpenses = useMemo(
    () =>
      expenses
        .filter((e) => isDateInRange(e.createdAt, filterType, customStartDate, customEndDate))
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
    [expenses, filterType, customStartDate, customEndDate]
  );

  // ── Cash in Hand (ALWAYS ALL-TIME) ──
  const cashInHand = useMemo(() => {
    let allTimeMedProfit = 0;
    records.forEach((record) => {
      const t = calculateRecordTotals(record);
      allTimeMedProfit += t.medicineSale - t.medicineCost + t.doctorFees;
    });
    const allTimeIncome = otherIncomes.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const allTimeExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    return allTimeMedProfit + allTimeIncome - allTimeExpenses;
  }, [records, otherIncomes, expenses]);

  // ── Current Inventory Value (purchase cost) ──
  const currentInventoryValue = useMemo(
    () =>
      inventory
        .filter((m) => !m.isDeleted)
        .reduce((sum, med) => sum + (med.purchasePerUnit || 0) * (med.totalUnits || 0), 0),
    [inventory]
  );

  // ── Medicine Analytics ──
  const medicineAnalytics = useMemo(() => {
    const soldMap = new Map();
    const profitMap = new Map();

    records
      .filter((r) => isDateInRange(r.date, filterType, customStartDate, customEndDate))
      .forEach((record) => {
        record.medicines?.forEach((med) => {
          const name = med.medicine || med.fullName || med.name || 'Unknown';
          const qty = med.quantity || 0;
          const revenue = (med.finalPrice || 0) * qty;
          const cost = (med.purchaseRate || 0) * qty;
          const profit = revenue - cost;

          if (soldMap.has(name)) {
            const ex = soldMap.get(name);
            soldMap.set(name, { ...ex, quantity: ex.quantity + qty, revenue: ex.revenue + revenue });
          } else {
            soldMap.set(name, { name, quantity: qty, revenue });
          }

          if (profitMap.has(name)) {
            const ex = profitMap.get(name);
            profitMap.set(name, { ...ex, profit: ex.profit + profit, quantity: ex.quantity + qty });
          } else {
            profitMap.set(name, { name, profit, quantity: qty });
          }
        });
      });

    return {
      topSold: Array.from(soldMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10),
      topProfit: Array.from(profitMap.values()).sort((a, b) => b.profit - a.profit).slice(0, 10),
    };
  }, [records, filterType, customStartDate, customEndDate]);

  // ── Investment Handlers ──
  const saveInvestment = async () => {
    const amount = parseFloat(investAmount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');

    try {
      if (isInitialSetup || !investment) {
        // Initial setup
        const investData = {
          totalInvested: amount,
          additions: [
            {
              amount,
              date: new Date().toISOString(),
              description: investDescription || 'Initial medicine investment',
            },
          ],
        };
        await setDoc(doc(db, 'medicineInvestment', 'config'), investData);
        setInvestment(investData);
        alert('Medicine investment setup successfully!');
      } else {
        // Add more from cash in hand → also records as expense
        const description = investDescription || 'Added to medicine stock';

        const expenseData = {
          name: `Medicine Investment: ${description}`,
          amount: amount.toFixed(2),
          createdAt: new Date().toISOString(),
        };
        const expRef = await addDoc(collection(db, 'expenses'), expenseData);
        setExpenses((prev) => [{ id: expRef.id, ...expenseData }, ...prev]);

        const newAdditions = [
          ...(investment.additions || []),
          { amount, date: new Date().toISOString(), description },
        ];
        const newTotal = (investment.totalInvested || 0) + amount;
        const updatedInvestment = { totalInvested: newTotal, additions: newAdditions };

        await setDoc(doc(db, 'medicineInvestment', 'config'), updatedInvestment);
        setInvestment(updatedInvestment);
        alert(`₨${amount.toLocaleString()} added to medicine investment & recorded as expense!`);
      }

      setShowInvestForm(false);
      setInvestAmount('');
      setInvestDescription('');
      setIsInitialSetup(false);
    } catch (error) {
      console.error(error);
      alert('Failed: ' + error.message);
    }
  };

  // ── Reset / Delete Entire Investment Tracker ──
  const resetEntireInvestment = async () => {
    if (!window.confirm('Delete all medicine investment records and reset the tracker?')) return;
    try {
      await deleteDoc(doc(db, 'medicineInvestment', 'config'));
      setInvestment(null);
      alert('Medicine investment tracker reset.');
    } catch (e) {
      console.error(e);
      alert('Failed to reset investment.');
    }
  };

  // ── Open Edit Addition ──
  const openEditAddition = (index) => {
    if (!investment || !investment.additions?.[index]) return;
    const item = investment.additions[index];
    setEditingAdditionIndex(index);
    setEditAdditionAmount(item.amount.toString());
    setEditAdditionDescription(item.description || '');
    setShowEditAdditionModal(true);
  };

  // ── Save Edited Addition ──
  const saveEditedAddition = async () => {
    const amt = parseFloat(editAdditionAmount);
    if (!amt || amt <= 0) return alert('Enter a valid amount');
    try {
      const updatedAdditions = [...investment.additions];
      updatedAdditions[editingAdditionIndex] = {
        ...updatedAdditions[editingAdditionIndex],
        amount: amt,
        description: editAdditionDescription || (editingAdditionIndex === 0 ? 'Initial investment' : 'Investment addition'),
      };
      const newTotal = updatedAdditions.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
      const updatedConfig = {
        ...investment,
        totalInvested: newTotal,
        additions: updatedAdditions,
      };
      await setDoc(doc(db, 'medicineInvestment', 'config'), updatedConfig);
      setInvestment(updatedConfig);
      setShowEditAdditionModal(false);
      alert('Investment entry updated successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to update investment entry.');
    }
  };

  // ── Delete an Addition ──
  const deleteAddition = async (index) => {
    if (!window.confirm('Delete this investment entry?')) return;
    try {
      const updatedAdditions = investment.additions.filter((_, i) => i !== index);
      if (updatedAdditions.length === 0) {
        await deleteDoc(doc(db, 'medicineInvestment', 'config'));
        setInvestment(null);
        alert('All investment entries deleted.');
        return;
      }
      const newTotal = updatedAdditions.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
      const updatedConfig = {
        ...investment,
        totalInvested: newTotal,
        additions: updatedAdditions,
      };
      await setDoc(doc(db, 'medicineInvestment', 'config'), updatedConfig);
      setInvestment(updatedConfig);
      alert('Investment entry deleted.');
    } catch (e) {
      console.error(e);
      alert('Failed to delete addition.');
    }
  };

  // ── Filter Button ──
  const FilterBtn = ({ type, label }) => (
    <button
      onClick={() => setFilterType(type)}
      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${filterType === type
        ? 'bg-indigo-600 text-white shadow-md'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
    >
      {label}
    </button>
  );

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Financial Data...</p>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Financials Dashboard
          </h1>
          <button
            onClick={() => setCurrentPage('home')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 text-sm transition-all active:scale-95"
          >
            <ArrowLeft size={18} /> Back to Home
          </button>
        </div>

        {/* ── Time Filter ── */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Filter by:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterBtn type="today" label="Today" />
              <FilterBtn type="week" label="Last 7 Days" />
              <FilterBtn type="month" label="Last 30 Days" />
              <FilterBtn type="all" label="All Time" />
              <FilterBtn type="custom" label="Custom" />
            </div>
          </div>
          {filterType === 'custom' && (
            <div className="flex flex-wrap gap-3 items-center bg-gray-50 rounded-lg px-4 py-3">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-2">
            Showing:{' '}
            {filterType === 'today'
              ? "Today's data"
              : filterType === 'week'
                ? 'Last 7 days'
                : filterType === 'month'
                  ? 'Last 30 days'
                  : filterType === 'custom'
                    ? 'Custom range'
                    : 'All time data'}
          </div>
        </div>

        {/* ── Financial Overview Cards ── */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <StatsCard
              title="Medicine Cost"
              value={filteredMedicalTotals.medicineCost}
              isCurrency
              icon={Package}
              color="orange"
              subtitle="Qty × Purchase Rate"
            />
            <StatsCard
              title="Medicine Profit"
              value={filteredMedicalTotals.medicineProfit}
              isCurrency
              icon={TrendingUp}
              color="emerald"
              subtitle="Selling Price − Purchase Cost"
            />
            <StatsCard
              title="Doctor Fees"
              value={filteredMedicalTotals.doctorFees}
              isCurrency
              icon={Calculator}
              color="blue"
              subtitle="Cash Collected − Medicine Total"
            />
            <StatsCard
              title="Total Medical Profit"
              value={filteredMedicalTotals.totalProfit}
              isCurrency
              icon={DollarSign}
              color="purple"
              subtitle="Medicine Profit + Doctor Fees"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatsCard
              title="Other Income"
              value={filteredOtherIncome}
              isCurrency
              icon={DollarSign}
              color="green"
              subtitle="Other clinic earnings"
            />
            <StatsCard
              title="Total Revenue"
              value={filteredMedicalTotals.totalProfit + filteredOtherIncome}
              isCurrency
              icon={TrendingUp}
              color="blue"
              subtitle="Medical Profit + Other Income"
            />
            <StatsCard
              title="Total Expenses"
              value={filteredTotalExpenses}
              isCurrency
              icon={TrendingDown}
              color="red"
              subtitle="All clinic expenses"
            />
            <StatsCard
              title="Cash in Hand"
              value={cashInHand}
              isCurrency
              icon={Wallet}
              color="teal"
              subtitle="Total Revenue − Expenses (Current)"
            />
          </div>
        </div>

        {/* ── Medicine Investment Tracker ── */}
        <div className="mb-8 border-2 border-amber-200 rounded-xl p-4 sm:p-6 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-amber-800 flex items-center gap-2">
              <PiggyBank size={24} /> Medicine Investment Tracker
            </h2>
            <div className="flex flex-wrap gap-2">
              {!investment ? (
                <button
                  onClick={() => {
                    setIsInitialSetup(true);
                    setShowInvestForm(true);
                  }}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2 text-sm font-semibold transition-all shadow"
                >
                  <Plus size={16} /> Set Initial Investment
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsInitialSetup(false);
                      setShowInvestForm(true);
                    }}
                    className="bg-amber-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all shadow"
                  >
                    <Plus size={16} /> Add More from Cash in Hand
                  </button>
                  <button
                    onClick={resetEntireInvestment}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 flex items-center gap-1 text-xs sm:text-sm font-semibold transition-all shadow"
                    title="Delete all investment data"
                  >
                    <Trash2 size={15} /> Reset Tracker
                  </button>
                </>
              )}
            </div>
          </div>

          {investment ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <StatsCard
                  title="Total Invested"
                  value={investment.totalInvested}
                  isCurrency
                  icon={PiggyBank}
                  color="amber"
                  subtitle="Initial + all additions"
                />
                <StatsCard
                  title="Capital in Inventory"
                  value={currentInventoryValue}
                  isCurrency
                  icon={Package}
                  color="indigo"
                  subtitle="Purchase cost of stock in hand"
                />
                <StatsCard
                  title="Cash Left Over"
                  value={investment.totalInvested - currentInventoryValue}
                  isCurrency
                  icon={Wallet}
                  color="teal"
                  subtitle="Total Invested − Inventory Value"
                />
              </div>

              {/* Investment History with Edit/Delete & Pagination */}
              {investment.additions?.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Investment History ({investment.additions.length} entries)
                    </h3>
                  </div>
                  <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {investment.additions
                          .slice((additionPage - 1) * ADDITIONS_PER_PAGE, additionPage * ADDITIONS_PER_PAGE)
                          .map((add, sliceIdx) => {
                            const realIdx = (additionPage - 1) * ADDITIONS_PER_PAGE + sliceIdx;
                            return (
                              <tr key={realIdx} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-2 text-xs text-gray-600">
                                  {new Date(add.date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="px-4 py-2 text-xs font-medium text-gray-800">
                                  {add.description}
                                  {realIdx === 0 && (
                                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                      Initial
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-xs text-right font-bold text-amber-700">
                                  ₨{parseFloat(add.amount).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex justify-center items-center gap-1.5">
                                    <button
                                      onClick={() => openEditAddition(realIdx)}
                                      className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                                      title="Edit entry"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => deleteAddition(realIdx)}
                                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                      title="Delete entry"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {Math.ceil(investment.additions.length / ADDITIONS_PER_PAGE) > 1 && (
                    <div className="mt-3 flex justify-between items-center text-xs text-gray-600">
                      <span>
                        Page {additionPage} of {Math.ceil(investment.additions.length / ADDITIONS_PER_PAGE)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          disabled={additionPage <= 1}
                          onClick={() => setAdditionPage((p) => Math.max(1, p - 1))}
                          className="px-2.5 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 font-semibold"
                        >
                          <ChevronLeft size={13} /> Prev
                        </button>
                        <button
                          disabled={additionPage >= Math.ceil(investment.additions.length / ADDITIONS_PER_PAGE)}
                          onClick={() => setAdditionPage((p) => p + 1)}
                          className="px-2.5 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 font-semibold"
                        >
                          Next <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PiggyBank size={48} className="mx-auto mb-3 text-amber-300" />
              <p className="text-lg font-medium">No investment tracked yet</p>
              <p className="text-sm">Click "Set Initial Investment" to start tracking your medicine capital.</p>
            </div>
          )}

          {/* Investment Form Modal */}
          {showInvestForm && (
            <div className="mt-4 bg-white rounded-lg p-4 border-2 border-amber-300 shadow-lg">
              <h3 className="text-lg font-bold text-amber-800 mb-3">
                {isInitialSetup ? 'Set Initial Investment' : 'Add More Investment'}
              </h3>
              {!isInitialSetup && (
                <p className="text-xs text-gray-500 mb-3">
                  This will deduct from Cash in Hand and record as an expense automatically.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="e.g., 30000"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={investDescription}
                    onChange={(e) => setInvestDescription(e.target.value)}
                    placeholder={isInitialSetup ? 'Initial investment' : 'e.g., New batch purchase'}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={saveInvestment}
                    className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 font-semibold text-sm transition-all"
                  >
                    {isInitialSetup ? 'Save' : 'Add & Record Expense'}
                  </button>
                  <button
                    onClick={() => {
                      setShowInvestForm(false);
                      setInvestAmount('');
                      setInvestDescription('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Addition Modal */}
          {showEditAdditionModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowEditAdditionModal(false)}>
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Edit2 size={18} className="text-blue-600" />
                    Edit Investment Entry
                  </h3>
                  <button onClick={() => setShowEditAdditionModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAdditionAmount}
                      onChange={(e) => setEditAdditionAmount(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={editAdditionDescription}
                      onChange={(e) => setEditAdditionDescription(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowEditAdditionModal(false)}
                      className="px-4 py-2 border rounded-md text-sm hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditedAddition}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-bold"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Medicine Analytics ── */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={24} className="text-indigo-600" /> Medicine Analytics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Sold */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
              <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
                <Crown size={20} className="text-green-600" /> Top Sold Medicines
              </h3>
              {medicineAnalytics.topSold.length > 0 ? (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">#</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Medicine</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Qty Sold</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicineAnalytics.topSold.map((med, idx) => (
                        <tr
                          key={idx}
                          className={`border-t ${idx === 0
                            ? 'bg-yellow-50'
                            : idx === 1
                              ? 'bg-gray-50'
                              : idx === 2
                                ? 'bg-orange-50'
                                : 'hover:bg-gray-50'
                            }`}
                        >
                          <td className="px-3 py-2 text-xs">
                            {idx < 3 ? (
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-xs ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                  }`}
                              >
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="text-gray-500 pl-1.5">{idx + 1}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium">{med.name}</td>
                          <td className="px-3 py-2 text-xs text-right font-bold text-green-700">{med.quantity}</td>
                          <td className="px-3 py-2 text-xs text-right font-semibold">₨{med.revenue.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No sales data for this period.</p>
              )}
            </div>

            {/* Top Profit */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4">
              <h3 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
                <Award size={20} className="text-purple-600" /> Top Profit-Generating
              </h3>
              {medicineAnalytics.topProfit.length > 0 ? (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">#</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Medicine</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Qty Sold</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicineAnalytics.topProfit.map((med, idx) => (
                        <tr
                          key={idx}
                          className={`border-t ${idx === 0
                            ? 'bg-yellow-50'
                            : idx === 1
                              ? 'bg-gray-50'
                              : idx === 2
                                ? 'bg-orange-50'
                                : 'hover:bg-gray-50'
                            }`}
                        >
                          <td className="px-3 py-2 text-xs">
                            {idx < 3 ? (
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-xs ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'
                                  }`}
                              >
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="text-gray-500 pl-1.5">{idx + 1}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium">{med.name}</td>
                          <td className="px-3 py-2 text-xs text-right font-semibold">{med.quantity}</td>
                          <td className="px-3 py-2 text-xs text-right font-bold text-purple-700">₨{med.profit.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">No profit data for this period.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Detailed Breakdown ── */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-indigo-800 mb-4">Detailed Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Medical Profit Components */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Package size={18} className="text-purple-600" /> Medical Profit Components
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Medicine Sales:</span>
                  <span className="font-semibold text-green-600">₨{filteredMedicalTotals.medicineSale.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Medicine Cost:</span>
                  <span className="font-semibold text-red-600">-₨{filteredMedicalTotals.medicineCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Medicine Profit:</span>
                  <span className="font-semibold text-green-600">₨{filteredMedicalTotals.medicineProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Doctor Fees:</span>
                  <span className="font-semibold text-blue-600">₨{filteredMedicalTotals.doctorFees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-purple-200">
                  <span className="font-bold text-gray-800">Total Medical Profit:</span>
                  <span className="font-bold text-purple-600">₨{filteredMedicalTotals.totalProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Final Calculation */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Calculator size={18} className="text-teal-600" /> Cash Position (All-Time)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">All-Time Medical Profit:</span>
                  <span className="font-semibold text-purple-600">
                    ₨
                    {(() => {
                      let p = 0;
                      records.forEach((r) => {
                        const t = calculateRecordTotals(r);
                        p += t.medicineSale - t.medicineCost + t.doctorFees;
                      });
                      return p.toFixed(2);
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">All-Time Other Income:</span>
                  <span className="font-semibold text-green-600">
                    +₨{otherIncomes.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">All-Time Expenses:</span>
                  <span className="font-semibold text-red-600">
                    -₨{expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-teal-200">
                  <span className="font-bold text-gray-800">Cash in Hand:</span>
                  <span className="font-bold text-teal-600 text-xl">₨{cashInHand.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
