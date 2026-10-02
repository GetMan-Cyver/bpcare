import type { Product, CartItem } from '../types';
import { INITIAL_PRODUCTS } from '../data/products';
import { PACKAGES } from '../data/packages';
import { formatIDR, calculateCartTotals, validateIndonesianPhone, buildWhatsAppOrderMessage } from '../utils/cart';
import { calculateDosage } from '../utils/calculator';
import { BRUTE_FORCE_CONFIG, escapeHTML, getSecurityState, saveSecurityState, resetSecurityState } from '../utils/security';

// Konfigurasi WhatsApp Admin Toko BPCareU
const ADMIN_WA_NUMBER = '6281288889999';

// State Runtime
let runtimeProducts: Product[] = [...INITIAL_PRODUCTS];
let cart: CartItem[] = [];
let activeDetailProduct: Product | null = null;
let currentFilter = 'all';

// State Admin & Database
let GOOGLE_APPS_SCRIPT_URL = '';
let ADMIN_API_KEY = 'PROPOLIS_SECRET_ADMIN_KEY_2026';
let lastPasswordUpdate = '2026-09-01 10:00:00';
let isAdminAuthenticated = false;
let pendingDeleteProductId: string | null = null;
let showSecretCredential = false;
let lockoutIntervalId: ReturnType<typeof setInterval> | null = null;

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
export function showToast(message: string): void {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 transform translate-y-3 transition-all duration-300 pointer-events-auto';
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check text-amber-400"></i>
    <span class="font-medium">${escapeHTML(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-3'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-3');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================
// MODAL ANIMATION HELPERS
// ==========================================
function openModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function closeModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

// ==========================================
// PRODUCT CATALOG LOGIC
// ==========================================
export function renderProductCatalog(filter: string = 'all'): void {
  currentFilter = filter;
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const activeProducts = runtimeProducts.filter(p => p.status !== 'archived');
  const filtered = filter === 'all' ? activeProducts : activeProducts.filter(p => p.category === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400 text-xs">
        Tidak ada produk yang ditemukan untuk kategori ini.
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div data-product-id="${escapeHTML(p.id)}" data-category="${escapeHTML(p.category)}" class="product-card bg-white rounded-3xl p-5 border border-slate-200 hover:border-bpRed-600 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer relative">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-bpRed-100 text-bpRed-800">
            ${escapeHTML(p.badge || 'BP Group')}
          </span>
          <span class="text-[11px] font-semibold text-slate-400">
            ${escapeHTML(p.volume || '-')}
          </span>
        </div>

        <div class="w-full h-48 rounded-2xl bg-gradient-to-tr from-slate-50 to-red-50/30 p-4 mb-4 flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-[1.02] transition-transform">
          <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" class="max-h-40 object-contain drop-shadow-md" onerror="this.onerror=null; this.src='https://placehold.co/400x400/991b1b/ffffff?text=${encodeURIComponent(p.id)}';" />
        </div>

        <div class="flex items-center gap-1.5 text-[10px] text-blue-700 font-bold mb-1">
          <i class="fa-solid fa-shield-halved text-[9px]"></i>
          <span class="font-mono">${escapeHTML(p.bpom || '-')}</span>
        </div>

        <h3 class="font-black text-sm text-slate-900 group-hover:text-bpRed-700 transition-colors leading-snug line-clamp-1">
          ${escapeHTML(p.name)}
        </h3>

        <p class="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
          ${escapeHTML(p.shortDesc || '')}
        </p>
      </div>

      <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span class="text-[10px] text-slate-400 block font-medium">Harga Resmi:</span>
          <span class="text-base font-black text-bpRed-700">${formatIDR(p.price)}</span>
        </div>
        <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
          <button data-action="detail" data-product-id="${escapeHTML(p.id)}" class="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer" title="Detail Lengkap">
            Detail
          </button>
          <button data-action="buy" data-product-id="${escapeHTML(p.id)}" class="px-3 py-2 rounded-xl bg-bpRed-700 hover:bg-bpRed-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer">
            <i class="fa-solid fa-plus text-[10px]"></i> Beli
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ==========================================
// PRODUCT DETAIL MODAL
// ==========================================
export function openProductDetail(productId: string): void {
  const prod = runtimeProducts.find(p => p.id === productId);
  if (!prod) return;

  activeDetailProduct = prod;

  const catBadge = document.getElementById('detailCategoryBadge');
  const badgeTag = document.getElementById('detailBadgeTag');
  const title = document.getElementById('detailTitle');
  const price = document.getElementById('detailPrice');
  const volume = document.getElementById('detailVolume');
  const bpom = document.getElementById('detailBpom');
  const desc = document.getElementById('detailDesc');
  const usage = document.getElementById('detailUsage');
  const qtyInput = document.getElementById('detailQtyInput') as HTMLInputElement | null;
  const imgEl = document.getElementById('detailImg') as HTMLImageElement | null;
  const benList = document.getElementById('detailBenefitsList');

  if (catBadge) catBadge.textContent = prod.category.toUpperCase();
  if (badgeTag) badgeTag.textContent = prod.badge || 'BP Group Original';
  if (title) title.textContent = prod.name;
  if (price) price.textContent = formatIDR(prod.price);
  if (volume) volume.textContent = prod.volume || '-';
  if (bpom) bpom.textContent = prod.bpom || '-';
  if (desc) desc.textContent = prod.description || prod.shortDesc;
  if (usage) usage.textContent = prod.usage || 'Ikuti anjuran pemakaian pada label kemasan botol.';
  if (qtyInput) qtyInput.value = '1';

  if (imgEl) {
    imgEl.src = prod.image;
    imgEl.onerror = () => {
      imgEl.src = `https://placehold.co/400x400/991b1b/ffffff?text=${encodeURIComponent(prod.id)}`;
    };
  }

  if (benList) {
    const benefits = prod.benefits || [
      'Formula herbal konsentrat tinggi berstandar internasional',
      'Membantu mempercepat pemulihan dan memperkuat metabolisme tubuh',
      'Terdaftar resmi di BPOM RI & Bersertifikat Halal MUI'
    ];
    benList.innerHTML = benefits.map(b => `
      <li class="flex items-start gap-2">
        <i class="fa-solid fa-circle-check text-emerald-600 mt-1 shrink-0 text-xs"></i>
        <span>${escapeHTML(b)}</span>
      </li>
    `).join('');
  }

  openModal('productDetailModal');
}

export function closeProductDetail(): void {
  closeModal('productDetailModal');
  activeDetailProduct = null;
}

// ==========================================
// CART & DRAWER
// ==========================================
export function toggleCartDrawer(open: boolean): void {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartDrawerBackdrop');
  if (!drawer || !backdrop) return;

  if (open) {
    backdrop.classList.remove('hidden');
    drawer.classList.remove('translate-x-full');
    setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
  } else {
    backdrop.classList.add('opacity-0');
    drawer.classList.add('translate-x-full');
    setTimeout(() => backdrop.classList.add('hidden'), 200);
  }
}

export function addToCartItem(id: string, name: string, price: number, qty: number, type: 'product' | 'package'): void {
  const exist = cart.find(item => item.id === id);
  if (exist) {
    exist.qty += qty;
  } else {
    cart.push({ id, name, price, qty, type });
  }
  saveAndRenderCart();
}

export function updateCartItemQty(id: string, delta: number): void {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  saveAndRenderCart();
}

export function removeCartItem(id: string): void {
  cart = cart.filter(i => i.id !== id);
  saveAndRenderCart();
}

export function saveAndRenderCart(): void {
  try {
    localStorage.setItem('bpcareu_cart', JSON.stringify(cart));
  } catch (e) {
    // Ignore storage errors
  }

  const { totalItems, subtotal } = calculateCartTotals(cart);

  const cartBadge = document.getElementById('cartCountBadge');
  const drawerBadge = document.getElementById('drawerBadgeCount');
  const drawerSubtotal = document.getElementById('drawerSubtotal');
  const drawerTotal = document.getElementById('drawerTotal');
  const checkoutBtn = document.getElementById('openCheckoutBtn') as HTMLButtonElement | null;
  const list = document.getElementById('cartItemsList');

  if (cartBadge) cartBadge.textContent = String(totalItems);
  if (drawerBadge) drawerBadge.textContent = String(totalItems);
  if (drawerSubtotal) drawerSubtotal.textContent = formatIDR(subtotal);
  if (drawerTotal) drawerTotal.textContent = formatIDR(subtotal);

  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
  }

  if (list) {
    if (cart.length === 0) {
      list.innerHTML = `
        <div class="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
          <i class="fa-solid fa-cart-shopping text-4xl text-slate-300"></i>
          <p class="text-xs font-semibold">Keranjang belanja Anda masih kosong.</p>
          <a href="#katalog" id="emptyCartCatalogLink" class="text-xs font-bold text-bpRed-700 underline">Pilih Produk Sekarang</a>
        </div>
      `;
      const link = document.getElementById('emptyCartCatalogLink');
      if (link) {
        link.addEventListener('click', () => toggleCartDrawer(false));
      }
      return;
    }

    list.innerHTML = cart.map(item => `
      <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3 text-xs">
        <div class="flex-1 min-w-0">
          <p class="font-extrabold text-slate-900 truncate">${escapeHTML(item.name)}</p>
          <span class="text-slate-500 font-bold">${formatIDR(item.price)}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
            <button data-action="cart-minus" data-id="${escapeHTML(item.id)}" class="w-6 h-6 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">-</button>
            <span class="w-7 text-center font-black text-xs text-slate-800">${item.qty}</span>
            <button data-action="cart-plus" data-id="${escapeHTML(item.id)}" class="w-6 h-6 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">+</button>
          </div>
          <button data-action="cart-remove" data-id="${escapeHTML(item.id)}" class="text-red-500 hover:text-red-700 p-1 cursor-pointer" title="Hapus Item">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('');
  }
}

// ==========================================
// CHECKOUT FORM & WHATSAPP
// ==========================================
export function openCheckoutModal(): void {
  if (cart.length === 0) return;
  toggleCartDrawer(false);

  const { totalItems, subtotal } = calculateCartTotals(cart);

  const modalTotal = document.getElementById('checkoutModalTotal');
  const modalCount = document.getElementById('checkoutModalItemsCount');

  if (modalTotal) modalTotal.textContent = formatIDR(subtotal);
  if (modalCount) modalCount.textContent = `${totalItems} Item`;

  openModal('checkoutModal');
}

export function closeCheckoutModal(): void {
  closeModal('checkoutModal');
}

export function handleCheckoutSubmit(event: Event): void {
  event.preventDefault();

  const honeypot = (document.getElementById('honeypotWebsite') as HTMLInputElement)?.value;
  if (honeypot) return;

  const nameInput = document.getElementById('orderName') as HTMLInputElement | null;
  const phoneInput = document.getElementById('orderPhone') as HTMLInputElement | null;
  const addressInput = document.getElementById('orderAddress') as HTMLTextAreaElement | null;
  const notesInput = document.getElementById('orderNotes') as HTMLInputElement | null;

  const name = nameInput?.value.trim() || '';
  const phone = phoneInput?.value.trim() || '';
  const address = addressInput?.value.trim() || '';
  const notes = notesInput?.value.trim() || '';

  const phoneError = document.getElementById('phoneError');
  if (!validateIndonesianPhone(phone)) {
    phoneError?.classList.remove('hidden');
    return;
  }
  phoneError?.classList.add('hidden');

  const { subtotal } = calculateCartTotals(cart);
  const submitBtn = document.getElementById('submitOrderBtn') as HTMLButtonElement | null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menghubungkan ke WhatsApp...`;
  }

  // Jika Google Apps Script URL telah dikonfigurasi, catat pesanan otomatis
  if (GOOGLE_APPS_SCRIPT_URL) {
    try {
      fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'recordOrder',
          data: { name, phone, address, notes, total: subtotal, items: cart }
        })
      }).catch(err => console.warn('Pencatatan Sheets gagal:', err));
    } catch (e) {
      // Ignore background error
    }
  }

  const waMessage = buildWhatsAppOrderMessage({ name, phone, address, notes, cart, subtotal });

  cart = [];
  saveAndRenderCart();
  closeCheckoutModal();

  window.open(`https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(waMessage)}`, '_blank');

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-brands fa-whatsapp text-sm"></i> Kirim Pesanan ke WhatsApp`;
  }
}

