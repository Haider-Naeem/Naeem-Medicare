// src/components/TBPatients.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, X, Edit2, Trash2, Save, ChevronLeft, Search,
  User, Calendar, Weight, FileText, MapPin, CreditCard,
  Activity, Heart, Cigarette, MessageSquare, ChevronDown,
  Hash, Pill, Clock, ClipboardList, CalendarCheck, ChevronUp,
  Stethoscope, AlertCircle, Eye
} from 'lucide-react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';

const TB_RESULT_OPTIONS = ['Positive', 'Negative', 'Pending', 'Under Investigation'];
const HIV_STATUS_OPTIONS = ['Positive', 'Negative', 'Unknown', 'Not Tested'];
const ATT_RECEIVED_OPTIONS = ['Yes', 'No', 'Partial'];
const YES_NO = ['Yes', 'No'];
const MEDICINE_DOSE_OPTIONS = ['RHZE (2RHZE/4RH)', 'RHZ (2RHZ/4RH)', 'RH Daily', 'RH 3x/week', 'DOTS Category I', 'DOTS Category II', 'Custom'];

const emptyForm = {
  ptName: '',
  tbRegNo: '',
  age: '',
  weight: '',
  tbResult: '',
  hivStatus: '',
  reportedOn: '',
  attReceived: '',
  attStarted: '',
  address: '',
  cnic: '',
  dm: 'No',
  htn: 'No',
  smoker: 'No',
  otherComments: '',
  nextAppointmentDate: '',
  totalMedicineGiven: '',
  medicineDose: '',
  nextMedicineDueDate: '',
};

const emptyVisit = {
  visitDate: '',
  weight: '',
  medicineDose: '',
  totalMedicineGiven: '',
  nextAppointmentDate: '',
  nextMedicineDueDate: '',
  notes: '',
};

// ─── Reusable Field Components ───────────────────────────────────────────────

function SelectField({ label, value, onChange, options, icon: Icon, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500">
            <Icon size={14} />
          </span>
        )}
        <select
          value={value}
          onChange={onChange}
          className={`w-full ${Icon ? 'pl-8' : 'pl-3'} pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none bg-white appearance-none`}
        >
          <option value="">Select...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder, icon: Icon, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500">
            <Icon size={14} />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-8' : 'pl-3'} pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none`}
        />
      </div>
    </div>
  );
}

function TogglePill({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-1">
        {YES_NO.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              value === opt
                ? opt === 'Yes'
                  ? 'bg-teal-600 text-white shadow'
                  : 'bg-gray-400 text-white shadow'
                : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ value, type }) {
  const colorMap = {
    tbResult: {
      Positive: 'bg-red-100 text-red-700 border-red-200',
      Negative: 'bg-green-100 text-green-700 border-green-200',
      Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Under Investigation': 'bg-orange-100 text-orange-700 border-orange-200',
    },
    hivStatus: {
      Positive: 'bg-red-100 text-red-700 border-red-200',
      Negative: 'bg-green-100 text-green-700 border-green-200',
      Unknown: 'bg-gray-100 text-gray-600 border-gray-200',
      'Not Tested': 'bg-blue-100 text-blue-700 border-blue-200',
    },
  };
  const cls = colorMap[type]?.[value] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {value || '—'}
    </span>
  );
}

// Days until a date (negative = overdue)
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function AppointmentBadge({ days }) {
  if (days === null) return null;
  if (days < 0) return <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-semibold">Overdue {Math.abs(days)}d</span>;
  if (days === 0) return <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">Today!</span>;
  if (days <= 3) return <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-semibold">In {days}d</span>;
  return <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">In {days}d</span>;
}

// ─── Visit Modal ─────────────────────────────────────────────────────────────

