import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, Shield, UserPlus, Search, X, Save, Trash2, Edit3, ShieldCheck, Mail, Printer, Eye, EyeOff
} from 'lucide-react';
import { User } from '../types';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query } from 'firebase/firestore';

interface DatabaseUserProps {
  currentUser?: User | null;
}

export default function DatabaseUser({ currentUser }: DatabaseUserProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'authorized_users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList: User[] = [];
      snapshot.forEach((doc) => {
        userList.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(userList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'authorized_users');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const isSuperAdmin = () => {
    const email = currentUser?.email?.toLowerCase();
    if (email === "ysn.pptk@gmail.com") return true;
    return (currentUser as any)?.role === "Super Admin";
  };

  const handleSeedUsers = async () => {
    if (!confirm("Generate data user PPTK 01 sampai PPTK 18 (Admin Akses Terbatas)?")) return;
    
    setLoading(true);
    try {
      const seedUsers: Omit<User, 'id'>[] = [
        {
          email: "ysn.pptk@gmail.com",
          username: "superadmin",
          nama: "Super Administrator",
          role: "Super Admin",
          status: "Aktif",
          departemen: "Seluruh Sistem"
        }
      ];

      // Add PPTK 01 - 18
      for (let i = 1; i <= 18; i++) {
        const num = i.toString().padStart(2, '0');
        seedUsers.push({
          email: `pptk${num}@setwan.go.id`, // Using a more formal domain
          username: `pptk${num}`,
          nama: `Admin PPTK ${num}`,
          role: "Admin" as any,
          status: "Aktif",
          departemen: `Bagian PPTK ${num}`
        });
      }

      for (const u of seedUsers) {
        const userEmail = u.email.toLowerCase().trim();
        const username = u.username.toLowerCase().trim();
        
        const uWithData = {
          ...u,
          email: userEmail,
          username: u.username, // Keep display casing
          password: '123', // Default password
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'authorized_users', userEmail), uWithData);
        // Sync mapping
        await setDoc(doc(db, 'usernames', username), { email: userEmail });
      }
      alert("Berhasil menambahkan 18 user PPTK (Admin Akses Terbatas) dan Superadmin. Password default: 123");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'authorized_users/bulk');
      alert("Gagal menambahkan user massal. Pastikan Anda memiliki hak akses Super Admin.");
    } finally {
      setLoading(false);
    }
  };
  
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<User & { password?: string }>>({
    username: '',
    nama: '',
    email: '',
    password: '',
    role: 'Pengguna',
    status: 'Aktif',
    departemen: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) return;

    setSubmitting(true);
    const userEmail = formData.email.toLowerCase().trim();
    const userData = {
      username: formData.username?.trim() || '',
      nama: formData.nama?.trim() || '',
      email: userEmail,
      password: formData.password || '',
      role: formData.role as any,
      status: formData.status as any,
      departemen: formData.role === 'Super Admin' ? 'Seluruh Sistem' : (formData.departemen || ''),
      updatedAt: new Date().toISOString()
    };

    try {
      if (!isFormValid) {
        // Find what's missing
        const missingFields = [];
        if (!formData.nama) missingFields.push('Nama');
        if (!formData.username) missingFields.push('Username');
        if (!formData.email) missingFields.push('Email');
        if (!formData.password) missingFields.push('Password');
        if (formData.role !== 'Super Admin' && !formData.departemen) missingFields.push('Departemen');

        alert(`Data belum lengkap. Harap isi: ${missingFields.join(', ')}`);
        setSubmitting(false);
        return;
      }
      
      if (isEditMode && editingId) {
        // Handle username change sync
        const previousUser = users.find(u => u.email.toLowerCase() === editingId);
        if (previousUser && previousUser.username.toLowerCase() !== userData.username.toLowerCase()) {
          await deleteDoc(doc(db, 'usernames', previousUser.username.toLowerCase()));
        }
        
        await setDoc(doc(db, 'authorized_users', userEmail), userData);
        await setDoc(doc(db, 'usernames', userData.username.toLowerCase()), { email: userEmail });
        
        if (editingId !== userEmail) {
          await deleteDoc(doc(db, 'authorized_users', editingId));
        }
      } else {
        // Check if email already exists
        const exists = users.some(u => u.email.toLowerCase() === userEmail);
        if (exists) {
          alert("Email sudah terdaftar di sistem.");
          setSubmitting(false);
          return;
        }

        await setDoc(doc(db, 'authorized_users', userEmail), {
          ...userData,
          createdAt: new Date().toISOString()
        });
        await setDoc(doc(db, 'usernames', userData.username.toLowerCase()), { email: userEmail });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, isEditMode ? OperationType.UPDATE : OperationType.CREATE, `authorized_users/${userEmail}`);
      alert("Gagal menyimpan data pengguna. Periksa koneksi atau izin database. Pastikan Anda memiliki hak akses Super Admin.");
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = formData.nama && formData.username && formData.email && formData.password && (formData.role === 'Super Admin' || formData.departemen);

  const resetForm = () => {
    setFormData({ username: '', nama: '', email: '', password: '', role: 'Pengguna', status: 'Aktif', departemen: '' });
    setShowInput(false);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (user: User) => {
    setFormData(user);
    setIsEditMode(true);
    setEditingId(user.email.toLowerCase()); // Use email as ID for consistency
    setShowInput(true);
  };

  const handleDelete = async (userEmail: string) => {
    const user = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    if (confirm(`Hapus pengguna ${userEmail}?`)) {
      try {
        await deleteDoc(doc(db, 'authorized_users', userEmail.toLowerCase()));
        if (user?.username) {
          await deleteDoc(doc(db, 'usernames', user.username.toLowerCase()));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `authorized_users/${userEmail}`);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Shield size={40} className="text-primary" /> Manajemen Pengguna
          </h1>
          <p className="text-slate-500 font-medium">Pengaturan akun akses dan hak akses sistem SPJ Digital.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-slate-600 print-hidden"
          >
            <Printer size={16} /> Cetak Daftar
          </button>
          {isSuperAdmin() && (
            <>
              <button 
                onClick={handleSeedUsers}
                className="px-6 py-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm flex items-center gap-2 print-hidden"
              >
                <UserPlus size={16} /> Generate Akun Masal
              </button>
              <button 
                onClick={() => { setShowInput(true); setIsEditMode(false); }}
                className="px-6 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
              >
                <UserPlus size={16} /> Tambah User
              </button>
            </>
          )}
        </div>
      </div>

      {/* User Table */}
      <div className="glass-card bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari user (nama, username, email)..." 
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengguna</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kontak</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Wilayah / Departemen</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role / Jabatan</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={user.id} 
                    className="hover:bg-slate-50/80 transition-all group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${user.role === 'Admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                          {user.role === 'Admin' ? <ShieldCheck size={20} /> : <UserIcon size={20} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{user.nama}</span>
                          <span className="text-[10px] font-bold text-slate-400">@{user.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Mail size={14} />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{user.departemen || '-'}</span>
                        {user.role === 'Super Admin' && <span className="text-[10px] text-emerald-500 font-black uppercase">Global Access</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        user.role === 'Super Admin' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        user.role === 'Admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${
                        user.status === 'Aktif' ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Aktif' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {isSuperAdmin() && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEdit(user)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Input Modal */}
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
                    {isEditMode ? 'Edit Akun Pengguna' : 'Tambah Akun Baru'}
                  </h2>
                  <p className="text-slate-500 font-medium text-sm">Berikan kredensial login untuk akses sistem.</p>
                </div>
                <button onClick={resetForm} className="p-2 text-slate-400 hover:text-red-500 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap</label>
                    <input 
                      type="text" required
                      value={formData.nama}
                      onChange={(e) => setFormData({...formData, nama: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      placeholder="Masukkan nama..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
                    <input 
                      type="text" required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      placeholder="ID Login"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      type="email" required
                      value={formData.email}
                      onChange={(e) => {
                        const email = e.target.value;
                        const newFormData = { ...formData, email };
                        if (!formData.username && email.includes('@')) {
                          newFormData.username = email.split('@')[0];
                        }
                        setFormData(newFormData);
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      placeholder="email@instansi.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                    <div className="relative">
                      <input 
                        type={showPasswordForm ? "text" : "password"} 
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black pr-12"
                        placeholder="Input Password"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                      >
                        {showPasswordForm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role Akses</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                    >
                      <option value="Super Admin">Super Admin (Akses Penuh)</option>
                      <option value="Admin">Admin (Akses Terbatas)</option>
                      <option value="Pengguna">Pengguna Standard</option>
                    </select>
                  </div>
                  {formData.role !== 'Super Admin' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="col-span-2"
                    >
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wilayah / Departemen / Fungsi</label>
                      <input 
                        type="text" required
                        value={formData.departemen}
                        onChange={(e) => setFormData({...formData, departemen: e.target.value})}
                        className="w-full px-5 py-4 bg-white border-2 border-indigo-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-black"
                        placeholder="Contoh: Bidang Keuangan, Wilayah 01, Puskesmas X..."
                      />
                      <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Pengguna dengan role {formData.role} hanya dapat mengakses data dalam grup ini.</p>
                    </motion.div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Akun</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Non-Aktif">Non-Aktif</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-sans">
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className={`flex-[2] py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 bg-primary text-white hover:opacity-90 shadow-primary/20 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={20} /> {isEditMode ? 'Update' : 'Simpan'}
                      </>
                    )}
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
