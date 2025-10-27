// C:/Users/haide/Desktop/Naeem Medicare/src/utils/calculations.js
export const calculateMedicineTotal = (medicine) => {
  return medicine.quantity * medicine.finalPrice;
};

export const calculateMedicineCost = (medicine) => {
  return medicine.quantity * medicine.purchasePerUnit;
};

export const calculateRecordTotals = (record) => {
  const medicineSale = record.medicines.reduce((sum, m) => sum + calculateMedicineTotal(m), 0);
  const medicineCost = record.medicines.reduce((sum, m) => sum + calculateMedicineCost(m), 0);
  const totalSale = medicineSale + parseFloat(record.doctorFees || 0);
  const profit = totalSale - medicineCost;
  return { medicineSale, medicineCost, totalSale, profit };
};

export const calculateOverallTotals = (records) => {
  let totalSales = 0;
  let totalCosts = 0;
  let totalDoctorFees = 0;
  records.forEach((record) => {
    const totals = calculateRecordTotals(record);
    totalSales += totals.totalSale;
    totalCosts += totals.medicineCost;
    totalDoctorFees += parseFloat(record.doctorFees || 0);
  });
  return {
    totalSales,
    totalCosts,
    totalDoctorFees,
    totalProfit: totalSales - totalCosts,
  };
};

export const exportToCSV = (records) => {
  if (records.length === 0) {
    alert('No records to export!');
    return;
  }
  let csv = '****** NAEEM MEDICARE ******\n';
  csv += 'Medical Practice Management System\n';
  csv += `Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}\n\n`;
  csv += 'Date,Patient Name,Diagnosis,Medicine,Quantity,Purchase Rate/Unit,Retail Rate/Unit,Discount %,Final Price/Unit,Medicine Total,Doctor Fees,Total Sale,Profit\n';
  records.forEach((record) => {
    const totals = calculateRecordTotals(record);
    if (record.medicines.length > 0) {
      record.medicines.forEach((medicine, idx) => {
        const medicineTotal = calculateMedicineTotal(medicine);
        csv += `${record.date},${record.patientName},"${record.diagnosis || ''}","${medicine.fullName}",${medicine.quantity},${medicine.purchasePerUnit.toFixed(
          2
        )},${medicine.retailPerUnit.toFixed(2)},${medicine.discount},${medicine.finalPrice.toFixed(2)},${medicineTotal.toFixed(2)},${
          idx === 0 ? record.doctorFees : ''
        },${idx === 0 ? totals.totalSale.toFixed(2) : ''},${idx === 0 ? totals.profit.toFixed(2) : ''}\n`;
      });
    } else {
      csv += `${record.date},${record.patientName},"${record.diagnosis || ''}",,,,,,,${record.doctorFees},${totals.totalSale.toFixed(2)},${totals.profit.toFixed(2)}\n`;
    }
  });
  const overall = calculateOverallTotals(records);
  csv += `\n,,,,,,,,,SUMMARY,,\n`;
  csv += `,,,,,,,,,Total Sales,,Rs. ${overall.totalSales.toFixed(2)}\n`;
  csv += `,,,,,,,,,Total Costs,,Rs. ${overall.totalCosts.toFixed(2)}\n`;
  csv += `,,,,,,,,,Total Doctor Fees,,Rs. ${overall.totalDoctorFees.toFixed(2)}\n`;
  csv += `,,,,,,,,,Total Profit,,Rs. ${overall.totalProfit.toFixed(2)}\n`;
  csv += `\n****** Thank you for using Naeem Medicare ******\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' });
  a.download = `Naeem_Medicare_Records_${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  alert('Patient records exported successfully!');
};

export const exportInventoryToCSV = (inventory) => {
  if (inventory.length === 0) {
    alert('No inventory to export!');
    return;
  }
  let csv = '****** NAEEM MEDICARE ******\n';
  csv += 'Medicine Inventory Report\n';
  csv += `Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}\n\n`;
  csv += 'Medicine Name,Strength,Type,Pack Purchase Rate,Pack Retail Rate,Units Per Pack,Total Packs,Total Units Available,Stock Status,Purchase/Unit,Retail/Unit\n';
  inventory.forEach((med) => {
    const purchasePerUnit = med.packPurchaseRate / med.unitsPerPack;
    const retailPerUnit = med.packRetailRate / med.unitsPerPack;
    const totalPacks = Math.floor(med.totalUnits / med.unitsPerPack);
    const stockStatus = med.totalUnits === 0 ? 'Out of Stock' : 'In Stock';
    csv += `"${med.name}",${med.strength},${med.type},${med.packPurchaseRate.toFixed(2)},${med.packRetailRate.toFixed(2)},${med.unitsPerPack},${totalPacks},${
      med.totalUnits
    },${stockStatus},${purchasePerUnit.toFixed(2)},${retailPerUnit.toFixed(2)}\n`;
  });
  csv += `\n****** Thank you for using Naeem Medicare ******\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' });
  a.download = `Naeem_Medicare_Inventory_${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  alert('Inventory exported successfully!');
};