import type { Package } from '../types';

export const PACKAGES: Package[] = [
  { id: 'pkg-satuan', name: 'Satuan', qty: 1, unitPrice: 265000, totalPrice: 265000, tag: 'Eceran Resmi', desc: '1 Pcs Produk Resmi Bebas Pilih' },
  { id: 'pkg-family', name: 'Family', qty: 3, unitPrice: 240000, totalPrice: 720000, tag: 'Hemat Rp 75.000', desc: '3 Pcs Bebas Campur Varian BP Group' },
  { id: 'pkg-agent', name: 'Agent', qty: 5, unitPrice: 225000, totalPrice: 1125000, tag: 'Paket Usaha Pemula', desc: '5 Pcs untuk Mulai Kemitraan Reseller' },
  { id: 'pkg-ap', name: 'Agent Plus (AP)', qty: 10, unitPrice: 210000, totalPrice: 2100000, tag: 'Paling Populer', desc: '10 Pcs Margin Keuntungan Lebih Tinggi' },
  { id: 'pkg-sap', name: 'Special Agent Plus (SAP)', qty: 40, unitPrice: 195000, totalPrice: 7800000, tag: 'Grosir Agen Wilayah', desc: '40 Pcs Modal Lebih Hemat & Cepat Balik Modal' },
  { id: 'pkg-se', name: 'Special Entrepreneur (SE)', qty: 200, unitPrice: 175000, totalPrice: 35000000, tag: 'Distributor VIP', desc: '200 Pcs Skala Distributor Terbesar' }
];
