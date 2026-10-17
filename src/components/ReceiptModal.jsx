// src/components/ReceiptModal.jsx
import React, { useRef, useState } from 'react';
import { Printer, Image as ImageIcon, FileText, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ── Clean Medicine Name (strip embedded types and parentheses) ───────────────
export const cleanMedicineNameOnly = (rawName) => {
  let name = (rawName || '').trim();
  // Strip parentheses like (Injection), (Syrup), (Tablet), (500mg Injection), etc.
  name = name.replace(/\s*\([^)]*\)/g, '').trim();
  // Strip trailing words like injection, syrup, capsule, tablet
  name = name.replace(/\s+(injection|syrup|capsule|tablet)$/i, '').trim();
  return name || 'Medicine';
};

// ── 80mm Thermal Print Styles ────────────────────────────────────────────────
export function PrintStyles() {
  return (
    <style>{`
      @media print {
        body * {
          visibility: hidden !important;
        }
        #receipt-print-area,
        #receipt-print-area * {
          visibility: visible !important;
        }
        #receipt-print-area {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 80mm !important;
          padding: 0.5mm 3.5mm 3.5mm 3.5mm !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          font-family: 'Segoe UI', Arial, sans-serif !important;
          font-weight: 900 !important;
          color: #000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          -webkit-text-stroke: 0.35px #000 !important;
        }
        #receipt-print-area * {
          font-family: 'Segoe UI', Arial, sans-serif !important;
          font-weight: 900 !important;
          color: #000 !important;
          -webkit-text-stroke: 0.25px #000 !important;
        }
        @page {
          size: 80mm auto;
          margin: 0;
        }
      }
    `}</style>
  );
}

// ── Format Date strictly as DD-MM-YYYY (Left to Right) ─────────────────────────
export const formatDDMMYYYY = (rawDate) => {
  if (!rawDate) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const str = String(rawDate).trim();

  // If already DD-MM-YYYY (e.g. 16-10-2026)
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // If YYYY-MM-DD (e.g. 2026-10-16 or 2026-10-16T...)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // If DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str.replace(/\//g, '-');
  }

  // Parse via Date object
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return str;
};

