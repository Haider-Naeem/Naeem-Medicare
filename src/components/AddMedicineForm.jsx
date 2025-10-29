// src/components/AddMedicineForm.jsx
import React, { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

export default function AddMedicineForm({
  inventory,
  setInventory,
  currentRecord,
  setCurrentRecord,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState({
    medicineId: null,
    name: '',
    fullName: '',
    quantity: 1,
    purchaseRate: 0,
    retailRate: 0,
    pricePerUnit: 0,
    discount: 0,
  });

  // ————————————————————————————————————————
  // HELPER: Calculate available stock considering medicines already added to current record
  // ————————————————————————————————————————
  const getAvailableStock = (medicineId) => {
    const med = inventory.find(m => m.id === medicineId);
    if (!med) return 0;

    // Calculate how much of this medicine is already in the current record
    const alreadyUsed = currentRecord.medicines
      .filter(m => m.medicineId === medicineId)
      .reduce((sum, m) => sum + m.quantity, 0);

    return med.totalUnits - alreadyUsed;
  };

  // ————————————————————————————————————————
  // SAFE FILTERING (no crash on bad data)
  // ————————————————————————————————————————
  const filteredMedicines = inventory.filter((med) => {
    if (!med || !med.name) return false;
    const full = `${med.name} ${med.strength || ''}`.trim();
    const search = (searchTerm || '').toLowerCase();
    return full.toLowerCase().includes(search);
  });

  // ————————————————————————————————————————
  // SELECT MEDICINE
  // ————————————————————————————————————————
  const selectMedicine = (medicine) => {
    if (!medicine) return;

    const unitsPerPack = medicine.unitsPerPack || 1;
    const packRetail = medicine.packRetailRate || 0;
    const packPurchase = medicine.packPurchaseRate || 0;

    const retailRate = packRetail / unitsPerPack;
    const purchaseRate = packPurchase / unitsPerPack;
    const fullName = `${medicine.name} ${medicine.strength || ''} (${medicine.type || 'Tablet'})`.trim();

    setCurrentMedicine({
      medicineId: medicine.id,
      name: medicine.name,
      fullName,
      quantity: 1,
      purchaseRate: Number(purchaseRate.toFixed(2)),
      retailRate: Number(retailRate.toFixed(2)),
      pricePerUnit: Number(retailRate.toFixed(2)),
      discount: 0,
    });

    setSearchTerm(fullName);
    setShowSuggestions(false);
  };

  // ————————————————————————————————————————
  // FINAL PRICE PER UNIT (after discount)
  // ————————————————————————————————————————
  const finalPricePerUnit = () => {
    const discount = currentMedicine.discount || 0;
    const price = currentMedicine.pricePerUnit || 0;
    return Number((price * (100 - discount)) / 100).toFixed(2);
  };

  // ————————————————————————————————————————
  // ADD MEDICINE TO RECORD (NO INVENTORY UPDATE)
  // ————————————————————————————————————————
  const addMedicine = () => {
    if (!currentMedicine.medicineId || currentMedicine.quantity <= 0) {
      alert('Please select a medicine and enter quantity.');
      return;
    }

    // Check available stock (considering medicines already added)
    const availableStock = getAvailableStock(currentMedicine.medicineId);
    if (availableStock < currentMedicine.quantity) {
      alert(`Not enough stock! Available: ${availableStock} units`);
      return;
    }

    const finalTotal = Number(finalPricePerUnit()) * currentMedicine.quantity;
    const medicineObj = {
      medicine: currentMedicine.fullName,
      fullName: currentMedicine.fullName,
      name: currentMedicine.name,
      medicineId: currentMedicine.medicineId,
      quantity: currentMedicine.quantity,
      purchaseRate: currentMedicine.purchaseRate,
      retailRate: currentMedicine.retailRate,
      pricePerUnit: currentMedicine.pricePerUnit,
      discount: currentMedicine.discount,
      finalPrice: Number(finalPricePerUnit()),
      medicineTotal: Number(finalTotal.toFixed(2)),
      id: Date.now(),
    };

    setCurrentRecord({
      ...currentRecord,
      medicines: [...currentRecord.medicines, medicineObj],
    });

    // Reset form
    setCurrentMedicine({
      medicineId: null,
      name: '',
      fullName: '',
      quantity: 1,
      purchaseRate: 0,
      retailRate: 0,
      pricePerUnit: 0,
      discount: 0,
    });
    setSearchTerm('');
  };

  // ————————————————————————————————————————
  // REMOVE MEDICINE FROM CURRENT RECORD
  // ————————————————————————————————————————
  const removeMedicine = (localId) => {
    setCurrentRecord({
      ...currentRecord,
      medicines: currentRecord.medicines.filter((m) => m.id !== localId),
    });
  };

  // ————————————————————————————————————————
  // UI RENDER
  // ————————————————————————————————————————
  return (
    <div className="bg-white rounded-lg p-4 mb-4">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
        Add Medicine
      </h3>

      {/* INPUT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-3">
        {/* SEARCH */}
        <div className="relative col-span-1 sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Search Medicine
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(!!e.target.value);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Search medicine..."
          />
          {showSuggestions && searchTerm && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
              {filteredMedicines.length > 0 ? (
                filteredMedicines.map((med) => {
                  const availableStock = getAvailableStock(med.id);
                  return (
                    <div
                      key={med.id}
                      onClick={() => selectMedicine(med)}
                      className="px-3 py-2 hover:bg-indigo-100 cursor-pointer border-b"
                    >
                      <div className="font-medium">
                        {med.name} {med.strength}{' '}
                        {availableStock === 0 && (
                          <span className="text-red-600 text-xs font-bold">
                            [Out of Stock]
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {med.type} | Stock: {med.totalUnits} units | Available: {availableStock} units
                      </div>
                      <div className="text-xs flex gap-2 mt-1">
                        <span className="text-blue-600 font-medium">
                          Pack Purchase: Rs.{med.packPurchaseRate?.toFixed(2) || '0.00'}
                        </span>
                        <span className="text-green-600 font-medium">
                          Pack Retail: Rs.{med.packRetailRate?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-gray-500">No medicines found</div>
              )}
            </div>
          )}
        </div>

        {/* QUANTITY */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={currentMedicine.quantity}
            onChange={(e) =>
              setCurrentMedicine({
                ...currentMedicine,
                quantity: parseInt(e.target.value) || 1,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* DISCOUNT */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Discount (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={currentMedicine.discount}
            onChange={(e) =>
              setCurrentMedicine({
                ...currentMedicine,
                discount: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* FINAL PRICE PER UNIT */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Final / Unit
          </label>
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-semibold text-center">
            Rs. {finalPricePerUnit()}
          </div>
        </div>

        {/* ADD BUTTON */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            &nbsp;
          </label>
          <button
            onClick={addMedicine}
            disabled={!currentMedicine.medicineId}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-semibold"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* PREVIEW TABLE */}
      {currentRecord.medicines.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-2 text-left">Medicine</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-right">Purchase</th>
                <th className="px-2 py-2 text-right">Retail</th>
                <th className="px-2 py-2 text-right">Disc %</th>
                <th className="px-2 py-2 text-right">Final</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {currentRecord.medicines.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="px-2 py-2">{m.medicine}</td>
                  <td className="px-2 py-2 text-right">{m.quantity}</td>
                  <td className="px-2 py-2 text-right text-blue-600">
                    {m.purchaseRate.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right text-green-600">
                    {m.retailRate.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">{m.discount}%</td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {m.finalPrice.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right font-bold text-indigo-700">
                    Rs. {m.medicineTotal.toFixed(2)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeMedicine(m.id)}
                      className="text-red-600 hover:text-red-800"
                    >
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