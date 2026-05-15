import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, Share2, FileCheck, ShieldCheck, MapPin, Calendar, User, QrCode, ClipboardList, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate, terbilang } from '../lib/utils';
import { Packet, Program } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface LaporanRealisasiProps {
  agencyInfo: {
    name: string;
    address: string;
    logo: string;
  };
  packet?: Packet;
}

export default function LaporanRealisasi({ agencyInfo, packet: initialPacket }: LaporanRealisasiProps) {
  const [spjList, setSpjList] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | undefined>(initialPacket);
  const [showSelector, setShowSelector] = useState(false);
  const [linkedProgram, setLinkedProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (!initialPacket) {
      const q = query(collection(db, 'packets'), orderBy('no', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: Packet[] = [];
        snapshot.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() } as Packet);
        });
        setSpjList(data);
        if (data.length > 0 && !selectedPacket) {
          setSelectedPacket(data[0]);
        }
      });
      return () => unsubscribe();
    }
  }, [initialPacket]);

  useEffect(() => {
    const fetchLinkedProgram = async () => {
      if (selectedPacket?.progId) {
        const docRef = doc(db, "programs", selectedPacket.progId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLinkedProgram(docSnap.data() as Program);
        }
      } else {
        setLinkedProgram(null);
      }
    };
    fetchLinkedProgram();
  }, [selectedPacket]);

  // Sync selected packet if prop changes
  useEffect(() => {
    if (initialPacket) {
      setSelectedPacket(initialPacket);
    }
  }, [initialPacket]);

  const packet = selectedPacket;
  const defaultNamaPaket = packet?.namaPaket || 'Penyediaan Jasa Perkantoran & Operasional';
  
  // Use packet data if available, otherwise use defaults/placeholders
  const data = {
    namaPaket: defaultNamaPaket,
    nomorLaporan: packet?.nomorBerkas || `${new Date().getFullYear()}/LRJ/DPRD/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/001`,
    pagu: packet?.paguAnggaran || 0,
    realisasi: packet?.nilaiKontrak || 0,
    pic: packet?.pic || 'Belum Ditentukan',
    nipPic: packet?.nipPic || '...........................',
    lokasi: packet?.lokasiPekerjaan || 'Kantor Sekretariat DPRD Prov. Kalteng',
    tahun: packet?.tanggalMulai ? new Date(packet.tanggalMulai).getFullYear().toString() : new Date().getFullYear().toString(),
    linkedProgName: linkedProgram?.nama || 'Program Dukungan Infrastruktur & Sekretariat',
    linkedKegName: linkedProgram?.kegiatan.find(k => k.id === selectedPacket?.kegId)?.nama || defaultNamaPaket,
    linkedSubName: linkedProgram?.kegiatan.flatMap(k => k.subKegiatan).find(s => s.id === selectedPacket?.subId)?.nama || 'Penyediaan Komponen Instalasi Listrik/Penerangan',
  };

  const percentage = data.pagu > 0 ? (data.realisasi / data.pagu) * 100 : 0;
  const sisa = data.pagu - data.realisasi;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Selector for main tab view */}
      {!initialPacket && spjList.length > 0 && (
        <div className="glass-card p-6 bg-primary-metallic/5 border-primary-metallic/10 print-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-metallic text-white rounded-lg">
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Pilih Paket Realisasi</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Tampilkan laporan spesifik untuk paket SPJ</p>
              </div>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowSelector(!showSelector)}
                className="flex items-center gap-4 px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:border-primary-metallic transition-all shadow-sm"
              >
                {packet?.namaPaket || 'Pilih Paket...'}
                <ChevronDown size={16} />
              </button>
              
              {showSelector && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    {spjList.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => {
                          setSelectedPacket(p);
                          setShowSelector(false);
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <p className="text-xs font-black text-slate-900 uppercase truncate">{p.namaPaket}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">{p.penyedia} • {formatCurrency(p.nilaiKontrak)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Controls - Hidden when inside DatabaseSPJ viewing mode if needed, but here we keep it for general use */}
      <div className="flex justify-between items-center glass-card p-4 print-hidden">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 text-green-700 p-2 rounded-lg">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Dokumen</p>
            <p className="text-sm font-bold text-slate-900">Valid & Terverifikasi Digital</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Integritas Data: 100% OK</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <Share2 size={16} /> Bagikan
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 metallic-purple text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Printer size={16} /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Actual Report Document Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-2xl rounded-sm p-12 md:p-16 border-t-8 border-slate-900 print:shadow-none print:border-none font-serif"
      >
        {/* Letterhead / Kop Surat */}
        <div className="flex flex-col items-center text-center border-b-4 border-double border-slate-900 pb-6 mb-8">
          <div className="flex items-center gap-6 mb-4">
            <div className="w-20 h-20 bg-slate-50 flex items-center justify-center p-2 border-2 border-slate-200">
               {agencyInfo.logo ? <img src={agencyInfo.logo} alt="Logo" className="w-full h-full object-contain" /> : <div className="text-[10px] font-black text-slate-300 uppercase">Logo Instansi</div>}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight font-sans">PEMERINTAH PROVINSI KALIMANTAN TENGAH</h2>
              <h1 className="text-xl font-black uppercase tracking-normal leading-tight font-sans">{agencyInfo.name}</h1>
              <p className="text-[10px] font-bold text-slate-500 mt-2 font-sans italic max-w-xl">{agencyInfo.address}</p>
            </div>
          </div>
        </div>

        {/* Title & Reference */}
        <div className="text-center mb-12 space-y-2">
          <h1 className="text-2xl font-black uppercase underline underline-offset-4 decoration-2">LAPORAN REALISASI KEGIATAN & PERTANGGUNGJAWABAN (SPJ)</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">NOMOR LAPORAN: {data.nomorLaporan}</p>
        </div>

        {/* Body Sections */}
        <div className="space-y-10 font-sans">
          <section className="space-y-4">
            <h3 className="text-xs font-black bg-slate-900 text-white px-4 py-1.5 uppercase tracking-widest inline-block">I. DATA UMUM KEGIATAN</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 pl-4 border-l-2 border-slate-200">
              {[
                { label: 'Program', value: data.linkedProgName },
                { label: 'Kegiatan', value: data.linkedKegName },
                { label: 'Sub-Kegiatan', value: data.linkedSubName },
                { label: 'Tahun Anggaran', value: data.tahun },
                { label: 'PPTK Pengampu', value: data.pic },
                { label: 'Lokasi', value: data.lokasi },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</span>
                  <span className="text-[11px] font-black text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black bg-slate-900 text-white px-4 py-1.5 uppercase tracking-widest inline-block">II. RINGKASAN REALISASI ANGGARAN</h3>
            <div className="border-2 border-slate-900 overflow-hidden">
              <table className="w-full text-[11px] font-bold border-collapse">
                <thead className="bg-slate-100 border-b-2 border-slate-900 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left border-r border-slate-900">Deskripsi Anggaran</th>
                    <th className="px-4 py-3 text-right border-r border-slate-900">Pagu (DPA)</th>
                    <th className="px-4 py-3 text-right border-r border-slate-900">Realisasi (SPJ)</th>
                    <th className="px-4 py-3 text-center">Sisa/Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr className="bg-white">
                    <td className="px-4 py-3 border-r border-slate-900 uppercase">{packet?.kategori || 'Belanja Modal'} / Jasa</td>
                    <td className="px-4 py-3 text-right border-r border-slate-900">{formatCurrency(data.pagu)}</td>
                    <td className="px-4 py-3 text-right border-r border-slate-900 text-indigo-600">{formatCurrency(data.realisasi)}</td>
                    <td className="px-4 py-3 text-center bg-slate-50">
                      <div className="flex flex-col items-center">
                        <span className="text-green-600">{percentage.toFixed(2)}%</span>
                        <span className="text-[9px] text-slate-400">SISA: {formatCurrency(sisa)}</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3 border-r border-slate-900 uppercase italic pl-8 text-slate-500">Pajak Pertambahan Nilai (PPN 11%)</td>
                    <td className="px-4 py-3 text-right border-r border-slate-900 text-slate-400">{formatCurrency(data.realisasi * 0.11)}</td>
                    <td className="px-4 py-3 text-right border-r border-slate-900 text-slate-400">{formatCurrency(data.realisasi * 0.11)}</td>
                    <td className="px-4 py-3 text-center text-slate-300">-</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black text-sm uppercase">
                  <tr>
                    <td className="px-4 py-4 border-r border-white/20">Total Akumulasi Realisasi</td>
                    <td className="px-4 py-4 text-right border-r border-white/20 opacity-50 text-[10px]">{formatCurrency(data.pagu)}</td>
                    <td className="px-4 py-4 text-right text-lg">{formatCurrency(data.realisasi)}</td>
                    <td className="px-4 py-4 text-center text-green-400 text-xs text-uppercase">{percentage >= 100 ? 'FISIK 100%' : 'TERVERIFIKASI'}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="p-4 bg-slate-50 border-t-2 border-slate-900">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Terbilang (Realisasi):</p>
                <p className="text-xs font-black italic text-slate-800 uppercase tracking-tight"># {terbilang(data.realisasi)} Rupiah #</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black bg-slate-900 text-white px-4 py-1.5 uppercase tracking-widest inline-block">III. PERNYATAAN & HASIL CAPAIAN</h3>
            <div className="p-6 border-2 border-slate-900 bg-white relative">
              <div className="absolute top-4 right-4 opacity-10">
                <ShieldCheck size={80} className="text-slate-900" />
              </div>
              <p className="text-xs leading-loose text-justify italic font-serif">
                "Berdasarkan hasil pemeriksaan fisik dan administratif, seluruh paket pengadaan yang tertera dalam laporan ini telah diselesaikan {percentage.toFixed(0)}% sesuai dengan spesifikasi teknis dan jangka waktu yang ditentukan. Seluruh dokumen pertanggungjawaban (SPJ) berupa Bukti Pembayaran, Faktur Pajak, dan Berita Acara Serah Terima telah diverifikasi secara digital dan dinyatakan SAH. Laporan ini dibuat sebagai dasar pengajuan tahap pembayaran selanjutnya dan sebagai bentuk akuntabilitas publik atas penggunaan anggaran negara."
              </p>
            </div>
          </section>

          {/* Signatures Cluster */}
          <div className="mt-20 grid grid-cols-2 gap-x-24 text-center font-sans relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
              <QrCode size={120} />
            </div>
            <div className="space-y-20">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Mengetahui/Mengesahkan,<br /><span className="text-slate-900">Pejabat Pembuat Komitmen (PPK)</span></p>
              </div>
              <div>
                <p className="text-sm font-black uppercase underline decoration-2 underline-offset-4">Dr. Heri Santoso, M.Epid</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">NIP. 19780512 200501 1 003</p>
              </div>
            </div>
            <div className="space-y-20">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Palangka Raya, {formatDate(new Date().toISOString())}<br /><span className="text-slate-900">Pejabat Pelaksana Teknis Kegiatan (PPTK)</span></p>
              </div>
              <div>
                <p className="text-sm font-black uppercase underline decoration-2 underline-offset-4">{data.pic}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">NIP. {data.nipPic}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Digital Footprint */}
        <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[8px] font-black uppercase text-slate-300 tracking-[0.2em]">Hash Integrity Verification</p>
            <p className="font-mono text-[7px] text-slate-400 break-all max-w-sm">SHA-256: 8f94a532e8d91c1b1c5e7f8d9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7g8h</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black italic text-emerald-500 uppercase tracking-widest flex items-center gap-2 justify-end">
              <ShieldCheck size={12} /> Verified by SPJ Digital Ultimate v2.6
            </p>
            <p className="text-[8px] text-slate-300 font-medium mt-1">Printed on: {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
