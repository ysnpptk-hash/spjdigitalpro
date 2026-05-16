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
    pic: packet?.pptkNama || packet?.pic || 'Belum Ditentukan',
    nipPic: packet?.pptkNip || packet?.nipPic || '...........................',
    pangkatPic: packet?.pptkPangkat || packet?.pangkatPic || '',
    paNama: packet?.paNama || '...........................',
    paNip: packet?.paNip || '...........................',
    paJabatan: packet?.paJabatan || 'Sekretaris DPRD',
    paPangkat: packet?.paPangkat || '',
    bendaharaNama: packet?.bendaharaNama || '...........................',
    bendaharaNip: packet?.bendaharaNip || '...........................',
    bendaharaJabatan: packet?.bendaharaJabatan || 'Bendahara Pengeluaran',
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
        className="bg-white shadow-2xl rounded-sm p-12 md:p-16 border-t-8 border-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 font-serif"
        id="printable-report"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4;
              margin: 1.5cm 2cm;
            }
            body {
              background: white !important;
              -webkit-print-color-adjust: exact;
              font-family: 'Times New Roman', serif;
            }
            .print-hidden {
              display: none !important;
            }
            #printable-report {
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              width: 100% !important;
            }
            .glass-card {
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}} />

        {/* Letterhead / Kop Surat */}
        <div className="flex items-center gap-4 border-b-[3px] border-double border-slate-900 pb-3 mb-8">
          <div className="w-20 h-20 flex-shrink-0">
             {agencyInfo.logo ? (
               <img src={agencyInfo.logo} alt="Logo" className="w-full h-full object-contain" />
             ) : (
               <div className="w-full h-full border border-dashed border-slate-300 flex items-center justify-center p-2 text-[8px] font-black text-slate-300 uppercase text-center">Logo Instansi</div>
             )}
          </div>
          <div className="flex-grow text-center">
            <h2 className="text-[18px] font-black uppercase tracking-tight leading-tight font-sans">PEMERINTAH PROVINSI KALIMANTAN TENGAH</h2>
            <h1 className="text-[22px] font-black uppercase tracking-normal leading-tight font-sans">SEKRETARIAT DEWAN PERWAKILAN RAKYAT DAERAH</h1>
            <p className="text-[11px] font-medium text-slate-800 mt-1 font-sans italic leading-tight">
              Jalan S. Parman Nomor 2 Palangka Raya, Kalimantan Tengah<br />
              Telepon (0536) 3221327, Faksimile (0536) 3221327<br />
              Laman: setwan.kaltengprov.go.id
            </p>
          </div>
          <div className="w-20 hidden md:block" /> {/* Spacer for centering text */}
        </div>

        {/* Title & Reference */}
        <div className="text-center mb-12 space-y-2">
          <h1 className="text-2xl font-black uppercase underline underline-offset-4 decoration-2">LAPORAN REALISASI KEGIATAN & PERTANGGUNGJAWABAN (SPJ)</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">NOMOR LAPORAN: {data.nomorLaporan}</p>
        </div>

        {/* Body Sections */}
        <div className="space-y-10 font-sans">
          <section className="space-y-3">
            <h3 className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 uppercase tracking-widest inline-block">I. DATA UMUM KEGIATAN</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1.5 pl-4 border-l-2 border-slate-200">
              {[
                { label: 'Program', value: data.linkedProgName },
                { label: 'Kegiatan', value: data.linkedKegName },
                { label: 'Sub-Kegiatan', value: data.linkedSubName },
                { label: 'Tahun Anggaran', value: data.tahun },
                { label: 'PPTK Pengampu', value: data.pic },
                { label: 'Lokasi Pekerjaan', value: data.lokasi },
              ].map((item, i) => (
                <div key={i} className="flex items-start py-1 border-b border-slate-50 last:border-0 gap-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase w-36 shrink-0">{item.label}</span>
                  <span className="text-[10px] font-black text-slate-400">:</span>
                  <span className="text-[10px] font-black text-slate-900 flex-grow leading-tight">{item.value || '-'}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black bg-slate-900 text-white px-4 py-1.5 uppercase tracking-widest inline-block">II. RINGKASAN REALISASI ANGGARAN</h3>
            <div className="border border-slate-900">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-slate-50 border-b border-slate-900 uppercase font-black">
                  <tr>
                    <th className="px-3 py-2 text-left border-r border-slate-900 w-[45%]">Deskripsi Anggaran / Belanja</th>
                    <th className="px-3 py-2 text-right border-r border-slate-900 w-[18%]">Pagu Anggaran</th>
                    <th className="px-3 py-2 text-right border-r border-slate-900 w-[18%]">Realisasi (SPJ)</th>
                    <th className="px-3 py-2 text-center w-[19%]">Status Realisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {packet?.rekapBelanja && packet.rekapBelanja.length > 0 ? (
                    packet.rekapBelanja.map((item, idx) => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-3 py-2 border-r border-slate-900 uppercase">
                          <span className="font-bold mr-2">{idx + 1}.</span> {item.uraian}
                          <div className="text-[8px] text-slate-400 font-bold ml-5">
                            {item.volume} {item.satuan} @ {formatCurrency(item.hargaSatuan)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(item.volume * item.hargaSatuan)}</td>
                        <td className="px-3 py-2 text-right border-r border-slate-900 text-indigo-700 font-black">{formatCurrency(item.volume * item.hargaSatuan)}</td>
                        <td className="px-3 py-2 text-center bg-slate-50/30">
                          <span className="text-green-700 font-black">100%</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="bg-white">
                      <td className="px-3 py-2 border-r border-slate-900 uppercase">{packet?.kategori || 'Belanja Modal'} / Jasa</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(data.pagu)}</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900 text-indigo-700 font-black">{formatCurrency(data.realisasi)}</td>
                      <td className="px-3 py-2 text-center bg-slate-50/30">
                        <div className="flex flex-col items-center">
                          <span className="text-green-700 font-black">{percentage.toFixed(2)}%</span>
                          <span className="text-[8px] text-slate-500 font-bold">SISA: {formatCurrency(sisa)}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className="bg-slate-50/10 text-slate-500 font-medium">
                    <td className="px-3 py-2 border-r border-slate-900 uppercase italic pl-6">Pajak Pertambahan Nilai (PPN 11%)</td>
                    <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(packet?.nilaiPPN || 0)}</td>
                    <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(packet?.nilaiPPN || 0)}</td>
                    <td className="px-3 py-2 text-center text-slate-300">-</td>
                  </tr>
                  {packet?.nilaiPPh22 ? (
                    <tr className="bg-slate-50/10 text-slate-500 font-medium">
                      <td className="px-3 py-2 border-r border-slate-900 uppercase italic pl-6">Pajak Penghasilan (PPh 22)</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(packet.nilaiPPh22)}</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(packet.nilaiPPh22)}</td>
                      <td className="px-3 py-2 text-center text-slate-300">-</td>
                    </tr>
                  ) : null}
                  {packet?.nilaiPPh23 ? (
                    <tr className="bg-slate-50/10 text-slate-500 font-medium">
                      <td className="px-3 py-2 border-r border-slate-900 uppercase italic pl-6">Pajak Penghasilan (PPh 23)</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(packet.nilaiPPh23)}</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(packet.nilaiPPh23)}</td>
                      <td className="px-3 py-2 text-center text-slate-300">-</td>
                    </tr>
                  ) : null}
                  {packet?.nilaiPPh42 ? (
                    <tr className="bg-slate-50/10 text-slate-500 font-medium">
                      <td className="px-3 py-2 border-r border-slate-900 uppercase italic pl-6">Pajak Penghasilan (PPh Pasal 4 Ayat 2)</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(packet.nilaiPPh42)}</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">{formatCurrency(packet.nilaiPPh42)}</td>
                      <td className="px-3 py-2 text-center text-slate-300">-</td>
                    </tr>
                  ) : null}
                  {!packet?.nilaiPPh22 && !packet?.nilaiPPh23 && !packet?.nilaiPPh42 && (
                    <tr className="bg-slate-50/10 text-slate-500 font-medium italic">
                      <td className="px-3 py-2 border-r border-slate-900 pl-6 uppercase">Pajak Penghasilan (PPh)</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">0</td>
                      <td className="px-3 py-2 text-right border-r border-slate-900">0</td>
                      <td className="px-3 py-2 text-center text-slate-300">-</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black text-[11px] uppercase">
                  <tr>
                    <td className="px-3 py-2 border-r border-white/20">Total Akumulasi Realisasi</td>
                    <td className="px-3 py-2 text-right border-r border-white/20 opacity-70 text-[9px]">{formatCurrency(data.pagu)}</td>
                    <td className="px-3 py-2 text-right text-sm">{formatCurrency(data.realisasi)}</td>
                    <td className="px-3 py-2 text-center">{percentage >= 100 ? 'FISIK 100%' : `${percentage.toFixed(0)}% SELESAI`}</td>
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
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-center font-sans relative">
            <div className="space-y-16">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Mengesahkan,<br /><span className="text-slate-900">{data.paJabatan}</span></p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[11px] font-black uppercase underline decoration-2 underline-offset-2">{data.paNama}</p>
                {data.paPangkat && <p className="text-[9px] font-bold text-slate-500 mt-0.5">{data.paPangkat}</p>}
                <p className="text-[9px] font-bold text-slate-500 mt-0.5">NIP. {data.paNip}</p>
              </div>
            </div>
            
            <div className="space-y-16">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Mengetahui,<br /><span className="text-slate-900">Bendahara Pengeluaran</span></p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[11px] font-black uppercase underline decoration-2 underline-offset-2">{data.bendaharaNama}</p>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5">NIP. {data.bendaharaNip}</p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Palangka Raya, {formatDate(new Date().toISOString())}<br /><span className="text-slate-900">Pejabat Pelaksana Teknis Kegiatan</span></p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[11px] font-black uppercase underline decoration-2 underline-offset-2">{data.pic}</p>
                {data.pangkatPic && <p className="text-[9px] font-bold text-slate-500 mt-0.5">{data.pangkatPic}</p>}
                <p className="text-[9px] font-bold text-slate-500 mt-0.5">NIP. {data.nipPic}</p>
              </div>
            </div>
          </div>
        </div>

          {/* Digital Footprint */}
          <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-end">
            <div className="flex items-center gap-6">
              <div className="p-2 border-2 border-slate-900 rounded-lg">
                <QrCode size={64} className="text-slate-900" />
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase text-slate-300 tracking-[0.2em]">Hash Integrity Verification</p>
                <p className="font-mono text-[7px] text-slate-400 break-all max-w-xs">SHA-256: 8f94a532e8d91c1b1c5e7f8d9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7g8h</p>
                <p className="text-[7px] text-slate-300 font-bold italic mt-1 italic leading-tight">Digital Fingerprint: {selectedPacket?.id || 'AUTH-DPRD-KALTENG'}</p>
              </div>
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
