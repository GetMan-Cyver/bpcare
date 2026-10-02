import { describe, it, expect } from 'vitest';
import { calculateDosage } from '../src/utils/calculator';
import { formatIDR, calculateCartTotals, validateIndonesianPhone, buildWhatsAppOrderMessage } from '../src/utils/cart';
import { escapeHTML, BRUTE_FORCE_CONFIG } from '../src/utils/security';
import { PACKAGES } from '../src/data/packages';
import { INITIAL_PRODUCTS } from '../src/data/products';
import type { CartItem } from '../src/types';

describe('1. Dosage Calculator Algorithm Tests', () => {
  it('calculates dosage accurately for adults with standard weight', () => {
    const result = calculateDosage(60, 'adult', 'stamina');
    expect(result.drops).toBe(6);
    expect(result.frequency).toContain('2 kali sehari');
    expect(result.suggestion).toContain('British Propolis Regular');
  });

  it('adjusts dosage for adult during recovery phase', () => {
    const result = calculateDosage(70, 'adult', 'recovery');
    // 70kg / 10 = 7, recovery adds 2 drops = 9
    expect(result.drops).toBe(9);
    expect(result.frequency).toContain('3 kali sehari');
  });

  it('caps adult maximum recovery drops appropriately', () => {
    const result = calculateDosage(120, 'adult', 'recovery');
    expect(result.drops).toBe(10); // Min(10, drops + 2)
  });

  it('recommends Green Kids formula for children within safe limits', () => {
    const result = calculateDosage(25, 'child', 'stamina');
    expect(result.drops).toBe(3); // round(25/10) = 3
    expect(result.suggestion).toContain('British Propolis Green Kids');
  });

  it('clamps child dosage between 2 and 4 drops', () => {
    const lowWeight = calculateDosage(10, 'child', 'stamina');
    expect(lowWeight.drops).toBe(2);

    const highWeight = calculateDosage(60, 'child', 'stamina');
    expect(highWeight.drops).toBe(4);
  });
});

describe('2. Cart & Currency Utilities Tests', () => {
  it('formats Indonesian Rupiah properly', () => {
    expect(formatIDR(265000)).toBe('Rp 265.000');
    expect(formatIDR(0)).toBe('Rp 0');
    expect(formatIDR(7800000)).toBe('Rp 7.800.000');
  });

  it('calculates cart item count and subtotal accurately', () => {
    const items: CartItem[] = [
      { id: 'bp-reguler', name: 'BP Regular', price: 265000, qty: 2, type: 'product' },
      { id: 'pkg-family', name: 'Paket Family', price: 720000, qty: 1, type: 'package' }
    ];
    const totals = calculateCartTotals(items);
    expect(totals.totalItems).toBe(3);
    expect(totals.subtotal).toBe(265000 * 2 + 720000);
  });

  it('handles empty cart gracefully', () => {
    const totals = calculateCartTotals([]);
    expect(totals.totalItems).toBe(0);
    expect(totals.subtotal).toBe(0);
  });
});

describe('3. Indonesian WhatsApp Phone Validation Tests', () => {
  it('validates standard Indonesian mobile numbers', () => {
    expect(validateIndonesianPhone('081234567890')).toBe(true);
    expect(validateIndonesianPhone('+6281234567890')).toBe(true);
    expect(validateIndonesianPhone('6281987654321')).toBe(true);
    expect(validateIndonesianPhone('0857-1234-5678')).toBe(true);
    expect(validateIndonesianPhone('+62 813 9988 7766')).toBe(true);
  });

  it('rejects invalid or foreign numbers', () => {
    expect(validateIndonesianPhone('123456')).toBe(false);
    expect(validateIndonesianPhone('0217654321')).toBe(false); // Landline prefix 021
    expect(validateIndonesianPhone('+14155552671')).toBe(false); // US phone
    expect(validateIndonesianPhone('abcdefghijk')).toBe(false);
  });
});

describe('4. WhatsApp Order Formatter Tests', () => {
  it('generates structured WhatsApp order message', () => {
    const cart: CartItem[] = [
      { id: 'bp-reguler', name: 'British Propolis Regular', price: 265000, qty: 2, type: 'product' }
    ];
    const message = buildWhatsAppOrderMessage({
      name: 'Ahmad Fauzi',
      phone: '08123456789',
      address: 'Jl. Sudirman No. 12, Jakarta Pusat',
      notes: 'Harap packing bubble wrap tebal',
      cart,
      subtotal: 530000
    });

    expect(message).toContain('*FORMAT PESANAN RESMI BPCAREU*');
    expect(message).toContain('Ahmad Fauzi');
    expect(message).toContain('08123456789');
    expect(message).toContain('Jl. Sudirman No. 12, Jakarta Pusat');
    expect(message).toContain('Harap packing bubble wrap tebal');
    expect(message).toContain('British Propolis Regular (2x) = Rp 530.000');
    expect(message).toContain('*Total Tagihan:* Rp 530.000');
  });
});

describe('5. Security & Anti-Brute-Force Configuration Tests', () => {
  it('escapes dangerous HTML characters to prevent XSS', () => {
    const raw = '<script>alert("hack")</script>&"\'';
    const escaped = escapeHTML(raw);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#39;');
  });

  it('has strict brute-force configuration', () => {
    expect(BRUTE_FORCE_CONFIG.maxAttempts).toBe(5);
    expect(BRUTE_FORCE_CONFIG.lockoutDurationSeconds).toBe(60);
  });
});

describe('6. Data Integrity Tests', () => {
  it('contains all 6 official BP Group products with valid properties', () => {
    expect(INITIAL_PRODUCTS.length).toBe(6);
    for (const prod of INITIAL_PRODUCTS) {
      expect(prod.id).toBeTruthy();
      expect(prod.name).toBeTruthy();
      expect(prod.price).toBeGreaterThan(0);
      expect(prod.bpom).toBeTruthy();
      expect(prod.image).toMatch(/^https?:\/\//);
      expect(prod.benefits.length).toBeGreaterThan(0);
    }
  });

  it('contains all 6 official partnership packages with correct pricing tier', () => {
    expect(PACKAGES.length).toBe(6);
    // Verifying wholesale volume discounting
    const [satuan, family, agent, ap, sap, se] = PACKAGES;
    expect(satuan.unitPrice).toBe(265000);
    expect(family.unitPrice).toBe(240000);
    expect(agent.unitPrice).toBe(225000);
    expect(ap.unitPrice).toBe(210000);
    expect(sap.unitPrice).toBe(195000);
    expect(se.unitPrice).toBe(175000);

    // Quantity checks
    expect(satuan.qty).toBe(1);
    expect(family.qty).toBe(3);
    expect(agent.qty).toBe(5);
    expect(ap.qty).toBe(10);
    expect(sap.qty).toBe(40);
    expect(se.qty).toBe(200);

    // Total price calculations
    for (const pkg of PACKAGES) {
      expect(pkg.totalPrice).toBe(pkg.qty * pkg.unitPrice);
    }
  });
});
