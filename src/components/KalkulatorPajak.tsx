import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Info, RotateCcw, Copy, Check, AlertCircle, Printer } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

export default function KalkulatorPajak() {
  const [bruto, setBruto] = useState<number>(0);
  const [usePpn, setUsePpn] = useState(true);
  const [pphType, setPphType] = useState<'21' | '22' | '23' | '4(2)' | 'none'>('22');
  const [copied, setCopied] = useState(false);

  // Calculations
  const ppnRate = 0.11;
  const ppn = usePpn ? bruto * ppnRate : 0;
  
  const getPphRate = () => {
    switch (pphType) {
      case '21': return 0.05; // Dummy: assume standard progressive minimum
      case '22': return 0.015;
      case '23': return 0.02;
      case '4(2)': return 0.02;
      default: return 0;
    }
  };

  const pphRate = getPphRate();
  const dpp = bruto; // Simplified: set DPP as gross for basic calc
  const pph = dpp * pphRate;
  const netto = bruto - pph; // In government systems, PPN is usually added on top or handled separately
  const totalDibayar = bruto - pph; // Assuming PPN is collected/paid by state but PPh is withheld from vendor

  const handleCopy = () => {
    const text = `Bruto: ${formatCurrency(bruto)}\nPPN (11%): ${formatCurrency(ppn)}\nPhh (${pphType}): ${formatCurrency(pph)}\nNetto: ${formatCurrency(netto)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Calculator className="text-primary" size={32} />
            Kalkulator Pajak Belanja
          </h1>
          <p className="text-slate-500">Hitung otomatis PPN, PPh 21, 22, 23, dan 4(2) untuk setiap transaksi belanja.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-slate-600 print-hidden"
        >
          <Printer size={16} /> Cetak Kalkulasi
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-card p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nilai Belanja (Bruto)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                <input
                  type="number"
                  value={bruto || ''}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    setBruto(val);
                  }}
                  placeholder="0"
                  className={cn(
                    "w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-all font-bold text-lg",
                    bruto > 1000000000 ? "border-amber-400 bg-amber-50" : "border-slate-100 focus:border-primary"
                  )}
                />
              </div>
              {bruto > 1000000000 && (
                <p className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} /> Nilai belanja sangat besar, mohon periksa kembali (Human Error Check).
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                id="ppn"
                type="checkbox"
                checked={usePpn}
                onChange={(e) => setUsePpn(e.target.checked)}
                className="w-5 h-5 rounded accent-primary"
              />
              <label htmlFor="ppn" className="text-sm font-semibold text-slate-700">Terapkan PPN (11%)</label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Jenis PPh</label>
              <div className="grid grid-cols-3 gap-2">
                {['none', '21', '22', '23', '4(2)'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setPphType(type as any)}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-bold transition-all border-2 uppercase",
                      pphType === type 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white text-slate-500 border-slate-100 hover:border-primary/30"
                    )}
                  >
                    {type === 'none' ? 'Tanpa PPh' : `PPh ${type}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
            <Info className="flex-shrink-0 text-blue-500" size={20} />
            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
              Sesuai PMK, PPN 11% dikenakan pada belanja di atas Rp 2.000.000. PPh 22 dikenakan pada belanja barang, sedangkan PPh 23 pada jasa.
            </p>
          </div>
        </section>

        <section className="glass-card metallic-purple p-8 text-white relative flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold opacity-80 uppercase tracking-widest text-xs">Rincian Perhitungan</h3>
              <button 
                onClick={handleCopy}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                <span className="text-white/60 text-sm font-medium">Bruto</span>
                <span className="text-xl font-bold">{formatCurrency(bruto)}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                <span className="text-white/60 text-sm font-medium">PPN (11%)</span>
                <span className="text-xl font-bold">{formatCurrency(ppn)}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-2">
                <span className="text-white/60 text-sm font-medium">Potongan PPh {pphType !== 'none' ? pphType : ''}</span>
                <span className="text-xl font-bold text-red-200">-{formatCurrency(pph)}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Total Yang Diterima Rekanan (Netto)</p>
              <h4 className="text-4xl font-extrabold">{formatCurrency(totalDibayar)}</h4>
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <button 
              onClick={() => { setBruto(0); setPphType('22'); }}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
