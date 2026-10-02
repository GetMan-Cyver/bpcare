import type { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'bp-reguler',
    name: 'British Propolis Regular (Dewasa)',
    category: 'propolis',
    badge: 'Best Seller',
    price: 265000,
    volume: '6 ml (±120 tetes)',
    bpom: 'POM TR 183610771',
    status: 'active',
    image: 'https://down-id.img.susercontent.com/file/id-11134207-81ztm-mq6i019inpqab5.webp',
    shortDesc: 'Konsentrat bioflavonoid 4x lebih tinggi untuk imunitas, stamina, kolesterol, dan diabetes.',
    description: 'Diformulasikan khusus untuk usia di atas 12 tahun dan dewasa. Mengandung bioflavonoid murni dari lebah Inggris pilihan yang diproses dengan teknologi mutakhir. Berkhasiat membantu pemulihan luka, memperkuat sistem kekebalan tubuh, menurunkan kadar asam urat serta menstabilkan gula darah.',
    benefits: [
      'Mempercepat regenerasi sel dan pemulihan stamina',
      'Membantu meredakan nyeri asam urat, kolesterol & maag',
      'Tingkat bioflavonoid 4x lebih pekat dibanding propolis biasa',
      '100% Halal MUI & Bebas Alkohol'
    ],
    usage: 'Teteskan 4-6 tetes ke dalam 1/3 gelas air hangat kuku. Aduk merata menggunakan sendok non-logam. Minum 2 kali sehari saat perut kosong.'
  },
  {
    id: 'bp-green',
    name: 'British Propolis Green Kids',
    category: 'propolis',
    badge: 'Favorit Ibu & Anak',
    price: 265000,
    volume: '6 ml (±120 tetes)',
    bpom: 'POM TR 193631981',
    status: 'active',
    image: 'https://down-id.img.susercontent.com/file/id-11134207-81ztj-mq4i4nywrlzj63.webp',
    shortDesc: 'Diformulasikan khusus untuk anak 1-12 tahun, mendukung kecerdasan, nafsu makan & daya tahan tubuh.',
    description: 'Kaya akan vitamin, mineral dan bioflavonoid alami yang diracik khusus agar lembut dan nyaman di lambung anak. Membantu mempercepat masa pemulihan saat demam, batuk pilek, meningkatkan nafsu makan, serta menunjang konsentrasi belajar anak.',
    benefits: [
      'Meningkatkan daya tahan tubuh anak dari flu & batuk',
      'Membantu meningkatkan nafsu makan anak secara alami',
      'Menunjang konsentrasi dan kecerdasan daya ingat otak',
      'Rasa yang ramah dan mudah diterima anak'
    ],
    usage: 'Teteskan 2-3 tetes ke dalam air hangat atau campur dengan madu/jus buah kesukaan anak. Minum 1-2 kali sehari.'
  },
  {
    id: 'bp-steffi',
    name: 'Steffi Pro Natural Sweetener',
    category: 'stevia',
    badge: '0 Kalori Bebas Gula',
    price: 265000,
    volume: '30 ml (±350 tetes)',
    bpom: 'P-IRT / Halal MUI',
    status: 'active',
    image: 'https://down-id.img.susercontent.com/file/id-11134207-7r98o-lz49xldzcsf2bf.webp',
    shortDesc: 'Pemanis alami ekstrak daun Stevia 0 Kalori. Pengganti gula pasir aman bagi penderita diabetes.',
    description: 'Pemanis alami tetes dari daun Stevia Rebaudiana bermutu tinggi. Memiliki Indeks Glikemik 0 (Zero Glycemic Index) sehingga tidak memicu lonjakan kadar gula darah. Sangat cocok bagi penderita diabetes, pelaku diet Keto/rendah kalori, dan pencegahan obesitas tanpa aftertaste pahit.',
    benefits: [
      '0 Kalori & 0 Karbohidrat, ramah gula darah',
      '1-2 tetes setara dengan manis 2 sendok teh gula pasir',
      'Bebas rasa getir/pahit di lidah',
      'Praktis untuk teh, kopi, jus, oatmeal, dan aneka masakan'
    ],
    usage: 'Teteskan 1-2 tetes ke dalam 200 ml minuman atau masakan favorit Anda.'
  },
  {
    id: 'bp-brassic-eye',
    name: 'Brassic Eye (Nutrisi Mata & Retina)',
    category: 'specialty',
    badge: 'Herbal Mata Lelah',
    price: 265000,
    volume: 'Botol Kapsul',
    bpom: 'POM TR 203342551',
    status: 'active',
    image: 'https://down-id.img.susercontent.com/file/id-11134207-7rasg-m4exo7b1yyjy83.webp',
    shortDesc: 'Ekstrak Bilberry & Cynara scolymus untuk memelihara kesehatan mata dari radiasi gadget.',
    description: 'Herbal spesial BP Group yang diformulasikan khusus dengan ekstrak Bilberry dan bahan alami terpilih. Berkhasiat melindungi saraf mata, meringankan keluhan mata minus/plus, mata lelah akibat paparan layar gawai (komputer/HP), serta mencegah katarak dini.',
    benefits: [
      'Meringankan mata lelah, kering, dan perih akibat radiasi monitor',
      'Membantu menutrisi retina dan mempertajam penglihatan',
      'Mengandung antioksidan antosianin bilberry konsentrasi tinggi',
      'Izin edar resmi terdaftar di BPOM RI'
    ],
    usage: 'Diminum 2 kali sehari sebanyak 1-2 kapsul setelah makan.'
  },
  {
    id: 'bp-brassic-pro',
    name: 'Brassic Pro (Sendi, Otot & Pegal)',
    category: 'specialty',
    badge: 'Solusi Sendi Sehat',
    price: 265000,
    volume: 'Botol Kapsul',
    bpom: 'POM TR 203342371',
    status: 'active',
    image: 'https://down-id.img.susercontent.com/file/id-11134207-7rbkd-m659aluqkjra13.webp',
    shortDesc: 'Formulasi herbal sinergis untuk meredakan nyeri persendian, asam urat, pinggang dan rematik.',
    description: 'Kombinasi herbal antiinflamasi alami yang berkhasiat membantu melumasi persendian, meredakan nyeri linu, kaku sendi, radang tulang, dan kebas pada kaki/tangan. Sangat disarankan bagi usia produktif maupun lansia aktif.',
    benefits: [
      'Meredakan radang sendi, sakit lutut, dan nyeri pinggang',
      'Membantu menurunkan penumpukan kristal asam urat',
      'Melancarkan peredaran darah di area otot dan persendian',
      'Aman di lambung dengan pengawasan mutu ketat'
    ],
    usage: 'Diminum 2 kali sehari sebanyak 1-2 kapsul secara teratur setelah makan.'
  },
  {
    id: 'bp-norway',
    name: 'BP Norway (Pure Salmon Fish Oil)',
    category: 'specialty',
    badge: 'Omega-3 Atlantik',
    price: 265000,
    volume: 'Botol Softgel',
    bpom: 'POM SI / Halal',
    status: 'active',
    image: 'https://down-id.img.susercontent.com/file/id-11134207-7r98x-lxh95xhhpfv1e6.webp',
    shortDesc: 'Minyak ikan salmon murni perairan dingin Norwegia kaya EPA, DHA & Astaxanthin alami.',
    description: 'Minyak ikan bermutu tinggi dari perairan dingin Atlantik Utara Norwegia. Kaya akan asam lemak esensial Omega-3, EPA, dan DHA yang sangat penting untuk kesehatan jantung, pembuluh darah, fungsi memori otak, serta menjaga elastisitas kulit.',
    benefits: [
      'Menjaga elastisitas pembuluh darah & kesehatan jantung',
      'Membantu menstabilkan profil lemak darah (trigliserida)',
      'Menutrisi sel otak dan memelihara konsentrasi',
      'Diekstraksi higienis dengan standar internasional'
    ],
    usage: 'Diminum 1-2 softgel per hari setelah makan.'
  }
];
