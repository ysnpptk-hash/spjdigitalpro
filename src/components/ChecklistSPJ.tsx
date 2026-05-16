import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Square, Info, ShieldCheck, AlertCircle, Printer, User, Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { Packet, Employee, ChecklistItem, SPJChecklist } from '../types';

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: '1', label: 'Surat Pengantar SPJ', checked: false, required: true },
  { id: '2', label: 'Surat Permintaan Pembayaran (SPP)', checked: false, required: true },
  { id: '3', label: 'Surat Pernyataan Tanggung Jawab Belanja (SPTJB)', checked: false, required: true },
  { id: '4', label: 'Surat Perintah Kerja (SPK) / Kontrak', checked: false, required: true },
  { id: '5', label: 'Ringkasan Kontrak', checked: false, required: true },
  { id: '6', label: 'Laporan Naratif Kegiatan', checked: false, required: true },
  { id: '7', label: 'Rincian Realisasi Anggaran', checked: false, required: true },
  { id: '8', label: 'Kuitansi + Nota + Bukti Bayar Pajak', checked: false, required: true },
  { id: '9', label: 'Foto Dokumentasi / Berita Acara', checked: false, required: false },
  { id: '10', label: 'Berita Acara Serah Terima (BAST)', checked: false, required: true },
  { id: '11', label: 'Daftar Pengeluaran Riil', checked: false, required: false },
];

