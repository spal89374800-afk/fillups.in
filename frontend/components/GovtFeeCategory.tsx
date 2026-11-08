import { useState } from 'react';
import { ChevronDown, ChevronUp, IndianRupee, ShieldCheck, Sparkles } from 'lucide-react';

// ========================================================
// 💰 CATEGORY-WISE GOVERNMENT FEE
// ========================================================
// Government forms me har category (Gen / OBC / SC / ST / EWS / Female / PwD)
// ki fee alag hoti hai. Expert/operator ek baar table bharta hai; citizen apni
// category chunta hai aur usi ka amount lagta hai. Blank category = General
// wali fee fallback ban jati hai.
export const GOVT_FEE_CATEGORIES = [
  { key: 'general', label: 'General', hi: 'सामान्य' },
  { key: 'obc', label: 'OBC', hi: 'ओबीसी' },
  { key: 'sc', label: 'SC', hi: 'अनुसूचित जाति' },
  { key: 'st', label: 'ST', hi: 'अनुसूचित जनजाति' },
  { key: 'ews', label: 'EWS', hi: 'ईडब्ल्यूएस' },
  { key: 'female', label: 'Female', hi: 'महिला' },
  { key: 'pwd', label: 'PwD / Ex-Serviceman', hi: 'दिव्यांग / भूतपूर्व सैनिक' }
] as const;

export type GovtFeeCategoryKey = typeof GOVT_FEE_CATEGORIES[number]['key'];
export type GovtFeeByCategory = Partial<Record<GovtFeeCategoryKey, string>>;

