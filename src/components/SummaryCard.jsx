// C:/Users/haide/Desktop/Naeem Medicare/src/components/SummaryCard.jsx
import React from 'react';

export default function SummaryCard({ title, value, color }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <p className="text-sm text-gray-600">{title}</p>
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}