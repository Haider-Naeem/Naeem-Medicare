// src/components/TBPatients.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, X, Edit2, Trash2, Save, ChevronLeft, Search,
  User, Calendar, Weight, FileText, MapPin, CreditCard,
  Activity, Heart, Cigarette, MessageSquare, ChevronDown
} from 'lucide-react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';

const TB_RESULT_OPTIONS = ['Positive', 'Negative', 'Pending', 'Under Investigation'];
const HIV_STATUS_OPTIONS = ['Positive', 'Negative', 'Unknown', 'Not Tested'];
const ATT_RECEIVED_OPTIONS = ['Yes', 'No', 'Partial'];
const YES_NO = ['Yes', 'No'];

const emptyForm = {
  ptName: '',
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
};

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

  // Fetch from Firebase
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

  const filtered = patients.filter(p =>
    p.ptName?.toLowerCase().includes(search.toLowerCase()) ||
    p.cnic?.includes(search) ||
    p.address?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: patients.length,
    positive: patients.filter(p => p.tbResult === 'Positive').length,
    attStarted: patients.filter(p => p.attStarted).length,
    hivPositive: patients.filter(p => p.hivStatus === 'Positive').length,
  };

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
            <h1 className="text-2xl sm:text-3xl font-bold text-teal-800">
              🫁 TB Patient Registry
            </h1>
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

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white border-2 border-teal-200 rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                {editId ? <><Edit2 size={18}/> Edit Patient</> : <><Plus size={18}/> New TB Patient</>}
              </h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InputField label="Patient Name" value={form.ptName} onChange={handleChange('ptName')} placeholder="Full name" icon={User} required />
              <InputField label="Age" value={form.age} onChange={handleChange('age')} type="number" placeholder="Years" icon={User} />
              <InputField label="Weight (kg)" value={form.weight} onChange={handleChange('weight')} type="number" placeholder="e.g. 65" icon={Weight} />
              <SelectField label="TB Result" value={form.tbResult} onChange={handleChange('tbResult')} options={TB_RESULT_OPTIONS} icon={Activity} required />
              <SelectField label="HIV Status" value={form.hivStatus} onChange={handleChange('hivStatus')} options={HIV_STATUS_OPTIONS} icon={Heart} />
              <InputField label="Reported On" value={form.reportedOn} onChange={handleChange('reportedOn')} type="date" icon={Calendar} />
              <SelectField label="ATT Received" value={form.attReceived} onChange={handleChange('attReceived')} options={ATT_RECEIVED_OPTIONS} icon={FileText} />
              <InputField label="ATT Started" value={form.attStarted} onChange={handleChange('attStarted')} type="date" icon={Calendar} />
              <InputField label="CNIC" value={form.cnic} onChange={handleChange('cnic')} placeholder="e.g. 35202-1234567-1" icon={CreditCard} />
              <div className="sm:col-span-2 lg:col-span-3">
                <InputField label="Address" value={form.address} onChange={handleChange('address')} placeholder="Full address" icon={MapPin} />
              </div>
            </div>

            {/* Comorbidities */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Comorbidities & Lifestyle</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TogglePill label="Diabetes Mellitus (DM)" value={form.dm} onChange={handleToggle('dm')} />
                <TogglePill label="Hypertension (HTN)" value={form.htn} onChange={handleToggle('htn')} />
                <TogglePill label="Smoker" value={form.smoker} onChange={handleToggle('smoker')} />
              </div>
            </div>

            {/* Comments */}
            <div className="mt-4">
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow"
              >
                <Save size={16} /> {saving ? 'Saving...' : editId ? 'Update Patient' : 'Save Patient'}
              </button>
              <button onClick={closeForm} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search & Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-teal-100">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="font-bold text-gray-800">Patient Records <span className="text-teal-600 text-sm font-normal ml-1">({filtered.length})</span></h2>
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, CNIC, address..."
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
                      {['#', 'Patient Name', 'Age', 'Weight', 'TB Result', 'HIV Status', 'Reported On', 'ATT', 'CNIC', 'DM', 'HTN', 'Smoker', 'Actions'].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <React.Fragment key={p.id}>
                        <tr
                          className="border-t border-gray-50 hover:bg-teal-50/40 cursor-pointer transition-colors"
                          onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)}
                        >
                          <td className="px-3 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{p.ptName}</td>
                          <td className="px-3 py-3 text-gray-600">{p.age || '—'}</td>
                          <td className="px-3 py-3 text-gray-600">{p.weight ? `${p.weight} kg` : '—'}</td>
                          <td className="px-3 py-3"><StatusBadge value={p.tbResult} type="tbResult" /></td>
                          <td className="px-3 py-3"><StatusBadge value={p.hivStatus} type="hivStatus" /></td>
                          <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{p.reportedOn || '—'}</td>
                          <td className="px-3 py-3">
                            {p.attReceived ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.attReceived === 'Yes' ? 'bg-green-100 text-green-700' : p.attReceived === 'No' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {p.attReceived}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-500 text-xs font-mono">{p.cnic || '—'}</td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-semibold ${p.dm === 'Yes' ? 'text-red-600' : 'text-gray-400'}`}>{p.dm || '—'}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-semibold ${p.htn === 'Yes' ? 'text-orange-600' : 'text-gray-400'}`}>{p.htn || '—'}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-semibold ${p.smoker === 'Yes' ? 'text-purple-600' : 'text-gray-400'}`}>{p.smoker || '—'}</span>
                          </td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1.5">
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
                            <td colSpan={13} className="px-4 py-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div><span className="text-gray-500 text-xs">ATT Started:</span> <span className="font-medium">{p.attStarted || '—'}</span></div>
                                <div><span className="text-gray-500 text-xs">Address:</span> <span className="font-medium">{p.address || '—'}</span></div>
                                <div className="col-span-2"><span className="text-gray-500 text-xs">Comments:</span> <span className="font-medium">{p.otherComments || '—'}</span></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {filtered.map((p, i) => (
                  <div key={p.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-gray-400 font-mono mr-2">#{i + 1}</span>
                        <span className="font-bold text-gray-800 text-base">{p.ptName}</span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {p.age && <span className="text-xs text-gray-500">Age: {p.age}</span>}
                          {p.weight && <span className="text-xs text-gray-500">• {p.weight} kg</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
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
                    </div>

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

                    {(p.address || p.cnic || p.reportedOn || p.otherComments) && (
                      <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                        {p.reportedOn && <div>📅 Reported: {p.reportedOn}</div>}
                        {p.attStarted && <div>💊 ATT Started: {p.attStarted}</div>}
                        {p.cnic && <div>🪪 CNIC: {p.cnic}</div>}
                        {p.address && <div>📍 {p.address}</div>}
                        {p.otherComments && <div>💬 {p.otherComments}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold transition-all"
                >
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