// ==========================================
// KALKULATOR DOSIS
// ==========================================
export function handleCalculateDose(): void {
  const weightInput = document.getElementById('calcWeight') as HTMLInputElement | null;
  const ageSelect = document.getElementById('calcAgeCategory') as HTMLSelectElement | null;
  const purposeSelect = document.getElementById('calcPurpose') as HTMLSelectElement | null;

  const weight = parseInt(weightInput?.value || '60', 10);
  const ageCategory = (ageSelect?.value || 'adult') as 'adult' | 'child';
  const purpose = (purposeSelect?.value || 'stamina') as 'stamina' | 'recovery' | 'chronic';

  const result = calculateDosage(weight, ageCategory, purpose);

  const doseText = document.getElementById('calcDoseText');
  const suggestionText = document.getElementById('calcProductSuggestion');

  if (doseText) doseText.textContent = result.doseText;
  if (suggestionText) suggestionText.innerHTML = result.productSuggestionText;

  showToast('Kalkulasi dosis berhasil dihitung!');
}

// ==========================================
// ADMIN DASHBOARD & KEAMANAN
// ==========================================
export function openAdminPortal(): void {
  loadAdminConfig();
  if (isAdminAuthenticated) {
    openAdminDashboard();
  } else {
    const errorMsg = document.getElementById('loginErrorMsg');
    const keyInput = document.getElementById('adminApiKeyInput') as HTMLInputElement | null;
    errorMsg?.classList.add('hidden');
    if (keyInput) keyInput.value = '';
    checkLockoutStatus();
    openModal('adminLoginModal');
  }
}

