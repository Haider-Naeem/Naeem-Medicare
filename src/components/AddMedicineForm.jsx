// src/components/AddMedicineForm.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, DollarSign, AlertTriangle } from 'lucide-react';

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

  // HELPER: Calculate available stock considering already added medicines
  const getAvailableStock = (medicineId) => {
    const med = inventory.find((m) => m.id === medicineId);
    if (!med) return 0;

    const alreadyUsed = currentRecord.medicines
      .filter((m) => m.medicineId === medicineId)
      .reduce((sum, m) => sum + m.quantity, 0);

    return med.totalUnits - alreadyUsed;
  };

  const filteredMedicines = inventory.filter((med) => {
    if (!med || !med.name || med.isDeleted) return false;
    const full = `${med.name} ${med.strength || ''} ${med.genericName || ''}`.trim();
    const search = (searchTerm || '').toLowerCase();
    return full.toLowerCase().includes(search);
  });

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

  const finalPricePerUnit = () => {
    const discount = parseFloat(currentMedicine.discount) || 0;
    const price = currentMedicine.pricePerUnit || 0;
    if (discount >= 100) return '0.00';
    return Number((price * (100 - discount)) / 100).toFixed(2);
  };

  const addMedicine = () => {
    if (!currentMedicine.medicineId || currentMedicine.quantity <= 0) {
      alert('Please select a medicine and enter quantity.');
      return;
    }

    const availableStock = getAvailableStock(currentMedicine.medicineId);
    if (availableStock < currentMedicine.quantity) {
      alert(`Not enough stock! Available: ${availableStock} units`);
      return;
    }

    const disc = parseFloat(currentMedicine.discount) || 0;
    const maxSafe =
      currentMedicine.pricePerUnit > 0
        ? Math.max(0, ((currentMedicine.pricePerUnit - currentMedicine.purchaseRate) / currentMedicine.pricePerUnit) * 100)
        : 0;

    // Check if discount exceeds break-even purchase cost (and not 100% free)
    if (disc > maxSafe && disc < 100) {
      const ok = window.confirm(
        `Discount (${disc}%) exceeds the break-even margin (${maxSafe.toFixed(1)}%)!\n` +
        `Selling price (Rs.${finalPricePerUnit()}) is below purchase cost (Rs.${currentMedicine.purchaseRate.toFixed(2)}).\n\n` +
        `Do you want to proceed with this discount?`
      );
      if (!ok) return;
    }

    // If 100% discount, purchase price is lost → medicineTotal is -(purchaseRate * quantity)
    let finalTotal = Number(finalPricePerUnit()) * currentMedicine.quantity;
    if (disc >= 100) {
      finalTotal = -(currentMedicine.purchaseRate * currentMedicine.quantity);
    }

    const medicineObj = {
      medicine: currentMedicine.fullName,
      fullName: currentMedicine.fullName,
      name: currentMedicine.name,
      medicineId: currentMedicine.medicineId,
      quantity: currentMedicine.quantity,
      purchaseRate: currentMedicine.purchaseRate,
      retailRate: currentMedicine.retailRate,
      pricePerUnit: currentMedicine.pricePerUnit,
      discount: disc,
      finalPrice: disc >= 100 ? 0 : Number(finalPricePerUnit()),
      medicineTotal: Number(finalTotal.toFixed(2)),
      id: Date.now(),
    };

    setCurrentRecord({
      ...currentRecord,
      medicines: [...currentRecord.medicines, medicineObj],
    });

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

  const removeMedicine = (localId) => {
    setCurrentRecord({
      ...currentRecord,
      medicines: currentRecord.medicines.filter((m) => m.id !== localId),
    });
  };

  // Safe discount calculation
  const maxSafeDiscount = useMemo(() => {
    if (!currentMedicine.pricePerUnit || currentMedicine.pricePerUnit <= 0) return 0;
    return Math.max(0, ((currentMedicine.pricePerUnit - currentMedicine.purchaseRate) / currentMedicine.pricePerUnit) * 100);
  }, [currentMedicine.pricePerUnit, currentMedicine.purchaseRate]);

  return (
    <div className="space-y-4">
      {/* ── Input Grid (Matching Desktop & Mobile Layout) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
        {/* Search Medicine / Formula (5 cols desktop, full width mobile) */}
        <div className="relative sm:col-span-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Search Medicine / Formula
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(!!e.target.value);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-3.5 pr-9 py-2.5 border-2 border-slate-300 border-l-4 border-l-indigo-600 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 outline-none bg-slate-50/50 focus:bg-white transition"
              placeholder="e.g., Augmentin 625mg, Panadol..."
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
          </div>

          {/* Autocomplete Suggestions - Dropdown opens UPWARDS of the field */}
          {showSuggestions && searchTerm && (
            <div className="absolute z-50 w-full bottom-full mb-1.5 bg-white border-2 border-slate-300 rounded-xl max-h-60 overflow-y-auto shadow-2xl divide-y divide-gray-100">
              {filteredMedicines.length > 0 ? (
                filteredMedicines.map((med) => {
                  const availableStock = getAvailableStock(med.id);
                  return (
                    <div
                      key={med.id}
                      onClick={() => selectMedicine(med)}
                      className="px-3.5 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-slate-800">
                          {med.name} {med.strength}
                        </span>
                        {availableStock <= 0 ? (
                          <span className="text-rose-600 text-[11px] font-bold bg-rose-50 px-2 py-0.5 rounded">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            {availableStock} left
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                        <span>{med.type || 'Tablet'}</span>
                        <div className="flex gap-2">
                          <span className="text-blue-600 font-medium">
                            Cost: ₨{(med.packPurchaseRate / (med.unitsPerPack || 1)).toFixed(2)}
                          </span>
                          <span className="text-emerald-600 font-medium">
                            Retail: ₨{(med.packRetailRate / (med.unitsPerPack || 1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-xs text-slate-500 italic">
                  No medicines found in inventory
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quantity and Discount in a SINGLE LINE on mobile and desktop (4 cols desktop) */}
        <div className="grid grid-cols-2 gap-2.5 sm:col-span-4">
          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={currentMedicine.quantity === 0 ? '' : currentMedicine.quantity}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setCurrentMedicine({
                  ...currentMedicine,
                  quantity: val === '' ? '' : parseInt(val, 10),
                });
              }}
              onBlur={() => {
                if (!currentMedicine.quantity || currentMedicine.quantity < 1) {
                  setCurrentMedicine({ ...currentMedicine, quantity: 1 });
                }
              }}
              className="w-full px-3 py-2.5 border-2 border-slate-300 border-l-4 border-l-indigo-600 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 outline-none bg-slate-50/50 focus:bg-white transition"
              placeholder="1"
            />
          </div>

          {/* Disc (%) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Disc (%)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={currentMedicine.discount === 0 ? '0' : (currentMedicine.discount !== undefined ? currentMedicine.discount : '')}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                if ((val.match(/\./g) || []).length <= 1) {
                  setCurrentMedicine({
                    ...currentMedicine,
                    discount: val === '' ? '' : (parseFloat(val) > 100 ? 100 : val),
                  });
                }
              }}
              onBlur={() => {
                const num = parseFloat(currentMedicine.discount);
                if (currentMedicine.discount === '' || isNaN(num) || num < 0) {
                  setCurrentMedicine({ ...currentMedicine, discount: 0 });
                } else {
                  setCurrentMedicine({ ...currentMedicine, discount: Math.min(100, num) });
                }
              }}
              className={`w-full px-3 py-2.5 border-2 border-l-4 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${
                parseFloat(currentMedicine.discount) > maxSafeDiscount && parseFloat(currentMedicine.discount) < 100
                  ? 'border-amber-400 border-l-amber-600 bg-amber-50/70 text-amber-800'
                  : parseFloat(currentMedicine.discount) >= 100
                  ? 'border-rose-400 border-l-rose-600 bg-rose-50/70 text-rose-700'
                  : 'border-slate-300 border-l-indigo-600 bg-slate-50/50 focus:bg-white focus:border-indigo-600'
              }`}
              placeholder="0"
            />
          </div>
        </div>

        {/* Final Rate / Unit (Rs.) (3 cols desktop, full width mobile) */}
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Final Rate/Unit (Rs.)
          </label>
          <div className="px-3 py-2.5 bg-slate-100/80 border-2 border-slate-300 border-l-4 border-l-slate-600 rounded-xl text-sm font-bold text-slate-800 text-center">
            Rs. {finalPricePerUnit()}
          </div>
        </div>
      </div>

      {/* ── Discount Tags & Helper Controls (Explicitly requested by user) ── */}
      {currentMedicine.medicineId && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-900">
              Safe Margin: <span className="font-bold text-indigo-700">{maxSafeDiscount.toFixed(0)}%</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">
              Cost: <span className="font-bold text-slate-800">₨{currentMedicine.purchaseRate.toFixed(2)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setCurrentMedicine({
                  ...currentMedicine,
                  discount: Number(maxSafeDiscount.toFixed(1)),
                })
              }
              className="text-[11px] bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold px-2 py-1 rounded-lg transition"
              title="Set discount to break-even purchase cost"
            >
              [Safe Max]
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentMedicine({
                  ...currentMedicine,
                  discount: 100,
                })
              }
              className="text-[11px] bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-2 py-1 rounded-lg transition"
              title="100% Free (Purchase cost will be recorded as loss)"
            >
              [100% Free]
            </button>
          </div>
        </div>
      )}

      {/* ── Add Medicine Button ── */}
      <div className="flex justify-end">
        <button
          onClick={addMedicine}
          disabled={!currentMedicine.medicineId}
          className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2 transition active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* ── Medicine Table After Add (Same columns as previous, clean format) ── */}
      {currentRecord.medicines.length > 0 && (
        <div className="overflow-x-auto rounded-xl border-2 border-slate-200 border-l-4 border-l-indigo-600 shadow-2xs mt-4">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600">
              <tr>
                <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-[11px] w-10">#</th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[11px]">
                  Medicine
                </th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-[11px]">Qty</th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-[11px]">Purchase</th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-[11px]">Retail</th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-[11px]">Disc %</th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-[11px]">Unit Price</th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-[11px]">Total (Rs.)</th>
                <th className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-[11px] w-12">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {currentRecord.medicines.map((m, idx) => (
                <tr key={m.id || idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-2.5 text-center font-medium text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">
                    {m.fullName || m.medicine}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                    {m.quantity}
                  </td>
                  <td className="px-3 py-2.5 text-right text-blue-600 font-medium">
                    Rs. {m.purchaseRate?.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700 font-medium">
                    Rs. {m.retailRate?.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {m.discount > 0 ? (
                      <span className="font-bold text-amber-600">{m.discount}%</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                    Rs. {m.finalPrice?.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-indigo-700 bg-indigo-50/40">
                    Rs. {m.medicineTotal?.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => removeMedicine(m.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition"
                      title="Remove medicine"
                    >
                      <Trash2 size={15} />
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