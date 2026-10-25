import { readEnvValue } from '../env.ts';

export const DEFAULT_ADMIN_COMMISSION_PERCENT = 17;

export function getAdminCommissionPercent(): number {
  const raw = Number(readEnvValue('ADMIN_COMMISSION_PERCENT'));
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : DEFAULT_ADMIN_COMMISSION_PERCENT;
}

export function getOperatorSharePercent(): number {
  return 100 - getAdminCommissionPercent();
}

// Admin UPI ID ko server restart ke bina bhi set kiya ja sake —
// admin console se. Env value hamesha fallback rehti hai.
let runtimeAdminUpiId = '';
let runtimeAdminPayeeName = '';

export function setAdminUpi(upiId: string, payeeName: string): void {
  runtimeAdminUpiId = upiId.trim().toLowerCase();
  runtimeAdminPayeeName = payeeName.trim();
}

export function clearAdminUpi(): void {
  runtimeAdminUpiId = '';
  runtimeAdminPayeeName = '';
}

export function getAdminUpi(): { upiId: string; payeeName: string } {
  return {
    upiId: runtimeAdminUpiId || readEnvValue('ADMIN_UPI_ID') || '',
    payeeName: runtimeAdminPayeeName || readEnvValue('ADMIN_UPI_NAME') || 'DigiSeva Admin'
  };
}

/** 'runtime' = admin console se abhi set kiya, 'env' = .env.local se, 'not_configured' = koi UPI nahi. */
export function getAdminUpiSource(): 'runtime' | 'env' | 'not_configured' {
  if (runtimeAdminUpiId) return 'runtime';
  return readEnvValue('ADMIN_UPI_ID') ? 'env' : 'not_configured';
}

let runtimeGovtUpiId = '';
let runtimeGovtPayeeName = '';

export function setGovtUpi(upiId: string, payeeName: string): void {
  runtimeGovtUpiId = upiId.trim().toLowerCase();
  runtimeGovtPayeeName = payeeName.trim();
}

export function clearGovtUpi(): void {
  runtimeGovtUpiId = '';
  runtimeGovtPayeeName = '';
}

export function getGovtUpi(): { upiId: string; payeeName: string } {
  return {
    upiId: runtimeGovtUpiId || readEnvValue('GOVT_UPI_ID') || '',
    payeeName: runtimeGovtPayeeName || readEnvValue('GOVT_UPI_NAME') || 'Government Fee'
  };
}

/** 'runtime' = admin console se abhi set kiya, 'env' = .env.local se, 'not_configured' = koi UPI nahi. */
export function getGovtUpiSource(): 'runtime' | 'env' | 'not_configured' {
  if (runtimeGovtUpiId) return 'runtime';
  return readEnvValue('GOVT_UPI_ID') ? 'env' : 'not_configured';
}

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