export function normalizeGovtFeeByCategory(value: unknown): GovtFeeByCategory | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const clean: GovtFeeByCategory = {};
  for (const category of GOVT_FEE_CATEGORIES) {
    const raw = source[category.key];
    if (raw === undefined || raw === null) continue;
    const text = String(raw).trim();
    if (!text) continue;
    const num = Number(text);
    if (!Number.isFinite(num) || num < 0) continue;
    clean[category.key] = String(Math.round(num * 100) / 100);
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export function hasCategoryFees(value: unknown): boolean {
  const clean = normalizeGovtFeeByCategory(value);
  return Boolean(clean && Object.keys(clean).length > 0);
}

export function resolveCategoryGovtFee(
  byCategory: unknown,
  fallbackGovtFee: unknown,
  category?: string
): number {
  const table = normalizeGovtFeeByCategory(byCategory);
  const key = String(category || '').trim().toLowerCase();
  if (table && key && table[key as GovtFeeCategoryKey] !== undefined) {
    return Math.max(0, Number(table[key as GovtFeeCategoryKey]) || 0);
  }
  if (table && table.general !== undefined) {
    return Math.max(0, Number(table.general) || 0);
  }
  return Math.max(0, Number(fallbackGovtFee) || 0);
}

export function categoryLabel(category?: string): string {
  const key = String(category || '').trim().toLowerCase();
  return GOVT_FEE_CATEGORIES.find(item => item.key === key)?.label || 'General';
}

type Translator = (en: string, hi: string) => string;

// ========================================================
// ✍️ EXPERT / OPERATOR EDITOR (collapsible table)
// ========================================================
export function GovtFeeCategoryFields({
  value,
  onChange,
  t,
  accent = 'emerald',
  defaultOpen = false,
  fallbackFee
}: {
  value: GovtFeeByCategory | undefined;
  onChange: (next: GovtFeeByCategory) => void;
  t: Translator;
  accent?: 'emerald' | 'amber' | 'cyan';
  defaultOpen?: boolean;
  fallbackFee?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const table = value || {};
  const filledCount = Object.values(table).filter(v => String(v ?? '').trim() !== '').length;

  const accentClasses = accent === 'amber'
    ? {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/5',
        text: 'text-amber-300',
        input: 'focus:border-amber-500',
        button: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/30'
      }
    : accent === 'cyan'
      ? {
          border: 'border-cyan-500/30',
          bg: 'bg-cyan-500/5',
          text: 'text-cyan-300',
          input: 'focus:border-cyan-500',
          button: 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border-cyan-500/30'
        }
      : {
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/5',
          text: 'text-emerald-300',
          input: 'focus:border-emerald-500',
          button: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-500/30'
        };

  const setField = (key: GovtFeeCategoryKey, raw: string) => {
    const next: GovtFeeByCategory = { ...table };
    const clean = raw.replace(/[^\d.]/g, '');
    if (clean.trim() === '') delete next[key];
    else next[key] = clean;
    onChange(next);
  };

  const quickFillZero = () => {
    const next: GovtFeeByCategory = { ...table };
    for (const key of ['sc', 'st', 'female', 'pwd'] as const) {
      if (String(next[key] ?? '').trim() === '') next[key] = '0';
    }
    onChange(next);
  };

  return (
    <div className={`rounded-2xl border ${accentClasses.border} ${accentClasses.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left cursor-pointer"
      >
        <span className={`flex items-center gap-2 text-[11px] font-bold ${accentClasses.text}`}>
          <IndianRupee className="w-3.5 h-3.5" />
          <span>{t('Category-wise Government Fee (optional)', 'श्रेणी-वार सरकारी शुल्क (वैकल्पिक)')}</span>
          {filledCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[9px] font-mono text-white">
              {filledCount}/7
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-2.5">
          <p className="text-[10px] leading-relaxed text-slate-400">
            {t(
              'Fill the fee for each category. Any category left blank will use the General fee above.',
              'हर श्रेणी का शुल्क भरें। खाली छोड़ी गई श्रेणी में ऊपर वाला सामान्य शुल्क लगेगा।'
            )}
            {fallbackFee !== undefined && String(fallbackFee).trim() !== '' && (
              <span className="text-slate-500"> ({t('General', 'सामान्य')}: ₹{fallbackFee})</span>
            )}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GOVT_FEE_CATEGORIES.map(category => (
              <label key={category.key} className="space-y-1">
                <span className="text-[10px] font-bold text-slate-300">{t(category.label, category.hi)}</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={table[category.key] ?? ''}
                    onChange={e => setField(category.key, e.target.value)}
                    placeholder={category.key === 'general' ? (fallbackFee || '0') : '—'}
                    className={`w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono ${accentClasses.input} outline-none`}
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={quickFillZero}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${accentClasses.button}`}
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              {t('SC / ST / Female / PwD = ₹0', 'SC / ST / महिला / PwD = ₹0')}
            </button>
            {filledCount > 0 && (
              <button
                type="button"
                onClick={() => onChange({})}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
              >
                {t('Clear all', 'सभी हटाएँ')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// 🧾 CITIZEN CONFIRM POPUP (category + fee breakdown)
// ========================================================
export interface CategoryConfirmConfig {
  title: string;
  serviceName: string;
  operatorName?: string;
  govtFeeByCategory?: GovtFeeByCategory;
  fallbackGovtFee: number;
  serviceFee: number;
  submitLabel?: string;
}

export function CategoryConfirmModal({
  config,
  category,
  onCategoryChange,
  busy,
  onCancel,
  onConfirm,
  t
}: {
  config: CategoryConfirmConfig | null;
  category: GovtFeeCategoryKey;
  onCategoryChange: (next: GovtFeeCategoryKey) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: Translator;
}) {
  if (!config) return null;

  const govtFee = resolveCategoryGovtFee(config.govtFeeByCategory, config.fallbackGovtFee, category);
  const serviceFee = Math.max(0, Number(config.serviceFee) || 0);
  const total = govtFee + serviceFee;
  const tableAvailable = hasCategoryFees(config.govtFeeByCategory);

  return (
    <div className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="glass-window w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 my-auto">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white truncate">{config.title}</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {config.serviceName}
                {config.operatorName ? ` • ${config.operatorName}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('Applicant Category', 'आवेदक श्रेणी')} *</span>
          </label>
          <select
            value={category}
            onChange={e => onCategoryChange(e.target.value as GovtFeeCategoryKey)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-emerald-500 outline-none"
          >
            {GOVT_FEE_CATEGORIES.map(item => (
              <option key={item.key} value={item.key}>
                {t(item.label, item.hi)}
              </option>
            ))}
          </select>
          {!tableAvailable && (
            <p className="text-[10px] text-slate-500">
              {t(
                'This service has a single government fee. Your category is still shared with the operator.',
                'इस सेवा में एक ही सरकारी शुल्क है। आपकी श्रेणी फिर भी ऑपरेटर को भेजी जाएगी।'
              )}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">
              {t('Govt Fee', 'सरकारी शुल्क')} ({categoryLabel(category)})
            </span>
            <span className="font-mono font-bold text-amber-300">₹{govtFee}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">{t('Service Fee', 'सेवा शुल्क')}</span>
            <span className="font-mono font-bold text-emerald-300">₹{serviceFee}</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <span className="font-bold text-white">{t('Total', 'कुल')}</span>
            <span className="font-mono font-black text-white text-base">₹{total}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            {t('Cancel', 'रद्द करें')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {busy ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{busy ? t('Sending…', 'भेज रहे हैं…') : (config.submitLabel || t('Confirm & Send', 'पुष्टि करें और भेजें'))}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
