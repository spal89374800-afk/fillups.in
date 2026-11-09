import { readEnvValue } from '../env.ts';
import {
  adminUpiSettingStore,
  clearAdminUpiSetting,
  setAdminUpiSetting
} from './storeService.ts';

export const DEFAULT_ADMIN_COMMISSION_PERCENT = 17;

export function getAdminCommissionPercent(): number {
  const raw = Number(readEnvValue('ADMIN_COMMISSION_PERCENT'));
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : DEFAULT_ADMIN_COMMISSION_PERCENT;
}

export function getOperatorSharePercent(): number {
  return 100 - getAdminCommissionPercent();
}

// Admin UPI ab MongoDB me permanently save hoti hai (boot par hydrate hoti
// hai), isliye server restart / Render sleep / redeploy par gayab nahi hoti.
// Env value sirf fallback hai — agar database me kuch save na ho.
export function setAdminUpi(upiId: string, payeeName: string): void {
  setAdminUpiSetting(upiId, payeeName);
}

export function clearAdminUpi(): void {
  clearAdminUpiSetting();
}

export function getAdminUpi(): { upiId: string; payeeName: string } {
  return {
    upiId: adminUpiSettingStore?.upiId || readEnvValue('ADMIN_UPI_ID') || '',
    payeeName: adminUpiSettingStore?.payeeName || readEnvValue('ADMIN_UPI_NAME') || 'DigiSeva Admin'
  };
}

/** 'database' = admin console se save kiya (persistent), 'env' = .env fallback, 'not_configured' = koi UPI nahi. */
export function getAdminUpiSource(): 'database' | 'env' | 'not_configured' {
  if (adminUpiSettingStore?.upiId) return 'database';
  return readEnvValue('ADMIN_UPI_ID') ? 'env' : 'not_configured';
}

// 🏛️ Government UPI is now strictly per-order (see order.govtUpiId /
// order.govtQrImage in paymentRoutes). There is no global/env fallback: the
// assigned operator sets it for each order and it is cleared when the order
// completes. This keeps the government payment details ephemeral.

export interface FeeBreakdown {
  govtFee: number;
  serviceFee: number;
  adminCommission: number;
  adminCommissionPercent: number;
  operatorShare: number;
  operatorSharePercent: number;
  total: number;
}

export function computeFeeBreakdown(serviceFeeRaw: unknown, govtFeeRaw: unknown): FeeBreakdown {
  const serviceFee = Math.max(0, Number(serviceFeeRaw) || 0);
  const govtFee = Math.max(0, Number(govtFeeRaw) || 0);
  const adminCommissionPercent = getAdminCommissionPercent();
  // Admin fee is never zero: minimum ₹1 per order.
  const adminCommission = Math.max(1, Math.round((serviceFee * adminCommissionPercent) / 100 * 100) / 100);
  const operatorShare = Math.max(0, Math.round((serviceFee - adminCommission) * 100) / 100);
  return {
    govtFee,
    serviceFee,
    adminCommission,
    adminCommissionPercent,
    operatorShare,
    operatorSharePercent: getOperatorSharePercent(),
    total: Math.round((govtFee + Math.max(serviceFee, adminCommission)) * 100) / 100
  };
}

export function buildUpiUri(upiId: string, payeeName: string, amount: number, note: string): string {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
}
