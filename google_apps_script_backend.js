/**
 * ============================================================================
 * BACKEND GOOGLE APPS SCRIPT - BPCAREU STORE
 * ============================================================================
 * Skrip ini bertindak sebagai API serverless gratis berbasis Google Sheets.
 * 
 * FITUR:
 * 1. GET ?action=getProducts -> Mengambil semua produk aktif dari Sheet Katalog_Produk
 * 2. POST action=createProduct -> Menambah produk baru ke Sheet
 * 3. POST action=updateProduct -> Memperbarui produk berdasarkan ID
 * 4. POST action=deleteProduct -> Soft-delete (mengubah status ke 'archived')
 * 5. POST action=recordOrder   -> Mencatat log pesanan checkout ke Sheet Pesanan_Masuk
 * ============================================================================
 */

const CONFIG = {
  // Samakan API Key ini dengan password admin di web BPCareU
  ADMIN_API_KEY: "PROPOLIS_SECRET_ADMIN_KEY_2026",
  SHEET_PRODUCTS: "Katalog_Produk",
  SHEET_ORDERS: "Pesanan_Masuk"
};

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getProducts';

  try {
    if (action === 'getProducts') {
      const sheet = getOrCreateSheet(CONFIG.SHEET_PRODUCTS, getProductHeaders());
      const data = getSheetDataAsJson(sheet);
      return createJsonResponse({
        status: "success",
        data: data
      });
    }

    return createJsonResponse({
      status: "error",
      message: "Action GET tidak dikenali: " + action
    });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Payload request kosong.");
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // Aksi pencatatan pesanan (tidak perlu API Key agar pelanggan bisa checkout langsung)
    if (action === 'recordOrder') {
      return handleRecordOrder(payload.data);
    }

    // Aksi CRUD Admin (Wajib verifikasi API Key)
    if (payload.apiKey !== CONFIG.ADMIN_API_KEY) {
      return createJsonResponse({
        status: "error",
        message: "Otentikasi ditolak: API Key tidak valid."
      });
    }

    if (action === 'createProduct') {
      return handleCreateProduct(payload.data);
    } else if (action === 'updateProduct') {
      return handleUpdateProduct(payload.id, payload.data);
    } else if (action === 'deleteProduct') {
      return handleDeleteProduct(payload.id, payload.softDelete);
    }

    return createJsonResponse({
      status: "error",
      message: "Action POST tidak dikenali: " + action
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

// ============================================================================
// HANDLER FUNGSI CRUD & PESANAN
// ============================================================================

function handleRecordOrder(orderData) {
  if (!orderData) throw new Error("Data order tidak valid.");
  const sheet = getOrCreateSheet(CONFIG.SHEET_ORDERS, getOrderHeaders());

  const now = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  const itemsSummary = (orderData.items || []).map(i => i.name + " (" + i.qty + "x)").join(", ");

  sheet.appendRow([
    now,
    orderData.name || "",
    "'" + (orderData.phone || ""),
    orderData.address || "",
    orderData.notes || "",
    orderData.total || 0,
    itemsSummary,
    JSON.stringify(orderData.items || [])
  ]);

  return createJsonResponse({
    status: "success",
    message: "Pesanan berhasil dicatat ke Google Sheets."
  });
}

function handleCreateProduct(prod) {
  if (!prod || !prod.id) throw new Error("Data produk tidak valid.");
  const sheet = getOrCreateSheet(CONFIG.SHEET_PRODUCTS, getProductHeaders());

  // Cek apakah ID sudah ada
  const existingRow = findRowIndexById(sheet, prod.id);
  const now = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  const rowValues = [
    prod.id,
    prod.name || "",
    prod.category || "propolis",
    prod.volume || "6 ml",
    Number(prod.price) || 0,
    prod.bpom || "-",
    prod.badge || "BP Group",
    prod.image || "",
    prod.shortDesc || "",
    prod.description || prod.shortDesc || "",
    prod.status || "active",
    prod.usage || "",
    now
  ];

  if (existingRow !== -1) {
    // Timpa jika sudah ada
    sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    // Tambah baris baru
    sheet.appendRow(rowValues);
  }

  return createJsonResponse({
    status: "success",
    message: "Produk berhasil ditambahkan ke database."
  });
}

function handleUpdateProduct(id, prod) {
  if (!id) throw new Error("ID Produk harus disertakan.");
  const sheet = getOrCreateSheet(CONFIG.SHEET_PRODUCTS, getProductHeaders());
  const rowIndex = findRowIndexById(sheet, id);

  if (rowIndex === -1) {
    throw new Error("Produk dengan ID '" + id + "' tidak ditemukan.");
  }

  const now = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  const rowValues = [
    id,
    prod.name || "",
    prod.category || "propolis",
    prod.volume || "6 ml",
    Number(prod.price) || 0,
    prod.bpom || "-",
    prod.badge || "BP Group",
    prod.image || "",
    prod.shortDesc || "",
    prod.description || prod.shortDesc || "",
    prod.status || "active",
    prod.usage || "",
    now
  ];

  sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);

  return createJsonResponse({
    status: "success",
    message: "Produk berhasil diperbarui."
  });
}

function handleDeleteProduct(id, softDelete) {
  if (!id) throw new Error("ID Produk harus disertakan.");
  const sheet = getOrCreateSheet(CONFIG.SHEET_PRODUCTS, getProductHeaders());
  const rowIndex = findRowIndexById(sheet, id);

  if (rowIndex === -1) {
    throw new Error("Produk dengan ID '" + id + "' tidak ditemukan.");
  }

  if (softDelete) {
    // Kolom 11 adalah status
    sheet.getRange(rowIndex, 11).setValue("archived");
    // Kolom 13 adalah updatedAt
    const now = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    sheet.getRange(rowIndex, 13).setValue(now);
    return createJsonResponse({
      status: "success",
      message: "Produk berhasil diarsipkan."
    });
  } else {
    sheet.deleteRow(rowIndex);
    return createJsonResponse({
      status: "success",
      message: "Produk berhasil dihapus permanen."
    });
  }
}

// ============================================================================
// HELPER LEMBAR SPREADSHEET
// ============================================================================

function getProductHeaders() {
  return [
    "id", "name", "category", "volume", "price", 
    "bpom", "tag", "image", "shortDesc", "longDesc", 
    "status", "usage", "updatedAt"
  ];
}

function getOrderHeaders() {
  return [
    "timestamp", "customer_name", "phone", "address", 
    "notes", "total_price", "items_summary", "raw_items_json"
  ];
}

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#fee2e2");

    // Jika sheet produk baru dibuat, isi produk awal default
    if (sheetName === CONFIG.SHEET_PRODUCTS) {
      seedInitialProducts(sheet);
    }
  }

  return sheet;
}

