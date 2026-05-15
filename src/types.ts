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
  penyedia: string;
  npwpPenyedia?: string;
  bankPenyedia?: string;
  rekeningPenyedia?: string;
  paguAnggaran: number;
  nilaiKontrak: number;
  tanggalMulai: string;
  tanggalSelesai: string;
  progressFisik: number;
  statusDokumen: 'Draft' | 'Proses' | 'Selesai' | 'Revisi';
  pic: string;
  nipPic?: string;
  jabatanPic?: string;
  metodePengadaan?: 'E-purchasing' | 'Tender' | 'Pengadaan Langsung' | 'Penunjukan Langsung' | 'Swakelola';
  regulasiAcuan?: string;
  nomorBerkas?: string;
  nomorKontrak?: string;
  rekapBelanja?: ShoppingItem[];
  belanjaId?: string; // Link to Database Anggaran
  progId?: string;
  kegId?: string;
  subId?: string;
}

export type DocumentType = 'RAB' | 'Kwitansi' | 'SuratPesanan' | 'Kontrak' | 'Ringkasan' | 'BAST' | 'LaporanSPJ' | null;

export interface SPJChecklist {
  suratPengantar: boolean;
  spp: boolean;
  sptjb: boolean;
  spk: boolean;
  ringkasanKontrak: boolean;
  laporanNaratif: boolean;
  rincianRealisasi: boolean;
  kuitansiNota: boolean;
  fakturPajak: boolean;
  dokumentasi: boolean;
  bast: boolean;
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
  assignedTo?: string; // Departemen/Grup yang berwenang
  belanja: Belanja[];
}

export interface Kegiatan {
  id: string;
  kode: string;
  nama: string;
  pagu: number;
  assignedTo?: string; // Departemen/Grup yang berwenang
  subKegiatan: SubKegiatan[];
}

export interface Program {
  id: string;
  kode: string;
  nama: string;
  pagu: number;
  kegiatan: Kegiatan[];
}

export interface Employee {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  pangkatGolongan?: string;
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

export type ActiveTab = 'dashboard' | 'database_spj' | 'database_anggaran' | 'kalkulator_pajak' | 'laporan_realisasi' | 'checklist' | 'database_pegawai' | 'database_user' | 'settings';