export function closeAdminLogin(): void {
  closeModal('adminLoginModal');
}

export function handleAdminLogin(event: Event): void {
  event.preventDefault();

  if (checkLockoutStatus()) return;

  const enteredKey = (document.getElementById('adminApiKeyInput') as HTMLInputElement)?.value.trim();
  const state = getSecurityState();

  if (enteredKey === ADMIN_API_KEY) {
    resetSecurityState();
    isAdminAuthenticated = true;
    closeAdminLogin();
    showToast('Login Admin Berhasil!');
    setTimeout(() => openAdminDashboard(), 250);
  } else {
    const failed = (state.failedAttempts || 0) + 1;
    const errBox = document.getElementById('loginErrorMsg');
    const errTitle = document.getElementById('loginErrorTitle');
    const errDetail = document.getElementById('loginErrorDetail');

    if (failed >= BRUTE_FORCE_CONFIG.maxAttempts) {
      const lockedUntil = Date.now() + (BRUTE_FORCE_CONFIG.lockoutDurationSeconds * 1000);
      saveSecurityState({ failedAttempts: failed, lockedUntil });
      startLockoutCountdown(lockedUntil);
      showToast('Akses dibekukan sementara karena 5x percobaan salah.');
    } else {
      saveSecurityState({ failedAttempts: failed, lockedUntil: 0 });
      updateLoginAttemptsUI(failed, false);

      const remaining = BRUTE_FORCE_CONFIG.maxAttempts - failed;
      if (errTitle) errTitle.textContent = 'Password tidak sesuai!';
      if (errDetail) {
        errDetail.textContent = `Percobaan gagal ${failed} dari ${BRUTE_FORCE_CONFIG.maxAttempts}. Anda memiliki ${remaining} kesempatan lagi sebelum akses dibekukan.`;
      }
      errBox?.classList.remove('hidden');
    }
  }
}

function checkLockoutStatus(): boolean {
  const state = getSecurityState();
  const now = Date.now();

  if (state.lockedUntil && state.lockedUntil > now) {
    startLockoutCountdown(state.lockedUntil);
    return true;
  } else if (state.lockedUntil && state.lockedUntil <= now) {
    resetSecurityState();
  }
  updateLoginAttemptsUI(state.failedAttempts || 0, false);
  return false;
}

function startLockoutCountdown(lockedUntil: number): void {
  if (lockoutIntervalId) clearInterval(lockoutIntervalId);

  const passInput = document.getElementById('adminApiKeyInput') as HTMLInputElement | null;
  const submitBtn = document.getElementById('adminLoginSubmitBtn') as HTMLButtonElement | null;
  const banner = document.getElementById('loginLockoutBanner');
  const timerText = document.getElementById('loginLockoutTimer');
  const errorMsg = document.getElementById('loginErrorMsg');
  const btnText = document.getElementById('adminLoginBtnText');

  if (passInput) passInput.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  banner?.classList.remove('hidden');
  errorMsg?.classList.add('hidden');

  const tick = () => {
    const remainingMs = lockedUntil - Date.now();
    if (remainingMs <= 0) {
      if (lockoutIntervalId) {
        clearInterval(lockoutIntervalId);
        lockoutIntervalId = null;
      }
      if (passInput) passInput.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
      banner?.classList.add('hidden');
      resetSecurityState();
      showToast('Akses login telah dibuka kembali. Silakan coba lagi.');
      return;
    }

    const remainingSec = Math.ceil(remainingMs / 1000);
    if (timerText) timerText.textContent = `${remainingSec} detik tersisa`;
    if (btnText) btnText.textContent = `Terkunci (${remainingSec}s)`;
  };

  tick();
  lockoutIntervalId = setInterval(tick, 1000);
}

function updateLoginAttemptsUI(failedAttempts: number, isLocked: boolean): void {
  const badge = document.getElementById('loginAttemptsBadge');
  const passInput = document.getElementById('adminApiKeyInput') as HTMLInputElement | null;
  const submitBtn = document.getElementById('adminLoginSubmitBtn') as HTMLButtonElement | null;
  const btnText = document.getElementById('adminLoginBtnText');

  if (!badge) return;

  const remaining = Math.max(0, BRUTE_FORCE_CONFIG.maxAttempts - failedAttempts);
  badge.textContent = `Sisa percobaan: ${remaining}`;

  if (failedAttempts > 0 && !isLocked) {
    badge.className = 'font-bold text-red-600';
  } else {
    badge.className = 'font-bold text-slate-700';
  }

  if (!isLocked) {
    if (passInput) passInput.disabled = false;
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Masuk Dashboard';
    document.getElementById('loginLockoutBanner')?.classList.add('hidden');
  }
}

export function openAdminDashboard(): void {
  renderAdminProductTable();
  renderCredentialTable();
  updateAdminConnectionBadge();
  switchAdminTab('products');
  openModal('adminDashboardModal');
}

export function closeAdminDashboard(): void {
  closeModal('adminDashboardModal');
}

export function logoutAdmin(): void {
  isAdminAuthenticated = false;
  closeAdminDashboard();
  showToast('Sesi Admin telah berakhir.');
}

