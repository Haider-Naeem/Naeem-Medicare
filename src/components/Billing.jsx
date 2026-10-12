// src/components/Billing.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft, Plus, Trash2, Search, Printer, User, Phone,
  Package, Image as ImageIcon, FileText, Save, Clock, X,
  Calendar, CheckCircle, ChevronLeft, ChevronRight, Tag
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, limit
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Receipt, PrintStyles, cleanMedicineNameOnly } from './ReceiptModal';

// ── Clean Medicine Name and Extract Short Type ──────────────────────────────
const cleanMedicineNameAndType = (rawName, rawType) => {
  let name = (rawName || '').trim();
  let type = rawType || '';

  // Extract from parentheses like (Injection), (Syrup), (Tablet), etc.
  const parenMatch = name.match(/\s*\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].toLowerCase().trim();
    if (
      inside.includes('inj') || inside.includes('syr') || inside.includes('tab') ||
      inside.includes('cap') || inside.includes('drop') || inside.includes('susp') ||
      inside.includes('amp') || inside.includes('vial') || inside.includes('cream') ||
      inside.includes('oint') || inside.includes('sach')
    ) {
      type = inside;
      name = name.replace(parenMatch[0], '').trim();
    }
  }

  // Also check if type is appended at the end like " 500mg Injection"
  const endMatch = name.match(/\s+(injection|syrup|capsule|tablet)$/i);
  if (endMatch) {
    type = endMatch[1];
    name = name.replace(endMatch[0], '').trim();
  }

  const t = (type || '').toLowerCase().trim();
  let shortType = 'Tab';
  if (t.includes('inj') || t.includes('amp') || t.includes('vial')) shortType = 'Inj';
  else if (t.includes('syr') || t.includes('susp')) shortType = 'Syr';
  else if (t.includes('drop') || t.includes('drp')) shortType = 'Drp';
  else if (t.includes('cap')) shortType = 'Cap';
  else if (t.includes('sach')) shortType = 'Sach';
  else if (t.includes('crm') || t.includes('cream') || t.includes('oint')) shortType = 'Oint';
  else if (t.includes('tab')) shortType = 'Tab';

  return { cleanName: name, shortType };
};

