import type { SecurityState } from '../types';

export const BRUTE_FORCE_CONFIG = {
  maxAttempts: 5,
  lockoutDurationSeconds: 60,
  storageKey: 'bpcareu_admin_security_state'
};

export function escapeHTML(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getSecurityState(): SecurityState {
  if (typeof window === 'undefined') {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
  try {
    const raw = localStorage.getItem(BRUTE_FORCE_CONFIG.storageKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return { failedAttempts: 0, lockedUntil: 0 };
}

export function saveSecurityState(state: SecurityState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRUTE_FORCE_CONFIG.storageKey, JSON.stringify(state));
  } catch (e) {
    // Ignore storage quota errors
  }
}

export function resetSecurityState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BRUTE_FORCE_CONFIG.storageKey);
  } catch (e) {
    // Ignore error
  }
}
