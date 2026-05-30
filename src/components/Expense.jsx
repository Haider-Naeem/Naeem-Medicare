// src/components/Expense.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, X, TrendingUp, DollarSign, TrendingDown, Wallet, 
  Package, Calculator, ArrowLeft, Edit2, Filter, ChevronLeft, 
  ChevronRight, Calendar, Save 
} from 'lucide-react';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy, where, limit, startAfter, getCountFromServer } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { calculateRecordTotals } from '../utils/calculations';

// Helper functions
const formatDate = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isToday = (dateString) => {
  const date = new Date(dateString);
  const today = getTodayDate();
  return date.toDateString() === today.toDateString();
};

// Modern StatsCard Component
function StatsCard({ title, value, isCurrency = false, icon: Icon, color = 'purple' }) {
  const colorClasses = {
    purple: 'from-purple-600 to-indigo-600',
    blue: 'from-blue-600 to-cyan-600',
    green: 'from-green-600 to-emerald-600',
    orange: 'from-orange-600 to-red-600',
    emerald: 'from-emerald-600 to-teal-600',
    red: 'from-red-600 to-pink-600',
    teal: 'from-teal-600 to-cyan-600',
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} rounded-xl shadow-lg p-3 sm:p-4 text-white transition-all relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-white rounded-full"></div>
        <div className="absolute -left-2 -bottom-2 w-16 h-16 bg-white rounded-full"></div>
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-1 sm:mb-2">
          <p className="text-white/80 text-xs sm:text-sm font-medium">{title}</p>
          {Icon && <Icon size={16} sm:size={20} className="text-white/50" />}
        </div>
        <p className="text-xl sm:text-3xl font-bold mt-1">
          {isCurrency && '₨'}
          {isCurrency 
            ? typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : value 
            : value
          }
        </p>
      </div>
    </div>
  );
}

