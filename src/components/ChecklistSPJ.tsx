import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Square, Info, ShieldCheck, AlertCircle, Printer } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ChecklistSPJ() {
  const [items, setItems] = useState([
    { id: '1', label: 'Surat Pengantar SPJ', checked: true, required: true },
    { id: '2', label: 'Surat Permintaan Pembayaran (SPP)', checked: true, required: true },
    { id: '3', label: 'Surat Pernyataan Tanggung Jawab Belanja (SPTJB)', checked: true, required: true },
    { id: '4', label: 'Surat Perintah Kerja (SPK) / Kontrak', checked: false, required: true },
    { id: '5', label: 'Ringkasan Kontrak', checked: false, required: true },
    { id: '6', label: 'Laporan Naratif Kegiatan', checked: true, required: true },
    { id: '7', label: 'Rincian Realisasi Anggaran', checked: true, required: true },
    { id: '8', label: 'Kuitansi + Nota + Bukti Bayar Pajak', checked: false, required: true },
    { id: '9', label: 'Foto Dokumentasi / Berita Acara', checked: true, required: false },
    { id: '10', label: 'Berita Acara Serah Terima (BAST)', checked: false, required: true },
    { id: '11', label: 'Daftar Pengeluaran Riil', checked: true, required: false },
  ]);

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const progress = Math.round((items.filter(i => i.checked).length / items.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Verifikasi Kelengkapan SPJ</h1>
          <p className="text-slate-500">Pastikan seluruh dokumen fisik dan digital telah sesuai standar regulasi.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase">Kelengkapan</p>
            <p className="text-3xl font-black text-primary">{progress}%</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm text-slate-600 print-hidden"
          >
            <Printer size={16} /> Cetak Checklist
          </button>
        </div>
      </header>

      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-primary rounded-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => toggleItem(item.id)}
              className={cn(
                "group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer",
                item.checked 
                  ? "bg-white border-primary/20 shadow-sm" 
                  : "bg-slate-50 border-transparent hover:border-slate-200"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  item.checked ? "bg-primary text-white" : "bg-white text-slate-300 border border-slate-200"
                )}>
                  {item.checked ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-bold",
                    item.checked ? "text-slate-900" : "text-slate-500"
                  )}>
                    {item.label}
                  </p>
                  {item.required && <span className="text-[10px] text-red-400 font-bold uppercase tracking-tighter">Wajib SPJ</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 metallic-purple text-white">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldCheck size={20} />
              Analisis Aduan
            </h3>
            <div className="space-y-4 text-xs font-medium leading-relaxed opacity-90">
              {progress < 100 ? (
                <>
                  <p className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-red-300 flex-shrink-0" />
                    <span>Terdapat {items.filter(i => !i.checked && i.required).length} dokumen wajib yang belum lengkap.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Info size={14} className="text-amber-300 flex-shrink-0" />
                    <span>Lengkapi checklist untuk mengaktifkan tombol cetak SPJ otomatis.</span>
                  </p>
                </>
              ) : (
                <p className="flex items-start gap-2 text-green-300">
                  <ShieldCheck size={14} className="flex-shrink-0" />
                  <span>Semua dokumen telah diverifikasi secara sistem. Siap untuk proses pembayaran.</span>
                </p>
              )}
              <div className="pt-2 border-t border-white/10 mt-2">
                <p>📍 Pastikan tanda tangan basah pada kuitansi telah di-scan dengan resolusi minimal 300 DPI.</p>
                <p className="mt-2">📍 Pajak PPh 22 atas pengadaan barang wajib dilampirkan bukti setornya (SSP).</p>
              </div>
            </div>
          </div>

          <button 
            disabled={progress < 100}
            className={cn(
              "w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg",
              progress < 100 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                : "bg-green-500 text-white hover:bg-green-600 shadow-green-500/20"
            )}
          >
            {progress < 100 ? "Pending Verifikasi" : "Selesaikan SPJ"}
          </button>

          <div className="glass-card p-6 bg-amber-50 border-amber-200">
            <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
              <Info size={16} />
              Tips Audit
            </h3>
            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
              Dokumen BAST (Berita Acara Serah Terima) adalah bukti vital bahwa barang/jasa telah diterima secara fisik oleh pengguna. Jangan abaikan foto dokumentasi sebagai bukti sekunder yang kuat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