// ── 80mm Thermal Receipt Component ───────────────────────────────────────────
export function Receipt({
  patientName,
  patientPhone,
  date,
  items = [],
  doctorFee = 0,
  billDiscount = 0,
  doctorName = 'Dr. Huzaifa Naeem',
  pmdcNo = '947956-01-M',
  receiptRef,
}) {
  const itemsSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const generalDiscount = parseFloat(billDiscount) || 0;
  const drFee = parseFloat(doctorFee) || 0;
  const grandTotal = Math.max(0, itemsSubtotal - generalDiscount + drFee);

  const displayDate = formatDDMMYYYY(date);

  return (
    <div
      ref={receiptRef}
      id="receipt-print-area"
      className="bg-white mx-auto"
      style={{
        width: '80mm',
        fontFamily: "'Segoe UI', Arial, -apple-system, sans-serif",
        padding: '0.5mm 0.5mm 5mm 0.5mm',
        color: '#000',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
        fontWeight: '900',
        border: 'none',
        borderRadius: '0',
        boxShadow: 'none',
      }}
    >
      {/* ── BOLD & CENTER-ALIGNED HEADING ── */}
      <div style={{ textAlign: 'center', marginBottom: '2.5mm', marginTop: '0', paddingTop: '0' }}>
        <div
          style={{
            fontSize: '20px',
            fontWeight: '900',
            lineHeight: 1.1,
            letterSpacing: '5px',
            textTransform: 'uppercase',
            color: '#000',
            margin: '0',
            padding: '0',
          }}
        >
          NAEEM MEDICARE
        </div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: '900',
            lineHeight: 1.35,
            letterSpacing: '0.9px',
            marginTop: '1mm',
            color: '#000',
          }}
        >
          Street 10 Near Fazal Din Dairy Farm
          <br />
          Shahzad Sofa center, Noor e wali
          <br />
          Rahim Yar Khan
        </div>
        <div style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '1px', marginTop: '1mm', color: '#000' }}>
          Ph: 03056802371
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2px dotted #000', margin: '1.8mm 0' }} />

      {/* Doctor Info */}
      <div style={{ fontSize: '15px', fontWeight: '900', lineHeight: 1.45, color: '#000' }}>
        <div>DR. Name : {doctorName}</div>
        <div>PMDC NO: {pmdcNo}</div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2px dotted #000', margin: '1.8mm 0' }} />

      {/* Patient Info */}
      <div style={{ fontSize: '13px', fontWeight: '900', lineHeight: 1.45, color: '#000' }}>
        <div>PATIENT: {patientName || '—'}</div>
        {patientPhone && <div>PHONE: {patientPhone}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>DATE:</span>
          <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>{displayDate}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2px dotted #000', margin: '1.8mm 0' }} />

      {/* ── 5 COLUMNS HEADER: ITEM, QTY, RATE, DISC, AMT (NO TYPE) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12.5px',
          fontWeight: '900',
          marginBottom: '1mm',
          color: '#000',
        }}
      >
        <span style={{ flex: 1.6, textAlign: 'left', fontWeight: '900' }}>ITEM</span>
        <span style={{ flex: 0.35, textAlign: 'center', fontWeight: '900' }}>QTY</span>
        <span style={{ flex: 0.5, textAlign: 'center', fontWeight: '900' }}>RATE</span>
        <span style={{ flex: 0.45, textAlign: 'center', fontWeight: '900' }}>DISC</span>
        <span style={{ flex: 0.65, textAlign: 'right', fontWeight: '900' }}>AMT</span>
      </div>

      <div style={{ borderTop: '2px solid #000', margin: '1mm 0' }} />

      {/* Items List */}
      {items.length > 0 ? (
        items.map((item, idx) => {
          const cleanName = cleanMedicineNameOnly(item.name || item.medicine);
          const qty = item.quantity || 1;
          const rate = parseFloat(item.pricePerUnit || item.retailRate || 0);
          const discPct = parseFloat(
            item.discountPercent !== undefined ? item.discountPercent : item.discount
          ) || 0;
          const amt = parseFloat(item.total !== undefined ? item.total : item.medicineTotal || 0);

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: '13px',
                fontWeight: '900',
                lineHeight: 1.35,
                paddingTop: '0.8mm',
                paddingBottom: '0.8mm',
                color: '#000',
              }}
            >
              <span style={{ flex: 1.6, wordBreak: 'break-word', paddingRight: '1mm', fontWeight: '900' }}>
                {cleanName}
              </span>
              <span style={{ flex: 0.35, textAlign: 'center', fontWeight: '900' }}>{qty}</span>
              <span style={{ flex: 0.5, textAlign: 'center', fontWeight: '900' }}>{rate.toFixed(0)}</span>
              <span style={{ flex: 0.45, textAlign: 'center', fontWeight: '900' }}>
                {discPct > 0 ? `${discPct.toFixed(0)}%` : '-'}
              </span>
              <span style={{ flex: 0.65, textAlign: 'right', fontWeight: '900' }}>{amt.toFixed(0)}</span>
            </div>
          );
        })
      ) : (
        <div style={{ fontSize: '13px', textAlign: 'center', color: '#000', padding: '2mm 0', fontWeight: '900' }}>
          No medicines added
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '2px dashed #000', margin: '1.8mm 0' }} />

      {/* Subtotal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: '900', lineHeight: 1.45, color: '#000' }}>
        <span>SUBTOTAL:</span>
        <span>Rs.{itemsSubtotal.toFixed(0)}</span>
      </div>

      {/* Bill Discount (if any) */}
      {generalDiscount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: '900', lineHeight: 1.45, color: '#000' }}>
          <span>DISCOUNT:</span>
          <span>-Rs.{generalDiscount.toFixed(0)}</span>
        </div>
      )}

      {/* Doctor's Fee */}
      {drFee > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: '900', lineHeight: 1.45, color: '#000' }}>
          <span>DR'S FEE:</span>
          <span>Rs.{drFee.toFixed(0)}</span>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '2.5px solid #000', margin: '1.8mm 0' }} />

      {/* Grand Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '900', lineHeight: 1.35, color: '#000' }}>
        <span>TOTAL:</span>
        <span>Rs.{grandTotal.toFixed(0)}</span>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2.5px solid #000', margin: '1.8mm 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '900', color: '#000', marginTop: '2mm' }}>
        Have a Nice Day ⭐.
      </div>
    </div>
  );
}

// ── Shared Reusable Receipt Modal ─────────────────────────────────────────────
export default function ReceiptModal({
  isOpen,
  onClose,
  patientName,
  patientPhone,
  date,
  items = [],
  doctorFee = 0,
  billDiscount = 0,
  doctorName = 'Dr. Huzaifa Naeem',
  pmdcNo = '947956-01-M',
}) {
  const receiptRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Print directly
  const handlePrint = () => {
    window.print();
  };

  // Save as PNG Image
  const handleSaveImage = async () => {
    const el = receiptRef.current;
    if (!el) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      const safeName = (patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Bill_${safeName}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
      alert('Failed to save image: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Save as 80mm Thermal PDF
  const handleSavePDF = async () => {
    const el = receiptRef.current;
    if (!el) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80;
      const pageHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, pageHeight],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
      const safeName = (patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Bill_${safeName}_${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to save PDF: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <PrintStyles />
      <div
        className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 mb-3 border-b">
          <div className="flex items-center gap-2">
            <Printer size={20} className="text-indigo-600" />
            <h3 className="text-base sm:text-lg font-bold text-gray-800">
              80mm Thermal Bill Preview
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto py-2 bg-gray-50 rounded-xl p-3 flex justify-center items-start">
          <Receipt
            patientName={patientName}
            patientPhone={patientPhone}
            date={date}
            items={items}
            doctorFee={doctorFee}
            billDiscount={billDiscount}
            doctorName={doctorName}
            pmdcNo={pmdcNo}
            receiptRef={receiptRef}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t space-y-2">
          <button
            onClick={handlePrint}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Printer size={18} /> Print Thermal Bill (80mm)
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSaveImage}
              disabled={isExporting}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <ImageIcon size={15} /> Save Image
            </button>
            <button
              onClick={handleSavePDF}
              disabled={isExporting}
              className="bg-rose-600 hover:bg-rose-700 text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <FileText size={15} /> Save PDF
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
