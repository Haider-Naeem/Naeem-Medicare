// C:/Users/haide/Desktop/Naeem Medicare/src/components/Inventory.jsx
import React, { useState } from 'react';
import { Package, Trash2, Download, Home, Plus, X, Search, Edit2 } from 'lucide-react';
import { exportInventoryToCSV } from '../utils/calculations';

export default function Inventory({ inventory, setInventory, setCurrentPage, clearAllData }) {
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
    totalPacks: 1,
  });

  const saveMedicineToInventory = () => {
    if (!newMedicine.name || !newMedicine.strength) {
      alert('Please fill in medicine name and strength');
      return;
    }
    const totalUnits = newMedicine.totalPacks * newMedicine.unitsPerPack;
    if (editingMedicine) {
      const currentMed = inventory.find((m) => m.id === editingMedicine.id);
      const updatedMed = {
        ...newMedicine,
        id: editingMedicine.id,
        totalUnits: currentMed.totalUnits,
      };
      setInventory(inventory.map((med) => (med.id === editingMedicine.id ? updatedMed : med)));
      setEditingMedicine(null);
    } else {
      const newMed = {
        ...newMedicine,
        id: Date.now(),
        totalUnits,
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
      totalPacks: 1,
    });
    setShowAddMedicine(false);
  };

  const updateInventoryStock = (medicineId, packsToAdd) => {
    setInventory(
      inventory.map((med) => {
        if (med.id === medicineId) {
          const unitsToAdd = packsToAdd * med.unitsPerPack;
          return {
            ...med,
            totalPacks: med.totalPacks + packsToAdd,
            totalUnits: med.totalUnits + unitsToAdd,
          };
        }
        return med;
      })
    );
  };

  const startEditMedicine = (medicine) => {
    setNewMedicine({
      name: medicine.name,
      strength: medicine.strength,
      type: medicine.type,
      packPurchaseRate: medicine.packPurchaseRate,
      packRetailRate: medicine.packRetailRate,
      unitsPerPack: medicine.unitsPerPack,
      totalPacks: Math.floor(medicine.totalUnits / medicine.unitsPerPack),
    });
    setEditingMedicine(medicine);
    setShowAddMedicine(true);
  };

  const deleteMedicineFromInventory = (id) => {
    if (window.confirm('Are you sure you want to delete this medicine from inventory?')) {
      setInventory(inventory.filter((med) => med.id !== id));
    }
  };

  const filteredInventory = inventory.filter((med) => {
    const fullName = `${med.name} ${med.strength}`;
    return fullName.toLowerCase().includes(inventorySearch.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-0">
              <Package className="text-purple-600" size={28} />
              <h1 className="text-2xl sm:text-3xl font-bold text-purple-900">Medicine Inventory Management</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={clearAllData}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center gap-2 w-full sm:w-auto"
              >
                <Trash2 size={18} /> Clear All Data
              </button>
              <button
                onClick={() => setCurrentPage('home')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 w-full sm:w-auto"
              >
                <Home size={18} /> Home
              </button>
              <button
                onClick={() => exportInventoryToCSV(inventory)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 w-full sm:w-auto"
              >
                <Download size={18} /> Export Inventory
              </button>
            </div>
          </div>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search medicines by name or strength..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setShowAddMedicine(!showAddMedicine);
              setEditingMedicine(null);
              setNewMedicine({
                name: '',
                strength: '',
                type: 'Tablet',
                packPurchaseRate: 0,
                packRetailRate: 0,
                unitsPerPack: 1,
                totalPacks: 1,
              });
            }}
            className="mb-6 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 flex items-center gap-2 font-semibold w-full sm:w-auto"
          >
            {showAddMedicine ? <X size={20} /> : <Plus size={20} />}
            {showAddMedicine ? 'Cancel' : 'Add New Medicine'}
          </button>
          {showAddMedicine && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 sm:p-6 mb-6">
              <h3 className="font-semibold text-purple-900 text-lg mb-4">
                {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Panadol"
                    value={newMedicine.name}
                    onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strength *</label>
                  <input
                    type="text"
                    placeholder="e.g., 500mg"
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
                    placeholder="10"
                    value={newMedicine.unitsPerPack}
                    onChange={(e) => setNewMedicine({ ...newMedicine, unitsPerPack: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pack Purchase Rate (Rs.)</label>
                  <input
                    type="number"
                    placeholder="45.00"
                    value={newMedicine.packPurchaseRate}
                    onChange={(e) => setNewMedicine({ ...newMedicine, packPurchaseRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pack Retail Rate (Rs.)</label>
                  <input
                    type="number"
                    placeholder="60.00"
                    value={newMedicine.packRetailRate}
                    onChange={(e) => setNewMedicine({ ...newMedicine, packRetailRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Packs</label>
                  <input
                    type="number"
                    placeholder="3"
                    value={newMedicine.totalPacks}
                    onChange={(e) => setNewMedicine({ ...newMedicine, totalPacks: parseInt(e.target.value) || 1 })}
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
              <div className="bg-white p-3 rounded border border-gray-300">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Total Units:</span> {newMedicine.unitsPerPack * newMedicine.totalPacks} |{' '}
                  <span className="font-semibold ml-3">Purchase/Unit:</span> Rs.{' '}
                  {newMedicine.unitsPerPack > 0 ? (newMedicine.packPurchaseRate / newMedicine.unitsPerPack).toFixed(2) : '0.00'} |{' '}
                  <span className="font-semibold ml-3">Retail/Unit:</span> Rs.{' '}
                  {newMedicine.unitsPerPack > 0 ? (newMedicine.packRetailRate / newMedicine.unitsPerPack).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-purple-600 text-white">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Medicine</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Strength</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Type</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Pack Purchase</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Pack Retail</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Units/Pack</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Total Packs</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Stock (Units)</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Purchase/Unit</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right">Retail/Unit</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Update Stock</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((med, index) => (
                  <tr
                    key={med.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-purple-50'} ${
                      med.totalUnits === 0 ? 'bg-red-100' : med.totalUnits < 10 ? 'bg-yellow-100' : ''
                    } border-b hover:bg-purple-100`}
                  >
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">
                      {med.name} {med.totalUnits === 0 && <span className="ml-2 text-red-600 text-xs font-bold">[Out of Stock]</span>}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">{med.strength}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className="bg-gray-200 px-2 py-1 rounded text-xs">{med.type}</span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">Rs. {med.packPurchaseRate.toFixed(2)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">Rs. {med.packRetailRate.toFixed(2)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">{med.unitsPerPack}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold">{Math.floor(med.totalUnits / med.unitsPerPack)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold">
                      <span className={med.totalUnits === 0 ? 'text-red-600' : med.totalUnits < 10 ? 'text-yellow-600' : 'text-green-600'}>
                        {med.totalUnits}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-blue-600">Rs. {(med.packPurchaseRate / med.unitsPerPack).toFixed(2)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-green-600">Rs. {(med.packRetailRate / med.unitsPerPack).toFixed(2)}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className="flex gap-1 items-center justify-center">
                        <input
                          type="number"
                          placeholder="Packs"
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          id={`stock-${med.id}`}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById(`stock-${med.id}`);
                            const packs = parseInt(input.value) || 0;
                            if (packs > 0) {
                              updateInventoryStock(med.id, packs);
                              input.value = '';
                            }
                          }}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => startEditMedicine(med)} className="text-blue-600 hover:text-blue-800" title="Edit Medicine">
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteMedicineFromInventory(med.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Medicine"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredInventory.length === 0 && <div className="text-center py-8 text-gray-500">No medicines found in inventory</div>}
          </div>
        </div>
      </div>
    </div>
  );
}