// ── Main Billing Component ────────────────────────────────────────────────────
export default function Billing({ setCurrentPage, records = [], inventory = [] }) {
  // Patient state - EMPTY BY DEFAULT
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

  // Billing items
  const [billingItems, setBillingItems] = useState([]);
  const [doctorFee, setDoctorFee] = useState('');
  const [billDiscount, setBillDiscount] = useState('');

  // Medicine search
  const [medSearch, setMedSearch] = useState('');
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [medQuantity, setMedQuantity] = useState('1');
  const [medItemDiscount, setMedItemDiscount] = useState('');

  // Patient visits modal
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedPatientForVisits, setSelectedPatientForVisits] = useState('');

  // Saved bills state + pagination
  const [savedBills, setSavedBills] = useState([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedSearch, setSavedSearch] = useState('');
  const [savedPage, setSavedPage] = useState(1);
  const SAVED_PER_PAGE = 8;
  const [savingBill, setSavingBill] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const receiptRef = useRef(null);
  const patientInputRef = useRef(null);

  // ── Fetch saved bills from Firestore on mount ──
  useEffect(() => {
    const fetchSavedBills = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'posBills'), orderBy('createdAt', 'desc'), limit(100))
        );
        setSavedBills(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching saved bills:', err);
      }
    };
    fetchSavedBills();
  }, []);

  // ── Patient suggestions from existing patient records ──
  const patientSuggestions = useMemo(() => {
    const nameMap = new Map();
    records.forEach((record) => {
      const name = record.patientName?.trim();
      if (!name) return;
      if (!nameMap.has(name)) nameMap.set(name, true);
    });
    return Array.from(nameMap.keys()).sort();
  }, [records]);

  const filteredPatients = useMemo(() => {
    if (!patientName.trim()) return patientSuggestions.slice(0, 20);
    return patientSuggestions.filter((n) => n.toLowerCase().includes(patientName.toLowerCase()));
  }, [patientName, patientSuggestions]);

  // ── Patient visits lookup ──
  const getPatientVisits = (name) => {
    if (!name || !name.trim()) return [];
    return records
      .filter((r) => r.patientName?.trim().toLowerCase() === name.trim().toLowerCase())
      .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  };

  const currentPatientVisits = useMemo(() => {
    return getPatientVisits(patientName);
  }, [patientName, records]);

  // ── Handle Patient Selection ──
  const handleSelectPatient = (name) => {
    setPatientName(name);
    setShowPatientSuggestions(false);
    const visits = getPatientVisits(name);
    if (visits.length > 0) {
      setSelectedPatientForVisits(name);
      setShowVisitModal(true);
    }
  };

  // ── Auto-fill bill from a selected patient visit ──
  const loadVisitDetails = (visit) => {
    if (!visit) return;
    setPatientName(visit.patientName || 'Patient');
    setPatientPhone(visit.phone || visit.patientPhone || patientPhone || '');

    // Map medicines from visit with cleaned names, retail rates, and percentage discount
    const items = (visit.medicines || []).map((m) => {
      const qty = parseInt(m.quantity, 10) || 1;
      // In PatientRecords, m.discount is stored as discount percent (e.g., 70 for 70%)
      const discPct = parseFloat(m.discount) || 0;

      // Extract original retail rate before discount
      let retailRate = parseFloat(m.retailRate || m.pricePerUnit) || 0;
      if (!retailRate && m.finalPrice) {
        if (discPct > 0 && discPct < 100) {
          retailRate = parseFloat(m.finalPrice) / (1 - (discPct / 100));
        } else {
          retailRate = parseFloat(m.finalPrice);
        }
      }

      const gross = retailRate * qty;
      const discAmt = gross * (discPct / 100);
      const lineTotal = Math.max(0, gross - discAmt);
      const { cleanName, shortType } = cleanMedicineNameAndType(m.medicine || m.fullName || m.name, m.type);

      return {
        id: m.medicineId || m.id || `${Date.now()}-${Math.random()}`,
        name: cleanName,
        type: shortType,
        quantity: qty,
        pricePerUnit: Number(retailRate.toFixed(2)),
        discountPercent: discPct,
        discountAmount: Number(discAmt.toFixed(2)),
        total: Number(lineTotal.toFixed(2)),
      };
    });

    setBillingItems(items);
    setDoctorFee(visit.doctorFees ? visit.doctorFees.toString() : '');
    setBillDiscount('');
    setShowVisitModal(false);
  };

  // ── Medicine suggestions ──
  const filteredMedicines = useMemo(() => {
    if (!medSearch.trim()) return [];
    return inventory
      .filter((med) => {
        if (!med || !med.name || med.isDeleted) return false;
        const full = `${med.name} ${med.strength || ''}`.toLowerCase();
        return full.includes(medSearch.toLowerCase()) && med.totalUnits > 0;
      })
      .slice(0, 15);
  }, [medSearch, inventory]);

  // ── Select medicine ──
  const selectMedicine = (med) => {
    const unitsPerPack = med.unitsPerPack || 1;
    const retailPerUnit = (med.packRetailRate || 0) / unitsPerPack;
    const { cleanName, shortType } = cleanMedicineNameAndType(`${med.name} ${med.strength || ''}`, med.type);
    setSelectedMed({
      id: med.id,
      name: cleanName,
      type: shortType,
      pricePerUnit: Number(retailPerUnit.toFixed(2)),
      available: med.totalUnits,
    });
    setMedSearch(cleanName);
    setShowMedSuggestions(false);
    setMedQuantity('1');
    setMedItemDiscount('');
  };

  // ── Add to billing items ──
  const addToBill = () => {
    if (!selectedMed) return;

    const qty = parseInt(medQuantity, 10) || 1;
    const rate = selectedMed.pricePerUnit || 0;
    const discPct = Math.min(100, Math.max(0, parseFloat(medItemDiscount) || 0));
    const gross = rate * qty;
    const discAmt = gross * (discPct / 100);
    const lineTotal = Math.max(0, gross - discAmt);

    setBillingItems((prev) => [
      ...prev,
      {
        id: selectedMed.id,
        name: selectedMed.name,
        type: selectedMed.type,
        quantity: qty,
        pricePerUnit: rate,
        discountPercent: discPct,
        discountAmount: Number(discAmt.toFixed(2)),
        total: Number(lineTotal.toFixed(2)),
      },
    ]);

    setSelectedMed(null);
    setMedSearch('');
    setMedQuantity('1');
    setMedItemDiscount('');
  };

  // ── Update item rate directly in the table row (Static text input) ──
  const updateItemRate = (index, newRate) => {
    const rate = parseFloat(newRate);
    const validRate = isNaN(rate) ? 0 : rate;
    setBillingItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const discPct = parseFloat(item.discountPercent !== undefined ? item.discountPercent : item.discount) || 0;
          const gross = validRate * item.quantity;
          const discAmt = gross * (discPct / 100);
          return {
            ...item,
            pricePerUnit: validRate,
            discountAmount: Number(discAmt.toFixed(2)),
            total: Number(Math.max(0, gross - discAmt).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  // ── Update item quantity directly in the table row (Static text input) ──
  const updateItemQty = (index, newQty) => {
    const qty = parseInt(newQty, 10);
    const validQty = isNaN(qty) || qty < 1 ? 1 : qty;
    setBillingItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const discPct = parseFloat(item.discountPercent !== undefined ? item.discountPercent : item.discount) || 0;
          const gross = item.pricePerUnit * validQty;
          const discAmt = gross * (discPct / 100);
          return {
            ...item,
            quantity: validQty,
            discountAmount: Number(discAmt.toFixed(2)),
            total: Number(Math.max(0, gross - discAmt).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  // ── Update item discount % directly in the table row (e.g. Syringe 70% discount) ──
  const updateItemDiscount = (index, newDiscount) => {
    const discPct = parseFloat(newDiscount);
    const validDiscPct = isNaN(discPct) || discPct < 0 ? 0 : Math.min(100, discPct);
    setBillingItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const gross = item.pricePerUnit * item.quantity;
          const discAmt = gross * (validDiscPct / 100);
          return {
            ...item,
            discountPercent: validDiscPct,
            discountAmount: Number(discAmt.toFixed(2)),
            total: Number(Math.max(0, gross - discAmt).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  // ── Remove item ──
  const removeFromBill = (index) => {
    setBillingItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Totals ──
  const itemsSubtotal = billingItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const itemsDiscountTotal = billingItems.reduce((sum, item) => sum + (parseFloat(item.discountAmount) || 0), 0);
  const generalDiscount = parseFloat(billDiscount) || 0;
  const totalDiscount = itemsDiscountTotal + generalDiscount;
  const drFee = parseFloat(doctorFee) || 0;
  const grandTotal = Math.max(0, itemsSubtotal - generalDiscount + drFee);

  // ── Print ──
  const handlePrint = () => {
    if (billingItems.length === 0 && !(parseFloat(doctorFee) > 0)) {
      return alert('Add at least one item or doctor fee before printing.');
    }
    window.print();
  };

  // ── Save as Image (PNG) ──
  const handleSaveAsImage = async () => {
    if (billingItems.length === 0 && !(parseFloat(doctorFee) > 0)) {
      return alert('Add at least one item or doctor fee first.');
    }
    const element = receiptRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY,
      });
      const link = document.createElement('a');
      const safeName = (patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Bill_${safeName}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error saving image:', err);
      alert('Failed to save image: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Save as PDF (57mm Thermal Size) ──
  const handleSaveAsPDF = async () => {
    if (billingItems.length === 0 && !(parseFloat(doctorFee) > 0)) {
      return alert('Add at least one item or doctor fee first.');
    }
    const element = receiptRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY,
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 57; // 57mm width
      const pageHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, pageHeight],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
      const safeName = (patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Bill_${safeName}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Error saving PDF:', err);
      alert('Failed to save PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Save Bill to Firestore ──
  const handleSaveBill = async () => {
    if (billingItems.length === 0 && !(parseFloat(doctorFee) > 0)) {
      return alert('Add at least one item or doctor fee before saving.');
    }

    setSavingBill(true);
    try {
      const billData = {
        patientName: patientName.trim() || 'Patient',
        patientPhone: patientPhone.trim(),
        items: billingItems,
        doctorFee: parseFloat(doctorFee) || 0,
        billDiscount: parseFloat(billDiscount) || 0,
        subtotal: itemsSubtotal,
        totalDiscount,
        grandTotal,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'posBills'), billData);
      const savedWithId = { id: docRef.id, ...billData };
      setSavedBills((prev) => [savedWithId, ...prev]);
      alert('Bill saved successfully! You can reprint it anytime from "Saved Bills".');
    } catch (err) {
      console.error('Error saving bill:', err);
      alert('Failed to save bill: ' + err.message);
    } finally {
      setSavingBill(false);
    }
  };

  // ── Load a saved bill for reprint ──
  const loadSavedBill = (bill) => {
    setPatientName(bill.patientName || '');
    setPatientPhone(bill.patientPhone || '');
    const loadedItems = (bill.items || []).map((item) => {
      const discPct = parseFloat(item.discountPercent !== undefined ? item.discountPercent : item.discount) || 0;
      const rate = parseFloat(item.pricePerUnit) || 0;
      const qty = parseInt(item.quantity, 10) || 1;
      const gross = rate * qty;
      const discAmt = gross * (discPct / 100);
      const lineTotal = item.total !== undefined ? parseFloat(item.total) : Math.max(0, gross - discAmt);
      return {
        ...item,
        quantity: qty,
        pricePerUnit: rate,
        discountPercent: discPct,
        discountAmount: Number(discAmt.toFixed(2)),
        total: Number(lineTotal.toFixed(2)),
      };
    });
    setBillingItems(loadedItems);
    setDoctorFee(bill.doctorFee ? bill.doctorFee.toString() : '');
    setBillDiscount(bill.billDiscount ? bill.billDiscount.toString() : '');
    setShowSavedModal(false);
  };

  // ── Delete a saved bill ──
  const deleteSavedBill = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved bill?')) return;
    try {
      await deleteDoc(doc(db, 'posBills', id));
      setSavedBills((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Error deleting bill:', err);
      alert('Failed to delete bill.');
    }
  };

  // ── Clear bill ──
  const clearBill = () => {
    setBillingItems([]);
    setDoctorFee('');
    setBillDiscount('');
    setPatientName('');
    setPatientPhone('');
    setSelectedMed(null);
    setMedSearch('');
    setMedQuantity('1');
    setMedItemDiscount('');
  };

  // Filtered and paginated saved bills in modal
  const filteredSavedBills = useMemo(() => {
    if (!savedSearch.trim()) return savedBills;
    const q = savedSearch.toLowerCase();
    return savedBills.filter(
      (b) =>
        (b.patientName || '').toLowerCase().includes(q) ||
        (b.patientPhone || '').includes(q)
    );
  }, [savedBills, savedSearch]);

  const totalSavedPages = Math.max(1, Math.ceil(filteredSavedBills.length / SAVED_PER_PAGE));
  const paginatedSavedBills = useMemo(() => {
    const start = (savedPage - 1) * SAVED_PER_PAGE;
    return filteredSavedBills.slice(start, start + SAVED_PER_PAGE);
  }, [filteredSavedBills, savedPage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-6 pb-36 sm:pb-48">
      <PrintStyles />

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6 pb-12 sm:pb-16 mb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
              POS Billing
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSavedPage(1);
                setShowSavedModal(true);
              }}
              className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-semibold flex items-center gap-1.5 transition-all shadow"
            >
              <Clock size={16} /> Saved Bills ({savedBills.length})
            </button>
            <button
              onClick={clearBill}
              className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-gray-600 text-sm transition-all"
            >
              Clear
            </button>
            <button
              onClick={() => setCurrentPage('home')}
              className="bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-gray-800 flex items-center gap-1.5 text-sm transition-all"
            >
              <ArrowLeft size={16} /> Home
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── LEFT SIDE: Form ── */}
          <div className="space-y-5">
            {/* Patient Info */}
            <div className="border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50/60 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                  <User size={20} /> Patient Information
                </h2>
                {currentPatientVisits.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedPatientForVisits(patientName);
                      setShowVisitModal(true);
                    }}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition"
                  >
                    <Calendar size={13} /> {currentPatientVisits.length} Visits Found (Load)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Patient Name with autocomplete */}
                <div className="relative" ref={patientInputRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => {
                      setPatientName(e.target.value);
                      setShowPatientSuggestions(true);
                    }}
                    onFocus={() => setShowPatientSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPatientSuggestions(false), 200)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Type or select patient..."
                  />
                  {showPatientSuggestions && filteredPatients.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-xl max-h-48 overflow-y-auto">
                      {filteredPatients.map((name, idx) => {
                        const vCount = getPatientVisits(name).length;
                        return (
                          <li
                            key={idx}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectPatient(name);
                            }}
                            className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm flex justify-between items-center"
                          >
                            <span className="font-medium text-gray-800">{name}</span>
                            {vCount > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                {vCount} {vCount === 1 ? 'visit' : 'visits'}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone size={14} className="inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="03xxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            {/* Medicine Search & Add */}
            <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50/60 shadow-sm">
              <h2 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
                <Package size={20} /> Add Medicine
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {/* Search */}
                <div className="relative sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Search Medicine</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      value={medSearch}
                      onChange={(e) => {
                        setMedSearch(e.target.value);
                        setShowMedSuggestions(true);
                        setSelectedMed(null);
                      }}
                      onFocus={() => setShowMedSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowMedSuggestions(false), 200)}
                      className="w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-green-500"
                      placeholder="Type medicine name..."
                    />
                  </div>
                  {showMedSuggestions && filteredMedicines.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-xl max-h-48 overflow-y-auto">
                      {filteredMedicines.map((med) => {
                        const { cleanName, shortType } = cleanMedicineNameAndType(`${med.name} ${med.strength || ''}`, med.type);
                        return (
                          <li
                            key={med.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectMedicine(med);
                            }}
                            className="px-3 py-2 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-semibold text-sm text-gray-800">
                              <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded mr-1">
                                {shortType}
                              </span>
                              {cleanName}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Stock: {med.totalUnits} | Rs.
                              {((med.packRetailRate || 0) / (med.unitsPerPack || 1)).toFixed(2)}/unit
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Quantity (Static text input) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={medQuantity}
                    onChange={(e) => setMedQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 border rounded-md text-sm text-center font-bold focus:ring-2 focus:ring-green-500"
                    placeholder="1"
                  />
                </div>

                {/* Item Discount (Percentage) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Disc (%)</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={medItemDiscount}
                      onChange={(e) => setMedItemDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full pl-2 pr-6 py-2 border rounded-md text-sm text-center font-bold text-red-600 focus:ring-2 focus:ring-green-500"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-2 text-xs font-bold text-red-500">%</span>
                  </div>
                </div>

                {/* Add button */}
                <div className="flex items-end">
                  <button
                    onClick={addToBill}
                    disabled={!selectedMed}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-1 font-semibold text-sm transition-all shadow"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {selectedMed && (
                <div className="mt-2 text-xs bg-white rounded-lg px-3 py-2 border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                      {selectedMed.type}
                    </span>
                    <span className="font-semibold text-gray-800">{selectedMed.name}</span>
                    <span className="text-gray-500 ml-2">Retail: {selectedMed.pricePerUnit.toFixed(2)}</span>
                  </div>
                  <span className="text-green-600 font-bold">
                    = {((selectedMed.pricePerUnit * (parseInt(medQuantity, 10) || 1)) * (1 - (Math.min(100, parseFloat(medItemDiscount) || 0) / 100))).toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Added Items Table (Larger font, editable rate and discount %, no 'Rs.' prefix in row) */}
            {billingItems.length > 0 && (
              <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-bold text-gray-800">
                    Bill Items ({billingItems.length})
                  </h3>
                  <span className="text-xs text-gray-500 italic">
                    Rate, Qty & Disc (%) directly editable below
                  </span>
                </div>
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-sm font-bold text-gray-700">Medicine</th>
                        <th className="px-3 py-2.5 text-center text-sm font-bold text-gray-700">Qty</th>
                        <th className="px-3 py-2.5 text-right text-sm font-bold text-gray-700">Rate</th>
                        <th className="px-3 py-2.5 text-center text-sm font-bold text-red-600">Disc (%)</th>
                        <th className="px-3 py-2.5 text-right text-sm font-bold text-gray-700">Total</th>
                        <th className="px-3 py-2.5 text-center text-sm font-bold text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {billingItems.map((item, idx) => {
                        const discVal = item.discountPercent !== undefined && item.discountPercent !== null
                          ? item.discountPercent
                          : (item.discount !== undefined ? item.discount : '');
                        return (
                          <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                            {/* Medicine Name with short type badge in front */}
                            <td className="px-3 py-2.5 text-sm sm:text-base font-semibold text-gray-900">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                                  {item.type || 'Tab'}
                                </span>
                                <span>{item.name}</span>
                              </div>
                            </td>

                            {/* Editable Quantity (Static text input) */}
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={item.quantity}
                                onChange={(e) => updateItemQty(idx, e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-14 px-2 py-1 text-sm sm:text-base font-bold border border-gray-300 rounded text-center focus:ring-2 focus:ring-indigo-500"
                              />
                            </td>

                            {/* Editable Rate (NO 'Rs.' prefix) */}
                            <td className="px-3 py-2.5 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.pricePerUnit}
                                onChange={(e) => updateItemRate(idx, e.target.value)}
                                className="w-20 px-2 py-1 text-sm sm:text-base font-bold border border-gray-300 rounded text-right focus:ring-2 focus:ring-indigo-500"
                                title="Click to edit rate"
                              />
                            </td>

                            {/* Editable Discount % (NO 'Rs.' prefix) */}
                            <td className="px-3 py-2.5 text-center">
                              <div className="inline-flex items-center justify-center">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={discVal}
                                  placeholder="0"
                                  onChange={(e) => updateItemDiscount(idx, e.target.value.replace(/[^0-9.]/g, ''))}
                                  className="w-14 px-1.5 py-1 text-sm sm:text-base font-bold border border-red-300 rounded text-center text-red-600 focus:ring-2 focus:ring-red-500"
                                  title="Discount percentage (%)"
                                />
                                <span className="text-xs font-bold text-red-500 ml-1">%</span>
                              </div>
                            </td>

                            {/* Total (NO 'Rs.' prefix in row) */}
                            <td className="px-3 py-2.5 text-right text-sm sm:text-base font-bold text-green-700">
                              {parseFloat(item.total).toFixed(0)}
                            </td>

                            {/* Delete Action */}
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => removeFromBill(idx)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Doctor's Fee & Bill Discount Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Doctor's Fee (Static text input) */}
              <div className="border-2 border-blue-200 rounded-xl p-3 bg-blue-50/70 shadow-sm">
                <label className="block text-xs font-bold text-blue-800 mb-1">Doctor's Fee (Rs.)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={doctorFee}
                  onChange={(e) => setDoctorFee(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  placeholder="e.g. 500"
                />
              </div>

              {/* Overall Bill Discount (Static text input) */}
              <div className="border-2 border-red-200 rounded-xl p-3 bg-red-50/70 shadow-sm">
                <label className="block text-xs font-bold text-red-800 mb-1">Overall Discount (Rs.)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={billDiscount}
                  onChange={(e) => setBillDiscount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 text-sm font-semibold text-red-600"
                  placeholder="e.g. 50"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-white/80">Subtotal:</span>
                <span className="font-semibold">₨{itemsSubtotal.toFixed(0)}</span>
              </div>
              {generalDiscount > 0 && (
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className="text-red-200">Bill Discount:</span>
                  <span className="font-semibold text-red-200">-₨{generalDiscount.toFixed(0)}</span>
                </div>
              )}
              {itemsDiscountTotal > 0 && (
                <div className="flex justify-between items-center mb-1 text-xs text-white/75">
                  <span className="italic">Medicine Discounts (Saved):</span>
                  <span className="font-semibold text-emerald-200">₨{itemsDiscountTotal.toFixed(0)}</span>
                </div>
              )}
              {drFee > 0 && (
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className="text-white/80">Doctor's Fee:</span>
                  <span className="font-semibold">₨{drFee.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/30">
                <span className="text-lg font-bold">TOTAL:</span>
                <span className="text-2xl font-bold">₨{grandTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Action Buttons: Print, Save Image, Save PDF, Save Bill */}
            <div className="space-y-2.5">
              <button
                onClick={handlePrint}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:from-green-700 hover:to-emerald-700 shadow-lg transition-all active:scale-95"
              >
                <Printer size={22} /> Print Receipt (57mm)
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Save as Image */}
                <button
                  onClick={handleSaveAsImage}
                  disabled={isExporting}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 disabled:bg-gray-400"
                >
                  <ImageIcon size={18} /> Save as Image
                </button>

                {/* Save as PDF */}
                <button
                  onClick={handleSaveAsPDF}
                  disabled={isExporting}
                  className="bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 disabled:bg-gray-400"
                >
                  <FileText size={18} /> Save as PDF
                </button>

                {/* Save Bill to History */}
                <button
                  onClick={handleSaveBill}
                  disabled={savingBill}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 disabled:bg-gray-400"
                >
                  <Save size={18} /> {savingBill ? 'Saving...' : 'Save Bill'}
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDE: Receipt Preview ── */}
          <div>
            <div className="sticky top-6">
              <h2 className="text-lg font-bold text-gray-700 mb-3 text-center">Receipt Preview</h2>
              <div className="flex justify-center">
                <Receipt
                  receiptRef={receiptRef}
                  patientName={patientName}
                  patientPhone={patientPhone}
                  items={billingItems}
                  doctorFee={doctorFee}
                  billDiscount={billDiscount}
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                Preview shows actual 57mm thermal receipt layout
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PATIENT VISITS SELECTION MODAL ── */}
      {showVisitModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowVisitModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 pb-2 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="text-indigo-600" size={20} />
                  Visits for: {selectedPatientForVisits}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select a visit to auto-fill medicine prescription & rates. You can edit any details.
                </p>
              </div>
              <button
                onClick={() => setShowVisitModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
              {getPatientVisits(selectedPatientForVisits).map((v, i) => (
                <div
                  key={v.id || i}
                  className="border-2 border-indigo-100 hover:border-indigo-500 rounded-xl p-3.5 bg-indigo-50/30 hover:bg-indigo-50 transition flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-indigo-900 text-sm">
                        Visit {getPatientVisits(selectedPatientForVisits).length - i}: {v.date || 'Recent'}
                      </span>
                      {v.diagnosis && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          <span className="font-medium">Diagnosis:</span> {v.diagnosis}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => loadVisitDetails(v)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow"
                    >
                      Auto-Fill This Visit
                    </button>
                  </div>

                  {/* Medicines preview with short types */}
                  <div className="text-xs text-gray-700 bg-white/80 p-2 rounded border">
                    <span className="font-semibold text-gray-800">Prescribed: </span>
                    {(v.medicines || [])
                      .map((m) => {
                        const { cleanName, shortType } = cleanMedicineNameAndType(m.medicine || m.name, m.type);
                        return `[${shortType}] ${cleanName} (Qty: ${m.quantity})`;
                      })
                      .join(', ') || 'No medicines recorded'}
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                    <span>Doctor Fee: Rs.{v.doctorFees || 0}</span>
                    <span className="font-semibold text-green-700">
                      Total: Rs.{v.totalCashCollected || v.totalAmount || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowVisitModal(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Start with Blank Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SAVED BILLS MODAL WITH PAGINATION ── */}
      {showSavedModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowSavedModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Clock className="text-indigo-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">
                  Saved Bills History ({filteredSavedBills.length})
                </h3>
              </div>
              <button
                onClick={() => setShowSavedModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by patient name or phone..."
                value={savedSearch}
                onChange={(e) => {
                  setSavedSearch(e.target.value);
                  setSavedPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {paginatedSavedBills.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No saved bills found. Click "Save Bill" on any receipt to store it here.
                </div>
              ) : (
                paginatedSavedBills.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => loadSavedBill(b)}
                    className="p-3.5 border rounded-xl hover:border-indigo-500 hover:bg-indigo-50/40 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm sm:text-base">
                          {b.patientName || 'Walk-in Patient'}
                        </span>
                        {b.patientPhone && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                            {b.patientPhone}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {b.createdAt ? new Date(b.createdAt).toLocaleString('en-GB') : '—'} •{' '}
                        {b.items?.length || 0} items
                        {b.doctorFee > 0 && ` • Dr Fee: Rs.${b.doctorFee}`}
                        {b.totalDiscount > 0 && ` • Disc: Rs.${b.totalDiscount}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      <span className="text-base sm:text-lg font-bold text-green-700">
                        Rs.{b.grandTotal?.toFixed(0) || 0}
                      </span>
                      <button
                        onClick={() => loadSavedBill(b)}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                      >
                        Load & Print
                      </button>
                      <button
                        onClick={(e) => deleteSavedBill(b.id, e)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition"
                        title="Delete bill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalSavedPages > 1 && (
              <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-gray-600">
                <span>
                  Page {savedPage} of {totalSavedPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={savedPage <= 1}
                    onClick={() => setSavedPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border rounded-lg hover:bg-gray-100 disabled:opacity-40 flex items-center gap-1 font-semibold"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    disabled={savedPage >= totalSavedPages}
                    onClick={() => setSavedPage((p) => Math.min(totalSavedPages, p + 1))}
                    className="px-3 py-1.5 border rounded-lg hover:bg-gray-100 disabled:opacity-40 flex items-center gap-1 font-semibold"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
