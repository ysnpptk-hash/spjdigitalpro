import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, Plus, Search, FileDown, Upload, X, Save, Trash2, Edit3, Printer, Building2, Phone, Mail, CreditCard, Landmark, MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Vendor } from '../types';
import { formatNPWP } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export default function DatabaseVendor() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vendors'), orderBy('namaPenyedia', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Vendor[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Vendor);
      });
      setVendors(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Vendor>>({
    namaPenyedia: '',
    namaPimpinan: '',
    alamat: '',
    npwp: '',
    bank: '',
    nomorRekening: '',
    telepon: '',
    email: '',
    kategori: 'Barang'
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
          const ven: Omit<Vendor, 'id'> = {
            namaPenyedia: item['Nama Penyedia'] || item['Penyedia'] || '',
            namaPimpinan: item['Pimpinan'] || item['Direktur'] || '',
            alamat: item['Alamat'] || '',
            npwp: item['NPWP'] || '',
            bank: item['Bank'] || '',
            nomorRekening: item['Nomor Rekening'] || item['Rekening'] || '',
            telepon: item['Telepon'] || item['HP'] || '',
            email: item['Email'] || '',
            kategori: item['Kategori'] || 'Barang'
          };
          await setDoc(doc(db, 'vendors', id), ven);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'vendors');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(vendors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor");
    XLSX.writeFile(wb, "Data_Vendor_Rekanan.xlsx");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPenyedia) return alert('Nama Penyedia wajib diisi');
    if (!formData.namaPimpinan) return alert('Nama Pimpinan wajib diisi');
    
    try {
      const id = isEditMode && editingId ? editingId : Math.random().toString(36).substr(2, 9);
      const venData = {
        ...formData,
        id,
        updatedAt: new Date().toISOString()
      };
      if (!isEditMode) {
        (venData as any).createdAt = new Date().toISOString();
      }
      await setDoc(doc(db, 'vendors', id), venData);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, isEditMode ? OperationType.UPDATE : OperationType.CREATE, 'vendors');
    }
  };

  const resetForm = () => {
    setFormData({ 
      namaPenyedia: '', 
      namaPimpinan: '', 
      alamat: '', 
      npwp: '', 
      bank: '', 
      nomorRekening: '', 
      telepon: '', 
      email: '', 
      kategori: 'Barang' 
    });
    setShowInput(false);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (ven: Vendor) => {
    setFormData(ven);
    setIsEditMode(true);
    setEditingId(ven.id);
    setShowInput(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus data rekanan/vendor ini?')) {
      try {
        await deleteDoc(doc(db, 'vendors', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `vendors/${id}`);
      }
    }
  };

  const filteredVendors = vendors.filter(ven => 
    ven.namaPenyedia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ven.namaPimpinan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ven.npwp || '').includes(searchTerm) ||
    (ven.telepon || '').includes(searchTerm) ||
    (ven.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    ven.kategori.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Truck size={40} className="text-primary" /> Database Rekanan
          </h1>
          <p className="text-slate-500 font-medium">Manajemen data Penyedia Barang/Jasa, Vendor, dan CV/PT Rekanan.</p>
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
            <Plus size={16} /> Tambah Rekanan
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 glass-card bg-white/50 border-slate-100 rounded-3xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Rekanan</p>
          <p className="text-4xl font-black text-slate-900">{vendors.length}</p>
        </div>
        <div className="p-6 glass-card bg-blue-50 border-blue-100 rounded-3xl">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Kategori Barang</p>
          <p className="text-4xl font-black text-blue-600">
            {vendors.filter(v => v.kategori === 'Barang').length}
          </p>
        </div>
        <div className="p-6 glass-card bg-purple-50 border-purple-100 rounded-3xl">
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Jasa Konsultansi</p>
          <p className="text-4xl font-black text-purple-600">
             {vendors.filter(v => v.kategori === 'Jasa Konsultansi').length}
          </p>
        </div>
        <div className="p-6 glass-card bg-orange-50 border-orange-100 rounded-3xl">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Konstruksi & Lainnya</p>
          <p className="text-4xl font-black text-orange-600">
             {vendors.filter(v => v.kategori === 'Konstruksi' || v.kategori === 'Jasa Lainnya').length}
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
              placeholder="Cari penyedia, pimpinan atau NPWP..." 
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Penyedia / Pimpinan</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rekening / NPWP</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredVendors.map((ven) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={ven.id} 
                    className="hover:bg-slate-50/80 transition-all group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight">{ven.namaPenyedia}</span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1 italic"><Building2 size={10} /> {ven.namaPimpinan}</span>
                        {ven.alamat && <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1 mt-1 max-w-[200px] truncate"><MapPin size={9} /> {ven.alamat}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase">
                        {ven.kategori}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {ven.telepon ? (
                        <span className="text-[10px] font-black text-slate-600 flex items-center gap-1"><Phone size={10} className="text-primary" /> {ven.telepon}</span>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">Tidak ada</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {ven.email ? (
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 lowercase"><Mail size={10} className="text-blue-400" /> {ven.email}</span>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">Tidak ada</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-600 font-mono tracking-tight flex items-center gap-1"><CreditCard size={10} /> {ven.bank} - {ven.nomorRekening}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">{ven.npwp}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(ven)} className="p-2 text-amber-500 hover:text-white transition-all bg-amber-50 hover:bg-amber-500 border border-amber-100 rounded-xl shadow-sm hover:shadow-lg">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(ven.id)} className="p-2 text-rose-500 hover:text-white transition-all bg-rose-50 hover:bg-rose-500 border border-rose-100 rounded-xl shadow-sm hover:shadow-lg">
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

      {/* Add/Edit Vendor Modal */}
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
              className="bg-white p-8 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                    {isEditMode ? 'Edit Data Rekanan' : 'Tambah Rekanan Baru'}
                  </h2>
                  <p className="text-slate-500 font-medium text-sm">Lengkapi rincian data penyedia/rekanan untuk sistem SPJ.</p>
                </div>
                <button onClick={resetForm} className="p-2 text-slate-400 hover:text-red-500 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Perusahaan / Penyedia</label>
                    <input 
                      type="text" 
                      required
                      value={formData.namaPenyedia || ''}
                      onChange={(e) => setFormData({...formData, namaPenyedia: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black uppercase"
                      placeholder="Contoh: PT. MAJU JAYA BERSAMA"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Pimpinan / Direktur</label>
                    <input 
                      type="text" 
                      required
                      value={formData.namaPimpinan || ''}
                      onChange={(e) => setFormData({...formData, namaPimpinan: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      placeholder="Nama lengkap pimpinan..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kategori Penyedia</label>
                    <select 
                      value={formData.kategori || 'Barang'}
                      onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                    >
                      <option value="Barang">Barang</option>
                      <option value="Jasa Konsultansi">Jasa Konsultansi</option>
                      <option value="Konstruksi">Konstruksi</option>
                      <option value="Jasa Lainnya">Jasa Lainnya</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alamat Kantor</label>
                    <textarea 
                      value={formData.alamat || ''}
                      onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium h-24"
                      placeholder="Alamat lengkap perusahaan..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NPWP Perusahaan</label>
                    <input 
                      type="text" 
                      value={formData.npwp || ''}
                      onChange={(e) => setFormData({...formData, npwp: formatNPWP(e.target.value)})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black font-mono"
                      placeholder="00.000.000.0-000.000"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Perusahaan</label>
                    <input 
                      type="email" 
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      placeholder="email@perusahaan.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telepon / WhatsApp</label>
                    <input 
                      type="text" 
                      value={formData.telepon || ''}
                      onChange={(e) => setFormData({...formData, telepon: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      placeholder="Contoh: 0812xxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Bank</label>
                    <div className="relative">
                      <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={formData.bank || ''}
                        onChange={(e) => setFormData({...formData, bank: e.target.value.toUpperCase()})}
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black uppercase"
                        placeholder="Contoh: BANK KALTENG"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Rekening</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={formData.nomorRekening || ''}
                        onChange={(e) => setFormData({...formData, nomorRekening: e.target.value})}
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black font-mono"
                        placeholder="0001xxxxxxxx"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Batalkan
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save size={20} /> {isEditMode ? 'Simpan Perubahan' : 'Daftarkan Rekanan'}
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
