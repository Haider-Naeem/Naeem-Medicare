// src/components/Inventory.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Download, Package, Edit2, X, Search, Home,
  ArrowUpDown,
} from 'lucide-react';
import {
  collection, doc, setDoc, deleteDoc, addDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '../utils/firebase';

// ---------------------------------------------------------------
// SummaryCard (unchanged)
// ---------------------------------------------------------------
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

export default function Inventory({
  inventory: propInventory,
  setInventory: setPropInventory,
  setCurrentPage,
  clearAllData,
}) {
  // -------------------------------------------------------------
  // UI state
  // -------------------------------------------------------------
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [newMedicine, setNewMedicine] = useState({
    name: '',
    strength: '',
    type: 'Tablet',
    packPurchaseRate: 0,
    packRetailRate: 0,
    unitsPerPack: 1,
    initialPacks: 0,      // NEW – full packs
    initialLooseUnits: 0, // NEW – extra units not in a full pack
  });

  // -------------------------------------------------------------
  // REAL-TIME FIRESTORE SYNC
  // -------------------------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'medicines'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPropInventory(data);
    });
    return () => unsub();
  }, [setPropInventory]);

  // -------------------------------------------------------------
  // HELPERS – totals & CSV
  // -------------------------------------------------------------
  const calculateInventoryTotals = (inv) => {
    let totalPurchase = 0;
    let totalRetail = 0;
    inv.forEach((med) => {
      totalPurchase += (med.purchasePerUnit || 0) * (med.totalUnits || 0);
      totalRetail   += (med.retailPerUnit   || 0) * (med.totalUnits || 0);
    });
    return { totalPurchase, totalRetail };
  };
  const { totalPurchase, totalRetail } = calculateInventoryTotals(propInventory);

  const exportInventoryToCSV = (inv) => {
    const headers = [
      'Medicine Name','Strength','Type','Pack Purchase Rate',
      'Pack Retail Rate','Units Per Pack','Total Packs',
      'Total Units','Purchase Per Unit','Retail Per Unit',
    ];
    const rows = inv.map((med) => [
      med.name,
      med.strength,
      med.type,
      med.packPurchaseRate,
      med.packRetailRate,
      med.unitsPerPack,
      Math.floor(med.totalUnits / med.unitsPerPack),
      med.totalUnits,
      (med.purchasePerUnit || 0).toFixed(2),
      (med.retailPerUnit   || 0).toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // SAVE / UPDATE MEDICINE
  // -------------------------------------------------------------
  const saveMedicineToInventory = async () => {
    if (!newMedicine.name.trim() || !newMedicine.strength.trim()) {
      alert('Medicine name and strength are required.');
      return;
    }

    const purchasePerUnit = newMedicine.packPurchaseRate / newMedicine.unitsPerPack;
    const retailPerUnit   = newMedicine.packRetailRate   / newMedicine.unitsPerPack;

    const baseObj = {
      name: newMedicine.name,
      strength: newMedicine.strength,
      type: newMedicine.type,
      packPurchaseRate: newMedicine.packPurchaseRate,
      packRetailRate:   newMedicine.packRetailRate,
      unitsPerPack:     newMedicine.unitsPerPack,
      purchasePerUnit,
      retailPerUnit,
    };

    try {
      if (editingMedicine) {
        // ---- EDIT: keep existing totalUnits ----
        const existing = propInventory.find(m => m.id === editingMedicine.id);
        const updated = {
          ...baseObj,
          totalUnits: existing.totalUnits,
          totalPacks: Math.floor(existing.totalUnits / newMedicine.unitsPerPack),
          stockStatus: existing.totalUnits > 0 ? 'In Stock' : 'Out of Stock',
        };
        await setDoc(doc(db, 'medicines', editingMedicine.id), updated, { merge: true });
      } else {
        // ---- NEW: packs + loose units ----
        const totalUnits = newMedicine.initialPacks * newMedicine.unitsPerPack + newMedicine.initialLooseUnits;
        const newMed = {
          ...baseObj,
          totalUnits,
          totalPacks: Math.floor(totalUnits / newMedicine.unitsPerPack),
          stockStatus: totalUnits > 0 ? 'In Stock' : 'Out of Stock',
        };
        await addDoc(collection(db, 'medicines'), newMed);
      }

      // ---- reset form ----
      setNewMedicine({
        name: '',
        strength: '',
        type: 'Tablet',
        packPurchaseRate: 0,
        packRetailRate: 0,
        unitsPerPack: 1,
        initialPacks: 0,
        initialLooseUnits: 0,
      });
      setEditingMedicine(null);
      setShowAddMedicine(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save: ' + e.message);
    }
  };

  // -------------------------------------------------------------
  // EDIT
  // -------------------------------------------------------------
  const editMedicine = (med) => {
    const fullPacks = Math.floor(med.totalUnits / med.unitsPerPack);
    const loose = med.totalUnits % med.unitsPerPack;

    setEditingMedicine(med);
    setNewMedicine({
      name: med.name,
      strength: med.strength,
      type: med.type,
      packPurchaseRate: med.packPurchaseRate,
      packRetailRate: med.packRetailRate,
      unitsPerPack: med.unitsPerPack,
      initialPacks: fullPacks,
      initialLooseUnits: loose,
    });
    setShowAddMedicine(true);
  };

  // -------------------------------------------------------------
  // UPDATE STOCK (packs + loose units)
  // -------------------------------------------------------------
  const updateStock = async (medicineId) => {
    const med = propInventory.find(m => m.id === medicineId);
    if (!med) return;

    const promptText = `Current: ${med.totalUnits} units (${Math.floor(med.totalUnits / med.unitsPerPack)} packs + ${med.totalUnits % med.unitsPerPack} loose)\n` +
                       `Enter packs to add/sub (e.g. +2 or -1) OR loose units (e.g. +5u or -3u):`;

    const input = window.prompt(promptText);
    if (input === null) return;

    let packsDelta = 0;
    let unitsDelta = 0;

    const matchPacks = input.match(/^([+-]?\d+)$/);
    const matchUnits = input.match(/^([+-]?\d+)u$/i);

    if (matchPacks) {
      packsDelta = parseInt(matchPacks[1], 10) || 0;
    } else if (matchUnits) {
      unitsDelta = parseInt(matchUnits[1], 10) || 0;
    } else {
      alert('Invalid format. Use +2, -1, +5u, -3u');
      return;
    }

    const newTotalUnits = Math.max(0, med.totalUnits + packsDelta * med.unitsPerPack + unitsDelta);

    try {
      await setDoc(
        doc(db, 'medicines', medicineId),
        {
          totalUnits: newTotalUnits,
          totalPacks: Math.floor(newTotalUnits / med.unitsPerPack),
          stockStatus: newTotalUnits > 0 ? 'In Stock' : 'Out of Stock',
        },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
      alert('Failed to update stock.');
    }
  };

  // -------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------
  const deleteMedicine = async (id) => {
    if (!window.confirm('Delete this medicine permanently?')) return;
    try {
      await deleteDoc(doc(db, 'medicines', id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete.');
    }
  };

  // -------------------------------------------------------------
  // FILTER + SORT
  // -------------------------------------------------------------
  const filteredAndSorted = useMemo(() => {
    let list = propInventory.filter((m) =>
      `${m.name} ${m.strength}`.toLowerCase().includes(inventorySearch.toLowerCase())
    );

    const statusWeight = (status) => {
      if (status === 'Out of Stock') return 0;
      if (status === 'Low Stock') return 1;
      return 2; // In Stock
    };

    if (sortConfig.key) {
      list.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'stockStatus') {
          aVal = statusWeight(aVal);
          bVal = statusWeight(bVal);
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [propInventory, inventorySearch, sortConfig]);

  // -------------------------------------------------------------
  // SORT HANDLER
  // -------------------------------------------------------------
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (column) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ? <ArrowUpDown size={14} /> : <ArrowUpDown size={14} className="rotate-180" />;
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">

        {/* ---------- HEADER ---------- */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <Package className="text-purple-600" size={28} />
            <h1 className="text-3xl font-bold text-purple-900">Medicine Inventory</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setCurrentPage('home')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <Home size={18} /> Home
            </button>
            <button
              onClick={() => exportInventoryToCSV(propInventory)}
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

        {/* ---------- SUMMARY CARDS ---------- */}
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

        {/* ---------- SEARCH ---------- */}
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

        {/* ---------- ADD / CANCEL ---------- */}
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
                initialPacks: 0,
                initialLooseUnits: 0,
              });
            }
          }}
          className="mb-6 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 flex items-center gap-2"
        >
          {showAddMedicine ? <X size={20} /> : <Plus size={20} />}
          {showAddMedicine ? 'Cancel' : 'Add Medicine'}
        </button>

        {/* ---------- FORM ---------- */}
        {showAddMedicine && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-lg text-purple-900 mb-4">
              {editingMedicine ? 'Edit Medicine Details' : 'Add New Medicine'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Strength */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strength *</label>
                <input
                  type="text"
                  value={newMedicine.strength}
                  onChange={(e) => setNewMedicine({ ...newMedicine, strength: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Type */}
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

              {/* Units Per Pack */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Units Per Pack</label>
                <input
                  type="number"
                  min="1"
                  value={newMedicine.unitsPerPack}
                  onChange={(e) =>
                    setNewMedicine({
                      ...newMedicine,
                      unitsPerPack: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Pack Purchase Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pack Purchase Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMedicine.packPurchaseRate}
                  onChange={(e) =>
                    setNewMedicine({
                      ...newMedicine,
                      packPurchaseRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Pack Retail Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pack Retail Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMedicine.packRetailRate}
                  onChange={(e) =>
                    setNewMedicine({
                      ...newMedicine,
                      packRetailRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Initial Packs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Packs</label>
                <input
                  type="number"
                  min="0"
                  value={newMedicine.initialPacks}
                  onChange={(e) =>
                    setNewMedicine({
                      ...newMedicine,
                      initialPacks: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Initial Loose Units */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Loose Units</label>
                <input
                  type="number"
                  min="0"
                  max={newMedicine.unitsPerPack - 1}
                  value={newMedicine.initialLooseUnits}
                  onChange={(e) =>
                    setNewMedicine({
                      ...newMedicine,
                      initialLooseUnits: Math.min(parseInt(e.target.value) || 0, newMedicine.unitsPerPack - 1),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* SAVE */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex items-end">
                <button
                  onClick={saveMedicineToInventory}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-semibold"
                >
                  {editingMedicine ? 'Update Details' : 'Save Medicine'}
                </button>
              </div>
            </div>

            {editingMedicine && (
              <div className="mt-2 text-sm text-gray-600 italic">
                Note: Editing only updates medicine details. Use “Update Stock” to change quantity.
              </div>
            )}
          </div>
        )}

        {/* ---------- TABLE ---------- */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-purple-600 text-white">
                <th className="p-3 text-left cursor-pointer" onClick={() => requestSort('name')}>
                  Medicine {getSortIcon('name')}
                </th>
                <th className="p-3 text-left cursor-pointer" onClick={() => requestSort('type')}>
                  Type {getSortIcon('type')}
                </th>
                <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('packPurchaseRate')}>
                  Purchase/Pack {getSortIcon('packPurchaseRate')}
                </th>
                <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('packRetailRate')}>
                  Retail/Pack {getSortIcon('packRetailRate')}
                </th>
                <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('unitsPerPack')}>
                  Units/Pack {getSortIcon('unitsPerPack')}
                </th>
                <th className="p-3 text-right">Total Packs</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('totalUnits')}>
                  Total Units {getSortIcon('totalUnits')}
                </th>
                <th className="p-3 text-center cursor-pointer" onClick={() => requestSort('stockStatus')}>
                  Status {getSortIcon('stockStatus')}
                </th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((med, idx) => {
                const fullPacks = Math.floor(med.totalUnits / med.unitsPerPack);
                const loose = med.totalUnits % med.unitsPerPack;
                const status =
                  med.totalUnits > 10 ? 'In Stock' :
                  med.totalUnits > 0 ? 'Low Stock' : 'Out of Stock';

                return (
                  <tr key={med.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-3">
                      <div className="font-semibold">{med.name}</div>
                      <div className="text-sm text-gray-600">{med.strength}</div>
                    </td>
                    <td className="p-3">{med.type}</td>
                    <td className="p-3 text-right">Rs. {med.packPurchaseRate.toFixed(2)}</td>
                    <td className="p-3 text-right">Rs. {med.packRetailRate.toFixed(2)}</td>
                    <td className="p-3 text-right">{med.unitsPerPack}</td>
                    <td className="p-3 text-right">{fullPacks}</td>
                    <td className="p-3 text-right font-semibold">{med.totalUnits}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        status === 'In Stock' ? 'bg-green-200 text-green-800' :
                        status === 'Low Stock' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => editMedicine(med)}
                          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                          title="Edit Details"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => updateStock(med.id)}
                          className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                          title="Update Stock (packs or loose units)"
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
                );
              })}
            </tbody>
          </table>

          {filteredAndSorted.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No medicines found. Add your first medicine to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}