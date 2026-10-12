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

// ── 57mm Thermal Print Styles ────────────────────────────────────────────────
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
          width: 57mm !important;
          padding: 1.5mm 2mm !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        @page {
          size: 57mm auto;
          margin: 0;
        }
      }
    `}</style>
  );
}

// ── 57mm Thermal Receipt Component ───────────────────────────────────────────
export function Receipt({
  patientName,
  patientPhone,
  date,
  items = [],
  doctorFee = 0,
  billDiscount = 0,
  receiptRef,
}) {
  const itemsSubtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const generalDiscount = parseFloat(billDiscount) || 0;
  const drFee = parseFloat(doctorFee) || 0;
  const grandTotal = Math.max(0, itemsSubtotal - generalDiscount + drFee);

  const displayDate =
    date ||
    new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Karachi',
    });

  return (
    <div
      ref={receiptRef}
      id="receipt-print-area"
      className="bg-white border-2 border-gray-300 rounded-lg mx-auto"
      style={{
        width: '57mm',
        fontFamily: "'Courier New', Courier, monospace",
        padding: '1.5mm 2.5mm 3mm 2.5mm',
        color: '#000',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
      }}
    >
      {/* ── BOLD & CENTER-ALIGNED HEADING ── */}
      <div style={{ textAlign: 'center', marginBottom: '1.5mm' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            lineHeight: 1.2,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          NAEEM MEDICARE
        </div>
        <div
          style={{
            fontSize: '8px',
            fontWeight: 'bold',
            lineHeight: 1.35,
            marginTop: '1mm',
          }}
        >
          Street 10 Near Fazal Din Dairy Farm
          <br />
          Shahzad Sofa center, Noor e wali
          <br />
          Rahim Yar Khan
        </div>
        <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '1mm' }}>
          Ph: 03056802371
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed #000', margin: '1.2mm 0' }} />

      {/* Patient Info */}
      <div style={{ fontSize: '9px', fontWeight: 'bold', lineHeight: 1.35 }}>
        <div>Patient: {patientName || '—'}</div>
        {patientPhone && <div>Phone: {patientPhone}</div>}
        <div>Date: {displayDate}</div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed #000', margin: '1.2mm 0' }} />

      {/* ── 5 COLUMNS HEADER: ITEM, QTY, RATE, DISC, AMT (NO TYPE) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '7.5px',
          fontWeight: 'bold',
          marginBottom: '0.6mm',
        }}
      >
        <span style={{ flex: 1.4, textAlign: 'left' }}>ITEM</span>
        <span style={{ flex: 0.3, textAlign: 'center' }}>QTY</span>
        <span style={{ flex: 0.45, textAlign: 'center' }}>RATE</span>
        <span style={{ flex: 0.45, textAlign: 'center' }}>DISC</span>
        <span style={{ flex: 0.6, textAlign: 'right' }}>AMT</span>
      </div>

      <div style={{ borderTop: '1px solid #000', margin: '0.5mm 0' }} />

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
                fontSize: '8px',
                fontWeight: 'bold',
                lineHeight: 1.25,
                paddingTop: '0.4mm',
                paddingBottom: '0.4mm',
              }}
            >
              <span style={{ flex: 1.4, wordBreak: 'break-word', paddingRight: '0.5mm' }}>
                {cleanName}
              </span>
              <span style={{ flex: 0.3, textAlign: 'center' }}>{qty}</span>
              <span style={{ flex: 0.45, textAlign: 'center' }}>{rate.toFixed(0)}</span>
              <span style={{ flex: 0.45, textAlign: 'center' }}>
                {discPct > 0 ? `${discPct.toFixed(0)}%` : '-'}
              </span>
              <span style={{ flex: 0.6, textAlign: 'right' }}>{amt.toFixed(0)}</span>
            </div>
          );
        })
      ) : (
        <div style={{ fontSize: '8px', textAlign: 'center', color: '#666', padding: '2mm 0', fontWeight: 'bold' }}>
          No medicines added
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px dashed #000', margin: '1.2mm 0' }} />

      {/* Subtotal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', lineHeight: 1.35 }}>
        <span>Subtotal:</span>
        <span>Rs.{itemsSubtotal.toFixed(0)}</span>
      </div>

      {/* Bill Discount (if any) */}
      {generalDiscount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', lineHeight: 1.35 }}>
          <span>Discount:</span>
          <span>-Rs.{generalDiscount.toFixed(0)}</span>
        </div>
      )}

      {/* Doctor's Fee */}
      {drFee > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', lineHeight: 1.35 }}>
          <span>Dr's Fee:</span>
          <span>Rs.{drFee.toFixed(0)}</span>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '2px solid #000', margin: '1.2mm 0' }} />

      {/* Grand Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', lineHeight: 1.3 }}>
        <span>TOTAL:</span>
        <span>Rs.{grandTotal.toFixed(0)}</span>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2px solid #000', margin: '1.2mm 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: '#555', marginTop: '1.5mm' }}>
        Have a Nice Day 😊.
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

  // Save as 57mm Thermal PDF
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
      const imgWidth = 57;
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
              57mm Thermal Bill Preview
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
            receiptRef={receiptRef}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t space-y-2">
          <button
            onClick={handlePrint}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Printer size={18} /> Print Thermal Bill (57mm)
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
