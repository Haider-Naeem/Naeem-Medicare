// src/components/MedicineTable.jsx
import React from 'react';
import { calculateMedicineTotal } from '../utils/calculations';

export default function MedicineTable({ medicines }) {
  return (
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
          {medicines.map((medicine, index) => (
            <tr key={medicine.medicineId || medicine.id || index} className="border-b">
              <td className="px-2 py-1">
                {medicine.medicine || medicine.fullName || 'Unknown'}
              </td>
              <td className="px-2 py-1 text-right">{medicine.quantity ?? 0}</td>

              {/* PURCHASE RATE */}
              <td className="px-2 py-1 text-right text-blue-600">
                Rs. {(medicine.purchaseRate ?? medicine.purchasePerUnit ?? 0).toFixed(2)}
              </td>

              {/* RETAIL RATE */}
              <td className="px-2 py-1 text-right text-green-600">
                Rs. {(medicine.retailRate ?? medicine.retailPerUnit ?? 0).toFixed(2)}
              </td>

              {/* DISCOUNT */}
              <td className="px-2 py-1 text-right">
                {(medicine.discount ?? 0).toFixed(2)}%
              </td>

              {/* FINAL PRICE PER UNIT */}
              <td className="px-2 py-1 text-right font-semibold">
                Rs. {(medicine.finalPrice ?? 0).toFixed(2)}
              </td>

              {/* TOTAL (quantity × finalPrice) */}
              <td className="px-2 py-1 text-right font-bold">
                Rs. {calculateMedicineTotal(medicine).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}