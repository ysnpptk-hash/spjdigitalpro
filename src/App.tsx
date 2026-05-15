import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DatabaseSPJ from './components/DatabaseSPJ';
import DatabaseAnggaran from './components/DatabaseAnggaran';
import DatabaseEmployee from './components/DatabaseEmployee';
import DatabaseVendor from './components/DatabaseVendor';
import DatabaseUser from './components/DatabaseUser';
import KalkulatorPajak from './components/KalkulatorPajak';
import LaporanRealisasi from './components/LaporanRealisasi';
import ChecklistSPJ from './components/ChecklistSPJ';
import SettingsTab from './components/Settings';
import Login from './components/Login';
import { ActiveTab, User as AppUserType } from './types';
import { Bell, Search, Settings, LogOut, Printer } from 'lucide-react';
import { cn } from './lib/utils';
import { auth, logout, loginWithEmailPassword, db } from './lib/firebase';
import { onAuthStateChanged, User as AuthUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

type AppUser = AuthUser & Partial<AppUserType> & { isManual?: boolean };

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Anggaran Hampir Habis', message: 'Program Dukungan Pelaksanaan Tugas DPRD sudah mencapai 85% pagu.', time: '5 menit yang lalu', type: 'warning', read: false },
    { id: 2, title: 'SPJ Baru Disetujui', message: 'SPJ Perjalanan Dinas Luar Daerah (Bpk. Ahmad) telah disetujui.', time: '2 jam yang lalu', type: 'success', read: false },
    { id: 3, title: 'Update Sistem v2.1', message: 'Pembaruan sistem otomatis untuk modul pelaporan pajak.', time: '1 hari yang lalu', type: 'info', read: true },
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNotifications && !target.closest('.notification-container')) {
        setShowNotifications(false);
      }
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showUserMenu]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        const { isUserAuthorized } = await import('./lib/firebase');
        const userData = await isUserAuthorized(currentUser.email);
        if (userData || currentUser.email.toLowerCase() === "ysn.pptk@gmail.com") {
          // Merge auth user with db data
          const mergedUser = {
            ...currentUser,
            ...userData,
            email: currentUser.email
          } as any;

          // Fallback for bootstrap admin name/role if DB entry missing
          if (!userData && currentUser.email.toLowerCase() === "ysn.pptk@gmail.com") {
            mergedUser.nama = "Super Admin";
            mergedUser.role = "Super Admin";
          }

          setUser(mergedUser);
          setAuthError(null);
        } else {
          setUser(null);
          await logout();
          setAuthError("Akun Anda tidak terdaftar dalam sistem. Silakan hubungi administrator untuk akses.");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setShowUserMenu(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleLogin = async (email?: string, password?: string) => {
    setAuthError(null);
    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }
    try {
      await loginWithEmailPassword(email, password);
      // setUser will be set by onAuthStateChanged listener
    } catch (error: any) {
      console.error("Login failed", error);
      setAuthError(error.message || "Gagal masuk. Periksa kembali akun Anda.");
    }
  };

  const [agencyInfo, setAgencyInfo] = useState({
    name: 'Sekretariat DPRD Provinsi Kalimantan Tengah',
    address: 'Jl. S. Parman No. 2, Palangka Raya, Kalimantan Tengah',
    logo: ''
  });

  useEffect(() => {
    // Sync agency info from Firestore
    const unsubscribe = onSnapshot(doc(db, 'settings', 'agency'), (docSnap) => {
      if (docSnap.exists()) {
        setAgencyInfo(docSnap.data() as any);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfdff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Memuat Sistem...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} agencyInfo={agencyInfo} error={authError} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'database_spj': return <DatabaseSPJ agencyInfo={agencyInfo} setAgencyInfo={setAgencyInfo} />;
      case 'database_pegawai': return <DatabaseEmployee />;
      case 'database_vendor': return <DatabaseVendor />;
      case 'database_user': return <DatabaseUser currentUser={user} />;
      case 'database_anggaran': return <DatabaseAnggaran currentUser={user} onNavigate={setActiveTab} />;
      case 'kalkulator_pajak': return <KalkulatorPajak />;
      case 'laporan_realisasi': return <LaporanRealisasi agencyInfo={agencyInfo} />;
      case 'checklist': return <ChecklistSPJ />;
      case 'settings': return <SettingsTab agencyInfo={agencyInfo} setAgencyInfo={setAgencyInfo} currentUser={user} />;
      default: return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">Modul ini dalam tahap pengembangan</div>;
    }
  };

  return (
    <div className="flex bg-[#fcfdff] min-h-screen font-sans overflow-x-hidden selection:bg-primary-metallic selection:text-white">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        agencyInfo={agencyInfo} 
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="ml-64 flex-grow relative">
        <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        {/* Top Header Bar */}
        <header className="h-20 bg-white/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 text-slate-400 group focus-within:text-primary transition-all bg-white/50 px-4 py-2 rounded-2xl border border-white/50 focus-within:border-primary/20 focus-within:shadow-lg focus-within:shadow-primary/5">
            <Search size={18} className="group-focus-within:scale-110 transition-transform" />
            <input 
              type="text" 
              placeholder="Cari fitur, laporan, atau data..." 
              className="bg-transparent border-none focus:outline-none text-xs font-black uppercase tracking-widest w-64 text-slate-900 placeholder:text-slate-400 placeholder:font-bold" 
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => window.print()}
              className="p-2.5 text-slate-500 hover:text-primary glass-card border-none shadow-none hover:bg-white/80 rounded-2xl transition-all print-hidden"
              title="Cetak Halaman Ini"
            >
              <Printer size={20} />
            </button>

            <div className="relative notification-container">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative p-2.5 glass-card border-none shadow-none rounded-2xl transition-all",
                  showNotifications ? "bg-white/90 text-primary" : "text-slate-500 hover:text-primary hover:bg-white/80"
                )}
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <motion.span 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" 
                  />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-4 w-96 bg-white rounded-3xl shadow-2xl shadow-primary/10 border border-slate-100 overflow-hidden z-[50]"
                  >
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pemberitahuan</h3>
                      <button 
                        onClick={() => {
                          setNotifications(notifications.map(n => ({...n, read: true})));
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70"
                      >
                        Tandai Semua Dibaca
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {notifications.map((n) => (
                            <div 
                              key={n.id} 
                              className={cn(
                                "p-6 hover:bg-slate-50 transition-colors cursor-pointer group",
                                !n.read && "bg-primary/5"
                              )}
                              onClick={() => {
                                setNotifications(notifications.map(notif => notif.id === n.id ? {...notif, read: true} : notif));
                              }}
                            >
                              <div className="flex items-start gap-4">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-2 shrink-0",
                                  n.type === 'warning' ? "bg-orange-500" : n.type === 'success' ? "bg-emerald-500" : "bg-blue-500"
                                )} />
                                <div className="space-y-1">
                                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{n.title}</p>
                                  <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pt-1">{n.time}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-12 text-center text-slate-400">
                          <p className="text-xs font-black uppercase tracking-widest">Tidak ada pemberitahuan baru</p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                      <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                        Lihat Semua Riwayat
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-px bg-slate-200/50" />
            <div className="relative user-menu-container">
              <div 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-4 cursor-pointer group"
              >
                <div className="text-right text-slate-900">
                  <p className="text-xs font-black leading-tight uppercase tracking-tight">
                    {user.nama || user.displayName || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{user.role || 'Sekretariat DPRD'}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#1e0533] text-white flex items-center justify-center font-black shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform border border-white/10 uppercase italic overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    (user.nama || user.displayName || user.email?.charAt(0) || "U").charAt(0)
                  )}
                </div>
              </div>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-4 w-56 bg-white rounded-3xl shadow-2xl shadow-primary/10 border border-slate-100 overflow-hidden z-[50]"
                  >
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">User Aktif</p>
                      <p className="text-xs font-black text-slate-900 truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { setActiveTab('settings'); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-2xl transition-colors group"
                      >
                        <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors text-slate-500">
                          <Settings size={16} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Pengaturan</span>
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-2xl transition-colors group"
                      >
                        <div className="p-2 bg-red-50 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors text-red-500">
                          <LogOut size={16} />
                        </div>
                        <span className="text-[11px] font-bold text-red-500 uppercase tracking-tight">Keluar Aplikasi</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-10 relative z-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