function VisitModal({ patient, onClose, onSave }) {
  const [form, setForm] = useState({ ...emptyVisit, visitDate: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.visitDate) return alert('Visit date is required.');
    setSaving(true);
    try {
      const visits = [...(patient.visits || []), { ...form, createdAt: new Date().toISOString() }];
      const ref = doc(db, 'tbPatients', patient.id);
      // Update medicine/appointment fields from latest visit
      const update = {
        visits,
        nextAppointmentDate: form.nextAppointmentDate || patient.nextAppointmentDate,
        totalMedicineGiven: form.totalMedicineGiven || patient.totalMedicineGiven,
        medicineDose: form.medicineDose || patient.medicineDose,
        nextMedicineDueDate: form.nextMedicineDueDate || patient.nextMedicineDueDate,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(ref, update);
      onSave({ ...patient, ...update });
      onClose();
    } catch (err) {
      alert('Failed to save visit: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Stethoscope size={18} className="text-teal-600" /> Add Visit
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{patient.ptName} {patient.tbRegNo && <span className="text-teal-600">• Reg# {patient.tbRegNo}</span>}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <InputField label="Visit Date" value={form.visitDate} onChange={handleChange('visitDate')} type="date" icon={Calendar} required />
          <InputField label="Weight (kg)" value={form.weight} onChange={handleChange('weight')} type="number" placeholder="e.g. 65" icon={Weight} />

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Medicine Details</p>
            <div className="space-y-3">
              <SelectField label="Medicine Dose" value={form.medicineDose} onChange={handleChange('medicineDose')} options={MEDICINE_DOSE_OPTIONS} icon={Pill} />
              <InputField label="Total Medicine Given" value={form.totalMedicineGiven} onChange={handleChange('totalMedicineGiven')} placeholder="e.g. 28 tablets / 1 month supply" icon={ClipboardList} />
              <InputField label="Next Medicine Due Date" value={form.nextMedicineDueDate} onChange={handleChange('nextMedicineDueDate')} type="date" icon={Clock} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Next Appointment</p>
            <InputField label="Next Appointment Date" value={form.nextAppointmentDate} onChange={handleChange('nextAppointmentDate')} type="date" icon={CalendarCheck} />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Visit Notes</label>
            <div className="relative">
              <MessageSquare size={14} className="absolute left-3 top-3 text-teal-500" />
              <textarea
                value={form.notes}
                onChange={handleChange('notes')}
                placeholder="Clinical notes, observations..."
                rows={3}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Visit'}
          </button>
          <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold transition-all">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Visit History Panel ──────────────────────────────────────────────────────

function VisitHistory({ visits }) {
  if (!visits || visits.length === 0) {
    return <p className="text-xs text-gray-400 italic py-2">No visits recorded yet.</p>;
  }
  const sorted = [...visits].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
  return (
    <div className="space-y-2">
      {sorted.map((v, i) => (
        <div key={i} className="bg-white border border-teal-100 rounded-xl p-3 text-xs shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-teal-700 flex items-center gap-1.5">
              <Calendar size={11} /> {v.visitDate}
            </span>
            {v.weight && <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{v.weight} kg</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
            {v.medicineDose && <div><span className="text-gray-400">Dose: </span><span className="font-medium">{v.medicineDose}</span></div>}
            {v.totalMedicineGiven && <div><span className="text-gray-400">Medicines: </span><span className="font-medium">{v.totalMedicineGiven}</span></div>}
            {v.nextMedicineDueDate && <div><span className="text-gray-400">Med Due: </span><span className="font-medium">{v.nextMedicineDueDate}</span></div>}
            {v.nextAppointmentDate && <div><span className="text-gray-400">Next Appt: </span><span className="font-medium">{v.nextAppointmentDate}</span></div>}
          </div>
          {v.notes && <p className="mt-1.5 text-gray-500 bg-gray-50 rounded-lg px-2 py-1">💬 {v.notes}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TBPatients({ setCurrentPage }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [visitModalPatient, setVisitModalPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('patients'); // 'patients' | 'appointments'

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const snap = await getDocs(collection(db, 'tbPatients'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setPatients(data);
      } catch (err) {
        console.error('Error fetching TB patients:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const handleToggle = (field) => (val) => setForm(prev => ({ ...prev, [field]: val }));

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (patient) => {
    setForm({ ...emptyForm, ...patient });
    setEditId(patient.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!form.ptName.trim()) return alert('Patient name is required.');
    if (!form.tbResult) return alert('TB Result is required.');

    setSaving(true);
    try {
      if (editId) {
        const ref = doc(db, 'tbPatients', editId);
        const { id, ...rest } = form;
        await updateDoc(ref, { ...rest, updatedAt: new Date().toISOString() });
        setPatients(prev => prev.map(p => p.id === editId ? { ...p, ...form, updatedAt: new Date().toISOString() } : p));
      } else {
        const newPatient = { ...form, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, 'tbPatients'), newPatient);
        await setDoc(doc(db, 'tbPatients', docRef.id), { id: docRef.id }, { merge: true });
        setPatients(prev => [{ ...newPatient, id: docRef.id }, ...prev]);
      }
      closeForm();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'tbPatients', id));
      setPatients(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleVisitSave = (updatedPatient) => {
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const filtered = patients.filter(p =>
    p.ptName?.toLowerCase().includes(search.toLowerCase()) ||
    p.cnic?.includes(search) ||
    p.tbRegNo?.toLowerCase().includes(search.toLowerCase()) ||
    p.address?.toLowerCase().includes(search.toLowerCase())
  );

  // Upcoming appointments: patients with nextAppointmentDate, sorted by date
  const upcomingAppointments = patients
    .filter(p => p.nextAppointmentDate)
    .map(p => ({ ...p, days: daysUntil(p.nextAppointmentDate) }))
    .sort((a, b) => a.days - b.days);

  // Medicine due soon
  const medicineDueSoon = patients
    .filter(p => p.nextMedicineDueDate)
    .map(p => ({ ...p, medDays: daysUntil(p.nextMedicineDueDate) }))
    .filter(p => p.medDays !== null && p.medDays <= 7)
    .sort((a, b) => a.medDays - b.medDays);

  const stats = {
    total: patients.length,
    positive: patients.filter(p => p.tbResult === 'Positive').length,
    attStarted: patients.filter(p => p.attStarted).length,
    hivPositive: patients.filter(p => p.hivStatus === 'Positive').length,
  };

  const todayAppointments = upcomingAppointments.filter(p => p.days !== null && p.days <= 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <button
              onClick={() => setCurrentPage('home')}
              className="flex items-center gap-1 text-teal-600 hover:text-teal-800 text-sm font-medium mb-1 transition-colors"
            >
              <ChevronLeft size={16} /> Back to Home
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-teal-800">🫁 TB Patient Registry</h1>
            <p className="text-sm text-teal-600 mt-0.5">Naeem Medicare — Tuberculosis Management</p>
          </div>
          <button
            onClick={openAdd}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} /> Add Patient
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Patients', value: stats.total, color: 'from-teal-500 to-cyan-600' },
            { label: 'TB Positive', value: stats.positive, color: 'from-red-500 to-rose-600' },
            { label: 'ATT Started', value: stats.attStarted, color: 'from-blue-500 to-indigo-600' },
            { label: 'HIV Positive', value: stats.hivPositive, color: 'from-orange-500 to-amber-600' },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-3 sm:p-4 text-white shadow`}>
              <p className="text-white/80 text-xs font-medium">{s.label}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { id: 'patients', label: '👥 Patients', count: patients.length },
            { id: 'appointments', label: '📅 Upcoming Appointments', count: upcomingAppointments.length, alert: todayAppointments > 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-teal-50'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {tab.count}
              </span>
              {tab.alert && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
            </button>
          ))}
        </div>

        {/* ── UPCOMING APPOINTMENTS TAB ── */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Medicine Due Soon Alert */}
            {medicineDueSoon.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-amber-600" />
                  <h3 className="font-bold text-amber-800 text-sm">Medicine Due Soon ({medicineDueSoon.length} patients)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {medicineDueSoon.map(p => (
                    <div key={p.id} className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-800">{p.ptName}</span>
                        {p.tbRegNo && <span className="text-xs text-gray-400 ml-1">#{p.tbRegNo}</span>}
                        <div className="text-xs text-gray-500 mt-0.5">Due: {p.nextMedicineDueDate}</div>
                      </div>
                      <AppointmentBadge days={p.medDays} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appointments List */}
            <div className="bg-white rounded-2xl shadow-md border border-teal-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-teal-50">
                <h2 className="font-bold text-teal-800 flex items-center gap-2">
                  <CalendarCheck size={18} /> All Upcoming Appointments
                </h2>
              </div>
              {upcomingAppointments.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <CalendarCheck size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No appointments scheduled.</p>
                  <p className="text-sm mt-1">Add visit details to patients to schedule appointments.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {upcomingAppointments.map((p) => (
                    <div key={p.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-teal-50/40 transition-colors ${p.days !== null && p.days < 0 ? 'bg-red-50/30' : p.days === 0 ? 'bg-orange-50/40' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${p.days !== null && p.days < 0 ? 'bg-red-500' : p.days === 0 ? 'bg-orange-500' : p.days <= 3 ? 'bg-yellow-500' : 'bg-teal-500'}`}>
                          {p.days !== null && p.days < 0 ? '!' : p.days === 0 ? '★' : p.days}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{p.ptName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
                            {p.tbRegNo && <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-mono">#{p.tbRegNo}</span>}
                            <span>📅 {p.nextAppointmentDate}</span>
                            {p.medicineDose && <span>💊 {p.medicineDose}</span>}
                          </div>
                          {p.address && <div className="text-xs text-gray-400 mt-0.5">📍 {p.address}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <AppointmentBadge days={p.days} />
                        <button
                          onClick={() => setVisitModalPatient(p)}
                          className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Plus size={12} /> Visit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PATIENTS TAB ── */}
        {activeTab === 'patients' && (
          <>
            {/* Add/Edit Form */}
            {showForm && (
              <div className="bg-white border-2 border-teal-200 rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                    {editId ? <><Edit2 size={18} /> Edit Patient</> : <><Plus size={18} /> New TB Patient</>}
                  </h2>
                  <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Section: Basic Info */}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <User size={12} /> Patient Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                  <InputField label="Patient Name" value={form.ptName} onChange={handleChange('ptName')} placeholder="Full name" icon={User} required />
                  <InputField label="TB Registration No." value={form.tbRegNo} onChange={handleChange('tbRegNo')} placeholder="e.g. TB-2024-001" icon={Hash} />
                  <InputField label="Age" value={form.age} onChange={handleChange('age')} type="number" placeholder="Years" icon={User} />
                  <InputField label="Weight (kg)" value={form.weight} onChange={handleChange('weight')} type="number" placeholder="e.g. 65" icon={Weight} />
                  <SelectField label="TB Result" value={form.tbResult} onChange={handleChange('tbResult')} options={TB_RESULT_OPTIONS} icon={Activity} required />
                  <SelectField label="HIV Status" value={form.hivStatus} onChange={handleChange('hivStatus')} options={HIV_STATUS_OPTIONS} icon={Heart} />
                  <InputField label="Reported On" value={form.reportedOn} onChange={handleChange('reportedOn')} type="date" icon={Calendar} />
                  <SelectField label="ATT Received" value={form.attReceived} onChange={handleChange('attReceived')} options={ATT_RECEIVED_OPTIONS} icon={FileText} />
                  <InputField label="ATT Started" value={form.attStarted} onChange={handleChange('attStarted')} type="date" icon={Calendar} />
                  <InputField label="CNIC" value={form.cnic} onChange={handleChange('cnic')} placeholder="e.g. 35202-1234567-1" icon={CreditCard} />
                  <div className="sm:col-span-2">
                    <InputField label="Address" value={form.address} onChange={handleChange('address')} placeholder="Full address" icon={MapPin} />
                  </div>
                </div>

                {/* Section: Medicine */}
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Pill size={12} /> Medicine & Follow-up
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <SelectField label="Medicine Dose" value={form.medicineDose} onChange={handleChange('medicineDose')} options={MEDICINE_DOSE_OPTIONS} icon={Pill} />
                    <InputField label="Total Medicine Given" value={form.totalMedicineGiven} onChange={handleChange('totalMedicineGiven')} placeholder="e.g. 28 tablets" icon={ClipboardList} />
                    <InputField label="Next Medicine Due Date" value={form.nextMedicineDueDate} onChange={handleChange('nextMedicineDueDate')} type="date" icon={Clock} />
                    <InputField label="Next Appointment Date" value={form.nextAppointmentDate} onChange={handleChange('nextAppointmentDate')} type="date" icon={CalendarCheck} />
                  </div>
                </div>

                {/* Section: Comorbidities */}
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Comorbidities & Lifestyle</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <TogglePill label="Diabetes Mellitus (DM)" value={form.dm} onChange={handleToggle('dm')} />
                    <TogglePill label="Hypertension (HTN)" value={form.htn} onChange={handleToggle('htn')} />
                    <TogglePill label="Smoker" value={form.smoker} onChange={handleToggle('smoker')} />
                  </div>
                </div>

                {/* Comments */}
                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Other Comments</label>
                  <div className="relative">
                    <MessageSquare size={14} className="absolute left-3 top-3 text-teal-500" />
                    <textarea
                      value={form.otherComments}
                      onChange={handleChange('otherComments')}
                      placeholder="Any additional notes..."
                      rows={3}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow">
                    <Save size={16} /> {saving ? 'Saving...' : editId ? 'Update Patient' : 'Save Patient'}
                  </button>
                  <button onClick={closeForm} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold transition-all">Cancel</button>
                </div>
              </div>
            )}

            {/* Search & Table */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-teal-100">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="font-bold text-gray-800">Patient Records <span className="text-teal-600 text-sm font-normal ml-1">({filtered.length})</span></h2>
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, Reg#, CNIC, address..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500 mx-auto mb-3"></div>
                  Loading patients...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Activity size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{search ? 'No patients match your search.' : 'No TB patients recorded yet.'}</p>
                  {!search && <button onClick={openAdd} className="mt-3 text-teal-600 hover:underline text-sm">Add first patient</button>}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-teal-50 text-teal-800">
                        <tr>
                          {['#', 'Reg#', 'Patient Name', 'Age', 'Wt', 'TB Result', 'HIV', 'ATT', 'Medicine Dose', 'Next Appt', 'Med Due', 'DM', 'HTN', 'Actions'].map(h => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p, i) => {
                          const apptDays = daysUntil(p.nextAppointmentDate);
                          const medDays = daysUntil(p.nextMedicineDueDate);
                          return (
                            <React.Fragment key={p.id}>
                              <tr
                                className="border-t border-gray-50 hover:bg-teal-50/40 cursor-pointer transition-colors"
                                onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                              >
                                <td className="px-3 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                                <td className="px-3 py-3">
                                  {p.tbRegNo ? (
                                    <span className="bg-teal-100 text-teal-700 text-xs font-mono px-2 py-0.5 rounded font-semibold">{p.tbRegNo}</span>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{p.ptName}</td>
                                <td className="px-3 py-3 text-gray-600">{p.age || '—'}</td>
                                <td className="px-3 py-3 text-gray-600">{p.weight ? `${p.weight}` : '—'}</td>
                                <td className="px-3 py-3"><StatusBadge value={p.tbResult} type="tbResult" /></td>
                                <td className="px-3 py-3"><StatusBadge value={p.hivStatus} type="hivStatus" /></td>
                                <td className="px-3 py-3">
                                  {p.attReceived ? (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.attReceived === 'Yes' ? 'bg-green-100 text-green-700' : p.attReceived === 'No' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {p.attReceived}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-3 py-3 text-gray-600 text-xs max-w-[120px] truncate">{p.medicineDose || '—'}</td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  {p.nextAppointmentDate ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs text-gray-600">{p.nextAppointmentDate}</span>
                                      <AppointmentBadge days={apptDays} />
                                    </div>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  {p.nextMedicineDueDate ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs text-gray-600">{p.nextMedicineDueDate}</span>
                                      {medDays !== null && medDays <= 7 && <AppointmentBadge days={medDays} />}
                                    </div>
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-3">
                                  <span className={`text-xs font-semibold ${p.dm === 'Yes' ? 'text-red-600' : 'text-gray-400'}`}>{p.dm || '—'}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <span className={`text-xs font-semibold ${p.htn === 'Yes' ? 'text-orange-600' : 'text-gray-400'}`}>{p.htn || '—'}</span>
                                </td>
                                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                  <div className="flex gap-1">
                                    <button onClick={() => setVisitModalPatient(p)} title="Add Visit" className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-lg transition-colors">
                                      <Stethoscope size={13} />
                                    </button>
                                    <button onClick={() => openEdit(p)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors">
                                      <Edit2 size={13} />
                                    </button>
                                    <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Detail Row */}
                              {expandedRow === p.id && (
                                <tr className="bg-teal-50/60">
                                  <td colSpan={14} className="px-4 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Patient details */}
                                      <div className="space-y-2 text-sm">
                                        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">Patient Details</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div><span className="text-gray-400">Smoker:</span> <span className={`font-semibold ${p.smoker === 'Yes' ? 'text-purple-600' : 'text-gray-600'}`}>{p.smoker || '—'}</span></div>
                                          <div><span className="text-gray-400">CNIC:</span> <span className="font-medium text-gray-700">{p.cnic || '—'}</span></div>
                                          <div><span className="text-gray-400">ATT Started:</span> <span className="font-medium text-gray-700">{p.attStarted || '—'}</span></div>
                                          <div><span className="text-gray-400">Total Medicine:</span> <span className="font-medium text-gray-700">{p.totalMedicineGiven || '—'}</span></div>
                                          <div className="col-span-2"><span className="text-gray-400">Address:</span> <span className="font-medium text-gray-700">{p.address || '—'}</span></div>
                                          {p.otherComments && <div className="col-span-2"><span className="text-gray-400">Comments:</span> <span className="font-medium text-gray-700">{p.otherComments}</span></div>}
                                        </div>
                                      </div>
                                      {/* Visit History */}
                                      <div>
                                        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2 flex items-center justify-between">
                                          Visit History ({(p.visits || []).length})
                                          <button onClick={(e) => { e.stopPropagation(); setVisitModalPatient(p); }} className="text-teal-600 bg-teal-100 hover:bg-teal-200 px-2 py-0.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors">
                                            <Plus size={11} /> Add Visit
                                          </button>
                                        </p>
                                        <VisitHistory visits={p.visits} />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden divide-y divide-gray-100">
                    {filtered.map((p, i) => {
                      const isExpanded = expandedRow === p.id;
                      const apptDays = daysUntil(p.nextAppointmentDate);
                      return (
                        <div key={p.id} className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                                {p.tbRegNo && <span className="bg-teal-100 text-teal-700 text-xs font-mono px-1.5 py-0.5 rounded font-semibold">{p.tbRegNo}</span>}
                                <span className="font-bold text-gray-800 text-base">{p.ptName}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {p.age && <span className="text-xs text-gray-500">Age: {p.age}</span>}
                                {p.weight && <span className="text-xs text-gray-500">• {p.weight} kg</span>}
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => setVisitModalPatient(p)} className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                                <Stethoscope size={14} />
                              </button>
                              <button onClick={() => openEdit(p)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <StatusBadge value={p.tbResult} type="tbResult" />
                            <StatusBadge value={p.hivStatus} type="hivStatus" />
                            {p.attReceived && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${p.attReceived === 'Yes' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                ATT: {p.attReceived}
                              </span>
                            )}
                            {p.nextAppointmentDate && <AppointmentBadge days={apptDays} />}
                          </div>

                          {/* Medicine & Appointment quick info */}
                          {(p.medicineDose || p.nextAppointmentDate || p.nextMedicineDueDate) && (
                            <div className="mt-3 bg-teal-50 border border-teal-100 rounded-xl p-2.5 text-xs space-y-1">
                              {p.medicineDose && <div className="flex gap-1"><span className="text-gray-400">💊 Dose:</span><span className="font-medium text-gray-700">{p.medicineDose}</span></div>}
                              {p.totalMedicineGiven && <div className="flex gap-1"><span className="text-gray-400">📦 Total:</span><span className="font-medium text-gray-700">{p.totalMedicineGiven}</span></div>}
                              {p.nextAppointmentDate && <div className="flex gap-1"><span className="text-gray-400">📅 Next Appt:</span><span className="font-medium text-gray-700">{p.nextAppointmentDate}</span></div>}
                              {p.nextMedicineDueDate && <div className="flex gap-1"><span className="text-gray-400">⏰ Med Due:</span><span className="font-medium text-gray-700">{p.nextMedicineDueDate}</span></div>}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                            <div className="bg-gray-50 rounded-lg p-2">
                              <span className="text-gray-400 block">DM</span>
                              <span className={`font-bold ${p.dm === 'Yes' ? 'text-red-600' : 'text-gray-500'}`}>{p.dm || '—'}</span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2">
                              <span className="text-gray-400 block">HTN</span>
                              <span className={`font-bold ${p.htn === 'Yes' ? 'text-orange-600' : 'text-gray-500'}`}>{p.htn || '—'}</span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2">
                              <span className="text-gray-400 block">Smoker</span>
                              <span className={`font-bold ${p.smoker === 'Yes' ? 'text-purple-600' : 'text-gray-500'}`}>{p.smoker || '—'}</span>
                            </div>
                          </div>

                          {/* Expand / Collapse visits */}
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-teal-600 font-semibold bg-teal-50 hover:bg-teal-100 py-2 rounded-lg transition-colors"
                          >
                            {isExpanded ? <><ChevronUp size={13} /> Hide Details</> : <><Eye size={13} /> View Details & Visits ({(p.visits || []).length})</>}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-2 text-xs text-gray-500">
                              {p.reportedOn && <div>📅 Reported: {p.reportedOn}</div>}
                              {p.attStarted && <div>💊 ATT Started: {p.attStarted}</div>}
                              {p.cnic && <div>🪪 CNIC: {p.cnic}</div>}
                              {p.address && <div>📍 {p.address}</div>}
                              {p.otherComments && <div>💬 {p.otherComments}</div>}
                              <div className="pt-2 border-t border-gray-100">
                                <p className="font-semibold text-gray-600 mb-2 flex items-center justify-between">
                                  Visit History ({(p.visits || []).length})
                                  <button onClick={() => setVisitModalPatient(p)} className="text-teal-600 bg-teal-100 px-2 py-0.5 rounded-lg flex items-center gap-1 font-semibold">
                                    <Plus size={10} /> Add
                                  </button>
                                </p>
                                <VisitHistory visits={p.visits} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Visit Modal */}
      {visitModalPatient && (
        <VisitModal
          patient={visitModalPatient}
          onClose={() => setVisitModalPatient(null)}
          onSave={handleVisitSave}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">Delete Patient?</h3>
              <p className="text-gray-500 text-sm mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold transition-all">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}