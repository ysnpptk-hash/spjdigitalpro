import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function terbilang(n: number): string {
  const ammount = Math.abs(n);
  const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let result = "";

  if (ammount < 12) result = words[ammount];
  else if (ammount < 20) result = terbilang(ammount - 10) + " Belas";
  else if (ammount < 100) result = terbilang(Math.floor(ammount / 10)) + " Puluh " + terbilang(ammount % 10);
  else if (ammount < 200) result = " Seratus " + terbilang(ammount - 100);
  else if (ammount < 1000) result = terbilang(Math.floor(ammount / 100)) + " Ratus " + terbilang(ammount % 100);
  else if (ammount < 2000) result = " Seribu " + terbilang(ammount - 1000);
  else if (ammount < 1000000) result = terbilang(Math.floor(ammount / 1000)) + " Ribu " + terbilang(ammount % 1000);
  else if (ammount < 1000000000) result = terbilang(Math.floor(ammount / 1000000)) + " Juta " + terbilang(ammount % 1000000);
  else if (ammount < 1000000000000) result = terbilang(Math.floor(ammount / 1000000000)) + " Miliar " + terbilang(ammount % 1000000000);
  else if (ammount < 1000000000000000) result = terbilang(Math.floor(ammount / 1000000000000)) + " Triliun " + terbilang(ammount % 1000000000000);

  return result.replace(/\s+/g, ' ').trim();
}