export default function ChecklistSPJ() {
  const [spjs, setSpjs] = useState<Packet[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedSpjId, setSelectedSpjId] = useState<string>('');
  const [checklist, setChecklist] = useState<SPJChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSpjSelector, setShowSpjSelector] = useState(false);

  useEffect(() => {
    // Fetch SPJs
    const qSpjs = query(collection(db, 'packets'), orderBy('no', 'asc'));
    const unsubSpjs = onSnapshot(qSpjs, (snap) => {
      const data: Packet[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Packet));
      setSpjs(data);
      if (data.length > 0 && !selectedSpjId) {
        setSelectedSpjId(data[0].id);
      }
      setLoading(false);
    });

    // Fetch Employees
    const qEmps = query(collection(db, 'employees'), orderBy('nama', 'asc'));
    const unsubEmps = onSnapshot(qEmps, (snap) => {
      const data: Employee[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Employee));
      setEmployees(data);
    });

    return () => {
      unsubSpjs();
      unsubEmps();
    };
  }, []);

  useEffect(() => {
    if (!selectedSpjId) return;

    const unsubChecklist = onSnapshot(doc(db, 'spj_checklists', selectedSpjId), (snap) => {
      if (snap.exists()) {
        setChecklist(snap.data() as SPJChecklist);
      } else {
        // Initialize new checklist
        const newChecklist: SPJChecklist = {
          spjId: selectedSpjId,
          items: DEFAULT_ITEMS,
          updatedAt: new Date().toISOString()
        };
        setChecklist(newChecklist);
        setDoc(doc(db, 'spj_checklists', selectedSpjId), newChecklist);
      }
    });

    return () => unsubChecklist();
  }, [selectedSpjId]);

  const toggleItem = async (itemId: string) => {
    if (!checklist) return;
    const newItems = checklist.items.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    const updated = { ...checklist, items: newItems, updatedAt: new Date().toISOString() };
    setChecklist(updated);
    await setDoc(doc(db, 'spj_checklists', selectedSpjId), updated);
  };

  const assignUser = async (itemId: string, userId: string) => {
    if (!checklist) return;
    const newItems = checklist.items.map(item => 
      item.id === itemId ? { ...item, assignedTo: userId === item.assignedTo ? undefined : userId } : item
    );
    const updated = { ...checklist, items: newItems, updatedAt: new Date().toISOString() };
    setChecklist(updated);
    await setDoc(doc(db, 'spj_checklists', selectedSpjId), updated);
  };

  const progress = checklist 
    ? Math.round((checklist.items.filter(i => i.checked).length / checklist.items.length) * 100)
    : 0;

  const selectedSpj = spjs.find(s => s.id === selectedSpjId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <div className="w-12 h-12 bg-slate-100 rounded-full mb-4" />
        <div className="h-4 w-32 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 flex-grow">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Verifikasi Kelengkapan SPJ</h1>
            <p className="text-slate-500 font-medium">Manajemen aset dokumen dan penugasan verifikasi tim.</p>
          </div>

          {/* SPJ Selector */}
          <div className="relative w-full max-w-xl">
            <button 
              onClick={() => setShowSpjSelector(!showSpjSelector)}
              className="w-full flex items-center justify-between px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary/20 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Search size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Paket yang Diproses</p>
                  <p className="text-sm font-black text-slate-900 line-clamp-1">
                    {selectedSpj ? selectedSpj.namaPaket : 'Pilih Paket SPJ...'}
                  </p>
                </div>
              </div>
              <ChevronDown className={cn("text-slate-400 transition-transform", showSpjSelector && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showSpjSelector && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Daftar Paket SPJ Aktif</p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {spjs.map(spj => (
                      <button
                        key={spj.id}
                        onClick={() => {
                          setSelectedSpjId(spj.id);
                          setShowSpjSelector(false);
                        }}
                        className={cn(
                          "w-full text-left p-4 hover:bg-slate-50 transition-all flex items-center justify-between group",
                          selectedSpjId === spj.id && "bg-primary/5"
                        )}
                      >
                        <div>
                          <p className={cn("text-sm font-black transition-colors", selectedSpjId === spj.id ? "text-primary" : "text-slate-700")}>
                            {spj.namaPaket}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{spj.penyedia} • {new Date(spj.tanggalMulai).toLocaleDateString('id-ID')}</p>
                        </div>
                        {selectedSpjId === spj.id && <Check size={18} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Verifikasi</p>
            <p className="text-5xl font-black text-primary leading-none tracking-tighter">{progress}%</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm text-slate-600 print-hidden"
          >
            <Printer size={16} /> Cetak Checklist
          </button>
        </div>
      </header>

      {/* Progress Bar Container */}
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full relative"
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Info size={14} /> Klik item untuk menandai selesai. Gunakan tombol user untuk penugasan.
             </p>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {checklist?.items.map((item, idx) => {
                const assignedEmployee = employees.find(e => e.id === item.assignedTo);
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "group flex items-center gap-4 p-5 rounded-2xl border-2 transition-all shadow-sm",
                      item.checked 
                        ? "bg-white border-primary/20 shadow-primary/5" 
                        : "bg-white border-transparent hover:border-slate-200 active:scale-[0.99]"
                    )}
                  >
                    <div 
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        "p-3 rounded-xl transition-all cursor-pointer",
                        item.checked 
                          ? "bg-primary text-white shadow-lg shadow-primary/20 rotate-0" 
                          : "bg-slate-50 text-slate-300 border border-slate-100 group-hover:border-slate-300"
                      )}
                    >
                      {item.checked ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>

                    <div className="flex-grow cursor-pointer" onClick={() => toggleItem(item.id)}>
                      <p className={cn(
                        "text-sm font-black transition-all",
                        item.checked ? "text-slate-900" : "text-slate-500"
                      )}>
                        {item.label}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {item.required && (
                          <span className="text-[9px] text-rose-500 font-black uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full">
                            Wajib
                          </span>
                        )}
                        {assignedEmployee ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                             <User size={10} className="shrink-0" />
                             <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[100px]">
                               {assignedEmployee.nama.split(' ')[0]}
                             </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-bold italic tracking-tight">Belum Ditugaskan</span>
                        )}
                      </div>
                    </div>

                    {/* Assignee Selection */}
                    <div className="flex items-center gap-2">
                       <div className="relative group/menu">
                          <button 
                            className={cn(
                              "p-2.5 rounded-xl transition-all border",
                              item.assignedTo 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" 
                                : "bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-200"
                            )}
                            title="Tugaskan ke User"
                          >
                             <User size={16} />
                          </button>
                          
                          {/* Inner Dropdown for Assignment */}
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
                             <div className="p-3 border-b border-slate-50 bg-slate-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tugaskan Verifikator</p>
                             </div>
                             <div className="p-1 max-h-[200px] overflow-y-auto">
                                {employees.map(emp => (
                                  <button
                                    key={emp.id}
                                    onClick={() => assignUser(item.id, emp.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-xl transition-all"
                                  >
                                    <span className="text-[11px] font-bold text-slate-700 truncate">{emp.nama}</span>
                                    {item.assignedTo === emp.id && <Check size={14} className="text-primary" />}
                                  </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 metallic-purple text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 italic tracking-tighter">
              <ShieldCheck size={28} />
              Status Verifikasi
            </h3>
            
            <div className="space-y-6 relative z-10">
              {progress < 100 ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                    <AlertCircle size={20} className="text-rose-300 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Dokumen Tertunda</p>
                        <p className="text-sm font-bold leading-tight">
                           Terdapat {checklist?.items.filter(i => !i.checked && i.required).length} dokumen wajib yang belum diverifikasi oleh tim.
                        </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                    <Info size={20} className="text-amber-300 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Status Penugasan</p>
                        <p className="text-sm font-bold leading-tight">
                           {checklist?.items.filter(i => !i.assignedTo).length} item belum memiliki verifikator yang ditugaskan.
                        </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl backdrop-blur-md flex flex-col items-center text-center gap-4">
                   <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                      <ShieldCheck size={32} />
                   </div>
                   <div>
                      <h4 className="text-lg font-black uppercase italic tracking-tighter">Verifikasi Tuntas</h4>
                      <p className="text-xs font-medium opacity-80 mt-1">Sistem menyatakan paket ini layak untuk diproses penagihan lebih lanjut.</p>
                   </div>
                </div>
              )}
            </div>
          </div>

          <button 
            disabled={progress < 100}
            className={cn(
              "w-full py-5 rounded-3xl font-black uppercase text-sm tracking-widest transition-all shadow-2xl relative overflow-hidden group",
              progress < 100 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                : "bg-green-500 text-white hover:bg-green-600 hover:scale-[1.02] active:scale-[0.98] shadow-green-500/20"
            )}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10">{progress < 100 ? "Menunggu Tim Verifikator" : "Selesaikan & ACC Pembayaran"}</span>
          </button>

          <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl border border-white/5">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Info size={16} /> Audit Intelligence
            </h3>
            <p className="text-[11px] font-medium leading-relaxed opacity-80 italic">
              "Verifikasi digital memangkas waktu birokrasi hingga 70%. Pastikan lampiran pajak sdh sesuai dengan regulasi PMK terbaru agar tidak menghambat proses audit di akhir tahun anggaran."
            </p>
            <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/30">
                <span>Versi Audit: 2.0.4</span>
                <span>Last Scan: {checklist ? new Date(checklist.updatedAt).toLocaleTimeString() : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
