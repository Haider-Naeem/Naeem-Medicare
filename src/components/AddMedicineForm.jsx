// C:/Users/haide/Desktop/Naeem Medicare/src/components/AddMedicineForm.jsx
import React, { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

export default function AddMedicineForm({ inventory, setInventory, currentRecord, setCurrentRecord }) {
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
    discount: 0,
  });

  const filteredMedicines = inventory.filter((med) => {
    const fullName = `${med.name} ${med.strength}`;
    return fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectMedicine = (medicine) => {
    const pricePerUnit = medicine.packRetailRate / medicine.unitsPerPack;
    const purchasePerUnit = medicine.packPurchaseRate / medicine.unitsPerPack;
    const fullName = `${medicine.name} ${medicine.strength} (${medicine.type})`;
    setCurrentMedicine({
      medicineId: medicine.id,
      name: medicine.name,
      fullName,
      quantity: 1,
      purchasePerUnit,
      retailPerUnit: pricePerUnit,
      pricePerUnit,
      discount: 0,
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
      const medicine = inventory.find((m) => m.id === currentMedicine.medicineId);
      if (medicine.totalUnits < currentMedicine.quantity) {
        alert(`Not enough stock! Available: ${medicine.totalUnits} units`);
        return;
      }
      const updatedInventory = inventory.map((med) => {
        if (med.id === currentMedicine.medicineId) {
          return {
            ...med,
            totalUnits: med.totalUnits - currentMedicine.quantity,
          };
        }
        return med;
      });
      setInventory(updatedInventory);
      const finalPrice = calculateFinalPrice();
      setCurrentRecord({
        ...currentRecord,
        medicines: [...currentRecord.medicines, { ...currentMedicine, id: Date.now(), finalPrice }],
      });
      setCurrentMedicine({
        medicineId: null,
        name: '',
        fullName: '',
        quantity: 1,
        purchasePerUnit: 0,
        retailPerUnit: 0,
        pricePerUnit: 0,
        discount: 0,
      });
      setSearchTerm('');
    }
  };

  const removeMedicine = (id) => {
    const medicine = currentRecord.medicines.find((m) => m.id === id);
    const updatedInventory = inventory.map((med) => {
      if (med.id === medicine.medicineId) {
        return {
          ...med,
          totalUnits: med.totalUnits + medicine.quantity,
        };
      }
      return med;
    });
    setInventory(updatedInventory);
    setCurrentRecord({
      ...currentRecord,
      medicines: currentRecord.medicines.filter((m) => m.id !== id),
    });
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-4">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Add Medicine</h3>
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-3">
        <div className="relative col-span-1 sm:col-span-2">
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
              {filteredMedicines.map((med) => (
                <div
                  key={med.id}
                  onClick={() => selectMedicine(med)}
                  className="px-3 py-2 hover:bg-indigo-100 cursor-pointer border-b"
                >
                  <div className="font-medium">
                    {med.name} {med.strength}{' '}
                    {med.totalUnits === 0 && <span className="text-red-600 text-xs font-bold">[Out of Stock]</span>}
                  </div>
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
              {filteredMedicines.length === 0 && <div className="px-3 py-2 text-gray-500">No medicines found</div>}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
          <input
            type="number"
            value={currentMedicine.quantity}
            onChange={(e) => setCurrentMedicine({ ...currentMedicine, quantity: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Qty"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Discount (%)</label>
          <input
            type="number"
            value={currentMedicine.discount}
            onChange={(e) => setCurrentMedicine({ ...currentMedicine, discount: parseFloat(e.target.value) || 0 })}
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
      {currentRecord.medicines.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 sm:px-3 py-2 text-left">Medicine</th>
                <th className="px-2 sm:px-3 py-2 text-right">Quantity</th>
                <th className="px-2 sm:px-3 py-2 text-right">Purchase/Unit</th>
                <th className="px-2 sm:px-3 py-2 text-right">Retail/Unit</th>
                <th className="px-2 sm:px-3 py-2 text-right">Discount %</th>
                <th className="px-2 sm:px-3 py-2 text-right">Final/Unit</th>
                <th className="px-2 sm:px-3 py-2 text-right">Total</th>
                <th className="px-2 sm:px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {currentRecord.medicines.map((medicine) => (
                <tr key={medicine.id} className="border-b">
                  <td className="px-2 sm:px-3 py-2">{medicine.fullName}</td>
                  <td className="px-2 sm:px-3 py-2 text-right">{medicine.quantity}</td>
                  <td className="px-2 sm:px-3 py-2 text-right text-blue-600">{medicine.purchasePerUnit.toFixed(2)}</td>
                  <td className="px-2 sm:px-3 py-2 text-right text-green-600">{medicine.retailPerUnit.toFixed(2)}</td>
                  <td className="px-2 sm:px-3 py-2 text-right">{medicine.discount}%</td>
                  <td className="px-2 sm:px-3 py-2 text-right font-semibold">{medicine.finalPrice.toFixed(2)}</td>
                  <td className="px-2 sm:px-3 py-2 text-right font-bold text-indigo-700">
                    Rs. {(medicine.quantity * medicine.finalPrice).toFixed(2)}
                  </td>
                  <td className="px-2 sm:px-3 py-2">
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
  );
}