import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, Database, Calculator, FileText, 
  CheckSquare, LogOut, Settings, User, Bell, FolderTree, Shield, Truck
} from 'lucide-react';
import { ActiveTab } from '../types';
import { cn } from '../lib/utils';

import { User as FirebaseUser } from 'firebase/auth';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  agencyInfo?: {
    logo: string;
    name: string;
  };
  user?: { 
    email: string; 
    displayName?: string; 
    photoURL?: string; 
    role?: string;
    nama?: string;
  } | null;
  onLogout?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, agencyInfo, user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'database_pegawai', label: 'Database Pegawai', icon: User },
    { id: 'database_vendor', label: 'Database Rekanan', icon: Truck },
    { id: 'database_anggaran', label: 'Database Anggaran', icon: FolderTree },
    { id: 'database_spj', label: 'Database SPJ Barjas', icon: Database },
    { id: 'kalkulator_pajak', label: 'Kalkulator Pajak', icon: Calculator },
    { id: 'laporan_realisasi', label: 'Laporan Realisasi', icon: FileText },
    { id: 'checklist', label: 'Checklist SPJ', icon: CheckSquare },
  ];

  // Only show User Management for Super Admins
  if (user?.role === 'Super Admin' || user?.email?.toLowerCase() === 'ysn.pptk@gmail.com') {
    menuItems.push({ id: 'database_user', label: 'Manajemen User', icon: Shield });
  }

  return (
    <aside className="w-64 bg-[#1e0533] fixed left-0 top-0 text-white h-screen flex flex-col z-50 border-r border-white/5">
      <div className="p-8 pb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-metallic/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-black tracking-tighter flex flex-col leading-none">
            <span className="text-white">SPJ</span>
            <span className="text-gradient-gold mt-1">DIGITAL</span>
          </h2>
          <p className="text-[10px] uppercase tracking-[0.3em] font-black mt-3 opacity-30">Management System</p>
        </motion.div>
      </div>

      <nav className="flex-grow mt-8 px-4 space-y-1.5 overflow-y-auto pt-2">
        {menuItems.map((item, idx) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx, duration: 0.3 }}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(item.id as ActiveTab)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm relative group mb-1",
              activeTab === item.id 
                ? "bg-white text-primary shadow-xl shadow-black/10" 
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            {activeTab === item.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute left-0 w-1.5 h-6 bg-primary-metallic rounded-r-full"
              />
            )}
            <item.icon size={20} className={cn(
              "transition-transform",
              activeTab === item.id ? "scale-110" : "group-hover:scale-110"
            )} />
            {item.label}
          </motion.button>
        ))}
      </nav>

      <div className="p-4 mt-auto space-y-4">
        {user && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-metallic/20 flex items-center justify-center text-primary-metallic border border-primary-metallic/20">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <User size={14} />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black text-white/90 truncate leading-none mb-1 uppercase tracking-tight">
                  {user.nama || user.displayName || 'User Aktif'}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{user.role || 'Offline'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center justify-center gap-2 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'settings' ? "bg-white text-primary" : "bg-white/5 hover:bg-white/10 text-white/50"
            )}
          >
            <Settings size={14} />
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group"
          >
            <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </aside>
  );
}
