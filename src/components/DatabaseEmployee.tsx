import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Plus, Search, FileDown, Upload, X, Save, Trash2, Edit3, MoreVertical, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee } from '../types';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export default function DatabaseEmployee() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('nama', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Employee[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    nama: '',
    nip: '',
    jabatan: '',
    pangkatGolongan: ''
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];
      
      try {
        for (const item of data) {
          const id = Math.random().toString(36).substr(2, 9);
          const emp: Omit<Employee, 'id'> = {
            nama: item['Nama'] || item['nama'] || '',
            nip: item['NIP'] || item['nip'] || '',
            jabatan: item['Jabatan'] || item['jabatan'] || '',
            pangkatGolongan: item['Pangkat'] || item['pangkat'] || item['Golongan'] || ''
          };
          await setDoc(doc(db, 'employees', id), emp);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'employees');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pegawai");
    XLSX.writeFile(wb, "Data_Pegawai.xlsx");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = isEditMode && editingId ? editingId : Math.random().toString(36).substr(2, 9);
      const empData = {
        ...formData,
        id,
        updatedAt: new Date().toISOString()
      };
      if (!isEditMode) {
        (empData as any).createdAt = new Date().toISOString();
      }
      await setDoc(doc(db, 'employees', id), empData);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, isEditMode ? OperationType.UPDATE : OperationType.CREATE, 'employees');
    }
  };

  const resetForm = () => {
    setFormData({ nama: '', nip: '', jabatan: '', pangkatGolongan: '' });
    setShowInput(false);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (emp: Employee) => {
    setFormData(emp);
    setIsEditMode(true);
    setEditingId(emp.id);
    setShowInput(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus data pegawai ini?')) {
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
      }
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.nip.includes(searchTerm) ||
    emp.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Users size={40} className="text-primary" /> Database Pegawai
          </h1>
          <p className="text-slate-500 font-medium">Manajemen data SDM, Pejabat, dan Bendahara Sekretariat DPRD.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-slate-600 print-hidden"
          >
            <Printer size={16} /> Cetak Daftar
          </button>
          <label className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 cursor-pointer">
            <Upload size={16} /> Impor Excel
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
          </label>
          <button onClick={handleExport} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
            <FileDown size={16} /> Ekspor Excel
          </button>
          <button 
            onClick={() => { setShowInput(true); setIsEditMode(false); }}
            className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={16} /> Tambah Pegawai
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 glass-card bg-white/50 border-slate-100 rounded-3xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pegawai</p>
          <p className="text-4xl font-black text-slate-900">{employees.length}</p>
        </div>
        <div className="p-6 glass-card bg-primary/5 border-primary/10 rounded-3xl">
          <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1">Pejabat Struktural</p>
          <p className="text-4xl font-black text-primary">
            {employees.filter(e => e.jabatan.toLowerCase().includes('pejabat') || e.jabatan.toLowerCase().includes('sekretaris')).length}
          </p>
        </div>
        <div className="p-6 glass-card bg-orange-50 border-orange-100 rounded-3xl">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Bendahara & Staf</p>
          <p className="text-4xl font-black text-orange-600">
             {employees.filter(e => e.jabatan.toLowerCase().includes('bendahara') || e.jabatan.toLowerCase().includes('staf')).length}
          </p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="glass-card bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama, NIP atau jabatan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama / NIP</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jabatan</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pangkat / Golongan</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredEmployees.map((emp) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={emp.id} 
                    className="hover:bg-slate-50/80 transition-all group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors underline decoration-transparent group-hover:decoration-primary/20 decoration-2 underline-offset-4 decoration-dotted">{emp.nama}</span>
                        <span className="text-[10px] font-black text-slate-400 font-mono mt-1 tracking-wider">{emp.nip}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-600 italic">
                      {emp.jabatan}
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase">
                        {emp.pangkatGolongan || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(emp)} className="p-2 text-amber-500 hover:text-white transition-all bg-amber-50 hover:bg-amber-500 border border-amber-100 rounded-xl shadow-sm hover:shadow-lg">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="p-2 text-rose-500 hover:text-white transition-all bg-rose-50 hover:bg-rose-500 border border-rose-100 rounded-xl shadow-sm hover:shadow-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      <AnimatePresence>
        {showInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                    {isEditMode ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
                  </h2>
                  <p className="text-slate-500 font-medium text-sm">Lengkapi rincian data kepegawaian untuk sistem SPJ.</p>
                </div>
                <button onClick={resetForm} className="p-2 text-slate-400 hover:text-red-500 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap (Beserta Gelar)</label>
                    <input 
                      type="text" 
                      required
                      value={formData.nama || ''}
                      onChange={(e) => setFormData({...formData, nama: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      placeholder="Masukkan nama lengkap..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIP / NRP</label>
                    <input 
                      type="text" 
                      required
                      value={formData.nip || ''}
                      onChange={(e) => setFormData({...formData, nip: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black font-mono"
                      placeholder="19xxxxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pangkat / Golongan</label>
                    <input 
                      type="text" 
                      value={formData.pangkatGolongan || ''}
                      onChange={(e) => setFormData({...formData, pangkatGolongan: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      placeholder="Contoh: Penata / IIIc"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jabatan Kedinasan</label>
                    <input 
                      type="text" 
                      required
                      value={formData.jabatan || ''}
                      onChange={(e) => setFormData({...formData, jabatan: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black italic"
                      placeholder="Contoh: Sekretaris DPRD / PPTK"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                  >
                    Batalkan
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Save size={20} /> {isEditMode ? 'Simpan Perubahan' : 'Daftarkan Pegawai'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