export function switchAdminTab(tabName: 'products' | 'security' | 'config'): void {
  const tabProducts = document.getElementById('adminTabContentProducts');
  const tabSecurity = document.getElementById('adminTabContentSecurity');
  const tabConfig = document.getElementById('adminTabContentConfig');

  const btnProducts = document.getElementById('tabBtnProducts');
  const btnSecurity = document.getElementById('tabBtnSecurity');
  const btnConfig = document.getElementById('tabBtnConfig');
  const actions = document.getElementById('productTabActions');

  tabProducts?.classList.add('hidden');
  tabSecurity?.classList.add('hidden');
  tabConfig?.classList.add('hidden');

  [btnProducts, btnSecurity, btnConfig].forEach(b => {
    if (b) {
      b.className = 'px-4 py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2 cursor-pointer';
    }
  });

  if (tabName === 'products') {
    tabProducts?.classList.remove('hidden');
    actions?.classList.remove('hidden');
    if (btnProducts) {
      btnProducts.className = 'px-4 py-2 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-900 shadow-2xs flex items-center gap-2 cursor-pointer';
    }
  } else if (tabName === 'security') {
    tabSecurity?.classList.remove('hidden');
    actions?.classList.add('hidden');
    if (btnSecurity) {
      btnSecurity.className = 'px-4 py-2 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-900 shadow-2xs flex items-center gap-2 cursor-pointer';
    }
    renderCredentialTable();
  } else if (tabName === 'config') {
    tabConfig?.classList.remove('hidden');
    actions?.classList.add('hidden');
    if (btnConfig) {
      btnConfig.className = 'px-4 py-2 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-900 shadow-2xs flex items-center gap-2 cursor-pointer';
    }

    const urlInput = document.getElementById('configWebAppUrl') as HTMLInputElement | null;
    const keyInput = document.getElementById('configApiKey') as HTMLInputElement | null;
    if (urlInput) urlInput.value = GOOGLE_APPS_SCRIPT_URL;
    if (keyInput) keyInput.value = ADMIN_API_KEY;
  }
}

