import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Plus, Search, Filter, Download, Layers, CreditCard, Calendar,
  FileText, Receipt, FileSignature, ClipboardCheck, FileCheck,
  Truck, CheckCircle2, ShieldCheck, Clock, AlertCircle, X, ChevronRight,
  MoreVertical, Edit3, Printer, Trash2, QrCode, UserCheck, PlayCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DocumentType, Packet, ShoppingItem, Program, Vendor, Employee } from '../types';
import { formatCurrency, formatDate, cn, terbilang, formatNPWP } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import LaporanRealisasi from './LaporanRealisasi';
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, updateDoc, getDocs } from 'firebase/firestore';

interface DatabaseSPJProps {
  agencyInfo: {
    name: string;
    address: string;
    logo: string;
    defaultPaNama?: string;
    defaultPaNip?: string;
    defaultPaJabatan?: string;
    defaultPaPangkat?: string;
    defaultBendaharaNama?: string;
    defaultBendaharaNip?: string;
    defaultBendaharaJabatan?: string;
    defaultBendaharaPangkat?: string;
  };
  setAgencyInfo: React.Dispatch<React.SetStateAction<any>>;
}

export default function DatabaseSPJ({ agencyInfo }: DatabaseSPJProps) {
  const [spjList, setSpjList] = useState<Packet[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [filterPenyedia, setFilterPenyedia] = useState<string>('');
  const [filterTanggal, setFilterTanggal] = useState<string>('');
  const [kategoriOptions, setKategoriOptions] = useState<string[]>(['Barang', 'Jasa Konsultansi', 'Konstruksi', 'Jasa Lainnya']);
  const [newKategori, setNewKategori] = useState('');
  const [showAddKategori, setShowAddKategori] = useState(false);
  const [sortField, setSortField] = useState<keyof Packet>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Packet) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    // Sync Kategori Options from existing data and vendors
    const packetKats = spjList.map(p => p.kategori).filter(Boolean);
    const vendorKats = vendors.map(v => v.kategori).filter(Boolean);
    const uniqueKats = Array.from(new Set([
      'Barang', 
      'Jasa Konsultansi', 
      'Konstruksi', 
      'Jasa Lainnya', 
      ...packetKats, 
      ...vendorKats
    ]));
    setKategoriOptions(uniqueKats);
  }, [spjList, vendors]);

  useEffect(() => {
    // Fetch Packets
    const qPackets = query(collection(db, 'packets'), orderBy('no', 'asc'));
    const unsubscribePackets = onSnapshot(qPackets, (snapshot) => {
      const data: Packet[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Packet);
      });
      setSpjList(data);
      setLoading(false);
    });

    // Fetch Programs for linking
    const qProgs = query(collection(db, 'programs'), orderBy('kode', 'asc'));
    const unsubscribeProgs = onSnapshot(qProgs, (snapshot) => {
      const data: Program[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Program);
      });
      setPrograms(data);
    });

    // Fetch Vendors
    const qVendors = query(collection(db, 'vendors'), orderBy('namaPenyedia', 'asc'));
    const unsubscribeVendors = onSnapshot(qVendors, (snapshot) => {
      const data: Vendor[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Vendor);
      });
      setVendors(data);
    });

    // Fetch Employees
    const qEmployees = query(collection(db, 'employees'), orderBy('nama', 'asc'));
    const unsubscribeEmployees = onSnapshot(qEmployees, (snapshot) => {
      const data: Employee[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(data);
    });

    return () => {
      unsubscribePackets();
      unsubscribeProgs();
      unsubscribeVendors();
      unsubscribeEmployees();
    };
  }, []);

  const [showInput, setShowInput] = useState(false);
  const [showBudgetSelector, setShowBudgetSelector] = useState(false);
  const [budgetSearchTerm, setBudgetSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSpj, setSelectedSpj] = useState<Packet | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentType>(null);
  const [formData, setFormData] = useState<Partial<Packet>>({
    namaPaket: '',
    kategori: 'Barang',
    penyedia: '',
    npwpPenyedia: '',
    bankPenyedia: '',
    rekeningPenyedia: '',
    teleponPenyedia: '',
    emailPenyedia: '',
    paguAnggaran: 0,
    nilaiKontrak: 0,
    tanggalMulai: '',
    tanggalSelesai: '',
    pic: '',
    nipPic: '',
    jabatanPic: 'Pejabat Pelaksana Teknis Kegiatan',
    pangkatPic: '',
    // Data Pejabat Lengkap
    paNama: '',
    paNip: '',
    paJabatan: 'Pengguna Anggaran',
    paPangkat: '',
    pptkNama: '',
    pptkNip: '',
    pptkJabatan: 'Pejabat Pelaksana Teknis Kegiatan',
    pptkPangkat: '',
    bendaharaNama: '',
    bendaharaNip: '',
    bendaharaJabatan: 'Bendahara Pengeluaran',
    bendaharaPangkat: '',
    // Data Penyedia Lengkap
    pimpinanPenyedia: '',
    alamatPenyedia: '',
    metodePengadaan: 'Pengadaan Langsung',
    regulasiAcuan: 'PerLKPP No. 2 Tahun 2025',
    nomorBerkas: '',
    nomorKontrak: '',
    nomorSPPBJ: '',
    nomorSPMK: '',
    tanggalSPPBJ: '',
    tanggalSPMK: '',
    statusPPN: 'Diluar PPN',
    statusPPh: 'Diluar PPh',
    jenisPPh: '23',
    usePPN: false,
    usePPh21: false,
    usePPh22: false,
    usePPh23: false,
    usePPh42: false,
    nilaiPPN: 0,
    nilaiPPh: 0,
    nilaiPPh21: 0,
    nilaiPPh22: 0,
    nilaiPPh23: 0,
    nilaiPPh42: 0,
    tenagaAhli: '',
    ruangLingkup: '',
    lokasiPekerjaan: '',
    merkType: '',
    statusDokumen: 'Draft',
    rekapBelanja: []
  });

  const calculateTaxes = (
    kontrak: number, 
    sPPN: string, 
    uPPN: boolean, 
    sPPh: string, 
    jPPh: string,
    uPPh21: boolean,
    uPPh22: boolean,
    uPPh23: boolean,
    uPPh42: boolean
  ) => {
    let ppn = 0;
    let pph21 = 0;
    let pph22 = 0;
    let pph23 = 0;
    let pph42 = 0;

    // DPP Calculation
    const dpp = sPPN === 'Termasuk PPN' ? kontrak / 1.11 : kontrak;

    if (uPPN || sPPN === 'Termasuk PPN') {
      ppn = dpp * 0.11;
    }

    // PPh Calculation
    if (sPPh === 'Termasuk PPh' || sPPh === 'Diluar PPh') {
      const activeType = jPPh;
      const rate = activeType === '21' ? 0.05 : 
                   activeType === '22' ? 0.015 :
                   activeType === '23' ? 0.02 :
                   activeType === '4(2)' ? 0.03 : 0;
      
      const calculatedVal = dpp * rate;

      if (activeType === '21') pph21 = calculatedVal;
      if (activeType === '22') pph22 = calculatedVal;
      if (activeType === '23') pph23 = calculatedVal;
      if (activeType === '4(2)') pph42 = calculatedVal;
    }

    return { 
      ppn: Math.round(ppn),
      pph21: Math.round(pph21),
      pph22: Math.round(pph22), 
      pph23: Math.round(pph23), 
      pph42: Math.round(pph42) 
    };
  };

  useEffect(() => {
    if (formData.rekapBelanja && formData.rekapBelanja.length > 0) {
      const total = formData.rekapBelanja.reduce((sum, item) => sum + (item.volume * item.hargaSatuan), 0);
      if (formData.nilaiKontrak !== total) {
        setFormData(prev => ({ ...prev, nilaiKontrak: total }));
      }
    }
  }, [formData.rekapBelanja]);

  useEffect(() => {
    if (formData.nilaiKontrak !== undefined) {
      const { ppn, pph21, pph22, pph23, pph42 } = calculateTaxes(
        formData.nilaiKontrak, 
        formData.statusPPN || 'Diluar PPN',
        formData.usePPN || false,
        formData.statusPPh || 'Tanpa PPh',
        formData.jenisPPh || '23',
        formData.usePPh21 || false,
        formData.usePPh22 || false,
        formData.usePPh23 || false,
        formData.usePPh42 || false
      );
      
      const totalPPh = pph21 + pph22 + pph23 + pph42;

      // Only set if different to avoid infinite loop
      if (
        formData.nilaiPPN !== ppn || 
        formData.nilaiPPh21 !== pph21 || 
        formData.nilaiPPh22 !== pph22 || 
        formData.nilaiPPh23 !== pph23 || 
        formData.nilaiPPh42 !== pph42 ||
        formData.nilaiPPh !== totalPPh
      ) {
        setFormData(prev => ({ 
          ...prev, 
          nilaiPPN: ppn, 
          nilaiPPh21: pph21,
          nilaiPPh22: pph22,
          nilaiPPh23: pph23,
          nilaiPPh42: pph42,
          nilaiPPh: totalPPh
        }));
      }
    }
  }, [
    formData.nilaiKontrak, 
    formData.statusPPN, 
    formData.usePPN, 
    formData.statusPPh, 
    formData.jenisPPh,
    formData.usePPh21,
    formData.usePPh22,
    formData.usePPh23,
    formData.usePPh42
  ]);

  const addShoppingItem = () => {
    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substr(2, 9),
      uraian: '',
      volume: 1,
      satuan: 'Pcs',
      hargaSatuan: 0
    };
    const updatedRekap = [...(formData.rekapBelanja || []), newItem];
    setFormData({ ...formData, rekapBelanja: updatedRekap });
  };

  const removeShoppingItem = (id: string) => {
    const updatedRekap = (formData.rekapBelanja || []).filter(item => item.id !== id);
    setFormData({ ...formData, rekapBelanja: updatedRekap });
  };

  const updateShoppingItem = (id: string, field: keyof ShoppingItem, value: any) => {
    const updatedRekap = (formData.rekapBelanja || []).map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    
    // Auto calculate nilaiKontrak if there are items
    const newTotal = updatedRekap.reduce((sum, item) => sum + (item.volume * item.hargaSatuan), 0);
    
    setFormData({ 
      ...formData, 
      rekapBelanja: updatedRekap,
      nilaiKontrak: updatedRekap.length > 0 ? newTotal : formData.nilaiKontrak
    });
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(spjList);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database SPJ Barjas");
    XLSX.writeFile(wb, "Database_SPJ_Barjas_Export.xlsx");
  };

  const handleEdit = (spj: Packet) => {
    setFormData({
      statusPPN: spj.statusPPN || 'Diluar PPN',
      statusPPh: spj.statusPPh || 'Diluar PPh',
      jenisPPh: spj.jenisPPh || '23',
      usePPN: spj.usePPN ?? (spj.statusPPN === 'Termasuk PPN'),
      usePPh21: spj.usePPh21 ?? (spj.nilaiPPh21 ? spj.nilaiPPh21 > 0 : false),
      usePPh22: spj.usePPh22 ?? (spj.nilaiPPh22 ? spj.nilaiPPh22 > 0 : false),
      usePPh23: spj.usePPh23 ?? (spj.nilaiPPh23 ? spj.nilaiPPh23 > 0 : false),
      usePPh42: spj.usePPh42 ?? (spj.nilaiPPh42 ? spj.nilaiPPh42 > 0 : false),
      tenagaAhli: spj.tenagaAhli || '',
      ruangLingkup: spj.ruangLingkup || '',
      lokasiPekerjaan: spj.lokasiPekerjaan || '',
      merkType: spj.merkType || '',
      ...spj
    });
    setIsEditMode(true);
    setShowInput(true);
  };

  const handleKontrakChange = (val: number) => {
    const { ppn, pph21, pph22, pph23, pph42 } = calculateTaxes(
      val, 
      formData.statusPPN || 'Diluar PPN',
      formData.usePPN || false,
      formData.statusPPh || 'Tanpa PPh',
      formData.jenisPPh || '23',
      formData.usePPh21 || false,
      formData.usePPh22 || false,
      formData.usePPh23 || false,
      formData.usePPh42 || false
    );
    const totalPPh = pph21 + pph22 + pph23 + pph42;
    setFormData({
      ...formData, 
      nilaiKontrak: val, 
      nilaiPPN: ppn, 
      nilaiPPh21: pph21,
      nilaiPPh22: pph22,
      nilaiPPh23: pph23,
      nilaiPPh42: pph42,
      nilaiPPh: totalPPh,
      usePPN: formData.statusPPN === 'Termasuk PPN' || formData.usePPN
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data SPJ ini?')) {
      try {
        const spj = spjList.find(p => p.id === id);
        await deleteDoc(doc(db, 'packets', id));
        if (spj?.belanjaId && spj?.progId) {
          await handleBudgetSync(spj.progId);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `packets/${id}`);
      }
    }
  };

  const generateDocNumbers = () => {
    if (!formData.nomorBerkas) return alert('Silakan isi Nomor Berkas terlebih dahulu sebagai acuan.');
    
    // Pattern example: 001/PPTK/SETWAN/2026 -> 001/PA-Konst/SPPBJ/XI/2026
    const segments = formData.nomorBerkas.split('/');
    const seq = segments[0] || '001';
    
    // Detect year from nomor berkas or use current
    let year = segments.length > 1 ? segments[segments.length - 1] : new Date().getFullYear().toString();
    if (isNaN(Number(year))) year = new Date().getFullYear().toString();

    // Map month to Roman numerals for Indonesian standard
    const monthIndex = new Date().getMonth();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const currentRomanMonth = romanMonths[monthIndex];
    
    const newSppbj = `${seq}/PA-Konst/SPPBJ/${currentRomanMonth}/${year}`;
    const newSpmk = `${seq}/PA-Konst/SPMK/${currentRomanMonth}/${year}`;
    
    setFormData(prev => ({
      ...prev,
      nomorSPPBJ: prev.nomorSPPBJ || newSppbj,
      nomorSPMK: prev.nomorSPMK || newSpmk
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.namaPaket) return alert('Nama Paket wajib diisi');
    if (!formData.penyedia) return alert('Penyedia wajib diisi');
    if (formData.nilaiKontrak && formData.nilaiKontrak < 0) return alert('Nilai Kontrak tidak boleh negatif');
    if (formData.tanggalMulai && formData.tanggalSelesai && new Date(formData.tanggalSelesai) < new Date(formData.tanggalMulai)) {
      return alert('Tanggal Selesai tidak boleh mendahului Tanggal Mulai');
    }

    try {
      const id = isEditMode && formData.id ? formData.id : Math.random().toString(36).substr(2, 9);
      const prevPacket = isEditMode ? spjList.find(p => p.id === id) : null;
      
      // Calculate NEXT sequence number correctly
      let nextNo = 1;
      if (!isEditMode) {
        if (spjList.length > 0) {
          nextNo = Math.max(...spjList.map(p => p.no || 0)) + 1;
        }
      } else {
        nextNo = formData.no || (spjList.length + 1);
      }

      const packetData: Packet = {
        ...formData,
        id,
        no: nextNo,
        progressFisik: isEditMode ? (formData.progressFisik ?? 0) : 0,
        statusDokumen: formData.statusDokumen || 'Draft',
        updatedAt: new Date().toISOString(),
        namaPaket: formData.namaPaket || '',
        penyedia: formData.penyedia || '',
        paguAnggaran: formData.paguAnggaran || 0,
        nilaiKontrak: formData.nilaiKontrak || 0,
        tanggalMulai: formData.tanggalMulai || '',
        tanggalSelesai: formData.tanggalSelesai || '',
        pic: formData.pic || '',
        // Ensure all vendor data is explicitly present
        pimpinanPenyedia: formData.pimpinanPenyedia || '',
        alamatPenyedia: formData.alamatPenyedia || '',
        npwpPenyedia: formData.npwpPenyedia || '',
        bankPenyedia: formData.bankPenyedia || '',
        rekeningPenyedia: formData.rekeningPenyedia || '',
        teleponPenyedia: formData.teleponPenyedia || '',
        emailPenyedia: formData.emailPenyedia || '',
        kategori: formData.kategori || 'Barang'
      } as Packet;

      if (!isEditMode) {
        packetData.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, 'packets', id), packetData);

      // Link to Budget Database - Sync Realisasi
      if (packetData.belanjaId && packetData.progId) {
        await handleBudgetSync(packetData.progId);
      }
      
      // If the belanja link was changed, we might need to sync the old one too
      if (prevPacket && prevPacket.belanjaId && prevPacket.progId && prevPacket.belanjaId !== packetData.belanjaId) {
        await handleBudgetSync(prevPacket.progId);
      }

      setShowInput(false);
      setIsEditMode(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, isEditMode ? OperationType.UPDATE : OperationType.CREATE, 'packets');
    }
  };

  // Improved sync with getDocs
  const handleBudgetSync = async (programId: string) => {
    const { getDocs } = await import('firebase/firestore');
    const packetsSnap = await getDocs(query(collection(db, 'packets')));
    const allPackets: Packet[] = [];
    packetsSnap.forEach(d => allPackets.push(d.data() as Packet));

    const progDoc = await getDoc(doc(db, 'programs', programId));
    if (!progDoc.exists()) return;
    const program = progDoc.data() as Program;

    const updatedProgram = {
      ...program,
      kegiatan: program.kegiatan.map(keg => ({
        ...keg,
        subKegiatan: keg.subKegiatan.map(sub => ({
          ...sub,
          belanja: sub.belanja.map(bel => {
            const linkedPackets = allPackets.filter(p => p.belanjaId === bel.id);
            const realisasi = linkedPackets.reduce((sum, p) => sum + p.nilaiKontrak, 0);
            return { ...bel, realisasi };
          })
        }))
      }))
    };

    // Recalculate totals
    const finalProg = recalculateProgramTotals(updatedProgram);
    await updateDoc(doc(db, 'programs', programId), finalProg as any);
  };

  const recalculateProgramTotals = (p: Program) => {
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
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      namaPaket: '',
      kategori: 'Barang',
      penyedia: '',
      npwpPenyedia: '',
      bankPenyedia: '',
      rekeningPenyedia: '',
      teleponPenyedia: '',
      emailPenyedia: '',
      paguAnggaran: 0,
      nilaiKontrak: 0,
      tanggalMulai: today,
      tanggalSelesai: today,
      pic: '',
      nipPic: '',
      jabatanPic: 'Pejabat Pelaksana Teknis Kegiatan',
      pangkatPic: '',
      // Data Pejabat Lengkap - Auto populate from defaults
      paNama: agencyInfo.defaultPaNama || '',
      paNip: agencyInfo.defaultPaNip || '',
      paJabatan: agencyInfo.defaultPaJabatan || 'Pengguna Anggaran',
      paPangkat: agencyInfo.defaultPaPangkat || '',
      pptkNama: '',
      pptkNip: '',
      pptkJabatan: 'Pejabat Pelaksana Teknis Kegiatan',
      pptkPangkat: '',
      bendaharaNama: agencyInfo.defaultBendaharaNama || '',
      bendaharaNip: agencyInfo.defaultBendaharaNip || '',
      bendaharaJabatan: agencyInfo.defaultBendaharaJabatan || 'Bendahara Pengeluaran',
      bendaharaPangkat: agencyInfo.defaultBendaharaPangkat || '',
      // Data Penyedia Lengkap
      pimpinanPenyedia: '',
      alamatPenyedia: '',
      metodePengadaan: 'Pengadaan Langsung',
      regulasiAcuan: 'PerLKPP No. 2 Tahun 2025',
      nomorBerkas: '',
      nomorKontrak: '',
      nomorSPPBJ: '',
      nomorSPMK: '',
      tanggalSPPBJ: today,
      tanggalSPMK: today,
      statusPPN: 'Diluar PPN',
      statusPPh: 'Tanpa PPh',
      jenisPPh: '23',
      usePPN: false,
      usePPh21: false,
      usePPh22: false,
      usePPh23: false,
      usePPh42: false,
      nilaiPPN: 0,
      nilaiPPh: 0,
      nilaiPPh21: 0,
      nilaiPPh22: 0,
      nilaiPPh23: 0,
      nilaiPPh42: 0,
      tenagaAhli: '',
      ruangLingkup: '',
      lokasiPekerjaan: 'Kantor Sekretariat DPRD Prov. Kalteng',
      merkType: '',
      rekapBelanja: [],
      belanjaId: '',
      progId: '',
      kegId: '',
      subId: ''
    });
  };

  const openInputModal = () => {
    resetForm();
    setIsEditMode(false);
    setShowInput(true);
  };

  const filteredSpjList = spjList.filter(spj => {
    const searchString = `${spj.namaPaket} ${spj.penyedia} ${spj.nomorBerkas} ${spj.nomorKontrak}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'Semua' || spj.statusDokumen === filterStatus;
    const matchesKategori = filterKategori === 'Semua' || spj.kategori === filterKategori;
    const matchesPenyedia = !filterPenyedia || (spj.penyedia?.toLowerCase() || '').includes(filterPenyedia.toLowerCase());
    const matchesTanggal = !filterTanggal || (spj.tanggalMulai >= filterTanggal);
    
    return matchesSearch && matchesStatus && matchesKategori && matchesPenyedia && matchesTanggal;
  });

  const sortedSpjList = [...filteredSpjList].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    
    if (valA === undefined || valB === undefined) {
      if (valA === undefined && valB === undefined) return 0;
      return valA === undefined ? 1 : -1;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    return 0;
  });

  const getLinkedDetails = (spj: Packet) => {
    if (!spj.progId || !spj.belanjaId) return null;
    const prog = programs.find(p => p.id === spj.progId);
    if (!prog) return null;
    const keg = prog.kegiatan.find(k => k.id === spj.kegId);
    if (!keg) return null;
    const sub = keg.subKegiatan.find(s => s.id === spj.subId);
    if (!sub) return null;
    const bel = sub.belanja.find(b => b.id === spj.belanjaId);
    return { prog, keg, sub, bel };
  };

  const linked = selectedSpj ? getLinkedDetails(selectedSpj) : null;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
             <div className="p-3 bg-primary-metallic/10 rounded-2xl text-primary-metallic">
              <Database size={32} />
            </div>
            Database <span className="text-gradient-purple">SPJ Barjas</span>
          </h1>
          <p className="text-slate-500 font-medium">Manajemen dokumen pertanggungjawaban dan pengadaan barang/jasa.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-slate-600 print-hidden"
          >
            <Printer size={16} /> Cetak Database
          </button>
          <button onClick={handleExport} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
            <Download size={16} /> Ekspor Excel
          </button>
          <button onClick={openInputModal} className="px-6 py-3 metallic-purple text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2">
            <Plus size={16} /> Input SPJ
          </button>
        </div>
      </header>

      {/* Database View */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/20 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari paket pekerjaan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/10 transition-all text-sm font-semibold"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-10 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="Semua">Status: Semua</option>
                  <option value="Draft">Draft</option>
                  <option value="Proses">Proses</option>
                  <option value="Revisi">Revisi</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Filter Penyedia..."
                value={filterPenyedia}
                onChange={(e) => setFilterPenyedia(e.target.value)}
                className="w-full pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select 
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer outline-none"
              >
                <option value="Semua">Jenis SPJ: Semua</option>
                {kategoriOptions.map(kat => (
                  <option key={kat} value={kat}>{kat}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="date" 
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
                className="w-full pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
          </div>
          
          {(filterPenyedia || filterTanggal || filterKategori !== 'Semua' || filterStatus !== 'Semua' || searchQuery) && (
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('Semua');
                  setFilterKategori('Semua');
                  setFilterPenyedia('');
                  setFilterTanggal('');
                }}
                className="text-[10px] font-black text-primary uppercase hover:underline flex items-center gap-1"
              >
                <X size={12} /> Reset Semua Filter
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-100">
                <th className="px-6 py-5 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('no')}>
                  <div className="flex items-center gap-1">No {sortField === 'no' && (sortDirection === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('namaPaket')}>
                  <div className="flex items-center gap-1">Paket Pekerjaan / Penyedia {sortField === 'namaPaket' && (sortDirection === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-6 py-5">Jenis SPJ</th>
                <th className="px-6 py-5 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('nilaiKontrak')}>
                  <div className="flex items-center gap-1">Kontrak (IDR) {sortField === 'nilaiKontrak' && (sortDirection === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">Tanggal SPJ {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-6 py-5">PIC / NIP</th>
                <th className="px-6 py-5 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('statusDokumen')}>
                  <div className="flex items-center gap-1">Status {sortField === 'statusDokumen' && (sortDirection === 'asc' ? '↑' : '↓')}</div>
                </th>
                <th className="px-6 py-5">Akses Dokumen</th>
                <th className="px-6 py-5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedSpjList.length > 0 ? sortedSpjList.map((spj) => (
                <tr 
                  key={spj.id} 
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedSpj(spj)}
                >
                  <td className="px-6 py-5 text-sm font-black text-slate-300">#{spj.no}</td>
                  <td className="px-6 py-5">
                    <div>
                      <h4 className="font-black text-slate-900 tracking-tight">{spj.namaPaket}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-1">{spj.penyedia}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                      {spj.kategori}
                    </span>
                  </td>
                   <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 line-through">{formatCurrency(spj.paguAnggaran)}</p>
                      <p className="text-sm font-black text-slate-900">{formatCurrency(spj.nilaiKontrak)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-black text-slate-600 tracking-tight">{spj.createdAt ? formatDate(spj.createdAt) : '-'}</p>
                      <p className="text-[9px] font-bold text-slate-400 tabular-nums uppercase">{spj.createdAt ? new Date(spj.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-black text-slate-900 tracking-tight">{spj.pic}</p>
                      <p className="text-[10px] font-bold text-slate-400 tabular-nums">NIP. {spj.nipPic}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap",
                      spj.statusDokumen === 'Selesai' ? "bg-green-50 border-green-200 text-green-600" : 
                      spj.statusDokumen === 'Proses' ? "bg-blue-50 border-blue-200 text-blue-600" :
                      spj.statusDokumen === 'Revisi' ? "bg-red-50 border-red-200 text-red-600" :
                      "bg-amber-50 border-amber-200 text-amber-600"
                    )}>
                      {spj.statusDokumen}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-2">
                      <div title="Kwintansi" className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors"><Receipt size={14} /></div>
                      <div title="BAST" className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors"><Truck size={14} /></div>
                      <div title="Kontrak" className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors"><FileSignature size={14} /></div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedSpj(spj); }}
                        className="p-2 text-emerald-500 hover:text-white transition-all bg-emerald-50 hover:bg-emerald-500 border border-emerald-100 rounded-xl shadow-sm hover:shadow-lg"
                        title="Cetak Dokumen"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(spj); }}
                        className="p-2 text-amber-500 hover:text-white transition-all bg-amber-50 hover:bg-amber-500 border border-amber-100 rounded-xl shadow-sm hover:shadow-lg"
                        title="Edit Data"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(spj.id); }}
                        className="p-2 text-rose-500 hover:text-white transition-all bg-rose-50 hover:bg-rose-500 border border-rose-100 rounded-xl shadow-sm hover:shadow-lg"
                        title="Hapus Data"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 rounded-full text-slate-200">
                        <Search size={40} />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Tidak ada data yang ditemukan</p>
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setFilterStatus('Semua');
                          setFilterKategori('Semua');
                          setFilterPenyedia('');
                          setFilterTanggal('');
                        }}
                        className="text-xs font-black text-primary uppercase hover:underline"
                      >
                        Reset Semua Filter
                      </button>
                    </div>
                  </td>
                </tr>
              )}
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card p-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-8"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                    {isEditMode ? 'Edit Data Paket SPJ' : 'Input Paket SPJ Baru'}
                  </h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                    {isEditMode ? 'Perbarui informasi dokumen dan kontrak' : 'Lengkapi detail pengadaan dan kontrak'}
                  </p>
                </div>
                <button onClick={() => setShowInput(false)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Paket Pekerjaan</label>
                    <button 
                      onClick={() => setShowBudgetSelector(true)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2 border border-emerald-100"
                    >
                      <Layers size={14} /> Pilih Dari Anggaran (DPA)
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={formData.namaPaket}
                    onChange={(e) => setFormData({...formData, namaPaket: e.target.value})}
                    placeholder="Contoh: Pengadaan Alat Tulis Kantor Jilid II"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                  {formData.belanjaId && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Terkoneksi ke Anggaran: <b className="ml-1">{formData.namaPaket}</b></span>
                      </div>
                      <button 
                        onClick={() => setFormData({...formData, belanjaId: '', progId: '', kegId: '', subId: ''})}
                        className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                      >
                        Lepas Link
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Berkas / Agenda</label>
                  <input 
                    type="text" 
                    value={formData.nomorBerkas}
                    onChange={(e) => setFormData({...formData, nomorBerkas: e.target.value})}
                    placeholder="Contoh: 001/PPTK/SETWAN/2026"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black italic text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Kontrak (Jika Ada)</label>
                  <input 
                    type="text" 
                    value={formData.nomorKontrak}
                    onChange={(e) => setFormData({...formData, nomorKontrak: e.target.value})}
                    placeholder="Contoh: 027/01/KONTRAK/2026"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black text-primary"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor & Tanggal SPPBJ</label>
                    <button 
                      onClick={generateDocNumbers}
                      className="text-[9px] font-black text-emerald-600 uppercase hover:underline"
                    >
                      Otomatis
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.nomorSPPBJ}
                      onChange={(e) => setFormData({...formData, nomorSPPBJ: e.target.value})}
                      placeholder="025/PA-Konst/SPPBJ/XI/2026"
                      className="w-2/3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black text-emerald-600"
                    />
                    <input 
                      type="date" 
                      value={formData.tanggalSPPBJ}
                      onChange={(e) => setFormData({...formData, tanggalSPPBJ: e.target.value})}
                      className="w-1/3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-xs font-black"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor & Tanggal SPMK</label>
                    <button 
                      onClick={generateDocNumbers}
                      className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                    >
                      Otomatis
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.nomorSPMK}
                      onChange={(e) => setFormData({...formData, nomorSPMK: e.target.value})}
                      placeholder="026/PA-Konst/SPMK/XI/2026"
                      className="w-2/3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black text-blue-600"
                    />
                    <input 
                      type="date" 
                      value={formData.tanggalSPMK}
                      onChange={(e) => setFormData({...formData, tanggalSPMK: e.target.value})}
                      className="w-1/3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-xs font-black"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis SPJ (Kategori)</label>
                    <button 
                      onClick={() => setShowAddKategori(!showAddKategori)}
                      className="text-[9px] font-black text-primary uppercase hover:underline"
                    >
                      {showAddKategori ? 'Pilih Existing' : '+ Tambah Kategori'}
                    </button>
                  </div>
                  {showAddKategori ? (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newKategori}
                        onChange={(e) => setNewKategori(e.target.value)}
                        placeholder="Nama Kategori Baru"
                        className="flex-grow px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                      />
                      <button 
                        onClick={() => {
                          if (newKategori && !kategoriOptions.includes(newKategori)) {
                            setKategoriOptions([...kategoriOptions, newKategori]);
                            setFormData({...formData, kategori: newKategori});
                            setNewKategori('');
                            setShowAddKategori(false);
                          }
                        }}
                        className="px-4 bg-primary text-white rounded-2xl hover:bg-primary/90"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select 
                      value={formData.kategori}
                      onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black italic"
                    >
                      {kategoriOptions.map(kat => (
                        <option key={kat} value={kat}>{kat}</option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Seksi Data Penyedia */}
                <div className="md:col-span-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2 mb-4 mt-4">
                    <Truck size={18} className="text-primary" /> Informasi Penyedia / Rekanan (Pihak III)
                  </h3>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Perusahaan / Penyedia</label>
                  <input 
                    type="text" 
                    list="vendor-list"
                    value={formData.penyedia || ''}
                    onChange={(e) => {
                      const selectedVen = vendors.find(v => v.namaPenyedia === e.target.value);
                      if (selectedVen) {
                        setFormData({
                          ...formData,
                          penyedia: selectedVen.namaPenyedia,
                          pimpinanPenyedia: selectedVen.namaPimpinan,
                          alamatPenyedia: selectedVen.alamat,
                          npwpPenyedia: selectedVen.npwp,
                          bankPenyedia: selectedVen.bank,
                          rekeningPenyedia: selectedVen.nomorRekening,
                          teleponPenyedia: selectedVen.telepon,
                          emailPenyedia: selectedVen.email,
                          kategori: selectedVen.kategori || formData.kategori
                        });
                      } else {
                        setFormData({...formData, penyedia: e.target.value});
                      }
                    }}
                    placeholder="Nama Perusahaan"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                  <datalist id="vendor-list">
                    {vendors.map(v => (
                      <option key={v.id} value={v.namaPenyedia}>{v.namaPimpinan} - {v.alamat.substring(0, 30)}...</option>
                    ))}
                  </datalist>
                  <datalist id="employee-list">
                    {employees.map(e => (
                      <option key={e.id} value={e.nama}>{e.nip} - {e.jabatan}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Pimpinan (Direktur/Pimpinan)</label>
                  <input 
                    type="text" 
                    value={formData.pimpinanPenyedia || ''}
                    onChange={(e) => setFormData({...formData, pimpinanPenyedia: e.target.value})}
                    placeholder="Nama Direktur / Pimpinan"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black text-indigo-600"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alamat Lengkap Kantor Penyedia</label>
                  <textarea 
                    value={formData.alamatPenyedia || ''}
                    onChange={(e) => setFormData({...formData, alamatPenyedia: e.target.value})}
                    placeholder="Jl. ........................."
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NPWP Penyedia</label>
                  <input 
                    type="text" 
                    value={formData.npwpPenyedia || ''}
                    onChange={(e) => setFormData({...formData, npwpPenyedia: formatNPWP(e.target.value)})}
                    placeholder="00.000.000.0-000.000"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telepon Penyedia</label>
                  <input 
                    type="text" 
                    value={formData.teleponPenyedia || ''}
                    onChange={(e) => setFormData({...formData, teleponPenyedia: e.target.value})}
                    placeholder="No. HP / WA"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Penyedia</label>
                  <input 
                    type="email" 
                    value={formData.emailPenyedia || ''}
                    onChange={(e) => setFormData({...formData, emailPenyedia: e.target.value})}
                    placeholder="email@penyedia.com"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bank Operasional</label>
                  <input 
                    type="text" 
                    value={formData.bankPenyedia || ''}
                    onChange={(e) => setFormData({...formData, bankPenyedia: e.target.value.toUpperCase()})}
                    placeholder="Contoh: BANK KALTENG"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Rekening Bank</label>
                  <input 
                    type="text" 
                    value={formData.rekeningPenyedia || ''}
                    onChange={(e) => setFormData({...formData, rekeningPenyedia: e.target.value})}
                    placeholder="No Rekening"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black font-mono tracking-wider"
                  />
                </div>

                {/* Seksi Pengguna Anggaran */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4 mt-6">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <UserCheck size={18} className="text-primary" /> Pengguna Anggaran (Sekretaris DPRD)
                    </h3>
                    <button 
                      onClick={() => setFormData({
                        ...formData,
                        paNama: agencyInfo.defaultPaNama || '',
                        paNip: agencyInfo.defaultPaNip || '',
                        paJabatan: agencyInfo.defaultPaJabatan || 'Pengguna Anggaran',
                        paPangkat: agencyInfo.defaultPaPangkat || ''
                      })}
                      className="text-[9px] font-black text-primary uppercase hover:underline"
                    >
                      Gunakan Default Instansi
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama PA</label>
                  <input 
                    type="text" 
                    list="employee-list"
                    value={formData.paNama || ''}
                    onChange={(e) => {
                      const selectedEmp = employees.find(emp => emp.nama === e.target.value);
                      if (selectedEmp) {
                        setFormData({
                          ...formData,
                          paNama: selectedEmp.nama,
                          paNip: selectedEmp.nip,
                          paJabatan: selectedEmp.jabatan,
                          paPangkat: selectedEmp.pangkatGolongan || ''
                        });
                      } else {
                        setFormData({...formData, paNama: e.target.value});
                      }
                    }}
                    placeholder="Nama PA"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIP PA</label>
                  <input 
                    type="text" 
                    value={formData.paNip || ''}
                    onChange={(e) => setFormData({...formData, paNip: e.target.value})}
                    placeholder="NIP PA"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jabatan PA</label>
                  <input 
                    type="text" 
                    value={formData.paJabatan || ''}
                    onChange={(e) => setFormData({...formData, paJabatan: e.target.value})}
                    placeholder="PA / Sekretaris DPRD"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pangkat / Golongan PA</label>
                  <input 
                    type="text" 
                    value={formData.paPangkat || ''}
                    onChange={(e) => setFormData({...formData, paPangkat: e.target.value})}
                    placeholder="Pangkat PA"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>

                {/* Seksi PPTK */}
                <div className="md:col-span-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2 mb-4 mt-4">
                    <PlayCircle size={18} className="text-primary" /> Pelaksana Kegiatan (PPTK)
                  </h3>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama PPTK</label>
                  <input 
                    type="text" 
                    list="employee-list"
                    value={formData.pptkNama || formData.pic || ''}
                    onChange={(e) => {
                      const selectedEmp = employees.find(emp => emp.nama === e.target.value);
                      if (selectedEmp) {
                        setFormData({
                          ...formData,
                          pptkNama: selectedEmp.nama,
                          pptkNip: selectedEmp.nip,
                          pptkJabatan: selectedEmp.jabatan,
                          pptkPangkat: selectedEmp.pangkatGolongan || '',
                          pic: selectedEmp.nama,
                          nipPic: selectedEmp.nip,
                          jabatanPic: selectedEmp.jabatan,
                          pangkatPic: selectedEmp.pangkatGolongan || ''
                        });
                      } else {
                        setFormData({...formData, pptkNama: e.target.value, pic: e.target.value});
                      }
                    }}
                    placeholder="Nama PPTK"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIP PPTK</label>
                  <input 
                    type="text" 
                    value={formData.pptkNip || formData.nipPic || ''}
                    onChange={(e) => setFormData({...formData, pptkNip: e.target.value, nipPic: e.target.value})}
                    placeholder="NIP PPTK"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jabatan PPTK</label>
                  <input 
                    type="text" 
                    value={formData.pptkJabatan || formData.jabatanPic || ''}
                    onChange={(e) => setFormData({...formData, pptkJabatan: e.target.value, jabatanPic: e.target.value})}
                    placeholder="Pejabat Pelaksana Teknis Kegiatan"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pangkat / Golongan PPTK</label>
                  <input 
                    type="text" 
                    value={formData.pptkPangkat || formData.pangkatPic || ''}
                    onChange={(e) => setFormData({...formData, pptkPangkat: e.target.value, pangkatPic: e.target.value})}
                    placeholder="Pangkat PPTK"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>

                {/* Seksi Bendahara */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4 mt-6">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <CreditCard size={18} className="text-primary" /> Bendahara Pengeluaran
                    </h3>
                    <button 
                      onClick={() => setFormData({
                        ...formData,
                        bendaharaNama: agencyInfo.defaultBendaharaNama || '',
                        bendaharaNip: agencyInfo.defaultBendaharaNip || '',
                        bendaharaJabatan: agencyInfo.defaultBendaharaJabatan || 'Bendahara Pengeluaran',
                        bendaharaPangkat: agencyInfo.defaultBendaharaPangkat || ''
                      })}
                      className="text-[9px] font-black text-primary uppercase hover:underline"
                    >
                      Gunakan Default Instansi
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Bendahara</label>
                  <input 
                    type="text" 
                    list="employee-list"
                    value={formData.bendaharaNama || ''}
                    onChange={(e) => {
                      const selectedEmp = employees.find(emp => emp.nama === e.target.value);
                      if (selectedEmp) {
                        setFormData({
                          ...formData,
                          bendaharaNama: selectedEmp.nama,
                          bendaharaNip: selectedEmp.nip,
                          bendaharaJabatan: selectedEmp.jabatan,
                          bendaharaPangkat: selectedEmp.pangkatGolongan || ''
                        });
                      } else {
                        setFormData({...formData, bendaharaNama: e.target.value});
                      }
                    }}
                    placeholder="Nama Bendahara"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIP Bendahara</label>
                  <input 
                    type="text" 
                    value={formData.bendaharaNip || ''}
                    onChange={(e) => setFormData({...formData, bendaharaNip: e.target.value})}
                    placeholder="NIP Bendahara"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jabatan Bendahara</label>
                  <input 
                    type="text" 
                    value={formData.bendaharaJabatan || ''}
                    onChange={(e) => setFormData({...formData, bendaharaJabatan: e.target.value})}
                    placeholder="Bendahara Pengeluaran"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pangkat / Golongan Bendahara</label>
                  <input 
                    type="text" 
                    value={formData.bendaharaPangkat || ''}
                    onChange={(e) => setFormData({...formData, bendaharaPangkat: e.target.value})}
                    placeholder="Pangkat Bendahara"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2 mb-4 mt-4">
                    <FileText size={18} className="text-primary" /> Anggaran & Nilai Kontrak
                  </h3>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nilai Kontrak (IDR)</label>
                  <input 
                    type="number" 
                    value={formData.nilaiKontrak || ''}
                    onChange={(e) => handleKontrakChange(Number(e.target.value))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nilai PPN (Otomatis)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      readOnly
                      value={formData.nilaiPPN || ''}
                      className="w-full px-5 py-4 bg-blue-50/50 border border-blue-100 rounded-2xl focus:ring-0 transition-all text-sm font-black text-blue-600 cursor-not-allowed"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <ShieldCheck size={16} className="text-blue-400" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nilai PPh (Otomatis)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      readOnly
                      value={formData.nilaiPPh || ''}
                      className="w-full px-5 py-4 bg-orange-50/50 border border-orange-100 rounded-2xl focus:ring-0 transition-all text-sm font-black text-orange-600 cursor-not-allowed"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <ShieldCheck size={16} className="text-orange-400" />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Dokumen Saat Ini</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Draft', 'Proses', 'Revisi', 'Selesai'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormData({ ...formData, statusDokumen: status })}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          formData.statusDokumen === status 
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ShieldCheck size={18} className="text-primary" /> Pengaturan Pajak (PPN & PPh)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* PPN Section */}
                    <div className={cn(
                      "p-6 rounded-3xl transition-all border-2",
                      formData.usePPN ? "bg-blue-50/30 border-blue-100 shadow-inner" : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            formData.usePPN ? "bg-blue-500 text-white shadow-lg" : "bg-slate-200 text-slate-400"
                          )}>
                            <Receipt size={20} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase">Pajak Pertambahan Nilai</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Gunakan PPN 11%</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.usePPN}
                            onChange={(e) => setFormData({...formData, usePPN: e.target.checked, statusPPN: e.target.checked ? formData.statusPPN : 'Diluar PPN'})}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>

                      <AnimatePresence>
                        {formData.usePPN && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                          >
                            <div className="flex bg-white p-1 rounded-2xl border border-blue-100 shadow-sm">
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, statusPPN: 'Diluar PPN'})}
                                className={cn(
                                  "flex-grow py-3 rounded-xl text-[10px] font-black uppercase transition-all",
                                  formData.statusPPN === 'Diluar PPN' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                Diluar PPN
                              </button>
                              <button 
                                type="button"
                                onClick={() => setFormData({...formData, statusPPN: 'Termasuk PPN'})}
                                className={cn(
                                  "flex-grow py-3 rounded-xl text-[10px] font-black uppercase transition-all",
                                  formData.statusPPN === 'Termasuk PPN' ? "bg-blue-500 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                Termasuk PPN
                              </button>
                            </div>
                            <div className="bg-white/80 p-3 rounded-2xl border border-blue-50 flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Estimasi PPN</span>
                              <span className="text-sm font-black text-blue-600">{formatCurrency(formData.nilaiPPN || 0)}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* PPh Section */}
                    <div className={cn(
                      "p-6 rounded-3xl transition-all border-2",
                      (formData.usePPh21 || formData.usePPh22 || formData.usePPh23 || formData.usePPh42 || formData.statusPPh === 'Termasuk PPh') ? "bg-orange-50/30 border-orange-100 shadow-inner" : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            (formData.statusPPh === 'Termasuk PPh' || formData.statusPPh === 'Diluar PPh') ? "bg-orange-500 text-white shadow-lg" : "bg-slate-200 text-slate-400"
                          )}>
                            <Receipt size={20} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase">Pajak Penghasilan (PPh)</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Potongan PPh Pasal</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.statusPPh === 'Termasuk PPh' || formData.statusPPh === 'Diluar PPh'}
                            onChange={(e) => setFormData({...formData, statusPPh: e.target.checked ? 'Termasuk PPh' : 'Tanpa PPh'})}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                      </div>

                      <AnimatePresence>
                        {(formData.statusPPh === 'Termasuk PPh' || formData.statusPPh === 'Diluar PPh') && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <select 
                                value={formData.jenisPPh}
                                onChange={(e) => setFormData({...formData, jenisPPh: e.target.value as any})}
                                className="w-full px-4 py-3 bg-white border border-orange-100 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-orange-500/10 cursor-pointer shadow-sm"
                              >
                                <option value="21">PPh Pasal 21</option>
                                <option value="22">PPh Pasal 22</option>
                                <option value="23">PPh Pasal 23</option>
                                <option value="4(2)">PPh Final 4(2)</option>
                              </select>
                              <div className="flex bg-white p-1 rounded-xl border border-orange-100 shadow-sm">
                                <button 
                                  type="button"
                                  onClick={() => setFormData({...formData, statusPPh: 'Diluar PPh'})}
                                  className={cn(
                                    "flex-grow py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                                    formData.statusPPh === 'Diluar PPh' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                                  )}
                                >
                                  Luar
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setFormData({...formData, statusPPh: 'Termasuk PPh'})}
                                  className={cn(
                                    "flex-grow py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                                    formData.statusPPh === 'Termasuk PPh' ? "bg-orange-500 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                                  )}
                                >
                                  Masuk
                                </button>
                              </div>
                            </div>
                            <div className="bg-white/80 p-3 rounded-2xl border border-orange-50 flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Estimasi PPh {formData.jenisPPh}</span>
                              <span className="text-sm font-black text-orange-600">{formatCurrency(formData.nilaiPPh || 0)}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Periode Pelaksanaan</label>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      value={formData.tanggalMulai}
                      onChange={(e) => setFormData({...formData, tanggalMulai: e.target.value})}
                      className="w-1/2 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-xs font-black"
                    />
                    <input 
                      type="date" 
                      value={formData.tanggalSelesai}
                      min={formData.tanggalMulai}
                      onChange={(e) => setFormData({...formData, tanggalSelesai: e.target.value})}
                      className="w-1/2 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-xs font-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metode Pengadaan</label>
                  <select 
                    value={formData.metodePengadaan}
                    onChange={(e) => setFormData({...formData, metodePengadaan: e.target.value as any})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black italic"
                  >
                    <option value="E-purchasing">E-purchasing</option>
                    <option value="Tender">Tender</option>
                    <option value="Pengadaan Langsung">Pengadaan Langsung</option>
                    <option value="Penunjukan Langsung">Penunjukan Langsung</option>
                    <option value="Swakelola">Swakelola</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Regulasi Acuan</label>
                  <select 
                    value={formData.regulasiAcuan}
                    onChange={(e) => setFormData({...formData, regulasiAcuan: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black italic"
                  >
                    <option value="PerLKPP No. 2 Tahun 2025">PerLKPP No. 2 Tahun 2025</option>
                    <option value="Perpres No. 12 Tahun 2021">Perpres No. 12 Tahun 2021</option>
                    <option value="Permendagri No. 77 Tahun 2020">Permendagri No. 77 Tahun 2020</option>
                  </select>
                </div>

                {/* Dynamic Fields Section */}
                <AnimatePresence mode="wait">
                  {formData.kategori === 'Jasa Konsultansi' && (
                    <motion.div 
                      key="konsultansi"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden pt-4 border-t border-slate-100"
                    >
                      <div className="md:col-span-2">
                         <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                           <FileSignature size={14} /> Informasi Jasa Konsultansi
                         </h4>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tenaga Ahli / Personil Inti</label>
                        <input 
                          type="text" 
                          value={formData.tenagaAhli}
                          onChange={(e) => setFormData({...formData, tenagaAhli: e.target.value})}
                          placeholder="Contoh: 1 Orang Ahli Arsitektur, 2 Orang Surveyor"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ruang Lingkup Pekerjaan</label>
                        <input 
                          type="text" 
                          value={formData.ruangLingkup}
                          onChange={(e) => setFormData({...formData, ruangLingkup: e.target.value})}
                          placeholder="Perencanaan, Pengawasan, dsb"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                        />
                      </div>
                    </motion.div>
                  )}

                  {formData.kategori === 'Barang' && (
                    <motion.div 
                      key="barang"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden pt-4 border-t border-slate-100"
                    >
                      <div className="md:col-span-2">
                         <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Truck size={14} /> Informasi Pengadaan Barang
                         </h4>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Merk / Type / Spesifikasi Utama</label>
                        <input 
                          type="text" 
                          value={formData.merkType}
                          onChange={(e) => setFormData({...formData, merkType: e.target.value})}
                          placeholder="Contoh: Epson L3210, Kertas PaperOne 80gr"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                        />
                      </div>
                    </motion.div>
                  )}

                  {formData.kategori === 'Konstruksi' && (
                    <motion.div 
                      key="konstruksi"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden pt-4 border-t border-slate-100"
                    >
                      <div className="md:col-span-2">
                         <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Layers size={14} /> Informasi Pekerjaan Konstruksi
                         </h4>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lokasi Spesifik Pekerjaan</label>
                        <input 
                          type="text" 
                          value={formData.lokasiPekerjaan}
                          onChange={(e) => setFormData({...formData, lokasiPekerjaan: e.target.value})}
                          placeholder="Contoh: Gedung A Lantai 3"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Pekerjaan Utama</label>
                        <input 
                          type="text" 
                          value={formData.ruangLingkup}
                          onChange={(e) => setFormData({...formData, ruangLingkup: e.target.value})}
                          placeholder="Contoh: Pemasangan Granite, Pengecatan"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 transition-all text-sm font-black"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Rekap Belanja Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Rincian Belanja</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Daftar rincian belanja (Contoh: Kertas, Tinta, dll)</p>
                  </div>
                  <div className="flex gap-2">
                    {formData.belanjaId && (
                      <button 
                        type="button"
                        onClick={() => {
                          const prog = programs.find(p => p.id === formData.progId);
                          const keg = prog?.kegiatan.find(k => k.id === formData.kegId);
                          const sub = keg?.subKegiatan.find(s => s.id === formData.subId);
                          const bel = sub?.belanja.find(b => b.id === formData.belanjaId);
                          
                          if (bel) {
                            const shoppingItem: ShoppingItem = {
                              id: Math.random().toString(36).substr(2, 9),
                              uraian: bel.uraian,
                              volume: bel.volume || 1,
                              satuan: bel.satuan || 'Pcs',
                              hargaSatuan: bel.hargaSatuan || 0
                            };
                            setFormData(prev => ({
                              ...prev,
                              rekapBelanja: [shoppingItem],
                              nilaiKontrak: bel.pagu
                            }));
                          }
                        }}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2 border border-emerald-100"
                      >
                        <Layers size={14} /> Sinkron Anggaran
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={addShoppingItem}
                      className="px-4 py-2 bg-primary/5 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center gap-2 border border-primary/10"
                    >
                      <Plus size={14} /> Tambah Item
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.rekapBelanja?.map((item, index) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={item.id} 
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl grid grid-cols-12 gap-3 items-end"
                    >
                      <div className="col-span-1 text-[10px] font-black text-slate-300 mb-4">#{index + 1}</div>
                      <div className="col-span-5">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Rincian Belanja</label>
                        <input 
                          type="text"
                          value={item.uraian}
                          onChange={(e) => updateShoppingItem(item.id, 'uraian', e.target.value)}
                          placeholder="Contoh: Kertas, Tinta, Pena, dll"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vol</label>
                        <input 
                          type="number"
                          value={item.volume}
                          onChange={(e) => updateShoppingItem(item.id, 'volume', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Satuan</label>
                        <input 
                          type="text"
                          value={item.satuan}
                          onChange={(e) => updateShoppingItem(item.id, 'satuan', e.target.value)}
                          placeholder="Pcs"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Harga</label>
                        <input 
                          type="number"
                          value={item.hargaSatuan}
                          onChange={(e) => updateShoppingItem(item.id, 'hargaSatuan', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button 
                          onClick={() => removeShoppingItem(item.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {(!formData.rekapBelanja || formData.rekapBelanja.length === 0) && (
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                      <p className="text-[10px] font-black text-slate-300 uppercase italic">Belum ada rincian item belanja</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                 <button onClick={() => setShowInput(false)} className="flex-grow py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                  Batal
                </button>
                <button onClick={handleSave} className="flex-grow py-4 metallic-purple text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-purple-500/20">
                  Simpan & Buat Dokumen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Selector Modal */}
      <AnimatePresence>
        {showBudgetSelector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card p-10 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                    <Layers className="text-primary" /> Pilih Rincian Anggaran (DPA)
                  </h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                    Hubungkan paket SPJ dengan mata anggaran yang tersedia
                  </p>
                </div>
                <button onClick={() => setShowBudgetSelector(false)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Search in Budget Selector */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Cari Mata Anggaran (Kode atau Uraian)..."
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  onChange={(e) => {
                    const term = e.target.value.toLowerCase();
                    setBudgetSearchTerm(term);
                  }}
                />
              </div>

              <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                {programs.filter(prog => 
                  prog.nama.toLowerCase().includes(budgetSearchTerm) || 
                  prog.kode.toLowerCase().includes(budgetSearchTerm) ||
                  prog.kegiatan.some(keg => 
                    keg.nama.toLowerCase().includes(budgetSearchTerm) || 
                    keg.subKegiatan.some(sub => 
                      sub.nama.toLowerCase().includes(budgetSearchTerm) ||
                      sub.belanja.some(bel => bel.uraian.toLowerCase().includes(budgetSearchTerm))
                    )
                  )
                ).map(prog => (
                  <div key={prog.id} className="space-y-3">
                    <div className="bg-slate-900 text-white p-4 rounded-2xl">
                      <p className="text-[10px] font-black opacity-60 uppercase">{prog.kode}</p>
                      <h4 className="text-sm font-black italic">{prog.nama}</h4>
                    </div>
                    {prog.kegiatan.filter(keg => 
                      keg.nama.toLowerCase().includes(budgetSearchTerm) || 
                      keg.subKegiatan.some(sub => 
                        sub.nama.toLowerCase().includes(budgetSearchTerm) ||
                        sub.belanja.some(bel => bel.uraian.toLowerCase().includes(budgetSearchTerm))
                      ) || prog.nama.toLowerCase().includes(budgetSearchTerm)
                    ).map(keg => (
                      <div key={keg.id} className="ml-6 space-y-2">
                        <div className="bg-primary/10 p-3 rounded-xl border border-primary/10">
                          <p className="text-[9px] font-black text-primary uppercase">{keg.kode}</p>
                          <h5 className="text-xs font-black text-slate-800">{keg.nama}</h5>
                        </div>
                        {keg.subKegiatan.filter(sub => 
                          sub.nama.toLowerCase().includes(budgetSearchTerm) ||
                          sub.belanja.some(bel => bel.uraian.toLowerCase().includes(budgetSearchTerm)) ||
                          keg.nama.toLowerCase().includes(budgetSearchTerm) ||
                          prog.nama.toLowerCase().includes(budgetSearchTerm)
                        ).map(sub => (
                          <div key={sub.id} className="ml-6 space-y-2">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase">{sub.kode}</p>
                              <h6 className="text-[11px] font-black text-slate-700">{sub.nama}</h6>
                            </div>
                            <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {sub.belanja.filter(bel => 
                                bel.uraian.toLowerCase().includes(budgetSearchTerm) ||
                                sub.nama.toLowerCase().includes(budgetSearchTerm) ||
                                keg.nama.toLowerCase().includes(budgetSearchTerm) ||
                                prog.nama.toLowerCase().includes(budgetSearchTerm)
                              ).map(bel => (
                                <button
                                  key={bel.id}
                                  onClick={() => {
                                    const shoppingItem: ShoppingItem = {
                                      id: Math.random().toString(36).substr(2, 9),
                                      uraian: bel.uraian,
                                      volume: bel.volume || 1,
                                      satuan: bel.satuan || 'Pcs',
                                      hargaSatuan: bel.hargaSatuan || 0
                                    };
                                    
                                    setFormData({
                                      ...formData,
                                      namaPaket: bel.uraian,
                                      paguAnggaran: bel.pagu,
                                      nilaiKontrak: bel.pagu, // Initial contract value same as budget
                                      belanjaId: bel.id,
                                      progId: prog.id,
                                      kegId: keg.id,
                                      subId: sub.id,
                                      pic: keg.assignedTo || sub.assignedTo || formData.pic,
                                      nipPic: formData.nipPic,
                                      metodePengadaan: 'Pengadaan Langsung',
                                      rekapBelanja: [shoppingItem] // Auto populate rincian item
                                    });
                                    setShowBudgetSelector(false);
                                  }}
                                  className="text-left p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/40 hover:shadow-lg transition-all group flex items-start gap-4"
                                >
                                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-primary/10 text-slate-400 group-hover:text-primary transition-colors mt-1">
                                    <CreditCard size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{bel.kode}</p>
                                    <p className="text-[11px] font-black text-slate-900 group-hover:text-primary transition-colors">{bel.uraian}</p>
                                    <div className="flex gap-4 mt-1.5 font-bold">
                                      <p className="text-[10px] text-primary">{formatCurrency(bel.pagu)}</p>
                                      <p className="text-[10px] text-slate-300 italic">Sisa: {formatCurrency(bel.pagu - (bel.realisasi || 0))}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Generator Detail View */}
      <AnimatePresence>
        {selectedSpj && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSpj(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[105]"
            />
            <motion.div 
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed inset-y-0 right-0 w-full max-w-3xl z-[110] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col"
            >
            <div className="p-8 bg-[#1e0533] text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter">Tools Generator Dokumen</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Satu Klik untuk Cetak Seluruh SPJ</p>
              </div>
              <button onClick={() => setSelectedSpj(null)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                <X size={20} />
              </button>
            </div>            <div className="flex-grow overflow-y-auto p-10 space-y-12">
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary-metallic rounded-full" />
                    <h4 className="text-lg font-black text-slate-900 uppercase">Informasi Detail Paket</h4>
                  </div>
                  <button 
                    onClick={() => handleEdit(selectedSpj)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    <Edit3 size={14} /> Edit Data
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Paket Pekerjaan</p>
                      <h4 className="text-lg font-black text-slate-900 leading-tight italic uppercase">{selectedSpj.namaPaket}</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Penyedia</p>
                        <p className="text-xs font-black text-slate-900">{selectedSpj.penyedia}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jenis SPJ</p>
                        <p className="text-xs font-black text-primary uppercase">{selectedSpj.kategori}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Metode</p>
                        <p className="text-xs font-black text-slate-900">{selectedSpj.metodePengadaan || 'Pengadaan Langsung'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No. Berkas</p>
                        <p className="text-xs font-black text-slate-900 truncate" title={selectedSpj.nomorBerkas}>{selectedSpj.nomorBerkas || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                       <Database size={14} /> Nilai & Anggaran
                    </h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Pagu Anggaran</span>
                        <span className="text-xs font-bold text-slate-500 line-through">{formatCurrency(selectedSpj.paguAnggaran)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Nilai Kontrak</span>
                        <span className="text-sm font-black text-indigo-600">{formatCurrency(selectedSpj.nilaiKontrak)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                       <Receipt size={14} /> Detail Pajak
                    </h5>
                    <div className="space-y-2">
                       {selectedSpj.nilaiPPN ? (
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">PPN (11%)</span>
                           <span className="text-xs font-black text-emerald-600">{formatCurrency(selectedSpj.nilaiPPN)}</span>
                         </div>
                       ) : null}
                        {selectedSpj.nilaiPPh21 ? (
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">PPh 21 (5%)</span>
                           <span className="text-xs font-black text-orange-600">{formatCurrency(selectedSpj.nilaiPPh21)}</span>
                         </div>
                       ) : null}
                       {selectedSpj.nilaiPPh22 ? (
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">PPh 22 (1.5%)</span>
                           <span className="text-xs font-black text-orange-600">{formatCurrency(selectedSpj.nilaiPPh22)}</span>
                         </div>
                       ) : null}
                       {selectedSpj.nilaiPPh23 ? (
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">PPh 23 (2%)</span>
                           <span className="text-xs font-black text-orange-600">{formatCurrency(selectedSpj.nilaiPPh23)}</span>
                         </div>
                       ) : null}
                       {selectedSpj.nilaiPPh42 ? (
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">PPh 4(2) (3%)</span>
                           <span className="text-xs font-black text-orange-600">{formatCurrency(selectedSpj.nilaiPPh42)}</span>
                         </div>
                       ) : null}
                       <div className="pt-2 border-t border-emerald-100 flex justify-between items-center">
                         <span className="text-[10px] font-black text-slate-900 uppercase">Total Realisasi Pajak</span>
                         <span className="text-xs font-black text-slate-900">{formatCurrency((selectedSpj.nilaiPPN || 0) + (selectedSpj.nilaiPPh || 0))}</span>
                       </div>
                    </div>
                  </div>

                  {/* Dynamic Fields Section in Detail */}
                  {(selectedSpj.tenagaAhli || selectedSpj.ruangLingkup || selectedSpj.lokasiPekerjaan || selectedSpj.merkType) && (
                    <div className="md:col-span-2 p-6 bg-slate-900 text-white rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                      {selectedSpj.tenagaAhli && (
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Tenaga Ahli</p>
                          <p className="text-xs font-bold">{selectedSpj.tenagaAhli}</p>
                        </div>
                      )}
                      {selectedSpj.ruangLingkup && (
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Ruang Lingkup</p>
                          <p className="text-xs font-bold">{selectedSpj.ruangLingkup}</p>
                        </div>
                      )}
                      {selectedSpj.lokasiPekerjaan && (
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Lokasi Pekerjaan</p>
                          <p className="text-xs font-bold">{selectedSpj.lokasiPekerjaan}</p>
                        </div>
                      )}
                      {selectedSpj.merkType && (
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Merk / Type</p>
                          <p className="text-xs font-bold">{selectedSpj.merkType}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Shopping Items Summary */}
                  {selectedSpj.rekapBelanja && selectedSpj.rekapBelanja.length > 0 && (
                    <div className="md:col-span-2 space-y-4">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Rincian Barang / Jasa ({selectedSpj.rekapBelanja.length} Item)</h5>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-100 font-black uppercase text-slate-500">
                            <tr>
                              <th className="px-4 py-2">Uraian</th>
                              <th className="px-4 py-2 text-center">Vol</th>
                              <th className="px-4 py-2 text-right">Harga</th>
                              <th className="px-4 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {selectedSpj.rekapBelanja.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 font-bold text-slate-900">{item.uraian}</td>
                                <td className="px-4 py-2 text-center text-slate-500">{item.volume} {item.satuan}</td>
                                <td className="px-4 py-2 text-right text-slate-500 font-mono">{formatCurrency(item.hargaSatuan)}</td>
                                <td className="px-4 py-2 text-right font-black text-slate-900 font-mono">{formatCurrency(item.volume * item.hargaSatuan)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                 <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary-metallic rounded-full" />
                  <h4 className="text-lg font-black text-slate-900 uppercase">Opsi Cetak Dokumen</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'RAB', label: 'RAB (Anggaran)', icon: FileText, desc: 'Rincian Anggaran Biaya' },
                    { id: 'Kwitansi', label: 'Kwitansi Pembayaran', icon: Receipt, desc: 'Bukti Serah Terima Uang' },
                    { id: 'SuratPesanan', label: 'Surat Pesanan Barang (SPB)', icon: ClipboardCheck, desc: 'Daftar Pesanan Barang' },
                    { id: 'Kontrak', label: 'Surat Perintah Kerja (SPK)', icon: FileSignature, desc: 'Perjanjian Kerja Sama' },
                    { id: 'Ringkasan', label: 'Ringkasan Kontrak', icon: Database, desc: 'Lampiran Rincian Teknis' },
                    { id: 'SPPBJ', label: 'Surat Penunjukan (SPPBJ)', icon: UserCheck, desc: 'Penunjukan Penyedia' },
                    { id: 'SPMK', label: 'Surat Mulai Kerja (SPMK)', icon: PlayCircle, desc: 'Perintah Mulai Kerja' },
                    { id: 'BAST', label: 'BAST (Serah Terima)', icon: Truck, desc: 'Berita Acara Serah Terima' },
                    { id: 'BAP', label: 'BAP (Pembayaran)', icon: CreditCard, desc: 'Berita Acara Pembayaran' },
                    { id: 'SPP', label: 'Surat Permintaan (SPP)', icon: FileSignature, desc: 'Permintaan Pembayaran' },
                    { id: 'SPM', label: 'Surat Perintah (SPM)', icon: ShieldCheck, desc: 'Perintah Membayar' },
                    { id: 'LaporanSPJ', label: 'Laporan SPJ (LPJ)', icon: FileCheck, desc: 'Laporan Pertanggungjawaban' },
                  ].map((doc, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      className="p-5 glass-card border-slate-100 hover:border-primary/20 cursor-pointer flex items-center justify-between group"
                    >
                      <div 
                        className="flex items-center gap-4 flex-grow"
                        onClick={() => setViewingDoc(doc.id as DocumentType)}
                      >
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                          <doc.icon size={24} />
                        </div>
                        <div>
                          <h5 className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{doc.label}</h5>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{doc.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingDoc(doc.id as DocumentType);
                          setTimeout(() => window.print(), 100);
                        }}
                        className="p-2 text-slate-300 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"
                        title="Langsung Cetak"
                      >
                        <Printer size={18} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>

              <div className="p-8 bg-primary rounded-3xl text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-black italic">Batch Print SPJ</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Export Semua Dokumen Ke PDF/Printer</p>
                  </div>
                  <button onClick={() => window.print()} className="px-6 py-3 bg-white text-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                    Jalankan Sekarang
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>

      {/* Document Content Modal */}
      <AnimatePresence>
        {viewingDoc && selectedSpj && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-12 md:p-16 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 rounded-sm relative selection:bg-primary selection:text-white"
            >
              <div className="absolute top-8 right-8 flex gap-3 print:hidden">
                <button onClick={() => window.print()} className="p-3 bg-primary text-white rounded-xl shadow-lg hover:opacity-90 transition-all">
                  <Printer size={20} />
                </button>
                <button onClick={() => setViewingDoc(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Formal Header */}
              <div className="flex flex-col items-center border-b-4 border-slate-900 pb-6 mb-8 uppercase text-center relative">
                <div className="absolute left-0 top-0 w-20 h-20">
                  {agencyInfo.logo ? (
                    <img src={agencyInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-300 text-[8px] border border-slate-200">KOP</div>
                  )}
                </div>
                <h3 className="text-sm font-black tracking-widest">Pemerintah Provinsi Kalimantan Tengah</h3>
                <h2 className="text-2xl font-black leading-tight tracking-tighter">{agencyInfo.name}</h2>
                <p className="text-[10px] font-bold text-slate-500 mt-1 normal-case italic">{agencyInfo.address}</p>
                <div className="absolute right-0 top-0 text-right opacity-20 print:opacity-100 flex flex-col items-center">
                  <div className="p-2 border-2 border-slate-900 rounded-lg flex flex-col items-center">
                    <QrCode size={40} className="text-slate-900" />
                    <p className="text-[6px] font-black mt-1 uppercase">Verify SPJ-QR</p>
                  </div>
                </div>
              </div>              {/* Render dynamic content based on type */}
              {viewingDoc === 'Kwitansi' && (
                <div className="space-y-10">
                  <div className="text-center relative">
                    <div className="absolute top-0 right-0 border-2 border-slate-900 px-4 py-2 font-black text-xs uppercase tracking-widest">
                      Lampiran: II <br />
                      Nomor: {selectedSpj.nomorBerkas || '...'}
                    </div>
                    <h1 className="text-2xl font-black uppercase underline underline-offset-4 decoration-2">KUITANSI PEMBAYARAN</h1>
                    <p className="text-sm font-bold text-slate-500 mt-2">ID Transaksi: {selectedSpj.id.toUpperCase()}</p>
                  </div>

                  <div className="space-y-6 pt-10">
                    <div className="grid grid-cols-4 gap-4 items-start border-b border-slate-200 pb-3">
                      <span className="text-[10px] font-black uppercase text-slate-400">Sudah Terima Dari</span>
                      <div className="col-span-3 text-sm font-black">: BENDAHARA PENGELUARAN {agencyInfo.name.toUpperCase()}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-start border-b border-slate-200 pb-3">
                      <span className="text-[10px] font-black uppercase text-slate-400">Uang Sejumlah</span>
                      <div className="col-span-3">
                        <div className="text-sm font-black italic bg-slate-100 p-4 rounded-xl mb-2">
                          # {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedSpj.nilaiKontrak)} #
                        </div>
                        <p className="text-[10px] font-black italic text-slate-500 uppercase">Terbilang: {terbilang(selectedSpj.nilaiKontrak)} Rupiah</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-start border-b border-slate-200 pb-3">
                      <span className="text-[10px] font-black uppercase text-slate-400">Untuk Pembayaran</span>
                      <div className="col-span-3 text-sm font-bold leading-relaxed">: {selectedSpj.namaPaket} dengan rincian belanja terlampir sesuai Surat Pesanan Barang (SPB) Nomor: {selectedSpj.nomorBerkas} Tanggal {formatDate(selectedSpj.tanggalMulai)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mt-12 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Identitas Penerima (Pihak Kedua)</h4>
                      <div className="space-y-3 mt-4">
                        {[
                          { label: 'Penyedia', value: selectedSpj.penyedia },
                          { label: 'NPWP', value: selectedSpj.npwpPenyedia || '-' },
                          { label: 'Bank', value: selectedSpj.bankPenyedia || '-' },
                          { label: 'Rekening', value: selectedSpj.rekeningPenyedia || '-' },
                        ].map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-slate-400 w-24 shrink-0 uppercase text-[9px]">{item.label}</span>
                            <span className="text-slate-300 shrink-0">:</span>
                            <span className="text-slate-900">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Pejabat Berwenang (Pihak Kesatu)</h4>
                      <div className="space-y-3 mt-4">
                        {[
                          { label: 'PPTK/PA', value: selectedSpj.pic },
                          { label: 'NIP', value: selectedSpj.nipPic || '-' },
                          { label: 'Jabatan', value: selectedSpj.jabatanPic || '-' },
                        ].map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-slate-400 w-24 shrink-0 uppercase text-[9px]">{item.label}</span>
                            <span className="text-slate-300 shrink-0">:</span>
                            <span className="text-slate-900">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8 mt-24 text-center">
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Mengetahui/Menyetujui,<br />{selectedSpj.paJabatan || 'Pengguna Anggaran'}</p>
                      <div>
                        <p className="text-[11px] font-black uppercase underline decoration-2 underline-offset-4">{selectedSpj.paNama || '...........................'}</p>
                        <p className="text-[10px] font-medium text-slate-500">NIP. {selectedSpj.paNip || '...........................'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Telah Dibayar Lunas,<br />{selectedSpj.bendaharaJabatan || 'Bendahara Pengeluaran'}</p>
                      <div>
                        <p className="text-[11px] font-black uppercase underline decoration-2 underline-offset-4">{selectedSpj.bendaharaNama || '...........................'}</p>
                        <p className="text-[10px] font-medium text-slate-500">NIP. {selectedSpj.bendaharaNip || '...........................'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Palangka Raya, {formatDate(new Date().toISOString())}<br />Penerima/Penyedia</p>
                      <div>
                        <p className="text-[8px] font-bold text-slate-300 uppercase mb-4 italic">(Meterai 10.000 & Stempel)</p>
                        <p className="text-[11px] font-black uppercase underline decoration-2 underline-offset-4">{selectedSpj.pimpinanPenyedia || 'DIREKTUR'} {selectedSpj.penyedia}</p>
                        <p className="text-[10px] font-medium text-slate-500">NPWP. {selectedSpj.npwpPenyedia || '...........................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc === 'RAB' && (
                <div className="space-y-10">
                  <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
                    <h1 className="text-xl font-black uppercase underline underline-offset-4 decoration-2">RENCANA ANGGARAN BIAYA (RAB)</h1>
                    <div className="grid grid-cols-1 gap-1.5 text-[10px] font-bold mt-6 max-w-2xl mx-auto">
                      {[
                        { label: 'Pemerintah / Instansi', value: agencyInfo.name.toUpperCase() },
                        { label: 'Nama Kegiatan / Paket', value: selectedSpj.namaPaket.toUpperCase() },
                        { label: 'Lokasi Pekerjaan', value: selectedSpj.lokasiPekerjaan || agencyInfo.address },
                        { label: 'Tahun Anggaran', value: new Date(selectedSpj.tanggalMulai).getFullYear() },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start border-b border-slate-100 pb-1 gap-4">
                          <span className="text-slate-400 uppercase w-48 shrink-0">{item.label}</span>
                          <span className="text-slate-400 shrink-0">:</span>
                          <span className="text-slate-900 flex-grow font-black">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-2 border-slate-900">
                    <table className="w-full text-[10px] font-bold border-collapse">
                      <thead className="bg-slate-100 border-b-2 border-slate-900">
                        <tr className="uppercase">
                          <th className="p-2 border-r border-slate-900 w-10 text-center">No</th>
                          <th className="p-2 border-r border-slate-900 text-left w-32">Kode Rekening</th>
                          <th className="p-2 border-r border-slate-900 text-left">Uraian (Rincian Bahan/Jasa)</th>
                          <th className="p-2 border-r border-slate-900 w-16 text-center">Vol</th>
                          <th className="p-2 border-r border-slate-900 w-20 text-center">Satuan</th>
                          <th className="p-2 border-r border-slate-900 text-right w-28">Harga Satuan</th>
                          <th className="p-2 text-right w-32">Jumlah Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {selectedSpj.rekapBelanja && selectedSpj.rekapBelanja.length > 0 ? (
                          selectedSpj.rekapBelanja.map((item, idx) => (
                            <tr key={item.id}>
                              <td className="p-2 border-r border-slate-900 text-center">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-900 font-mono text-[9px] text-slate-500">{linked?.bel?.kode || '5.2.02.01.00XX'}</td>
                              <td className="p-2 border-r border-slate-900 uppercase text-slate-900">{item.uraian}</td>
                              <td className="p-2 border-r border-slate-900 text-center">{item.volume}</td>
                              <td className="p-2 border-r border-slate-900 text-center uppercase">{item.satuan}</td>
                              <td className="p-2 border-r border-slate-900 text-right font-mono">{formatCurrency(item.hargaSatuan)}</td>
                              <td className="p-2 text-right font-black font-mono">{formatCurrency(item.volume * item.hargaSatuan)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="p-2 border-r border-slate-900 text-center">1</td>
                            <td className="p-2 border-r border-slate-900 font-mono text-[9px] text-slate-500">5.2.02.01.00XX</td>
                            <td className="p-2 border-r border-slate-900 uppercase text-slate-900">{selectedSpj.namaPaket}</td>
                            <td className="p-2 border-r border-slate-900 text-center">1</td>
                            <td className="p-2 border-r border-slate-900 text-center uppercase">Paket</td>
                            <td className="p-2 border-r border-slate-900 text-right font-mono">{formatCurrency(selectedSpj.nilaiKontrak)}</td>
                            <td className="p-2 text-right font-black font-mono">{formatCurrency(selectedSpj.nilaiKontrak)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-900 font-black uppercase text-xs">
                        <tr>
                          <td colSpan={6} className="p-3 text-right border-r border-slate-900">Total Akhir Pajak ({selectedSpj.statusPPN || 'PPN 11%'})</td>
                          <td className="p-3 text-right bg-slate-100">{formatCurrency(selectedSpj.nilaiKontrak)}</td>
                        </tr>
                        <tr>
                          <td colSpan={7} className="p-2 lowercase italic text-slate-400 font-medium text-right normal-case tracking-tight">Terbilang: {terbilang(selectedSpj.nilaiKontrak)} Rupiah</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-16 text-center font-bold">
                    <div className="flex flex-col justify-between h-44">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase">Mengetahui/Menyetujui,</p>
                        <p className="text-[11px] uppercase text-slate-900">{selectedSpj.paJabatan || 'Pengguna Anggaran'}</p>
                      </div>
                      <div className="border-t-2 border-slate-900 pt-2 mx-8">
                        <p className="text-xs font-black uppercase">{selectedSpj.paNama || '...........................'}</p>
                        <p className="text-[9px] text-slate-500 font-medium tracking-tighter">NIP. {selectedSpj.paNip || '...........................'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-44">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase">Palangka Raya, {formatDate(new Date().toISOString())}</p>
                        <p className="text-[11px] uppercase">{selectedSpj.pptkJabatan || 'Pelaksana Kegiatan / PPTK'}</p>
                      </div>
                      <div className="border-t-2 border-slate-900 pt-2 mx-8">
                        <p className="text-xs uppercase">{selectedSpj.pptkNama || selectedSpj.pic}</p>
                        <p className="text-[9px] text-slate-500 font-medium tracking-tighter">NIP. {selectedSpj.pptkNip || selectedSpj.nipPic || '......................................................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc === 'SuratPesanan' && (
                <div className="space-y-12">
                  <div className="text-center">
                    <h1 className="text-2xl font-black uppercase underline underline-offset-4 decoration-2">SURAT PESANAN BARANG (SPB)</h1>
                    <p className="text-sm font-bold text-slate-600 mt-2">NOMOR: {selectedSpj.nomorBerkas || '.../SPB/PPTK/2026'}</p>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest italic">{selectedSpj.regulasiAcuan}</p>
                  </div>

                  <div className="space-y-8 text-[13px] leading-loose text-justify font-medium">
                    <p>
                      Yang bertanda tangan di bawah ini Pejabat Pelaksana Teknis Kegiatan (PPTK) pada <b className="text-slate-900">{agencyInfo.name.toUpperCase()}</b>, selanjutnya disebut sebagai <b className="text-slate-900">Pemesan</b>, memberikan pesanan kepada:
                    </p>

                    <div className="bg-white border-2 border-slate-900 p-8 space-y-4 shadow-sm">
                      <div className="grid grid-cols-3 gap-6 items-start border-b border-slate-100 pb-2">
                        <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Penyedia</span>
                        <div className="col-span-2 font-black text-slate-900">: &nbsp; {selectedSpj.penyedia?.toUpperCase()}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-6 items-start border-b border-slate-100 pb-2">
                        <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">NPWP</span>
                        <div className="col-span-2 font-black text-slate-900">: &nbsp; {selectedSpj.npwpPenyedia || '-'}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-6 items-start border-b border-slate-100 pb-2">
                        <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Alamat</span>
                        <div className="col-span-2 font-bold text-slate-900">: &nbsp; Sesuai Profil Perusahaan yang Terdaftar</div>
                      </div>
                      <div className="grid grid-cols-3 gap-6 items-start pb-2">
                        <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Nilai Kontrak</span>
                        <div className="col-span-2">
                          <div className="font-black text-primary text-base">: &nbsp; {formatCurrency(selectedSpj.nilaiKontrak)}</div>
                          <p className="text-[10px] font-black italic text-slate-500 ml-4">Terbilang: {terbilang(selectedSpj.nilaiKontrak)} Rupiah</p>
                        </div>
                      </div>
                    </div>

                    <p>
                      Untuk melaksanakan pekerjaan <b className="text-slate-900 uppercase">"{selectedSpj.namaPaket}"</b> dengan rincian sebagaimana tertera dalam lampiran Rincian Anggaran Biaya (RAB). Pekerjaan tersebut wajib diselesaikan dan diserahkan dalam keadaan baik dan lengkap selambat-lambatnya pada tanggal <b className="text-slate-900 font-black">{formatDate(selectedSpj.tanggalSelesai)}</b>.
                    </p>

                    <div className="space-y-4 mt-6">
                      <h4 className="font-black text-sm uppercase underline decoration-2">Syarat dan Ketentuan:</h4>
                      <ol className="list-decimal pl-5 space-y-2 text-xs">
                        <li><b>Jangka Waktu Pelaksanaan:</b> Sesuai dengan yang tertera di atas.</li>
                        <li><b>Sanksi Keterlambatan:</b> Terlambat menyerahkan hasil pekerjaan dikenakan denda sekurang-kurangnya 1/1000 (satu perseribu) dari nilai kontrak atau bagian kontrak untuk setiap hari keterlambatan.</li>
                        <li><b>Pemeriksaan dan Pengujian:</b> Pemesan berhak melakukan pemeriksaan dan pengujian atas hasil pekerjaan yang dilakukan oleh Penyedia.</li>
                        <li><b>Pembayaran:</b> Dilakukan setelah pekerjaan selesai 100% dan dokumen penagihan dinyatakan lengkap.</li>
                        <li><b>Perubahan SPB:</b> Perubahan atas Surat Pesanan Barang (SPB) ini hanya dapat dilakukan melalui Addendum SPB yang disetujui kedua belah pihak.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                    <div className="flex flex-col justify-between h-48 group">
                      <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Menerima Pesanan,<br /><b className="text-slate-600">{selectedSpj.penyedia}</b></p>
                      <div>
                        <p className="text-[11px] font-black uppercase underline decoration-2 underline-offset-4">{selectedSpj.pimpinanPenyedia || 'Pimpinan'} {selectedSpj.penyedia}</p>
                        <p className="text-[10px] font-medium text-slate-500 italic">Materai & Stempel Basah</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Palangka Raya, {formatDate(new Date().toISOString())}<br />{selectedSpj.pptkJabatan || 'Pelaksana Teknis Kegiatan (PPTK)'}</p>
                      <div>
                        <p className="text-[11px] font-black uppercase underline decoration-2 underline-offset-4">{selectedSpj.pptkNama || selectedSpj.pic}</p>
                        <p className="text-[10px] font-medium text-slate-500">NIP. {selectedSpj.pptkNip || selectedSpj.nipPic || '...........................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}              {viewingDoc === 'Kontrak' && (
                <div className="space-y-10">
                  <div className="text-center font-serif">
                    <h1 className="text-2xl font-black uppercase underline underline-offset-4 decoration-2">SURAT PERINTAH KERJA (SPK)</h1>
                    <p className="text-sm font-bold mt-2">Nomor: {selectedSpj.nomorKontrak || selectedSpj.nomorBerkas || '.../SPK/2026'}</p>
                    <p className="text-sm font-black uppercase mt-1">Paket Pekerjaan: {selectedSpj.namaPaket}</p>
                  </div>

                  <div className="space-y-6 text-[12px] leading-relaxed text-justify font-medium">
                    <section>
                      <h4 className="font-black text-sm uppercase underline decoration-2 mb-4">I. IDENTITAS PARA PIHAK</h4>
                      <div className="space-y-4">
                        <div className="pl-4 border-l-4 border-slate-900">
                          <p className="font-black uppercase text-[10px] text-slate-400 mb-1">PIHAK PERTAMA (Pengguna Jasa)</p>
                          <div className="grid grid-cols-4 gap-1">
                            <span className="font-bold">Nama</span><div className="col-span-3">: <b className="text-slate-900 uppercase">{selectedSpj.paNama || selectedSpj.pic}</b></div>
                            <span className="font-bold">Jabatan</span><div className="col-span-3">: {selectedSpj.paJabatan || selectedSpj.jabatanPic || 'Pengguna Anggaran (PA)'}</div>
                            <span className="font-bold">Instansi</span><div className="col-span-3">: <b className="text-slate-900 uppercase">{agencyInfo.name}</b></div>
                            <span className="font-bold">Alamat</span><div className="col-span-3">: {agencyInfo.address}</div>
                          </div>
                        </div>
                        <div className="pl-4 border-l-4 border-slate-300">
                          <p className="font-black uppercase text-[10px] text-slate-400 mb-1">PIHAK KEDUA (Penyedia Jasa)</p>
                          <div className="grid grid-cols-4 gap-1">
                            <span className="font-bold">Nama</span><div className="col-span-3">: <b className="text-slate-900 uppercase">DIREKTUR / PIMPINAN PERUSAHAAN</b></div>
                            <span className="font-bold">Perusahaan</span><div className="col-span-3">: <b className="text-slate-900 uppercase">{selectedSpj.penyedia}</b></div>
                            <span className="font-bold">NPWP</span><div className="col-span-3">: {selectedSpj.npwpPenyedia || '-'}</div>
                            <span className="font-bold">Alamat</span><div className="col-span-3">: Alamat Sesuai Domisili Perusahaan yang Terdaftar</div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h4 className="font-black text-sm uppercase underline decoration-2">II. ISI SURAT PERJANJIAN</h4>
                      <div className="space-y-4 ml-2">
                        <div>
                          <p className="font-black uppercase text-[10px] text-slate-500 mb-1">1. Dasar Pekerjaan</p>
                          <p>Berdasarkan {selectedSpj.regulasiAcuan || 'Peraturan Pengadaan Barang/Jasa Pemerintah'} dan Dokumen Penawaran/Negosiasi Nomor {selectedSpj.nomorBerkas || '....'} tanggal {formatDate(selectedSpj.tanggalMulai)}.</p>
                        </div>
                        <div>
                          <p className="font-black uppercase text-[10px] text-slate-500 mb-1">2. Lingkup Pekerjaan</p>
                          <p>Penyelesaian pekerjaan <b className="text-slate-900">{selectedSpj.namaPaket}</b> meliputi pengadaan barang/jasa yang spesifikasi dan volumenya tercantum dalam Rincian Anggaran Biaya (RAB) yang merupakan bagian tidak terpisahkan dari SPK ini.</p>
                        </div>
                        <div>
                          <p className="font-black uppercase text-[10px] text-slate-500 mb-1">3. Nilai SPK</p>
                          <p>Nilai Kontrak sebesar <b className="text-slate-900">{formatCurrency(selectedSpj.nilaiKontrak)}</b> (<b className="italic">{terbilang(selectedSpj.nilaiKontrak)} Rupiah</b>), {selectedSpj.statusPPN === 'Termasuk PPN' ? 'sudah termasuk Pajak Pertambahan Nilai (PPN) 11%' : 'di luar Pajak Pertambahan Nilai (PPN)'}{selectedSpj.statusPPh === 'Termasuk PPh' ? ` serta sudah termasuk PPh Pasal ${selectedSpj.jenisPPh || '23'}` : ''}.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-black uppercase text-[10px] text-slate-500 mb-1">4. Pajak (PPN & PPh)</p>
                            <p className="text-[11px] font-bold">
                              PPN: {formatCurrency(selectedSpj.nilaiPPN || 0)} 
                              {selectedSpj.nilaiPPh22 ? ` | PPh 22: ${formatCurrency(selectedSpj.nilaiPPh22)}` : ''}
                              {selectedSpj.nilaiPPh23 ? ` | PPh 23: ${formatCurrency(selectedSpj.nilaiPPh23)}` : ''}
                              {selectedSpj.nilaiPPh42 ? ` | PPh 4(2): ${formatCurrency(selectedSpj.nilaiPPh42)}` : ''}
                            </p>
                          </div>
                          <div>
                            <p className="font-black uppercase text-[10px] text-slate-500 mb-1">5. Waktu Pelaksanaan</p>
                            <p className="font-black">{(new Date(selectedSpj.tanggalSelesai).getTime() - new Date(selectedSpj.tanggalMulai).getTime()) / (1000 * 3600 * 24) || '...'} Hari Kalender</p>
                          </div>
                          <div>
                            <p className="font-black uppercase text-[10px] text-slate-500 mb-1">6. Masa Pemeliharaan</p>
                            <p>30 (Tiga Puluh) Hari Kalender sejak BAST Pertama</p>
                          </div>
                        </div>
                        <div>
                          <p className="font-black uppercase text-[10px] text-slate-500 mb-1">6. Hak dan Kewajiban</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>PIHAK KEDUA wajib melaksanakan pekerjaan secara profesional sesuai spesifikasi teknis.</li>
                            <li>PIHAK PERTAMA berhak melakukan pemeriksaan dan pengawasan atas pelaksanaan pekerjaan.</li>
                            <li>Pembayaran dilakukan setelah PIHAK KEDUA menyerahkan seluruh dokumen penagihan yang sah dan BAST disetujui.</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    <p className="font-bold italic text-slate-500 border-t border-slate-100 pt-4 mt-8">
                      Dibuat pada tanggal: {formatDate(new Date().toISOString())}. Surat Perintah Kerja ini mengikat dan memiliki instruksi kerja spesifik yang harus ditaati oleh kedua belah pihak.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-20 text-center font-bold">
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] uppercase">PIHAK KEDUA (Penyedia),</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6 relative">
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-10 border border-slate-900 p-1 text-[8px] italic whitespace-nowrap">MATERAI 10.000</div>
                         <p className="text-xs uppercase">{selectedSpj.pimpinanPenyedia || 'DIREKTUR'} {selectedSpj.penyedia}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter italic">Penyedia Jasa</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] uppercase">PIHAK PERTAMA (Pajak/PA/PPTK),</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6">
                         <p className="text-xs uppercase">{selectedSpj.paNama || selectedSpj.pptkNama || selectedSpj.pic}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter">NIP. {selectedSpj.paNip || selectedSpj.pptkNip || selectedSpj.nipPic || '...........................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc === 'Ringkasan' && (
                <div className="space-y-10">
                  <div className="text-center">
                    <h1 className="text-2xl font-black uppercase underline underline-offset-4 decoration-4 tracking-tighter">RINGKASAN KONTRAK / DATA TRANSAKSI</h1>
                    <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">BUKTI PENDUKUNG PERTANGGUNGJAWABAN KEUANGAN DIGITAL</p>
                  </div>

                  <div className="space-y-8 text-[12px] font-medium leading-relaxed">
                    <section>
                      <h4 className="font-black text-sm uppercase bg-slate-900 text-white px-4 py-1 mb-4 inline-block">I. DATA UMUM KONTRAK / SPK</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Nomor Kontrak/SPK</span> <b className="text-slate-900">{selectedSpj.nomorKontrak || selectedSpj.nomorBerkas || '-'}</b></p>
                          <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Tanggal Kontrak</span> <b className="text-slate-900">{formatDate(selectedSpj.tanggalMulai)}</b></p>
                          <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Nomor & Tgl Addendum</span> <b className="text-slate-900 italic font-bold text-slate-400">TIDAK ADA</b></p>
                        </div>
                        <div className="space-y-2">
                          <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Nomor & Tgl SPPBJ</span> <b className="text-slate-900">{selectedSpj.nomorSPPBJ || '.../.../SPPBJ/2026'}</b></p>
                          <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Nomor & Tgl SPMK</span> <b className="text-slate-900">{selectedSpj.nomorSPMK || '.../.../SPMK/2026'}</b></p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="font-black text-sm uppercase bg-slate-900 text-white px-4 py-1 mb-4 inline-block">II. DATA PARA PIHAK</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pihak Pertama (PA)</p>
                          <p className="font-black uppercase text-slate-900">{selectedSpj.pic}</p>
                          <p className="text-slate-500">{selectedSpj.jabatanPic || 'Pengguna Anggaran'}</p>
                          <p className="text-slate-500 font-bold">NIP. {selectedSpj.nipPic || '-'}</p>
                          <p className="text-slate-500 uppercase text-[10px] mt-1">{agencyInfo.name}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pihak Kedua (Penyedia)</p>
                          <p className="font-black uppercase text-slate-900">{selectedSpj.penyedia}</p>
                          <p className="text-slate-500">Pimpinan / Direktur Perusahaan</p>
                          <p className="text-slate-500">NPWP: {selectedSpj.npwpPenyedia || '-'}</p>
                          <p className="text-slate-500 italic text-[10px] mt-1 line-clamp-1">Alamat Sesuai Domisili Terdaftar</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="font-black text-sm uppercase bg-slate-900 text-white px-4 py-1 mb-4 inline-block">III. DATA PEKERJAAN & LINGKUP</h4>
                      <div className="bg-slate-100 p-6 rounded-3xl space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Nama Paket</span>
                          <div className="col-span-3 text-sm font-black uppercase text-slate-900">{selectedSpj.namaPaket}</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Lokasi</span>
                          <div className="col-span-3 font-bold text-slate-900">{selectedSpj.lokasiPekerjaan || 'Dinas / Sesuai Instruksi Kerja'}</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Lingkup</span>
                          <div className="col-span-3 text-slate-800 font-medium">
                            {selectedSpj.ruangLingkup || 'Pengadaan Barang/Jasa sesuai dengan rincian teknis yang tertuang dalam dokumen RAB dan SPK.'}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Waktu</span>
                          <div className="col-span-3 font-black">{(new Date(selectedSpj.tanggalSelesai).getTime() - new Date(selectedSpj.tanggalMulai).getTime()) / (1000 * 3600 * 24) || '...'} Hari Kalender</div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="font-black text-sm uppercase bg-slate-900 text-white px-4 py-1 mb-4 inline-block">IV. DATA NILAI & PEMBAYARAN</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                        <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Nilai Kontrak ({selectedSpj.statusPPN || 'Inc. PPN'})</span> <b className="text-slate-900 text-sm">{formatCurrency(selectedSpj.nilaiKontrak)}</b></p>
                        <p className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-400">Total PPN (11%)</span> 
                          <b className="text-slate-900">{formatCurrency(selectedSpj.nilaiPPN || 0)}</b>
                        </p>
                        <p className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-400">Total PPh</span> 
                          <b className="text-slate-900">{formatCurrency(selectedSpj.nilaiPPh || 0)}</b>
                        </p>
                        <div className="bg-slate-50 p-2 rounded-lg space-y-1">
                          {selectedSpj.nilaiPPh22 ? <p className="flex justify-between text-[10px]"><span className="text-slate-400 italic">PPh 22</span> <b>{formatCurrency(selectedSpj.nilaiPPh22)}</b></p> : null}
                          {selectedSpj.nilaiPPh23 ? <p className="flex justify-between text-[10px]"><span className="text-slate-400 italic">PPh 23</span> <b>{formatCurrency(selectedSpj.nilaiPPh23)}</b></p> : null}
                          {selectedSpj.nilaiPPh42 ? <p className="flex justify-between text-[10px]"><span className="text-slate-400 italic">PPh 4(2)</span> <b>{formatCurrency(selectedSpj.nilaiPPh42)}</b></p> : null}
                        </div>
                        <p className="flex justify-between border-b border-slate-100 pb-1 mt-2 font-black text-primary">
                          <span className="uppercase text-[9px]">Nilai Netto (Diterima)</span>
                          <span>{formatCurrency(selectedSpj.nilaiKontrak - (selectedSpj.statusPPh === 'Termasuk PPh' ? (selectedSpj.nilaiPPh || 0) : 0))}</span>
                        </p>
                        <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Sumber Dana</span> <b className="text-slate-900">APBD PROVINSI</b></p>
                        <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Kode Rekening / DPA</span> <b className="text-slate-900">{linked?.bel?.kode || '.../.../DPA/2026'}</b></p>
                        <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-400">Cara Pembayaran</span> <b className="text-slate-900">Lumpsum (LS)</b></p>
                      </div>
                    </section>

                    <section>
                      <h4 className="font-black text-sm uppercase bg-slate-900 text-white px-4 py-1 mb-4 inline-block">V. KETENTUAN KHUSUS (UPDATED)</h4>
                      <div className="space-y-3">
                        <div className="p-4 border-2 border-slate-100 rounded-2xl flex items-start gap-4">
                          <ShieldCheck className="text-indigo-500 shrink-0" size={20} />
                          <div>
                            <p className="font-black text-[11px] mb-1">Sanksi / Denda Keterlambatan</p>
                            <p className="text-[10px] text-slate-500">1/1000 (satu permil) dari total Nilai Kontrak untuk setiap hari keterlambatan pelaksanaan pekerjaan.</p>
                          </div>
                        </div>
                        <div className="p-4 border-2 border-slate-100 rounded-2xl flex items-start gap-4">
                          <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                          <div>
                            <p className="font-black text-[11px] mb-1">Jaminan & E-Purchasing</p>
                            <p className="text-[10px] text-slate-500">
                             {selectedSpj.metodePengadaan === 'E-purchasing' 
                               ? `Melalui Katalog Elektronik Pemerintah. Tautan ID Paket: https://e-katalog.lkpp.go.id/id/paket/${selectedSpj.id.slice(0,8)}` 
                               : "Masa Pemeliharaan selama 30 Hari Kalender setelah Serah Terima Pertama (BAST) Pekerjaan."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {viewingDoc === 'LaporanSPJ' && (
                <LaporanRealisasi agencyInfo={agencyInfo} packet={selectedSpj} />
              )}

              {viewingDoc === 'SPPBJ' && (
                <div className="space-y-10">
                  <div className="text-center font-serif">
                    <h1 className="text-xl font-black uppercase underline underline-offset-4 decoration-2">SURAT PENUNJUKAN PENYEDIA BARANG/JASA (SPPBJ)</h1>
                    <p className="text-sm font-bold mt-2">Nomor: {selectedSpj.nomorSPPBJ || selectedSpj.nomorBerkas?.replace('/SPB/', '/SPPBJ/') || '.../PA/SPPBJ/2026'}</p>
                    <p className="text-xs font-bold mt-1">Tanggal: {selectedSpj.tanggalSPPBJ ? formatDate(selectedSpj.tanggalSPPBJ) : formatDate(new Date().toISOString())}</p>
                  </div>

                  <div className="space-y-6 text-[13px] leading-relaxed text-justify font-medium">
                    <p className="font-bold underline">Kepada Yth:</p>
                    <div className="pl-4">
                      <p className="font-black uppercase">{selectedSpj.penyedia}</p>
                      <p className="text-xs">Di -</p>
                      <p className="text-xs font-bold uppercase">Tempat</p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-bold">Perihal: Penunjukan Penyedia untuk Pelaksanaan Paket Pekerjaan {selectedSpj.namaPaket.toUpperCase()}</p>
                    </div>

                    <p>
                      Dengan ini kami beritahukan bahwa penawaran Saudara untuk paket pekerjaan <b className="text-slate-900">{selectedSpj.namaPaket.toUpperCase()}</b>{" "}
                      dengan nilai kontrak sebesar <b className="text-slate-900">{formatCurrency(selectedSpj.nilaiKontrak)}</b> kami nyatakan diterima / ditunjuk sebagai penyedia barang/jasa.
                    </p>

                    <p>
                      Sebagai tindak lanjut dari Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) ini Saudara diharuskan untuk menandatangani Surat Perintah Kerja (SPK) 
                      paling lambat 14 (empat belas) hari kerja setelah diterbitkannya SPPBJ ini.
                    </p>

                    <p>
                      Kegagalan Saudara untuk menerima penunjukan ini yang disusun berdasarkan evaluasi yang transparan akan dikenakan sanksi sesuai ketentuan yang berlaku.
                    </p>

                    <p>
                      Demikian Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) ini dibuat untuk digunakan sebagaimana mestinya.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-20 text-center font-bold">
                    <div className="flex flex-col justify-between h-40">
                      {/* Empty for spacing */}
                    </div>
                    <div className="flex flex-col justify-between h-40">
                      <p className="text-[10px] uppercase">Palangka Raya, {selectedSpj.tanggalSPPBJ ? formatDate(selectedSpj.tanggalSPPBJ) : formatDate(new Date().toISOString())}<br />Ditetapkan Oleh:<br />{selectedSpj.paJabatan || 'PENGGUNA ANGGARAN (PA)'},</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6 relative">
                         <p className="text-xs uppercase underline">{selectedSpj.paNama || selectedSpj.pic || '...........................'}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter uppercase">NIP. {selectedSpj.paNip || selectedSpj.nipPic || '...........................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc === 'SPMK' && (
                <div className="space-y-10">
                  <div className="text-center font-serif">
                    <h1 className="text-xl font-black uppercase underline underline-offset-4 decoration-2">SURAT PERINTAH MULAI KERJA (SPMK)</h1>
                    <p className="text-sm font-bold mt-2">Nomor: {selectedSpj.nomorSPMK || selectedSpj.nomorBerkas?.replace('/SPB/', '/SPMK/') || '.../PA/SPMK/2026'}</p>
                    <p className="text-xs font-bold mt-1">Tanggal: {selectedSpj.tanggalSPMK ? formatDate(selectedSpj.tanggalSPMK) : formatDate(new Date().toISOString())}</p>
                  </div>

                  <div className="space-y-6 text-[13px] leading-relaxed text-justify font-medium">
                    <p className="font-bold underline">SURAT PERINTAH MULAI KERJA</p>
                    
                    <div className="space-y-2">
                      <p>Yang bertanda tangan di bawah ini:</p>
                      <div className="pl-4 space-y-1 grid grid-cols-3 gap-2">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Nama</span>
                        <div className="col-span-2">: <b className="uppercase">{selectedSpj.pic || '...........................'}</b></div>
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Jabatan</span>
                        <div className="col-span-2">: PENGGUNA ANGGARAN (PA)</div>
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Alamat</span>
                        <div className="col-span-2">: {agencyInfo.name}</div>
                      </div>
                      <p>Selanjutnya disebut sebagai Pengguna Anggaran;</p>
                    </div>

                    <div className="space-y-2">
                      <p>Berdasarkan Surat Perintah Kerja (SPK) Nomor: {selectedSpj.nomorKontrak || '...'} Tanggal {formatDate(selectedSpj.tanggalMulai)}, bersama ini memerintahkan kepada:</p>
                      <div className="pl-4 space-y-1 grid grid-cols-3 gap-2">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Nama Perusahaan</span>
                        <div className="col-span-2">: <b className="text-slate-900">{selectedSpj.penyedia}</b></div>
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Alamat</span>
                        <div className="col-span-2">: Sesuai Domisili Perusahaan</div>
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Pimpinan</span>
                        <div className="col-span-2">: DIREKTUR / PIMPINAN</div>
                      </div>
                      <p>Selanjutnya disebut sebagai Penyedia;</p>
                    </div>

                    <p>
                      Untuk segera memulai pelaksanaan pekerjaan <b className="text-slate-900">{selectedSpj.namaPaket.toUpperCase()}</b>{" "}
                      dengan memperhatikan ketentuan-ketentuan sebagai berikut:
                    </p>

                    <div className="pl-4 space-y-2 text-[11px] font-bold">
                       <p>1. Macam Pekerjaan: {selectedSpj.namaPaket.toUpperCase()}</p>
                       <p>2. Tanggal Mulai Kerja: {formatDate(selectedSpj.tanggalMulai)}</p>
                       <p>3. Waktu Penyelesaian: Sesuai masa pelaksanaan dalam Kontrak/SPK</p>
                    </div>

                    <p>
                      Sanksi: Terhadap keterlambatan pelaksanaan pekerjaan ini akan dikenakan sanksi denda sesuai dengan ketentuan dalam Syarat-Syarat Umum Kontrak.
                    </p>

                    <p>
                      Demikian Surat Perintah Mulai Kerja ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-20 text-center font-bold">
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] uppercase">Menerima dan Menyetujui,<br />Untuk dan Atas Nama :<br />{selectedSpj.penyedia},</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6">
                         <p className="text-xs uppercase underline">{selectedSpj.pimpinanPenyedia || 'DIREKTUR / PIMPINAN'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] uppercase">Dikeluarkan di: Palangka Raya<br />Pada Tanggal: {selectedSpj.tanggalSPMK ? formatDate(selectedSpj.tanggalSPMK) : formatDate(new Date().toISOString())}<br />{selectedSpj.paJabatan || 'PENGGUNA ANGGARAN (PA)'},</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6">
                         <p className="text-xs uppercase underline">{selectedSpj.paNama || selectedSpj.pic || '...........................'}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter uppercase">NIP. {selectedSpj.paNip || selectedSpj.nipPic || '...........................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc === 'BAST' && (
                <div className="space-y-10">
                  <div className="text-center font-serif">
                    <h1 className="text-xl font-black uppercase underline underline-offset-4 decoration-2">BERITA ACARA SERAH TERIMA (BAST)</h1>
                    <p className="text-sm font-bold mt-2">Nomor: {selectedSpj.nomorBerkas || '.../BAST/.../2026'}</p>
                  </div>

                  <div className="space-y-6 text-[13px] leading-relaxed text-justify font-medium">
                    <p>
                      Pada hari ini, <b className="text-slate-900">{new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date())}</b>, 
                      tanggal <b className="text-slate-900">{new Date().getDate()}</b> bulan <b className="text-slate-900">{new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date())}</b> tahun <b className="text-slate-900 font-bold">{new Date().getFullYear()}</b>, kami yang bertanda tangan di bawah ini:
                    </p>
                    
                    <div className="space-y-4 pl-4 border-l-2 border-slate-200">
                      <div className="grid grid-cols-4 gap-2">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Nama</span>
                        <div className="col-span-3">: <b className="text-slate-900 uppercase">DIREKTUR PERUSAHAAN / PIMPINAN</b></div>
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Jabatan</span>
                        <div className="col-span-3">: DIREKTUR / PIMPINAN</div>
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Perusahaan</span>
                        <div className="col-span-3">: <b className="text-slate-900">{selectedSpj.penyedia}</b></div>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selanjutnya disebut PIHAK PERTAMA (yang menyerahkan).</p>
                    </div>

                    <div className="space-y-4 pl-4 border-l-2 border-slate-200">
                      <div className="grid grid-cols-4 gap-2">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Nama</span>
                        <div className="col-span-3">: <b className="text-slate-900 uppercase">{selectedSpj.pic}</b></div>
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Jabatan</span>
                        <div className="col-span-3">: {selectedSpj.jabatanPic || 'Pejabat Pelaksana Teknis Kegiatan (PPTK)'}</div>
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Alamat/Instansi</span>
                        <div className="col-span-3">: <b className="text-slate-900 uppercase">{agencyInfo.name}</b></div>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selanjutnya disebut PIHAK KEDUA (yang menerima).</p>
                    </div>

                    <p>
                      PIHAK PERTAMA menyerahkan hasil pekerjaan kepada PIHAK KEDUA, dan PIHAK KEDUA telah menerima hasil pekerjaan dari PIHAK PERTAMA dalam keadaan baik dan lengkap sesuai dengan spesifikasi, dengan rincian sebagai berikut:
                    </p>
                    
                    <div className="border border-slate-900">
                      <table className="w-full text-[11px] font-bold border-collapse">
                        <thead className="bg-slate-50 uppercase border-b border-slate-900">
                          <tr className="text-center">
                            <th className="p-2 border-r border-slate-900 w-10">No</th>
                            <th className="p-2 border-r border-slate-900 text-left">Nama Barang / Pekerjaan</th>
                            <th className="p-2 border-r border-slate-900 w-16">Vol</th>
                            <th className="p-2 border-r border-slate-900 w-20">Satuan</th>
                            <th className="p-2">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {selectedSpj.rekapBelanja && selectedSpj.rekapBelanja.length > 0 ? (
                            selectedSpj.rekapBelanja.map((item, idx) => (
                              <tr key={item.id}>
                                <td className="p-2 border-r border-slate-900 text-center">{idx + 1}</td>
                                <td className="p-2 border-r border-slate-900 uppercase">{item.uraian}</td>
                                <td className="p-2 border-r border-slate-900 text-center">{item.volume}</td>
                                <td className="p-2 border-r border-slate-900 text-center uppercase">{item.satuan}</td>
                                <td className="p-2 text-center text-green-600">BAIK / LENGKAP</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="p-2 border-r border-slate-900 text-center">1</td>
                              <td className="p-2 border-r border-slate-900 uppercase">{selectedSpj.namaPaket}</td>
                              <td className="p-2 border-r border-slate-900 text-center">1</td>
                              <td className="p-2 border-r border-slate-900 text-center uppercase">Paket</td>
                              <td className="p-2 text-center text-green-600">BAIK / LENGKAP</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <p>
                      Demikian Berita Acara Serah Terima ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-20 text-center font-bold">
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] uppercase">PIHAK KEDUA (Penerima),</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6">
                         <p className="text-xs uppercase">{selectedSpj.pptkNama || selectedSpj.pic}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter">NIP. {selectedSpj.pptkNip || selectedSpj.nipPic || '...........................'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] uppercase">PIHAK PERTAMA (Penyerah),</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6 relative">
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-20 border border-slate-900 p-1 text-[8px] italic whitespace-nowrap">MATERAI 10.000</div>
                         <p className="text-xs uppercase">{selectedSpj.pimpinanPenyedia || 'DIREKTUR'} {selectedSpj.penyedia}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter italic">PIMPINAN PERUSAHAAN</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc === 'BAP' && (
                <div className="space-y-10">
                  <div className="text-center font-serif">
                    <h1 className="text-xl font-black uppercase underline underline-offset-4 decoration-2">BERITA ACARA PEMBAYARAN (BAP)</h1>
                    <p className="text-sm font-bold mt-2">Nomor: {selectedSpj.nomorBerkas ? selectedSpj.nomorBerkas.replace('/SPB/', '/BAP/') : '.../BAP/.../2026'}</p>
                  </div>

                  <div className="space-y-6 text-[12px] leading-relaxed text-justify">
                    <p>
                      Pada hari ini, <b className="text-slate-900">{new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date())}</b>, 
                      tanggal <b className="text-slate-900">{new Date().getDate()}</b> bulan <b className="text-slate-900">{new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date())}</b> tahun <b className="text-slate-900 font-bold">{new Date().getFullYear()}</b>, kami yang bertanda tangan di bawah ini :
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="p-4 border-2 border-slate-900 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Pihak Kedua (Penyedia)</p>
                          <div className="space-y-1">
                             <p className="text-xs font-black uppercase">{selectedSpj.penyedia}</p>
                             <p className="text-[10px]">{selectedSpj.npwpPenyedia || 'NPWP: -'}</p>
                             <p className="text-[10px] italic">Alamat Sesuai Domisili Perusahaan</p>
                          </div>
                       </div>
                       <div className="p-4 border-2 border-slate-900 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Pihak Pertama (PPTK)</p>
                          <div className="space-y-1">
                             <p className="text-xs font-black uppercase">{selectedSpj.pic}</p>
                             <p className="text-[10px]">NIP. {selectedSpj.nipPic || '-'}</p>
                             <p className="text-[10px] uppercase font-bold">{agencyInfo.name}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                      <p>Bahwa berdasarkan rincian pekerjaan di bawah ini:</p>
                      <div className="pl-4 space-y-1 font-bold text-slate-700">
                        <p>1. Nama Pekerjaan: {selectedSpj.namaPaket.toUpperCase()}</p>
                        <p>2. Nomor Kontrak/SPK: {selectedSpj.nomorKontrak || selectedSpj.nomorBerkas || '-'}</p>
                        <p>3. Berita Acara Serah Terima (BAST): {selectedSpj.nomorBerkas || '-'} Tanggal {formatDate(selectedSpj.tanggalSelesai)}</p>
                      </div>
                      <p>Maka dengan ini dinyatakan bahwa PIHAK KEDUA telah berhak menerima pembayaran dengan rincian sebagai berikut:</p>
                    </div>

                    <div className="border-2 border-slate-900 bg-slate-50 p-6 rounded-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 rotate-45 -mr-16 -mt-16" />
                       <div className="space-y-3 relative z-10">
                          <div className="flex justify-between items-center border-b border-slate-300 pb-2">
                             <span className="text-sm font-bold">NILAI KONTRAK ({selectedSpj.statusPPN || 'Inc. PPN'})</span>
                             <span className="text-sm font-black">{formatCurrency(selectedSpj.nilaiKontrak)}</span>
                          </div>
                          
                          <div className="space-y-1 pt-1">
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Nilai DPP (Dasar Pengenaan Pajak)</span>
                                <span>{formatCurrency(selectedSpj.statusPPN === 'Termasuk PPN' ? selectedSpj.nilaiKontrak / 1.11 : selectedSpj.nilaiKontrak)}</span>
                             </div>
                             {selectedSpj.nilaiPPN ? (
                               <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Pajak Pertambahan Nilai (PPN 11%)</span>
                                <span className="text-blue-600 font-bold">{formatCurrency(selectedSpj.nilaiPPN)}</span>
                               </div>
                             ) : null}
                          </div>

                          <div className="pt-3 border-t border-slate-300 space-y-1">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rincian Potongan Pajak Penghasilan (PPh)</p>
                             {selectedSpj.nilaiPPh21 ? (
                               <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 italic">PPh Pasal 21 (Gaji/Upah/Jasa Orang Pribadi)</span>
                                <span className="text-orange-600 font-bold">{formatCurrency(selectedSpj.nilaiPPh21)}</span>
                               </div>
                             ) : null}
                             {selectedSpj.nilaiPPh22 ? (
                               <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 italic">PPh Pasal 22 (Barang)</span>
                                <span className="text-orange-600 font-bold">{formatCurrency(selectedSpj.nilaiPPh22)}</span>
                               </div>
                             ) : null}
                             {selectedSpj.nilaiPPh23 ? (
                               <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 italic">PPh Pasal 23 (Jasa)</span>
                                <span className="text-orange-600 font-bold">{formatCurrency(selectedSpj.nilaiPPh23)}</span>
                               </div>
                             ) : null}
                             {selectedSpj.nilaiPPh42 ? (
                               <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 italic">PPh Pasal 4(2) (Sewa/Konstruksi)</span>
                                <span className="text-orange-600 font-bold">{formatCurrency(selectedSpj.nilaiPPh42)}</span>
                               </div>
                             ) : null}
                          </div>

                          <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center text-lg font-black bg-white -mx-6 -mb-6 p-6 mt-4">
                             <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Jumlah Bersih Yang Diterima (NETTO)</span>
                                <span className="text-primary tracking-tighter">{formatCurrency(selectedSpj.nilaiKontrak - (selectedSpj.statusPPh === 'Termasuk PPh' ? (selectedSpj.nilaiPPh || 0) : 0))}</span>
                             </div>
                             <div className="text-right">
                                <p className="text-[8px] font-bold text-slate-400 italic mb-1 uppercase">Terbilang:</p>
                                <p className="text-[10px] font-black italic uppercase leading-tight max-w-[250px]">{terbilang(selectedSpj.nilaiKontrak - (selectedSpj.statusPPh === 'Termasuk PPh' ? (selectedSpj.nilaiPPh || 0) : 0))} RUPIAH</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="p-5 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Plus size={12} /> Instruksi Pembayaran (Rekening Vendor)
                       </h5>
                       <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: 'Bank', value: selectedSpj.bankPenyedia || '-' },
                            { label: 'Nomor Rekening', value: selectedSpj.rekeningPenyedia || '-' },
                            { label: 'Atas Nama', value: selectedSpj.penyedia },
                          ].map((item, i) => (
                            <div key={i}>
                               <p className="text-[8px] font-black text-slate-400 uppercase">{item.label}</p>
                               <p className="text-[11px] font-black text-slate-900">{item.value}</p>
                            </div>
                          ))}
                       </div>
                    </div>

                    <p className="italic text-[11px] text-slate-500 leading-relaxed pt-4">
                       Demikian Berita Acara Pembayaran ini dibuat dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya sebagai dasar pengajuan Surat Perintah Membayar (SPM).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-20 text-center font-black">
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] uppercase">PIHAK KEDUA (Penyedia),</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6 relative">
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-20 border border-slate-900 p-1 text-[8px] italic whitespace-nowrap">MATERAI 10.000</div>
                         <p className="text-xs uppercase italic underline">{selectedSpj.pimpinanPenyedia || 'DIREKTUR / PIMPINAN'}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter uppercase">{selectedSpj.penyedia}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-48">
                      <p className="text-[10px] uppercase">Palangka Raya, {formatDate(new Date().toISOString())}<br />MENYETUJUI PEMBAYARAN: <br />{selectedSpj.paJabatan || 'PENGGUNA ANGGARAN (PA)'},</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6">
                         <p className="text-xs uppercase underline underline-offset-2">{selectedSpj.paNama || '...........................'}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter uppercase">NIP. {selectedSpj.paNip || '...........................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc === 'SPP' && (
                <div className="space-y-10">
                  <div className="text-center font-serif">
                    <h1 className="text-xl font-black uppercase underline underline-offset-4 decoration-2">SURAT PERMINTAAN PEMBAYARAN (SPP)</h1>
                    <p className="text-sm font-bold mt-2">Nomor: {selectedSpj.nomorBerkas ? selectedSpj.nomorBerkas.replace('/SPB/', '/SPP/') : '.../SPP/.../2026'}</p>
                  </div>

                  <div className="space-y-6 text-[12px] leading-tight">
                    <p className="text-justify font-medium">Berdasarkan Surat Perintah Kerja (SPK) Nomor {selectedSpj.nomorKontrak || selectedSpj.nomorBerkas || '-'}, dengan ini kami mengajukan permintaan pembayaran atas pelaksanaan pekerjaan <b className="text-slate-900">"{selectedSpj.namaPaket}"</b> yang telah diselesaikan oleh <b className="text-slate-900">{selectedSpj.penyedia}</b> sesuai dengan Berita Acara Serah Terima Nomor {selectedSpj.nomorBerkas || '-'} tanggal {formatDate(selectedSpj.tanggalSelesai)}.</p>
                    
                    <div className="border-2 border-slate-900 p-6 space-y-4">
                      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2 font-bold">
                        <span>1. Jumlah Pagu Anggaran</span><div className="col-span-2">: {formatCurrency(selectedSpj.paguAnggaran)}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2 font-bold">
                        <span>2. Realisasi Sebelumnya</span><div className="col-span-2">: Rp 0,00 (Nihil)</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2 font-bold">
                        <span>3. Permintaan Saat Ini</span><div className="col-span-2 text-primary">: {formatCurrency(selectedSpj.nilaiKontrak)}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-bold">
                        <span>4. Sisa Anggaran</span><div className="col-span-2">: {formatCurrency(selectedSpj.paguAnggaran - selectedSpj.nilaiKontrak)}</div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Potongan Pajak Dasar SPP:</p>
                      <div className="grid grid-cols-2 gap-4 text-[11px] font-bold">
                        <p>PPN (11%): {formatCurrency(selectedSpj.nilaiPPN || 0)}</p>
                        <p>PPh (Potongan): {formatCurrency(selectedSpj.nilaiPPh || 0)}</p>
                      </div>
                    </div>

                    <p className="italic text-slate-500 font-medium">Surat Permintaan Pembayaran ini diajukan untuk proses verifikasi lebih lanjut oleh Bagian Keuangan sebagai dasar penerbitan Surat Perintah Membayar (SPM).</p>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-16 text-center font-black">
                    <div className="flex flex-col justify-between h-40">
                      <p className="text-[10px] uppercase">Mengetahui,<br />{selectedSpj.bendaharaJabatan || 'Bendahara Pengeluaran'},</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6 relative">
                         <p className="text-xs uppercase underline">{selectedSpj.bendaharaNama || '...........................'}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter uppercase">NIP. {selectedSpj.bendaharaNip || '...........................'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-40">
                      <p className="text-[10px] uppercase">Palangka Raya, {formatDate(new Date().toISOString())}<br />{selectedSpj.pptkJabatan || 'PPTK'},</p>
                      <div className="border-t-2 border-slate-900 pt-2 mx-6">
                         <p className="text-xs uppercase underline underline-offset-2">{selectedSpj.pptkNama || selectedSpj.pic}</p>
                         <p className="text-[9px] text-slate-500 font-medium tracking-tighter uppercase">NIP. {selectedSpj.pptkNip || selectedSpj.nipPic || '...........................'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingDoc === 'SPM' && (
                <div className="space-y-10">
                  <div className="text-center font-serif">
                    <h1 className="text-xl font-black uppercase underline underline-offset-4 decoration-2">SURAT PERINTAH MEMBAYAR (SPM)</h1>
                    <p className="text-sm font-bold mt-2">Nomor: {selectedSpj.nomorBerkas ? selectedSpj.nomorBerkas.replace('/SPB/', '/SPM/') : '.../SPM/.../2026'}</p>
                  </div>

                  <div className="space-y-6 text-[12px] leading-tight">
                    <div className="grid grid-cols-4 gap-2 font-bold mb-4">
                      <span>KEPADA</span><div className="col-span-3">: BENDAHARA PENGELUARAN {agencyInfo.name.toUpperCase()}</div>
                      <span>HARAP DIBAYAR</span><div className="col-span-3">: <b className="text-slate-900 font-black">{formatCurrency(selectedSpj.nilaiKontrak - (selectedSpj.statusPPh === 'Termasuk PPh' ? (selectedSpj.nilaiPPh || 0) : 0))}</b></div>
                      <span>TERBILANG</span><div className="col-span-3 italic">: # {terbilang(selectedSpj.nilaiKontrak - (selectedSpj.statusPPh === 'Termasuk PPh' ? (selectedSpj.nilaiPPh || 0) : 0))} RUPIAH #</div>
                    </div>

                    <div className="border-2 border-slate-900">
                       <div className="p-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">Rincian Pembayaran (Netto)</div>
                       <div className="p-4 space-y-2 font-bold">
                          <div className="flex justify-between border-b border-slate-100 pb-1"><span>Nilai Bruto Kontrak</span><span>{formatCurrency(selectedSpj.nilaiKontrak)}</span></div>
                          <div className="flex justify-between border-b border-slate-100 pb-1"><span>Potongan PPN</span><span className="text-blue-600">({formatCurrency(selectedSpj.nilaiPPN || 0)})</span></div>
                          <div className="flex justify-between border-b border-slate-200 pb-1"><span>Potongan PPh</span><span className="text-orange-600">({formatCurrency(selectedSpj.nilaiPPh || 0)})</span></div>
                          <div className="flex justify-between text-primary pt-1"><span>JUMLAH BERSIH (SPM)</span><span>{formatCurrency(selectedSpj.nilaiKontrak - (selectedSpj.nilaiPPN || 0) - (selectedSpj.nilaiPPh || 0))}</span></div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                       <div className="p-4 border border-slate-300 rounded-xl space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Data Penyedia (Pihak III)</p>
                          <p className="text-xs font-black uppercase text-slate-900">{selectedSpj.penyedia}</p>
                          <p className="text-[10px] font-bold">Bank: {selectedSpj.bankPenyedia || '-'}</p>
                          <p className="text-[10px] font-bold">No. Rek: {selectedSpj.rekeningPenyedia || '-'}</p>
                       </div>
                       <div className="p-4 border border-slate-300 rounded-xl space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Mata Anggaran (Kode)</p>
                          <p className="text-xs font-black text-slate-900">{selectedSpj.nomorBerkas || 'Penyediaan Jasa'}</p>
                          <p className="text-[10px] font-bold uppercase">{selectedSpj.namaPaket}</p>
                       </div>
                    </div>
                  </div>

                  <div className="mt-20 flex flex-col items-center text-center font-black">
                    <p className="text-[10px] uppercase mb-16">Ditetapkan di Palangka Raya, {formatDate(new Date().toISOString())}<br />{selectedSpj.paJabatan || 'PENGGUNA ANGGARAN (PA)'},</p>
                    <div className="border-t-2 border-slate-900 pt-2 px-12 relative min-w-[300px]">
                        <p className="text-xs uppercase underline underline-offset-4">{selectedSpj.paNama || '...........................'}</p>
                        <p className="text-[10px] text-slate-500 font-medium tracking-tighter uppercase mt-1">NIP. {selectedSpj.paNip || '...........................'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-20 pt-6 border-t border-slate-100 text-[10px] font-black text-slate-300 uppercase tracking-widest flex justify-between">
                <span>Verified by SPJ Digital Blockchain v2.0</span>
                <span>ID: {selectedSpj.id}-{viewingDoc}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
