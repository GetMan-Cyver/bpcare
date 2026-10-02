# BPCareU - Official Store (Astro Framework)

Landing page & e-commerce resmi produk BP Group (British Propolis Dewasa, Green Kids, Steffi Stevia, Brassic Eye, Brassic Pro, dan BP Norway) yang dimigrasikan ke **Astro Framework** modern dengan TypeScript dan Tailwind CSS.

---

## 🚀 Fitur Utama & Arsitektur

1. **Astro Framework (v7.x / Modern Static Site Generation)**
   - Performa loading ultra-cepat berkat *zero-JS by default* untuk komponen presentasional.
   - Pre-rendering statis untuk seluruh katalog produk & paket kemitraan (SEO & Core Web Vitals optimal).
   - Arsitektur berbasis komponen modular di `src/components/` dan layout terpadu di `src/layouts/Layout.astro`.

2. **Katalog Produk & Kemitraan Reseller**
   - 6 Produk resmi BP Group dengan data terstruktur di `src/data/products.ts`.
   - 6 Paket harga kemitraan (Satuan, Family 3 pcs, Agent 5 pcs, Agent Plus 10 pcs, Special Agent Plus 40 pcs, Special Entrepreneur 200 pcs) di `src/data/packages.ts`.
   - Filter interaktif berdasarkan kategori (`propolis`, `stevia`, `specialty`).

3. **Keranjang Belanja (Slide-over Cart Drawer)**
   - Pengelolaan keranjang real-time (tambah item produk/paket, ubah kuantitas, hapus item).
   - Sinkronisasi otomatis dengan `localStorage`.
   - Hitungan subtotal & total harga secara akurat dalam Rupiah (`id-ID`).

4. **Checkout Form WhatsApp & Anti-Spam Honeypot**
   - Validasi nomor WhatsApp format Indonesia (`08xx`, `+628xx`, `628xx`).
   - Input perangkap bot *honeypot* untuk menolak order otomatis spammer.
   - Pembuatan pesan pesanan terstruktur otomatis dan pengalihan ke WhatsApp CS.

5. **Kalkulator Kebutuhan Dosis Propolis**
   - Algoritma perhitungan dosis ilmiah berdasarkan berat badan (1 tetes per 10 kg).
   - Rekomendasi otomatis varian produk (Dewasa vs Green Kids), takaran tetes, dan frekuensi minum (stamina, pemulihan, atau keluhan kronis).

6. **Portal Admin & Proteksi Keamanan Terpadu**
   - **Anti-Brute Force Lockout**: Pembekuan akses otomatis 60 detik jika salah memasukkan password sebanyak 5 kali berturut-turut dengan live countdown timer.
   - **Dashboard Admin 3 Tab**:
     1. *Katalog Produk*: Operasi CRUD (Tambah, Edit, dan Arsipkan/Soft Delete produk).
     2. *Keamanan*: Ganti password admin, tabel kredensial, dan status sesi.
     3. *Konfigurasi Google Sheets*: Integrasi Web App URL Google Apps Script dan pengujian koneksi database dua arah.

---

## 📁 Struktur Direktori

```
bp-astro/
├── src/
│   ├── components/            # Komponen modular Astro
│   │   ├── TopBar.astro
│   │   ├── Navbar.astro
│   │   ├── Hero.astro
│   │   ├── TrustBadges.astro
│   │   ├── ProductCatalog.astro
│   │   ├── PackagePricing.astro
│   │   ├── DosageCalculator.astro
│   │   ├── Features.astro
│   │   ├── FAQ.astro
│   │   ├── Footer.astro
│   │   ├── ProductDetailModal.astro
│   │   ├── CartDrawer.astro
│   │   ├── CheckoutModal.astro
│   │   ├── AdminLoginModal.astro
│   │   ├── AdminDashboardModal.astro
│   │   ├── ProductFormModal.astro
│   │   ├── DeleteConfirmModal.astro
│   │   └── Toast.astro
│   ├── data/                  # Data statis & tipe
│   │   ├── packages.ts
│   │   └── products.ts
│   ├── layouts/
│   │   └── Layout.astro       # Base HTML, SEO & OpenGraph
│   ├── scripts/
│   │   └── app.ts             # Logika interaktif TypeScript klien
│   ├── styles/
│   │   └── global.css         # Tailwind v4 & tema custom BPCareU
│   ├── types/
│   │   └── index.ts           # Definisi interface TypeScript
│   └── pages/
│       └── index.astro        # Halaman utama landing page
├── tests/
│   └── app.test.ts            # Test suite Vitest (15 uji lolos)
├── astro.config.mjs           # Konfigurasi Astro + Tailwind Vite Plugin
├── package.json
└── tsconfig.json
```

---

## 🛠️ Perintah Pengoperasian

| Perintah | Deskripsi |
| :--- | :--- |
| `pnpm dev` | Menjalankan server pengembangan lokal |
| `pnpm build` | Membangun artefak produksi statis ke folder `dist/` |
| `pnpm preview` | Meninjau hasil build produksi secara lokal |
| `pnpm check` | Melakukan verifikasi diagnostik tipe Astro & TypeScript |
| `pnpm test` | Menjalankan seluruh test suite unit & logika bisnis Vitest |

---

## 🔒 Informasi Kredensial Default
- **Password / API Key Admin Default**: `PROPOLIS_SECRET_ADMIN_KEY_2026`
- **Nomor CS WhatsApp**: `6281288889999`
