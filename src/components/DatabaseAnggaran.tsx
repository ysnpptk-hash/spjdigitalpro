import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  FolderTree, ChevronRight, ChevronDown, Layers, 
  Target, CreditCard, Search, Plus, Filter, Info, FileSpreadsheet, Upload, Printer,
  Edit3, Trash2
} from 'lucide-react';
import { Program, Kegiatan, SubKegiatan, Belanja, User, Packet } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const dummyData: Program[] = [
  {
    id: 'p1',
    kode: '1.02.01',
    nama: 'PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH PROVINSI',
    pagu: 1500000000,
    kegiatan: [
      {
        id: 'k1',
        kode: '1.02.01.1.01',
        nama: 'Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah',
        pagu: 500000000,
        assignedTo: 'Sekretariat DPRD', // This user can manage this
        subKegiatan: [
          {
            id: 'sk1',
            kode: '1.02.01.1.01.01',
            nama: 'Penyusunan Dokumen Perencanaan Perangkat Daerah',
            pagu: 250000000,
            assignedTo: 'Sekretariat DPRD', // This user can manage this
            belanja: [
              { id: 'b1', kode: '5.1.02.01.01.0024', uraian: 'Belanja Alat Tulis Kantor', pagu: 50000000, realisasi: 45000000 },
              { id: 'b2', kode: '5.1.02.01.01.0026', uraian: 'Belanja Cetak dan Penggandaan', pagu: 100000000, realisasi: 85000000 },
              { id: 'b3', kode: '5.1.02.04.01.0001', uraian: 'Belanja Perjalanan Dinas Biasa', pagu: 100000000, realisasi: 92000000 },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'p2',
    kode: '1.02.02',
    nama: 'PROGRAM DUKUNGAN PELAKSANAAN TUGAS DAN FUNGSI DPRD',
    pagu: 25000000000,
    kegiatan: [
      {
        id: 'k2',
        kode: '1.02.02.1.02',
        nama: 'Penyediaan Layanan Kesehatan untuk UKM dan UKP Rujukan Tingkat Daerah Provinsi',
        pagu: 12000000000,
        assignedTo: 'Dinas Kesehatan', // Restrict this to Health Dept
        subKegiatan: []
      }
    ]
  }
];

interface DatabaseAnggaranProps {
  currentUser: User | null;
  onNavigate?: (tab: any, params?: any) => void;
}

export default function DatabaseAnggaran({ currentUser, onNavigate }: DatabaseAnggaranProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'programs'), orderBy('kode', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Program[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Program);
      });
      if (data.length === 0) {
        // Seed initial data if empty
        const seed = async () => {
          for (const p of dummyData) {
            await setDoc(doc(db, 'programs', p.id), p);
          }
        };
        seed();
      }
      setPrograms(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'programs');
      setLoading(false);
    });

    const unsubscribePackets = onSnapshot(collection(db, 'packets'), (snapshot) => {
      const data: Packet[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Packet));
      setPackets(data);
    });

    return () => {
      unsubscribe();
      unsubscribePackets();
    };
  }, []);

  const saveProgramsToFirestore = async (updated: Program[]) => {
    try {
      // In a real app we'd update specific docs, but here we just sync the whole structure for simplicity
      // and to maintain the hierarchical logic in React state.
      for (const p of updated) {
        await setDoc(doc(db, 'programs', p.id), p);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'programs');
    }
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ p1: true, k1: true });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showAddProg, setShowAddProg] = useState(false);
  const [showAddKeg, setShowAddKeg] = useState<{progId: string} | null>(null);
  const [showAddSub, setShowAddSub] = useState<{kegId: string, progId: string} | null>(null);
  const [showAddBelanja, setShowAddBelanja] = useState<{subId: string, kegId: string, progId: string} | null>(null);
  
  // Form States
  const [newProg, setNewProg] = useState({ kode: '', nama: '' });
  const [newKeg, setNewKeg] = useState({ kode: '', nama: '', assignedTo: '' });
  const [newSub, setNewSub] = useState({ kode: '', nama: '', pagu: 0, realisasi: 0, assignedTo: '' });
  const [newBelanja, setNewBelanja] = useState({ 
    kode: '', 
    uraian: '', 
    volume: 1, 
    satuan: '', 
    hargaSatuan: 0,
    pagu: 0,
    realisasi: 0
  });

  const [editMode, setEditMode] = useState<any>(null);

  const isSuperAdmin = currentUser?.role === 'Super Admin';
  
  const canManage = (item: Kegiatan | SubKegiatan) => {
    if (isSuperAdmin) return true;
    if (!currentUser) return false;
    if (currentUser.role === 'Admin' && item.assignedTo === currentUser.departemen) return true;
    return false;
  };

  const handleDeleteProg = async (id: string) => {
    const hasLinkedPackets = packets.some(p => p.progId === id);
    if (hasLinkedPackets) {
      return alert('Tidak dapat menghapus program ini karena masih terdapat data SPJ (Packet) yang terhubung. Hapus data SPJ terkait terlebih dahulu.');
    }
    if (confirm('Apakah Anda yakin ingin menghapus program ini beserta seluruh datanya?')) {
      try {
        await deleteDoc(doc(db, 'programs', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `programs/${id}`);
      }
    }
  };

  const handleDeleteKeg = async (progId: string, kegId: string) => {
    const hasLinkedPackets = packets.some(p => p.kegId === kegId);
    if (hasLinkedPackets) {
      return alert('Tidak dapat menghapus kegiatan ini karena masih terdapat data SPJ (Packet) yang terhubung.');
    }
    if (confirm('Hapus kegiatan ini?')) {
      const updated = programs.map(p => {
        if (p.id === progId) {
          return { ...p, kegiatan: p.kegiatan.filter(k => k.id !== kegId) };
        }
        return p;
      });
      await saveProgramsToFirestore(recalculateTotals(updated));
    }
  };

  const handleDeleteSub = async (progId: string, kegId: string, subId: string) => {
    const hasLinkedPackets = packets.some(p => p.subId === subId);
    if (hasLinkedPackets) {
      return alert('Tidak dapat menghapus sub kegiatan ini karena masih terdapat data SPJ (Packet) yang terhubung.');
    }
    if (confirm('Hapus sub kegiatan ini?')) {
      const updated = programs.map(p => {
        if (p.id === progId) {
          return {
            ...p,
            kegiatan: p.kegiatan.map(k => {
              if (k.id === kegId) {
                return { ...k, subKegiatan: k.subKegiatan.filter(sk => sk.id !== subId) };
              }
              return k;
            })
          };
        }
        return p;
      });
      await saveProgramsToFirestore(recalculateTotals(updated));
    }
  };

  const handleDeleteBelanja = async (progId: string, kegId: string, subId: string, belId: string) => {
    const hasLinkedPackets = packets.some(p => p.belanjaId === belId);
    if (hasLinkedPackets) {
      return alert('Tidak dapat menghapus rincian belanja ini karena masih terdapat data SPJ (Packet) yang terhubung.');
    }
    if (confirm('Hapus rincian belanja ini?')) {
      const updated = programs.map(p => {
        if (p.id === progId) {
          return {
            ...p,
            kegiatan: p.kegiatan.map(k => {
              if (k.id === kegId) {
                return {
                  ...k,
                  subKegiatan: k.subKegiatan.map(sk => {
                    if (sk.id === subId) {
                      return { ...sk, belanja: sk.belanja.filter(b => b.id !== belId) };
                    }
                    return sk;
                  })
                };
              }
              return k;
            })
          };
        }
        return p;
      });
      await saveProgramsToFirestore(recalculateTotals(updated));
    }
  };

  const handleEditProg = (prog: Program) => {
    setNewProg({ kode: prog.kode, nama: prog.nama });
    setEditMode({ type: 'prog', id: prog.id });
    setShowAddProg(true);
  };

  const handleEditKeg = (progId: string, keg: Kegiatan) => {
    setNewKeg({ kode: keg.kode, nama: keg.nama, assignedTo: keg.assignedTo || '' });
    setEditMode({ type: 'keg', progId, id: keg.id });
    setShowAddKeg({ progId });
  };

  const handleEditSub = (progId: string, kegId: string, sub: SubKegiatan) => {
    setNewSub({ kode: sub.kode, nama: sub.nama, pagu: sub.pagu, realisasi: sub.realisasi || 0, assignedTo: sub.assignedTo || '' });
    setEditMode({ type: 'sub', progId, kegId, id: sub.id });
    setShowAddSub({ kegId, progId });
  };

  const handleEditBelanja = (progId: string, kegId: string, subId: string, bel: Belanja) => {
    setNewBelanja({ 
      kode: bel.kode, 
      uraian: bel.uraian, 
      volume: bel.volume || 1, 
      satuan: bel.satuan || '', 
      hargaSatuan: bel.hargaSatuan || 0,
      pagu: bel.pagu,
      realisasi: bel.realisasi || 0
    });
    setEditMode({ type: 'belanja', progId, kegId, subId, id: bel.id });
    setShowAddBelanja({ subId, kegId, progId });
  };

  const handleExportExcel = () => {
    const dataForExcel: any[] = [];

    programs.forEach(prog => {
      prog.kegiatan.forEach(keg => {
        if (keg.subKegiatan.length === 0) {
          dataForExcel.push({
            'Kode Program': prog.kode,
            'Nama Program': prog.nama,
            'Kode Kegiatan': keg.kode,
            'Nama Kegiatan': keg.nama,
            'Kode Sub Kegiatan': '-',
            'Nama Sub Kegiatan': '-',
            'Kode Akun': '-',
            'Uraian Belanja': '-',
            'Volume': 0,
            'Satuan': '-',
            'Harga Satuan': 0,
            'Pagu': 0
          });
        }
        keg.subKegiatan.forEach(sub => {
          if (sub.belanja.length === 0) {
            dataForExcel.push({
              'Kode Program': prog.kode,
              'Nama Program': prog.nama,
              'Kode Kegiatan': keg.kode,
              'Nama Kegiatan': keg.nama,
              'Kode Sub Kegiatan': sub.kode,
              'Nama Sub Kegiatan': sub.nama,
              'Kode Akun': '-',
              'Uraian Belanja': '-',
              'Volume': 0,
              'Satuan': '-',
              'Harga Satuan': 0,
              'Pagu': 0
            });
          }
          sub.belanja.forEach(bel => {
            dataForExcel.push({
              'Kode Program': prog.kode,
              'Nama Program': prog.nama,
              'Kode Kegiatan': keg.kode,
              'Nama Kegiatan': keg.nama,
              'Kode Sub Kegiatan': sub.kode,
              'Nama Sub Kegiatan': sub.nama,
              'Kode Akun': bel.kode,
              'Uraian Belanja': bel.uraian,
              'Volume': bel.volume || 0,
              'Satuan': bel.satuan || '-',
              'Harga Satuan': bel.hargaSatuan || 0,
              'Pagu': bel.pagu
            });
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DPA_Anggaran");

    // Adjust column widths
    const wscols = [
      {wch: 15}, {wch: 40}, {wch: 15}, {wch: 40}, {wch: 15}, {wch: 40}, {wch: 20}, {wch: 40}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 20}
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `DPA_Anggaran_${new Date().getFullYear()}.xlsx`);
  };

  const handleImportExcel = async (data: any[]) => {
    const programMap: Record<string, Program> = {};

    data.forEach((row) => {
      const progKode = row['Kode Program'];
      const progNama = row['Nama Program'];
      const kegKode = row['Kode Kegiatan'];
      const kegNama = row['Nama Kegiatan'];
      const subKode = row['Kode Sub Kegiatan'];
      const subNama = row['Nama Sub Kegiatan'];
      const akunKode = row['Kode Akun'];
      const uraian = row['Uraian Belanja'];
      const volume = Math.max(0, Number(row['Volume'] || 1));
      const satuan = row['Satuan'];
      const hargaSatuan = Math.max(0, Number(row['Harga Satuan'] || 0));
      const pagu = Math.max(0, row['Pagu'] ? Number(row['Pagu']) : (volume * hargaSatuan));
      const realisasi = Math.max(0, Number(row['Realisasi'] || 0));

      if (!progKode || progKode === '-') return;

      if (!programMap[progKode]) {
        programMap[progKode] = {
          id: `p-${progKode}-${Math.random().toString(36).substr(2, 5)}`,
          kode: progKode,
          nama: progNama,
          pagu: 0,
          kegiatan: []
        };
      }

      if (kegKode && kegKode !== '-') {
        let keg = programMap[progKode].kegiatan.find(k => k.kode === kegKode);
        if (!keg) {
          keg = {
            id: `k-${kegKode}-${Math.random().toString(36).substr(2, 5)}`,
            kode: kegKode,
            nama: kegNama,
            pagu: 0,
            subKegiatan: []
          };
          programMap[progKode].kegiatan.push(keg);
        }

        if (subKode && subKode !== '-') {
          let sub = keg.subKegiatan.find(sk => sk.kode === subKode);
          if (!sub) {
            sub = {
              id: `sk-${subKode}-${Math.random().toString(36).substr(2, 5)}`,
              kode: subKode,
              nama: subNama,
              pagu: 0,
              belanja: []
            };
            keg.subKegiatan.push(sub);
          }

          if (akunKode && akunKode !== '-') {
            sub.belanja.push({
              id: `b-${akunKode}-${Math.random().toString(36).substr(2, 5)}`,
              kode: akunKode,
              uraian: uraian,
              volume: volume,
              satuan: satuan,
              hargaSatuan: hargaSatuan,
              pagu: pagu,
              realisasi: realisasi
            });
          }
        }
      }
    });

    const newPrograms = Object.values(programMap);
    await saveProgramsToFirestore(recalculateTotals(newPrograms));
    alert('Import DPA Anggaran berhasil!');
  };

  const toggle = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const recalculateTotals = (data: Program[]) => {
    return data.map(p => {
      const activities = p.kegiatan.map(k => {
        const subActivities = k.subKegiatan.map(sk => {
          const totalBelanjaPagu = sk.belanja.reduce((sum, b) => sum + b.pagu, 0);
          const totalBelanjaRealisasi = sk.belanja.reduce((sum, b) => sum + (b.realisasi || 0), 0);
          return { ...sk, pagu: totalBelanjaPagu, realisasi: totalBelanjaRealisasi };
        });
        const totalKegPagu = subActivities.reduce((sum, sk) => sum + sk.pagu, 0);
        const totalKegRealisasi = subActivities.reduce((sum, sk) => sum + (sk.realisasi || 0), 0);
        return { ...k, subKegiatan: subActivities, pagu: totalKegPagu, realisasi: totalKegRealisasi };
      });
      const totalProgPagu = activities.reduce((sum, k) => sum + k.pagu, 0);
      const totalProgRealisasi = activities.reduce((sum, k) => sum + (k.realisasi || 0), 0);
      return { ...p, kegiatan: activities, pagu: totalProgPagu, realisasi: totalProgRealisasi };
    });
  };

  const handleAddProg = async () => {
    let updated;
    if (editMode?.type === 'prog') {
      updated = programs.map(p => p.id === editMode.id ? { ...p, ...newProg } : p);
    } else {
      const nextId = `p-${Math.random().toString(36).substr(2, 9)}`;
      updated = [
        ...programs,
        { id: nextId, ...newProg, pagu: 0, kegiatan: [] }
      ];
    }
    await saveProgramsToFirestore(recalculateTotals(updated));
    setShowAddProg(false);
    setNewProg({ kode: '', nama: '' });
    setEditMode(null);
  };

  const handleAddKeg = async () => {
    if (!showAddKeg) return;
    let updated;
    if (editMode?.type === 'keg') {
      updated = programs.map(p => {
        if (p.id === showAddKeg.progId) {
          return {
            ...p,
            kegiatan: p.kegiatan.map(k => k.id === editMode.id ? { ...k, ...newKeg } : k)
          };
        }
        return p;
      });
    } else {
      updated = programs.map(p => {
        if (p.id === showAddKeg.progId) {
          return {
            ...p,
            kegiatan: [
              ...p.kegiatan,
              { id: Math.random().toString(36).substr(2, 9), ...newKeg, pagu: 0, subKegiatan: [] }
            ]
          };
        }
        return p;
      });
    }
    await saveProgramsToFirestore(recalculateTotals(updated));
    setShowAddKeg(null);
    setNewKeg({ kode: '', nama: '', assignedTo: '' });
    setEditMode(null);
  };

  const handleAddSub = async () => {
    if (!showAddSub) return;
    let updated;
    if (editMode?.type === 'sub') {
      updated = programs.map(p => {
        if (p.id === showAddSub.progId) {
          return {
            ...p,
            kegiatan: p.kegiatan.map(k => {
              if (k.id === showAddSub.kegId) {
                return {
                  ...k,
                  subKegiatan: k.subKegiatan.map(sk => sk.id === editMode.id ? { ...sk, ...newSub } : sk)
                };
              }
              return k;
            })
          };
        }
        return p;
      });
    } else {
      updated = programs.map(p => {
        if (p.id === showAddSub.progId) {
          return {
            ...p,
            kegiatan: p.kegiatan.map(k => {
              if (k.id === showAddSub.kegId) {
                return {
                  ...k,
                  subKegiatan: [
                    ...k.subKegiatan,
                    { id: Math.random().toString(36).substr(2, 9), ...newSub, belanja: [] }
                  ]
                };
              }
              return k;
            })
          };
        }
        return p;
      });
    }
    await saveProgramsToFirestore(recalculateTotals(updated));
    setShowAddSub(null);
    setNewSub({ kode: '', nama: '', pagu: 0, realisasi: 0, assignedTo: '' });
    setEditMode(null);
  };

  const handleAddBelanja = async () => {
    if (!showAddBelanja) return;
    let updated;
    const finalPagu = newBelanja.volume * newBelanja.hargaSatuan;

    if (editMode?.type === 'belanja') {
      updated = programs.map(p => {
        if (p.id === showAddBelanja.progId) {
          return {
            ...p,
            kegiatan: p.kegiatan.map(k => {
              if (k.id === showAddBelanja.kegId) {
                return {
                  ...k,
                  subKegiatan: k.subKegiatan.map(sk => {
                    if (sk.id === showAddBelanja.subId) {
                      return {
                        ...sk,
                        belanja: sk.belanja.map(b => b.id === editMode.id ? { ...b, ...newBelanja, pagu: finalPagu } : b)
                      };
                    }
                    return sk;
                  })
                };
              }
              return k;
            })
          };
        }
        return p;
      });
    } else {
      updated = programs.map(p => {
        if (p.id === showAddBelanja.progId) {
          return {
            ...p,
            kegiatan: p.kegiatan.map(k => {
              if (k.id === showAddBelanja.kegId) {
                return {
                  ...k,
                  subKegiatan: k.subKegiatan.map(sk => {
                    if (sk.id === showAddBelanja.subId) {
                      return {
                        ...sk,
                        belanja: [
                          ...sk.belanja,
                          { 
                            id: Math.random().toString(36).substr(2, 9), 
                            ...newBelanja, 
                            pagu: finalPagu
                          }
                        ]
                      };
                    }
                    return sk;
                  })
                };
              }
              return k;
            })
          };
        }
        return p;
      });
    }
    await saveProgramsToFirestore(recalculateTotals(updated));
    setShowAddBelanja(null);
    setNewBelanja({ kode: '', uraian: '', volume: 1, satuan: '', hargaSatuan: 0, pagu: 0, realisasi: 0 });
    setEditMode(null);
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8">
      {/* Modals */}
      <AnimatePresence>
        {(showAddProg || showAddKeg || showAddSub || showAddBelanja) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card p-8 w-full max-w-md space-y-6"
            >
              <h3 className="text-xl font-black text-slate-900">
                {editMode ? (
                  editMode.type === 'prog' ? 'Edit Program' : 
                  editMode.type === 'keg' ? 'Edit Kegiatan' : 
                  editMode.type === 'sub' ? 'Edit Sub Kegiatan' : 'Edit Belanja'
                ) : (
                  showAddProg ? 'Tambah Program Baru' : 
                  showAddKeg ? 'Tambah Kegiatan Baru' : 
                  showAddSub ? 'Tambah Sub Kegiatan' : 'Tambah Belanja Baru'
                )}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kode Nomenklatur</label>
                  <input 
                    type="text" 
                    value={showAddProg ? newProg.kode : showAddKeg ? newKeg.kode : showAddSub ? newSub.kode : newBelanja.kode}
                    onChange={(e) => {
                      if (showAddProg) setNewProg({...newProg, kode: e.target.value});
                      else if (showAddKeg) setNewKeg({...newKeg, kode: e.target.value});
                      else if (showAddSub) setNewSub({...newSub, kode: e.target.value});
                      else setNewBelanja({...newBelanja, kode: e.target.value});
                    }}
                    placeholder={showAddProg ? "Contoh: 1.02" : showAddKeg ? "Contoh: 1.02.01.1.01" : "Contoh: 5.1.02..."}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama / Uraian</label>
                  <input 
                    type="text" 
                    value={showAddProg ? newProg.nama : showAddKeg ? newKeg.nama : showAddSub ? newSub.nama : newBelanja.uraian}
                    onChange={(e) => {
                      if (showAddProg) setNewProg({...newProg, nama: e.target.value});
                      else if (showAddKeg) setNewKeg({...newKeg, nama: e.target.value});
                      else if (showAddSub) setNewSub({...newSub, nama: e.target.value});
                      else setNewBelanja({...newBelanja, uraian: e.target.value});
                    }}
                    placeholder="Masukkan deskripsi lengkap"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                  />
                </div>

                {(showAddKeg || showAddSub) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">Tugaskan Ke (Wilayah/Departemen)</label>
                    <input 
                      type="text" 
                      value={showAddKeg ? newKeg.assignedTo : newSub.assignedTo}
                      onChange={(e) => {
                        if (showAddKeg) setNewKeg({...newKeg, assignedTo: e.target.value});
                        else if (showAddSub) setNewSub({...newSub, assignedTo: e.target.value});
                      }}
                      placeholder="Contoh: Sekretariat DPRD, Wilayah 01..."
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-emerald-700"
                    />
                    <p className="text-[9px] text-emerald-600/60 mt-1 italic">Hanya Admin dari departemen ini yang dapat mengelola data ini.</p>
                  </motion.div>
                )}

                {showAddBelanja && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Volume</label>
                        <input 
                          type="number" 
                          min="0"
                          value={newBelanja.volume || ''}
                          onChange={(e) => setNewBelanja({...newBelanja, volume: Math.max(0, Number(e.target.value))})}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Satuan</label>
                        <input 
                          type="text" 
                          value={newBelanja.satuan}
                          onChange={(e) => setNewBelanja({...newBelanja, satuan: e.target.value})}
                          placeholder="Contoh: Orang/Hari, Rim, Pkt"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Harga Satuan (IDR)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={newBelanja.hargaSatuan || ''}
                        onChange={(e) => setNewBelanja({...newBelanja, hargaSatuan: Math.max(0, Number(e.target.value))})}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold text-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Realisasi (IDR)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={newBelanja.realisasi || ''}
                        onChange={(e) => setNewBelanja({...newBelanja, realisasi: Math.max(0, Number(e.target.value))})}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold text-emerald-600"
                      />
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl flex justify-between items-center border border-primary/10">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Total Pagu Estimasi</span>
                      <span className="text-lg font-black text-primary">{formatCurrency(newBelanja.volume * newBelanja.hargaSatuan)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => { setShowAddProg(false); setShowAddKeg(null); setShowAddSub(null); setShowAddBelanja(null); setEditMode(null); }}
                  className="flex-grow py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={showAddProg ? handleAddProg : showAddKeg ? handleAddKeg : showAddSub ? handleAddSub : handleAddBelanja}
                  className="flex-grow py-3 metallic-purple text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                >
                  {editMode ? 'Perbarui Data' : 'Simpan Data'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-primary-metallic/10 rounded-2xl text-primary-metallic">
              <FolderTree size={32} />
            </div>
            Database <span className="text-gradient-purple">Anggaran</span>
          </h1>
          <p className="text-slate-500 font-medium">Struktur hierarki anggaran berdasarkan nomenklatur SIPD terbaru.</p>
        </div>
        <div className="flex gap-3">
          <label className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-emerald-600 cursor-pointer print-hidden">
            <Upload size={16} /> Import Excel
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws);
                    handleImportExcel(data);
                  };
                  reader.readAsBinaryString(file);
                }
              }}
            />
          </label>
          <button 
            onClick={handleExportExcel}
            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-indigo-600 print-hidden"
          >
            <FileSpreadsheet size={16} /> Export Template
          </button>
          <button 
            onClick={() => window.print()}
            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-slate-600 print-hidden"
          >
            <Printer size={16} /> Cetak Struktur
          </button>
          <button 
            onClick={() => setShowAddProg(true)}
            className="px-6 py-3 metallic-purple text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
          >
            <Plus size={16} /> Tambah Program
          </button>
        </div>
      </header>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari kode atau uraian program/kegiatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-semibold"
          />
        </div>
      </div>

      <div className="space-y-6">
        {programs.map((prog) => (
          <motion.div 
            key={prog.id} 
            variants={itemAnim}
            initial="hidden"
            animate="show"
            className="glass-card overflow-hidden"
          >
            {/* Program Header */}
            <div 
              onClick={() => toggle(prog.id)}
              className="p-6 bg-primary metallic-purple text-white cursor-pointer flex items-center gap-6 group relative"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
              <div className="bg-white/10 p-2.5 rounded-xl group-hover:bg-white/20 transition-colors z-10">
                {expanded[prog.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
              <div className="flex-grow z-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-1 rounded-lg tracking-widest leading-none">PROGRAM</span>
                  <span className="text-sm font-black opacity-60 tracking-wider">{prog.kode}</span>
                </div>
                <h3 className="text-xl font-black leading-tight tracking-tight">{prog.nama}</h3>
              </div>
                <div className="text-right z-10 flex items-center gap-4">
                  <div className="flex border-r border-white/20 pr-4 mr-2">
                    <div className="text-right mr-6">
                      <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Realisasi</p>
                      <p className="text-lg font-black text-white/90">{formatCurrency(prog.realisasi || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Total Pagu</p>
                      <p className="text-2xl font-black">{formatCurrency(prog.pagu)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEditProg(prog); }}
                      className="p-2 bg-amber-500/20 hover:bg-amber-500 rounded-xl transition-all border border-white/10 text-amber-200 hover:text-white"
                      title="Edit Program"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteProg(prog.id); }}
                      className="p-2 bg-rose-500/20 hover:bg-rose-500 rounded-xl transition-all border border-white/10 text-rose-200 hover:text-white"
                      title="Hapus Program"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowAddKeg({progId: prog.id}); }}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all border border-white/10 flex items-center gap-2 ml-2"
                      title="Tambah Kegiatan"
                    >
                      <Plus size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Input Kegiatan</span>
                    </button>
                  </div>
                </div>
            </div>

            <AnimatePresence>
              {expanded[prog.id] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="divide-y divide-slate-100"
                >
                  {prog.kegiatan.length > 0 ? (
                    prog.kegiatan.map((keg) => (
                      <div key={keg.id} className="bg-slate-50/20">
                        {/* Kegiatan Header */}
                        <div 
                          onClick={() => toggle(keg.id)}
                          className="p-5 pl-14 flex items-center gap-6 cursor-pointer hover:bg-slate-100/50 transition-all border-b border-slate-100 group"
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg transition-colors group-hover:bg-primary/5",
                            expanded[keg.id] ? "text-primary" : "text-slate-400"
                          )}>
                            {expanded[keg.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-[9px] font-black text-primary px-2 py-1 bg-primary/10 rounded-lg uppercase leading-none tracking-widest">KEGIATAN</span>
                              <span className="text-xs font-bold text-slate-400 tracking-wider">{keg.kode}</span>
                              {keg.assignedTo && (
                                <span className="text-[9px] font-black text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg uppercase leading-none border border-emerald-100">Assigned: {keg.assignedTo}</span>
                              )}
                            </div>
                            <h4 className="text-md font-black text-slate-800 tracking-tight">{keg.nama}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-6 mr-4 border-r border-slate-100 pr-6">
                              <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Realisasi</p>
                                <p className="text-xs font-black text-slate-500">{formatCurrency(keg.realisasi || 0)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pagu</p>
                                <p className="text-sm font-black text-slate-900">{formatCurrency(keg.pagu)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEditKeg(prog.id, keg); }}
                                className="p-2 text-amber-500 hover:text-white bg-amber-50 hover:bg-amber-500 rounded-lg transition-all shadow-sm"
                                title="Edit Kegiatan"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteKeg(prog.id, keg.id); }}
                                className="p-2 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-lg transition-all shadow-sm"
                                title="Hapus Kegiatan"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setShowAddSub({kegId: keg.id, progId: prog.id}); }}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 ml-2"
                                title="Tambah Sub Kegiatan"
                              >
                                <Plus size={14} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Input Sub</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Sub Kegiatan List */}
                        <AnimatePresence>
                          {expanded[keg.id] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="pl-24 pr-6 py-6 space-y-6"
                            >
                              {keg.subKegiatan.length > 0 ? (
                                keg.subKegiatan.map((sub) => (
                                  <div key={sub.id} className="glass-card shadow-sm overflow-hidden mb-6 last:mb-0 border-slate-100">
                                    <div className="p-5 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
                                      <div>
                                        <div className="flex items-center gap-3 mb-2">
                                          <span className="text-[8px] font-black bg-slate-900 text-white px-2 py-1 rounded-lg uppercase tracking-widest">SUB KEGIATAN</span>
                                          <span className="text-[10px] font-bold text-slate-400 tracking-wider">{sub.kode}</span>
                                          {sub.assignedTo && (
                                            <span className="text-[8px] font-black text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg uppercase leading-none border border-emerald-100">Pic: {sub.assignedTo}</span>
                                          )}
                                        </div>
                                        <h5 className="text-sm font-black text-slate-900 tracking-tight">{sub.nama}</h5>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagu Sub</p>
                                          <p className="text-lg font-black text-primary">{formatCurrency(sub.pagu)}</p>
                                        </div>
                                         <div className="flex items-center gap-1.5 ml-4">
                                          <button 
                                            onClick={() => handleEditSub(prog.id, keg.id, sub)}
                                            className="p-2 text-amber-500 hover:text-white bg-amber-50 hover:bg-amber-500 rounded-lg transition-all border border-amber-100 shadow-sm"
                                            title="Edit Sub Kegiatan"
                                          >
                                            <Edit3 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteSub(prog.id, keg.id, sub.id)}
                                            className="p-2 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-lg transition-all border border-rose-100 shadow-sm"
                                            title="Hapus Sub Kegiatan"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => setShowAddBelanja({subId: sub.id, kegId: keg.id, progId: prog.id})}
                                            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-md flex items-center gap-2 ml-2"
                                            title="Tambah Belanja"
                                          >
                                            <Plus size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Tambah Belanja</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Belanja Table */}
                                    {sub.belanja.length > 0 ? (
                                      <div className="p-0 overflow-x-auto">
                                        <table className="w-full text-xs text-left">
                                          <thead>
                                            <tr className="bg-white text-[9px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                                              <th className="px-6 py-4">Kode Akun</th>
                                              <th className="px-6 py-4">Uraian Belanja</th>
                                              <th className="px-6 py-4 text-center">Volume</th>
                                              <th className="px-6 py-4 text-center">Satuan</th>
                                              <th className="px-6 py-4 text-right">Harga Satuan</th>
                                              <th className="px-6 py-4 text-right">Total Pagu</th>
                                              <th className="px-6 py-4 text-right">Realisasi</th>
                                              <th className="px-6 py-4 text-center">Progress</th>
                                              <th className="px-6 py-4 text-center">Aksi</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {sub.belanja.map((bel) => (
                                              <tr key={bel.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold text-primary">{bel.kode}</td>
                                                <td className="px-6 py-4 font-bold text-slate-700">{bel.uraian}</td>
                                                <td className="px-6 py-4 text-center font-black text-slate-600">{bel.volume || '-'}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-400 uppercase tracking-tighter">{bel.satuan || '-'}</td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-500">{bel.hargaSatuan ? formatCurrency(bel.hargaSatuan) : '-'}</td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(bel.pagu)}</td>
                                                <td className="px-6 py-4 text-right font-black text-slate-400">{formatCurrency(bel.realisasi)}</td>
                                                <td className="px-6 py-4">
                                                  <div className="flex items-center gap-3 w-32">
                                                    <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                                                      <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min((bel.realisasi/bel.pagu)*100, 100)}%` }}
                                                        className={cn(
                                                          "h-full rounded-full",
                                                          bel.realisasi > bel.pagu ? "bg-red-500" : "bg-primary-metallic"
                                                        )}
                                                      />
                                                    </div>
                                                    <span className={cn(
                                                      "font-black text-[10px] w-8",
                                                      bel.realisasi > bel.pagu ? "text-red-500" : "text-slate-500"
                                                    )}>
                                                      {Math.round((bel.pagu > 0 ? (bel.realisasi/bel.pagu)*100 : 0))}%
                                                    </span>
                                                  </div>
                                                  {bel.realisasi > bel.pagu && (
                                                    <motion.p 
                                                      initial={{ opacity: 0, y: 5 }}
                                                      animate={{ opacity: 1, y: 0 }}
                                                      className="text-[9px] text-red-500 font-bold mt-1 animate-pulse"
                                                    >
                                                      ⚠️ MELEBIHI PAGU
                                                    </motion.p>
                                                  )}
                                                </td>
                                                <td className="px-6 py-4">
                                                  <div className="flex items-center justify-center gap-2">
                                                    {packets.some(p => p.belanjaId === bel.id) && (
                                                      <button 
                                                        onClick={() => onNavigate && onNavigate('database_spj')}
                                                        className="p-1.5 text-emerald-500 hover:text-white bg-emerald-50 hover:bg-emerald-500 rounded-lg transition-all shadow-sm"
                                                        title="Lihat SPJ Terkait"
                                                      >
                                                        <FileSpreadsheet size={14} />
                                                      </button>
                                                    )}
                                                    <button 
                                                      onClick={() => handleEditBelanja(prog.id, keg.id, sub.id, bel)}
                                                      className="p-1.5 text-amber-500 hover:text-white bg-amber-50 hover:bg-amber-500 rounded-lg transition-all shadow-sm"
                                                      title="Edit Belanja"
                                                    >
                                                      <Edit3 size={14} />
                                                    </button>
                                                    <button 
                                                      onClick={() => handleDeleteBelanja(prog.id, keg.id, sub.id, bel.id)}
                                                      className="p-1.5 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-lg transition-all shadow-sm"
                                                      title="Hapus Belanja"
                                                    >
                                                      <Trash2 size={14} />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4 bg-slate-50/30">
                                        <CreditCard size={32} className="opacity-10" />
                                        <p className="text-xs font-medium italic">Belum ada rincian belanja untuk sub kegiatan ini</p>
                                        <button 
                                          onClick={() => setShowAddBelanja({subId: sub.id, kegId: keg.id, progId: prog.id})}
                                          className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-primary"
                                        >
                                          <Plus size={16} /> Input Rincian Belanja Baru
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-4 border-2 border-dashed border-slate-100 rounded-2xl">
                                  <Target size={32} className="opacity-10" />
                                  <p className="text-sm font-medium italic">Belum ada rincian sub kegiatan yang tersedia.</p>
                                  <button 
                                    onClick={() => setShowAddSub({kegId: keg.id, progId: prog.id})}
                                    className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-primary"
                                  >
                                    <Plus size={16} /> Input Sub Kegiatan Baru
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4">
                      <Layers size={48} className="opacity-10" />
                      <p className="text-sm font-medium italic">Belum ada data kegiatan untuk program ini</p>
                      <button 
                        onClick={() => setShowAddKeg({progId: prog.id})}
                        className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-primary"
                      >
                        <Plus size={16} /> Input Kegiatan Baru
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <motion.div 
        variants={itemAnim}
        className="glass-card bg-blue-50/50 border-blue-100 p-8 rounded-3xl flex gap-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
      >
        <div className="bg-blue-600 text-white p-4 rounded-2xl h-fit shadow-lg shadow-blue-500/30">
          <Info size={28} />
        </div>
        <div>
          <h4 className="text-blue-900 text-lg font-black tracking-tight mb-2">Informasi Nomenklatur</h4>
          <p className="text-blue-700/80 text-sm leading-relaxed font-semibold">
            Struktur anggaran di atas mengikuti standar Peraturan Menteri Dalam Negeri (Permendagri) Nomor 14 Tahun 2025 tentang Pedoman Penyusunan Anggaran Pendapatan dan Belanja Daerah (APBD) Tahun Anggaran 2026. Pastikan kode akun belanja yang digunakan sesuai dengan RKA/DPA yang telah disahkan untuk menghindari sanksi administratif dan penolakan SPJ oleh auditor.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

