import type { CartItem } from '../types';

export function formatIDR(amount: number): string {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

export function calculateCartTotals(cart: CartItem[]): { totalItems: number; subtotal: number } {
  const totalItems = cart.reduce((acc, item) => acc + (item.qty || 0), 0);
  const subtotal = cart.reduce((acc, item) => acc + ((item.price || 0) * (item.qty || 0)), 0);
  return { totalItems, subtotal };
}

export function validateIndonesianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-()]+/g, '');
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
  return phoneRegex.test(cleanPhone);
}

export function buildWhatsAppOrderMessage(params: {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  cart: CartItem[];
  subtotal: number;
}): string {
  const { name, phone, address, notes, cart, subtotal } = params;
  const itemsText = cart
    .map((i, idx) => `${idx + 1}. ${i.name} (${i.qty}x) = ${formatIDR(i.price * i.qty)}`)
    .join('\n');

  return (
    `*FORMAT PESANAN RESMI BPCAREU*\n` +
    `-----------------------------------------\n` +
    `*Nama Pemesan:* ${name}\n` +
    `*Nomor WhatsApp:* ${phone}\n` +
    `*Alamat Tujuan:* ${address}\n` +
    (notes ? `*Catatan Khusus:* ${notes}\n` : '') +
    `-----------------------------------------\n` +
    `*Daftar Produk Pesanan:*\n${itemsText}\n` +
    `-----------------------------------------\n` +
    `*Total Tagihan:* ${formatIDR(subtotal)}\n\n` +
    `Mohon segera diproses dan informasikan ongkos kirim serta rekening resmi pembayaran. Terima kasih!`
  );
}
