// src/utils/calculations.js

export const calculateMedicineTotal = (medicine) => {
  return (medicine.quantity ?? 0) * (medicine.finalPrice ?? 0);
};

export const calculateMedicineCost = (medicine) => {
  return (medicine.quantity ?? 0) * (medicine.purchaseRate ?? 0);
};

export const calculateRecordTotals = (record) => {
  const medicineSale =
    record.medicines?.reduce((sum, m) => sum + (calculateMedicineTotal(m) || 0), 0) || 0;
  const medicineCost =
    record.medicines?.reduce((sum, m) => sum + (calculateMedicineCost(m) || 0), 0) || 0;
  
  // doctorFees is stored as string (e.g., "250.00") → convert safely
  const doctorFees = parseFloat(record.doctorFees || '0') || 0;
  
  const totalSale = medicineSale + doctorFees;
  const profit = totalSale - medicineCost;
  
  return { medicineSale, medicineCost, doctorFees, totalSale, profit };
};

export const calculateOverallTotals = (records) => {
  let totalSales = 0;
  let totalCosts = 0;
  let totalDoctorFees = 0;
  
  records.forEach((record) => {
    const totals = calculateRecordTotals(record);
    totalSales += totals.totalSale || 0;
    totalCosts += totals.medicineCost || 0;
    totalDoctorFees += totals.doctorFees || 0;
  });
  
  return {
    totalSales,
    totalCosts,
    totalDoctorFees,
    totalProfit: totalSales - totalCosts,
  };
};

/* ------------------------------------------------------------------ */
/*  EXPORT PATIENT RECORDS TO CSV                                     */
/* ------------------------------------------------------------------ */
export const exportToCSV = (records) => {
  if (!records || records.length === 0) {
    alert('No records to export!');
    return;
  }

  const header =
    'Date,Patient Name,Diagnosis,Blood Pressure,Glucose,Temperature,' +
    'Medicine,Quantity,Purchase Rate/Unit,Retail Rate/Unit,Discount %,Final Price/Unit,' +
    'Medicine Total,Doctor Fees,Total Sale,Profit';

  const rows = [];

  records.forEach((record) => {
    const { totalSale, profit } = calculateRecordTotals(record);
    
    // Safely convert doctorFees (string → number → formatted string)
    const doctorFeesNum = parseFloat(record.doctorFees || '0') || 0;
    const doctorFees = doctorFeesNum.toFixed(2);

    if (record.medicines && record.medicines.length > 0) {
      record.medicines.forEach((med, idx) => {
        const medicineTotal = calculateMedicineTotal(med).toFixed(2);
        const line = [
          record.date || '',
          record.patientName || '',
          `"${(record.diagnosis || '').replace(/"/g, '""')}"`,
          `"${(record.bloodPressure || 'Not recorded').replace(/"/g, '""')}"`,
          `"${(record.glucose || 'Not recorded').replace(/"/g, '""')}"`,
          `"${(record.temperature || 'Not recorded').replace(/"/g, '""')}"`,
          `"${(med.medicine || 'Unknown').replace(/"/g, '""')}"`,
          med.quantity ?? 0,
          (med.purchaseRate ?? 0).toFixed(2),
          (med.retailRate ?? 0).toFixed(2),
          (med.discount ?? 0).toFixed(2),
          (med.finalPrice ?? 0).toFixed(2),
          medicineTotal,
          idx === 0 ? doctorFees : '',
          idx === 0 ? totalSale.toFixed(2) : '',
          idx === 0 ? profit.toFixed(2) : '',
        ];
        rows.push(line.join(','));
      });
    } else {
      // Record with only doctor fees
      rows.push(
        [
          record.date || '',
          record.patientName || '',
          `"${(record.diagnosis || '').replace(/"/g, '""')}"`,
          `"${(record.bloodPressure || 'Not recorded').replace(/"/g, '""')}"`,
          `"${(record.glucose || 'Not recorded').replace(/"/g, '""')}"`,
          `"${(record.temperature || 'Not recorded').replace(/"/g, '""')}"`,
          '', '', '', '', '', '',
          '',
          doctorFees,
          totalSale.toFixed(2),
          profit.toFixed(2),
        ].join(',')
      );
    }
  });

  // ---- Overall Summary ----
  const overall = calculateOverallTotals(records);
  rows.push('');
  rows.push(',,,,,,,,,,,,SUMMARY,,');
  rows.push(`,,,,,,,,,,,,Total Sales,,Rs. ${overall.totalSales.toFixed(2)}`);
  rows.push(`,,,,,,,,,,,,Total Costs,,Rs. ${overall.totalCosts.toFixed(2)}`);
  rows.push(`,,,,,,,,,,,,Total Doctor Fees,,Rs. ${overall.totalDoctorFees.toFixed(2)}`);
  rows.push(`,,,,,,,,,,,,Total Profit,,Rs. ${overall.totalProfit.toFixed(2)}`);

  // ---- Branding & Final CSV ----
  const csvContent = [
    '****** NAEEM MEDICARE ******',
    'Medical Practice Management System',
    `Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`,
    '',
    header,
    ...rows,
    '',
    '****** Thank you for using Naeem Medicare ******',
  ].join('\n');

  // ---- Trigger Download ----
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Naeem_Medicare_Records_${new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
    .replace(/-/g, '')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  alert('Patient records exported successfully!');
};

/* ------------------------------------------------------------------ */
/*  EXPORT INVENTORY TO CSV                                           */
/* ------------------------------------------------------------------ */
export const exportInventoryToCSV = (inventory) => {
  if (!inventory || inventory.length === 0) {
    alert('No inventory to export!');
    return;
  }

  const header =
    'Medicine Name,Strength,Type,Pack Purchase Rate,Pack Retail Rate,Units Per Pack,' +
    'Total Packs,Total Units Available,Stock Status,Purchase/Unit,Retail/Unit';

  const rows = inventory.map((med) => {
    const purchasePerUnit = med.packPurchaseRate / (med.unitsPerPack || 1);
    const retailPerUnit = med.packRetailRate / (med.unitsPerPack || 1);
    const totalPacks = Math.floor(med.totalUnits / (med.unitsPerPack || 1));
    const stockStatus = med.totalUnits > 0 ? 'In Stock' : 'Out of Stock';

    return [
      `"${(med.name || '').replace(/"/g, '""')}"`,
      med.strength || '',
      med.type || '',
      (med.packPurchaseRate || 0).toFixed(2),
      (med.packRetailRate || 0).toFixed(2),
      med.unitsPerPack || 1,
      totalPacks,
      med.totalUnits || 0,
      stockStatus,
      purchasePerUnit.toFixed(2),
      retailPerUnit.toFixed(2),
    ].join(',');
  });

  const csvContent = [
    '****** NAEEM MEDICARE ******',
    'Medicine Inventory Report',
    `Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}`,
    '',
    header,
    ...rows,
    '',
    '****** Thank you for using Naeem Medicare ******',
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Naeem_Medicare_Inventory_${new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
    .replace(/-/g, '')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  alert('Inventory exported successfully!');
};