// ==========================================
// ADMIN PRODUCT CRUD
// ==========================================
export function renderAdminProductTable(): void {
  const tbody = document.getElementById('adminProductTableBody');
  const countEl = document.getElementById('adminProductCount');
  if (!tbody) return;

  if (countEl) countEl.textContent = String(runtimeProducts.length);

  if (runtimeProducts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">Belum ada produk di database. Klik "Tambah Produk Baru".</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = runtimeProducts.map(p => {
    const isArchived = p.status === 'archived';
    return `
      <tr class="hover:bg-slate-50 transition-colors ${isArchived ? 'opacity-60 bg-slate-50/50' : 'bg-white'}">
        <td class="py-3 px-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
            <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" class="w-full h-full object-contain" onerror="this.src='https://placehold.co/100x100/991b1b/ffffff?text=BP';" />
          </div>
          <div>
            <p class="font-extrabold text-slate-900 text-xs">${escapeHTML(p.name)}</p>
            <span class="font-mono text-[10px] text-slate-400">ID: ${escapeHTML(p.id)}</span>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="font-bold text-slate-800 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">${escapeHTML(p.category)}</span>
          <p class="text-slate-500 text-[11px] mt-0.5">${escapeHTML(p.volume || '-')}</p>
        </td>
        <td class="py-3 px-4 font-mono text-[11px] text-slate-700 font-bold">${escapeHTML(p.bpom || '-')}</td>
        <td class="py-3 px-4 text-right font-extrabold text-bpRed-800 text-xs">${formatIDR(p.price)}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isArchived ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
            <span class="w-1.5 h-1.5 rounded-full ${isArchived ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
            ${isArchived ? 'Archived' : 'Active'}
          </span>
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button data-action="admin-edit" data-id="${escapeHTML(p.id)}" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer" title="Edit Produk">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button data-action="admin-archive" data-id="${escapeHTML(p.id)}" class="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-red-600 hover:text-red-800 transition-colors cursor-pointer" title="Arsipkan Produk">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

export function openProductForm(mode: 'create' | 'edit', productId: string | null = null): void {
  const form = document.getElementById('productCrudForm') as HTMLFormElement | null;
  const title = document.getElementById('productFormTitle');
  const idInput = document.getElementById('formProdId') as HTMLInputElement | null;
  const modeInput = document.getElementById('formMode') as HTMLInputElement | null;
  const origIdInput = document.getElementById('formOriginalId') as HTMLInputElement | null;

  if (form) form.reset();
  if (modeInput) modeInput.value = mode;

  if (mode === 'create') {
    if (title) title.textContent = 'Tambah Produk Baru ke Katalog';
    if (origIdInput) origIdInput.value = '';
    if (idInput) {
      idInput.disabled = false;
      idInput.value = 'bp-' + Date.now().toString().slice(-4);
    }
    (document.getElementById('formProdCategory') as HTMLSelectElement).value = 'propolis';
    (document.getElementById('formProdStatus') as HTMLSelectElement).value = 'active';
    (document.getElementById('formProdPrice') as HTMLInputElement).value = '265000';
    (document.getElementById('formProdVolume') as HTMLInputElement).value = '6 ml';
    (document.getElementById('formProdBpom') as HTMLInputElement).value = 'POM TR ';
  } else {
    const prod = runtimeProducts.find(p => p.id === productId);
    if (!prod) return;

    if (title) title.textContent = `Edit Produk: ${prod.name}`;
    if (origIdInput) origIdInput.value = prod.id;
    if (idInput) {
      idInput.value = prod.id;
      idInput.disabled = true;
    }

    (document.getElementById('formProdCategory') as HTMLSelectElement).value = prod.category || 'propolis';
    (document.getElementById('formProdName') as HTMLInputElement).value = prod.name || '';
    (document.getElementById('formProdPrice') as HTMLInputElement).value = String(prod.price || 0);
    (document.getElementById('formProdVolume') as HTMLInputElement).value = prod.volume || '';
    (document.getElementById('formProdBpom') as HTMLInputElement).value = prod.bpom || '';
    (document.getElementById('formProdBadge') as HTMLInputElement).value = prod.badge || '';
    (document.getElementById('formProdStatus') as HTMLSelectElement).value = prod.status || 'active';
    (document.getElementById('formProdImage') as HTMLInputElement).value = prod.image || '';
    (document.getElementById('formProdShortDesc') as HTMLTextAreaElement).value = prod.shortDesc || '';
    (document.getElementById('formProdDesc') as HTMLTextAreaElement).value = prod.description || '';
    (document.getElementById('formProdUsage') as HTMLTextAreaElement).value = prod.usage || '';
  }

  openModal('productFormModal');
}

export function closeProductForm(): void {
  closeModal('productFormModal');
}

export async function handleProductFormSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const mode = (document.getElementById('formMode') as HTMLInputElement)?.value;
  const originalId = (document.getElementById('formOriginalId') as HTMLInputElement)?.value;
  const id = (document.getElementById('formProdId') as HTMLInputElement)?.value.trim();
  const saveBtn = document.getElementById('saveProductBtn') as HTMLButtonElement | null;

  const productPayload: Product = {
    id: id,
    name: (document.getElementById('formProdName') as HTMLInputElement)?.value.trim() || '',
    category: (document.getElementById('formProdCategory') as HTMLSelectElement)?.value || 'propolis',
    price: parseInt((document.getElementById('formProdPrice') as HTMLInputElement)?.value, 10) || 0,
    volume: (document.getElementById('formProdVolume') as HTMLInputElement)?.value.trim() || '',
    bpom: (document.getElementById('formProdBpom') as HTMLInputElement)?.value.trim() || '',
    badge: (document.getElementById('formProdBadge') as HTMLInputElement)?.value.trim() || 'BP Group',
    status: ((document.getElementById('formProdStatus') as HTMLSelectElement)?.value as 'active' | 'archived') || 'active',
    image: (document.getElementById('formProdImage') as HTMLInputElement)?.value.trim() || `https://placehold.co/400x400/991b1b/ffffff?text=${encodeURIComponent(id)}`,
    shortDesc: (document.getElementById('formProdShortDesc') as HTMLTextAreaElement)?.value.trim() || '',
    description: (document.getElementById('formProdDesc') as HTMLTextAreaElement)?.value.trim() || '',
    usage: (document.getElementById('formProdUsage') as HTMLTextAreaElement)?.value.trim() || '',
    benefits: [
      'Memelihara daya tahan tubuh secara optimal',
      'Kandungan bioflavonoid alami berkualitas tinggi',
      'Sertifikasi resmi terdaftar di BPOM RI & Halal MUI'
    ]
  };

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
  }

  try {
    if (GOOGLE_APPS_SCRIPT_URL) {
      const actionName = mode === 'create' ? 'createProduct' : 'updateProduct';
      const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: actionName,
          apiKey: ADMIN_API_KEY,
          id: originalId || id,
          data: productPayload
        })
      });
      const resJson = await res.json();
      if (resJson.status !== 'success') {
        throw new Error(resJson.message || 'Gagal menyimpan ke Google Sheets');
      }
    }

    if (mode === 'create') {
      const existingIdx = runtimeProducts.findIndex(p => p.id === id);
      if (existingIdx !== -1) {
        runtimeProducts[existingIdx] = productPayload;
      } else {
        runtimeProducts.unshift(productPayload);
      }
      showToast('Produk berhasil ditambahkan!');
    } else {
      const idx = runtimeProducts.findIndex(p => p.id === originalId);
      if (idx !== -1) {
        runtimeProducts[idx] = { ...runtimeProducts[idx], ...productPayload };
      }
      showToast('Produk berhasil diperbarui!');
    }

    renderProductCatalog(currentFilter);
    renderAdminProductTable();
    closeProductForm();
  } catch (err: any) {
    showToast('Error: ' + err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Database`;
    }
  }
}

export function openDeleteConfirmModal(productId: string): void {
  const prod = runtimeProducts.find(p => p.id === productId);
  if (!prod) return;

  pendingDeleteProductId = productId;
  const nameEl = document.getElementById('deleteTargetName');
  if (nameEl) nameEl.textContent = `${prod.name} (${prod.id})`;

  openModal('deleteConfirmModal');
}

export function closeDeleteConfirmModal(): void {
  closeModal('deleteConfirmModal');
  pendingDeleteProductId = null;
}

export async function executeProductDeletion(): Promise<void> {
  if (!pendingDeleteProductId) return;
  const delBtn = document.getElementById('confirmDeleteBtn') as HTMLButtonElement | null;
  if (delBtn) {
    delBtn.disabled = true;
    delBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
  }

  try {
    if (GOOGLE_APPS_SCRIPT_URL) {
      const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteProduct',
          apiKey: ADMIN_API_KEY,
          id: pendingDeleteProductId,
          softDelete: true
        })
      });
      const resJson = await res.json();
      if (resJson.status !== 'success') {
        throw new Error(resJson.message || 'Gagal mengarsipkan di Google Sheets');
      }
    }

    const target = runtimeProducts.find(p => p.id === pendingDeleteProductId);
    if (target) {
      target.status = 'archived';
    }

    renderProductCatalog(currentFilter);
    renderAdminProductTable();
    closeDeleteConfirmModal();
    showToast('Produk berhasil diarsipkan!');
  } catch (err: any) {
    showToast('Gagal: ' + err.message);
  } finally {
    if (delBtn) {
      delBtn.disabled = false;
      delBtn.innerHTML = 'Ya, Arsipkan';
    }
  }
}

// ==========================================
// ADMIN CREDENTIALS & SECURITY TAB
// ==========================================
export function renderCredentialTable(): void {
  const tbody = document.getElementById('credentialTableBody');
  if (!tbody) return;

  const maskedKey = showSecretCredential ? escapeHTML(ADMIN_API_KEY) : '••••••••••••••••••••';

  tbody.innerHTML = `
    <tr class="hover:bg-slate-50/80 transition-colors">
      <td class="py-3 px-3">
        <span class="font-extrabold text-slate-900 flex items-center gap-1.5">
          <i class="fa-solid fa-user-shield text-bpRed-700"></i> Super Admin
        </span>
        <span class="text-[10px] text-slate-400">Hak Akses Penuh (CRUD)</span>
      </td>
      <td class="py-3 px-3">
        <span class="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
        </span>
      </td>
      <td class="py-3 px-3">
        <div class="flex items-center gap-2 font-mono text-[11px] font-bold text-slate-800">
          <span id="credentialKeyValue">${maskedKey}</span>
          <button id="toggleSecretKeyBtn" class="text-slate-400 hover:text-bpRed-700 text-xs p-1 cursor-pointer" title="Tampilkan/Sembunyikan Kunci">
            <i class="fa-solid ${showSecretCredential ? 'fa-eye-slash' : 'fa-eye'}"></i>
          </button>
        </div>
      </td>
      <td class="py-3 px-3 text-slate-500 font-medium text-[11px]">
        ${escapeHTML(lastPasswordUpdate)}
      </td>
    </tr>
  `;

  document.getElementById('toggleSecretKeyBtn')?.addEventListener('click', () => {
    showSecretCredential = !showSecretCredential;
    renderCredentialTable();
  });
}

export function handleChangePassword(event: Event): void {
  event.preventDefault();
  const currentPass = (document.getElementById('currentAdminPass') as HTMLInputElement)?.value.trim();
  const newPass = (document.getElementById('newAdminPass') as HTMLInputElement)?.value.trim();
  const confirmPass = (document.getElementById('confirmNewAdminPass') as HTMLInputElement)?.value.trim();

  const errEl = document.getElementById('changePassError');
  const succEl = document.getElementById('changePassSuccess');
  errEl?.classList.add('hidden');
  succEl?.classList.add('hidden');

  if (currentPass !== ADMIN_API_KEY) {
    if (errEl) {
      errEl.textContent = 'Password saat ini salah! Periksa kembali password lama Anda.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (newPass.length < 6) {
    if (errEl) {
      errEl.textContent = 'Password baru minimal 6 karakter.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (newPass !== confirmPass) {
    if (errEl) {
      errEl.textContent = 'Konfirmasi password baru tidak cocok. Samakan isian kedua kolom.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  ADMIN_API_KEY = newPass;
  const now = new Date();
  lastPasswordUpdate =
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');

  try {
    localStorage.setItem('bpcareu_admin_config', JSON.stringify({
      url: GOOGLE_APPS_SCRIPT_URL,
      key: ADMIN_API_KEY,
      lastUpdated: lastPasswordUpdate
    }));
  } catch (e) {
    // Ignore error
  }

  if (succEl) {
    succEl.innerHTML = `<strong>Berhasil!</strong> Password admin telah diperbarui. Silakan gunakan password baru ini pada login berikutnya.`;
    succEl.classList.remove('hidden');
  }

  (document.getElementById('changePasswordForm') as HTMLFormElement)?.reset();
  renderCredentialTable();
  showToast('Password admin berhasil diubah!');
}

// ==========================================
// GOOGLE SHEETS SYNC & CONNECTION TEST
// ==========================================
export async function syncProductsFromSheets(showFeedback: boolean = false): Promise<void> {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    if (showFeedback) showToast('URL Google Apps Script belum diisi di tab Konfigurasi.');
    return;
  }

  const syncBtn = document.getElementById('refreshSyncBtn') as HTMLButtonElement | null;
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = `<i class="fa-solid fa-rotate fa-spin text-xs"></i> Menghubungkan...`;
  }

  try {
    const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getProducts`);
    const json = await response.json();

    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      runtimeProducts = json.data.map((sheetItem: any) => ({
        id: sheetItem.id,
        name: sheetItem.name,
        category: sheetItem.category || 'propolis',
        volume: sheetItem.volume || '6 ml',
        price: Number(sheetItem.price) || 265000,
        bpom: sheetItem.bpom || '-',
        badge: sheetItem.tag || 'BP Group',
        image: sheetItem.image || `https://placehold.co/400x400/991b1b/ffffff?text=${sheetItem.id}`,
        shortDesc: sheetItem.shortDesc || '',
        description: sheetItem.longDesc || sheetItem.shortDesc || '',
        status: sheetItem.status || 'active',
        benefits: [
          'Formula ekstrak lebah murni berstandar internasional',
          'Mempercepat pemulihan dan memperkuat metabolisme tubuh',
          'Terdaftar resmi BPOM RI & Bersertifikat Halal'
        ],
        usage: sheetItem.usage || 'Teteskan ke air hangat sesuai kebutuhan dosis.'
      }));

      renderProductCatalog(currentFilter);
      renderAdminProductTable();
      updateAdminConnectionBadge(true);
      if (showFeedback) showToast('Katalog berhasil disinkronkan dari Google Sheets!');
    } else {
      if (showFeedback) showToast('Sheets terhubung, namun data produk kosong.');
    }
  } catch (err: any) {
    if (showFeedback) showToast('Gagal mengambil data dari Google Sheets: ' + err.message);
    updateAdminConnectionBadge(false);
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = `<i class="fa-solid fa-rotate text-xs"></i> <span>Sinkronkan Sheets</span>`;
    }
  }
}

