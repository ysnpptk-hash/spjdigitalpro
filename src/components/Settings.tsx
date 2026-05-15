import React from 'react';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Upload, Save, Building2, MapPin, Globe } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface SettingsProps {
  agencyInfo: {
    name: string;
    address: string;
    logo: string;
  };
  setAgencyInfo: React.Dispatch<React.SetStateAction<{
    name: string;
    address: string;
    logo: string;
  }>>;
  currentUser?: { email: string; role?: string } | null;
}

export default function Settings({ agencyInfo, setAgencyInfo, currentUser }: SettingsProps) {
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.email?.toLowerCase() === 'ysn.pptk@gmail.com';

  const updateAgencyFirestore = async (newInfo: typeof agencyInfo) => {
    if (!isSuperAdmin) {
      alert("Hanya Super Admin yang dapat mengubah identitas instansi.");
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'agency'), newInfo);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/agency');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const logo = reader.result as string;
        const newInfo = { ...agencyInfo, logo };
        setAgencyInfo(newInfo);
        await updateAgencyFirestore(newInfo);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (field: string, value: string) => {
    if (!isSuperAdmin) return;
    const newInfo = { ...agencyInfo, [field]: value };
    setAgencyInfo(newInfo);
    // Debounce or wait for blur? For now direct to keep it simple but with role check
    await updateAgencyFirestore(newInfo);
  };

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <SettingsIcon size={32} />
          </div>
          Pengaturan <span className="text-gradient-purple">Sistem & Instansi</span>
        </h1>
        <p className="text-slate-500 font-medium mt-1"> Konfigurasi profile instansi dan identitas visual aplikasi. { !isSuperAdmin && <span className="text-red-400 font-bold ml-2">(Mode View-Only)</span> }</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Identity Section */}
          <div className="glass-card p-10 bg-white shadow-sm border border-slate-100 rounded-3xl space-y-8">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-50">
              <Building2 className="text-primary" size={24} />
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identitas Instansi</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nama Lengkap Instansi</label>
                <div className="relative">
                  <input 
                    type="text" 
                    disabled={!isSuperAdmin}
                    value={agencyInfo.name}
                    onChange={(e) => handleUpdate('name', e.target.value)}
                    className={`w-full px-6 py-4 border rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black ${!isSuperAdmin ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-70' : 'bg-slate-50 border-slate-200'}`}
                    placeholder="Masukkan nama instansi resmi..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Alamat & Kontak Resmi</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-5 text-slate-300" size={20} />
                  <textarea 
                    disabled={!isSuperAdmin}
                    value={agencyInfo.address}
                    onChange={(e) => handleUpdate('address', e.target.value)}
                    className={`w-full pl-14 pr-6 py-4 border rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black h-32 ${!isSuperAdmin ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-70' : 'bg-slate-50 border-slate-200'}`}
                    placeholder="Jl. Raya No. 123, Kota, Provinsi..."
                  />
                </div>
              </div>
            </div>
          </div>


          {/* System Settings (Placeholders) */}
          <div className="glass-card p-10 bg-white shadow-sm border border-slate-100 rounded-3xl opacity-50 pointer-events-none">
             <div className="flex items-center gap-3 pb-6 border-b border-slate-50">
              <Globe className="text-slate-400" size={24} />
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Konfigurasi Sistem</h2>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase italic">Fitur ini akan segera hadir pada update berikutnya.</p>
          </div>
        </div>

        <div className="space-y-8">
           {/* Logo Section */}
           <div className="glass-card p-10 bg-white shadow-sm border border-slate-100 rounded-3xl text-center space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Logo Resmi</h3>
            <div className="w-40 h-40 mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden group relative transition-all hover:border-primary/30">
              {agencyInfo.logo ? (
                <img src={agencyInfo.logo} alt="Logo" className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" />
              ) : (
                <Building2 size={48} className="text-slate-200" />
              )}
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center pointer-events-none">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30 text-white">
                   <Upload size={20} />
                </div>
              </div>
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} title="Pilih Logo Instansi" />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-slate-700">
                <Upload size={14} /> Pilih Logo Baru
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              
              {agencyInfo.logo && (
                <button 
                  onClick={() => handleUpdate('logo', '')}
                  className="px-4 py-2 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  Hapus Logo
                </button>
              )}
            </div>

            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">
              Gunakan logo dengan format PNG atau JPG transparan untuk hasil terbaik di dokumen PDF.
            </p>
          </div>

          {/* Auto Save Status */}
          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sistem Aktif</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <Save size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Tersimpan Otomatis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
