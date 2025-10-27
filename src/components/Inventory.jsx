import React, { useState } from 'react';
import { Plus, Trash2, Download, Package, Edit2, X, Search, Home } from 'lucide-react';

// SummaryCard Component
const SummaryCard = ({ title, value, icon, bgColor }) => (
  <div className={`${bgColor} rounded-lg p-6 shadow-md`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

export default function Inventory({ inventory, setInventory, setPage, clearAllData }) {
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    strength: '',
    type: 'Tablet',
    packPurchaseRate: 0,
    packRetailRate: 0,
    unitsPerPack: 1,
    totalPacks: 1
  });

  // Calculate inventory totals
  const calculateInventoryTotals = (inventory) => {
    let totalPurchase = 0;
    let totalRetail = 0;
    inventory.forEach(med => {
      totalPurchase += med.packPurchaseRate * med.totalPacks;
      totalRetail += med.packRetailRate * med.totalPacks;
    });
    return { totalPurchase, totalRetail };
  };

  const { totalPurchase, totalRetail } = calculateInventoryTotals(inventory);

  // Export to CSV function
  const exportInventoryToCSV = (inventory) => {
    const headers = [
      'Medicine Name',
      'Strength',
      'Type',
      'Pack Purchase Rate',
      'Pack Retail Rate',
      'Units Per Pack',
      'Total Packs',
      'Total Units',
      'Purchase Per Unit',
      'Retail Per Unit'
    ];
    
    const rows = inventory.map(med => [
      med.name,
      med.strength,
      med.type,
      med.packPurchaseRate,
      med.packRetailRate,
      med.unitsPerPack,
      med.totalPacks,
      med.totalUnits,
      (med.packPurchaseRate / med.unitsPerPack).toFixed(2),
      (med.packRetailRate / med.unitsPerPack).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Save/Update Medicine
  const saveMedicineToInventory = () => {
    if (!newMedicine.name.trim() || !newMedicine.strength.trim()) {
      alert('Medicine name and strength are required.');
      return;
    }
    
    const totalUnits = newMedicine.totalPacks * newMedicine.unitsPerPack;
    const purchasePerUnit = newMedicine.packPurchaseRate / newMedicine.unitsPerPack;
    const retailPerUnit = newMedicine.packRetailRate / newMedicine.unitsPerPack;
    
    if (editingMedicine) {
      const existingMed = inventory.find(m => m.id === editingMedicine.id);
      const updatedMed = {
        ...newMedicine,
        id: editingMedicine.id,
        totalUnits: existingMed.totalUnits,
        purchasePerUnit,
        retailPerUnit,
        stockStatus: existingMed.totalUnits > 0 ? 'In Stock' : 'Out of Stock'
      };
      setInventory(inventory.map(m => (m.id === editingMedicine.id ? updatedMed : m)));
      setEditingMedicine(null);
    } else {
      const newMed = {
        ...newMedicine,
        id: Date.now().toString(),
        totalUnits,
        purchasePerUnit,
        retailPerUnit,
        stockStatus: totalUnits > 0 ? 'In Stock' : 'Out of Stock'
      };
      setInventory([...inventory, newMed]);
    }
    
    setNewMedicine({
      name: '',
      strength: '',
      type: 'Tablet',
      packPurchaseRate: 0,
      packRetailRate: 0,
      unitsPerPack: 1,
      totalPacks: 1
    });
    setShowAddMedicine(false);
  };

  const editMedicine = (medicine) => {
    setEditingMedicine(medicine);
    setNewMedicine({
      name: medicine.name,
      strength: medicine.strength,
      type: medicine.type,
      packPurchaseRate: medicine.packPurchaseRate,
      packRetailRate: medicine.packRetailRate,
      unitsPerPack: medicine.unitsPerPack,
      totalPacks: medicine.totalPacks
    });
    setShowAddMedicine(true);
  };

  const updateStock = (medicineId, packsToAdd) => {
    setInventory(inventory.map(m => {
      if (m.id === medicineId) {
        const unitsToAdd = packsToAdd * m.unitsPerPack;
        const newTotalPacks = m.totalPacks + packsToAdd;
        const newTotalUnits = m.totalUnits + unitsToAdd;
        return {
          ...m,
          totalPacks: newTotalPacks,
          totalUnits: newTotalUnits,
          stockStatus: newTotalUnits > 0 ? 'In Stock' : 'Out of Stock'
        };
      }
      return m;
    }));
  };

  const deleteMedicine = (id) => {
    if (confirm('Are you sure you want to delete this medicine?')) {
      setInventory(inventory.filter(m => m.id !== id));
    }
  };

  const filteredInventory = inventory.filter(m =>
    `${m.name} ${m.strength}`.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <Package className="text-purple-600" size={28} />
            <h1 className="text-3xl font-bold text-purple-900">Medicine Inventory</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setPage('home')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <Home size={18} /> Home
            </button>
            <button
              onClick={() => exportInventoryToCSV(inventory)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Download size={18} /> Export
            </button>
            <button
              onClick={clearAllData}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 size={18} /> Clear All
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <SummaryCard
            title="Total Purchase Cost"
            value={`Rs. ${totalPurchase.toFixed(2)}`}
            icon={<Package className="text-purple-600" />}
            bgColor="bg-purple-100"
          />
          <SummaryCard
            title="Total Retail Value"
            value={`Rs. ${totalRetail.toFixed(2)}`}
            icon={<Download className="text-green-600" />}
            bgColor="bg-green-100"
          />
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search medicines..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Add Medicine Button */}
        <button
          onClick={() => {
            setShowAddMedicine(!showAddMedicine);
            if (showAddMedicine) {
              setEditingMedicine(null);
              setNewMedicine({
                name: '',
                strength: '',
                type: 'Tablet',
                packPurchaseRate: 0,
                packRetailRate: 0,
                unitsPerPack: 1,
                totalPacks: 1
              });
            }
          }}
          className="mb-6 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 flex items-center gap-2"
        >
          {showAddMedicine ? <X size={20} /> : <Plus size={20} />}
          {showAddMedicine ? 'Cancel' : 'Add Medicine'}
        </button>

        {/* Add/Edit Medicine Form */}
        {showAddMedicine && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-lg text-purple-900 mb-4">
              {editingMedicine ? 'Edit Medicine' : 'Add Medicine'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strength *</label>
                <input
                  type="text"
                  value={newMedicine.strength}
                  onChange={(e) => setNewMedicine({ ...newMedicine, strength: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newMedicine.type}
                  onChange={(e) => setNewMedicine({ ...newMedicine, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Drops">Drops</option>
                  <option value="Cream">Cream</option>
                  <option value="Ointment">Ointment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units Per Pack</label>
                <input
                  type="number"
                  value={newMedicine.unitsPerPack}
                  onChange={(e) => setNewMedicine({ ...newMedicine, unitsPerPack: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pack Purchase Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMedicine.packPurchaseRate}
                  onChange={(e) => setNewMedicine({ ...newMedicine, packPurchaseRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pack Retail Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMedicine.packRetailRate}
                  onChange={(e) => setNewMedicine({ ...newMedicine, packRetailRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Packs</label>
                <input
                  type="number"
                  value={newMedicine.totalPacks}
                  onChange={(e) => setNewMedicine({ ...newMedicine, totalPacks: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={saveMedicineToInventory}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-semibold"
                >
                  {editingMedicine ? 'Update Medicine' : 'Save Medicine'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-purple-600 text-white">
                <th className="p-3 text-left">Medicine</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Purchase/Pack</th>
                <th className="p-3 text-right">Retail/Pack</th>
                <th className="p-3 text-right">Units/Pack</th>
                <th className="p-3 text-right">Packs</th>
                <th className="p-3 text-right">Total Units</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((med, idx) => (
                <tr key={med.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-3">
                    <div className="font-semibold">{med.name}</div>
                    <div className="text-sm text-gray-600">{med.strength}</div>
                  </td>
                  <td className="p-3">{med.type}</td>
                  <td className="p-3 text-right">Rs. {med.packPurchaseRate.toFixed(2)}</td>
                  <td className="p-3 text-right">Rs. {med.packRetailRate.toFixed(2)}</td>
                  <td className="p-3 text-right">{med.unitsPerPack}</td>
                  <td className="p-3 text-right">{med.totalPacks}</td>
                  <td className="p-3 text-right font-semibold">{med.totalUnits}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      med.totalUnits > 10 ? 'bg-green-200 text-green-800' :
                      med.totalUnits > 0 ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {med.totalUnits > 10 ? 'In Stock' : med.totalUnits > 0 ? 'Low Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => editMedicine(med)}
                        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const packs = prompt('Enter packs to add (negative to subtract):');
                          if (packs) updateStock(med.id, parseInt(packs));
                        }}
                        className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                        title="Update Stock"
                      >
                        <Package size={16} />
                      </button>
                      <button
                        onClick={() => deleteMedicine(med.id)}
                        className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInventory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No medicines found. Add your first medicine to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}