export async function testDatabaseConnection(): Promise<void> {
  const url = (document.getElementById('configWebAppUrl') as HTMLInputElement)?.value.trim();
  const resultBox = document.getElementById('connectionStatusResult');
  if (!resultBox) return;

  resultBox.classList.remove('hidden', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-950', 'bg-red-50', 'border-red-200', 'text-red-950');

  if (!url) {
    resultBox.className = 'p-4 rounded-2xl border text-xs bg-red-50 border-red-200 text-red-950';
    resultBox.innerHTML = `<strong>URL Kosong:</strong> Masukkan URL Web App Google Apps Script Anda terlebih dahulu.`;
    return;
  }

  resultBox.className = 'p-4 rounded-2xl border text-xs bg-slate-50 border-slate-200 text-slate-700';
  resultBox.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Menghubungi Google Apps Script...`;

  try {
    const res = await fetch(`${url}?action=getProducts`);
    const json = await res.json();

    if (json.status === 'success') {
      resultBox.className = 'p-4 rounded-2xl border text-xs bg-emerald-50 border-emerald-200 text-emerald-950';
      resultBox.innerHTML = `
        <div class="flex items-center gap-2 font-bold mb-1">
          <i class="fa-solid fa-circle-check text-emerald-600"></i>
          <span>Koneksi Google Apps Script Berhasil!</span>
        </div>
        <p>Terhubung ke Google Sheets. Ditemukan <strong>${json.data ? json.data.length : 0} produk</strong> di sheet Katalog_Produk.</p>
      `;
    } else {
      throw new Error(json.message || 'Respons tidak valid dari Apps Script.');
    }
  } catch (err: any) {
    resultBox.className = 'p-4 rounded-2xl border text-xs bg-red-50 border-red-200 text-red-950';
    resultBox.innerHTML = `
      <div class="flex items-center gap-2 font-bold mb-1">
        <i class="fa-solid fa-triangle-exclamation text-red-600"></i>
        <span>Gagal Terhubung ke Google Apps Script</span>
      </div>
      <p class="text-slate-600">${escapeHTML(err.message)}. Pastikan deployment Web App diset "Who has access: Anyone".</p>
    `;
  }
}

export function saveDatabaseConfig(event: Event): void {
  event.preventDefault();
  GOOGLE_APPS_SCRIPT_URL = (document.getElementById('configWebAppUrl') as HTMLInputElement)?.value.trim() || '';
  ADMIN_API_KEY = (document.getElementById('configApiKey') as HTMLInputElement)?.value.trim() || ADMIN_API_KEY;

  try {
    localStorage.setItem('bpcareu_admin_config', JSON.stringify({
      url: GOOGLE_APPS_SCRIPT_URL,
      key: ADMIN_API_KEY,
      lastUpdated: lastPasswordUpdate
    }));
  } catch (e) {
    // Ignore error
  }

  showToast('Konfigurasi Database tersimpan!');
  updateAdminConnectionBadge(!!GOOGLE_APPS_SCRIPT_URL);
  if (GOOGLE_APPS_SCRIPT_URL) {
    syncProductsFromSheets(true);
  }
}

export function loadAdminConfig(): void {
  try {
    const stored = localStorage.getItem('bpcareu_admin_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url) GOOGLE_APPS_SCRIPT_URL = parsed.url;
      if (parsed.key) ADMIN_API_KEY = parsed.key;
      if (parsed.lastUpdated) lastPasswordUpdate = parsed.lastUpdated;
    }
  } catch (e) {
    // Ignore error
  }
}

export function updateAdminConnectionBadge(connected: boolean | null = null): void {
  const badge = document.getElementById('dbStatusBadge');
  if (!badge) return;

  if (!GOOGLE_APPS_SCRIPT_URL) {
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Mode Internal`;
    badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1';
  } else if (connected) {
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Sheets Terhubung`;
    badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1';
  } else {
    badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Sheets Standby`;
    badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1';
  }
}

