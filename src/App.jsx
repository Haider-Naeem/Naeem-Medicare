import React, { useState } from 'react';
import { Plus, Trash2, Download, Calculator, Package, Edit2, X, Search, Home } from 'lucide-react';

// Initial test medicines
const INITIAL_MEDICINES = [
  {
    id: 1,
    name: 'Panadol',
    strength: '500mg',
    type: 'Tablet',
    packPurchaseRate: 45.00,
    packRetailRate: 60.00,
    unitsPerPack: 10,
    totalPacks: 3,
    totalUnits: 30
  },
  {
    id: 2,
    name: 'Augmentin',
    strength: '625mg',
    type: 'Tablet',
    packPurchaseRate: 380.00,
    packRetailRate: 450.00,
    unitsPerPack: 6,
    totalPacks: 5,
    totalUnits: 30
  },
  {
    id: 3,
    name: 'Brufen',
    strength: '400mg',
    type: 'Tablet',
    packPurchaseRate: 85.00,
    packRetailRate: 110.00,
    unitsPerPack: 15,
    totalPacks: 2,
    totalUnits: 30
  }
];

export default function MedicalRecordsApp() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' or 'inventory'
  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('medicalInventory');
    return saved ? JSON.parse(saved) : INITIAL_MEDICINES;
  });
  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('medicalRecords');
    return saved ? JSON.parse(saved) : [];
  });
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

  const [currentRecord, setCurrentRecord] = useState({
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    medicines: [],
    doctorFees: 0
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState({
    medicineId: null,
    name: '',
    fullName: '',
    quantity: 1,
    purchasePerUnit: 0,
    retailPerUnit: 0,
    pricePerUnit: 0,
    discount: 0
  });

  // Save to localStorage whenever inventory or records change
  React.useEffect(() => {
    localStorage.setItem('medicalInventory', JSON.stringify(inventory));
  }, [inventory]);

  React.useEffect(() => {
    localStorage.setItem('medicalRecords', JSON.stringify(records));
  }, [records]);

  // Add or update medicine in inventory
  const saveMedicineToInventory = () => {
    if (!newMedicine.name || !newMedicine.strength) {
      alert('Please fill in medicine name and strength');
      return;
    }

    const totalUnits = newMedicine.totalPacks * newMedicine.unitsPerPack;

    if (editingMedicine) {
      // When editing, preserve the current stock and adjust based on new pack size
      const currentMed = inventory.find(m => m.id === editingMedicine.id);
      const updatedMed = {
        ...newMedicine,
        id: editingMedicine.id,
        totalUnits: currentMed.totalUnits // Keep current stock when editing
      };
      setInventory(inventory.map(med => 
        med.id === editingMedicine.id ? updatedMed : med
      ));
      setEditingMedicine(null);
    } else {
      const newMed = {
        ...newMedicine,
        id: Date.now(),
        totalUnits
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

  // Update inventory stock
  const updateInventoryStock = (medicineId, packsToAdd) => {
    setInventory(inventory.map(med => {
      if (med.id === medicineId) {
        const unitsToAdd = packsToAdd * med.unitsPerPack;
        return {
          ...med,
          totalPacks: med.totalPacks + packsToAdd,
          totalUnits: med.totalUnits + unitsToAdd
        };
      }
      return med;
    }));
  };

  const startEditMedicine = (medicine) => {
    setNewMedicine({
      name: medicine.name,
      strength: medicine.strength,
      type: medicine.type,
      packPurchaseRate: medicine.packPurchaseRate,
      packRetailRate: medicine.packRetailRate,
      unitsPerPack: medicine.unitsPerPack,
      totalPacks: Math.floor(medicine.totalUnits / medicine.unitsPerPack) // Calculate packs from current stock
    });
    setEditingMedicine(medicine);
    setShowAddMedicine(true);
    setCurrentPage('inventory');
  };

  const deleteMedicineFromInventory = (id) => {
    if (confirm('Are you sure you want to delete this medicine from inventory?')) {
      setInventory(inventory.filter(med => med.id !== id));
    }
  };

  const filteredMedicines = inventory.filter(med => {
    const fullName = `${med.name} ${med.strength}`;
    return fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredInventory = inventory.filter(med => {
    const fullName = `${med.name} ${med.strength}`;
    return fullName.toLowerCase().includes(inventorySearch.toLowerCase());
  });

  const selectMedicine = (medicine) => {
    const pricePerUnit = medicine.packRetailRate / medicine.unitsPerPack;
    const purchasePerUnit = medicine.packPurchaseRate / medicine.unitsPerPack;
    const fullName = `${medicine.name} ${medicine.strength} (${medicine.type})`;
    
    setCurrentMedicine({
      medicineId: medicine.id,
      name: medicine.name,
      fullName: fullName,
      quantity: 1,
      purchasePerUnit: purchasePerUnit,
      retailPerUnit: pricePerUnit,
      pricePerUnit: pricePerUnit,
      discount: 0
    });
    setSearchTerm(fullName);
    setShowSuggestions(false);
  };

  const calculateFinalPrice = () => {
    const discountAmount = (currentMedicine.pricePerUnit * currentMedicine.discount) / 100;
    return currentMedicine.pricePerUnit - discountAmount;
  };

  const addMedicine = () => {
    if (currentMedicine.medicineId && currentMedicine.quantity > 0) {
      const medicine = inventory.find(m => m.id === currentMedicine.medicineId);
      
      if (medicine.totalUnits < currentMedicine.quantity) {
        alert(`Not enough stock! Available: ${medicine.totalUnits} units`);
        return;
      }

      const updatedInventory = inventory.map(med => {
        if (med.id === currentMedicine.medicineId) {
          return {
            ...med,
            totalUnits: med.totalUnits - currentMedicine.quantity
          };
        }
        return med;
      });
      setInventory(updatedInventory);

      const finalPrice = calculateFinalPrice();
      setCurrentRecord({
        ...currentRecord,
        medicines: [...currentRecord.medicines, { 
          ...currentMedicine, 
          id: Date.now(),
          finalPrice: finalPrice
        }]
      });

      setCurrentMedicine({
        medicineId: null,
        name: '',
        fullName: '',
        quantity: 1,
        purchasePerUnit: 0,
        retailPerUnit: 0,
        pricePerUnit: 0,
        discount: 0
      });
      setSearchTerm('');
    }
  };

  const removeMedicine = (id) => {
    const medicine = currentRecord.medicines.find(m => m.id === id);
    
    const updatedInventory = inventory.map(med => {
      if (med.id === medicine.medicineId) {
        return {
          ...med,
          totalUnits: med.totalUnits + medicine.quantity
        };
      }
      return med;
    });
    setInventory(updatedInventory);

    setCurrentRecord({
      ...currentRecord,
      medicines: currentRecord.medicines.filter(m => m.id !== id)
    });
  };

  const calculateMedicineTotal = (medicine) => {
    return medicine.quantity * medicine.finalPrice;
  };

  const calculateMedicineCost = (medicine) => {
    return medicine.quantity * medicine.purchasePerUnit;
  };

  const calculateRecordTotals = (record) => {
    const medicineSale = record.medicines.reduce((sum, m) => sum + calculateMedicineTotal(m), 0);
    const medicineCost = record.medicines.reduce((sum, m) => sum + calculateMedicineCost(m), 0);
    const totalSale = medicineSale + parseFloat(record.doctorFees || 0);
    const profit = totalSale - medicineCost;
    return { medicineSale, medicineCost, totalSale, profit };
  };

  const saveRecord = () => {
    if (currentRecord.patientName && (currentRecord.medicines.length > 0 || currentRecord.doctorFees > 0)) {
      setRecords([...records, { ...currentRecord, id: Date.now() }]);
      setCurrentRecord({
        patientName: '',
        date: new Date().toISOString().split('T')[0],
        medicines: [],
        doctorFees: 0
      });
    }
  };

  const deleteRecord = (id) => {
    const record = records.find(r => r.id === id);
    
    const updatedInventory = [...inventory];
    record.medicines.forEach(medicine => {
      const medIndex = updatedInventory.findIndex(m => m.id === medicine.medicineId);
      if (medIndex !== -1) {
        updatedInventory[medIndex].totalUnits += medicine.quantity;
      }
    });
    setInventory(updatedInventory);
    
    setRecords(records.filter(r => r.id !== id));
  };

  const calculateOverallTotals = () => {
    let totalSales = 0;
    let totalCosts = 0;
    let totalDoctorFees = 0;

    records.forEach(record => {
      const totals = calculateRecordTotals(record);
      totalSales += totals.totalSale;
      totalCosts += totals.medicineCost;
      totalDoctorFees += parseFloat(record.doctorFees || 0);
    });

    return {
      totalSales,
      totalCosts,
      totalDoctorFees,
      totalProfit: totalSales - totalCosts
    };
  };

  const exportToCSV = () => {
    if (records.length === 0) {
      alert('No records to export!');
      return;
    }

    let csv = '****** NAEEM MEDICARE ******\n';
    csv += 'Medical Practice Management System\n';
    csv += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    csv += 'Date,Patient Name,Medicine,Quantity,Purchase Rate/Unit,Retail Rate/Unit,Discount %,Final Price/Unit,Medicine Total,Doctor Fees,Total Sale,Profit\n';
    
    records.forEach(record => {
      const totals = calculateRecordTotals(record);
      if (record.medicines.length > 0) {
        record.medicines.forEach((medicine, idx) => {
          const medicineTotal = calculateMedicineTotal(medicine);
          csv += `${record.date},${record.patientName},"${medicine.fullName}",${medicine.quantity},${medicine.purchasePerUnit.toFixed(2)},${medicine.retailPerUnit.toFixed(2)},${medicine.discount},${medicine.finalPrice.toFixed(2)},${medicineTotal.toFixed(2)},${idx === 0 ? record.doctorFees : ''},${idx === 0 ? totals.totalSale.toFixed(2) : ''},${idx === 0 ? totals.profit.toFixed(2) : ''}\n`;
        });
      } else {
        csv += `${record.date},${record.patientName},,,,,,,,${record.doctorFees},${totals.totalSale.toFixed(2)},${totals.profit.toFixed(2)}\n`;
      }
    });

    // Add summary row
    const overall = calculateOverallTotals();
    csv += `\n,,,,,,,,SUMMARY,,\n`;
    csv += `,,,,,,,,Total Sales,,Rs. ${overall.totalSales.toFixed(2)}\n`;
    csv += `,,,,,,,,Total Costs,,Rs. ${overall.totalCosts.toFixed(2)}\n`;
    csv += `,,,,,,,,Total Doctor Fees,,Rs. ${overall.totalDoctorFees.toFixed(2)}\n`;
    csv += `,,,,,,,,Total Profit,,Rs. ${overall.totalProfit.toFixed(2)}\n`;
    csv += `\n****** Thank you for using Naeem Medicare ******\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `Naeem_Medicare_Records_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Patient records exported successfully!');
  };

  const exportInventoryToCSV = () => {
    if (inventory.length === 0) {
      alert('No inventory to export!');
      return;
    }

    let csv = '****** NAEEM MEDICARE ******\n';
    csv += 'Medicine Inventory Report\n';
    csv += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    csv += 'Medicine Name,Strength,Type,Pack Purchase Rate,Pack Retail Rate,Units Per Pack,Total Packs,Total Units Available,Purchase/Unit,Retail/Unit\n';
    
    inventory.forEach(med => {
      const purchasePerUnit = med.packPurchaseRate / med.unitsPerPack;
      const retailPerUnit = med.packRetailRate / med.unitsPerPack;
      const totalPacks = Math.floor(med.totalUnits / med.unitsPerPack);
      csv += `"${med.name}",${med.strength},${med.type},${med.packPurchaseRate.toFixed(2)},${med.packRetailRate.toFixed(2)},${med.unitsPerPack},${totalPacks},${med.totalUnits},${purchasePerUnit.toFixed(2)},${retailPerUnit.toFixed(2)}\n`;
    });

    csv += `\n****** Thank you for using Naeem Medicare ******\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `Naeem_Medicare_Inventory_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Inventory exported successfully!');
  };

  const overallTotals = calculateOverallTotals();

  // Inventory Page
  if (currentPage === 'inventory') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Package className="text-purple-600" size={28} />
                <h1 className="text-3xl font-bold text-purple-900">Medicine Inventory Management</h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all data? This will delete all inventory and patient records.')) {
                      localStorage.removeItem('medicalInventory');
                      localStorage.removeItem('medicalRecords');
                      setInventory(INITIAL_MEDICINES);
                      setRecords([]);
                      alert('All data cleared successfully!');
                      setCurrentPage('home');
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 size={18} /> Clear All Data
                </button>
                <button
                  onClick={() => setCurrentPage('home')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
                >
                  <Home size={18} /> Home
                </button>
                <button
                  onClick={exportInventoryToCSV}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Download size={18} /> Export Inventory
                </button>
              </div>
            </div>

            {/* Search Bar */}
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

            {/* Add Medicine Button */}
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
                  totalPacks: 1
                });
              }}
              className="mb-6 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 flex items-center gap-2 font-semibold"
            >
              {showAddMedicine ? <X size={20} /> : <Plus size={20} />}
              {showAddMedicine ? 'Cancel' : 'Add New Medicine'}
            </button>

            {/* Add/Edit Medicine Form */}
            {showAddMedicine && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-purple-900 text-lg mb-4">
                  {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Panadol"
                      value={newMedicine.name}
                      onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Strength *</label>
                    <input
                      type="text"
                      placeholder="e.g., 500mg"
                      value={newMedicine.strength}
                      onChange={(e) => setNewMedicine({...newMedicine, strength: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newMedicine.type}
                      onChange={(e) => setNewMedicine({...newMedicine, type: e.target.value})}
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
                      onChange={(e) => setNewMedicine({...newMedicine, unitsPerPack: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pack Purchase Rate (Rs.)</label>
                    <input
                      type="number"
                      placeholder="45.00"
                      value={newMedicine.packPurchaseRate}
                      onChange={(e) => setNewMedicine({...newMedicine, packPurchaseRate: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pack Retail Rate (Rs.)</label>
                    <input
                      type="number"
                      placeholder="60.00"
                      value={newMedicine.packRetailRate}
                      onChange={(e) => setNewMedicine({...newMedicine, packRetailRate: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Packs</label>
                    <input
                      type="number"
                      placeholder="3"
                      value={newMedicine.totalPacks}
                      onChange={(e) => setNewMedicine({...newMedicine, totalPacks: parseInt(e.target.value) || 1})}
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
                    <span className="font-semibold">Total Units:</span> {newMedicine.unitsPerPack * newMedicine.totalPacks} | 
                    <span className="font-semibold ml-3">Purchase/Unit:</span> Rs. {newMedicine.unitsPerPack > 0 ? (newMedicine.packPurchaseRate / newMedicine.unitsPerPack).toFixed(2) : '0.00'} | 
                    <span className="font-semibold ml-3">Retail/Unit:</span> Rs. {newMedicine.unitsPerPack > 0 ? (newMedicine.packRetailRate / newMedicine.unitsPerPack).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            )}

            {/* Inventory Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-purple-600 text-white">
                    <th className="px-4 py-3 text-left">Medicine</th>
                    <th className="px-4 py-3 text-left">Strength</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Pack Purchase</th>
                    <th className="px-4 py-3 text-right">Pack Retail</th>
                    <th className="px-4 py-3 text-right">Units/Pack</th>
                    <th className="px-4 py-3 text-right">Total Packs</th>
                    <th className="px-4 py-3 text-right">Stock (Units)</th>
                    <th className="px-4 py-3 text-right">Purchase/Unit</th>
                    <th className="px-4 py-3 text-right">Retail/Unit</th>
                    <th className="px-4 py-3 text-center">Update Stock</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((med, index) => (
                    <tr key={med.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-purple-50'} ${med.totalUnits < 10 ? 'bg-red-100' : ''} border-b hover:bg-purple-100`}>
                      <td className="px-4 py-3 font-semibold">{med.name}</td>
                      <td className="px-4 py-3">{med.strength}</td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-200 px-2 py-1 rounded text-xs">{med.type}</span>
                      </td>
                      <td className="px-4 py-3 text-right">Rs. {med.packPurchaseRate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">Rs. {med.packRetailRate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{med.unitsPerPack}</td>
                      <td className="px-4 py-3 text-right font-semibold">{Math.floor(med.totalUnits / med.unitsPerPack)}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        <span className={med.totalUnits < 10 ? 'text-red-600' : 'text-green-600'}>
                          {med.totalUnits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600">Rs. {(med.packPurchaseRate / med.unitsPerPack).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-green-600">Rs. {(med.packRetailRate / med.unitsPerPack).toFixed(2)}</td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => startEditMedicine(med)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Medicine"
                          >
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
              {filteredInventory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No medicines found in inventory
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Home Page (Patient Records)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                ✨ Naeem Medicare ✨
              </h1>
              <p className="text-lg text-gray-600 font-medium">Medical Practice Management System</p>
            </div>
            <button
              onClick={() => setCurrentPage('inventory')}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
            >
              <Package size={18} /> Manage Inventory
            </button>
          </div>
          
          {/* Current Record Entry */}
          <div className="border-2 border-indigo-200 rounded-lg p-6 mb-6 bg-indigo-50">
            <h2 className="text-xl font-semibold text-indigo-800 mb-4">New Patient Record</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  value={currentRecord.patientName}
                  onChange={(e) => setCurrentRecord({...currentRecord, patientName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={currentRecord.date}
                  onChange={(e) => setCurrentRecord({...currentRecord, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Fees (Rs.)</label>
                <input
                  type="number"
                  value={currentRecord.doctorFees}
                  onChange={(e) => setCurrentRecord({...currentRecord, doctorFees: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Medicine Entry */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Medicine</h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                <div className="relative col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Search Medicine</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search medicine..."
                  />
                  {showSuggestions && searchTerm && (
                    <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                      {filteredMedicines.map(med => (
                        <div
                          key={med.id}
                          onClick={() => selectMedicine(med)}
                          className="px-3 py-2 hover:bg-indigo-100 cursor-pointer border-b"
                        >
                          <div className="font-medium">{med.name} {med.strength}</div>
                          <div className="text-xs text-gray-600">
                            {med.type} | Stock: {med.totalUnits} units
                          </div>
                          <div className="text-xs flex gap-2 mt-1">
                            <span className="text-blue-600 font-medium">Pack Purchase: Rs.{med.packPurchaseRate.toFixed(2)}</span>
                            <span className="text-green-600 font-medium">Pack Retail: Rs.{med.packRetailRate.toFixed(2)}</span>
                          </div>
                          <div className="text-xs flex gap-2">
                            <span className="text-blue-600">Per Unit: Rs.{(med.packPurchaseRate / med.unitsPerPack).toFixed(2)}</span>
                            <span className="text-green-600">Per Unit: Rs.{(med.packRetailRate / med.unitsPerPack).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      {filteredMedicines.length === 0 && (
                        <div className="px-3 py-2 text-gray-500">No medicines found</div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={currentMedicine.quantity}
                    onChange={(e) => setCurrentMedicine({...currentMedicine, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Qty"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    value={currentMedicine.discount}
                    onChange={(e) => setCurrentMedicine({...currentMedicine, discount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Final Price/Unit</label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm flex items-center justify-center font-semibold">
                    Rs. {calculateFinalPrice().toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">&nbsp;</label>
                  <button
                    onClick={addMedicine}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2 font-semibold"
                    disabled={!currentMedicine.medicineId}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {/* Medicine List */}
              {currentRecord.medicines.length > 0 && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Medicine</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2 text-right">Purchase/Unit</th>
                        <th className="px-3 py-2 text-right">Retail/Unit</th>
                        <th className="px-3 py-2 text-right">Discount %</th>
                        <th className="px-3 py-2 text-right">Final/Unit</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecord.medicines.map(medicine => (
                        <tr key={medicine.id} className="border-b">
                          <td className="px-3 py-2">{medicine.fullName}</td>
                          <td className="px-3 py-2 text-right">{medicine.quantity}</td>
                          <td className="px-3 py-2 text-right text-blue-600">{medicine.purchasePerUnit.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-green-600">{medicine.retailPerUnit.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{medicine.discount}%</td>
                          <td className="px-3 py-2 text-right font-semibold">{medicine.finalPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-700">Rs. {calculateMedicineTotal(medicine).toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => removeMedicine(medicine.id)} className="text-red-600 hover:text-red-800">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button
              onClick={saveRecord}
              disabled={!currentRecord.patientName}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 font-semibold flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Calculator size={18} /> Save Record
            </button>
          </div>

          {/* Overall Summary */}
          {records.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-green-800">Overall Summary</h2>
                <button
                  onClick={exportToCSV}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Download size={18} /> Export to CSV
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-green-700">Rs. {overallTotals.totalSales.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-600">Total Costs</p>
                  <p className="text-2xl font-bold text-red-700">Rs. {overallTotals.totalCosts.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-600">Doctor Fees</p>
                  <p className="text-2xl font-bold text-blue-700">Rs. {overallTotals.totalDoctorFees.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-emerald-700">Rs. {overallTotals.totalProfit.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Saved Records */}
          {records.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Saved Records ({records.length})</h2>
              <div className="space-y-4">
                {records.map(record => {
                  const totals = calculateRecordTotals(record);
                  return (
                    <div key={record.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{record.patientName}</h3>
                          <p className="text-sm text-gray-600">{record.date}</p>
                        </div>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      
                      {record.medicines.length > 0 && (
                        <div className="overflow-x-auto mb-3">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-200">
                              <tr>
                                <th className="px-2 py-1 text-left">Medicine</th>
                                <th className="px-2 py-1 text-right">Qty</th>
                                <th className="px-2 py-1 text-right">Purchase</th>
                                <th className="px-2 py-1 text-right">Retail</th>
                                <th className="px-2 py-1 text-right">Disc</th>
                                <th className="px-2 py-1 text-right">Final</th>
                                <th className="px-2 py-1 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {record.medicines.map(medicine => (
                                <tr key={medicine.id} className="border-b">
                                  <td className="px-2 py-1">{medicine.fullName}</td>
                                  <td className="px-2 py-1 text-right">{medicine.quantity}</td>
                                  <td className="px-2 py-1 text-right text-blue-600">{medicine.purchasePerUnit.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right text-green-600">{medicine.retailPerUnit.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right">{medicine.discount}%</td>
                                  <td className="px-2 py-1 text-right font-semibold">{medicine.finalPrice.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right font-bold">Rs. {calculateMedicineTotal(medicine).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-3 rounded">
                        <div>
                          <p className="text-xs text-gray-600">Medicine Sale</p>
                          <p className="font-semibold text-green-700">Rs. {totals.medicineSale.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Doctor Fees</p>
                          <p className="font-semibold text-blue-700">Rs. {record.doctorFees.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Sale</p>
                          <p className="font-semibold text-indigo-700">Rs. {totals.totalSale.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Profit</p>
                          <p className="font-semibold text-emerald-700">Rs. {totals.profit.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}