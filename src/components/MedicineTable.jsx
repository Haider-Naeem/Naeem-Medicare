// C:/Users/haide/Desktop/Naeem Medicare/src/components/MedicineTable.jsx
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
          {medicines.map((medicine) => (
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
  );
}