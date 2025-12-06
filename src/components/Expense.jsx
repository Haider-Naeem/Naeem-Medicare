// src/components/Expense.jsx
import React, { useState, useEffect } from 'react';
import { Plus, X, TrendingUp, DollarSign, TrendingDown, Wallet, Package, Calculator, ArrowLeft } from 'lucide-react';
import { collection, addDoc, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { calculateRecordTotals } from '../utils/calculations';

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

export default function Expense({ setCurrentPage, records }) {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Load data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const incomesSnapshot = await getDocs(collection(db, 'otherIncomes'));
        const incomesData = incomesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setIncomes(incomesData);

        const expensesSnapshot = await getDocs(collection(db, 'expenses'));
        const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExpenses(expensesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate overall totals from patient records
  const medicalTotals = React.useMemo(() => {
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

    return {
      medicineCost,
      medicineProfit,
      doctorFees,
      totalProfit
    };
  }, [records]);

  // Calculate other income total
  const totalOtherIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount || 0), 0);

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);

  // Calculate cash in hand
  const cashInHand = medicalTotals.totalProfit + totalOtherIncome - totalExpenses;

  // Add Income
  const addIncome = async () => {
    if (!incomeName.trim()) {
      alert('Please enter income name');
      return;
    }
    if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
      alert('Please enter a valid income amount');
      return;
    }

    try {
      const newIncome = {
        name: incomeName.trim(),
        amount: parseFloat(incomeAmount).toFixed(2),
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'otherIncomes'), newIncome);
      const incomeWithId = { ...newIncome, id: docRef.id };
      await setDoc(doc(db, 'otherIncomes', docRef.id), { id: docRef.id }, { merge: true });

      setIncomes(prev => [...prev, incomeWithId]);
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
      setIncomes(prev => prev.filter(income => income.id !== id));
      alert('Income deleted successfully!');
    } catch (error) {
      console.error('Error deleting income:', error);
      alert('Failed to delete income: ' + error.message);
    }
  };

  // Add Expense
  const addExpense = async () => {
    if (!expenseName.trim()) {
      alert('Please enter expense name');
      return;
    }
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    try {
      const newExpense = {
        name: expenseName.trim(),
        amount: parseFloat(expenseAmount).toFixed(2),
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'expenses'), newExpense);
      const expenseWithId = { ...newExpense, id: docRef.id };
      await setDoc(doc(db, 'expenses', docRef.id), { id: docRef.id }, { merge: true });

      setExpenses(prev => [...prev, expenseWithId]);
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
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      alert('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Expense Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Expense Management
          </h1>
          <button
            onClick={() => setCurrentPage('home')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 mt-4 sm:mt-0"
          >
            <ArrowLeft size={18} /> Back to Home
          </button>
        </div>

        {/* Financial Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        {/* Add Income Section */}
        <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50 mb-6">
          <h2 className="text-xl font-semibold text-green-800 mb-4">Add Other Income</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Consultation Fee, Service"
                value={incomeName}
                onChange={(e) => setIncomeName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addIncome}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Add Income
              </button>
            </div>
          </div>

          {/* Income List */}
          {incomes.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Income History</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map((income) => (
                      <tr key={income.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{income.name}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-green-600">
                          ₨{parseFloat(income.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => deleteIncome(income.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Add Expense Section */}
        <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50 mb-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">Add Expense</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Rent, Utilities, Salary"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addExpense}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Add Expense
              </button>
            </div>
          </div>

          {/* Expense List */}
          {expenses.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Expense History</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{expense.name}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-red-600">
                          ₨{parseFloat(expense.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-indigo-800 mb-4">Detailed Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Medical Profit Breakdown */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Package size={20} className="text-purple-600" />
                Medical Profit Components
              </h3>
              <div className="space-y-2">
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

            {/* Final Calculation */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Calculator size={20} className="text-teal-600" />
                Final Calculation
              </h3>
              <div className="space-y-2">
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