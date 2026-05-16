/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ShoppingItem {
  id: string;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
}

export interface Packet {
  id: string;
  no: number;
  namaPaket: string;
  kategori: string;
  paguAnggaran: number;
  nilaiKontrak: number;
  tanggalMulai: string;
  tanggalSelesai: string;
  progressFisik: number;
  statusDokumen: 'Draft' | 'Proses' | 'Selesai' | 'Revisi';
  pic: string;
  nipPic?: string;
  jabatanPic?: string;
  pangkatPic?: string;
  // Official Roles
  paNama?: string;
  paNip?: string;
  paJabatan?: string;
  paPangkat?: string;
  pptkNama?: string;
  pptkNip?: string;
  pptkJabatan?: string;
  pptkPangkat?: string;
  bendaharaNama?: string;
  bendaharaNip?: string;
  bendaharaJabatan?: string;
  bendaharaPangkat?: string;
  // Vendor Details
  penyedia: string;
  pimpinanPenyedia?: string;
  alamatPenyedia?: string;
  npwpPenyedia?: string;
  bankPenyedia?: string;
  rekeningPenyedia?: string;
  teleponPenyedia?: string;
  emailPenyedia?: string;
  metodePengadaan?: 'E-purchasing' | 'Tender' | 'Pengadaan Langsung' | 'Penunjukan Langsung' | 'Swakelola';
  regulasiAcuan?: string;
  nomorBerkas?: string;
  nomorKontrak?: string;
  nomorSPPBJ?: string;
  nomorSPMK?: string;
  tanggalSPPBJ?: string;
  tanggalSPMK?: string;
  statusPPN?: 'Termasuk PPN' | 'Diluar PPN';
  statusPPh?: 'Termasuk PPh' | 'Diluar PPh';
  jenisPPh?: '21' | '22' | '23' | '4(2)';
  usePPN?: boolean;
  usePPh21?: boolean;
  usePPh22?: boolean;
  usePPh23?: boolean;
  usePPh42?: boolean;
  nilaiPPN?: number;
  nilaiPPh?: number;
  nilaiPPh21?: number;
  nilaiPPh22?: number;
  nilaiPPh23?: number;
  nilaiPPh42?: number;
  rekapBelanja?: ShoppingItem[];
  tenagaAhli?: string;
  ruangLingkup?: string;
  lokasiPekerjaan?: string;
  merkType?: string;
  belanjaId?: string; // Link to Database Anggaran
  progId?: string;
  kegId?: string;
  subId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentType = 'RAB' | 'Kwitansi' | 'SuratPesanan' | 'Kontrak' | 'Ringkasan' | 'BAST' | 'LaporanSPJ' | 'BAP' | 'SPPBJ' | 'SPMK' | 'SPP' | 'SPM' | null;

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
  assignedTo?: string; // Employee ID
}

export interface SPJChecklist {
  spjId: string;
  items: ChecklistItem[];
  updatedAt: string;
}

export interface Belanja {
  id: string;
  kode: string;
  uraian: string;
  volume?: number;
  satuan?: string;
  hargaSatuan?: number;
  pagu: number;
  realisasi: number;
}

export interface SubKegiatan {
  id: string;
  kode: string;
  nama: string;
  pagu: number;
  realisasi?: number;
  assignedTo?: string; // Departemen/Grup yang berwenang
  belanja: Belanja[];
}

export interface Kegiatan {
  id: string;
  kode: string;
  nama: string;
  pagu: number;
  realisasi?: number;
  assignedTo?: string; // Departemen/Grup yang berwenang
  subKegiatan: SubKegiatan[];
}

export interface Program {
  id: string;
  kode: string;
  nama: string;
  pagu: number;
  realisasi?: number;
  kegiatan: Kegiatan[];
}

export interface Employee {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  pangkatGolongan?: string;
}

export interface Vendor {
  id: string;
  namaPenyedia: string;
  namaPimpinan: string;
  alamat: string;
  npwp: string;
  bank: string;
  nomorRekening: string;
  telepon: string;
  email: string;
  kategori: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  nama: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Pengguna';
  status: 'Aktif' | 'Non-Aktif';
  departemen?: string;
}

export type ActiveTab = 'dashboard' | 'database_spj' | 'database_anggaran' | 'kalkulator_pajak' | 'laporan_realisasi' | 'checklist' | 'database_pegawai' | 'database_vendor' | 'database_user' | 'settings';