function getSheetDataAsJson(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function findRowIndexById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(id).trim()) {
      return i + 2; // +2 karena 1-based index dan ada header
    }
  }
  return -1;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function seedInitialProducts(sheet) {
  const defaults = [
    [
      "bp-reguler", "British Propolis Regular (Dewasa)", "propolis", "6 ml (±120 tetes)", 265000,
      "POM TR 183610771", "Best Seller", "https://down-id.img.susercontent.com/file/id-11134207-81ztm-mq6i019inpqab5.webp",
      "Konsentrat bioflavonoid 4x lebih tinggi untuk imunitas, stamina, kolesterol, dan diabetes.",
      "Diformulasikan khusus untuk usia di atas 12 tahun dan dewasa.", "active",
      "Teteskan 4-6 tetes ke dalam 1/3 gelas air hangat kuku. Minum 2 kali sehari.", "2026-09-01 10:00:00"
    ],
    [
      "bp-green", "British Propolis Green Kids", "propolis", "6 ml (±120 tetes)", 265000,
      "POM TR 193631981", "Favorit Ibu & Anak", "https://down-id.img.susercontent.com/file/id-11134207-81ztj-mq4i4nywrlzj63.webp",
      "Diformulasikan khusus untuk anak 1-12 tahun, mendukung kecerdasan, nafsu makan & daya tahan tubuh.",
      "Kaya akan vitamin, mineral dan bioflavonoid alami.", "active",
      "Teteskan 2-3 tetes ke air hangat atau madu. Minum 1-2 kali sehari.", "2026-09-01 10:00:00"
    ],
    [
      "bp-steffi", "Steffi Pro Natural Sweetener", "stevia", "30 ml (±350 tetes)", 265000,
      "P-IRT / Halal MUI", "0 Kalori Bebas Gula", "https://down-id.img.susercontent.com/file/id-11134207-7r98o-lz49xldzcsf2bf.webp",
      "Pemanis alami ekstrak daun Stevia 0 Kalori. Pengganti gula pasir aman bagi penderita diabetes.",
      "Pemanis tetes dari daun Stevia bermutu tinggi dengan indeks glikemik 0.", "active",
      "Teteskan 1-2 tetes ke dalam 200 ml minuman/masakan.", "2026-09-01 10:00:00"
    ],
    [
      "bp-brassic-eye", "Brassic Eye (Nutrisi Mata & Retina)", "specialty", "Botol Kapsul", 265000,
      "POM TR 203342551", "Herbal Mata Lelah", "https://down-id.img.susercontent.com/file/id-11134207-7rasg-m4exo7b1yyjy83.webp",
      "Ekstrak Bilberry & Cynara scolymus untuk memelihara kesehatan mata dari radiasi gadget.",
      "Herbal spesial BP Group untuk melindungi saraf mata dan mencegah mata lelah.", "active",
      "Diminum 2 kali sehari sebanyak 1-2 kapsul setelah makan.", "2026-09-01 10:00:00"
    ],
    [
      "bp-brassic-pro", "Brassic Pro (Sendi, Otot & Pegal)", "specialty", "Botol Kapsul", 265000,
      "POM TR 203342371", "Solusi Sendi Sehat", "https://down-id.img.susercontent.com/file/id-11134207-7rbkd-m659aluqkjra13.webp",
      "Formulasi herbal sinergis untuk meredakan nyeri persendian, asam urat, pinggang dan rematik.",
      "Kombinasi herbal antiinflamasi alami untuk melumasi persendian dan pegal linu.", "active",
      "Diminum 2 kali sehari sebanyak 1-2 kapsul setelah makan.", "2026-09-01 10:00:00"
    ],
    [
      "bp-norway", "BP Norway (Pure Salmon Fish Oil)", "specialty", "Botol Softgel", 265000,
      "POM SI / Halal", "Omega-3 Atlantik", "https://down-id.img.susercontent.com/file/id-11134207-7r98x-lxh95xhhpfv1e6.webp",
      "Minyak ikan salmon murni perairan dingin Norwegia kaya EPA, DHA & Astaxanthin alami.",
      "Minyak ikan bermutu tinggi Atlantik Utara kaya Omega-3, EPA, dan DHA.", "active",
      "Diminum 1-2 softgel per hari setelah makan.", "2026-09-01 10:00:00"
    ]
  ];

  defaults.forEach(r => sheet.appendRow(r));
}