// Edit Modal Component
function EditModal({ isOpen, onClose, item, type, onSave }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setAmount(item.amount || '');
      if (item.createdAt) {
        const dateObj = new Date(item.createdAt);
        setDate(dateObj.toISOString().split('T')[0]);
      }
    }
  }, [item]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter name');
    if (!amount || parseFloat(amount) <= 0) return alert('Please enter valid amount');
    if (!date) return alert('Please select date');
    
    onSave({
      name: name.trim(),
      amount: parseFloat(amount).toFixed(2),
      createdAt: new Date(date).toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Edit2 size={20} /> Edit {type === 'income' ? 'Income' : 'Expense'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'income' ? 'Income' : 'Expense'} Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder={`Enter ${type === 'income' ? 'income' : 'expense'} name`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Expense({ setCurrentPage, records }) {
  const [allIncomes, setAllIncomes] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'today', 'week', 'month', 'all'
  
  // Pagination states
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [incomeHasMore, setIncomeHasMore] = useState(true);
  const [expenseHasMore, setExpenseHasMore] = useState(true);
  const itemsPerPage = 10;

  // Form states
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Load all data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const incomesQuery = query(collection(db, 'otherIncomes'), orderBy('createdAt', 'desc'));
        const incomesSnapshot = await getDocs(incomesQuery);
        const incomesData = incomesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllIncomes(incomesData);

        const expensesQuery = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllExpenses(expensesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter data based on selected filter type
  useEffect(() => {
    const filterData = (data) => {
      if (filterType === 'today') {
        return data.filter(item => isToday(item.createdAt));
      } else if (filterType === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return data.filter(item => new Date(item.createdAt) >= weekAgo);
      } else if (filterType === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return data.filter(item => new Date(item.createdAt) >= monthAgo);
      }
      return data;
    };

    setIncomes(filterData(allIncomes));
    setExpenses(filterData(allExpenses));
    setIncomePage(1);
    setExpensePage(1);
  }, [filterType, allIncomes, allExpenses]);

  // Pagination logic
  const paginatedIncomes = useMemo(() => {
    const start = (incomePage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    setIncomeHasMore(end < incomes.length);
    return incomes.slice(start, end);
  }, [incomes, incomePage]);

  const paginatedExpenses = useMemo(() => {
    const start = (expensePage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    setExpenseHasMore(end < expenses.length);
    return expenses.slice(start, end);
  }, [expenses, expensePage]);

  // Calculate totals
  const medicalTotals = useMemo(() => {
    let medicineCost = 0;
    let medicineSale = 0;
    let doctorFees = 0;

    records.forEach(record => {
      const recordTotals = calculateRecordTotals(record);
      medicineCost += recordTotals.medicineCost;
      medicineSale += recordTotals.medicineSale;
      doctorFees += parseFloat(record.doctorFees || 0);
    });

    const medicineProfit = medicineSale - medicineCost;
    const totalProfit = medicineProfit + doctorFees;

    return { medicineCost, medicineProfit, doctorFees, totalProfit };
  }, [records]);

  const totalOtherIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  const cashInHand = medicalTotals.totalProfit + totalOtherIncome - totalExpenses;

  // Add Income
  const addIncome = async () => {
    if (!incomeName.trim()) return alert('Please enter income name');
    if (!incomeAmount || parseFloat(incomeAmount) <= 0) return alert('Please enter a valid income amount');

    try {
      const newIncome = {
        name: incomeName.trim(),
        amount: parseFloat(incomeAmount).toFixed(2),
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'otherIncomes'), newIncome);
      const incomeWithId = { ...newIncome, id: docRef.id };

      setAllIncomes(prev => [incomeWithId, ...prev]);
      setIncomeName('');
      setIncomeAmount('');
      alert('Income added successfully!');
    } catch (error) {
      console.error('Error adding income:', error);
      alert('Failed to add income: ' + error.message);
    }
  };

  // Delete Income
  const deleteIncome = async (id) => {
    if (!window.confirm('Are you sure you want to delete this income?')) return;

    try {
      await deleteDoc(doc(db, 'otherIncomes', id));
      setAllIncomes(prev => prev.filter(income => income.id !== id));
      alert('Income deleted successfully!');
    } catch (error) {
      console.error('Error deleting income:', error);
      alert('Failed to delete income: ' + error.message);
    }
  };

  // Edit Income
  const editIncome = async (id, updatedData) => {
    try {
      await updateDoc(doc(db, 'otherIncomes', id), updatedData);
      setAllIncomes(prev => prev.map(income => 
        income.id === id ? { ...income, ...updatedData } : income
      ));
      alert('Income updated successfully!');
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating income:', error);
      alert('Failed to update income: ' + error.message);
    }
  };

  // Add Expense
  const addExpense = async () => {
    if (!expenseName.trim()) return alert('Please enter expense name');
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) return alert('Please enter a valid expense amount');

    try {
      const newExpense = {
        name: expenseName.trim(),
        amount: parseFloat(expenseAmount).toFixed(2),
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'expenses'), newExpense);
      const expenseWithId = { ...newExpense, id: docRef.id };

      setAllExpenses(prev => [expenseWithId, ...prev]);
      setExpenseName('');
      setExpenseAmount('');
      alert('Expense added successfully!');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense: ' + error.message);
    }
  };

  // Delete Expense
  const deleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      await deleteDoc(doc(db, 'expenses', id));
      setAllExpenses(prev => prev.filter(expense => expense.id !== id));
      alert('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense: ' + error.message);
    }
  };

  // Edit Expense
  const editExpense = async (id, updatedData) => {
    try {
      await updateDoc(doc(db, 'expenses', id), updatedData);
      setAllExpenses(prev => prev.map(expense => 
        expense.id === id ? { ...expense, ...updatedData } : expense
      ));
      alert('Expense updated successfully!');
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense: ' + error.message);
    }
  };

  // Filter buttons
  const FilterButton = ({ type, label }) => (
    <button
      onClick={() => setFilterType(type)}
      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
        filterType === type
          ? 'bg-indigo-600 text-white shadow-md'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Expense Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent text-center sm:text-left">
            Expense Management
          </h1>
          <button
            onClick={() => setCurrentPage('home')}
            className="bg-gray-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 text-sm sm:text-base transition-all active:scale-95"
          >
            <ArrowLeft size={16} sm:size={18} /> Back to Home
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Filter by:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterButton type="today" label="Today" />
              <FilterButton type="week" label="Last 7 Days" />
              <FilterButton type="month" label="Last 30 Days" />
              <FilterButton type="all" label="All Time" />
            </div>
          </div>
          
          {/* Filter info */}
          <div className="text-xs sm:text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Showing: {filterType === 'today' ? "Today's records" : 
                       filterType === 'week' ? "Last 7 days records" :
                       filterType === 'month' ? "Last 30 days records" :
                       "All time records"}
            {filterType !== 'all' && (
              <span className="ml-2 font-semibold text-indigo-600">
                ({incomes.length + expenses.length} entries)
              </span>
            )}
          </div>
        </div>

        {/* Financial Overview - Responsive */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatsCard 
              title="Total Profit (Medical)"
              value={medicalTotals.totalProfit}
              isCurrency
              icon={TrendingUp}
              color="purple"
            />
            <StatsCard 
              title="Other Income"
              value={totalOtherIncome}
              isCurrency
              icon={DollarSign}
              color="emerald"
            />
            <StatsCard 
              title="Total Revenue"
              value={medicalTotals.totalProfit + totalOtherIncome}
              isCurrency
              icon={TrendingUp}
              color="blue"
            />
            <StatsCard 
              title="Total Expenses"
              value={totalExpenses}
              isCurrency
              icon={TrendingDown}
              color="red"
            />
            <StatsCard 
              title="Cash in Hand"
              value={cashInHand}
              isCurrency
              icon={Wallet}
              color="teal"
            />
          </div>
        </div>

        {/* Add Income Section - Responsive */}
        <div className="border-2 border-green-200 rounded-lg p-4 sm:p-6 bg-green-50 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-green-800 mb-4">Add Other Income</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Consultation Fee, Service"
                value={incomeName}
                onChange={(e) => setIncomeName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addIncome}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm sm:text-base"
              >
                <Plus size={16} sm:size={18} /> Add Income
              </button>
            </div>
          </div>

          {/* Income List with Pagination */}
          {incomes.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Income History ({incomes.length} total)
                </h3>
                {filterType === 'all' && incomes.length > itemsPerPage && (
                  <div className="text-xs text-gray-500">
                    Page {incomePage} of {Math.ceil(incomes.length / itemsPerPage)}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-3 sm:px-5 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-3 sm:px-5 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-3 sm:px-5 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-3 sm:px-5 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedIncomes.map((income) => (
                      <tr key={income.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{formatDate(income.createdAt)}</td>
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-medium">{income.name}</td>
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm text-right font-semibold text-green-700">
                          ₨{parseFloat(income.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(income);
                                setEditType('income');
                                setShowEditModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Edit2 size={16} sm:size={18} />
                            </button>
                            <button
                              onClick={() => deleteIncome(income.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <X size={16} sm:size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filterType === 'all' && incomes.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-4 gap-2">
                  <button
                    onClick={() => setIncomePage(p => Math.max(1, p - 1))}
                    disabled={incomePage === 1}
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all flex items-center gap-1 text-sm"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600">
                    Page {incomePage} of {Math.ceil(incomes.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setIncomePage(p => incomeHasMore ? p + 1 : p)}
                    disabled={!incomeHasMore}
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all flex items-center gap-1 text-sm"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Expense Section - Responsive */}
        <div className="border-2 border-red-200 rounded-lg p-4 sm:p-6 bg-red-50 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-4">Add Expense</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Rent, Utilities, Salary"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 text-sm sm:text-base"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addExpense}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm sm:text-base"
              >
                <Plus size={16} sm:size={18} /> Add Expense
              </button>
            </div>
          </div>

          {/* Expense List with Pagination */}
          {expenses.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Expense History ({expenses.length} total)
                </h3>
                {filterType === 'all' && expenses.length > itemsPerPage && (
                  <div className="text-xs text-gray-500">
                    Page {expensePage} of {Math.ceil(expenses.length / itemsPerPage)}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-3 sm:px-5 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-3 sm:px-5 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-3 sm:px-5 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-3 sm:px-5 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExpenses.map((expense) => (
                      <tr key={expense.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">{formatDate(expense.createdAt)}</td>
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-medium">{expense.name}</td>
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm text-right font-semibold text-red-700">
                          ₨{parseFloat(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 sm:px-5 py-2 sm:py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(expense);
                                setEditType('expense');
                                setShowEditModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Edit2 size={16} sm:size={18} />
                            </button>
                            <button
                              onClick={() => deleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <X size={16} sm:size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filterType === 'all' && expenses.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-4 gap-2">
                  <button
                    onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                    disabled={expensePage === 1}
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all flex items-center gap-1 text-sm"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600">
                    Page {expensePage} of {Math.ceil(expenses.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setExpensePage(p => expenseHasMore ? p + 1 : p)}
                    disabled={!expenseHasMore}
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all flex items-center gap-1 text-sm"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed Breakdown - Responsive */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-indigo-800 mb-4">Detailed Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Package size={18} sm:size={20} className="text-purple-600" />
                Medical Profit Components
              </h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">Medicine Cost:</span>
                  <span className="font-semibold text-red-600">-₨{medicalTotals.medicineCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Medicine Profit:</span>
                  <span className="font-semibold text-green-600">₨{medicalTotals.medicineProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Doctor Fees:</span>
                  <span className="font-semibold text-blue-600">₨{medicalTotals.doctorFees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-purple-200">
                  <span className="font-bold text-gray-800">Total Medical Profit:</span>
                  <span className="font-bold text-purple-600">₨{medicalTotals.totalProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 sm:p-4 shadow">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Calculator size={18} sm:size={20} className="text-teal-600" />
                Final Calculation
              </h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">Medical Profit:</span>
                  <span className="font-semibold text-purple-600">₨{medicalTotals.totalProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Other Income:</span>
                  <span className="font-semibold text-green-600">+₨{totalOtherIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Expenses:</span>
                  <span className="font-semibold text-red-600">-₨{totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-teal-200">
                  <span className="font-bold text-gray-800">Cash in Hand:</span>
                  <span className="font-bold text-teal-600 text-base sm:text-xl">₨{cashInHand.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        item={editingItem}
        type={editType}
        onSave={(updatedData) => {
          if (editType === 'income' && editingItem) {
            editIncome(editingItem.id, updatedData);
          } else if (editType === 'expense' && editingItem) {
            editExpense(editingItem.id, updatedData);
          }
        }}
      />
    </div>
  );
}