// ==========================================
// PASSWORD VISIBILITY TOGGLE HELPER
// ==========================================
function togglePasswordVisibility(inputId: string, iconId: string): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-regular fa-eye-slash text-xs text-bpRed-700';
  } else {
    input.type = 'password';
    icon.className = 'fa-regular fa-eye text-xs text-slate-400';
  }
}

// ==========================================
// EVENT DELEGATION & INIT
// ==========================================
export function initApp(): void {
  // Load saved state
  loadAdminConfig();
  try {
    const storedCart = localStorage.getItem('bpcareu_cart');
    if (storedCart) cart = JSON.parse(storedCart);
  } catch (e) {
    // Ignore error
  }
  saveAndRenderCart();

  // Top/Navbar Buttons
  document.getElementById('adminPortalBtn')?.addEventListener('click', openAdminPortal);
  document.getElementById('footerAdminBtn')?.addEventListener('click', openAdminPortal);
  document.getElementById('cartBtn')?.addEventListener('click', () => toggleCartDrawer(true));
  document.getElementById('closeCartDrawerBtn')?.addEventListener('click', () => toggleCartDrawer(false));
  document.getElementById('cartDrawerBackdrop')?.addEventListener('click', () => toggleCartDrawer(false));
  document.getElementById('openCheckoutBtn')?.addEventListener('click', openCheckoutModal);

  // Detail Modal Actions
  document.getElementById('closeDetailModalBtn')?.addEventListener('click', closeProductDetail);
  document.getElementById('detailQtyMinus')?.addEventListener('click', () => {
    const input = document.getElementById('detailQtyInput') as HTMLInputElement | null;
    if (!input) return;
    let val = parseInt(input.value, 10) || 1;
    val = Math.max(1, Math.min(99, val - 1));
    input.value = String(val);
  });
  document.getElementById('detailQtyPlus')?.addEventListener('click', () => {
    const input = document.getElementById('detailQtyInput') as HTMLInputElement | null;
    if (!input) return;
    let val = parseInt(input.value, 10) || 1;
    val = Math.max(1, Math.min(99, val + 1));
    input.value = String(val);
  });
  document.getElementById('detailAddToCartBtn')?.addEventListener('click', () => {
    if (!activeDetailProduct) return;
    const qty = parseInt((document.getElementById('detailQtyInput') as HTMLInputElement)?.value || '1', 10);
    addToCartItem(activeDetailProduct.id, activeDetailProduct.name, activeDetailProduct.price, qty, 'product');
    closeProductDetail();
    showToast(`${activeDetailProduct.name} (${qty} pcs) ditambahkan ke keranjang!`);
  });
  document.getElementById('detailBuyWABtn')?.addEventListener('click', () => {
    if (!activeDetailProduct) {
      window.open(`https://wa.me/${ADMIN_WA_NUMBER}?text=Halo%20Admin%20BPCareU,%20saya%20ingin%20konsultasi%20produk%20BP%20Group.`, '_blank');
      return;
    }
    const qty = parseInt((document.getElementById('detailQtyInput') as HTMLInputElement)?.value || '1', 10);
    const total = activeDetailProduct.price * qty;
    const text = `Halo Admin BPCareU, saya ingin memesan langsung:\n\n*Produk:* ${activeDetailProduct.name}\n*Jumlah:* ${qty} Pcs\n*Estimasi Harga:* ${formatIDR(total)}\n\nMohon info ketersediaan stok & ongkir ke kota saya. Terima kasih!`;
    window.open(`https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  });

  // Footer WhatsApp CS
  document.getElementById('footerWaBtn')?.addEventListener('click', () => {
    window.open(`https://wa.me/${ADMIN_WA_NUMBER}?text=Halo%20Admin%20BPCareU,%20saya%20ingin%20konsultasi%20produk%20BP%20Group.`, '_blank');
  });

  // Checkout Modal Actions
  document.getElementById('closeCheckoutModalBtn')?.addEventListener('click', closeCheckoutModal);
  document.getElementById('cancelCheckoutBtn')?.addEventListener('click', closeCheckoutModal);
  document.getElementById('orderForm')?.addEventListener('submit', handleCheckoutSubmit);

  // Category Filter Buttons
  document.getElementById('categoryFilterContainer')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.prod-filter-btn') as HTMLButtonElement | null;
    if (!btn) return;
    const filter = btn.getAttribute('data-filter') || 'all';

    document.querySelectorAll('.prod-filter-btn').forEach(b => {
      b.className = 'prod-filter-btn px-4 py-2 rounded-xl text-xs font-extrabold transition-all bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer';
    });
    btn.className = 'prod-filter-btn px-4 py-2 rounded-xl text-xs font-extrabold transition-all bg-bpRed-800 text-white shadow-sm cursor-pointer';

    renderProductCatalog(filter);
  });

  // Product Grid Delegate (Card click, Detail button, Buy button)
  document.getElementById('productGrid')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const buyBtn = target.closest('[data-action="buy"]') as HTMLElement | null;
    const detailBtn = target.closest('[data-action="detail"]') as HTMLElement | null;
    const card = target.closest('.product-card') as HTMLElement | null;

    if (buyBtn) {
      e.stopPropagation();
      const pid = buyBtn.getAttribute('data-product-id');
      if (pid) {
        const prod = runtimeProducts.find(p => p.id === pid);
        if (prod) {
          addToCartItem(prod.id, prod.name, prod.price, 1, 'product');
          showToast(`${prod.name} ditambahkan ke keranjang!`);
        }
      }
      return;
    }

    if (detailBtn) {
      e.stopPropagation();
      const pid = detailBtn.getAttribute('data-product-id');
      if (pid) openProductDetail(pid);
      return;
    }

    if (card) {
      const pid = card.getAttribute('data-product-id');
      if (pid) openProductDetail(pid);
    }
  });

  // Cart Items List Delegate (plus, minus, remove)
  document.getElementById('cartItemsList')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const plusBtn = target.closest('[data-action="cart-plus"]') as HTMLElement | null;
    const minusBtn = target.closest('[data-action="cart-minus"]') as HTMLElement | null;
    const removeBtn = target.closest('[data-action="cart-remove"]') as HTMLElement | null;

    if (plusBtn) {
      const id = plusBtn.getAttribute('data-id');
      if (id) updateCartItemQty(id, 1);
    } else if (minusBtn) {
      const id = minusBtn.getAttribute('data-id');
      if (id) updateCartItemQty(id, -1);
    } else if (removeBtn) {
      const id = removeBtn.getAttribute('data-id');
      if (id) removeCartItem(id);
    }
  });

  // Partnership Packages Table Delegate
  document.getElementById('packageTableBody')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.package-buy-btn') as HTMLElement | null;
    if (!btn) return;
    const pkgId = btn.getAttribute('data-package-id');
    const pkg = PACKAGES.find(p => p.id === pkgId);
    if (!pkg) return;
    addToCartItem(pkg.id, `Paket Kemitraan: ${pkg.name} (${pkg.qty} Pcs)`, pkg.totalPrice, 1, 'package');
    showToast(`Paket ${pkg.name} ditambahkan ke keranjang!`);
    toggleCartDrawer(true);
  });

  // Dosage Calculator
  document.getElementById('calculateDoseBtn')?.addEventListener('click', handleCalculateDose);

  // FAQ Accordion
  document.getElementById('faqAccordion')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.faq-toggle-btn') as HTMLElement | null;
    if (!btn) return;
    const index = btn.getAttribute('data-faq-index');
    if (!index) return;

    const answer = document.getElementById(`faqAnswer-${index}`);
    const icon = document.getElementById(`faqIcon-${index}`);
    if (!answer || !icon) return;

    if (answer.classList.contains('hidden')) {
      answer.classList.remove('hidden');
      icon.classList.add('rotate-180');
    } else {
      answer.classList.add('hidden');
      icon.classList.remove('rotate-180');
    }
  });

  // Admin Login Modal Actions
  document.getElementById('closeAdminLoginBtn')?.addEventListener('click', closeAdminLogin);
  document.getElementById('cancelAdminLoginBtn')?.addEventListener('click', closeAdminLogin);
  document.getElementById('adminLoginForm')?.addEventListener('submit', handleAdminLogin);
  document.getElementById('toggleLoginEyeBtn')?.addEventListener('click', () => {
    togglePasswordVisibility('adminApiKeyInput', 'loginEyeIcon');
  });

  // Admin Dashboard Actions
  document.getElementById('closeAdminDashboardBtn')?.addEventListener('click', closeAdminDashboard);
  document.getElementById('logoutAdminBtn')?.addEventListener('click', logoutAdmin);
  document.getElementById('tabBtnProducts')?.addEventListener('click', () => switchAdminTab('products'));
  document.getElementById('tabBtnSecurity')?.addEventListener('click', () => switchAdminTab('security'));
  document.getElementById('tabBtnConfig')?.addEventListener('click', () => switchAdminTab('config'));
  document.getElementById('openNewProductFormBtn')?.addEventListener('click', () => openProductForm('create'));
  document.getElementById('refreshSyncBtn')?.addEventListener('click', () => syncProductsFromSheets(true));

  // Admin Product Table Delegate (edit, archive)
  document.getElementById('adminProductTableBody')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const editBtn = target.closest('[data-action="admin-edit"]') as HTMLElement | null;
    const archiveBtn = target.closest('[data-action="admin-archive"]') as HTMLElement | null;

    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      if (id) openProductForm('edit', id);
    } else if (archiveBtn) {
      const id = archiveBtn.getAttribute('data-id');
      if (id) openDeleteConfirmModal(id);
    }
  });

  // Product Form Modal Actions
  document.getElementById('closeProductFormBtn')?.addEventListener('click', closeProductForm);
  document.getElementById('cancelProductFormBtn')?.addEventListener('click', closeProductForm);
  document.getElementById('productCrudForm')?.addEventListener('submit', handleProductFormSubmit);

  // Archive / Delete Confirmation Modal Actions
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteConfirmModal);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', executeProductDeletion);

  // Security Form & Eye Buttons
  document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePassword);
  document.getElementById('curPassEyeBtn')?.addEventListener('click', () => togglePasswordVisibility('currentAdminPass', 'curPassEye'));
  document.getElementById('newPassEyeBtn')?.addEventListener('click', () => togglePasswordVisibility('newAdminPass', 'newPassEye'));
  document.getElementById('confirmPassEyeBtn')?.addEventListener('click', () => togglePasswordVisibility('confirmNewAdminPass', 'confirmPassEye'));

  // Google Sheets Config Form Actions
  document.getElementById('gasConfigForm')?.addEventListener('submit', saveDatabaseConfig);
  document.getElementById('testDbConnectionBtn')?.addEventListener('click', testDatabaseConnection);

  // Automatic initial background sync if URL configured
  if (GOOGLE_APPS_SCRIPT_URL) {
    syncProductsFromSheets(false);
  }
}

// Inisialisasi otomatis saat script dijalankan di browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initApp());
  } else {
    initApp();
  }
}
