import { useState, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import { UserCheck, Building2, Search, FileText, CheckCircle2, ShieldCheck, Sparkles, ArrowRight, ArrowLeft, Loader2, Lock, Phone, Mail, Globe, Save, Check, Maximize, Minimize, Minus, AlertCircle, Bell, MapPin, Edit3, Plus, Trash2, X, Users, CheckCircle, Clock, LogOut, ChevronRight, ChevronUp, User as UserIcon, Send, MessageSquare, PhoneCall, Paperclip, Image as ImageIcon, CreditCard, Smartphone, ExternalLink, ShieldAlert, Mic, MicOff, FileUp, Eye, Zap, Copy, Filter, Camera, Download, Sun, Moon, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HeartbeatToFormLine } from './components/HeartbeatToFormLine';
import { OrderStatusFilter, OrderStatusFilterValue } from './components/OrderStatusFilter';
import { PayoutSettingsPanel } from './components/PayoutSettingsPanel';
import { LocationAutocomplete } from './components/LocationAutocomplete';
import { StateSelect } from './components/StateSelect';
import { AdminSecurityPanel } from './components/AdminSecurityPanel';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { GovtFeeCategoryFields, CategoryConfirmModal, GOVT_FEE_CATEGORIES, resolveCategoryGovtFee, normalizeGovtFeeByCategory, categoryLabel } from './components/GovtFeeCategory';
import type { GovtFeeByCategory, GovtFeeCategoryKey, CategoryConfirmConfig } from './components/GovtFeeCategory';
import TermsCitizen from './components/legal/TermsCitizen';
import TermsJanSeva from './components/legal/TermsJanSeva';
import TermsFormFiller from './components/legal/TermsFormFiller';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import { LocalizedTree } from './localization';
import { applyDocumentLanguage, readStoredLanguage, storeLanguage } from './language';
import { realtimeSocket } from './realtime';
import { createBlinkLivenessEngine } from './services/blinkLiveness';
import { getCaptchaToken } from './services/turnstile';
import { API_FALLBACK_ORIGIN, fetchWithRetry, isApiRequestUrl, parseJsonResponse, shouldFallbackToApiOrigin } from './services/apiClient';
import type { BlinkEngine } from './services/blinkLiveness';

export const getDocRequirements = (item: { id?: string; docName?: string; requirements?: string; title?: string }) => {
  if (item.requirements && item.requirements.trim()) return item.requirements;
  return 'Required documents have not been provided by the service provider.';
};

// =========================================================================
// LOGIN / REGISTRATION REQUIRED-FIELD VALIDATION
// Every detail shown on a login or registration form must be filled with a
// valid value. If even one field is missing or invalid we block submission
// and tell the user exactly which details are missing.
// =========================================================================
export const isNonEmpty = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
export const isValidEmail = (value: unknown) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
export const isValidMobile = (value: unknown) =>
  /^[6-9]\d{9}$/.test(String(value || '').replace(/\D/g, '').slice(-10));
export const collectMissingFields = (checks: Array<{ label: string; ok: boolean }>) =>
  checks.filter(check => !check.ok).map(check => check.label);
export const requiredFieldsMessage = (missing: string[]) =>
  `⚠️ All details are required. Please fill: ${missing.join(', ')}.`;

const takeServerSnapshot = (ref: { current: string | null }, payload: unknown): string | null => {
  const json = JSON.stringify(payload);
  const previous = ref.current;
  ref.current = json;
  return previous === json ? null : json;
};

// =========================================================================
// REUSABLE 3D BRAND EMBLEM: 3D COMPUTER + F + ILLUP + 3D FIRM EMBLEM
// =========================================================================
export const BrandEmblem3D = ({
  size = 'md',
  layout = 'row',
  subtitle = 'JAN SEVA & CYBER CAFE FIRM',
  onClick,
}: {
  size?: 'sm' | 'md' | 'lg';
  layout?: 'row' | 'col';
  subtitle?: string;
  onClick?: () => void;
}) => {
  const isCol = layout === 'col';
  const logoBoxClass = size === 'sm' ? 'w-8 h-8 sm:w-10 sm:h-10' : size === 'md' ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-16 h-16 sm:w-20 sm:h-20';
  const fTextClass = size === 'sm' ? 'text-xl sm:text-2xl' : size === 'md' ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl';
  const illupTextClass = size === 'sm' ? 'text-xs sm:text-sm' : size === 'md' ? 'text-sm sm:text-lg' : 'text-xl sm:text-2xl';
  const subtitleClass = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';

  return (
    <div
      onClick={onClick}
      className={`flex ${isCol ? 'flex-col items-center text-center gap-3' : 'items-center gap-3'} ${onClick ? 'cursor-pointer' : ''} group select-none`}
    >
      {/* 3D Computer / Laptop Workstation Emblem */}
      <div className={`relative ${logoBoxClass} flex items-center justify-center group-hover:scale-105 transition-all duration-300 shrink-0`}>
        {/* Ambient 3D Brand Glow Aura */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/35 via-blue-500/25 to-indigo-600/35 rounded-2xl blur-md group-hover:blur-lg transition-all pointer-events-none" />

        {/* Multi-layered Glass Bevel Frame */}
        <div className="relative w-full h-full rounded-2xl p-[1px] bg-gradient-to-b from-cyan-400/80 via-blue-500/50 to-indigo-600/70 shadow-xl shadow-cyan-500/15 group-hover:shadow-cyan-500/35 transition-all flex items-center justify-center overflow-hidden">
          <div className="w-full h-full bg-[#080D18]/95 backdrop-blur-md rounded-[15px] flex items-center justify-center p-1.5 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
            <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_2px_10px_rgba(6,182,212,0.7)]">
              <defs>
                <linearGradient id="brand3dCompScreenLid" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#1e40af" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="brand3dCompScreenDisplay" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#051024" />
                </linearGradient>
                <linearGradient id="brand3dCompBaseDeck" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="50%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="brand3dCompBaseFront" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="brand3dCompOrbit" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              {/* Ambient Base Shadow */}
              <ellipse cx="32" cy="55" rx="24" ry="3.5" fill="#000000" opacity="0.6" />

              {/* 3D Orbital Cyberspace Ring */}
              <ellipse cx="32" cy="33" rx="28" ry="12" fill="none" stroke="url(#brand3dCompOrbit)" strokeWidth="1.4" strokeDasharray="3 2" transform="rotate(-18 32 33)" />

              {/* 3D Laptop Base (Keyboard Deck) */}
              <polygon points="16,34 48,34 56,48 8,48" fill="url(#brand3dCompBaseDeck)" />
              {/* Aluminum Chamfer Highlight Edge */}
              <line x1="8" y1="48" x2="56" y2="48" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
              {/* Front Lip Thickness */}
              <polygon points="8,48 56,48 56,52 8,52" fill="url(#brand3dCompBaseFront)" />
              {/* Front Glowing LED Power Bar */}
              <line x1="26" y1="50" x2="38" y2="50" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" filter="drop-shadow(0 0 3px #06b6d4)" />

              {/* Backlit Keyboard Area */}
              <polygon points="18,36 46,36 50,44 14,44" fill="#061224" stroke="#0284c7" strokeWidth="0.6" />
              <line x1="17" y1="38.5" x2="47" y2="38.5" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="2 1" opacity="0.8" />
              <line x1="16" y1="41" x2="48" y2="41" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="2 1" opacity="0.8" />
              <line x1="15" y1="43" x2="49" y2="43" stroke="#67e8f9" strokeWidth="0.75" strokeDasharray="2.5 1" opacity="0.85" />
              {/* Glowing Trackpad */}
              <polygon points="27,45 37,45 38,47.5 26,47.5" fill="#0b172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.9" />

              {/* 3D Laptop Screen */}
              <polygon points="17,9 47,9 48,34 16,34" fill="url(#brand3dCompScreenLid)" />
              <polygon points="16,9 17,9 16,34 15,34" fill="#0284c7" opacity="0.7" />
              <polygon points="18,11 46,11 47,33 17,33" fill="#020617" />
              <polygon points="20,13 44,13 45,31 19,31" fill="url(#brand3dCompScreenDisplay)" />
              <polygon points="20,13 32,13 22,31 19,31" fill="#ffffff" opacity="0.35" />

              {/* Screen Holographic UI: Biometric Shield */}
              <circle cx="32" cy="20" r="4.5" fill="none" stroke="#a5f3fc" strokeWidth="1" filter="drop-shadow(0 0 3px #38bdf8)" />
              <path d="M30 20 L31.5 21.5 L34 19" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="23" y1="27" x2="33" y2="27" stroke="#67e8f9" strokeWidth="1" opacity="0.8" />
              <line x1="23" y1="29.5" x2="29" y2="29.5" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
              <circle cx="41" cy="27" r="1.5" fill="#34d399" filter="drop-shadow(0 0 3px #10b981)" />

              {/* Floating 3D Spark Vertices */}
              <circle cx="9" cy="24" r="1.4" fill="#a5f3fc" filter="drop-shadow(0 0 3px #06b6d4)" />
              <circle cx="55" cy="42" r="1.4" fill="#38bdf8" filter="drop-shadow(0 0 3px #3b82f6)" />
              <circle cx="32" cy="7" r="1.4" fill="#c084fc" filter="drop-shadow(0 0 3px #a855f7)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Brand Text: Large F + ILLUP with 3D FIRM Emblem Underline */}
      <div className={`flex flex-col ${isCol ? 'items-center' : 'justify-center'}`}>
        <div className="font-black tracking-normal text-white font-['Poppins'] flex items-baseline group-hover:brightness-110 transition-all leading-none">
          <span className={`${fTextClass} font-serif italic font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.55)] pr-0.5 leading-none select-none`}>
            F
          </span>
          <span className={`${illupTextClass} font-black tracking-[0.22em] text-white self-center pb-0.5 font-['Poppins',sans-serif] brand-illup-text`}>
            ILLUP
          </span>
        </div>

        {/* Signature Line: Heartbeat pulse directly forming the Application Form document */}
        <div className="flex w-full items-center justify-center my-0.5 pointer-events-none">
          <HeartbeatToFormLine size={size === 'lg' ? 'md' : size === 'sm' ? 'sm' : 'sm'} />
        </div>

        {subtitle && (
          <p className={`${subtitleClass} hidden sm:block text-cyan-400/90 font-mono tracking-widest uppercase font-bold`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

// 3D Isometric Form Item Icon Badge
export const FormCard3DIcon = ({
  icon = '📝',
  className = '',
  size = 'md',
}: {
  icon?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const boxSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-12 h-12';
  const svgSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';

  const isMed = icon === '🩺' || icon?.includes('🩺');
  const isEng = icon === '⚡' || icon?.includes('⚡');
  const isSch = icon === '🎓' || icon?.includes('🎓') || icon === '🏛️';
  const isPol = icon === '👮' || icon?.includes('👮');

  const themeGlow = isMed
    ? 'from-rose-500/35 via-red-500/20 to-emerald-500/20'
    : isEng
    ? 'from-amber-500/35 via-yellow-500/20 to-cyan-500/20'
    : isSch
    ? 'from-sky-500/35 via-blue-500/20 to-indigo-500/20'
    : isPol
    ? 'from-indigo-500/35 via-blue-500/20 to-sky-500/20'
    : 'from-emerald-500/35 via-teal-500/20 to-cyan-500/20';

  const borderColor = isMed
    ? 'border-rose-400/50'
    : isEng
    ? 'border-amber-400/50'
    : isSch
    ? 'border-sky-400/50'
    : isPol
    ? 'border-indigo-400/50'
    : 'border-emerald-400/50';

  const shadowGlow = isMed
    ? 'shadow-[0_8px_20px_rgba(244,63,94,0.35)]'
    : isEng
    ? 'shadow-[0_8px_20px_rgba(245,158,11,0.35)]'
    : isSch
    ? 'shadow-[0_8px_20px_rgba(14,165,233,0.35)]'
    : 'shadow-[0_8px_20px_rgba(16,185,129,0.35)]';

  const randomKey = (icon || 'doc').replace(/[^a-zA-Z0-9]/g, '_');

  return (
    <div
      className={`relative ${boxSize} rounded-2xl bg-gradient-to-br ${themeGlow} ${borderColor} border p-1 flex items-center justify-center ${shadowGlow} shrink-0 overflow-hidden group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 ${className}`}
    >
      {/* 3D Specular highlight line */}
      <div className="absolute top-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[0.5px] pointer-events-none z-10" />
      <div className="absolute inset-0 bg-[#070A10]/85 backdrop-blur-md rounded-[14px] pointer-events-none" />

      {/* 3D Isometric SVG Graphic */}
      <svg viewBox="0 0 100 100" className={`${svgSize} relative z-10 drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]`}>
        <defs>
          <radialGradient id={`f3d_sheet_${randomKey}`} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={isMed ? '#fda4af' : isEng ? '#fde047' : isSch ? '#7dd3fc' : '#a7f3d0'} />
            <stop offset="45%" stopColor={isMed ? '#f43f5e' : isEng ? '#f59e0b' : isSch ? '#0284c7' : '#10b981'} />
            <stop offset="100%" stopColor={isMed ? '#9f1239' : isEng ? '#b45309' : isSch ? '#0369a1' : '#047857'} />
          </radialGradient>
          <linearGradient id={`f3d_fold_${randomKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`f3d_pen_${randomKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* 3D Depth Shadow */}
        <polygon points="32,22 80,36 60,86 12,72" fill="#000000" opacity="0.6" />

        {/* 3D Isometric Document Sheet */}
        <polygon points="28,16 76,30 56,80 8,66" fill={`url(#f3d_sheet_${randomKey})`} />

        {/* 3D Corner Fold */}
        <polygon points="62,26 76,30 68,40" fill={`url(#f3d_fold_${randomKey})`} />

        {/* Form Lines on Sheet */}
        <line x1="22" y1="36" x2="52" y2="44" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
        <line x1="20" y1="46" x2="48" y2="54" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
        <line x1="18" y1="56" x2="42" y2="62" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

        {/* 3D Category Emblem */}
        {isMed ? (
          <g>
            <circle cx="58" cy="38" r="7" fill="#ffffff" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.4))" />
            <path d="M58 34 V42 M54 38 H62" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : isEng ? (
          <g>
            <circle cx="58" cy="38" r="7" fill="#ffffff" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.4))" />
            <path d="M59 33 L55 38 H61 L57 43" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : isSch ? (
          <g>
            <circle cx="58" cy="38" r="7" fill="#ffffff" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.4))" />
            <path d="M54 37 L58 35 L62 37 L58 39 Z" fill="#0284c7" />
            <path d="M55 38 V41 C55 42 61 42 61 41 V38" fill="none" stroke="#0284c7" strokeWidth="1.2" />
          </g>
        ) : (
          <g>
            <circle cx="58" cy="38" r="7" fill="#047857" stroke="#ffffff" strokeWidth="1.2" />
            <path d="M55 38 L57 40 L61 36" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* 3D Floating High-Tech Stylus / Pen */}
        <polygon points="64,52 82,34 88,40 70,58" fill={`url(#f3d_pen_${randomKey})`} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))" />
        <polygon points="64,52 70,58 60,62" fill="#7dd3fc" />
        <circle cx="60" cy="62" r="1.5" fill="#ffffff" filter="drop-shadow(0 0 2px #38bdf8)" />
      </svg>
    </div>
  );
};

// Persistent login session: stored locally so a returning user lands straight
// on their dashboard without re-entering the OTP every time.
type StoredSession = {
  role: 'client' | 'vle' | 'form_filler';
  name?: string;
  phone?: string;
  email?: string;
  state?: string;
  district?: string;
  city?: string;
  cscId?: string;
  token?: string;
  loggedInAt: number;
};

const WorkspaceSkeletonCard = () => (
  <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3" role="status" aria-label="Loading">
    <div className="h-3.5 w-2/5 rounded bg-slate-800" />
    <div className="h-3 w-3/5 rounded bg-slate-800/80" />
    <div className="h-3 w-full rounded bg-slate-800/60" />
    <div className="h-3 w-4/5 rounded bg-slate-800/60" />
    <div className="flex items-center justify-between pt-2">
      <div className="h-6 w-20 rounded-lg bg-slate-800" />
      <div className="h-8 w-24 rounded-xl bg-slate-800" />
    </div>
  </div>
);

const WorkspaceSkeletonList = ({ count = 2 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <WorkspaceSkeletonCard key={index} />
    ))}
  </div>
);

const SESSION_STORAGE_KEY = 'digiseva_session';
const LEGAL_ACCEPTED_KEY = 'digiseva_legal_accepted';

const INDIAN_STATES = [
  'Andaman & Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

// A state / UT name is not a district or city. Older saved sessions sometimes
// had the state name stored in the district/city field; ignore those values.
const sameAsStateValue = (value?: string | null, state?: string | null) =>
  Boolean(value && state && value.trim().toLowerCase() === state.trim().toLowerCase());

const readStoredDistrict = (districtKey: string, stateKey: string) => {
  try {
    const district = localStorage.getItem(districtKey) || '';
    const state = localStorage.getItem(stateKey) || '';
    return sameAsStateValue(district, state) ? '' : district;
  } catch {
    return '';
  }
};

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || !['client', 'vle', 'form_filler'].includes(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {}
}

function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

// Attach the signed-in account token to every same-origin API request so the
// backend can enforce per-account data isolation and order ownership.
if (typeof window !== 'undefined' && !(window as any).__digisevaFetchPatched) {
  (window as any).__digisevaFetchPatched = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    if (!isApiRequestUrl(requestUrl)) {
      return nativeFetch(input, init);
    }

    const token = readStoredSession()?.token;
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Absolute backend URLs already carry the token — no fallback needed.
    if (!requestUrl.startsWith('/api/')) {
      return nativeFetch(input, { ...init, headers });
    }

    const response = await nativeFetch(input, { ...init, headers });
    // Static frontend host par `/api/...` wahan nahi hota (HTML/empty response).
    // Aise case me wahi request backend origin par dobara bhejo.
    if (shouldFallbackToApiOrigin(response)) {
      return nativeFetch(`${API_FALLBACK_ORIGIN}${requestUrl}`, { ...init, headers });
    }
    return response;
  };
}

export default function App() {
  const [legalAccepted, setLegalAccepted] = useState(() => {
    try {
      return localStorage.getItem(LEGAL_ACCEPTED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<'client' | 'vle' | 'form_filler' | null>(null);

  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('fillup_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fillup_theme', theme);
    } catch {}
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('dark');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (soundAlertEnabled) playChime();
  };

  // Navigation & Active Role State: 'none' | 'client' | 'vle' | 'form_filler'
  const [activeRole, setActiveRole] = useState<'none' | 'client' | 'vle' | 'form_filler'>(() => readStoredSession()?.role ?? 'none');
  const [lang, setLang] = useState<'EN' | 'HI'>(() => readStoredLanguage());

  const toggleLang = () => {
    const next = lang === 'EN' ? 'HI' : 'EN';
    setLang(next);
    storeLanguage(next);
  };

  const t = (en: string, hi: string) => (lang === 'HI' ? hi : en);

  useEffect(() => {
    applyDocumentLanguage(lang);
    document.title = lang === 'HI'
      ? 'डिजीसेवा प्रो - ऑनलाइन जन सेवा एवं साइबर कैफ़े पोर्टल'
      : 'DigiSeva Pro - Online Jan Seva & Cyber Cafe Portal';
  }, [lang]);
  
  const [step, setStep] = useState<
    | 'landing'
    | 'client_login'
    | 'client_portal'
    | 'vle_login'
    | 'vle_register'
    | 'vle_home'
    | 'form_filler_login'
    | 'form_filler_app'
    | 'admin_security'
    | 'terms_citizen'
    | 'terms_janseva'
    | 'terms_formfiller'
    | 'privacy_policy'
  >(() => {
    const session = readStoredSession();
    if (session?.role === 'client') return 'client_portal';
    if (session?.role === 'vle') return 'vle_home';
    if (session?.role === 'form_filler') return 'form_filler_app';
    return 'landing';
  });

  // Public SEO page -> application flow. The public page sends a small intent
  // in the query string; it is preserved through login and then used to
  // pre-select the service on the same citizen portal.
  const publicServiceIntent = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('apply') !== '1') return null;
      const name = (params.get('name') || '').trim();
      if (!name) return null;
      return {
        slug: (params.get('service') || '').trim(),
        name,
        scope: (params.get('scope') || 'district').trim()
      };
    } catch {
      return null;
    }
  }, []);
  const [pendingPublicService, setPendingPublicService] = useState<{ slug: string; name: string; scope: string } | null>(() => {
    if (publicServiceIntent) return publicServiceIntent;
    try {
      const raw = sessionStorage.getItem('digiseva_pending_public_service');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWorkspaceMinimized, setIsWorkspaceMinimized] = useState(false);
  // Mobile workspace chrome: the top bar hides while chatting so messages get
  // the full screen. Desktop keeps the header always visible.
  const [isWorkspaceHeaderHidden, setIsWorkspaceHeaderHidden] = useState(false);
  const [mobileWorkspacePanel, setMobileWorkspacePanel] = useState<'none' | 'proof' | 'payments' | 'pdf' | 'whatsapp'>('none');

  const hideMobileWorkspaceHeader = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsWorkspaceHeaderHidden(true);
    }
  };

  // --- LIVE CAMERA CAPTURE SYSTEM STATE ---
  const [liveCameraToken, setLiveCameraToken] = useState<string | null>(() => {
    try {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const fullUrl = search + hash;
      const params = new URLSearchParams(fullUrl.includes('?') ? fullUrl.split('?')[1] : '');
      return params.get('token');
    } catch {
      return null;
    }
  });
  const liveCameraTokenRef = useRef<string | null>(null);
  liveCameraTokenRef.current = liveCameraToken;
  const [liveCameraSessionInfo, setLiveCameraSessionInfo] = useState<any | null>(null);
  const [isSubmittingLiveCam, setIsSubmittingLiveCam] = useState(false);
  const [liveCamSuccess, setLiveCamSuccess] = useState(false);
  const [isClientCameraOn, setIsClientCameraOn] = useState(false);
  const [isClientPreviewReady, setIsClientPreviewReady] = useState(false);
  const [clientCameraError, setClientCameraError] = useState('');
  const [isExpertCameraConnected, setIsExpertCameraConnected] = useState(false);
  // Eye-blink liveness state (citizen ke phone par blink detect)
  const [clientBlinkVerified, setClientBlinkVerified] = useState(false);
  const [clientBlinkMessage, setClientBlinkMessage] = useState('Blink check not started');
  const [isClientBlinkActive, setIsClientBlinkActive] = useState(false);
  const [, setIsExpertCameraConnecting] = useState(false);
  // Citizen blink verify hone par operator ko socket se milta hai (liveness).
  const [, setIsExpertBlinkVerified] = useState(false);
  const [, setIsClientBlinkUnavailable] = useState(false);
  const [requestedCameraSession, setRequestedCameraSession] = useState<any | null>(null);
  const clientCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const expertCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const clientCameraStreamRef = useRef<MediaStream | null>(null);
  const expertCameraStreamRef = useRef<MediaStream | null>(null);
  const rtcPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const rtcTargetSocketIdRef = useRef('');
  const rtcPendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const iceServersRef = useRef<RTCIceServer[]>([{ urls: 'stun:stun.l.google.com:19302' }]);
  const liveCameraSessionInfoRef = useRef<any | null>(null);
  liveCameraSessionInfoRef.current = liveCameraSessionInfo;
  const requestedCameraSessionRef = useRef<any | null>(null);
  requestedCameraSessionRef.current = requestedCameraSession;
  const isClientCameraOnRef = useRef(false);
  isClientCameraOnRef.current = isClientCameraOn;
  const clientBlinkEngineRef = useRef<BlinkEngine | null>(null);

  useEffect(() => {
    if (liveCameraToken) {
      fetch(`/api/live-camera/session/${liveCameraToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setLiveCameraSessionInfo(data.session);
            realtimeSocket.emit('order:join', {
              orderId: data.session.orderId,
              role: 'client',
              phone: data.session.clientPhone
            }, (result: { success: boolean; error?: string }) => {
              if (!result.success) {
                setClientCameraError(result.error || 'This camera request is not linked to your mobile number.');
                return;
              }
              realtimeSocket.emit('live-camera:join', { token: liveCameraToken });
            });
          }
        })
        .catch(err => console.warn('Failed to load live camera session:', err));
    }
  }, [liveCameraToken]);

  const stopLiveCamera = (notifyPeer = true) => {
    if (
      notifyPeer &&
      liveCameraTokenRef.current &&
      liveCameraSessionInfo?.orderId &&
      realtimeSocket.connected
    ) {
      realtimeSocket.emit('rtc:stop', {
        orderId: liveCameraSessionInfo.orderId,
        token: liveCameraTokenRef.current
      });
    }
    clientCameraStreamRef.current?.getTracks().forEach(track => track.stop());
    clientCameraStreamRef.current = null;
    if (clientCameraVideoRef.current) clientCameraVideoRef.current.srcObject = null;
    rtcPeerConnectionRef.current?.close();
    rtcPeerConnectionRef.current = null;
    rtcTargetSocketIdRef.current = '';
    expertCameraStreamRef.current = null;
    if (expertCameraVideoRef.current) expertCameraVideoRef.current.srcObject = null;
    setIsClientCameraOn(false);
    setIsClientPreviewReady(false);
    setIsExpertCameraConnected(false);
    setIsExpertCameraConnecting(false);
    clientBlinkEngineRef.current?.stop();
    clientBlinkEngineRef.current = null;
    setClientBlinkVerified(false);
    setIsClientBlinkActive(false);
    setClientBlinkMessage('Blink check not started');
  };

  const handleEnableClientCamera = async () => {
    if (!liveCameraSessionInfo || !liveCameraToken) return;
    setClientCameraError('');
    setIsClientPreviewReady(false);
    if (!window.isSecureContext) {
      setClientCameraError('Camera access requires HTTPS. Open this request from the secure app URL.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setClientCameraError('This browser does not support HTML5 camera access. Try a recent mobile browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
      clientCameraStreamRef.current = stream;
      if (clientCameraVideoRef.current) {
        clientCameraVideoRef.current.srcObject = stream;
        await clientCameraVideoRef.current.play();
      }
      setIsClientCameraOn(true);

      // Eye-blink liveness: citizen ke phone par palak jhapkate hi verify
      clientBlinkEngineRef.current?.stop();
      setClientBlinkVerified(false);
      setIsClientBlinkActive(true);
      setClientBlinkMessage('Starting blink check…');
      const blinkEngine = createBlinkLivenessEngine((status, message) => {
        setClientBlinkMessage(message);
        setClientBlinkVerified(status === 'verified');
        if (status === 'verified' || status === 'engine-unavailable') setIsClientBlinkActive(false);
        if (status === 'verified') {
          // Operator ko batao ki liveness (blink) ho gaya hai — tabhi wo capture karega.
          realtimeSocket.emit('live-camera:blink-verified', { token: liveCameraToken });
        } else if (status === 'engine-unavailable') {
          // Offline / engine load fail — operator capture block na ho.
          realtimeSocket.emit('live-camera:blink-unavailable', { token: liveCameraToken });
        }
      });
      clientBlinkEngineRef.current = blinkEngine;
      if (clientCameraVideoRef.current) void blinkEngine.start(clientCameraVideoRef.current);

      realtimeSocket.emit('order:join', {
        orderId: liveCameraSessionInfo.orderId,
        role: 'client',
        phone: liveCameraSessionInfo.clientPhone
      }, (joinResult: { success: boolean; error?: string }) => {
        if (!joinResult.success) {
          setClientCameraError(joinResult.error || 'Could not connect to this order.');
          stopLiveCamera(false);
          return;
        }
        realtimeSocket.emit('live-camera:join', { token: liveCameraToken }, (cameraResult: { success: boolean; error?: string }) => {
          if (!cameraResult.success) {
            setClientCameraError(cameraResult.error || 'This live photo request has expired.');
            stopLiveCamera(false);
            return;
          }
          realtimeSocket.emit('live-camera:ready', { token: liveCameraToken }, (readyResult: { success: boolean; error?: string }) => {
            if (!readyResult.success) {
              setClientCameraError(readyResult.error || 'Could not start the secure camera connection.');
              stopLiveCamera();
            }
          });
        });
      });
    } catch (error) {
      clientCameraStreamRef.current?.getTracks().forEach(track => track.stop());
      clientCameraStreamRef.current = null;
      if (clientCameraVideoRef.current) clientCameraVideoRef.current.srcObject = null;
      setIsClientCameraOn(false);
      setClientCameraError(error instanceof Error
        ? `Camera access was not granted: ${error.message}`
        : 'Camera access was not granted. Allow camera access and try again.');
    }
  };

  const captureAndSubmitLivePhoto = async () => {
    const video = clientCameraVideoRef.current;
    if (!liveCameraToken || !video || !isClientPreviewReady || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setClientCameraError('Please wait until your camera preview is ready before capturing.');
      return;
    }
    if (isClientBlinkActive && !clientBlinkVerified) {
      setClientCameraError('Liveness check pending — aankhen blink karein, phir photo capture karein.');
      return;
    }
    setIsSubmittingLiveCam(true);
    setClientCameraError('');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const res = await fetchWithRetry('/api/live-camera/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: liveCameraToken,
          photoBase64: canvas.toDataURL('image/jpeg', 0.88)
        })
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not submit the live photo.');
      setLiveCamSuccess(true);
      stopLiveCamera(false);
      if (soundAlertEnabled) playChime();
    } catch (error) {
      setClientCameraError(error instanceof Error ? error.message : 'Could not submit the live photo.');
    } finally {
      setIsSubmittingLiveCam(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn("Fullscreen unavailable:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // --- CLIENT AUTH STATE ---
  const [, setIsClientLoggedIn] = useState(() => readStoredSession()?.role === 'client');
  const [clientName, setClientName] = useState(() => {
    try {
      return localStorage.getItem('client_name') || '';
    } catch {
      return '';
    }
  });
  const [clientPhone, setClientPhone] = useState(() => {
    try {
      return localStorage.getItem('client_phone') || '';
    } catch {
      return '';
    }
  });
  const [clientEmail, setClientEmail] = useState(() => {
    try {
      return localStorage.getItem('client_email') || '';
    } catch {
      return '';
    }
  });
  const [clientOtpSent, setClientOtpSent] = useState(false);
  const [clientMobileOtpCode, setClientMobileOtpCode] = useState('');
  const [clientOtpDeliveryMessage, setClientOtpDeliveryMessage] = useState('');
  const [clientAuthError, setClientAuthError] = useState('');
  const [isClientAuthBusy, setIsClientAuthBusy] = useState(false);
  const clientOtpAutoVerifyRef = useRef(false);
  const clientVerifyLockRef = useRef(false);
  const vleVerifyLockRef = useRef(false);
  const vleRegisterVerifyLockRef = useRef(false);
  const fillerVerifyLockRef = useRef(false);
  // Tracks the last OTP that was auto-submitted, so a failed attempt does not
  // re-submit the same code in a loop.
  const clientAutoSubmittedCodeRef = useRef('');
  const vleAutoSubmittedCodeRef = useRef('');
  const vleRegAutoSubmittedCodeRef = useRef('');
  const fillerAutoSubmittedCodeRef = useRef('');
  const [clientState, setClientState] = useState(() => {
    try {
      return localStorage.getItem('client_state') || '';
    } catch {
      return '';
    }
  });
  const [clientDistrictFilter, setClientDistrictFilter] = useState('');
  const [clientCityFilter, setClientCityFilter] = useState('');
  const [clientOrderSuccessMsg, setClientOrderSuccessMsg] = useState('');
  const [clientPortalTab, setClientPortalTab] = useState<'home' | 'notifications' | 'services' | 'orders' | 'custom_form' | 'form_filling' | 'jan_seva_docs'>('home');
  const clientPortalTopRef = useRef<HTMLElement | null>(null);

  // Each portal section is a dedicated page: whenever the citizen opens or
  // leaves a section, start from the top instead of leaving them mid-scroll.
  useEffect(() => {
    if (step !== 'client_portal' || activeRole !== 'client') return;
    const timer = setTimeout(() => {
      clientPortalTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => clearTimeout(timer);
  }, [clientPortalTab, step, activeRole]);
  const [soundAlertEnabled] = useState(true);
  const [quickReplyText, setQuickReplyText] = useState<{ [orderId: string]: string }>({});
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilterValue>('all');

  // Drag and Drop files/photos in chat state & handlers
  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);
  // Whole-workspace drag state so a file can be dropped anywhere.
  const [isDraggingOverWorkspace, setIsDraggingOverWorkspace] = useState(false);
  const [isDraggingOverProof, setIsDraggingOverProof] = useState(false);
  // Chat photo picked (drag on desktop / long-press on mobile) to become proof.
  const [draggedChatImageUrl, setDraggedChatImageUrl] = useState<string | null>(null);
  const [pendingProofChatImage, setPendingProofChatImage] = useState<string | null>(null);
  // Visible loading states for manual refresh, chat send, and file/proof uploads.
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  // Action-level loading states (Priority 2 buttons).
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [isApprovingProof, setIsApprovingProof] = useState(false);
  const [isDispatchingCredentials, setIsDispatchingCredentials] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [directApplyVleId, setDirectApplyVleId] = useState<string | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [quickReplySendingId, setQuickReplySendingId] = useState<string | null>(null);
  const [quickQuestionSendingText, setQuickQuestionSendingText] = useState<string | null>(null);
  const [attachmentActionKey, setAttachmentActionKey] = useState<string | null>(null);
  const [isSendingVoiceNote, setIsSendingVoiceNote] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const proofLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Turn dropped/picked files into staged chat attachments.
  const attachFilesToChat = (files: File[]) => {
    if (!files.length) return;
    const formatted = files.map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return {
        name: file.name,
        type: (ext === 'pdf' ? 'pdf' : ext === 'png' ? 'png' : 'jpg') as 'pdf' | 'jpg' | 'png',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        file
      };
    });
    setStagedFiles(prev => [...prev, ...formatted]);
    if (soundAlertEnabled) playChime();
    setWorkspaceStatusMsg({ text: `📁 ${files.length} file(s) attached via drag & drop! Click send to upload.`, type: 'success' });
  };

  const handleChatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverChat(true);
  };
  const handleChatDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverChat(false);
  };
  const handleChatDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverChat(false);
    setIsDraggingOverWorkspace(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      attachFilesToChat(Array.from(e.dataTransfer.files));
    }
  };

  // Submit a base64 image as the order's photo proof (existing endpoint).
  const submitPhotoProof = async (photoUrl: string) => {
    if (!activeWorkspaceOrder || isUploadingProof) return;
    setIsUploadingProof(true);
    try {
      setWorkspaceStatusMsg({ text: '📸 Setting photo proof…', type: 'info' });
      const res = await fetch(`/api/orders/${activeWorkspaceOrder.id}/upload-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        setActiveWorkspaceOrder(data.order);
        fetchAllData();
        setWorkspaceStatusMsg({ text: '📸 Photo proof upload ho gaya — citizen inspection ke liye ready hai.', type: 'success' });
        if (soundAlertEnabled) playChime();
      } else {
        setWorkspaceStatusMsg({ text: data.error || 'Failed to upload photo proof', type: 'error' });
      }
    } catch (err) {
      console.warn('Error uploading proof:', err);
      setWorkspaceStatusMsg({ text: 'Network error uploading photo proof', type: 'error' });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const uploadPhotoProofFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setWorkspaceStatusMsg({ text: 'Photo proof ke liye sirf JPG/PNG/WebP image drop karein.', type: 'error' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setWorkspaceStatusMsg({ text: 'Photo 8 MB se chhoti honi chahiye.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { void submitPhotoProof(reader.result as string); };
    reader.readAsDataURL(file);
  };

  // Use an image that already exists in chat as the photo proof.
  const setProofFromChatImage = async (url: string) => {
    try {
      setWorkspaceStatusMsg({ text: '📸 Chat photo ko proof bana rahe hain…', type: 'info' });
      const res = await fetch(url);
      if (!res.ok) throw new Error('This photo is no longer available.');
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Only images can be set as photo proof.');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      await submitPhotoProof(dataUrl);
    } catch (err) {
      setWorkspaceStatusMsg({
        text: err instanceof Error ? err.message : 'Chat photo could not be set as proof.',
        type: 'error'
      });
    }
  };

  // --- Workspace-wide drag & drop ---
  const handleWorkspaceDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverWorkspace(true);
  };
  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverWorkspace(true);
  };
  const handleWorkspaceDragLeave = (e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    const rect = e.currentTarget.getBoundingClientRect();
    const outside =
      e.clientX <= rect.left || e.clientX >= rect.right ||
      e.clientY <= rect.top || e.clientY >= rect.bottom;
    if (outside || (next && !e.currentTarget.contains(next))) {
      setIsDraggingOverWorkspace(false);
      setIsDraggingOverProof(false);
    }
  };
  const handleWorkspaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverWorkspace(false);
    setIsDraggingOverProof(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      attachFilesToChat(Array.from(e.dataTransfer.files));
    }
  };

  // --- Photo Proof card drop zone ---
  const handleProofDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverProof(true);
    setIsDraggingOverWorkspace(true);
  };
  const handleProofDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget as Node | null;
    const rect = e.currentTarget.getBoundingClientRect();
    const outside =
      e.clientX <= rect.left || e.clientX >= rect.right ||
      e.clientY <= rect.top || e.clientY >= rect.bottom;
    if (outside || (next && !e.currentTarget.contains(next))) {
      setIsDraggingOverProof(false);
      if (outside) setIsDraggingOverWorkspace(false);
    }
  };
  const handleProofDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverProof(false);
    setIsDraggingOverWorkspace(false);

    // Ignore extra drops while a proof upload is already in progress.
    if (isUploadingProof) return;

    // In-app drag: a chat image dropped straight onto the proof card.
    const fromChat = e.dataTransfer.getData('application/x-digiseva-proof') || draggedChatImageUrl;
    if (fromChat) {
      if (activeRole === 'client') {
        setWorkspaceStatusMsg({ text: 'Photo proof sirf operator set kar sakta hai.', type: 'error' });
      } else {
        void setProofFromChatImage(fromChat);
      }
      setDraggedChatImageUrl(null);
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (activeRole === 'client') {
        setWorkspaceStatusMsg({ text: 'Photo proof sirf operator set kar sakta hai.', type: 'error' });
      } else {
        uploadPhotoProofFile(file);
      }
    }
  };

  // Touch-friendly fallback for in-app drag: long-press a chat image, then tap
  // the Photo Proof badge to use it as proof.
  const startChatImageLongPress = (url: string) => {
    if (activeRole === 'client') return;
    if (proofLongPressTimerRef.current) clearTimeout(proofLongPressTimerRef.current);
    proofLongPressTimerRef.current = setTimeout(() => {
      setPendingProofChatImage(url);
      setWorkspaceStatusMsg({
        text: '📸 Photo selected — ab upar "Photo Proof" badge tap karein. Wo proof ban jayegi.',
        type: 'info'
      });
      if (soundAlertEnabled) playChime();
    }, 500);
  };
  const cancelChatImageLongPress = () => {
    if (proofLongPressTimerRef.current) {
      clearTimeout(proofLongPressTimerRef.current);
      proofLongPressTimerRef.current = null;
    }
  };

  // Badge tap: if a chat photo is waiting, use it as proof; otherwise expand
  // the matching card (only one card open at a time).
  const handleMobileWorkspaceBadgeClick = (key: 'proof' | 'payments' | 'pdf' | 'whatsapp') => {
    if (key === 'proof' && pendingProofChatImage) {
      setMobileWorkspacePanel('proof');
      setIsWorkspaceHeaderHidden(false);
      void setProofFromChatImage(pendingProofChatImage);
      setPendingProofChatImage(null);
      return;
    }
    setMobileWorkspacePanel(prev => prev === key ? 'none' : key);
  };

  // 🎙️ Voice Message Recording State — click = start, click = stop & send
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceRecordSeconds, setVoiceRecordSeconds] = useState(0);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceStartAtRef = useRef(0);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupVoiceRecording = () => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    voiceStreamRef.current?.getTracks().forEach(track => track.stop());
    voiceStreamRef.current = null;
    voiceRecorderRef.current = null;
    setIsVoiceRecording(false);
    setVoiceRecordSeconds(0);
  };

  const pickRecorderMimeType = (): string | undefined => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    return candidates.find(type => MediaRecorder.isTypeSupported(type));
  };

  const formatDurationLabel = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleToggleVoiceRecording = async () => {
    // Doosra click = recording band aur seedha send.
    if (voiceRecorderRef.current && voiceRecorderRef.current.state !== 'inactive') {
      voiceRecorderRef.current.stop();
      return;
    }
    if (isVoiceRecording) return;
    if (!activeWorkspaceOrder) {
      alert(t('Please select an active order first to send a voice note.', 'कृपया पहले कोई सक्रिय ऑर्डर चुनें जिसमें वॉइस मैसेज भेजना है।'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const durationSec = Math.max(1, Math.round((Date.now() - voiceStartAtRef.current) / 1000));
        cleanupVoiceRecording();
        if (soundAlertEnabled) playChime();

        // Sahi container ka label — Safari (audio/mp4) aur Chrome (audio/webm) dono sahi bajenge.
        const blobMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: blobMimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;

          const actualSender = activeRole === 'client' ? 'client' : 'operator';
          const actualSenderName = activeRole === 'client'
            ? (clientName || 'Citizen')
            : (activeRole === 'form_filler' ? (fillerName || 'Form Filler') : (vleName || 'Jan Seva Operator'));

          setIsSendingVoiceNote(true);
          try {
            const data = await sendRealtimeMessage(activeWorkspaceOrder.id, {
              sender: actualSender,
              senderName: actualSenderName,
              text: '🎙️ Voice Note (Audio Message)',
              isVoiceNote: true,
              audioDataUrl: base64Audio,
              audioDuration: formatDurationLabel(durationSec)
            });
            setActiveWorkspaceOrder(data.order);
          } catch (err) {
            console.warn('Failed to send voice note:', err);
            setWorkspaceStatusMsg({ text: err instanceof Error ? err.message : 'The voice message could not be sent.', type: 'error' });
          } finally {
            setIsSendingVoiceNote(false);
          }
        };
      };

      voiceStreamRef.current = stream;
      voiceRecorderRef.current = mediaRecorder;
      voiceStartAtRef.current = Date.now();
      mediaRecorder.start();
      setIsVoiceRecording(true);
      setVoiceRecordSeconds(0);
      if (soundAlertEnabled) playChime();
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordSeconds(Math.max(0, Math.floor((Date.now() - voiceStartAtRef.current) / 1000)));
      }, 500);
    } catch (err) {
      console.warn('MediaRecorder permission or support error:', err);
      cleanupVoiceRecording();
      alert('Microphone access denied or not supported. Please allow microphone permissions.');
    }
  };

  // Option 3: Online Form Filling (NEET, JEE, Sarkari Exam, College Admission)
  const [examFormTitle, setExamFormTitle] = useState('');
  const [examFormDesc, setExamFormDesc] = useState('');
  const [examFormCategory, setExamFormCategory] = useState('');
  const [examFormRoll, setExamFormRoll] = useState('');
  const [examApplicantName, setExamApplicantName] = useState('');
  const [examApplicantPhone, setExamApplicantPhone] = useState('');
  const [examApplicantEmail, setExamApplicantEmail] = useState('');
  // Reservation category (Gen/OBC/SC/ST/EWS/Female/PwD) — decides the govt fee
  // and is shared with the operator so they know which category to file.
  const [examApplicantCategory, setExamApplicantCategory] = useState<GovtFeeCategoryKey>(() => {
    try {
      const saved = String(localStorage.getItem('client_category') || '').trim().toLowerCase();
      return (GOVT_FEE_CATEGORIES.some(item => item.key === saved) ? saved : 'general') as GovtFeeCategoryKey;
    } catch {
      return 'general';
    }
  });
  // Shared confirm popup used before any citizen request is dispatched.
  const [categoryConfirm, setCategoryConfirm] = useState<CategoryConfirmConfig | null>(null);
  const [categoryConfirmValue, setCategoryConfirmValue] = useState<GovtFeeCategoryKey>('general');
  const [isCategoryConfirmBusy, setIsCategoryConfirmBusy] = useState(false);
  const categoryConfirmHandlerRef = useRef<((category: GovtFeeCategoryKey, govtFee: number) => Promise<void> | void) | null>(null);

  // Option 4: Jan Seva Kendra Documents (PAN Card, Certificates, CSC Govt Docs)
  const [selectedJanSevaDoc, setSelectedJanSevaDoc] = useState('');
  const [janSevaDocDetails, setJanSevaDocDetails] = useState('');
  const [janSevaDocApplicantName, setJanSevaDocApplicantName] = useState('');
  const [isSubmittingJanSevaDoc, setIsSubmittingJanSevaDoc] = useState(false);
  const [janSevaDocAadhaar, setJanSevaDocAadhaar] = useState('');
  const [janSevaDocEmail, setJanSevaDocEmail] = useState('');
  const [janSevaDocUrgent, setJanSevaDocUrgent] = useState(false);

  // --- JAN SEVA KENDRA (VLE) AUTH & OPERATOR STATE ---
  const [isVleLoggedIn, setIsVleLoggedIn] = useState(() => readStoredSession()?.role === 'vle');
  const [vleName, setVleName] = useState(() => {
    try {
      return localStorage.getItem('vle_operator_name') || '';
    } catch {
      return '';
    }
  });
  const [vleCenterName, setVleCenterName] = useState(() => {
    try {
      return localStorage.getItem('vle_center_name') || '';
    } catch {
      return '';
    }
  });
  const [vleId, setVleId] = useState(() => {
    try {
      return localStorage.getItem('vle_csc_id') || '';
    } catch {
      return '';
    }
  });
  const [vleState, setVleState] = useState(() => {
    try {
      return localStorage.getItem('vle_state') || '';
    } catch {
      return '';
    }
  });
  const [vleDistrict, setVleDistrict] = useState(() => readStoredDistrict('vle_district', 'vle_state'));
  const [vleCity, setVleCity] = useState(() => {
    try {
      return localStorage.getItem('vle_city') || '';
    } catch {
      return '';
    }
  });
  const [vlePhone, setVlePhone] = useState(() => {
    try {
      return localStorage.getItem('vle_phone') || '';
    } catch {
      return '';
    }
  });
  const [vleEmail, setVleEmail] = useState(() => {
    try {
      return localStorage.getItem('vle_email') || '';
    } catch {
      return '';
    }
  });
  const [vleOtpSent, setVleOtpSent] = useState(false);
  const [vleMobileOtpCode, setVleMobileOtpCode] = useState('');
  const [vleRegistrationOtpCode, setVleRegistrationOtpCode] = useState('');
  const [vleOtpDeliveryMessage, setVleOtpDeliveryMessage] = useState('');
  const [vleAuthError, setVleAuthError] = useState('');
  const [isVleAuthBusy, setIsVleAuthBusy] = useState(false);
  const [verifyingGovt, setVerifyingGovt] = useState(false);
  const vleOtpAutoVerifyRef = useRef(false);
  const vleRegOtpAutoVerifyRef = useRef(false);

  // --- FORM FILLER AUTH & STATE ---
  const [isFormFillerLoggedIn, setIsFormFillerLoggedIn] = useState(() => readStoredSession()?.role === 'form_filler');
  const [isFillerRegistering, setIsFillerRegistering] = useState(false);
  const [fillerName, setFillerName] = useState(() => {
    try {
      return localStorage.getItem('filler_operator_name') || '';
    } catch {
      return '';
    }
  });
  const [fillerState, setFillerState] = useState(() => {
    try {
      return localStorage.getItem('filler_state') || '';
    } catch {
      return '';
    }
  });
  const [fillerDistrict, setFillerDistrict] = useState(() => readStoredDistrict('filler_district', 'filler_state'));
  const [fillerCity, setFillerCity] = useState(() => {
    try {
      return localStorage.getItem('filler_city') || '';
    } catch {
      return '';
    }
  });
  const [fillerPhone, setFillerPhone] = useState(() => {
    try {
      return localStorage.getItem('filler_phone') || '';
    } catch {
      return '';
    }
  });
  const [fillerEmail, setFillerEmail] = useState(() => {
    try {
      return localStorage.getItem('filler_email') || '';
    } catch {
      return '';
    }
  });
  const [fillerPhotoUrl, setFillerPhotoUrl] = useState(() => {
    try {
      return localStorage.getItem('filler_photo_url') || '';
    } catch {
      return '';
    }
  });

  const [fillerOtpSent, setFillerOtpSent] = useState(false);
  const [fillerMobileOtpCode, setFillerMobileOtpCode] = useState('');
  const [fillerOtpDeliveryMessage, setFillerOtpDeliveryMessage] = useState('');
  const [fillerAuthError, setFillerAuthError] = useState('');
  const [fillerAuthNotice, setFillerAuthNotice] = useState('');
  const [isFillerAuthBusy, setIsFillerAuthBusy] = useState(false);
  const [fillerOrders, setFillerOrders] = useState<any[]>([]);
  const [fillerNotificationMsg, setFillerNotificationMsg] = useState('');

  // Auto-submit the OTP once the 4th digit is typed. This runs AFTER React has
  // committed the new value, unlike the old requestSubmit() inside onChange
  // which submitted a stale 3-digit state and silently did nothing.
  useEffect(() => {
    if (!clientOtpSent || clientMobileOtpCode.length !== 4) return;
    if (isClientAuthBusy || clientVerifyLockRef.current) return;
    if (clientAutoSubmittedCodeRef.current === clientMobileOtpCode) return;
    clientAutoSubmittedCodeRef.current = clientMobileOtpCode;
    (document.getElementById('client-otp-verify-form') as HTMLFormElement | null)?.requestSubmit();
  }, [clientMobileOtpCode, clientOtpSent, isClientAuthBusy]);

  useEffect(() => {
    if (!vleOtpSent || vleMobileOtpCode.length !== 4) return;
    if (isVleAuthBusy || vleVerifyLockRef.current) return;
    if (vleAutoSubmittedCodeRef.current === vleMobileOtpCode) return;
    vleAutoSubmittedCodeRef.current = vleMobileOtpCode;
    (document.getElementById('vle-otp-verify-form') as HTMLFormElement | null)?.requestSubmit();
  }, [vleMobileOtpCode, vleOtpSent, isVleAuthBusy]);

  useEffect(() => {
    if (!vleOtpSent || vleRegistrationOtpCode.length !== 4) return;
    if (verifyingGovt || vleRegisterVerifyLockRef.current) return;
    if (vleRegAutoSubmittedCodeRef.current === vleRegistrationOtpCode) return;
    vleRegAutoSubmittedCodeRef.current = vleRegistrationOtpCode;
    (document.getElementById('vle-register-otp-verify-form') as HTMLFormElement | null)?.requestSubmit();
  }, [vleRegistrationOtpCode, vleOtpSent, verifyingGovt]);

  useEffect(() => {
    if (!fillerOtpSent || fillerMobileOtpCode.length !== 4) return;
    if (isFillerAuthBusy || fillerVerifyLockRef.current) return;
    if (fillerAutoSubmittedCodeRef.current === fillerMobileOtpCode) return;
    fillerAutoSubmittedCodeRef.current = fillerMobileOtpCode;
    (document.getElementById('filler-otp-verify-form') as HTMLFormElement | null)?.requestSubmit();
  }, [fillerMobileOtpCode, fillerOtpSent, isFillerAuthBusy]);

  // Restore the saved profile details for a returning (auto-logged-in) user so
  // the dashboard has the right name, phone, district etc. on first paint.
  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    if (session.role === 'client') {
      if (session.name) setClientName(session.name);
      if (session.phone) setClientPhone(session.phone);
      if (session.email) setClientEmail(session.email);
      if (session.state) setClientState(session.state);
      if (session.district && !sameAsStateValue(session.district, session.state)) setClientDistrictFilter(session.district);
      if (session.city && !sameAsStateValue(session.city, session.state)) setClientCityFilter(session.city);
      if (session.name) setExamApplicantName(session.name);
      if (session.phone) setExamApplicantPhone(session.phone);
      if (session.email) setExamApplicantEmail(session.email);
      if (session.name) setJanSevaDocApplicantName(session.name);
      if (session.phone) setJanSevaDocAadhaar(session.phone);
      if (session.email) setJanSevaDocEmail(session.email);
    } else if (session.role === 'vle') {
      if (session.name) setVleName(session.name);
      if (session.phone) setVlePhone(session.phone);
      if (session.email) setVleEmail(session.email);
      if (session.state) setVleState(session.state);
      if (session.district && !sameAsStateValue(session.district, session.state)) setVleDistrict(session.district);
      if (session.city && !sameAsStateValue(session.city, session.state)) setVleCity(session.city);
      if (session.cscId) setVleId(session.cscId);
      try {
        const savedCenter = localStorage.getItem('vle_center_name') || '';
        const savedPhoto = localStorage.getItem('vle_photo_url') || '';
        if (savedCenter) setVleCenterName(savedCenter);
        if (savedPhoto.startsWith('data:image/') || /^https?:\/\//.test(savedPhoto)) setVlePhotoUrl(savedPhoto);
        const savedCity = localStorage.getItem('vle_city') || '';
        if (savedCity) setVleCity(savedCity);
      } catch {}
    } else if (session.role === 'form_filler') {
      if (session.name) setFillerName(session.name);
      if (session.phone) setFillerPhone(session.phone);
      if (session.email) setFillerEmail(session.email);
      if (session.state) setFillerState(session.state);
      if (session.district && !sameAsStateValue(session.district, session.state)) setFillerDistrict(session.district);
      if (session.city && !sameAsStateValue(session.city, session.state)) setFillerCity(session.city);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill applicant details from the logged-in account. The fields stay fully
  // editable so the user can still type a different name / email / number.
  useEffect(() => {
    if (clientName && !examApplicantName) setExamApplicantName(clientName);
    if (clientPhone && !examApplicantPhone) setExamApplicantPhone(clientPhone);
    if (clientEmail && !examApplicantEmail) setExamApplicantEmail(clientEmail);
    if (clientName && !janSevaDocApplicantName) setJanSevaDocApplicantName(clientName);
    if (clientPhone && !janSevaDocAadhaar) setJanSevaDocAadhaar(clientPhone);
    if (clientEmail && !janSevaDocEmail) setJanSevaDocEmail(clientEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, clientPhone, clientEmail]);

  // --- FORM FILLER EXPERT PUBLISHED FORMS & NEW FORM CREATION ---
  const [fillerServices, setFillerServices] = useState<any[]>([]);
  const [newFormDocName, setNewFormDocName] = useState('');
  const [newFormPrice, setNewFormPrice] = useState('');
  const [newFillerFormGovtFee, setNewFillerFormGovtFee] = useState('');
  const [newFillerFormGovtFeeByCategory, setNewFillerFormGovtFeeByCategory] = useState<GovtFeeByCategory>({});
  const [newFillerFormState, setNewFillerFormState] = useState('');
  const [newFormExpertName, setNewFormExpertName] = useState('');
  const [newFormRequirements, setNewFormRequirements] = useState('');
  const [newFormIcon, setNewFormIcon] = useState('📝');
  const [editingFillerServiceId, setEditingFillerServiceId] = useState('');
  const [formSaveSuccessMsg, setFormSaveSuccessMsg] = useState('');

  // --- VLE DIRECTORY & DYNAMIC PRICING ---
  const [registeredVles, setRegisteredVles] = useState<any[]>([]);
  const [vlePhotoUrl, setVlePhotoUrl] = useState(() => {
    try {
      const savedPhoto = localStorage.getItem('vle_photo_url') || '';
      return savedPhoto.startsWith('data:image/') ? savedPhoto : '';
    } catch {
      return '';
    }
  });
  const [customPricingList, setCustomPricingList] = useState<{ id: string; docName: string; price: string; govtFee?: string; govtFeeByCategory?: GovtFeeByCategory; cscFee?: string; feeName?: string; icon?: string; dept?: string; requirements?: string; scope?: 'district' | 'national' | 'online_form'; state?: string; operatorId?: string; operatorCscId?: string; operatorName?: string; operatorDistrict?: string; operatorCity?: string; operatorPhone?: string; serviceFee?: number }[]>(() => {
    try {
      const saved = localStorage.getItem('fillup_custom_pricing');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [newDocName, setNewDocName] = useState('');
  const [newDocGovtFee, setNewDocGovtFee] = useState('');
  const [newDocGovtFeeByCategory, setNewDocGovtFeeByCategory] = useState<GovtFeeByCategory>({});
  const [newDocCscFee, setNewDocCscFee] = useState('');
  const [newDocPrice, setNewDocPrice] = useState('');
  const [newDocRequirements, setNewDocRequirements] = useState('');
  const [newDocFeeName, setNewDocFeeName] = useState('');
  const [newDocScope, setNewDocScope] = useState<'district' | 'national' | 'online_form'>('district');
  const [newDocState, setNewDocState] = useState('');
  const [newFormScope, setNewFormScope] = useState<'district' | 'national' | 'online_form'>('online_form');
  const [newVleFormGovtFee, setNewVleFormGovtFee] = useState('');
  const [newVleFormGovtFeeByCategory, setNewVleFormGovtFeeByCategory] = useState<GovtFeeByCategory>({});
  const [newVleFormState, setNewVleFormState] = useState('');
  const [vleFormFillingList, setVleFormFillingList] = useState<{ id: string; docName: string; price: string; govtFee?: string; govtFeeByCategory?: GovtFeeByCategory; feeName?: string; expertName?: string; requirements?: string; icon?: string; scope?: 'district' | 'national' | 'online_form'; state?: string }[]>(() => {
    try {
      const saved = localStorage.getItem('fillup_vle_form_pricing');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [pricingJustUpdated, setPricingJustUpdated] = useState(false);

  // Saved pricing lists ko chhota rakhne ke liye collapse/expand state.
  // Poori list "All Saved Forms Here" tab me dikhti hai.
  const [showAllVleDocPricing, setShowAllVleDocPricing] = useState(false);
  const [showAllVleFormPricing, setShowAllVleFormPricing] = useState(false);
  const [showAllFillerForms, setShowAllFillerForms] = useState(false);

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');

  // Jan Seva Kendra Services Search & Category Filter
  const [janSevaSearchQuery, setJanSevaSearchQuery] = useState('');
  const [janSevaSelectedCategory, setJanSevaSelectedCategory] = useState<string>('all');

  // A visitor came from a public SEO page and pressed "Apply". Keep the intent
  // through the OTP login, then open the matching service form. For online
  // forms (NEET/JEE etc.) open the form-filling tab instead.
  useEffect(() => {
    if (!publicServiceIntent) return;
    try {
      sessionStorage.setItem('digiseva_pending_public_service', JSON.stringify(publicServiceIntent));
    } catch {}
    if (readStoredSession()?.role === 'client') return;
    setStep('client_login');
    try { window.history.replaceState({}, '', '/'); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingPublicService) return;
    if (activeRole !== 'client') return;
    if (pendingPublicService.scope === 'online_form') {
      setClientPortalTab('form_filling');
      setExamFormTitle(pendingPublicService.name);
    } else {
      setClientPortalTab('jan_seva_docs');
      setSelectedJanSevaDoc(pendingPublicService.name);
      setJanSevaSearchQuery(pendingPublicService.name);
    }
    setStep('client_portal');
    setPendingPublicService(null);
    try { sessionStorage.removeItem('digiseva_pending_public_service'); } catch {}
    try { window.history.replaceState({}, '', '/'); } catch {}
    setTimeout(() => {
      const target = pendingPublicService.scope === 'online_form'
        ? document.getElementById('form-filling-section')
        : document.getElementById('jan-seva-doc-form');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 700);
  }, [pendingPublicService, activeRole]);

  // --- JAN SEVA KENDRA ORDERS ---
  const [vleExclusiveOrders, setVleExclusiveOrders] = useState<any[]>([]);
  const [vleNotificationMsg, setVleNotificationMsg] = useState('');
  const [vleDashboardTab, setVleDashboardTab] = useState<'open_market' | 'active_bids_chats' | 'pricing' | 'form_pricing' | 'all_saved' | 'payments'>('open_market');
  const vleDashboardTopRef = useRef<HTMLElement | null>(null);
  const [fillerDashboardTab, setFillerDashboardTab] = useState<'services' | 'all_saved' | 'payments'>('services');
  const fillerDashboardTopRef = useRef<HTMLElement | null>(null);

  // Operator and Form Filler dashboards are section pages as well: every tab
  // change starts from the top instead of leaving the user mid-scroll.
  useEffect(() => {
    if (step !== 'vle_home' && step !== 'form_filler_app') return;
    const timer = setTimeout(() => {
      vleDashboardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      fillerDashboardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => clearTimeout(timer);
  }, [vleDashboardTab, fillerDashboardTab, step]);

  // --- LIVE TRANSPARENCY & TRUST STATS DASHBOARD STATE ---
  const [platformStats, setPlatformStats] = useState({
    activeUsers: 0,
    activeVles: 0,
    activeOperators: 0,
    totalTrustedFormsFilled: 0,
    successRate: '—',
    avgProcessingTime: '—',
    satisfactionRate: '—'
  });
  const [, setRecentDeliveries] = useState<any[]>([]);
  // 0 is a valid stat value, so we must never show "0" before the first
  // successful dashboard response. Skeleton first, then "—" if the backend
  // stays unreachable (e.g. Render free-tier cold start).
  const [platformStatsState, setPlatformStatsState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlatformStatsState(prev => (prev === 'loading' ? 'unavailable' : prev));
    }, 20000);
    return () => clearTimeout(timer);
  }, []);

  // --- INTERACTIVE ORDER WORKSPACE STATE ---
  const [activeWorkspaceOrder, setActiveWorkspaceOrder] = useState<any | null>(null);
  const activeWorkspaceOrderRef = useRef<any | null>(null);
  activeWorkspaceOrderRef.current = activeWorkspaceOrder;
  const activeRoleRef = useRef(activeRole);
  activeRoleRef.current = activeRole;
  const clientPhoneRef = useRef(clientPhone);
  clientPhoneRef.current = clientPhone;
  const vleDistrictRef = useRef(vleDistrict);
  vleDistrictRef.current = vleDistrict;
  const vleIdRef = useRef(vleId);
  vleIdRef.current = vleId;
  const fillerDistrictRef = useRef(fillerDistrict);
  fillerDistrictRef.current = fillerDistrict;
  const [chatInputText, setChatInputText] = useState('');
  const chatLogEndRef = useRef<HTMLDivElement | null>(null);
  const [feeGovtInput, setFeeGovtInput] = useState('');
  const [feeServiceInput, setFeeServiceInput] = useState('');
  const [isSavingOrderFees, setIsSavingOrderFees] = useState(false);
  const [isApprovingOrderFees, setIsApprovingOrderFees] = useState(false);
  const [feeModalMsg, setFeeModalMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const feeDraftTouchedRef = useRef(false);
  const feeAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feeSaveInFlightRef = useRef(false);

  // Keep the live chat pinned to the newest message so incoming replies are always visible.
  useEffect(() => {
    chatLogEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeWorkspaceOrder?.id, activeWorkspaceOrder?.chatMessages?.length]);
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [activeCallOrderId, setActiveCallOrderId] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [callPeerLabel, setCallPeerLabel] = useState('');
  const [zoomProofPhoto, setZoomProofPhoto] = useState<string | null>(null);
  const [, setCopiedAppNo] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [editAppNo, setEditAppNo] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [workspaceStatusMsg, setWorkspaceStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [vleBidStatusMsg, setVleBidStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saveToast, setSaveToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaveToast = (text = '✅ Saved successfully!', type: 'success' | 'error' = 'success') => {
    setSaveToast({ text, type });
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = setTimeout(() => setSaveToast(null), 3000);
  };

  useEffect(() => () => {
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
  }, []);

  useEffect(() => {
    try {
      const pendingToast = sessionStorage.getItem('digiseva_pending_save_toast');
      if (pendingToast) {
        sessionStorage.removeItem('digiseva_pending_save_toast');
        showSaveToast(pendingToast);
      }
      const pendingClientNotice = sessionStorage.getItem('digiseva_pending_client_notice');
      if (pendingClientNotice) {
        sessionStorage.removeItem('digiseva_pending_client_notice');
        setClientOrderSuccessMsg(pendingClientNotice);
        setOrderStatusFilter('all');
        setClientPortalTab('orders');
        setTimeout(() => {
          document.getElementById('client-portal-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 900);
      }
    } catch {}
  }, []);

  // QR Code Payment Generator State in Workspace Panel
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [govtUpiInput, setGovtUpiInput] = useState('');
  const [govtFeeInput, setGovtFeeInput] = useState('');
  const [govtQrImageInput, setGovtQrImageInput] = useState('');
  const [isSavingGovtDetails, setIsSavingGovtDetails] = useState(false);
  const [isUploadingFinalPdf, setIsUploadingFinalPdf] = useState(false);
  const [copiedUpiId, setCopiedUpiId] = useState('');
  const [paymentIntentRefreshKey, setPaymentIntentRefreshKey] = useState(0);
  type SplitStatus = 'pending' | 'confirmed';
  interface PaymentSplit { status: SplitStatus; utr?: string; confirmedBy?: string; confirmedAt?: string; clientConfirmed?: boolean; clientConfirmedAt?: string; clientUtr?: string; }
  interface PaymentSplits { govt: PaymentSplit; admin: PaymentSplit; operator: PaymentSplit; }
  interface PaymentQr { role: 'admin' | 'operator' | 'government'; label: string; payeeName: string; upiId: string; amount: string; upiUri: string; qrImage?: string; upiCooling?: boolean; upiActiveAt?: string; status?: SplitStatus; confirmedBy?: string; confirmedAt?: string; utr?: string; clientConfirmed?: boolean; clientConfirmedAt?: string; clientUtr?: string; }
  interface FeeBreakdown { govtFee: number; serviceFee: number; adminCommission: number; adminCommissionPercent: number; operatorShare: number; operatorSharePercent: number; total: number; }
  interface WorkspacePaymentIntent { amount: string; breakdown?: FeeBreakdown; qrs?: PaymentQr[]; splits?: PaymentSplits; isPaymentDoneInApp?: boolean; governmentQrUri?: string; adminUpiConfigured?: boolean; governmentUpiRequired?: boolean; operatorUpiCooling?: boolean; operatorUpiActiveAt?: string; }
  const [workspacePaymentIntent, setWorkspacePaymentIntent] = useState<WorkspacePaymentIntent | null>(null);
  const [paymentIntentError, setPaymentIntentError] = useState('');
  const [qrZoomImage, setQrZoomImage] = useState('');

  // Chat is sent over the live socket when possible, but the REST endpoint is
  // the source of truth. This keeps messaging working when the socket is still
  // waking up (Render cold start), disconnected, or the room join failed.
  const sendMessageOverRest = async (orderId: string, payload: Record<string, unknown>) => {
    const res = await fetchWithRetry(`/api/orders/${encodeURIComponent(orderId)}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await parseJsonResponse(res).catch(() => ({} as any));
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'The message could not be sent. Please try again.');
    }
    return data;
  };

  const sendRealtimeMessage = (orderId: string, payload: Record<string, unknown>) =>
    new Promise<any>((resolve, reject) => {
      const fallbackToRest = async (socketError?: unknown) => {
        if (socketError) console.warn('Live chat socket unavailable, using REST fallback:', socketError);
        try {
          resolve(await sendMessageOverRest(orderId, payload));
        } catch (err) {
          reject(err);
        }
      };

      if (!realtimeSocket.connected) {
        // Try to recover the socket for future messages, but don't block this
        // send on it — the REST call below delivers the message right away.
        realtimeSocket.connect();
        void fallbackToRest();
        return;
      }

      let settled = false;
      realtimeSocket.timeout(10000).emit(
        'order:send-message',
        { ...payload, orderId },
        (error: Error | null, result: any) => {
          if (settled) return;
          settled = true;
          if (error) {
            void fallbackToRest(error);
          } else if (!result?.success) {
            // Socket room join can fail even on a healthy connection (for
            // example an operator session that just refreshed). REST checks
            // the account/order access itself, so use it as the safety net.
            void fallbackToRest(result?.error);
          } else {
            resolve(result);
          }
        }
      );
    });

  // ================= ☎️ In-App WebRTC Audio Call (no phone numbers shown) =================
  // Sab call logic refs par chalta hai taaki purane socket-effect closures stale na ho.
  const callOrderRef = useRef<string | null>(null);
  const callStartingRef = useRef(false);
  const callRoleRef = useRef<'caller' | 'callee' | null>(null);
  const callPcRef = useRef<RTCPeerConnection | null>(null);
  const callLocalStreamRef = useRef<MediaStream | null>(null);
  const callTargetSocketIdRef = useRef<string | null>(null);
  const callPendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callAudioRef = useRef<HTMLAudioElement | null>(null);
  const callRingtoneCtxRef = useRef<AudioContext | null>(null);
  const callRingtoneTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callVibrateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIncomingOrderRef = useRef<any | null>(null);
  const ordersLookupRef = useRef<any[]>([]);

  const stopCallRingtone = () => {
    if (callRingtoneTimerRef.current) {
      clearInterval(callRingtoneTimerRef.current);
      callRingtoneTimerRef.current = null;
    }
    if (callVibrateTimerRef.current) {
      clearInterval(callVibrateTimerRef.current);
      callVibrateTimerRef.current = null;
    }
    try { navigator.vibrate?.(0); } catch {}
    if (callRingtoneCtxRef.current) {
      try { void callRingtoneCtxRef.current.close(); } catch {}
      callRingtoneCtxRef.current = null;
    }
  };

  const startCallRingtone = (vibrate = false) => {
    stopCallRingtone();
    if (vibrate) {
      try {
        navigator.vibrate?.([500, 250, 500, 250, 500]);
        callVibrateTimerRef.current = setInterval(() => {
          try { navigator.vibrate?.([500, 250, 500, 250, 500]); } catch {}
        }, 2200);
      } catch {}
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx: AudioContext = new AudioCtx();
      // Mobile browsers may start the context suspended until a gesture. A
      // ringtone coming from a socket has no gesture, so resume explicitly and
      // rely on the visible overlay + vibration as the fallback.
      try { void ctx.resume(); } catch {}
      callRingtoneCtxRef.current = ctx;
      const beep = () => {
        if (!callRingtoneCtxRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      };
      beep();
      callRingtoneTimerRef.current = setInterval(beep, 1800);
    } catch {}
  };

  const teardownCallMedia = () => {
    stopCallRingtone();
    try { callPcRef.current?.close(); } catch {}
    callPcRef.current = null;
    callLocalStreamRef.current?.getTracks().forEach(track => track.stop());
    callLocalStreamRef.current = null;
    if (callAudioRef.current) callAudioRef.current.srcObject = null;
    callTargetSocketIdRef.current = null;
    callPendingIceRef.current = [];
  };

  const resetCall = () => {
    callOrderRef.current = null;
    callRoleRef.current = null;
    callIncomingOrderRef.current = null;
    teardownCallMedia();
    setIsCallMuted(false);
    setCallPeerLabel('');
    setActiveCallOrderId(null);
    setCallingState('idle');
    setCallDuration(0);
  };

  const createCallPeer = (orderId: string, initiator: boolean) => {
    try { callPcRef.current?.close(); } catch {}
    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
    callPcRef.current = peer;
    callPendingIceRef.current = [];
    callLocalStreamRef.current?.getTracks().forEach(track => peer.addTrack(track, callLocalStreamRef.current!));
    peer.onicecandidate = event => {
      if (event.candidate) {
        realtimeSocket.emit('call:signal', { orderId, candidate: event.candidate.toJSON() });
      }
    };
    peer.ontrack = event => {
      if (callAudioRef.current) {
        callAudioRef.current.srcObject = event.streams[0];
        void callAudioRef.current.play().catch(() => {});
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected' || peer.connectionState === 'closed') {
        if (callOrderRef.current) endVoiceCall();
      }
    };
    if (initiator) {
      void (async () => {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          realtimeSocket.emit('call:signal', { orderId, description: peer.localDescription?.toJSON() });
        } catch (err) {
          console.warn('Call offer failed:', err);
        }
      })();
    }
    return peer;
  };

  const handleCallSignal = async (signal: {
    orderId: string;
    fromSocketId: string;
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  }) => {
    if (callOrderRef.current !== signal.orderId) return;
    try {
      let peer = callPcRef.current;
      if (!peer && callLocalStreamRef.current) {
        peer = createCallPeer(signal.orderId, false);
      }
      if (!peer) return;
      callTargetSocketIdRef.current = signal.fromSocketId;
      if (signal.description) {
        await peer.setRemoteDescription(signal.description);
        for (const candidate of callPendingIceRef.current) {
          try { await peer.addIceCandidate(candidate); } catch {}
        }
        callPendingIceRef.current = [];
        if (signal.description.type === 'offer') {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          realtimeSocket.emit('call:signal', { orderId: signal.orderId, description: peer.localDescription?.toJSON() });
        }
      } else if (signal.candidate) {
        if (peer.remoteDescription) {
          try { await peer.addIceCandidate(signal.candidate); } catch {}
        } else {
          callPendingIceRef.current.push(signal.candidate);
        }
      }
    } catch (err) {
      console.warn('Call signal handling failed:', err);
    }
  };

  // ================= ☎️ CALL CONNECTION RECOVERY =================
  // Render free instances sleep and the socket can be reconnecting when the
  // user taps "call". Instead of failing instantly with "Live connection
  // offline", wait for the socket to come back, then make sure we are inside
  // the order room before inviting the other side.
  const waitForRealtimeConnection = (timeoutMs = 15000): Promise<boolean> =>
    new Promise(resolve => {
      if (realtimeSocket.connected) {
        resolve(true);
        return;
      }
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const finish = (connected: boolean) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        realtimeSocket.off('connect', onConnect);
        realtimeSocket.off('connect_error', onConnectError);
        resolve(connected);
      };
      const onConnect = () => finish(true);
      const onConnectError = () => { /* keep waiting until timeout / reconnect */ };
      realtimeSocket.on('connect', onConnect);
      realtimeSocket.on('connect_error', onConnectError);
      timer = setTimeout(() => finish(false), timeoutMs);
      try {
        realtimeSocket.connect();
      } catch {
        finish(false);
      }
    });

  const joinCallOrderRoom = (orderId: string): Promise<{ success: boolean; error?: string }> =>
    new Promise(resolve => {
      const role = activeRoleRef.current === 'client' ? 'client' : 'operator';
      const phone = role === 'client' ? clientPhoneRef.current : '';
      const token = readStoredSession()?.token;
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ success: false, error: 'Order room join timeout.' });
      }, 12000);
      realtimeSocket.emit(
        'order:join',
        { orderId, role, phone, token },
        (result: { success?: boolean; error?: string }) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ success: Boolean(result?.success), error: result?.error });
        }
      );
    });

  const startVoiceCall = async (order?: any) => {
    const target = order || activeWorkspaceOrderRef.current;
    if (!target?.id) return;
    if (!activeWorkspaceOrderRef.current) {
      setActiveWorkspaceOrder(target);
    } else if (order && order.id !== activeWorkspaceOrderRef.current.id) {
      setActiveWorkspaceOrder(order);
    }
    if (callStartingRef.current || callOrderRef.current) {
      setWorkspaceStatusMsg({ text: 'Ek call pehle se chal rahi hai.', type: 'info' });
      return;
    }
    callStartingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      callLocalStreamRef.current = stream;
    } catch {
      callStartingRef.current = false;
      setWorkspaceStatusMsg({ text: 'Call ke liye microphone permission chahiye.', type: 'error' });
      return;
    }

    // 1) Wait for the live socket (handles cold starts / reconnects).
    setWorkspaceStatusMsg({ text: '📞 Live server se connect ho raha hai…', type: 'info' });
    const connected = await waitForRealtimeConnection(15000);
    if (!connected) {
      callStartingRef.current = false;
      teardownCallMedia();
      setWorkspaceStatusMsg({ text: 'Live server se connection nahi bana. Internet check karke 10-15 second baad dobara call karein.', type: 'error' });
      return;
    }

    // 2) Ensure this order room is joined before sending the invite.
    const joinResult = await joinCallOrderRoom(target.id);
    if (!joinResult.success) {
      callStartingRef.current = false;
      teardownCallMedia();
      setWorkspaceStatusMsg({ text: `Call room join nahi hua: ${joinResult.error || 'unknown error'}. Page refresh karke dobara try karein.`, type: 'error' });
      return;
    }

    callStartingRef.current = false;
    callOrderRef.current = target.id;
    setActiveCallOrderId(target.id);
    callRoleRef.current = 'caller';
    setCallPeerLabel(activeRoleRef.current === 'client'
      ? (target.acceptedByVleName || target.acceptedByFillerName || 'Jan Seva Operator')
      : (target.clientName || 'Citizen'));
    setCallingState('calling');
    setCallDuration(0);
    startCallRingtone();

    // 3) Invite with a timeout so the button never gets stuck on "calling".
    let inviteSettled = false;
    const inviteTimer = setTimeout(() => {
      if (inviteSettled) return;
      inviteSettled = true;
      setWorkspaceStatusMsg({ text: 'Call invite ka jawab nahi aaya. Dusri taraf app band/offline ho sakti hai — dobara try karein.', type: 'error' });
      endVoiceCall();
    }, 25000);

    const callerLabel = activeRoleRef.current === 'client'
      ? (clientName || 'Citizen')
      : activeRoleRef.current === 'form_filler'
        ? (fillerName || 'Form Filler')
        : (vleName || 'Jan Seva Operator');
    realtimeSocket.timeout(25000).emit(
      'call:invite',
      { orderId: target.id, peerLabel: callerLabel },
      (timeoutError: unknown, result?: { success?: boolean; error?: string }) => {
        if (inviteSettled) return;
        inviteSettled = true;
        clearTimeout(inviteTimer);
        if (timeoutError) {
          setWorkspaceStatusMsg({ text: 'Call invite timeout ho gaya. Internet check karke dobara try karein.', type: 'error' });
          endVoiceCall();
          return;
        }
        if (!result?.success) {
          setWorkspaceStatusMsg({ text: result?.error || 'Call nahi lag saki (dusri taraf wala online/order room me nahi hai).', type: 'error' });
          endVoiceCall();
        }
      }
    );
  };

  const acceptVoiceCall = async () => {
    const incomingOrder = callIncomingOrderRef.current;
    const orderId = callOrderRef.current || incomingOrder?.id || activeWorkspaceOrderRef.current?.id;
    if (!orderId) { resetCall(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      callLocalStreamRef.current = stream;
    } catch {
      setWorkspaceStatusMsg({ text: 'Call accept karne ke liye microphone permission chahiye.', type: 'error' });
      realtimeSocket.emit('call:reject', { orderId });
      resetCall();
      return;
    }
    callOrderRef.current = orderId;
    setActiveCallOrderId(orderId);
    callRoleRef.current = 'callee';
    // Accept karte hi sahi order ka workspace kholo — chahe user kisi aur
    // workspace me ho ya workspace minimize ho.
    const orderToOpen = (incomingOrder?.id === orderId ? incomingOrder : null)
      || ordersLookupRef.current.find(item => item?.id === orderId)
      || null;
    if (orderToOpen) {
      setIsWorkspaceMinimized(false);
      setActiveWorkspaceOrder((current: any) => current?.id === orderToOpen.id ? current : orderToOpen);
    }
    callIncomingOrderRef.current = null;
    stopCallRingtone();
    setCallingState('connected');
    setCallDuration(0);
    // Ack se pata chalta hai ki caller abhi bhi connected hai. Agar caller ne
    // ring ke dauraan call cancel kar di, to humein "connected" mat dikhao.
    let acceptSettled = false;
    realtimeSocket.timeout(12000).emit(
      'call:accept',
      { orderId },
      (timeoutError: unknown, result?: { success?: boolean; error?: string }) => {
        if (acceptSettled) return;
        acceptSettled = true;
        if (timeoutError || !result?.success) {
          setWorkspaceStatusMsg({ text: result?.error || 'Call accept nahi hua — caller ne call band kar di. Dobara call karein.', type: 'error' });
          resetCall();
        }
      }
    );
  };

  const rejectVoiceCall = () => {
    if (callOrderRef.current) realtimeSocket.emit('call:reject', { orderId: callOrderRef.current });
    resetCall();
  };

  const endVoiceCall = (_silent?: boolean) => {
    if (callOrderRef.current) realtimeSocket.emit('call:end', { orderId: callOrderRef.current });
    resetCall();
  };

  const toggleCallMute = () => {
    const tracks = callLocalStreamRef.current?.getAudioTracks() || [];
    const next = !isCallMuted;
    tracks.forEach(track => { track.enabled = !next; });
    setIsCallMuted(next);
  };

  const createRtcPeer = (orderId: string, token: string, targetSocketId: string, receiveOnly: boolean) => {
    rtcPeerConnectionRef.current?.close();
    rtcTargetSocketIdRef.current = targetSocketId;
    rtcPendingCandidatesRef.current = [];
    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
    rtcPeerConnectionRef.current = peer;
    if (receiveOnly) {
      peer.addTransceiver('video', { direction: 'recvonly' });
    } else {
      clientCameraStreamRef.current?.getTracks().forEach(track => peer.addTrack(track, clientCameraStreamRef.current!));
    }
    peer.onicecandidate = event => {
      if (event.candidate && rtcTargetSocketIdRef.current) {
        realtimeSocket.emit('rtc:signal', {
          orderId,
          token,
          targetSocketId: rtcTargetSocketIdRef.current,
          candidate: event.candidate.toJSON()
        });
      }
    };
    peer.ontrack = event => {
      if (activeRoleRef.current !== 'client') {
        expertCameraStreamRef.current = event.streams[0];
        if (expertCameraVideoRef.current) expertCameraVideoRef.current.srcObject = expertCameraStreamRef.current;
        setIsExpertCameraConnected(true);
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed' || peer.connectionState === 'disconnected') {
        setIsExpertCameraConnected(false);
        setIsExpertCameraConnecting(false);
      }
    };
    return peer;
  };

  const handleRtcSignal = async (signal: {
    orderId: string;
    token: string;
    fromSocketId: string;
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  }) => {
    try {
      const isClient = activeRoleRef.current === 'client' || liveCameraTokenRef.current === signal.token;
      let peer = rtcPeerConnectionRef.current;
      if (!peer && isClient && clientCameraStreamRef.current) {
        peer = createRtcPeer(signal.orderId, signal.token, signal.fromSocketId, false);
      }
      if (!peer) return;
      rtcTargetSocketIdRef.current = signal.fromSocketId;
      if (signal.description) {
        await peer.setRemoteDescription(signal.description);
        for (const candidate of rtcPendingCandidatesRef.current) {
          await peer.addIceCandidate(candidate);
        }
        rtcPendingCandidatesRef.current = [];
        if (signal.description.type === 'offer') {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          realtimeSocket.emit('rtc:signal', {
            orderId: signal.orderId,
            token: signal.token,
            targetSocketId: signal.fromSocketId,
            description: peer.localDescription?.toJSON()
          });
        }
      } else if (signal.candidate) {
        if (peer.remoteDescription) {
          await peer.addIceCandidate(signal.candidate);
        } else {
          rtcPendingCandidatesRef.current.push(signal.candidate);
        }
      }
    } catch (error) {
      console.error('WebRTC signaling failed:', error);
      setClientCameraError('The live camera connection failed. Close the request and try again.');
      setIsExpertCameraConnected(false);
    }
  };

  useEffect(() => {
    const orderId = activeWorkspaceOrder?.id;
    if (!orderId) {
      setWorkspacePaymentIntent(null);
      setPaymentIntentError('');
      return;
    }

    let cancelled = false;
    setWorkspacePaymentIntent(null);
    setPaymentIntentError('');
    fetch(`/api/payments/order-intent/${encodeURIComponent(orderId)}`)
      .then(async response => {
        const data = await parseJsonResponse(response);
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not prepare the operator UPI payment.');
        if (!cancelled) setWorkspacePaymentIntent({
          amount: data.amount,
          breakdown: data.breakdown,
          qrs: data.qrs,
          splits: data.splits,
          isPaymentDoneInApp: data.isPaymentDoneInApp,
          governmentQrUri: data.governmentQrUri,
          adminUpiConfigured: data.adminUpiConfigured
        });
      })
      .catch(error => {
        if (!cancelled) setPaymentIntentError(error instanceof Error ? error.message : 'Could not prepare the operator UPI payment.');
      });
    return () => { cancelled = true; };
  }, [activeWorkspaceOrder?.id, activeWorkspaceOrder?.isProofApprovedByClient, paymentIntentRefreshKey]);

  // ⚠️ Input fields sirf ORDER badalne pe reset hote hain — payment intent
  // refresh (realtime update / right-tick) pe nahi, warna operator ka upload
  // kiya hua QR aur citizen ka likha hua UTR beech me wipe ho jaata hai.
  useEffect(() => {
    setGovtQrImageInput('');
    setGovtUpiInput(String((activeWorkspaceOrder as any)?.govtUpiId || ''));
    const currentGovtFee = Number((activeWorkspaceOrder as any)?.govtFee);
    setGovtFeeInput(Number.isFinite(currentGovtFee) ? String(currentGovtFee) : '');
    // New order = fresh mobile workspace: show the header and close any
    // collapsed detail card.
    setIsWorkspaceHeaderHidden(false);
    setMobileWorkspacePanel('none');
    setPendingProofChatImage(null);
  }, [activeWorkspaceOrder?.id]);

  // Incoming/active calls must never stay hidden behind the collapsed mobile header.
  useEffect(() => {
    if (callingState !== 'idle') setIsWorkspaceHeaderHidden(false);
  }, [callingState]);

  const [isKendraDetailsModalOpen, setIsKendraDetailsModalOpen] = useState(false);
  const isKendraDetailsModalOpenRef = useRef(false);
  useEffect(() => {
    isKendraDetailsModalOpenRef.current = isKendraDetailsModalOpen;
  }, [isKendraDetailsModalOpen]);

  // Edit state for Kendra & Operator details modal
  const [kendraEditCenterName, setKendraEditCenterName] = useState(vleCenterName);
  const [kendraEditOperatorName, setKendraEditOperatorName] = useState(vleName);
  const [kendraEditVleId, setKendraEditVleId] = useState(vleId);
  const [kendraEditPhone, setKendraEditPhone] = useState(vlePhone);
  const [kendraEditEmail, setKendraEditEmail] = useState(vleEmail);
  const [kendraEditStateValue, setKendraEditStateValue] = useState(vleState);
  const [kendraEditDistrict, setKendraEditDistrict] = useState(vleDistrict);
  const [kendraEditCity, setKendraEditCity] = useState(vleCity);
  const [kendraEditPhotoUrl, setKendraEditPhotoUrl] = useState(vlePhotoUrl);
  const [isSavingKendraDetails, setIsSavingKendraDetails] = useState(false);
  const [kendraSaveError, setKendraSaveError] = useState('');

  // Sync Kendra edit modal state when opening
  useEffect(() => {
    if (isKendraDetailsModalOpen) {
      setKendraEditCenterName(vleCenterName);
      setKendraEditOperatorName(vleName);
      setKendraEditVleId(vleId);
      setKendraEditPhone(vlePhone);
      setKendraEditEmail(vleEmail);
      setKendraEditStateValue(vleState);
      setKendraEditDistrict(vleDistrict);
      setKendraEditCity(vleCity);
      setKendraEditPhotoUrl(vlePhotoUrl);
      setKendraSaveError('');
    }
  }, [isKendraDetailsModalOpen]);

  const saveKendraDetails = async () => {
    if (isSavingKendraDetails) return;
    const cleanCenter = kendraEditCenterName.trim();
    const cleanOperator = kendraEditOperatorName.trim();
    const cleanId = kendraEditVleId.trim();
    const cleanPhone = kendraEditPhone.replace(/\D/g, '').slice(-10);
    const cleanEmail = kendraEditEmail.trim().toLowerCase();
    const cleanState = kendraEditStateValue.trim();
    const cleanDistrict = kendraEditDistrict.trim();
    const cleanCity = kendraEditCity.trim();
    const cleanPhoto = kendraEditPhotoUrl.trim();

    const missing = collectMissingFields([
      { label: 'Jan Seva Kendra / Center Name', ok: isNonEmpty(cleanCenter) },
      { label: 'Operator Name', ok: isNonEmpty(cleanOperator) },
      { label: 'CSC ID / Kendra Registration No.', ok: isNonEmpty(cleanId) },
      { label: 'State / UT', ok: isNonEmpty(cleanState) },
      { label: 'District', ok: isNonEmpty(cleanDistrict) },
      { label: 'City / Tehsil', ok: isNonEmpty(cleanCity) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(cleanPhone) },
      { label: 'Gmail / Email', ok: isValidEmail(cleanEmail) },
    ]);
    if (missing.length > 0) {
      setKendraSaveError(requiredFieldsMessage(missing));
      return;
    }

    setIsSavingKendraDetails(true);
    setKendraSaveError('');
    try {
      const response = await fetchWithRetry('/api/vle/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanOperator,
          centerName: cleanCenter,
          cscId: cleanId,
          phone: cleanPhone,
          email: cleanEmail,
          state: cleanState,
          district: cleanDistrict,
          city: cleanCity,
          photoUrl: cleanPhoto
        })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not save profile details. Please try again.');
      }

      const savedUser = data.user || {};
      const savedOperator = data.operator || {};
      const resolvedName = String(savedUser.name || savedOperator.name || cleanOperator).trim();
      const resolvedCenter = String(savedUser.centerName || savedOperator.centerName || cleanCenter).trim();
      const resolvedId = String(savedUser.cscId || savedOperator.cscId || cleanId).trim();
      const resolvedPhone = String(savedUser.phone || savedOperator.phone || cleanPhone).replace(/\D/g, '').slice(-10);
      const resolvedEmail = String(savedUser.email || savedOperator.email || cleanEmail).trim().toLowerCase();
      const resolvedState = String(savedUser.state || savedOperator.state || cleanState).trim();
      const resolvedDistrict = String(savedUser.district || savedOperator.district || cleanDistrict).trim();
      const resolvedCity = String(savedUser.city || savedOperator.city || cleanCity).trim();
      const resolvedPhoto = String(savedUser.photoUrl || savedOperator.photoUrl || cleanPhoto).trim();

      setVleCenterName(resolvedCenter);
      setVleName(resolvedName);
      setVleId(resolvedId);
      setVlePhone(resolvedPhone);
      setVleEmail(resolvedEmail);
      setVleState(resolvedState);
      setVleDistrict(resolvedDistrict);
      setVleCity(resolvedCity);
      setVlePhotoUrl(resolvedPhoto);

      try {
        localStorage.setItem('vle_center_name', resolvedCenter);
        localStorage.setItem('vle_operator_name', resolvedName);
        localStorage.setItem('vle_csc_id', resolvedId);
        localStorage.setItem('vle_phone', resolvedPhone);
        localStorage.setItem('vle_email', resolvedEmail);
        localStorage.setItem('vle_state', resolvedState);
        localStorage.setItem('vle_district', resolvedDistrict);
        localStorage.setItem('vle_city', resolvedCity);
        if (resolvedPhoto) localStorage.setItem('vle_photo_url', resolvedPhoto);
        else localStorage.removeItem('vle_photo_url');
      } catch {}

      const session = readStoredSession();
      writeStoredSession({
        role: 'vle',
        name: resolvedName,
        phone: resolvedPhone,
        email: resolvedEmail,
        state: resolvedState,
        district: resolvedDistrict,
        city: resolvedCity,
        cscId: resolvedId,
        token: session?.token,
        loggedInAt: session?.loggedInAt || Date.now()
      });

      setIsKendraDetailsModalOpen(false);
      setWorkspaceStatusMsg({
        text: `✅ ${resolvedCenter} (${resolvedName}) का विवरण सुरक्षित हो गया!`,
        type: 'success',
      });
      showSaveToast('✅ Kendra details saved successfully!');
      void fetchAllData();
    } catch (error) {
      setKendraSaveError(error instanceof Error ? error.message : 'Could not save profile details. Please try again.');
    } finally {
      setIsSavingKendraDetails(false);
    }
  };

  // =====================================================================
  // ✍️ FORM EXPERT PROFILE & LOCATION (same pattern as Jan Seva Kendra)
  // =====================================================================
  // Expert apni details ek hi jagah save karta hai. Save hone ke baad ye
  // values dashboard, form publishing aur receipts me use hoti hain, aur
  // naye device par backend se wapas aa jati hain.
  const [isFillerDetailsModalOpen, setIsFillerDetailsModalOpen] = useState(false);
  const [fillerEditName, setFillerEditName] = useState(fillerName);
  const [fillerEditPhone, setFillerEditPhone] = useState(fillerPhone);
  const [fillerEditEmail, setFillerEditEmail] = useState(fillerEmail);
  const [fillerEditStateValue, setFillerEditStateValue] = useState(fillerState);
  const [fillerEditDistrict, setFillerEditDistrict] = useState(fillerDistrict);
  const [fillerEditCity, setFillerEditCity] = useState(fillerCity);
  const [fillerEditPhotoUrl, setFillerEditPhotoUrl] = useState(fillerPhotoUrl);
  const [isSavingFillerDetails, setIsSavingFillerDetails] = useState(false);
  const [fillerSaveError, setFillerSaveError] = useState('');

  // Sync the edit form whenever the modal opens.
  useEffect(() => {
    if (isFillerDetailsModalOpen) {
      setFillerEditName(fillerName);
      setFillerEditPhone(fillerPhone);
      setFillerEditEmail(fillerEmail);
      setFillerEditStateValue(fillerState);
      setFillerEditDistrict(fillerDistrict);
      setFillerEditCity(fillerCity);
      setFillerEditPhotoUrl(fillerPhotoUrl);
      setFillerSaveError('');
    }
  }, [isFillerDetailsModalOpen]);

  const saveFillerDetails = async () => {
    if (isSavingFillerDetails) return;
    const cleanName = fillerEditName.trim();
    const cleanPhone = fillerEditPhone.replace(/\D/g, '').slice(-10);
    const cleanEmail = fillerEditEmail.trim().toLowerCase();
    const cleanState = fillerEditStateValue.trim();
    const cleanDistrict = fillerEditDistrict.trim();
    const cleanCity = fillerEditCity.trim();
    const cleanPhoto = fillerEditPhotoUrl.trim();

    const missing = collectMissingFields([
      { label: 'Expert Name', ok: isNonEmpty(cleanName) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(cleanPhone) },
      { label: 'Gmail / Email', ok: isValidEmail(cleanEmail) },
      { label: 'State / UT', ok: isNonEmpty(cleanState) },
      { label: 'District', ok: isNonEmpty(cleanDistrict) },
      { label: 'City / Tehsil', ok: isNonEmpty(cleanCity) }
    ]);
    if (missing.length > 0) {
      setFillerSaveError(requiredFieldsMessage(missing));
      return;
    }

    setIsSavingFillerDetails(true);
    setFillerSaveError('');
    try {
      const response = await fetchWithRetry('/api/filler/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          state: cleanState,
          district: cleanDistrict,
          city: cleanCity,
          photoUrl: cleanPhoto
        })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not save profile details. Please try again.');
      }

      const savedUser = data.user || {};
      const resolvedName = String(savedUser.name || cleanName).trim();
      const resolvedPhone = String(savedUser.phone || cleanPhone).replace(/\D/g, '').slice(-10);
      const resolvedEmail = String(savedUser.email || cleanEmail).trim().toLowerCase();
      const resolvedState = String(savedUser.state || cleanState).trim();
      const resolvedDistrict = String(savedUser.district || cleanDistrict).trim();
      const resolvedCity = String(savedUser.city || cleanCity).trim();
      const resolvedPhoto = String(savedUser.photoUrl ?? cleanPhoto).trim();

      setFillerName(resolvedName);
      setFillerPhone(resolvedPhone);
      setFillerEmail(resolvedEmail);
      setFillerState(resolvedState);
      setFillerDistrict(resolvedDistrict);
      setFillerCity(resolvedCity);
      setFillerPhotoUrl(resolvedPhoto);

      try {
        localStorage.setItem('filler_operator_name', resolvedName);
        localStorage.setItem('filler_phone', resolvedPhone);
        localStorage.setItem('filler_email', resolvedEmail);
        localStorage.setItem('filler_state', resolvedState);
        localStorage.setItem('filler_district', resolvedDistrict);
        localStorage.setItem('filler_city', resolvedCity);
        if (resolvedPhoto) localStorage.setItem('filler_photo_url', resolvedPhoto);
        else localStorage.removeItem('filler_photo_url');
      } catch {}

      const session = readStoredSession();
      writeStoredSession({
        role: 'form_filler',
        name: resolvedName,
        phone: resolvedPhone,
        email: resolvedEmail,
        state: resolvedState,
        district: resolvedDistrict,
        city: resolvedCity,
        token: session?.token,
        loggedInAt: session?.loggedInAt || Date.now()
      });

      setIsFillerDetailsModalOpen(false);
      showSaveToast('✅ Form Expert details saved successfully!');
      void fetchAllData();
    } catch (error) {
      setFillerSaveError(error instanceof Error ? error.message : 'Could not save profile details. Please try again.');
    } finally {
      setIsSavingFillerDetails(false);
    }
  };

  // Multiple files staging for bulk upload (asli File objects — upload par server ko bhejenge)
  const [stagedFiles, setStagedFiles] = useState<{ name: string; type: 'pdf' | 'jpg' | 'png'; size: string; file: File }[]>([]);

  // Call timer simulation
  useEffect(() => {
    let timer: any;
    if (callingState === 'connected') {
      timer = setInterval(() => setCallDuration(c => c + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callingState]);

  // Safe JSON fetcher that won't throw unhandled errors during server restarts or transient offline states.
  // Uses the shared API client so a static frontend host (the `-1` deploy) automatically
  // falls back to the real backend instead of silently returning null.
  const safeFetchJson = async (url: string) => {
    try {
      const res = await fetchWithRetry(url);
      if (!res.ok) return null;
      return await parseJsonResponse(res);
    } catch {
      return null;
    }
  };

  const fetchAllDataInFlightRef = useRef(false);

  const fillerServicesSnapRef = useRef<string | null>(null);
  const pricingListSnapRef = useRef<string | null>(null);
  const formFillingListSnapRef = useRef<string | null>(null);
  const vlesSnapRef = useRef<string | null>(null);
  const statsSnapRef = useRef<string | null>(null);
  const deliveriesSnapRef = useRef<string | null>(null);
  const vleOrdersSnapRef = useRef<string | null>(null);
  const fillerOrdersSnapRef = useRef<string | null>(null);

  // Fetch all backend data
  const fetchAllData = async () => {
    if (fetchAllDataInFlightRef.current) return;
    fetchAllDataInFlightRef.current = true;

    try {
      const dashboardData = await safeFetchJson('/api/dashboard');
      if (!dashboardData?.success) return;

      // Restore the logged-in account's saved details from MongoDB/backend on
      // every dashboard sync, so a new device never shows blank fields.
      const account = dashboardData.account;
      if (account && typeof account === 'object' && account.role) {
        const accountName = String(account.name || '').trim();
        const accountPhone = String(account.phone || '').replace(/\D/g, '').slice(-10);
        const accountEmail = String(account.email || '').trim();
        const accountState = String(account.state || '').trim();
        const accountDistrict = sameAsStateValue(String(account.district || ''), accountState) ? '' : String(account.district || '').trim();
        const accountCity = sameAsStateValue(String(account.city || ''), accountState) ? '' : String(account.city || '').trim();
        if (account.role === 'client') {
          if (accountName) setClientName(accountName);
          if (accountPhone) setClientPhone(accountPhone);
          if (accountEmail) setClientEmail(accountEmail);
          if (accountState) setClientState(accountState);
          if (accountDistrict) setClientDistrictFilter(accountDistrict);
          if (accountCity) setClientCityFilter(accountCity);
        } else if (account.role === 'vle') {
          const operator = dashboardData.operatorProfile || {};
          const profile = {
            name: String(account.name || operator.name || '').trim(),
            centerName: String(account.centerName || operator.centerName || '').trim(),
            cscId: String(account.cscId || operator.cscId || '').trim(),
            photoUrl: String(account.photoUrl || operator.photoUrl || '').trim(),
            state: String(account.state || operator.state || '').trim(),
            district: String(account.district || operator.district || '').trim(),
            city: String(account.city || operator.city || '').trim()
          };
          // Do not clobber unsaved edits while the profile modal is open.
          if (!isKendraDetailsModalOpenRef.current) {
            if (profile.name) setVleName(profile.name);
            if (profile.centerName) setVleCenterName(profile.centerName);
            if (profile.cscId) setVleId(profile.cscId);
            if (accountPhone) setVlePhone(accountPhone);
            if (accountEmail) setVleEmail(accountEmail);
            if (profile.state) setVleState(profile.state);
            if (profile.district) setVleDistrict(profile.district);
            if (profile.city) setVleCity(profile.city);
            if (profile.photoUrl) setVlePhotoUrl(profile.photoUrl);
          }
        } else if (account.role === 'filler') {
          if (accountName) setFillerName(accountName);
          if (accountPhone) setFillerPhone(accountPhone);
          if (accountEmail) setFillerEmail(accountEmail);
          if (accountState) setFillerState(accountState);
          if (accountDistrict) setFillerDistrict(accountDistrict);
          if (accountCity) setFillerCity(accountCity);
          const accountPhoto = String(account.photoUrl || '').trim();
          if (accountPhoto) setFillerPhotoUrl(accountPhoto);
        }
      }

      if (Array.isArray(dashboardData.fillerServices) && dashboardData.fillerServices.length > 0) {
        const json = takeServerSnapshot(fillerServicesSnapRef, dashboardData.fillerServices);
        if (json !== null) {
          setFillerServices(prev => (JSON.stringify(prev) === json ? prev : dashboardData.fillerServices));
        }
      }

      if (Array.isArray(dashboardData.pricingList) && dashboardData.pricingList.length > 0) {
        const json = takeServerSnapshot(pricingListSnapRef, dashboardData.pricingList);
        if (json !== null) {
          setCustomPricingList(prev => (JSON.stringify(prev) === json ? prev : dashboardData.pricingList));
          try {
            localStorage.setItem('fillup_custom_pricing', json);
          } catch {}
        }
      }

      if (Array.isArray(dashboardData.formFillingList) && dashboardData.formFillingList.length > 0) {
        const json = takeServerSnapshot(formFillingListSnapRef, dashboardData.formFillingList);
        if (json !== null) {
          setVleFormFillingList(prev => (JSON.stringify(prev) === json ? prev : dashboardData.formFillingList));
          try {
            localStorage.setItem('fillup_vle_form_pricing', json);
          } catch {}
        }
      }

      if (Array.isArray(dashboardData.vles)) {
        const json = takeServerSnapshot(vlesSnapRef, dashboardData.vles);
        if (json !== null) {
          setRegisteredVles(prev => (JSON.stringify(prev) === json ? prev : dashboardData.vles));
        }
      }

      if (dashboardData.stats) {
        const statsJson = takeServerSnapshot(statsSnapRef, dashboardData.stats);
        if (statsJson !== null) {
          setPlatformStats(prev => (JSON.stringify(prev) === statsJson ? prev : dashboardData.stats));
        }
        setPlatformStatsState('ready');
        if (dashboardData.recentDeliveries) {
          const deliveriesJson = takeServerSnapshot(deliveriesSnapRef, dashboardData.recentDeliveries);
          if (deliveriesJson !== null) {
            setRecentDeliveries(prev => (JSON.stringify(prev) === deliveriesJson ? prev : dashboardData.recentDeliveries));
          }
        }
      }

      if (Array.isArray(dashboardData.vleOrders)) {
        // The server already returns only the orders visible to this account.
        const json = takeServerSnapshot(vleOrdersSnapRef, dashboardData.vleOrders);
        if (json !== null) {
          setVleExclusiveOrders(prev => (JSON.stringify(prev) === json ? prev : dashboardData.vleOrders));
        }
      }
      if (Array.isArray(dashboardData.fillerOrders)) {
        const json = takeServerSnapshot(fillerOrdersSnapRef, dashboardData.fillerOrders);
        if (json !== null) {
          setFillerOrders(prev => (JSON.stringify(prev) === json ? prev : dashboardData.fillerOrders));
        }
      }

      // Functional updater prevents stale closures in the polling interval
      setActiveWorkspaceOrder((prev: any) => {
        if (!prev) return null;
        const fromVle = dashboardData.vleOrders?.find((o: any) => o.id === prev.id);
        if (fromVle) return JSON.stringify(fromVle) === JSON.stringify(prev) ? prev : fromVle;
        const fromFiller = dashboardData.fillerOrders?.find((o: any) => o.id === prev.id);
        if (fromFiller) return JSON.stringify(fromFiller) === JSON.stringify(prev) ? prev : fromFiller;
        return prev;
      });
    } catch {
      // Graceful silent fallback without throwing console errors
    } finally {
      fetchAllDataInFlightRef.current = false;
    }
  };

  // Manual refresh (Refresh Feed / Refresh Bids) with a visible spinner.
  // The 15-second auto-polling keeps calling fetchAllData directly and stays silent.
  const handleManualRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    const startedAt = Date.now();
    try {
      await fetchAllData();
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 600) {
        await new Promise(resolve => setTimeout(resolve, 600 - elapsed));
      }
      setIsManualRefreshing(false);
    }
  };

  // Pleasant Web Audio synthesizer for incoming message & notification alert
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // silent fallback
    }
  };

  const handleOpenNotification = (order: any) => {
    if (order.status === 'pending' && !order.acceptedByName && !order.acceptedByVleName && !order.acceptedByFillerName) {
      setWorkspaceStatusMsg({
        text: '⏳ Awaiting Jan Seva Operator Acceptance! Operator ke accept karne ke baad hi chat aur messaging khulegi.',
        type: 'error'
      });
      if (soundAlertEnabled) playChime();
      return;
    }
    if (soundAlertEnabled) playChime();
    setActiveWorkspaceOrder(order);
  };

  const handleRateOrder = async (orderId: string, rating: number, review?: string) => {
    if (ratingOrderId) return;
    setRatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review: review || '', clientName })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        fetchAllData();
        if (soundAlertEnabled) playChime();
      }
    } catch (err) {
      console.warn('Rate order error:', err);
    } finally {
      setRatingOrderId(null);
    }
  };

  const handleSendQuickReply = async (order: any, textOverride?: string) => {
    const text = (textOverride || quickReplyText[order.id] || '').trim();
    if (!text || quickReplySendingId) return;
    setQuickReplySendingId(order.id);
    try {
      const result = await sendRealtimeMessage(order.id, {
        sender: 'client',
        senderName: clientName || 'Citizen',
        text
      });
      setActiveWorkspaceOrder((current: any) => current?.id === order.id ? result.order : current);
      setQuickReplyText(prev => ({ ...prev, [order.id]: '' }));
      if (soundAlertEnabled) playChime();
      fetchAllData();
    } catch (err) {
      console.warn('Quick reply send error:', err);
      setWorkspaceStatusMsg({ text: err instanceof Error ? err.message : 'The message could not be sent.', type: 'error' });
    } finally {
      setQuickReplySendingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    void fetchAllData().finally(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 500 - elapsed);
      setTimeout(() => {
        if (!cancelled) setIsInitialLoading(false);
      }, remaining);
    });
    // Poll less aggressively to avoid rate limiting while keeping the dashboard in sync.
    const interval = setInterval(fetchAllData, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Normalized client active orders across both Jan Seva Kendra and Form Filler orders
  const clientPhoneNorm = (clientPhone || '').replace(/\D/g, '').slice(-10);
  const matchedClientOrders = [
    ...vleExclusiveOrders.filter(o => {
      const oPhoneNorm = (o.clientPhone || '').replace(/\D/g, '').slice(-10);
      return (clientPhoneNorm && oPhoneNorm === clientPhoneNorm) || (o.clientName && clientName && o.clientName.toLowerCase() === clientName.toLowerCase());
    }),
    ...fillerOrders.filter(o => {
      const oPhoneNorm = (o.clientPhone || '').replace(/\D/g, '').slice(-10);
      return (clientPhoneNorm && oPhoneNorm === clientPhoneNorm) || (o.clientName && clientName && o.clientName.toLowerCase() === clientName.toLowerCase());
    })
  ];
  const rawClientOrders = matchedClientOrders.length > 0 ? matchedClientOrders : [
    ...vleExclusiveOrders,
    ...fillerOrders
  ];
  // Deduplicate broadcast orders present in both stores
  const seenClientOrderIds = new Set<string>();
  const clientActiveOrders = rawClientOrders.filter(o => {
    if (seenClientOrderIds.has(o.id)) return false;
    seenClientOrderIds.add(o.id);
    return true;
  });
  // Incoming call accept karte waqt sahi order kholne ke liye latest list.
  ordersLookupRef.current = [...vleExclusiveOrders, ...fillerOrders, ...clientActiveOrders];

  useEffect(() => {
    let pendingOrderId = '';
    try {
      pendingOrderId = sessionStorage.getItem('digiseva_pending_open_order_id') || '';
    } catch {}
    if (!pendingOrderId) return;
    const pendingOrder = clientActiveOrders.find(order => order.id === pendingOrderId);
    if (!pendingOrder) return;
    try {
      sessionStorage.removeItem('digiseva_pending_open_order_id');
    } catch {}
    setActiveWorkspaceOrder(pendingOrder);
  }, [clientActiveOrders]);

  const realtimeOrderIds = activeRole === 'client'
    ? matchedClientOrders.map(order => order.id)
    : activeRole === 'vle'
      ? vleExclusiveOrders.map(order => order.id)
      : activeRole === 'form_filler'
        ? fillerOrders.map(order => order.id)
        : [];
  const realtimeOrderIdsKey = [...new Set(realtimeOrderIds)].sort().join(',');

  useEffect(() => {
    const onConnect = () => setIsRealtimeConnected(true);
    const onDisconnect = () => setIsRealtimeConnected(false);
    const onIceConfig = (config: { iceServers?: RTCIceServer[] }) => {
      if (Array.isArray(config.iceServers) && config.iceServers.length > 0) {
        iceServersRef.current = config.iceServers;
      }
    };
    const onOrderMessage = (result: { order?: any }) => {
      const order = result.order;
      if (!order?.id) return;
      setActiveWorkspaceOrder((current: any) => current?.id === order.id ? order : current);
      // Payment QR / splits order ke andar hain (govt QR image, client
      // confirmation, operator right-tick). Order update aate hi payment
      // intent dobara laao, warna citizen ko stale QR dikhega.
      setPaymentIntentRefreshKey(key => key + 1);
      setVleExclusiveOrders((current: any[]) => current.some(item => item.id === order.id)
        ? current.map(item => item.id === order.id ? order : item)
        : [order, ...current]);
      setFillerOrders((current: any[]) => current.some(item => item.id === order.id)
        ? current.map(item => item.id === order.id ? order : item)
        : [order, ...current]);
    };
    const onOrderUpdated = (order: any) => onOrderMessage({ order });
    const onDispatchMessage = (result: { order?: any }) => {      const order = result.order;
      if (!order?.id) return;
      if (activeRoleRef.current === 'vle') {
        setVleExclusiveOrders((current: any[]) => current.some(item => item.id === order.id)
          ? current.map(item => item.id === order.id ? order : item)
          : [order, ...current]);
        setVleNotificationMsg(`📩 New client message for ${order.formTitle || order.serviceName || 'an order'}.`);
      } else if (activeRoleRef.current === 'form_filler') {
        setFillerOrders((current: any[]) => current.some(item => item.id === order.id)
          ? current.map(item => item.id === order.id ? order : item)
          : [order, ...current]);
        setFillerNotificationMsg(`📩 New client message for ${order.formTitle || order.serviceName || 'an order'}.`);
      }
      if (soundAlertEnabled) playChime();
    };
    const onDispatchNewOrder = (result: { order?: any }) => {
      const order = result?.order;
      if (!order?.id) return;
      const label = order.formTitle || order.serviceName || 'Digital Service';
      const place = order.city || order.district || 'India';
      if (activeRoleRef.current === 'vle') {
        setVleExclusiveOrders((current: any[]) => current.some(item => item.id === order.id)
          ? current.map(item => item.id === order.id ? order : item)
          : [order, ...current]);
        setVleNotificationMsg(`🔔 New citizen request: ${label} (${place}). Pehle accept karne wale ko milega.`);
      } else if (activeRoleRef.current === 'form_filler') {
        setFillerOrders((current: any[]) => current.some(item => item.id === order.id)
          ? current.map(item => item.id === order.id ? order : item)
          : [order, ...current]);
        setFillerNotificationMsg(`🔔 New form request: ${label} (${place}). Pehle accept karne wale ko milega.`);
      } else {
        return;
      }
      if (soundAlertEnabled) playChime();
    };
    const onDispatchOrderTaken = (result: { orderId?: string }) => {
      const orderId = result?.orderId;
      if (!orderId) return;
      setVleExclusiveOrders((current: any[]) => current.filter(item => item.id !== orderId));
      setFillerOrders((current: any[]) => current.filter(item => item.id !== orderId));
    };
    const onCameraRequested = (session: any) => {
      if (activeRoleRef.current !== 'client') return;
      const currentPhone = clientPhoneRef.current.replace(/\D/g, '').slice(-10);
      const requestPhone = String(session.clientPhone || '').replace(/\D/g, '').slice(-10);
      if (!currentPhone || currentPhone !== requestPhone) return;
      stopLiveCamera();
      setLiveCamSuccess(false);
      setClientCameraError('');
      setLiveCameraSessionInfo(session);
      setLiveCameraToken(session.token);
      realtimeSocket.emit('live-camera:join', { token: session.token });
      if (soundAlertEnabled) playChime();
    };
    const onCameraReady = async (event: { token: string; orderId: string; clientSocketId: string }) => {
      if (
        activeRoleRef.current === 'client' ||
        activeWorkspaceOrderRef.current?.id !== event.orderId ||
        !realtimeSocket.connected
      ) return;
      setIsExpertCameraConnecting(true);
      realtimeSocket.emit('live-camera:join', { token: event.token }, (result: { success: boolean }) => {
        if (!result.success) {
          setIsExpertCameraConnecting(false);
          return;
        }
        void (async () => {
          try {
          const peer = createRtcPeer(event.orderId, event.token, event.clientSocketId, true);
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          realtimeSocket.emit('rtc:signal', {
            orderId: event.orderId,
            token: event.token,
            targetSocketId: event.clientSocketId,
            description: peer.localDescription?.toJSON()
          });
          } catch (error) {
            setIsExpertCameraConnecting(false);
            console.error('Could not start WebRTC camera offer:', error);
            setWorkspaceStatusMsg({ text: 'Could not start the live camera connection. Please retry the photo request.', type: 'error' });
          }
        })();
      });
    };
    const onCameraBlinkVerified = (event: { token?: string; orderId?: string }) => {
      if (!requestedCameraSessionRef.current?.token || event.token !== requestedCameraSessionRef.current.token) return;
      setIsExpertBlinkVerified(true);
      setWorkspaceStatusMsg({ text: '👁️ Liveness verified — the citizen blinked. You can capture the photo now.', type: 'success' });
    };
    const onCameraBlinkUnavailable = (event: { token?: string; orderId?: string }) => {
      if (!requestedCameraSessionRef.current?.token || event.token !== requestedCameraSessionRef.current.token) return;
      setIsClientBlinkUnavailable(true);
      setWorkspaceStatusMsg({ text: '⚠️ Blink detection unavailable on the citizen device (offline). Capturing is allowed without the blink check.', type: 'info' });
    };
    const onCameraSubmitted = (event: { session?: any; order?: any }) => {
      if (event.order) onOrderMessage({ order: event.order });
      if (event.session?.token === liveCameraTokenRef.current) {
        setLiveCamSuccess(true);
        stopLiveCamera(false);
      }
      rtcPeerConnectionRef.current?.close();
      rtcPeerConnectionRef.current = null;
      expertCameraStreamRef.current = null;
      if (expertCameraVideoRef.current) expertCameraVideoRef.current.srcObject = null;
      setIsExpertCameraConnected(false);
      setIsExpertCameraConnecting(false);
      setIsExpertBlinkVerified(false);
      setIsClientBlinkUnavailable(false);
      setRequestedCameraSession(null);
    };
    const onRtcSignal = (signal: {
      orderId: string;
      token: string;
      fromSocketId: string;
      description?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }) => {
      void handleRtcSignal(signal);
    };
    const onRtcStop = (event: { token: string }) => {
      if (event.token === liveCameraTokenRef.current) {
        stopLiveCamera(false);
      } else if (requestedCameraSessionRef.current?.token === event.token) {
        rtcPeerConnectionRef.current?.close();
        rtcPeerConnectionRef.current = null;
        expertCameraStreamRef.current = null;
        if (expertCameraVideoRef.current) expertCameraVideoRef.current.srcObject = null;
        setIsExpertCameraConnected(false);
        setIsExpertCameraConnecting(false);
        setIsExpertBlinkVerified(false);
        setIsClientBlinkUnavailable(false);
      }
    };
    const onCallIncoming = (event: { orderId: string; fromSocketId: string; peerLabel?: string }) => {
      if (callOrderRef.current) {
        // Already busy — tell caller we're occupied.
        realtimeSocket.emit('call:reject', { orderId: event.orderId });
        return;
      }
      const incomingOrder = ordersLookupRef.current.find(item => item?.id === event.orderId) || null;
      callOrderRef.current = event.orderId;
      setActiveCallOrderId(event.orderId);
      callRoleRef.current = 'callee';
      callTargetSocketIdRef.current = event.fromSocketId;
      callIncomingOrderRef.current = incomingOrder;
      const orderPeerLabel = activeRoleRef.current === 'client'
        ? (incomingOrder?.acceptedByVleName || incomingOrder?.acceptedByFillerName || incomingOrder?.acceptedByName)
        : (incomingOrder?.clientName);
      setCallPeerLabel(event.peerLabel || orderPeerLabel || (activeRoleRef.current === 'client' ? 'Jan Seva Operator' : 'Citizen'));
      setCallingState('incoming');
      startCallRingtone(true);
    };
    const onCallAccepted = (event?: { orderId?: string; peerSocketId?: string }) => {
      // Caller ne timeout/cancel kar diya ho to stale accept ignore karo.
      if (!callOrderRef.current) return;
      if (event?.orderId && event.orderId !== callOrderRef.current) return;
      stopCallRingtone();
      if (event?.peerSocketId) callTargetSocketIdRef.current = event.peerSocketId;
      setCallingState('connected');
      setCallDuration(0);
      // Caller ne offer bhej diya hoga; peer banao aur ICE wait karo.
      if (callOrderRef.current && !callPcRef.current) {
        createCallPeer(callOrderRef.current, true);
      }
      // Mobile autoplay policy: gesture ke baad hi audio sink bajta hai.
      if (callAudioRef.current) void callAudioRef.current.play().catch(() => {});
    };
    const onCallBusy = () => {
      setWorkspaceStatusMsg({ text: '📵 Sirf ek call ek time par — dusri taraf already busy hai.', type: 'info' });
      resetCall();
    };
    const onCallEnded = () => {
      if (callOrderRef.current || callingState !== 'idle') {
        setWorkspaceStatusMsg({ text: 'Call ended.', type: 'info' });
      }
      resetCall();
    };
    const onCallSignal = (signal: {
      orderId: string;
      fromSocketId: string;
      description?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }) => {
      void handleCallSignal(signal);
    };

    const joinRooms = () => {
      if (!realtimeSocket.connected) return;
      const role = activeRoleRef.current === 'client' ? 'client' : 'operator';
      const phone = role === 'client' ? clientPhoneRef.current : '';
      const token = readStoredSession()?.token;
      [...new Set(realtimeOrderIdsKey ? realtimeOrderIdsKey.split(',') : [])].forEach(orderId => {
        realtimeSocket.emit('order:join', { orderId, role, phone, token }, (result: { success: boolean; error?: string }) => {
          if (!result.success) console.warn(`Realtime order join failed for ${orderId}:`, result.error);
        });
      });
      if (activeRoleRef.current === 'vle') {
        realtimeSocket.emit('dispatch:join', {
          role: 'vle',
          district: vleDistrictRef.current,
          operatorIds: [vleIdRef.current],
          token
        });
      } else if (activeRoleRef.current === 'form_filler') {
        realtimeSocket.emit('dispatch:join', {
          role: 'filler',
          district: fillerDistrictRef.current,
          token
        });
      }
    };

    realtimeSocket.on('connect', onConnect);
    realtimeSocket.on('disconnect', onDisconnect);
    realtimeSocket.on('webrtc:config', onIceConfig);
    realtimeSocket.on('order:message', onOrderMessage);
    realtimeSocket.on('order:updated', onOrderUpdated);
    realtimeSocket.on('dispatch:message', onDispatchMessage);
    realtimeSocket.on('dispatch:new-order', onDispatchNewOrder);
    realtimeSocket.on('dispatch:order-taken', onDispatchOrderTaken);
    realtimeSocket.on('live-camera:requested', onCameraRequested);
    realtimeSocket.on('live-camera:ready', onCameraReady);
    realtimeSocket.on('live-camera:blink-verified', onCameraBlinkVerified);
    realtimeSocket.on('live-camera:blink-unavailable', onCameraBlinkUnavailable);
    realtimeSocket.on('live-camera:submitted', onCameraSubmitted);
    realtimeSocket.on('rtc:signal', onRtcSignal);
    realtimeSocket.on('rtc:stop', onRtcStop);
    realtimeSocket.on('call:incoming', onCallIncoming);
    realtimeSocket.on('call:accepted', onCallAccepted);
    realtimeSocket.on('call:busy', onCallBusy);
    realtimeSocket.on('call:ended', onCallEnded);
    realtimeSocket.on('call:signal', onCallSignal);
    realtimeSocket.on('connect', joinRooms);
    realtimeSocket.connect();
    joinRooms();

    return () => {
      realtimeSocket.off('connect', onConnect);
      realtimeSocket.off('disconnect', onDisconnect);
      realtimeSocket.off('webrtc:config', onIceConfig);
      realtimeSocket.off('order:message', onOrderMessage);
      realtimeSocket.off('order:updated', onOrderUpdated);
      realtimeSocket.off('dispatch:message', onDispatchMessage);
      realtimeSocket.off('dispatch:new-order', onDispatchNewOrder);
      realtimeSocket.off('dispatch:order-taken', onDispatchOrderTaken);
      realtimeSocket.off('live-camera:requested', onCameraRequested);
      realtimeSocket.off('live-camera:ready', onCameraReady);
      realtimeSocket.off('live-camera:blink-verified', onCameraBlinkVerified);
      realtimeSocket.off('live-camera:blink-unavailable', onCameraBlinkUnavailable);
      realtimeSocket.off('live-camera:submitted', onCameraSubmitted);
      realtimeSocket.off('rtc:signal', onRtcSignal);
      realtimeSocket.off('rtc:stop', onRtcStop);
      realtimeSocket.off('call:incoming', onCallIncoming);
      realtimeSocket.off('call:accepted', onCallAccepted);
      realtimeSocket.off('call:busy', onCallBusy);
      realtimeSocket.off('call:ended', onCallEnded);
      realtimeSocket.off('call:signal', onCallSignal);
      realtimeSocket.off('connect', joinRooms);
    };
  }, [realtimeOrderIdsKey, activeRole, clientPhone, activeWorkspaceOrder?.id, vleDistrict, vleId, fillerDistrict]);

  useEffect(() => {
    if (!liveCameraToken) stopLiveCamera();
  }, [liveCameraToken]);

  useEffect(() => {
    if (expertCameraVideoRef.current && expertCameraStreamRef.current) {
      expertCameraVideoRef.current.srcObject = expertCameraStreamRef.current;
    }
  }, [requestedCameraSession, isExpertCameraConnected]);

  useEffect(() => () => {
    stopLiveCamera();
    realtimeSocket.disconnect();
  }, []);

  // Keep the live camera session safe across network drops: when the realtime
  // connection cuts, stop the client's local camera (so the camera light turns
  // off) and reset the expert preview. On reconnect, the expert rejoins the
  // camera room automatically and the client can re-allow access to resume.
  useEffect(() => {
    const handleDrop = () => {
      if (activeRoleRef.current === 'client') {
        if (liveCameraTokenRef.current) stopLiveCamera(false);
      } else if (requestedCameraSessionRef.current) {
        rtcPeerConnectionRef.current?.close();
        rtcPeerConnectionRef.current = null;
        expertCameraStreamRef.current = null;
        if (expertCameraVideoRef.current) expertCameraVideoRef.current.srcObject = null;
        setIsExpertCameraConnected(false);
        setIsExpertCameraConnecting(false);
      }
    };
    const handleReturn = () => {
      const token = liveCameraTokenRef.current;
      const session = liveCameraSessionInfoRef.current;
      if (activeRoleRef.current === 'client' && token && session && isClientCameraOnRef.current) {
        realtimeSocket.emit('order:join', {
          orderId: session.orderId,
          role: 'client',
          phone: session.clientPhone
        }, () => {
          realtimeSocket.emit('live-camera:join', { token }, () => {
            realtimeSocket.emit('live-camera:ready', { token }, () => {});
          });
        });
      } else if (activeRoleRef.current !== 'client') {
        const requested = requestedCameraSessionRef.current;
        if (requested?.token) {
          realtimeSocket.emit('live-camera:join', { token: requested.token });
        }
      }
    };
    realtimeSocket.on('disconnect', handleDrop);
    realtimeSocket.on('connect', handleReturn);
    return () => {
      realtimeSocket.off('disconnect', handleDrop);
      realtimeSocket.off('connect', handleReturn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status counts for order filtering
  const pendingOrdersCount = clientActiveOrders.filter(o => o.status === 'pending').length;
  const activeOrdersCount = clientActiveOrders.filter(o => o.status === 'accepted' || o.status === 'proof_submitted' || o.status === 'paid').length;
  const completedOrdersCount = clientActiveOrders.filter(o => o.status === 'completed').length;

  // Filtered orders according to current status toggle
  const filteredClientActiveOrders = clientActiveOrders.filter(ord => {
    if (orderStatusFilter === 'pending') {
      return ord.status === 'pending';
    }
    if (orderStatusFilter === 'active') {
      return ord.status === 'accepted' || ord.status === 'proof_submitted' || ord.status === 'paid';
    }
    if (orderStatusFilter === 'completed') {
      return ord.status === 'completed';
    }
    return true;
  });

  // Extract all live notifications, chat alerts and photo proof updates for client
  const clientNotifications = clientActiveOrders.flatMap(ord => {
    const list: any[] = [];
    
    // Operator chat messages — ek order ke saare messages ek hi thread card me
    const opMsgs = (ord.chatMessages || []).filter((m: any) => m.sender === 'operator');
    if (opMsgs.length > 0) {
      const lastMsg = opMsgs[opMsgs.length - 1];
      const operatorName = lastMsg.senderName || ord.acceptedByVleName || ord.acceptedByFillerName || 'Digital Center Operator';
      list.push({
        id: `notif-chat-${ord.id}`,
        type: 'chat',
        order: ord,
        title: `💬 Chat with ${operatorName}`,
        operatorName,
        text: lastMsg.text,
        messageCount: opMsgs.length,
        hasAttachment: !!lastMsg.attachment,
        attachmentName: lastMsg.attachment?.name,
        time: lastMsg.time,
        service: ord.serviceName || ord.formTitle,
        isNew: true
      });
    }

    // Photo proof uploaded
    if (ord.previewPhotoProof || ord.status === 'proof_submitted') {
      list.push({
        id: `notif-proof-${ord.id}`,
        type: 'proof',
        order: ord,
        title: `📸 Photo Proof Uploaded: ${ord.acceptedByVleName || ord.acceptedByFillerName || 'Operator'}`,
        operatorName: ord.acceptedByVleName || ord.acceptedByFillerName || 'Digital Center Operator',
        text: 'Filled form acknowledgment receipt screenshot proof ready for inspection. Verify spelling, photo & details before in-app payment.',
        photoUrl: ord.previewPhotoProof,
        time: 'Proof Ready',
        service: ord.serviceName || ord.formTitle,
        isNew: !ord.isPaymentDoneInApp
      });
    }

    // Direct WhatsApp delivery
    if (ord.status === 'completed' && ord.credentialsDispatched) {
      list.push({
        id: `notif-whats-${ord.id}`,
        type: 'whatsapp',
        order: ord,
        title: `📲 Credentials Ready to Send`,
        operatorName: ord.acceptedByVleName || ord.acceptedByFillerName || 'Digital Center Operator',
        text: `Application No: ${ord.credentialsDispatched.appNumber} | Password: ${ord.credentialsDispatched.pass}`,
        time: 'Ready to send',
        service: ord.serviceName || ord.formTitle,
        isNew: false
      });
    }

    // Bid / Request accepted
    if (ord.status === 'accepted') {
      list.push({
        id: `notif-accept-${ord.id}`,
        type: 'accepted',
        order: ord,
        title: `⚡ Request Accepted by ${ord.acceptedByVleName || ord.acceptedByFillerName || 'Digital Center Operator'}`,
        operatorName: ord.acceptedByVleName || ord.acceptedByFillerName || 'Digital Center Operator',
        text: 'Live talking panel, instant voice call and document upload vault are now active.',
        time: 'Active Now',
        service: ord.serviceName || ord.formTitle,
        isNew: false
      });
    }

    return list;
  });

  // Filtered Jan Seva Kendra Services by Name or Category (Department)
  const filteredJanSevaPricingList = customPricingList.filter((item) => {
    const q = janSevaSearchQuery.toLowerCase().trim();
    const docName = item.docName.toLowerCase();
    const dept = (item.dept || '').toLowerCase();
    const id = item.id.toLowerCase();

    // Text search matches name, department, or keywords
    const matchesSearch =
      !q ||
      docName.includes(q) ||
      dept.includes(q) ||
      id.includes(q) ||
      (q.includes('pan') && (docName.includes('pan') || id.includes('pan'))) ||
      (q.includes('niwas') && (docName.includes('niwas') || docName.includes('domicile'))) ||
      (q.includes('domicile') && (docName.includes('niwas') || docName.includes('domicile'))) ||
      (q.includes('aay') && (docName.includes('aay') || docName.includes('income'))) ||
      (q.includes('income') && (docName.includes('aay') || docName.includes('income'))) ||
      (q.includes('jati') && (docName.includes('jati') || docName.includes('caste'))) ||
      (q.includes('caste') && (docName.includes('jati') || docName.includes('caste'))) ||
      (q.includes('ration') && docName.includes('ration')) ||
      (q.includes('ayushman') && docName.includes('ayushman')) ||
      (q.includes('dl') || q.includes('driving') || q.includes('license') ? (docName.includes('dl') || docName.includes('driving') || docName.includes('license')) : false) ||
      (q.includes('voter') && (docName.includes('voter') || docName.includes('election'))) ||
      (q.includes('aadhaar') || q.includes('aadhar') ? (docName.includes('aadhaar') || docName.includes('aadhar')) : false) ||
      (q.includes('khasra') || q.includes('khatauni') || q.includes('bhulekh') ? (docName.includes('khasra') || docName.includes('khatauni') || docName.includes('bhulekh')) : false) ||
      (q.includes('shram') && (docName.includes('shram') || docName.includes('labour')));

    // Category / Department Filter
    let matchesCategory = true;
    if (janSevaSelectedCategory !== 'all') {
      if (janSevaSelectedCategory === 'certificates') {
        matchesCategory = dept.includes('revenue') || docName.includes('praman') || docName.includes('certificate') || docName.includes('niwas') || docName.includes('aay') || docName.includes('jati') || docName.includes('domicile');
      } else if (janSevaSelectedCategory === 'identity') {
        matchesCategory = docName.includes('pan') || docName.includes('aadhaar') || docName.includes('voter') || dept.includes('nsdl') || dept.includes('uidai') || dept.includes('eci');
      } else if (janSevaSelectedCategory === 'schemes') {
        matchesCategory = docName.includes('ration') || docName.includes('ayushman') || docName.includes('shram') || dept.includes('health') || dept.includes('food') || dept.includes('labour');
      } else if (janSevaSelectedCategory === 'transport_land') {
        matchesCategory = docName.includes('driving') || docName.includes('dl') || docName.includes('khasra') || docName.includes('bhulekh') || dept.includes('sarathi') || dept.includes('bhulekh');
      }
    }

    return matchesSearch && matchesCategory;
  });

  const normalizeLocation = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en-IN').trim().replace(/\s+/g, ' ');

  // Jan Seva requests are restricted to the citizen's district; exact city matches are shown first.
  const matchedVles = [...registeredVles].filter(v => {
    const q = searchQuery.toLowerCase().trim();
    const clientDistrict = normalizeLocation(clientDistrictFilter);
    if (!clientDistrict || normalizeLocation(v.district || '') !== clientDistrict) return false;

    const matchesLocation = (v.district || '').toLowerCase().includes(q) || (v.city || '').toLowerCase().includes(q);
    const matchesName = (v.name || '').toLowerCase().includes(q);
    const matchesDoc = v.pricingList?.some((p: any) => (p.docName || '').toLowerCase().includes(q));
    
    if (q) return matchesLocation || matchesName || matchesDoc;
    
    return true;
  }).sort((a, b) => {
    const clientCity = normalizeLocation(clientCityFilter);
    const aCityMatch = Boolean(clientCity) && normalizeLocation(a.city || '') === clientCity;
    const bCityMatch = Boolean(clientCity) && normalizeLocation(b.city || '') === clientCity;
    if (aCityMatch && !bCityMatch) return -1;
    if (!aCityMatch && bCityMatch) return 1;
    return 0;
  }).slice(0, 50);

  // Mixed List of Form Filler Experts & Jan Seva Kendra Operators for Form Filling Hub
  const mixedFormFillingExperts = useMemo(() => {
    // Keep both operator categories within the citizen's district.
    const localFillers = matchedVles.filter(v => v.role === 'filler');
    const localJanSevas = matchedVles.filter(v => v.role !== 'filler');

    // Interleave alternating: Form Filler, Jan Seva Kendra, Form Filler, Jan Seva Kendra...
    const mixed: any[] = [];
    const maxLen = Math.max(localFillers.length, localJanSevas.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < localFillers.length) mixed.push(localFillers[i]);
      if (i < localJanSevas.length) mixed.push(localJanSevas[i]);
    }
    return mixed.slice(0, 30);
  }, [matchedVles]);

  const isServiceVisibleForClient = (serviceState?: string) => {
    if (!serviceState) return true;
    return Boolean(clientState) && serviceState === clientState;
  };

  const visibleFillerServices = useMemo(
    () => fillerServices.filter(srv => isServiceVisibleForClient(srv.state)),
    [fillerServices, clientState]
  );

  // Combined published forms from all experts (Form Fillers & Jan Seva Operators)
  const allPublishedForms = useMemo(() => {
    const vlesWithForms = registeredVles.filter(v => v.formFillingList && v.formFillingList.length > 0);
    const vleForms = vlesWithForms.flatMap(v => (v.formFillingList || []).map((f: any) => ({
      ...f,
      expertName: v.centerName || v.kendraName || v.name,
      expertId: v.id,
      isVle: true
    })));
    
    // Predefined fillerServices are already in the state
    return [...visibleFillerServices, ...vleForms].filter(srv => isServiceVisibleForClient(srv.state));
  }, [visibleFillerServices, registeredVles, clientState]);

  // Dedicated 100% Pure Jan Seva Kendra / CSC VLE Operators List (for Jan Seva Kendra Document Center)
  const janSevaOnlyOperators = useMemo(() => {
    // Exclusively operators who are Jan Seva Kendra / CSC VLEs (role !== 'filler')
    const localJanSevas = matchedVles.filter(v => v.role !== 'filler');
    return localJanSevas.slice(0, 30);
  }, [matchedVles]);

  // Home page ke "Login" buttons: agar user ek baar login kar chuka hai to
  // seedha uske saved dashboard par bhejo. Login page sirf tab khule jab
  // koi saved session na ho (ya user ne khud Logout kiya ho).
  const openPortalOrLogin = (requestedRole: 'client' | 'vle' | 'form_filler') => {
    const session = readStoredSession();
    if (session) {
      setActiveRole(session.role);
      setPendingRole(null);
      setStep(
        session.role === 'client'
          ? 'client_portal'
          : session.role === 'vle'
            ? 'vle_home'
            : 'form_filler_app'
      );
      return;
    }
    setStep(
      requestedRole === 'client'
        ? 'client_login'
        : requestedRole === 'vle'
          ? 'vle_login'
          : 'form_filler_login'
    );
  };

  // Agar kisi bhi wajah se login screen khul jaye lekin saved session maujood
  // ho, to login form dobara mat dikhao — dashboard par redirect kar do.
  useEffect(() => {
    if (step !== 'client_login' && step !== 'vle_login' && step !== 'form_filler_login') return;
    const session = readStoredSession();
    if (!session) return;
    setActiveRole(session.role);
    setStep(
      session.role === 'client'
        ? 'client_portal'
        : session.role === 'vle'
          ? 'vle_home'
          : 'form_filler_app'
    );
  }, [step]);

  // Global Logout Handler
  const handleLogout = () => {
    clearStoredSession();
    setIsClientLoggedIn(false);
    setIsVleLoggedIn(false);
    setIsFormFillerLoggedIn(false);
    setActiveRole('none');
    setActiveWorkspaceOrder(null);
    endVoiceCall(true);
    setStep('landing');
  };

  // 📤 Asli file upload: files FormData (multipart) me server jaati hain,
  // server uploads/ me save karke 24h ke liye rakhta hai (zero data retention).
  const uploadDocumentsToOrder = async (
    orderId: string,
    files: File[],
    sender: 'client' | 'operator',
    senderName: string
  ) => {
    if (files.length === 0) return null;
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('sender', sender);
    formData.append('senderName', senderName);
    formData.append('clientName', clientName || 'Citizen');
    const res = await fetch(`/api/orders/${orderId}/documents/batch`, {
      method: 'POST',
      body: formData
    });
    const data = await parseJsonResponse(res).catch(() => ({}) as any);
    if (!res.ok || !data.success) {
      throw new Error(data?.error || 'The documents could not be uploaded.');
    }
    return data.order;
  };

  // 📥 Chat attachment ko authenticated tarike se khole/download karein
  // (server files 24h ke baad delete ho chuki hoti hain).
  const resolveAttachmentBlobUrl = async (attachment: { name?: string; url?: string }) => {
    const url = attachment.url || '';
    if (!url) throw new Error('This attachment has no file data.');
    if (!url.startsWith('/api/docs/')) return url;
    const res = await fetch(url);
    if (!res.ok) {
      let message = 'This document is no longer available.';
      if (res.status === 410) message = '🔒 Ye document 24 ghante baad privacy policy ke tahat delete ho chuka hai.';
      else if (res.status === 401 || res.status === 403) message = 'Login karke is document ko kholein.';
      else {
        const err = await parseJsonResponse(res).catch(() => null as any);
        if (err?.error) message = err.error;
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  };

  const attachmentActionKeyFor = (action: 'download' | 'view', attachment: { name?: string; url?: string }) =>
    `${action}:${attachment.url || attachment.name || ''}`;

  const handleDownloadAttachment = async (attachment: { name?: string; url?: string }) => {
    if (attachmentActionKey) return;
    const actionKey = attachmentActionKeyFor('download', attachment);
    setAttachmentActionKey(actionKey);
    try {
      const objectUrl = await resolveAttachmentBlobUrl(attachment);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = attachment.name || 'document';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      if (objectUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }
      setWorkspaceStatusMsg({ text: '✅ Download started.', type: 'success' });
    } catch (err) {
      setWorkspaceStatusMsg({ text: err instanceof Error ? err.message : 'Download failed.', type: 'error' });
    } finally {
      setAttachmentActionKey(null);
    }
  };

  const handleViewAttachment = async (attachment: { name?: string; url?: string }) => {
    if (attachmentActionKey) return;
    const actionKey = attachmentActionKeyFor('view', attachment);
    setAttachmentActionKey(actionKey);
    try {
      const objectUrl = await resolveAttachmentBlobUrl(attachment);
      const opened = window.open(objectUrl, '_blank', 'noopener');
      if (!opened) {
        setWorkspaceStatusMsg({ text: 'Popup blocked — download instead.', type: 'error' });
        return;
      }
      if (objectUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
      }
    } catch (err) {
      setWorkspaceStatusMsg({ text: err instanceof Error ? err.message : 'Could not open the document.', type: 'error' });
    } finally {
      setAttachmentActionKey(null);
    }
  };

  const feeGateActive = Boolean(activeWorkspaceOrder?.feesApprovalRequired && !activeWorkspaceOrder?.feesApprovedByClient);
  const feeTotalPreview = (Number(feeGovtInput) || 0) + (Number(feeServiceInput) || 0);

  useEffect(() => {
    if (!activeWorkspaceOrder?.id) {
      setFeeGovtInput('');
      setFeeServiceInput('');
      feeDraftTouchedRef.current = false;
      setFeeModalMsg(null);
      return;
    }
    const currentGovtFee = Number(activeWorkspaceOrder.govtFee);
    const currentServiceFee = Number(activeWorkspaceOrder.amountPaid);
    setFeeGovtInput(Number.isFinite(currentGovtFee) ? String(currentGovtFee) : '');
    setFeeServiceInput(Number.isFinite(currentServiceFee) && currentServiceFee > 0 ? String(currentServiceFee) : '');
    feeDraftTouchedRef.current = false;
    setFeeModalMsg(null);
  }, [activeWorkspaceOrder?.id]);

  async function saveOrderFees(mode: 'auto' | 'manual' = 'manual') {
    const order = activeWorkspaceOrderRef.current;
    if (!order?.id || activeRoleRef.current === 'client') return;
    if (feeSaveInFlightRef.current) return;

    const govtFee = Number(feeGovtInput);
    const serviceCharge = Number(feeServiceInput);
    if (!Number.isFinite(govtFee) || govtFee < 0) {
      if (mode === 'manual') setFeeModalMsg({ text: 'Government fee 0 ya usse zyada hona chahiye.', type: 'error' });
      return;
    }
    if (!Number.isFinite(serviceCharge) || serviceCharge <= 0) {
      if (mode === 'manual') setFeeModalMsg({ text: 'Form / service charge 0 se zyada hona chahiye.', type: 'error' });
      return;
    }

    feeSaveInFlightRef.current = true;
    setIsSavingOrderFees(true);
    setFeeModalMsg(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ govtFee, serviceCharge })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Fees could not be saved.');
      setActiveWorkspaceOrder(data.order);
      feeDraftTouchedRef.current = false;
      setFeeModalMsg({
        text: data.changed === false
          ? '✅ Fees saved. Citizen approval ka wait ho raha hai.'
          : '✅ Fees citizen ko bhej di gayi hain. Ab citizen OK karega tab chat khulega.',
        type: 'success'
      });
    } catch (error) {
      setFeeModalMsg({ text: error instanceof Error ? error.message : 'Fees could not be saved.', type: 'error' });
    } finally {
      feeSaveInFlightRef.current = false;
      setIsSavingOrderFees(false);
    }
  }

  const handleApproveOrderFees = async () => {
    const order = activeWorkspaceOrderRef.current;
    if (!order?.id || isApprovingOrderFees) return;
    setIsApprovingOrderFees(true);
    setFeeModalMsg(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/approve-fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Fees could not be approved.');
      setActiveWorkspaceOrder(data.order);
      setWorkspaceStatusMsg({ text: '✅ Fees approved. Chat is now unlocked.', type: 'success' });
      await fetchAllData();
    } catch (error) {
      setFeeModalMsg({ text: error instanceof Error ? error.message : 'Fees could not be approved.', type: 'error' });
    } finally {
      setIsApprovingOrderFees(false);
    }
  };

  useEffect(() => {
    if (activeRole === 'client') return;
    if (!activeWorkspaceOrder?.id || activeWorkspaceOrder?.feesApprovalRequired !== true) return;
    if (!feeDraftTouchedRef.current) return;
    const govtFee = Number(feeGovtInput);
    const serviceCharge = Number(feeServiceInput);
    if (!Number.isFinite(govtFee) || govtFee < 0) return;
    if (!Number.isFinite(serviceCharge) || serviceCharge <= 0) return;
    if (feeAutoSaveTimerRef.current) clearTimeout(feeAutoSaveTimerRef.current);
    feeAutoSaveTimerRef.current = setTimeout(() => {
      void saveOrderFees('auto');
    }, 650);
    return () => {
      if (feeAutoSaveTimerRef.current) clearTimeout(feeAutoSaveTimerRef.current);
    };
  }, [feeGovtInput, feeServiceInput, activeWorkspaceOrder?.id, activeWorkspaceOrder?.feesApprovalRequired, activeRole]);

  // Send Chat Message with correct sender identity
  const handleSendMessage = async () => {
    hideMobileWorkspaceHeader();
    if (activeRole === 'client') {
      const allowed = Boolean(
        activeWorkspaceOrder?.acceptedByVleName ||
        activeWorkspaceOrder?.acceptedByFillerName ||
        activeWorkspaceOrder?.acceptedByName ||
        activeWorkspaceOrder?.status === 'accepted' ||
        activeWorkspaceOrder?.chatMessages?.some((m: any) => m.sender === 'operator')
      );
      if (!allowed) {
        setWorkspaceStatusMsg({ text: '⏳ Message sent! Please wait while a Jan Seva Kendra or Form Filler expert accepts your request.', type: 'info' });
      }
    }
    if (!chatInputText.trim() && stagedFiles.length === 0) return;
    if (!activeWorkspaceOrder) return;
    if (isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      const actualSender = activeRole === 'client' ? 'client' : 'operator';
      const actualSenderName = activeRole === 'client'
        ? (clientName || 'Citizen')
        : (activeRole === 'form_filler' ? (fillerName || 'Form Filler') : (vleName || 'Jan Seva Operator'));

      if (stagedFiles.length > 0) {
        const uploadedOrder = await uploadDocumentsToOrder(
          activeWorkspaceOrder.id,
          stagedFiles.map(item => item.file),
          actualSender,
          actualSenderName
        );
        if (uploadedOrder) {
          setActiveWorkspaceOrder(uploadedOrder);
        }
        setStagedFiles([]);
      }

      if (chatInputText.trim()) {
        const data = await sendRealtimeMessage(activeWorkspaceOrder.id, {
          sender: actualSender,
          senderName: actualSenderName,
          text: chatInputText
        });
        setChatInputText('');
        setActiveWorkspaceOrder(data.order);
      }

      fetchAllData();
    } catch (err) {
      console.warn('Unable to send message/files:', err);
      setWorkspaceStatusMsg({ text: err instanceof Error ? err.message : 'The message or attachment could not be sent.', type: 'error' });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleConfirmSplitLeg = async (leg: 'govt' | 'operator') => {
    if (!activeWorkspaceOrder) return;
    setIsVerifyingPayment(true);
    try {
      const body: Record<string, unknown> = {
        orderId: activeWorkspaceOrder.id,
        leg
      };
      const res = await fetchWithRetry('/api/payments/confirm-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success) {
        setActiveWorkspaceOrder(data.order);
        setWorkspacePaymentIntent(prev => prev ? { ...prev, splits: data.splits, isPaymentDoneInApp: data.fullyPaid ?? prev.isPaymentDoneInApp } : prev);
        fetchAllData();
        setWorkspaceStatusMsg({ text: data.message, type: 'success' });
      } else {
        setWorkspaceStatusMsg({ text: data.error || 'Payment confirmation failed.', type: 'error' });
      }
    } catch (err) {
      console.warn('Split confirmation error:', err);
      setWorkspaceStatusMsg({ text: 'Unable to confirm the payment. Please try again.', type: 'error' });
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // ✅ CITIZEN: "Maine yeh payment kar diya" — apne haathon se confirm karna.
  // Ye leg ko paid nahi karta; sirf operator ko batata hai ki paisa bhej diya gaya.
  const handleClientConfirmLeg = async (leg: 'govt' | 'operator' | 'admin') => {
    if (!activeWorkspaceOrder) return;
    setIsVerifyingPayment(true);
    try {
      const res = await fetchWithRetry('/api/payments/client-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeWorkspaceOrder.id,
          leg
        })
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success) {
        setActiveWorkspaceOrder(data.order);
        setWorkspacePaymentIntent(prev => prev ? { ...prev, splits: data.splits } : prev);
        setPaymentIntentRefreshKey(key => key + 1);
        fetchAllData();
        setWorkspaceStatusMsg({ text: data.message || 'Payment confirmed by you.', type: 'success' });
        if (soundAlertEnabled) playChime();
      } else {
        setWorkspaceStatusMsg({ text: data.error || 'Payment confirmation failed.', type: 'error' });
      }
    } catch (err) {
      console.warn('Client confirmation error:', err);
      setWorkspaceStatusMsg({ text: 'Unable to confirm the payment. Please try again.', type: 'error' });
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleCopyUpiId = async (upiId: string) => {
    const value = String(upiId || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        // ignore copy failure
      }
    }
    setCopiedUpiId(value);
    setTimeout(() => setCopiedUpiId(prev => (prev === value ? '' : prev)), 2000);
  };

  const handleSaveGovtDetails = async () => {
    if (!activeWorkspaceOrder) return;
    const upi = govtUpiInput.trim();
    const fee = govtFeeInput.trim();
    if (!upi && !govtQrImageInput && !fee) {
      setWorkspaceStatusMsg({ text: t('Enter the government fee, UPI ID or upload the QR image.', 'सरकारी शुल्क, UPI आईडी दर्ज करें या QR इमेज अपलोड करें।'), type: 'error' });
      return;
    }
    setIsSavingGovtDetails(true);
    try {
      const res = await fetchWithRetry('/api/payments/govt-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeWorkspaceOrder.id,
          upiId: upi,
          qrImage: govtQrImageInput || '',
          govtFee: fee
        })
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success) {
        setWorkspaceStatusMsg({ text: data.message || 'Government fee, UPI/QR saved successfully.', type: 'success' });
        showSaveToast('✅ Government details saved successfully!');
        if (data.order) {
          setActiveWorkspaceOrder(data.order);
          setGovtUpiInput(String(data.order.govtUpiId || ''));
          const savedFee = Number(data.order.govtFee);
          setGovtFeeInput(Number.isFinite(savedFee) ? String(savedFee) : '');
        }
        setGovtQrImageInput('');
        setPaymentIntentRefreshKey(key => key + 1);
        void fetchAllData();
      } else {
        setWorkspaceStatusMsg({ text: data.error || 'Could not save the government fee/UPI/QR.', type: 'error' });
      }
    } catch (err) {
      console.warn('Govt details save error:', err);
      setWorkspaceStatusMsg({ text: 'Unable to save the government fee/UPI/QR. Please try again.', type: 'error' });
    } finally {
      setIsSavingGovtDetails(false);
    }
  };

  // --- FORM FILLER EXPERT: CREATE & PUBLISH NEW FORM ---
  const handlePublishFillerForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFormDocName.trim()) {
      setFillerNotificationMsg('⚠️ Form Name (Form ka name) zaroori hai.');
      return;
    }
    if (!newFormPrice.trim()) {
      setFillerNotificationMsg('⚠️ Form Price (Fees) zaroori hai.');
      return;
    }

    // Expert name and state always come from the saved Expert Details profile,
    // so they never have to be typed again for each form.
    if (!fillerName.trim() || !fillerState.trim()) {
      setFillerNotificationMsg('⚠️ Pehle "Expert Details" save karo (naam, mobile, state, district, city). Uske baad form publish hoga.');
      setIsFillerDetailsModalOpen(true);
      return;
    }

    const expName = fillerName.trim() || 'Form Filler Expert';
    const formState = fillerState.trim();
    const reqs = newFormRequirements.trim() || 'Aadhaar Card, Passport Photo, Marksheets & Category Certificate';
    const wasEditing = Boolean(editingFillerServiceId);

    try {
      const res = await fetchWithRetry('/api/filler/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingFillerServiceId || undefined,
          docName: newFormDocName.trim(),
          price: newFormPrice.trim(),
          govtFee: newFillerFormGovtFee.trim(),
          govtFeeByCategory: newFillerFormGovtFeeByCategory,
          state: formState,
          expertName: expName,
          requirements: reqs,
          description: reqs,
          icon: newFormIcon || '📝'
        })
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success) {
        if (Array.isArray(data.services)) {
          setFillerServices(data.services);
        } else if (data.service) {
          setFillerServices(prev => [data.service, ...prev.filter(s => s.id !== data.service.id)]);
        }
        setFormSaveSuccessMsg(wasEditing
          ? `✅ फॉर्म "${newFormDocName.trim()}" सफलतापूर्वक अपडेट हुआ! नागरिक पोर्टल पर नई फीस लाइव है।`
          : `✅ फॉर्म "${newFormDocName.trim()}" सफलतापूर्वक प्रकाशित हुआ! नागरिक पोर्टल पर लाइव जोड़ दिया गया है।`);
        setFillerNotificationMsg(wasEditing
          ? `✅ Form "${newFormDocName.trim()}" updated in Citizen Dashboard!`
          : `✅ Form "${newFormDocName.trim()}" live in Citizen Dashboard!`);
        showSaveToast(wasEditing ? '✅ Form updated successfully!' : '✅ Form saved successfully!');
        if (soundAlertEnabled) playChime();
        setNewFormDocName('');
        setNewFormPrice('');
        setNewFormRequirements('');
        setNewFillerFormGovtFee('');
        setNewFillerFormGovtFeeByCategory({});
        setNewFillerFormState('');
        setNewFormIcon('');
        setNewFormExpertName('');
        setEditingFillerServiceId('');
        void fetchAllData();
        setTimeout(() => setFormSaveSuccessMsg(''), 6000);
      } else {
        setFillerNotificationMsg(data.error || 'Could not save the form. Please try again.');
      }
    } catch {
      const localItem = {
        id: editingFillerServiceId || 'ff-' + Date.now(),
        docName: newFormDocName.trim(),
        price: newFormPrice.trim(),
        govtFee: newFillerFormGovtFee.trim(),
        govtFeeByCategory: newFillerFormGovtFeeByCategory,
        state: formState,
        expertName: expName,
        requirements: reqs,
        icon: newFormIcon || '📝'
      };
      setFillerServices(prev => wasEditing
        ? prev.map(service => service.id === localItem.id ? { ...service, ...localItem } : service)
        : [localItem, ...prev]);
      setFormSaveSuccessMsg(wasEditing
        ? `✅ Form "${newFormDocName.trim()}" updated locally!`
        : `✅ Form "${newFormDocName.trim()}" saved! Citizen dashboard me live hai.`);
      showSaveToast(wasEditing ? '✅ Form updated successfully!' : '✅ Form saved successfully!');
      setNewFormDocName('');
      setNewFormPrice('');
      setNewFormRequirements('');
      setNewFillerFormGovtFee('');
      setNewFillerFormGovtFeeByCategory({});
      setNewFillerFormState('');
      setNewFormIcon('');
      setNewFormExpertName('');
      setEditingFillerServiceId('');
      setTimeout(() => setFormSaveSuccessMsg(''), 6000);
    }
  };

  const handleEditFillerForm = (service: any) => {
    setEditingFillerServiceId(String(service.id || ''));
    setNewFormDocName(String(service.docName || ''));
    setNewFormPrice(String(service.price ?? ''));
    setNewFillerFormGovtFee(String(service.govtFee ?? ''));
    setNewFillerFormGovtFeeByCategory(normalizeGovtFeeByCategory(service.govtFeeByCategory) || {});
    setNewFillerFormState(String(service.state || ''));
    setNewFormExpertName(String(service.expertName || ''));
    setNewFormRequirements(String(service.requirements || service.description || ''));
    setNewFormIcon(String(service.icon || '📝'));
    setFillerNotificationMsg(`✏️ Editing "${service.docName}" — change the government fee and save.`);
    setTimeout(() => document.getElementById('filler-form-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const cancelFillerFormEdit = () => {
    setEditingFillerServiceId('');
    setNewFormDocName('');
    setNewFormPrice('');
    setNewFillerFormGovtFee('');
    setNewFillerFormGovtFeeByCategory({});
    setNewFillerFormState('');
    setNewFormExpertName('');
    setNewFormRequirements('');
    setNewFormIcon('📝');
    setFillerNotificationMsg('');
  };

  const handleDeleteFillerForm = async (serviceId: string) => {
    if (deletingServiceId) return;
    if (editingFillerServiceId === serviceId) {
      cancelFillerFormEdit();
    }
    setDeletingServiceId(serviceId);
    try {
      const res = await fetch(`/api/filler/services/${serviceId}`, { method: 'DELETE' });
      const data = await parseJsonResponse(res);
      if (data.success && Array.isArray(data.services)) {
        setFillerServices(data.services);
      } else {
        setFillerServices(prev => prev.filter(s => s.id !== serviceId));
      }
      setFillerNotificationMsg('Form successfully removed.');
      showSaveToast('✅ Form removed successfully!');
      void fetchAllData();
    } catch {
      setFillerServices(prev => prev.filter(s => s.id !== serviceId));
    } finally {
      setDeletingServiceId(null);
    }
  };

  const handleSaveCredentials = async () => {
    if (!activeWorkspaceOrder) return;
    const appNumber = editAppNo.trim();
    const pass = editPassword.trim();
    if (!appNumber || !pass) {
      setWorkspaceStatusMsg({ text: t('Enter Application No and Password (max 80 chars each).', 'आवेदन संख्या और पासवर्ड दर्ज करें (अधिकतम 80 अक्षर)।'), type: 'error' });
      return;
    }
    if (appNumber.length > 80 || pass.length > 80) {
      setWorkspaceStatusMsg({ text: 'Application No/Password cannot exceed 80 characters.', type: 'error' });
      return;
    }
    setIsSavingCredentials(true);
    try {
      const res = await fetch(`/api/orders/${activeWorkspaceOrder.id}/credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appNumber, pass })
      });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success) {
        setActiveWorkspaceOrder(data.order);
        fetchAllData();
        setWorkspaceStatusMsg({ text: 'Credentials updated successfully.', type: 'success' });
        showSaveToast('✅ Credentials saved successfully!');
        setEditAppNo('');
        setEditPassword('');
        setEditingCredentials(false);
      } else {
        setWorkspaceStatusMsg({ text: data.error || 'Failed to update credentials.', type: 'error' });
      }
    } catch (err) {
      setWorkspaceStatusMsg({ text: 'Unable to update credentials. Please try again.', type: 'error' });
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const showClientActiveOrders = () => {
    setOrderStatusFilter('all');
    setClientPortalTab('orders');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('client-portal-top')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  };

  const refreshCitizenPageAfterSubmit = (notice: string, openOrderId?: string) => {
    try {
      sessionStorage.setItem('digiseva_pending_client_notice', notice);
      sessionStorage.setItem('digiseva_pending_save_toast', '✅ Request submitted successfully!');
      if (openOrderId) sessionStorage.setItem('digiseva_pending_open_order_id', openOrderId);
    } catch {}
    showSaveToast('✅ Request submitted successfully!');
    setTimeout(() => window.location.reload(), 900);
  };

  // Document pricing items ka `price` total hota hai (govt + service), jabki
  // order ke payment split me sirf service fee alag jaani chahiye.
  const resolveCatalogFees = (service?: { price?: string | number; govtFee?: string | number; cscFee?: string | number; govtFeeByCategory?: GovtFeeByCategory } | null) => {
    const govtFee = resolveCategoryGovtFee(service?.govtFeeByCategory, service?.govtFee, 'general');
    const totalPrice = Math.max(0, Number(service?.price) || 0);
    const explicitServiceFee = Number(service?.cscFee);
    const serviceFee = Number.isFinite(explicitServiceFee) && explicitServiceFee > 0
      ? explicitServiceFee
      : Math.max(0, totalPrice - govtFee);
    return { govtFee, serviceFee };
  };

  const [isSubmittingExamForm, setIsSubmittingExamForm] = useState(false);

  // Live backend restarts (Render free tier sleeps/restarts) can invalidate an
  // old login token. Instead of failing the form request with a vague error,
  // clear the stale session and take the user back to the OTP login screen.
  // (Account data is stored in MongoDB, so logging in again restores access.)
  const recoverFromStaleSession = () => {
    clearStoredSession();
    setIsClientLoggedIn(false);
    setActiveRole('none');
    setClientAuthError('⚠️ Aapka session expire ho gaya hai (server restart ke baad). Dobara Gmail OTP se login karein — login ke baad form request turant chali jayegi.');
    setClientOrderSuccessMsg('⚠️ Session expire ho gaya. Dobara login karke request bhejein — aapki details safe hain aur form bhara hua milega.');
    setStep('client_login');
  };

  // Persist the chosen reservation category so the next request pre-selects it.
  const rememberClientCategory = (category: GovtFeeCategoryKey) => {
    setExamApplicantCategory(category);
    try { localStorage.setItem('client_category', category); } catch {}
  };

  // Every citizen request passes through this confirm popup so the operator
  // always receives the applicant category, and the govt fee is calculated
  // from the selected category (Gen/OBC/SC/ST/EWS/Female/PwD).
  const openCategoryConfirm = (
    config: CategoryConfirmConfig,
    handler: (category: GovtFeeCategoryKey, govtFee: number) => Promise<void> | void
  ) => {
    categoryConfirmHandlerRef.current = handler;
    setCategoryConfirmValue(examApplicantCategory || 'general');
    setCategoryConfirm(config);
  };

  const handleCategoryConfirm = async () => {
    if (!categoryConfirm || isCategoryConfirmBusy) return;
    const handler = categoryConfirmHandlerRef.current;
    if (!handler) return;
    const category = categoryConfirmValue;
    const govtFee = resolveCategoryGovtFee(categoryConfirm.govtFeeByCategory, categoryConfirm.fallbackGovtFee, category);
    rememberClientCategory(category);
    setIsCategoryConfirmBusy(true);
    try {
      await handler(category, govtFee);
    } catch (error) {
      console.warn('Category confirm dispatch error:', error);
    } finally {
      setCategoryConfirm(null);
      setIsCategoryConfirmBusy(false);
    }
  };

  // Submit Online Exam & Admission Form Filling (Option 3: NEET, JEE, Sarkari Exams)
  const handleExamFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingExamForm) return;
    if (!examFormTitle.trim()) {
      setClientOrderSuccessMsg('⚠️ Please enter/select the form name.');
      return;
    }
    const session = readStoredSession();
    if (!session?.token || session.role !== 'client') {
      setClientOrderSuccessMsg('⚠️ Please log in as a Citizen (Gmail OTP) to send this request.');
      setStep('client_login');
      return;
    }

    const applicantName = (examApplicantName || clientName || '').trim();
    const applicantPhone = (examApplicantPhone || clientPhone || '').replace(/\D/g, '').slice(-10);
    const applicantEmail = (examApplicantEmail || clientEmail || '').trim();
    const missingApplicantDetails = collectMissingFields([
      { label: 'Applicant Name', ok: isNonEmpty(applicantName) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(applicantPhone) },
      { label: 'Gmail / Email', ok: isValidEmail(applicantEmail) }
    ]);
    if (missingApplicantDetails.length > 0) {
      setClientOrderSuccessMsg(requiredFieldsMessage(missingApplicantDetails));
      return;
    }

    const matchedService = allPublishedForms.find(s => s.docName === examFormTitle);
    const feeAmount = Number(matchedService?.price) || 150;
    const fallbackGovtFee = Number(matchedService?.govtFee) || 0;

    openCategoryConfirm(
      {
        title: 'Confirm Your Request',
        serviceName: examFormTitle,
        operatorName: matchedService?.expertName,
        govtFeeByCategory: matchedService?.govtFeeByCategory,
        fallbackGovtFee,
        serviceFee: feeAmount,
        submitLabel: 'Confirm & Send'
      },
      async (category, govtFee) => {
        setIsSubmittingExamForm(true);
        try {
          const fullDetails = [
            `Applicant Name: ${applicantName}`,
            `Mobile: ${applicantPhone}`,
            `Email: ${applicantEmail}`,
            `Reservation Category: ${categoryLabel(category)}`,
            `Exam/Form: ${examFormTitle}`,
            `Category/Stream: ${examFormCategory}`,
            examFormRoll ? `Roll/Registration: ${examFormRoll}` : '',
            examFormDesc ? `Details/Discription: ${examFormDesc}` : `Online application form request for ${examFormTitle}.`
          ].filter(Boolean).join('\n');

          const res = await fetchWithRetry('/api/bids/form-filling', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formTitle: examFormTitle,
              formDetails: fullDetails,
              formCategory: examFormCategory,
              formRoll: examFormRoll,
              clientName: applicantName,
              clientPhone: applicantPhone,
              clientEmail: applicantEmail,
              district: clientDistrictFilter || '',
              city: clientCityFilter || '',
              amountPaid: feeAmount,
              govtFee,
              applicantCategory: category,
              orderType: 'online_form_filling'
            })
          });
          const data = await parseJsonResponse(res);
          if (data.success) {
            fetchAllData();
            setExamFormDesc('');
            setExamFormRoll('');
            const successNotice = `✅ Successfully Submitted! "${examFormTitle}" request broadcasted to Jan Seva Kendras. Awaiting operator acceptance & live chat.`;
            setClientOrderSuccessMsg(successNotice);
            setWorkspaceStatusMsg({ text: '✅ Successfully Submitted! Awaiting Jan Seva Operator Acceptance.', type: 'success' });
            showClientActiveOrders();
            if (soundAlertEnabled) playChime();
            refreshCitizenPageAfterSubmit(successNotice);
          } else if (res.status === 401) {
            recoverFromStaleSession();
          } else {
            setClientOrderSuccessMsg(`⚠️ ${data.error || 'Request could not be sent. Please try again.'}`);
          }
        } catch (err) {
          console.warn('Exam form submit error:', err);
          setClientOrderSuccessMsg('❌ Unable to submit the request right now. Please check your connection and try again.');
        } finally {
          setIsSubmittingExamForm(false);
        }
      }
    );
  };

  // Submit Jan Seva Kendra Document Making (Option 4: PAN Card, Domicile, Income, Caste)
  const handleJanSevaDocSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingJanSevaDoc) return;
    if (!selectedJanSevaDoc.trim()) {
      setClientOrderSuccessMsg('⚠️ Please select or type the government document name first.');
      return;
    }
    const referenceValue = String(janSevaDocAadhaar || '').trim();
    const referenceDigits = referenceValue.replace(/\D/g, '');
    const mobileOverride = /^[6-9]\d{9}$/.test(referenceDigits) ? referenceDigits : '';
    const applicantName = (janSevaDocApplicantName || clientName || '').trim();
    const applicantPhone = mobileOverride || (clientPhone || '').replace(/\D/g, '').slice(-10);
    const applicantEmail = (janSevaDocEmail || clientEmail || '').trim();
    const missingApplicantDetails = collectMissingFields([
      { label: 'Applicant Name', ok: isNonEmpty(applicantName) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(applicantPhone) },
      { label: 'Gmail / Email', ok: isValidEmail(applicantEmail) }
    ]);
    if (missingApplicantDetails.length > 0) {
      setClientOrderSuccessMsg(requiredFieldsMessage(missingApplicantDetails));
      return;
    }

    const fallbackPrice = selectedJanSevaDoc.toLowerCase().includes('pan') ? 150 : (selectedJanSevaDoc.toLowerCase().includes('license') ? 250 : 100);
    const matchedCatalogService = customPricingList.find(item => item.docName === selectedJanSevaDoc);
    const { govtFee: fallbackGovtFee, serviceFee } = matchedCatalogService
      ? resolveCatalogFees(matchedCatalogService)
      : { govtFee: 0, serviceFee: fallbackPrice };

    openCategoryConfirm(
      {
        title: 'Confirm Document Request',
        serviceName: selectedJanSevaDoc,
        operatorName: matchedCatalogService?.operatorName,
        govtFeeByCategory: matchedCatalogService?.govtFeeByCategory,
        fallbackGovtFee,
        serviceFee: serviceFee || fallbackPrice,
        submitLabel: 'Confirm & Submit'
      },
      async (category, govtFee) => {
        setIsSubmittingJanSevaDoc(true);
        try {
          const fullDetails = [
            `Document: ${selectedJanSevaDoc}`,
            `Applicant Name: ${applicantName}`,
            `Reservation Category: ${categoryLabel(category)}`,
            referenceValue && referenceValue !== applicantPhone ? `Aadhaar / Reference: ${referenceValue}` : '',
            `Mobile: ${applicantPhone}`,
            `Email: ${applicantEmail}`,
            janSevaDocUrgent ? 'Priority: Urgent Fast-Track Service' : 'Priority: Regular Service',
            janSevaDocDetails ? `Special Notes: ${janSevaDocDetails}` : ''
          ].filter(Boolean).join('\n');

          const res = await fetchWithRetry('/api/vle/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serviceName: selectedJanSevaDoc,
              formDetails: fullDetails,
              orderType: 'vle_service',
              clientName: applicantName,
              clientPhone: applicantPhone,
              clientEmail: applicantEmail,
              district: clientDistrictFilter || '',
              city: clientCityFilter || '',
              amountPaid: serviceFee || fallbackPrice,
              govtFee,
              applicantCategory: category
            })
          });
          const data = await parseJsonResponse(res);
          if (data.success) {
            if (data.order) {
              setVleExclusiveOrders((orders: any[]) => [
                data.order,
                ...orders.filter(order => order.id !== data.order.id)
              ]);
            }
            fetchAllData();
            setJanSevaDocDetails('');
            const successNotice = `✅ Application Submitted Successfully! ${selectedJanSevaDoc} application received. Ye ab "All Orders / Active Ongoing Orders" page par dikh raha hai — Jan Seva operator accept karte hi chat khul jayegi.`;
            setClientOrderSuccessMsg(successNotice);
            setWorkspaceStatusMsg({ text: '✅ Application Submitted Successfully! Awaiting Jan Seva Operator Acceptance.', type: 'success' });
            if (soundAlertEnabled) playChime();
            setOrderStatusFilter('all');
            setClientPortalTab('orders');
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                document.getElementById('client-portal-top')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              });
            });
            refreshCitizenPageAfterSubmit(successNotice);
          } else if (res.status === 401) {
            recoverFromStaleSession();
          } else {
            setClientOrderSuccessMsg(`⚠️ ${data.error || 'Request could not be sent. Please check your district and try again.'}`);
          }
        } catch (err) {
          console.warn('Jan Seva doc submit error:', err);
          setClientOrderSuccessMsg('❌ Unable to submit the request right now. Please try again.');
        } finally {
          setIsSubmittingJanSevaDoc(false);
        }
      }
    );
  };

  // Dispatch direct order to specific operator (Rajesh / Anil) and instantly open communication panel
  const handleDirectApply = async (targetVle: any, serviceOverride?: any) => {
    if (directApplyVleId) return;
    const targetService = serviceOverride?.docName || searchQuery.trim() || 'Domicile / PAN Card Document';
    const applicantName = (clientName || '').trim();
    const applicantPhone = (clientPhone || '').replace(/\D/g, '').slice(-10);
    const applicantEmail = (clientEmail || '').trim();
    const missingApplicantDetails = collectMissingFields([
      { label: 'Full Name', ok: isNonEmpty(applicantName) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(applicantPhone) },
      { label: 'Gmail / Email', ok: isValidEmail(applicantEmail) }
    ]);
    if (missingApplicantDetails.length > 0) {
      setClientOrderSuccessMsg(requiredFieldsMessage(missingApplicantDetails));
      return;
    }
    const matchingService = serviceOverride || targetVle.pricingList?.find((p: any) =>
      targetService.toLowerCase().includes(p.docName.toLowerCase()) || p.docName.toLowerCase().includes(targetService.toLowerCase())
    );
    const { govtFee: fallbackGovtFee, serviceFee } = matchingService
      ? resolveCatalogFees(matchingService)
      : { govtFee: 0, serviceFee: 150 };
    const finalAmount = serviceFee || 150;

    openCategoryConfirm(
      {
        title: 'Confirm Request',
        serviceName: targetService,
        operatorName: targetVle.name,
        govtFeeByCategory: matchingService?.govtFeeByCategory,
        fallbackGovtFee,
        serviceFee: finalAmount,
        submitLabel: 'Confirm & Open Chat'
      },
      async (category, govtFee) => {
        setDirectApplyVleId(targetVle.id);
        try {
          const res = await fetchWithRetry('/api/vle/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serviceName: `${targetService} (Assigned to ${targetVle.name})`,
              formDetails: `Service: ${targetService}\nReservation Category: ${categoryLabel(category)}`,
              clientName: applicantName,
              clientPhone: applicantPhone,
              clientEmail: applicantEmail,
              district: clientDistrictFilter,
              city: clientCityFilter,
              amountPaid: finalAmount,
              govtFee,
              applicantCategory: category,
              targetOperatorId: targetVle.id,
              targetOperatorName: targetVle.name,
              targetOperatorPhone: targetVle.phone,
              targetOperatorEmail: targetVle.email
            })
          });
          const data = await parseJsonResponse(res);
          if (data.success) {
            await fetchAllData();
            const successNotice = `✅ Successfully Application Submitted! Direct request sent to ${targetVle.name}. Awaiting acceptance.`;
            setClientOrderSuccessMsg(successNotice);
            setWorkspaceStatusMsg({ text: '✅ Successfully Application Submitted! Awaiting acceptance.', type: 'success' });
            showClientActiveOrders();
            if (soundAlertEnabled) playChime();
            refreshCitizenPageAfterSubmit(successNotice);
          } else if (res.status === 401) {
            recoverFromStaleSession();
          } else {
            setClientOrderSuccessMsg(data.error || 'This operator is not available in your district.');
          }
        } catch (err) {
          console.warn('Direct order dispatch warning:', err);
          setClientOrderSuccessMsg('Unable to submit the request right now. Please try again.');
        } finally {
          setDirectApplyVleId(null);
        }
      }
    );
  };

  // Citizen taps "Apply with <operator>" on a Jan Seva service card.
  // Category confirm popup opens first, then the order is dispatched.
  const handleCatalogServiceApply = (item: any) => {
    const { govtFee: fallbackGovtFee, serviceFee } = resolveCatalogFees(item);
    openCategoryConfirm(
      {
        title: 'Confirm Service Request',
        serviceName: item.docName,
        operatorName: item.operatorName,
        govtFeeByCategory: item.govtFeeByCategory,
        fallbackGovtFee,
        serviceFee: serviceFee || 100,
        submitLabel: 'Confirm & Open Chat'
      },
      async (category, govtFee) => {
        try {
          const res = await fetchWithRetry('/api/vle/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serviceName: `${item.docName} - ${item.operatorName || 'Jan Seva Kendra'}`,
              formDetails: `Service: ${item.docName}\nReservation Category: ${categoryLabel(category)}`,
              serviceScope: item.scope || 'district',
              targetOperatorId: item.operatorId,
              targetOperatorName: item.operatorName,
              targetOperatorPhone: item.operatorPhone,
              targetOperatorEmail: item.operatorEmail,
              amountPaid: serviceFee || 100,
              govtFee,
              applicantCategory: category
            })
          });
          const data = await parseJsonResponse(res);
          if (data.success) {
            fetchAllData();
            setActiveWorkspaceOrder(data.order);
            const successNotice = `✅ Request for ${item.docName} dispatched to ${item.operatorName || 'Jan Seva Kendra'}! Workspace opened.`;
            setClientOrderSuccessMsg(successNotice);
            showClientActiveOrders();
            refreshCitizenPageAfterSubmit(successNotice, data.order?.id);
          } else {
            setClientOrderSuccessMsg(data.error || 'No Jan Seva operator is available for this service.');
          }
        } catch (err) {
          console.warn('Service dispatch error:', err);
          setClientOrderSuccessMsg('Unable to submit this request right now. Please try again.');
        }
      }
    );
  };

  // Save dynamic pricing configuration and navigate smoothly to Client Home Page Services
  const handleSavePricingConfig = async () => {
    setIsSavingPricing(true);
    try {
      let listToSave = [...customPricingList];
      if (newDocName.trim() && (newDocPrice.trim() || newDocGovtFee.trim() || newDocCscFee.trim())) {
        const gFee = newDocGovtFee.trim() || '0';
        const cFee = newDocCscFee.trim() || '0';
        const tot = newDocPrice.trim() || String((parseInt(gFee) || 0) + (parseInt(cFee) || 0));
        const pendingItem = {
          id: Date.now().toString(),
          docName: newDocName.trim(),
          govtFee: gFee,
          govtFeeByCategory: newDocGovtFeeByCategory,
          cscFee: cFee,
          price: tot,
          feeName: newDocFeeName.trim(),
          requirements: newDocRequirements.trim(),
          scope: newDocScope,
          state: newDocState
        };
        listToSave = [...listToSave, pendingItem];
        setCustomPricingList(listToSave);
        setNewDocName('');
        setNewDocGovtFee('');
        setNewDocGovtFeeByCategory({});
        setNewDocCscFee('');
        setNewDocPrice('');
        setNewDocFeeName('');
        setNewDocRequirements('');
        setNewDocState('');
      }

      // 1. Instantly save into localStorage for offline retention
      try {
        localStorage.setItem('fillup_custom_pricing', JSON.stringify(listToSave));
      } catch {}

      // 2. Save to this operator's own account only (server-side, per-account pricing)
      const res = await fetchWithRetry('/api/vle/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingList: listToSave, formFillingList: vleFormFillingList })
      });
      const data = await parseJsonResponse(res).catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Could not save pricing.');
      }

      // 3. Refresh backend state
      await fetchAllData();
      playChime();
      setPricingJustUpdated(true);
      setVleNotificationMsg(`✅ दस्तावेज़ शुल्क सफलतापूर्वक सहेज लिया गया है और ग्राहक पोर्टल पर लाइव अपडेट हो गया है!`);
      showSaveToast('✅ Pricing saved successfully!');
      // Stay on VLE dashboard safely without switching step to prevent black screen
    } catch (err) {
      console.warn('Error saving pricing:', err);
      setVleNotificationMsg('⚠️ शुल्क सहेजते समय त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const mobileWorkspaceBadges: Array<{
    key: 'proof' | 'payments' | 'pdf' | 'whatsapp';
    label: string;
    icon: typeof ImageIcon;
    status: 'idle' | 'action' | 'done';
  }> = [
    {
      key: 'proof',
      label: t('Photo Proof', 'फोटो प्रूफ'),
      icon: ImageIcon,
      status: !activeWorkspaceOrder?.previewPhotoProof
        ? 'idle'
        : activeWorkspaceOrder?.isProofApprovedByClient ? 'done' : 'action'
    },
    {
      key: 'payments',
      label: t('Payments', 'पेमेंट'),
      icon: CreditCard,
      status: (() => {
        const qrs = workspacePaymentIntent?.qrs || [];
        const confirmed = qrs.filter(qr => qr.status === 'confirmed').length;
        const unlocked = Boolean(activeWorkspaceOrder?.isProofApprovedByClient || activeRole !== 'client');
        if (activeWorkspaceOrder?.isPaymentDoneInApp || (qrs.length > 0 && confirmed === qrs.length)) return 'done';
        return unlocked ? 'action' : 'idle';
      })()
    },
    {
      key: 'pdf',
      label: t('Final PDF', 'फाइनल PDF'),
      icon: FileText,
      status: activeWorkspaceOrder?.completedFormPdfUrl ? 'done' : 'idle'
    },
    {
      key: 'whatsapp',
      label: t('WhatsApp', 'व्हाट्सएप'),
      icon: Smartphone,
      status: activeWorkspaceOrder?.credentialsDispatched
        ? 'done'
        : activeWorkspaceOrder?.isPaymentDoneInApp ? 'action' : 'idle'
    }
  ];

  const mobileBadgeDotClass = (status: 'idle' | 'action' | 'done') =>
    status === 'done'
      ? 'bg-emerald-400'
      : status === 'action'
        ? 'bg-amber-400 animate-pulse'
        : 'bg-slate-600';

  const handleWorkspaceCallButton = () => {
    if (callingState === 'idle') {
      void startVoiceCall(activeWorkspaceOrder || undefined);
    } else if (callingState === 'incoming') {
      void acceptVoiceCall();
    } else {
      endVoiceCall();
    }
  };

  // Tapping empty workspace space on mobile hides the top bar so the chat gets
  // the full height. Buttons, inputs and links are ignored so nothing is
  // tapped by accident.
  const handleWorkspaceBackgroundClick = (event: MouseEvent<HTMLDivElement>) => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, label, summary, [role="button"], [data-keep-workspace-header]')) return;
    setIsWorkspaceHeaderHidden(true);
  };

  // =====================================================================
  // 🔐 GOOGLE SIGN-IN (additional option — OTP flow is untouched)
  // =====================================================================
  // Google sirf Gmail verify karta hai. Login ke baaki saare compulsory
  // fields (name, mobile, state, district, city, CSC ID) waise hi required
  // hain. Backend Google token verify karke ek short-lived verification
  // grant deta hai, jise purane login/register endpoints consume karte hain.

  const applyClientLoginResult = (loginData: any) => {
    const savedUser = loginData.user || {};
    const resolvedName = String(savedUser.name || clientName || '').trim();
    const resolvedPhone = String(savedUser.phone || clientPhone || '').replace(/\D/g, '').slice(-10);
    const resolvedEmail = String(savedUser.email || clientEmail || '').trim().toLowerCase();
    const resolvedState = String(savedUser.state || clientState || '').trim();
    const rawDistrict = String(savedUser.district || clientDistrictFilter || '').trim();
    const resolvedDistrict = sameAsStateValue(rawDistrict, resolvedState) ? '' : rawDistrict;
    const rawCity = String(savedUser.city || clientCityFilter || '').trim();
    const resolvedCity = sameAsStateValue(rawCity, resolvedState) ? '' : rawCity;

    if (resolvedName) setClientName(resolvedName);
    if (resolvedPhone) setClientPhone(resolvedPhone);
    if (resolvedEmail) setClientEmail(resolvedEmail);
    if (resolvedState) setClientState(resolvedState);
    if (resolvedDistrict) setClientDistrictFilter(resolvedDistrict);
    if (resolvedCity) setClientCityFilter(resolvedCity);

    localStorage.setItem('client_name', resolvedName || clientName);
    localStorage.setItem('client_phone', resolvedPhone || clientPhone);
    localStorage.setItem('client_email', resolvedEmail || clientEmail);
    localStorage.setItem('client_state', resolvedState || clientState);
    if (resolvedDistrict) localStorage.setItem('client_district', resolvedDistrict);
    if (resolvedCity) localStorage.setItem('client_city', resolvedCity);
    writeStoredSession({
      role: 'client',
      name: resolvedName || clientName,
      phone: resolvedPhone || clientPhone,
      email: resolvedEmail || clientEmail,
      state: resolvedState || clientState,
      district: resolvedDistrict || clientDistrictFilter,
      city: resolvedCity || clientCityFilter,
      token: loginData.token,
      loggedInAt: Date.now()
    });
    setIsClientLoggedIn(true);
    setActiveRole('client');
    setPendingRole('client');
    setLegalAccepted(false);
    try { localStorage.removeItem(LEGAL_ACCEPTED_KEY); } catch {}
    setShowLegalModal(true);
  };

  const applyVleLoginResult = (loginData: any, refreshData = false) => {
    const savedAccount = loginData.user || {};
    const savedOperator = loginData.operator || loginData.vle || {};
    const resolvedName = String(savedAccount.name || savedOperator.name || vleName || '').trim();
    const resolvedCenter = String(savedAccount.centerName || savedOperator.centerName || vleCenterName || '').trim();
    const resolvedCsc = String(savedAccount.cscId || savedOperator.cscId || vleId || '').trim();
    const resolvedPhone = String(savedAccount.phone || savedOperator.phone || vlePhone || '').replace(/\D/g, '').slice(-10);
    const resolvedEmail = String(savedAccount.email || savedOperator.email || vleEmail || '').trim().toLowerCase();
    const accountState = String(savedAccount.state || savedOperator.state || vleState || '').trim();
    const rawAccountDistrict = String(savedAccount.district || savedOperator.district || vleDistrict || '').trim();
    const accountDistrict = sameAsStateValue(rawAccountDistrict, accountState) ? '' : rawAccountDistrict;
    const rawAccountCity = String(savedAccount.city || savedOperator.city || vleCity || '').trim();
    const accountCity = sameAsStateValue(rawAccountCity, accountState) ? '' : rawAccountCity;
    const accountPhoto = String(savedAccount.photoUrl || savedOperator.photoUrl || '').trim();
    const savedPricing = savedOperator.pricingList;

    if (resolvedName) setVleName(resolvedName);
    if (resolvedCenter) setVleCenterName(resolvedCenter);
    if (resolvedCsc) setVleId(resolvedCsc);
    if (resolvedPhone) setVlePhone(resolvedPhone);
    if (resolvedEmail) setVleEmail(resolvedEmail);
    if (accountState) setVleState(accountState);
    if (accountDistrict) setVleDistrict(accountDistrict);
    if (accountCity) setVleCity(accountCity);
    if (Array.isArray(savedPricing) && savedPricing.length > 0) setCustomPricingList(savedPricing);
    if (accountPhoto) setVlePhotoUrl(accountPhoto);

    localStorage.setItem('vle_operator_name', resolvedName || vleName);
    localStorage.setItem('vle_center_name', resolvedCenter || vleCenterName);
    localStorage.setItem('vle_csc_id', resolvedCsc || vleId);
    localStorage.setItem('vle_phone', resolvedPhone || vlePhone);
    localStorage.setItem('vle_email', resolvedEmail || vleEmail);
    if (accountState) localStorage.setItem('vle_state', accountState);
    if (accountDistrict) localStorage.setItem('vle_district', accountDistrict);
    if (accountCity) localStorage.setItem('vle_city', accountCity);
    if (accountPhoto) {
      try { localStorage.setItem('vle_photo_url', accountPhoto); } catch {}
    }
    writeStoredSession({
      role: 'vle',
      name: resolvedName || vleName,
      phone: resolvedPhone || vlePhone,
      email: resolvedEmail || vleEmail,
      state: accountState || vleState,
      district: accountDistrict || vleDistrict,
      city: accountCity || vleCity,
      cscId: resolvedCsc || vleId,
      token: loginData.token,
      loggedInAt: Date.now()
    });
    setIsVleLoggedIn(true);
    setActiveRole('vle');
    setPendingRole('vle');
    setLegalAccepted(false);
    try { localStorage.removeItem(LEGAL_ACCEPTED_KEY); } catch {}
    setShowLegalModal(true);
    if (refreshData) void fetchAllData();
  };

  const applyFillerLoginResult = (loginData: any) => {
    const savedUser = loginData.user || {};
    const resolvedName = String(savedUser.name || fillerName || '').trim();
    const resolvedPhone = String(savedUser.phone || fillerPhone || '').replace(/\D/g, '').slice(-10);
    const resolvedEmail = String(savedUser.email || fillerEmail || '').trim().toLowerCase();
    const accountState = String(savedUser.state || fillerState || '').trim();
    const rawAccountDistrict = String(savedUser.district || fillerDistrict || '').trim();
    const accountDistrict = sameAsStateValue(rawAccountDistrict, accountState) ? '' : rawAccountDistrict;
    const rawAccountCity = String(savedUser.city || fillerCity || '').trim();
    const accountCity = sameAsStateValue(rawAccountCity, accountState) ? '' : rawAccountCity;
    const accountPhoto = String(savedUser.photoUrl || '').trim();

    if (resolvedName) setFillerName(resolvedName);
    if (resolvedPhone) setFillerPhone(resolvedPhone);
    if (resolvedEmail) setFillerEmail(resolvedEmail);
    if (accountState) setFillerState(accountState);
    if (accountDistrict) setFillerDistrict(accountDistrict);
    if (accountCity) setFillerCity(accountCity);
    if (accountPhoto) setFillerPhotoUrl(accountPhoto);

    localStorage.setItem('filler_operator_name', resolvedName || fillerName);
    localStorage.setItem('filler_phone', resolvedPhone || fillerPhone);
    localStorage.setItem('filler_email', resolvedEmail || fillerEmail);
    if (accountState) localStorage.setItem('filler_state', accountState);
    if (accountDistrict) localStorage.setItem('filler_district', accountDistrict);
    if (accountCity) localStorage.setItem('filler_city', accountCity);
    if (accountPhoto) {
      try { localStorage.setItem('filler_photo_url', accountPhoto); } catch {}
    }
    writeStoredSession({
      role: 'form_filler',
      name: resolvedName || fillerName,
      phone: resolvedPhone || fillerPhone,
      email: resolvedEmail || fillerEmail,
      state: accountState || fillerState,
      district: accountDistrict || fillerDistrict,
      city: accountCity || fillerCity,
      token: loginData.token,
      loggedInAt: Date.now()
    });
    setIsFormFillerLoggedIn(true);
    setActiveRole('form_filler');
    setPendingRole('form_filler');
    setLegalAccepted(false);
    try { localStorage.removeItem(LEGAL_ACCEPTED_KEY); } catch {}
    setShowLegalModal(true);
    setFillerOtpSent(false);
    setFillerMobileOtpCode('');
  };

  // Google credential ko backend par verify karo → short-lived grant milta hai.
  const requestGoogleGrant = async (credential: string, target: string, role: 'client' | 'vle' | 'filler') => {
    const googleResponse = await fetchWithRetry('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, target, role })
    });
    const googleData = await parseJsonResponse(googleResponse);
    if (!googleResponse.ok || !googleData.success || !googleData.verificationToken) {
      throw new Error(googleData.error || 'Google verification failed. Please try again.');
    }
    const email = String(googleData.email || '').trim().toLowerCase();
    if (!email) {
      throw new Error('Google account did not return a verified email address.');
    }
    return { email, verificationToken: String(googleData.verificationToken) };
  };

  const handleClientGoogleCredential = async (credential: string) => {
    if (isClientAuthBusy) return;
    setClientAuthError('');
    const missing = collectMissingFields([
      { label: 'Full Name', ok: isNonEmpty(clientName) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(clientPhone) },
      { label: 'State / UT', ok: isNonEmpty(clientState) },
      { label: 'District', ok: isNonEmpty(clientDistrictFilter) },
      { label: 'City / Tehsil', ok: isNonEmpty(clientCityFilter) }
    ]);
    if (missing.length > 0) {
      setClientAuthError(requiredFieldsMessage(missing));
      return;
    }
    setIsClientAuthBusy(true);
    try {
      const { email, verificationToken } = await requestGoogleGrant(credential, clientPhone, 'client');
      setClientEmail(email);
      const loginResponse = await fetchWithRetry('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          phone: clientPhone,
          email,
          state: clientState,
          district: clientDistrictFilter,
          city: clientCityFilter,
          role: 'client',
          verificationToken
        })
      });
      const loginData = await parseJsonResponse(loginResponse);
      if (!loginResponse.ok || !loginData.success) {
        throw new Error(loginData.error || 'Login failed after Google verification. Please try again.');
      }
      applyClientLoginResult(loginData);
    } catch (error) {
      setClientAuthError(error instanceof Error ? error.message : 'Google login failed. Please try again.');
    } finally {
      setIsClientAuthBusy(false);
    }
  };

  const handleVleGoogleCredential = async (credential: string) => {
    if (isVleAuthBusy) return;
    setVleAuthError('');
    const missing = collectMissingFields([
      { label: 'CSC / Operator ID', ok: isNonEmpty(vleId) },
      { label: 'Operator Name', ok: isNonEmpty(vleName) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(vlePhone) }
    ]);
    if (missing.length > 0) {
      setVleAuthError(requiredFieldsMessage(missing));
      return;
    }
    setIsVleAuthBusy(true);
    try {
      const { email, verificationToken } = await requestGoogleGrant(credential, vlePhone, 'vle');
      setVleEmail(email);
      const loginResponse = await fetchWithRetry('/api/vle/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cscId: vleId,
          name: vleName,
          phone: vlePhone,
          email,
          state: vleState,
          district: vleDistrict,
          city: vleCity,
          verificationToken
        })
      });
      const loginData = await parseJsonResponse(loginResponse);
      if (!loginResponse.ok || !loginData.success) {
        throw new Error(loginData.error || 'Operator login failed. Please try again.');
      }
      applyVleLoginResult(loginData);
    } catch (error) {
      setVleAuthError(error instanceof Error ? error.message : 'Google login failed. Please try again.');
    } finally {
      setIsVleAuthBusy(false);
    }
  };

  const handleVleRegisterGoogleCredential = async (credential: string) => {
    if (verifyingGovt) return;
    setVleAuthError('');
    const missing = collectMissingFields([
      { label: 'Operator Name', ok: isNonEmpty(vleName) },
      { label: 'Jan Seva Kendra / Center Name', ok: isNonEmpty(vleCenterName) },
      { label: 'CSC / Operator ID', ok: isNonEmpty(vleId) },
      { label: 'State / UT', ok: isNonEmpty(vleState) },
      { label: 'District', ok: isNonEmpty(vleDistrict) },
      { label: 'City / Tehsil', ok: isNonEmpty(vleCity) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(vlePhone) }
    ]);
    if (missing.length > 0) {
      setVleAuthError(requiredFieldsMessage(missing));
      return;
    }
    setVerifyingGovt(true);
    try {
      const { email, verificationToken } = await requestGoogleGrant(credential, vlePhone, 'vle');
      setVleEmail(email);
      const registerResponse = await fetchWithRetry('/api/vle/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vleName,
          centerName: vleCenterName,
          cscId: vleId,
          phone: vlePhone,
          email,
          state: vleState,
          district: vleDistrict,
          city: vleCity,
          verificationToken
        })
      });
      const registerData = await parseJsonResponse(registerResponse);
      if (!registerResponse.ok || !registerData.success) {
        throw new Error(registerData.error || 'Could not register this operator with Google.');
      }
      applyVleLoginResult(registerData, true);
    } catch (error) {
      setVleAuthError(error instanceof Error ? error.message : 'Google registration failed. Please try again.');
    } finally {
      setVerifyingGovt(false);
    }
  };

  const handleFillerGoogleCredential = async (credential: string) => {
    if (isFillerAuthBusy) return;
    setFillerAuthError('');
    setFillerAuthNotice('');
    const missing = collectMissingFields([
      { label: 'Expert Name', ok: isNonEmpty(fillerName) },
      { label: '10-Digit Mobile Number', ok: isValidMobile(fillerPhone) },
      ...(isFillerRegistering ? [
        { label: 'State / UT', ok: isNonEmpty(fillerState) },
        { label: 'District', ok: isNonEmpty(fillerDistrict) },
        { label: 'City / Tehsil', ok: isNonEmpty(fillerCity) }
      ] : [])
    ]);
    if (missing.length > 0) {
      setFillerAuthError(requiredFieldsMessage(missing));
      return;
    }
    setIsFillerAuthBusy(true);
    try {
      const { email, verificationToken } = await requestGoogleGrant(credential, fillerPhone, 'filler');
      setFillerEmail(email);
      const endpoint = isFillerRegistering ? '/api/filler/register' : '/api/filler/login';
      const loginResponse = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fillerName,
          phone: fillerPhone,
          email,
          state: fillerState,
          district: fillerDistrict,
          city: fillerCity,
          verificationToken
        })
      });
      const loginData = await parseJsonResponse(loginResponse);
      if (!loginResponse.ok || !loginData.success) {
        throw new Error(loginData.error || 'Form Filler login failed. Please try again.');
      }
      if (isFillerRegistering) setFillerAuthNotice('');
      applyFillerLoginResult(loginData);
    } catch (error) {
      setFillerAuthError(error instanceof Error ? error.message : 'Google login failed. Please try again.');
    } finally {
      setIsFillerAuthBusy(false);
    }
  };

  // Live platform stats: show the real number only once loaded.
  const statValue = (value: number) => {
    if (platformStatsState === 'ready') return value;
    if (platformStatsState === 'unavailable') {
      return (
        <span
          className="text-slate-400"
          title="Live stats could not be loaded right now. They refresh automatically."
        >
          —
        </span>
      );
    }
    return (
      <span
        className="inline-block h-7 w-12 rounded-lg bg-white/10 animate-pulse align-middle"
        aria-label="Loading live stats"
      />
    );
  };

  return (
    <LocalizedTree language={lang}>
    <div className={`min-h-screen flex flex-col font-['Inter',sans-serif] w-full max-w-full box-border transition-colors duration-200 ${
      theme === 'light' 
        ? 'theme-light bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white' 
        : 'bg-[#07090E] text-slate-100 selection:bg-white selection:text-black'
    }`}>

      {saveToast && (
        <div className={`fixed top-4 left-1/2 z-[300] -translate-x-1/2 flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${
          saveToast.type === 'success'
            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 backdrop-blur-xl'
            : 'border-rose-500/40 bg-rose-500/15 text-rose-200 backdrop-blur-xl'
        }`} role="status" aria-live="polite">
          {saveToast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{saveToast.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER                                                                */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#07090E]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 min-h-12 sm:h-20 py-1.5 sm:py-0 flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2">
          
          <div className="shrink-0">
            <BrandEmblem3D
              size="sm"
              layout="row"
              onClick={() => {
                if (activeRole === 'none') setStep('landing');
                else if (activeRole === 'client') setStep('client_portal');
                else if (activeRole === 'vle') setStep('vle_home');
                else if (activeRole === 'form_filler') setStep('form_filler_app');
              }}
            />
          </div>

          <div className="flex flex-nowrap items-center gap-1 sm:gap-3 justify-end min-w-0 shrink-0">
            {/* Language Switcher (EN / HI) */}
            <button
              onClick={toggleLang}
              aria-label={lang === 'EN' ? 'Switch to Hindi' : 'Switch to English'}
              className={`p-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-sm border shrink-0 whitespace-nowrap ${
                lang === 'HI'
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-zinc-300 hover:text-white border-white/10 ring-1 ring-white/10'
              }`}
              title={lang === 'EN' ? 'हिंदी में बदलें' : 'Switch to English'}
            >
              <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
              <span aria-hidden="true" className="inline text-[10px] sm:text-xs">{lang === 'EN' ? 'हिंदी' : 'English'}</span>
              <span className="sr-only">{lang === 'EN' ? 'Switch to Hindi' : 'Switch to English'}</span>
            </button>

            {/* Theme Toggle Button (Light / Dark Mode) */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`p-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-sm border shrink-0 whitespace-nowrap ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 ring-2 ring-indigo-500/10'
                  : 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30 ring-1 ring-amber-400/20'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode (White Theme)' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="sr-only">Switch to dark mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="sr-only">Switch to light mode</span>
                </>
              )}
            </button>            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className={`p-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-sm border shrink-0 whitespace-nowrap active:scale-95 ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 ring-2 ring-indigo-500/10'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-zinc-300 hover:text-white border-white/10 ring-1 ring-white/10'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="sr-only">Exit fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="sr-only">Enter fullscreen</span>
                </>
              )}
            </button>
            {/* Header Login buttons removed for clean aesthetic */}

            {activeRole === 'client' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="p-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer shadow-md"
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="sr-only">Logout</span>
                </button>
              </div>
            )}

            {activeRole === 'vle' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleLogout}
                  aria-label="Operator logout"
                  className="p-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer shadow-md"
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="sr-only">Operator logout</span>
                </button>
              </div>
            )}

            {activeRole === 'form_filler' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="p-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer shadow-md"
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="sr-only">Logout</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. CLEAN LANDING HUB                                                      */}
      {/* ========================================================================= */}
      {step === 'landing' && activeRole === 'none' && (
        <main className="flex-1 w-full min-w-0 max-w-6xl mx-auto box-border px-3 sm:px-4 py-8 sm:py-20 text-center space-y-10 sm:space-y-16">
          {/* ========================================================================= */}
          {/* ULTRA-PREMIUM 3D HERO SHOWCASE (CUTTING-EDGE 3D UI/UX)                    */}
          {/* ========================================================================= */}
          <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-cyan-400/80 via-blue-500/40 to-indigo-600/70 hover:from-cyan-300 hover:via-sky-400 hover:to-indigo-500 shadow-[0_25px_60px_-15px_rgba(6,182,212,0.25),0_15px_30px_-10px_rgba(2,6,23,0.8)] max-w-4xl mx-auto transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_35px_80px_-15px_rgba(6,182,212,0.35)] group w-full box-border overflow-visible">
            
            {/* Top 3D Specular Highlight Edge */}
            <div className="absolute top-0 left-12 right-12 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />
            
            <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-4 sm:p-10 md:p-14 relative overflow-hidden space-y-5 sm:space-y-8 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-2px_6px_rgba(0,0,0,0.8)]">
              
              {/* Ambient 3D background aura glows */}
              <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

              {/* 3D Isometric Cyber Grid Pattern in Background */}
              <div 
                className="absolute inset-0 opacity-[0.035] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34,211,238,0.9) 1px, transparent 0)`,
                  backgroundSize: '24px 24px'
                }}
              />



              {/* Centerpiece 3D Computer Workstation Stage */}
              <div className="flex flex-col items-center justify-center gap-5 relative z-10">
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1.5 transition-all duration-500">
                  {/* Outer Multi-layered 3D Volumetric Halo */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/40 via-blue-500/30 to-indigo-600/40 rounded-full blur-2xl pointer-events-none group-hover:blur-3xl transition-all" />
                  
                  {/* Multi-layered 3D Glass Emblem Frame */}
                  <div className="relative w-full h-full rounded-3xl p-[1.5px] bg-gradient-to-b from-cyan-300 via-blue-500 to-indigo-600 shadow-[0_10px_30px_rgba(6,182,212,0.4),0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-[#070D18]/95 backdrop-blur-xl rounded-[22px] flex items-center justify-center p-2.5 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.8)]">
                      
                      {/* High-Fidelity 3D Computer / Laptop SVG with Holographic Beam */}
                      <svg viewBox="0 0 72 72" className="w-full h-full drop-shadow-[0_4px_20px_rgba(6,182,212,0.85)]">
                        <defs>
                          <linearGradient id="heroHoloBeam" x1="50%" y1="100%" x2="50%" y2="0%">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="heroLid3D" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="40%" stopColor="#1e3a8a" />
                            <stop offset="100%" stopColor="#0a0f1d" />
                          </linearGradient>
                          <linearGradient id="heroScreenGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="45%" stopColor="#0284c7" />
                            <stop offset="100%" stopColor="#031530" />
                          </linearGradient>
                          <linearGradient id="heroDeckTop" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#334155" />
                            <stop offset="50%" stopColor="#1e293b" />
                            <stop offset="100%" stopColor="#0f172a" />
                          </linearGradient>
                          <linearGradient id="heroChassisFront" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1e293b" />
                            <stop offset="100%" stopColor="#020617" />
                          </linearGradient>
                          <linearGradient id="heroRing3D" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="50%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#38bdf8" />
                          </linearGradient>
                          <linearGradient id="heroPlatform" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0f2b48" />
                            <stop offset="100%" stopColor="#030712" />
                          </linearGradient>
                        </defs>

                        {/* 3D Holographic Base Pedestal */}
                        <ellipse cx="36" cy="62" rx="30" ry="6" fill="#000000" opacity="0.65" filter="blur(2px)" />
                        <ellipse cx="36" cy="60" rx="27" ry="5.5" fill="url(#heroPlatform)" stroke="#0284c7" strokeWidth="0.8" opacity="0.8" />
                        <ellipse cx="36" cy="60" rx="23" ry="4.5" fill="none" stroke="#22d3ee" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.75" />

                        {/* 3D Holographic Vertical Projection Cone */}
                        <polygon points="20,40 52,40 60,10 12,10" fill="url(#heroHoloBeam)" />

                        {/* Floating 3D Orbital Cyberspace Rings */}
                        <ellipse cx="36" cy="38" rx="32" ry="14" fill="none" stroke="url(#heroRing3D)" strokeWidth="1.4" strokeDasharray="4 2" transform="rotate(-15 36 38)" />
                        <ellipse cx="36" cy="38" rx="24" ry="9" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.5" transform="rotate(18 36 38)" />

                        {/* 3D Laptop Base: Bottom Chassis & Bevel */}
                        <polygon points="18,40 54,40 63,55 9,55" fill="url(#heroDeckTop)" />
                        {/* Front Lip Thickness & Depth */}
                        <polygon points="9,55 63,55 63,59 9,59" fill="url(#heroChassisFront)" />
                        {/* Chamfer Specular Edge Highlight */}
                        <line x1="9" y1="55" x2="63" y2="55" stroke="#38bdf8" strokeWidth="1" opacity="0.9" />
                        {/* Front Neon Glowing Status Light Bar */}
                        <line x1="28" y1="57" x2="44" y2="57" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" filter="drop-shadow(0 0 4px #06b6d4)" />

                        {/* Backlit Keyboard Matrix Deck */}
                        <polygon points="20,42 52,42 57,51 15,51" fill="#051326" stroke="#0284c7" strokeWidth="0.7" />
                        <line x1="19" y1="44.5" x2="53" y2="44.5" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2.5 1" opacity="0.85" />
                        <line x1="18" y1="47.5" x2="54" y2="47.5" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2.5 1" opacity="0.85" />
                        <line x1="17" y1="49.5" x2="55" y2="49.5" stroke="#67e8f9" strokeWidth="0.9" strokeDasharray="3 1" opacity="0.9" />
                        
                        {/* Glass Trackpad */}
                        <polygon points="30,52 42,52 43,54.5 29,54.5" fill="#0a192f" stroke="#38bdf8" strokeWidth="0.7" opacity="0.95" />

                        {/* 3D Laptop Display Screen with Perspective Tilt */}
                        {/* Screen Rear Backplate */}
                        <polygon points="19,12 53,12 54,40 18,40" fill="url(#heroLid3D)" />
                        <polygon points="18,12 19,12 18,40 17,40" fill="#0284c7" opacity="0.8" />
                        {/* Screen Bezel */}
                        <polygon points="20,14 52,14 53,39 19,39" fill="#020617" />
                        {/* Glowing Glass Display Panel */}
                        <polygon points="22,16 50,16 51,37 21,37" fill="url(#heroScreenGlass)" />
                        {/* Specular Diagonal Reflection Streak */}
                        <polygon points="22,16 36,16 25,37 21,37" fill="#ffffff" opacity="0.32" />

                        {/* Holographic Screen UI Elements */}
                        <circle cx="36" cy="24" r="5" fill="none" stroke="#a5f3fc" strokeWidth="1.2" filter="drop-shadow(0 0 4px #38bdf8)" />
                        <path d="M34 24 L35.5 25.5 L38.5 22.5" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
                        {/* Data Telemetry Lines */}
                        <line x1="25" y1="32" x2="38" y2="32" stroke="#67e8f9" strokeWidth="1" opacity="0.85" />
                        <line x1="25" y1="34.5" x2="33" y2="34.5" stroke="#38bdf8" strokeWidth="0.8" opacity="0.85" />
                        <circle cx="47" cy="32" r="1.6" fill="#38bdf8" filter="drop-shadow(0 0 3px #0284c7)" />

                        {/* Floating 3D Holographic Diamond Shield Above Display */}
                        <polygon points="36,4 41,8 36,12 31,8" fill="#06b6d4" opacity="0.8" filter="drop-shadow(0 0 6px #22d3ee)" />
                        <line x1="36" y1="4" x2="36" y2="12" stroke="#ffffff" strokeWidth="0.7" />

                        {/* 3D Spark Vertices / Floating Nodes */}
                        <circle cx="10" cy="28" r="1.6" fill="#a5f3fc" filter="drop-shadow(0 0 4px #06b6d4)" />
                        <circle cx="62" cy="48" r="1.6" fill="#38bdf8" filter="drop-shadow(0 0 4px #3b82f6)" />
                        <circle cx="61" cy="22" r="1.4" fill="#c084fc" filter="drop-shadow(0 0 4px #a855f7)" />
                        <circle cx="12" cy="52" r="1.2" fill="#38bdf8" filter="drop-shadow(0 0 3px #38bdf8)" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Wordmark: Large F + ILLUP with 3D FIRM Showcase & High-Fidelity Horizon */}
                <div className="flex flex-col items-center justify-center">
                  <div className="font-black tracking-normal text-white font-['Poppins'] flex items-baseline leading-none">
                    <span className="text-4xl sm:text-6xl font-serif italic font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 drop-shadow-[0_0_16px_rgba(6,182,212,0.6)] pr-1 leading-none select-none">
                      F
                    </span>
                    <span className="text-2xl sm:text-3xl font-black tracking-[0.22em] text-white self-center pb-1 font-['Poppins',sans-serif]">
                      ILLUP
                    </span>
                  </div>

                  {/* Signature ECG / Heartbeat Document Form Line */}
                  <div className="w-full flex items-center justify-center my-1 pointer-events-none">
                    <HeartbeatToFormLine size="lg" />
                  </div>
                </div>
              </div>

              {/* Main Headline with 3D Embossed Style */}
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 font-['Inter',sans-serif] tracking-tight leading-tight relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {t("India's Premier Digital Citizen Services Platform", "भारत का प्रमुख डिजिटल जन सेवा एवं नागरिक सेवा मंच")}
              </h2>
              
              {/* Description */}
              <p className="text-zinc-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-normal relative z-10">
                {t(
                  "Connect directly with Jan Seva Kendra operators. Apply for PAN, Notary, Domicile, and certificates, with direct operator UPI details after proof approval.",
                  "जन सेवा केंद्र ऑपरेटरों से सीधे जुड़ें। पैन कार्ड, नोटरी शपथ पत्र, निवास प्रमाण पत्र और अन्य सेवाओं के लिए आवेदन करें; काम की पुष्टि के बाद ऑपरेटर की UPI जानकारी देखें।"
                )}
              </p>
            </div>
          </div>

          {/* 4 Cards Grid - Hyper-realistic 3D Isometric / Tactile Cards (Header removed as requested) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10 text-left my-8">
            
            {/* Card 1: Active Users */}
            <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-b from-cyan-300/50 via-cyan-500/20 to-black/80 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.9),0_4px_12px_rgba(6,182,212,0.2)] hover:shadow-[0_22px_40px_-6px_rgba(6,182,212,0.35),0_8px_16px_rgba(0,0,0,0.8)] transition-all duration-300 group hover:-translate-y-1.5 border-b-[3px] border-b-cyan-950/80">
              <div className="bg-gradient-to-b from-[#111927] to-[#080d14] rounded-2xl p-5 space-y-3 relative overflow-hidden h-full flex flex-col justify-between border-t border-t-white/20">
                {/* Top Ambient Sheen */}
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-cyan-400/10 via-transparent to-transparent pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 relative shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(6,182,212,0.65)]">
                      <defs>
                        <radialGradient id="stat3dUserGrad" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#a5f3fc" />
                          <stop offset="35%" stopColor="#06b6d4" />
                          <stop offset="75%" stopColor="#1d4ed8" />
                          <stop offset="100%" stopColor="#020617" />
                        </radialGradient>
                        <linearGradient id="stat3dUserRings" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="50%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                        <linearGradient id="stat3dPlane1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                      <polygon points="50,78 86,64 50,52 14,64" fill="url(#stat3dPlane1)" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
                      <polygon points="50,84 86,70 86,64 50,78 14,64 14,70" fill="#0c4a6e" opacity="0.8" />
                      <ellipse cx="50" cy="46" rx="44" ry="18" fill="none" stroke="url(#stat3dUserRings)" strokeWidth="1.6" strokeDasharray="3 2" transform="rotate(-20 50 46)" />
                      <ellipse cx="50" cy="46" rx="42" ry="16" fill="none" stroke="url(#stat3dUserRings)" strokeWidth="1.4" transform="rotate(35 50 46)" />
                      <polygon points="50,16 78,28 78,56 50,70 22,56 22,28" fill="url(#stat3dUserGrad)" filter="drop-shadow(0 0 10px rgba(6,182,212,0.7))" />
                      <polygon points="50,20 72,30 72,52 50,64 28,52 28,30" fill="#082f49" opacity="0.6" />
                      <path d="M50 22 L70 31 L50 44 L30 31 Z" fill="#ffffff" opacity="0.35" />
                      <circle cx="50" cy="38" r="6.5" fill="#ffffff" filter="drop-shadow(0 0 6px #38bdf8)" />
                      <path d="M40 54 C40 47, 60 47, 60 54 Z" fill="#ffffff" opacity="0.95" />
                      <circle cx="70" cy="30" r="3" fill="#67e8f9" filter="drop-shadow(0 0 4px #22d3ee)" />
                      <circle cx="30" cy="62" r="2.5" fill="#38bdf8" />
                      <circle cx="68" cy="58" r="2" fill="#818cf8" />
                    </svg>
                  </div>


                </div>

                <div className="relative z-10">
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-50 to-slate-400 tracking-tight font-['Poppins'] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] group-hover:from-white group-hover:to-cyan-200 transition-colors">
                    {statValue(platformStats.activeUsers)}
                  </div>
                  <p className="text-xs font-bold text-slate-200 mt-1 drop-shadow-sm">
                    {t('Active Citizens & Users', 'सक्रिय नागरिक एवं उपभोक्ता')}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {t('Applying online from home', 'घर बैठे ऑनलाइन आवेदन')}
                  </p>
                </div>


              </div>
            </div>

            {/* Card 2: Successfully Submitted Forms */}
            <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-b from-emerald-300/50 via-emerald-500/20 to-black/80 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.9),0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_22px_40px_-6px_rgba(16,185,129,0.35),0_8px_16px_rgba(0,0,0,0.8)] transition-all duration-300 group hover:-translate-y-1.5 border-b-[3px] border-b-emerald-950/80">
              <div className="bg-gradient-to-b from-[#111927] to-[#080d14] rounded-2xl p-5 space-y-3 relative overflow-hidden h-full flex flex-col justify-between border-t border-t-white/20">
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-emerald-400/10 via-transparent to-transparent pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 relative shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(16,185,129,0.65)]">
                      <defs>
                        <radialGradient id="stat3dDocGrad" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#a7f3d0" />
                          <stop offset="35%" stopColor="#10b981" />
                          <stop offset="75%" stopColor="#047857" />
                          <stop offset="100%" stopColor="#022c22" />
                        </radialGradient>
                        <linearGradient id="stat3dDocRings" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="50%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                        <linearGradient id="stat3dPlane2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#064e3b" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                      <polygon points="50,78 86,64 50,52 14,64" fill="url(#stat3dPlane2)" stroke="#34d399" strokeWidth="1" opacity="0.6" />
                      <polygon points="50,84 86,70 86,64 50,78 14,64 14,70" fill="#064e3b" opacity="0.8" />
                      <ellipse cx="50" cy="46" rx="44" ry="18" fill="none" stroke="url(#stat3dDocRings)" strokeWidth="1.6" strokeDasharray="3 2" transform="rotate(-20 50 46)" />
                      <ellipse cx="50" cy="46" rx="42" ry="16" fill="none" stroke="url(#stat3dDocRings)" strokeWidth="1.4" transform="rotate(35 50 46)" />
                      <polygon points="50,14 78,28 50,44 22,28" fill="url(#stat3dDocGrad)" filter="drop-shadow(0 0 10px rgba(16,185,129,0.7))" />
                      <polygon points="22,28 50,44 50,68 22,52" fill="#065f46" />
                      <polygon points="78,28 50,44 50,68 78,52" fill="#044e39" />
                      <polygon points="50,18 72,29 50,40 28,29" fill="#ffffff" opacity="0.35" />
                      <circle cx="50" cy="44" r="9" fill="#ecfdf5" filter="drop-shadow(0 0 8px rgba(52,211,153,0.9))" />
                      <path d="M46 44 L49 47 L55 41" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="72" cy="32" r="3" fill="#6ee7b7" filter="drop-shadow(0 0 4px #10b981)" />
                      <circle cx="28" cy="62" r="2.5" fill="#34d399" />
                      <circle cx="70" cy="58" r="2" fill="#a7f3d0" />
                    </svg>
                  </div>


                </div>

                <div className="relative z-10">
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-50 to-slate-400 tracking-tight font-['Poppins'] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] group-hover:from-white group-hover:to-emerald-200 transition-colors">
                    {statValue(platformStats.totalTrustedFormsFilled)}
                  </div>
                  <p className="text-xs font-bold text-slate-200 mt-1 drop-shadow-sm">
                    {t('Successfully Submitted Forms', 'सफलतापूर्वक पूर्ण सेवाएं')}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {t('Govt receipts generated', 'सरकारी रसीद व प्रमाण पत्र जारी')}
                  </p>
                </div>


              </div>
            </div>

            {/* Card 3: Active Jan Seva Kendras */}
            <div 
              onClick={() => {
                setStep('client_portal');
                setClientPortalTab('jan_seva_docs');
                if (soundAlertEnabled) playChime();
                setTimeout(() => {
                  document.getElementById('client-portal-top')?.scrollIntoView({ behavior: 'smooth' });
                }, 80);
              }}
              className="relative p-[1.5px] rounded-2xl bg-gradient-to-b from-amber-300/50 via-amber-500/20 to-black/80 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.9),0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_22px_40px_-6px_rgba(245,158,11,0.35),0_8px_16px_rgba(0,0,0,0.8)] transition-all duration-300 group hover:-translate-y-1.5 border-b-[3px] border-b-amber-950/80 cursor-pointer"
            >
              <div className="bg-gradient-to-b from-[#111927] to-[#080d14] rounded-2xl p-5 space-y-3 relative overflow-hidden h-full flex flex-col justify-between border-t border-t-white/20">
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-amber-400/10 via-transparent to-transparent pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 relative shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(245,158,11,0.65)]">
                      <defs>
                        <radialGradient id="stat3dKioskGrad" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#fef3c7" />
                          <stop offset="35%" stopColor="#fbbf24" />
                          <stop offset="75%" stopColor="#d97706" />
                          <stop offset="100%" stopColor="#451a03" />
                        </radialGradient>
                        <linearGradient id="stat3dKioskRings" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fde68a" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                        <linearGradient id="stat3dPlane3" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#78350f" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                      <polygon points="50,80 86,65 50,53 14,65" fill="url(#stat3dPlane3)" stroke="#fbbf24" strokeWidth="1" opacity="0.6" />
                      <polygon points="50,86 86,71 86,65 50,80 14,65 14,71" fill="#78350f" opacity="0.8" />
                      <ellipse cx="50" cy="46" rx="44" ry="18" fill="none" stroke="url(#stat3dKioskRings)" strokeWidth="1.6" strokeDasharray="3 2" transform="rotate(-22 50 46)" />
                      <ellipse cx="50" cy="46" rx="42" ry="16" fill="none" stroke="url(#stat3dKioskRings)" strokeWidth="1.4" transform="rotate(35 50 46)" />
                      <polygon points="50,14 80,30 50,48 20,30" fill="url(#stat3dKioskGrad)" filter="drop-shadow(0 0 10px rgba(245,158,11,0.7))" />
                      <polygon points="20,30 50,48 50,68 20,50" fill="#92400e" />
                      <polygon points="80,30 50,48 50,68 80,50" fill="#78350f" />
                      <polygon points="50,18 72,30 50,42 28,30" fill="#ffffff" opacity="0.35" />
                      <circle cx="50" cy="34" r="7" fill="#fef3c7" filter="drop-shadow(0 0 8px rgba(254,243,199,0.9))" />
                      <rect x="47" y="31" width="6" height="6" rx="1.5" fill="#b45309" />
                      <circle cx="50" cy="8" r="4.5" fill="#fde68a" filter="drop-shadow(0 0 6px #f59e0b)" />
                      <line x1="50" y1="8" x2="50" y2="14" stroke="#fcd34d" strokeWidth="2" />
                      <circle cx="76" cy="60" r="2.5" fill="#fde68a" />
                      <circle cx="24" cy="60" r="2.5" fill="#f59e0b" />
                    </svg>
                  </div>


                </div>

                <div className="relative z-10">
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-50 to-slate-400 tracking-tight font-['Poppins'] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] group-hover:from-white group-hover:to-amber-200 transition-colors">
                    {statValue(platformStats.activeVles)}
                  </div>
                  <p className="text-xs font-bold text-slate-200 mt-1 drop-shadow-sm">
                    {t('Active Jan Seva Kendras', 'सक्रिय जन सेवा केंद्र')}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {t('CSC VLEs & Cyber Cafes', 'सीएससी वीएलई व अधिकृत केंद्र')}
                  </p>
                </div>


              </div>
            </div>

            {/* Card 4: Connected Members */}
            <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-b from-purple-300/50 via-purple-500/20 to-black/80 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.9),0_4px_12px_rgba(168,85,247,0.2)] hover:shadow-[0_22px_40px_-6px_rgba(168,85,247,0.35),0_8px_16px_rgba(0,0,0,0.8)] transition-all duration-300 group hover:-translate-y-1.5 border-b-[3px] border-b-purple-950/80">
              <div className="bg-gradient-to-b from-[#111927] to-[#080d14] rounded-2xl p-5 space-y-3 relative overflow-hidden h-full flex flex-col justify-between border-t border-t-white/20">
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-purple-400/10 via-transparent to-transparent pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 relative shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(168,85,247,0.65)]">
                      <defs>
                        <radialGradient id="stat3dMemberGrad" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#f3e8ff" />
                          <stop offset="35%" stopColor="#c084fc" />
                          <stop offset="70%" stopColor="#7e22ce" />
                          <stop offset="100%" stopColor="#2e1065" />
                        </radialGradient>
                        <linearGradient id="stat3dMemberRings" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#d8b4fe" />
                          <stop offset="50%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                        <linearGradient id="stat3dPlane4" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#3b0764" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                      <polygon points="50,82 86,66 50,54 14,66" fill="url(#stat3dPlane4)" stroke="#a855f7" strokeWidth="1" opacity="0.6" />
                      <polygon points="50,88 86,72 86,66 50,82 14,66 14,72" fill="#3b0764" opacity="0.8" />
                      <ellipse cx="50" cy="46" rx="44" ry="18" fill="none" stroke="url(#stat3dMemberRings)" strokeWidth="1.6" strokeDasharray="3 2" transform="rotate(-25 50 46)" />
                      <ellipse cx="50" cy="46" rx="42" ry="16" fill="none" stroke="url(#stat3dMemberRings)" strokeWidth="1.4" transform="rotate(35 50 46)" />
                      <polygon points="50,14 80,36 50,56 20,36" fill="url(#stat3dMemberGrad)" filter="drop-shadow(0 0 10px rgba(168,85,247,0.7))" />
                      <polygon points="20,36 50,56 50,72 20,52" fill="#581c87" />
                      <polygon points="80,36 50,56 50,72 80,52" fill="#3b0764" />
                      <polygon points="50,18 72,36 50,48 28,36" fill="#ffffff" opacity="0.35" />
                      <circle cx="50" cy="36" r="7.5" fill="#f3e8ff" filter="drop-shadow(0 0 8px rgba(233,213,255,0.9))" />
                      <path d="M50 31 L51.5 34.5 L55 35 L52.5 37.5 L53 41 L50 39 L47 41 L47.5 37.5 L45 35 L48.5 34.5 Z" fill="#7e22ce" />
                      <circle cx="78" cy="62" r="2.5" fill="#e9d5ff" />
                      <circle cx="22" cy="62" r="2.5" fill="#c084fc" />
                    </svg>
                  </div>


                </div>

                <div className="relative z-10">
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-50 to-slate-400 tracking-tight font-['Poppins'] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] group-hover:from-white group-hover:to-purple-200 transition-colors">
                    {statValue(platformStats.activeOperators)}
                  </div>
                  <p className="text-xs font-bold text-slate-200 mt-1 drop-shadow-sm">
                    {t('Connected Members', 'सत्यापित ऑपरेटर सदस्य')}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {t('Operators & Form Fillers', 'ऑपरेटर एवं फॉर्म विशेषज्ञ')}
                  </p>
                </div>


              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 3 LARGE ULTRA-PREMIUM PORTAL ACCESS CARDS (CUTTING-EDGE UI/UX)            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            
            {/* PORTAL 1: Citizen / Client Portal */}
            <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-cyan-400/80 via-blue-500/40 to-indigo-600/60 hover:from-cyan-300 hover:via-sky-400 hover:to-indigo-400 shadow-[0_20px_50px_-10px_rgba(6,182,212,0.25)] hover:shadow-[0_25px_60px_-10px_rgba(6,182,212,0.45)] transition-all duration-500 group hover:-translate-y-2.5 flex flex-col justify-between">
              
              {/* 1. DEDICATED 3D SVG IMAGE SHOWCASE (CHILD 1 OF PORTAL 1) */}
              <div 
                className="relative w-full rounded-t-[22px] bg-gradient-to-b from-[#0c1628]/98 via-[#08101d]/98 to-[#040812]/98 backdrop-blur-2xl p-6 sm:p-7 flex flex-col items-center justify-center overflow-hidden border-t-2 border-t-cyan-300/80 border-b border-b-cyan-500/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-10px_20px_rgba(0,0,0,0.8),0_20px_40px_-10px_rgba(6,182,212,0.35)] [perspective:1200px]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* 3D Top Chamfer Specular Edge Highlight */}
                <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-200 to-transparent blur-[0.5px] pointer-events-none z-30" />

                {/* 3D Isometric Cyber Grid Floor in Background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                  <div 
                    className="absolute -bottom-10 -left-20 -right-20 h-64 origin-bottom"
                    style={{
                      transform: 'perspective(400px) rotateX(62deg)',
                      backgroundImage: `
                        linear-gradient(to right, rgba(34,211,238,0.25) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(34,211,238,0.25) 1px, transparent 1px)
                      `,
                      backgroundSize: '24px 24px',
                      maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 30%, transparent 95%)',
                      WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 30%, transparent 95%)'
                    }}
                  />
                </div>

                {/* Ambient 3D Volumetric Depth Aura Glows */}
                <div className="absolute -top-20 -left-20 w-56 h-56 bg-cyan-500/30 rounded-full blur-3xl pointer-events-none group-hover:scale-130 transition-transform duration-700" />
                <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-blue-600/25 rounded-full blur-3xl pointer-events-none group-hover:scale-120 transition-transform duration-700" />
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-cyan-400/20 via-blue-500/5 to-transparent pointer-events-none" />



                {/* ULTRA-HD 3D HOLOGRAPHIC STAGE (INTERACTIVE 3D PERSPECTIVE TILT) */}
                <div 
                  className="w-full py-2 flex items-center justify-center relative transition-transform duration-500 ease-out group-hover:[transform:rotateX(8deg)_rotateY(-6deg)_scale(1.05)]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="w-44 h-44 sm:w-48 sm:h-48 relative flex items-center justify-center">
                    {/* Multi-layered 3D Volumetric Aura Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/50 via-sky-500/35 to-indigo-600/50 rounded-full blur-2xl pointer-events-none group-hover:blur-3xl transition-all" />
                    <div className="absolute inset-2 bg-gradient-to-b from-cyan-300/30 to-blue-600/30 rounded-full blur-xl pointer-events-none animate-pulse" />





                    {/* MASTER 3D SVG PHOTO / ISOMETRIC SMART ID CARD SHOWCASE */}
                    <svg viewBox="0 0 220 200" className="w-full h-full relative z-20 drop-shadow-[0_20px_45px_rgba(6,182,212,0.9)]">
                      <defs>
                        {/* 3D Glow Filter */}
                        <filter id="cit3dGlow" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="2.5" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>

                        {/* Ground Depth Shadow Filter */}
                        <filter id="cit3dFloorBlur" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="5" />
                        </filter>

                        {/* Volumetric Hologram Light Cone */}
                        <linearGradient id="cit3dHoloCone" x1="50%" y1="100%" x2="50%" y2="0%">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
                          <stop offset="40%" stopColor="#0ea5e9" stopOpacity="0.25" />
                          <stop offset="80%" stopColor="#6366f1" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>

                        {/* 3D Pedestal Stage Gradients */}
                        <linearGradient id="citPedRim" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#67e8f9" />
                          <stop offset="25%" stopColor="#0284c7" />
                          <stop offset="70%" stopColor="#033d6b" />
                          <stop offset="100%" stopColor="#011424" />
                        </linearGradient>
                        <radialGradient id="citPedStage" cx="50%" cy="35%" r="65%">
                          <stop offset="0%" stopColor="#2563eb" />
                          <stop offset="35%" stopColor="#0e3a6c" />
                          <stop offset="75%" stopColor="#051a30" />
                          <stop offset="100%" stopColor="#020812" />
                        </radialGradient>

                        {/* 3D Smart Card Isometric Face */}
                        <linearGradient id="citCardGlassFace" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="18%" stopColor="#0284c7" />
                          <stop offset="55%" stopColor="#0f2b48" />
                          <stop offset="100%" stopColor="#041220" />
                        </linearGradient>

                        {/* 3D Extruded Slab Walls (Physical Depth) */}
                        <linearGradient id="citCardWallRight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0369a1" />
                          <stop offset="50%" stopColor="#082f49" />
                          <stop offset="100%" stopColor="#020d1c" />
                        </linearGradient>
                        <linearGradient id="citCardWallBottom" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0c4a6e" />
                          <stop offset="60%" stopColor="#031f38" />
                          <stop offset="100%" stopColor="#010914" />
                        </linearGradient>

                        {/* 3D Gold Contact Microchip */}
                        <linearGradient id="citGoldChip3D" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="30%" stopColor="#facc15" />
                          <stop offset="70%" stopColor="#ca8a04" />
                          <stop offset="100%" stopColor="#713f12" />
                        </linearGradient>

                        {/* Floating Certificate Parchment */}
                        <linearGradient id="citPaperFace" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="35%" stopColor="#bae6fd" />
                          <stop offset="85%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#0369a1" />
                        </linearGradient>
                        <linearGradient id="citGoldWaxSeal" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="45%" stopColor="#eab308" />
                          <stop offset="80%" stopColor="#a16207" />
                          <stop offset="100%" stopColor="#713f12" />
                        </linearGradient>

                        {/* Diamond Escrow Shield 3D Facets */}
                        <linearGradient id="citShieldFacetTop" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="45%" stopColor="#67e8f9" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <linearGradient id="citShieldFacetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="70%" stopColor="#0369a1" />
                          <stop offset="100%" stopColor="#082f49" />
                        </linearGradient>
                        <linearGradient id="citShieldFacetRight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a5f3fc" />
                          <stop offset="60%" stopColor="#0284c7" />
                          <stop offset="100%" stopColor="#0c4a6e" />
                        </linearGradient>
                        <linearGradient id="citShieldFacetBottom" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0284c7" />
                          <stop offset="60%" stopColor="#082f49" />
                          <stop offset="100%" stopColor="#021424" />
                        </linearGradient>

                        {/* Gyro Orbits */}
                        <linearGradient id="citOrbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="50%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>
                        <linearGradient id="citOrbitGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a5f3fc" />
                          <stop offset="50%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>

                        {/* Chrome Specular Spheres */}
                        <radialGradient id="citChromeSat1" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="35%" stopColor="#38bdf8" />
                          <stop offset="75%" stopColor="#0284c7" />
                          <stop offset="100%" stopColor="#082f49" />
                        </radialGradient>
                        <radialGradient id="citChromeSat2" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#f3e8ff" />
                          <stop offset="40%" stopColor="#c084fc" />
                          <stop offset="80%" stopColor="#7e22ce" />
                          <stop offset="100%" stopColor="#2e1065" />
                        </radialGradient>
                      </defs>

                      {/* 1. 3D CYBER PEDESTAL & VOLUMETRIC STAGE */}
                      {/* Ground Floor Deep Shadow */}
                      <ellipse cx="110" cy="180" rx="84" ry="17" fill="#000000" opacity="0.85" filter="url(#cit3dFloorBlur)" />

                      {/* Pedestal Extrusion Wall (Thickness) */}
                      <path d="M40 164 C40 178 180 178 180 164 L180 172 C180 186 40 186 40 172 Z" fill="url(#citPedRim)" />

                      {/* Pedestal Top Disc */}
                      <ellipse cx="110" cy="164" rx="70" ry="14" fill="url(#citPedStage)" stroke="#38bdf8" strokeWidth="1.6" />
                      <ellipse cx="110" cy="164" rx="60" ry="11" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="5 3" />
                      <ellipse cx="110" cy="164" rx="44" ry="8" fill="none" stroke="#67e8f9" strokeWidth="0.9" opacity="0.75" />

                      {/* Volumetric Hologram Projection Light Cone */}
                      <polygon points="62,164 158,164 195,35 25,35" fill="url(#cit3dHoloCone)" />

                      {/* Gyroscopic Orbit Ring 1 (Back segment) */}
                      <ellipse cx="110" cy="100" rx="92" ry="35" fill="none" stroke="url(#citOrbitGrad1)" strokeWidth="1.8" strokeDasharray="6 3" transform="rotate(-24 110 100)" />

                      {/* 2. FLOATING 3D GOVERNMENT CERTIFICATE (BACKGROUND SLAB) */}
                      <g opacity="0.95">
                        {/* Certificate Shadow */}
                        <polygon points="52,42 128,26 116,104 40,120" fill="#000000" opacity="0.45" filter="url(#cit3dFloorBlur)" />
                        {/* Certificate Extruded Wall */}
                        <polygon points="128,26 133,29 121,107 116,104" fill="#0369a1" />
                        <polygon points="40,120 45,123 121,107 116,104" fill="#082f49" />
                        {/* Certificate Face */}
                        <polygon points="52,42 128,26 116,104 40,120" fill="url(#citPaperFace)" stroke="#e0f2fe" strokeWidth="1.4" />
                        {/* Folded 3D Corner at Top Right */}
                        <polygon points="118,28 128,26 119,38" fill="#0369a1" />
                        <polygon points="118,28 119,38 108,36" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.8" />
                        {/* Header Banner */}
                        <polygon points="54,48 110,36 108,46 52,58" fill="#ffffff" opacity="0.7" />
                        {/* Content lines */}
                        <line x1="54" y1="64" x2="105" y2="53" stroke="#e0f2fe" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="52" y1="72" x2="100" y2="62" stroke="#bae6fd" strokeWidth="1.4" strokeLinecap="round" />
                        <line x1="50" y1="80" x2="92" y2="71" stroke="#7dd3fc" strokeWidth="1.3" strokeLinecap="round" />
                        {/* Removed Verified Stamp Ribbon & Seal as requested */}

                      </g>

                      {/* 3. HERO 3D ISOMETRIC CITIZEN SMART ID CARD (CENTERPIECE) */}
                      <g>
                        {/* Card Cast Shadow on Pedestal */}
                        <polygon points="76,160 158,168 136,177 54,168" fill="#000000" opacity="0.65" filter="url(#cit3dFloorBlur)" />

                        {/* Extruded 3D Slab Thickness: Right Edge Bevel */}
                        <polygon points="160,56 169,61 149,143 140,138" fill="url(#citCardWallRight)" stroke="#0284c7" strokeWidth="0.9" />
                        {/* Extruded 3D Slab Thickness: Bottom Edge Bevel */}
                        <polygon points="76,120 85,125 149,143 140,138" fill="url(#citCardWallBottom)" stroke="#0c4a6e" strokeWidth="0.9" />

                        {/* Card Front Isometric Face */}
                        <polygon points="96,38 160,56 140,138 76,120" fill="url(#citCardGlassFace)" stroke="#38bdf8" strokeWidth="2" />

                        {/* Chamfer Specular Edge Highlight Reflections */}
                        <line x1="96" y1="38" x2="160" y2="56" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="96" y1="38" x2="76" y2="120" stroke="#a5f3fc" strokeWidth="2" strokeLinecap="round" />

                        {/* Diagonal Glossy Glass Sheen Streak */}
                        <polygon points="112,42 142,50 115,131 85,123" fill="#ffffff" opacity="0.28" />

                        {/* National Indian Tricolor Accent Ribbon (Top Header) */}
                        <polygon points="102,44 112,46.8 110.5,50.8 100.5,48" fill="#f97316" />
                        <polygon points="111.5,46.7 121.5,49.5 120,53.5 110,50.7" fill="#ffffff" />
                        <polygon points="121,49.4 131,52.2 129.5,56.2 119.5,53.4" fill="#22c55e" />
                        {/* Navy Chakra Dot */}
                        <circle cx="115.5" cy="50" r="1.4" fill="#1e3a8a" />

                        {/* 3D Gold Contact Microchip with Etched Bus Traces */}
                        <polygon points="94,62 114,68 108,84 88,78" fill="url(#citGoldChip3D)" stroke="#fef08a" strokeWidth="1.2" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.6))" />
                        <polygon points="114,68 117,70.5 111,86.5 108,84" fill="#854d0e" />
                        {/* Chip internal bus cuts */}
                        <line x1="97" y1="65" x2="97" y2="81" stroke="#713f12" strokeWidth="0.9" />
                        <line x1="105" y1="67.5" x2="105" y2="83.5" stroke="#713f12" strokeWidth="0.9" />
                        <line x1="90" y1="73" x2="112" y2="79" stroke="#713f12" strokeWidth="0.9" />

                        {/* Biometric Hologram Radar & Laser Scanner Window */}
                        <polygon points="122,76 148,84 142,108 116,100" fill="#03162b" stroke="#22d3ee" strokeWidth="1.3" />
                        {/* Biometric Radar Rings */}
                        <circle cx="132" cy="92" r="7.8" fill="none" stroke="#38bdf8" strokeWidth="1.1" strokeDasharray="3 1.5" />
                        <circle cx="132" cy="92" r="4.5" fill="none" stroke="#22d3ee" strokeWidth="1.2" />
                        <circle cx="132" cy="92" r="2" fill="#a5f3fc" />
                        {/* Glowing Laser Scan Bar */}
                        <line x1="118" y1="92" x2="146" y2="99" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" filter="url(#cit3dGlow)" />

                        {/* Embossed Smart Card Typography Tracks */}
                        <line x1="90" y1="94" x2="112" y2="100" stroke="#f0f9ff" strokeWidth="2.2" strokeLinecap="round" />
                        <line x1="88" y1="102" x2="108" y2="107.5" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="86" y1="110" x2="128" y2="121" stroke="#38bdf8" strokeWidth="1.3" strokeDasharray="3.5 2" opacity="0.9" />

                        {/* Contactless RFID / NFC Glowing Waves */}
                        <path d="M138,62 C141,63.5 143,66.5 143,70" fill="none" stroke="#67e8f9" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M142,59 C146,61 148,65 148,70" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                      </g>

                      {/* 4. FOREGROUND 3D FACETED DIAMOND ESCROW SECURITY CREST */}
                      <g>
                        {/* Crest Cast Shadow */}
                        <polygon points="46,70 76,70 66,114 36,114" fill="#000000" opacity="0.4" filter="url(#cit3dFloorBlur)" />

                        {/* Top Facet (Specular Bright) */}
                        <polygon points="56,52 32,68 56,86 56,52" fill="url(#citShieldFacetTop)" stroke="#ffffff" strokeWidth="1.1" />
                        {/* Left Facet */}
                        <polygon points="32,68 36,92 56,110 56,86 32,68" fill="url(#citShieldFacetLeft)" stroke="#38bdf8" strokeWidth="1.1" />
                        {/* Right Facet */}
                        <polygon points="56,52 80,68 56,86 56,52" fill="url(#citShieldFacetRight)" stroke="#38bdf8" strokeWidth="1.1" />
                        {/* Bottom-Right Facet (Deep Shade) */}
                        <polygon points="80,68 76,92 56,110 56,86 80,68" fill="url(#citShieldFacetBottom)" stroke="#0284c7" strokeWidth="1.1" />

                        {/* Center Facet Ridge Specular Highlight */}
                        <line x1="56" y1="52" x2="56" y2="110" stroke="#ffffff" strokeWidth="2" opacity="0.95" />

                        {/* Glowing Security Checkmark Hub */}
                        <circle cx="56" cy="82" r="14.5" fill="#061c36" opacity="0.85" />
                        <path d="M47 82 L53 88 L67 74" fill="none" stroke="#22d3ee" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#cit3dGlow)" />
                        <path d="M47 82 L53 88 L67 74" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </g>

                      {/* Gyroscopic Orbit Ring 2 (Front segment) */}
                      <ellipse cx="110" cy="100" rx="86" ry="29" fill="none" stroke="url(#citOrbitGrad2)" strokeWidth="1.6" strokeDasharray="3 2" transform="rotate(32 110 100)" />

                      {/* 5. FLOATING 3D METALLIC CHROME SATELLITE NODES */}
                      {/* Top Right Orb */}
                      <circle cx="168" cy="38" r="7" fill="url(#citChromeSat1)" filter="drop-shadow(0 0 12px #22d3ee)" />
                      <circle cx="166" cy="36" r="2.4" fill="#ffffff" />
                      {/* Left Mid-air Orb */}
                      <circle cx="24" cy="98" r="5.5" fill="url(#citChromeSat1)" filter="drop-shadow(0 0 10px #0284c7)" />
                      <circle cx="22.5" cy="96.5" r="2" fill="#ffffff" />
                      {/* Bottom Right Purple Accent Orb */}
                      <circle cx="192" cy="116" r="5.5" fill="url(#citChromeSat2)" filter="drop-shadow(0 0 10px #a855f7)" />
                      <circle cx="190.5" cy="114.5" r="1.8" fill="#ffffff" />

                      {/* Sparkle Glints */}
                      <circle cx="48" cy="148" r="2.8" fill="#22d3ee" filter="url(#cit3dGlow)" />
                      <circle cx="178" cy="78" r="2.4" fill="#a5f3fc" />
                      <circle cx="76" cy="30" r="2.2" fill="#38bdf8" />
                      <circle cx="144" cy="160" r="3" fill="#67e8f9" filter="drop-shadow(0 0 8px #06b6d4)" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 2. CITIZEN PORTAL CARD CONTENT (CHILD 2 OF PORTAL 1) */}
              <div className="bg-[#080D17]/95 backdrop-blur-2xl rounded-b-[22px] p-7 sm:p-8 pt-5 flex flex-col justify-between flex-1 relative overflow-hidden border border-white/[0.08] border-t-0 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.8)] space-y-6">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                    {t('Citizen Portal', 'नागरिक सेवा पोर्टल (Citizen Portal)')}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {t('Direct Jan Seva Kendra citizen applications & instant tracking', 'सीधे जन सेवा केंद्र से आवेदन एवं लाइव ट्रैकिंग')}
                  </p>
                </div>

                {/* High-Value Feature Micro-Cards */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('Direct UPI to the assigned operator', 'निर्धारित ऑपरेटर को सीधे UPI भुगतान')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('Direct Operator Audio Call & Live Chat', 'ऑपरेटर से सीधी कॉल व लाइव चैट सुविधा')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('Verify Official Receipt Photo Before Paying', 'काम पूरा होने की रसीद जांचकर ही भुगतान करें')}
                    </span>
                  </div>
                </div>

                {/* Interactive State-Of-The-Art Action Button */}
                <div className="pt-2 relative z-10">
                  <button
                    onClick={() => openPortalOrLogin('client')}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-[0.98] group/btn cursor-pointer"
                  >
                    <span>{t('Enter Citizen Portal', 'नागरिक पोर्टल में प्रवेश करें')}</span>
                    <ArrowRight className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* PORTAL 2: Jan Seva Kendra (VLE) */}
            <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-violet-400/80 via-purple-500/40 to-indigo-600/60 hover:from-violet-300 hover:via-purple-400 hover:to-indigo-400 shadow-[0_20px_50px_-10px_rgba(168,85,247,0.25)] hover:shadow-[0_25px_60px_-10px_rgba(168,85,247,0.45)] transition-all duration-500 group hover:-translate-y-2.5 flex flex-col justify-between">
              
              {/* 1. DEDICATED 3D SVG IMAGE SHOWCASE (CHILD 1 OF PORTAL 2) */}
              <div className="relative w-full rounded-t-[22px] bg-gradient-to-b from-[#100B1A]/95 via-[#0C0816]/95 to-[#080510]/95 backdrop-blur-2xl p-6 sm:p-7 flex flex-col items-center justify-center overflow-hidden border-b border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                {/* Top 3D Specular Highlight Edge */}
                <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-purple-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />

                {/* Ambient 3D Volumetric Aura Glows */}
                <div className="absolute -top-16 -left-16 w-48 h-48 bg-purple-500/25 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
                <div className="absolute -bottom-14 -right-14 w-44 h-44 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none group-hover:scale-120 transition-transform duration-700" />
                <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-purple-500/15 via-violet-500/5 to-transparent pointer-events-none" />



                {/* 3D SVG IMAGE (CSC KIOSK WORKSTATION, BIOMETRIC SCANNER & TELEMETRY ENGINE) */}
                <div className="w-full py-2 flex items-center justify-center relative group-hover:scale-110 group-hover:-translate-y-1.5 transition-all duration-500">
                  <div className="w-36 h-36 sm:w-40 sm:h-40 relative flex items-center justify-center">
                    {/* Multi-layered 3D Volumetric Aura Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/40 via-violet-500/25 to-indigo-600/40 rounded-full blur-2xl pointer-events-none group-hover:blur-3xl transition-all" />
                    <div className="absolute inset-2 bg-gradient-to-b from-purple-300/20 to-indigo-600/20 rounded-full blur-xl pointer-events-none animate-pulse" />

                    <svg viewBox="0 0 140 140" className="w-full h-full relative z-10 drop-shadow-[0_12px_36px_rgba(168,85,247,0.75)]">
                      <defs>
                        {/* 3D Glow Filter */}
                        <filter id="opGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="1.8" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>

                        {/* Ground Shadow Filter */}
                        <filter id="op3dShadow" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="3.5" />
                        </filter>

                        {/* Holographic Projection Beam Gradient */}
                        <linearGradient id="op3dHoloBeam" x1="50%" y1="100%" x2="50%" y2="0%">
                          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.45" />
                          <stop offset="35%" stopColor="#a855f7" stopOpacity="0.18" />
                          <stop offset="75%" stopColor="#6366f1" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                        </linearGradient>

                        {/* 3D Pedestal Base Gradients */}
                        <linearGradient id="op3dPedestalRim" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#c084fc" />
                          <stop offset="30%" stopColor="#9333ea" />
                          <stop offset="70%" stopColor="#581c87" />
                          <stop offset="100%" stopColor="#1e0b36" />
                        </linearGradient>
                        <radialGradient id="op3dPedestalStage" cx="50%" cy="40%" r="60%">
                          <stop offset="0%" stopColor="#3b0764" />
                          <stop offset="60%" stopColor="#1e0b36" />
                          <stop offset="100%" stopColor="#0a0314" />
                        </radialGradient>

                        {/* 3D Desk Gradients */}
                        <linearGradient id="op3dDeskTop" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#4c1d95" />
                          <stop offset="50%" stopColor="#2e1065" />
                          <stop offset="100%" stopColor="#17062e" />
                        </linearGradient>
                        <linearGradient id="op3dDeskWallLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b0764" />
                          <stop offset="100%" stopColor="#100320" />
                        </linearGradient>
                        <linearGradient id="op3dDeskWallRight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#2e1065" />
                          <stop offset="100%" stopColor="#080112" />
                        </linearGradient>

                        {/* 3D Curved Hologram Screen Glass */}
                        <linearGradient id="op3dScreenGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#c084fc" />
                          <stop offset="35%" stopColor="#7e22ce" />
                          <stop offset="75%" stopColor="#3b0764" />
                          <stop offset="100%" stopColor="#140224" />
                        </linearGradient>

                        {/* Biometric Scanner */}
                        <linearGradient id="op3dBiometricPad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#15803d" />
                          <stop offset="100%" stopColor="#052e16" />
                        </linearGradient>
                        <linearGradient id="opLaserBeam" x1="50%" y1="100%" x2="50%" y2="0%">
                          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
                        </linearGradient>

                        {/* Thermal Receipt Paper */}
                        <linearGradient id="op3dReceiptPaper" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#faf5ff" />
                          <stop offset="60%" stopColor="#e9d5ff" />
                          <stop offset="100%" stopColor="#d8b4fe" />
                        </linearGradient>

                        {/* 3D Camera Lens */}
                        <radialGradient id="op3dCameraBody" cx="40%" cy="35%" r="60%">
                          <stop offset="0%" stopColor="#e9d5ff" />
                          <stop offset="40%" stopColor="#a855f7" />
                          <stop offset="85%" stopColor="#3b0764" />
                          <stop offset="100%" stopColor="#1e0b36" />
                        </radialGradient>
                        <radialGradient id="op3dLensGlass" cx="35%" cy="30%" r="65%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="45%" stopColor="#1d4ed8" />
                          <stop offset="85%" stopColor="#0f172a" />
                          <stop offset="100%" stopColor="#020617" />
                        </radialGradient>

                        {/* Gold Medallion */}
                        <linearGradient id="op3dGoldMedal" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="35%" stopColor="#eab308" />
                          <stop offset="75%" stopColor="#ca8a04" />
                          <stop offset="100%" stopColor="#713f12" />
                        </linearGradient>

                        {/* Orbital Rings Gradients */}
                        <linearGradient id="opOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f3e8ff" />
                          <stop offset="50%" stopColor="#c084fc" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="opOrbitGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#d946ef" stopOpacity="0.1" />
                        </linearGradient>

                        {/* Satellites */}
                        <radialGradient id="op3dSat1" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="40%" stopColor="#c084fc" />
                          <stop offset="80%" stopColor="#7e22ce" />
                          <stop offset="100%" stopColor="#3b0764" />
                        </radialGradient>
                        <radialGradient id="op3dSat2" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#e0e7ff" />
                          <stop offset="45%" stopColor="#818cf8" />
                          <stop offset="85%" stopColor="#4338ca" />
                          <stop offset="100%" stopColor="#1e1b4b" />
                        </radialGradient>
                      </defs>

                      {/* Ambient Shadow under Pedestal */}
                      <ellipse cx="70" cy="118" rx="54" ry="14" fill="#000000" opacity="0.65" filter="url(#op3dShadow)" />

                      {/* 3D Pedestal Cylinder Rim Depth Wall */}
                      <path d="M26 106 C26 116 114 116 114 106 L114 112 C114 122 26 122 26 112 Z" fill="url(#op3dPedestalRim)" />

                      {/* Pedestal Top Disc */}
                      <ellipse cx="70" cy="106" rx="44" ry="12" fill="url(#op3dPedestalStage)" stroke="#a855f7" strokeWidth="1" />
                      {/* Neon Laser Ring */}
                      <ellipse cx="70" cy="106" rx="39" ry="9.5" fill="none" stroke="#d8b4fe" strokeWidth="1.2" strokeDasharray="3 3" />
                      <ellipse cx="70" cy="106" rx="32" ry="7.5" fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.6" />

                      {/* Volumetric Hologram Projection Beam */}
                      <polygon points="46,106 94,106 108,30 32,30" fill="url(#op3dHoloBeam)" />

                      {/* Gyroscopic Cyber Orbit 1 */}
                      <ellipse cx="70" cy="58" rx="58" ry="24" fill="none" stroke="url(#opOrbitGrad)" strokeWidth="1.3" strokeDasharray="4 2" transform="rotate(-22 70 58)" />

                      {/* 3D Isometric CSC Workstation Desk (Center) */}
                      {/* Left Extrusion Wall */}
                      <polygon points="38,54 70,72 70,86 38,68" fill="url(#op3dDeskWallLeft)" stroke="#3b0764" strokeWidth="0.6" />
                      {/* Right Extrusion Wall */}
                      <polygon points="70,72 102,54 102,68 70,86" fill="url(#op3dDeskWallRight)" stroke="#2e1065" strokeWidth="0.6" />
                      {/* Top Surface */}
                      <polygon points="70,72 102,54 70,36 38,54" fill="url(#op3dDeskTop)" stroke="#c084fc" strokeWidth="0.9" />

                      {/* Specular Front Edge Line of Desk */}
                      <line x1="38" y1="54" x2="70" y2="72" stroke="#e9d5ff" strokeWidth="1" opacity="0.8" />
                      <line x1="70" y1="72" x2="102" y2="54" stroke="#a855f7" strokeWidth="0.8" opacity="0.6" />

                      {/* 3D Curved Operator Terminal Monitor */}
                      {/* Stand */}
                      <polygon points="68,52 72,52 72,40 68,40" fill="#2e1065" stroke="#581c87" strokeWidth="0.5" />
                      <ellipse cx="70" cy="52" rx="4" ry="1.5" fill="#581c87" />
                      {/* Monitor Back / Left Bevel Depth */}
                      <polygon points="36,25 34,26 34,56 36,55" fill="#1e0b36" />
                      <polygon points="34,26 82,19 84,20 36,25" fill="#3b0764" />
                      {/* Curved Screen Frame */}
                      <polygon points="36,25 84,20 84,50 36,55" fill="#0c0217" stroke="#a855f7" strokeWidth="1" />
                      {/* Screen Glass Face with Holographic UI */}
                      <polygon points="37,26 83,21 83,49 37,54" fill="url(#op3dScreenGlass)" />

                      {/* UI Display: Header Bar */}
                      <polygon points="39,28 81,22.5 81,25 39,30.5" fill="#ffffff" opacity="0.3" />
                      {/* Telemetry Applicant Queue Bars */}
                      <line x1="41" y1="33" x2="57" y2="31" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="41" y1="37" x2="68" y2="33.5" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="41" y1="41" x2="52" y2="39.5" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" />
                      {/* Real-time Heartbeat / Dispatch Line */}
                      <path d="M41 47 L48 44 L53 49 L60 43 L67 47 L75 42 L80 43" fill="none" stroke="#f472b6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Green Live Indicator */}
                      <circle cx="78" cy="26" r="1.5" fill="#4ade80" filter="url(#opGlowFilter)" />

                      {/* 3D Biometric Fingerprint Scanner Terminal (Left on Desk) */}
                      <polygon points="44,58 54,52 60,56 50,62" fill="url(#op3dBiometricPad)" stroke="#4ade80" strokeWidth="0.8" />
                      <ellipse cx="52" cy="56" rx="4.5" ry="2.2" fill="#4ade80" opacity="0.85" filter="url(#opGlowFilter)" />
                      <path d="M50 56 Q52 54 54 56 M49 57 Q52 55 55 57" stroke="#ffffff" strokeWidth="0.8" fill="none" />
                      {/* Upward Laser Scanner Beam */}
                      <polygon points="48,56 56,56 54,44 50,44" fill="url(#opLaserBeam)" />
                      <line x1="47" y1="56" x2="57" y2="56" stroke="#86efac" strokeWidth="1" filter="url(#opGlowFilter)" />

                      {/* 3D Thermal Receipt Printer & Floating Slip (Right on Desk) */}
                      <polygon points="76,60 88,53 96,58 84,65" fill="#334155" stroke="#64748b" strokeWidth="0.7" />
                      <polygon points="84,65 96,58 96,64 84,71" fill="#0f172a" />
                      <polygon points="76,60 84,65 84,71 76,66" fill="#1e293b" />
                      <line x1="80" y1="58" x2="90" y2="52" stroke="#020617" strokeWidth="1.5" />
                      {/* Floating Real-Time Receipt Paper Slip */}
                      <polygon points="82,53 92,47 94,34 84,40" fill="url(#op3dReceiptPaper)" stroke="#ffffff" strokeWidth="0.7" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.4))" />
                      {/* Barcode & Text on Receipt */}
                      <line x1="85" y1="45" x2="91" y2="41.5" stroke="#7e22ce" strokeWidth="1" strokeDasharray="1 0.8" />
                      <line x1="85" y1="42" x2="91" y2="38.5" stroke="#9333ea" strokeWidth="0.8" />
                      <circle cx="89" cy="37" r="1.3" fill="#22c55e" />

                      {/* 3D Floating Camera Proof Upload Lens (Upper Right) */}
                      <ellipse cx="106" cy="36" rx="13" ry="13" fill="url(#op3dCameraBody)" stroke="#c084fc" strokeWidth="1" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
                      <ellipse cx="106" cy="36" rx="8.5" ry="8.5" fill="url(#op3dLensGlass)" stroke="#38bdf8" strokeWidth="0.8" />
                      <ellipse cx="106" cy="36" rx="5" ry="5" fill="#020617" />
                      {/* Lens Specular Reflection */}
                      <path d="M100 32 A6 6 0 0 1 110 30 A8 8 0 0 0 100 32 Z" fill="#ffffff" opacity="0.8" />
                      {/* Camera Flash Node */}
                      <circle cx="115" cy="27" r="2.2" fill="#facc15" filter="url(#opGlowFilter)" />

                      {/* 3D Golden Ashoka / CSC Operator Authorization Crest (Floating Upper Left) */}
                      <ellipse cx="30" cy="36" rx="9" ry="9" fill="url(#op3dGoldMedal)" stroke="#fef08a" strokeWidth="1" filter="drop-shadow(0 4px 10px rgba(234,179,8,0.4))" />
                      {/* Inner Relief Star Emblem */}
                      <path d="M30 30 L32 34 L36 34 L33 36.5 L34 41 L30 38.5 L26 41 L27 36.5 L24 34 L28 34 Z" fill="#713f12" />
                      <circle cx="30" cy="36" r="1.8" fill="#fef9c3" />

                      {/* Gyroscopic Cyber Orbit 2 */}
                      <ellipse cx="70" cy="58" rx="54" ry="20" fill="none" stroke="url(#opOrbitGrad2)" strokeWidth="1.1" transform="rotate(32 70 58)" />

                      {/* Floating 3D Metallic Satellites with Specular Glints */}
                      {/* Satellite 1 (Right) */}
                      <circle cx="120" cy="74" r="4.5" fill="url(#op3dSat1)" filter="drop-shadow(0 0 6px #c084fc)" />
                      <circle cx="118.5" cy="72.5" r="1.3" fill="#ffffff" />
                      {/* Satellite 2 (Left) */}
                      <circle cx="22" cy="72" r="3.5" fill="url(#op3dSat2)" filter="drop-shadow(0 0 5px #818cf8)" />
                      <circle cx="21" cy="71" r="1" fill="#ffffff" />
                      {/* Satellite 3 (Top Apex) */}
                      <circle cx="70" cy="14" r="3.2" fill="#e9d5ff" filter="drop-shadow(0 0 5px #c084fc)" />
                      <circle cx="69" cy="13" r="1" fill="#ffffff" />

                      {/* Ambient Sparkles */}
                      <circle cx="88" cy="20" r="1" fill="#e9d5ff" opacity="0.8" />
                      <circle cx="48" cy="18" r="1" fill="#c084fc" opacity="0.8" />
                      <circle cx="100" cy="88" r="1.2" fill="#f472b6" opacity="0.7" />
                      <circle cx="36" cy="94" r="1" fill="#818cf8" opacity="0.7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 2. JAN SEVA KENDRA CARD CONTENT (CHILD 2 OF PORTAL 2) */}
              <div className="bg-[#090612]/95 backdrop-blur-2xl rounded-b-[22px] p-7 sm:p-8 pt-5 flex flex-col justify-between flex-1 relative overflow-hidden border border-white/[0.08] border-t-0 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.8)] space-y-6">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight group-hover:text-purple-300 transition-colors">
                    {t('Jan Seva Kendra', 'जन सेवा केंद्र (CSC VLE)')}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {t('Official CSC digital center order processing & instant dispatch', 'आधिकारिक सीएससी केंद्र आर्डर प्रबंधन एवं सुरक्षित डिलीवरी')}
                  </p>
                </div>

                {/* High-Value Feature Micro-Cards */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('Live In-App Order Alerts', 'ऐप में तुरंत ऑर्डर अपडेट')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('1-Click Camera & Gallery Proof Photo Upload', '1-क्लिक में लाइव फोटो व रसीद अपलोड')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('Share Documents & PDFs via WhatsApp', 'WhatsApp से दस्तावेज़ और PDF साझा करें')}
                    </span>
                  </div>
                </div>

                {/* Interactive State-Of-The-Art Action Button */}
                <div className="pt-2 relative z-10">
                  <button
                    onClick={() => openPortalOrLogin('vle')}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-[0.98] group/btn cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-purple-200" />
                    <span>{t('Operator Secure Login', 'ऑपरेटर सुरक्षित लॉगिन')}</span>
                    <ArrowRight className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform ml-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* PORTAL 3: Form Filler Expert */}
            <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-emerald-400/80 via-teal-500/40 to-cyan-600/60 hover:from-emerald-300 hover:via-teal-400 hover:to-cyan-400 shadow-[0_20px_50px_-10px_rgba(16,185,129,0.25)] hover:shadow-[0_25px_60px_-10px_rgba(16,185,129,0.45)] transition-all duration-500 group hover:-translate-y-2.5 flex flex-col justify-between">
              
              {/* 1. DEDICATED 3D SVG IMAGE SHOWCASE (CHILD 1 OF PORTAL 3) */}
              <div className="relative w-full rounded-t-[22px] bg-gradient-to-b from-[#05130F]/95 via-[#030E0B]/95 to-[#020907]/95 backdrop-blur-2xl p-6 sm:p-7 flex flex-col items-center justify-center overflow-hidden border-b border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                {/* Top 3D Specular Highlight Edge */}
                <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />

                {/* Ambient 3D Volumetric Aura Glows */}
                <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
                <div className="absolute -bottom-14 -right-14 w-44 h-44 bg-teal-600/20 rounded-full blur-3xl pointer-events-none group-hover:scale-120 transition-transform duration-700" />
                <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent pointer-events-none" />



                {/* 3D SVG IMAGE (FLOATING EXAM FORM MATRIX, LASER STYLUS & ESCROW VAULT) */}
                <div className="w-full py-2 flex items-center justify-center relative group-hover:scale-110 group-hover:-translate-y-1.5 transition-all duration-500">
                  <div className="w-36 h-36 sm:w-40 sm:h-40 relative flex items-center justify-center">
                    {/* Multi-layered 3D Volumetric Aura Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/40 via-teal-500/25 to-cyan-600/40 rounded-full blur-2xl pointer-events-none group-hover:blur-3xl transition-all" />
                    <div className="absolute inset-2 bg-gradient-to-b from-emerald-300/20 to-teal-600/20 rounded-full blur-xl pointer-events-none animate-pulse" />

                    <svg viewBox="0 0 140 140" className="w-full h-full relative z-10 drop-shadow-[0_12px_36px_rgba(16,185,129,0.75)]">
                      <defs>
                        {/* 3D Glow Filter */}
                        <filter id="ffGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="1.8" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>

                        {/* Ground Shadow Filter */}
                        <filter id="ff3dShadow" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="3.5" />
                        </filter>

                        {/* Holographic Projection Beam Gradient */}
                        <linearGradient id="ff3dHoloBeam" x1="50%" y1="100%" x2="50%" y2="0%">
                          <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
                          <stop offset="35%" stopColor="#10b981" stopOpacity="0.18" />
                          <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                        </linearGradient>

                        {/* 3D Pedestal Base Gradients */}
                        <linearGradient id="ff3dPedestalRim" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="30%" stopColor="#059669" />
                          <stop offset="70%" stopColor="#047857" />
                          <stop offset="100%" stopColor="#022c22" />
                        </linearGradient>
                        <radialGradient id="ff3dPedestalStage" cx="50%" cy="40%" r="60%">
                          <stop offset="0%" stopColor="#065f46" />
                          <stop offset="60%" stopColor="#022c22" />
                          <stop offset="100%" stopColor="#011611" />
                        </radialGradient>

                        {/* 3D Document Sheets */}
                        <linearGradient id="ff3dDocMid" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="50%" stopColor="#047857" />
                          <stop offset="100%" stopColor="#022c22" />
                        </linearGradient>
                        <linearGradient id="ff3dDocFace" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a7f3d0" />
                          <stop offset="30%" stopColor="#34d399" />
                          <stop offset="70%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#024433" />
                        </linearGradient>
                        <linearGradient id="ff3dHeaderBanner" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ecfdf5" />
                          <stop offset="100%" stopColor="#6ee7b7" />
                        </linearGradient>

                        {/* 3D Laser Stylus */}
                        <linearGradient id="ff3dStylusShaft" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#e0e7ff" />
                          <stop offset="40%" stopColor="#6ee7b7" />
                          <stop offset="80%" stopColor="#0d9488" />
                          <stop offset="100%" stopColor="#042f2e" />
                        </linearGradient>
                        <linearGradient id="ff3dStylusGrip" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="50%" stopColor="#cbd5e1" />
                          <stop offset="100%" stopColor="#475569" />
                        </linearGradient>

                        {/* Gold Wax Seal */}
                        <linearGradient id="ff3dGoldSeal" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="40%" stopColor="#eab308" />
                          <stop offset="75%" stopColor="#ca8a04" />
                          <stop offset="100%" stopColor="#713f12" />
                        </linearGradient>

                        {/* 3D Vault Box */}
                        <linearGradient id="ff3dVaultTop" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#047857" />
                          <stop offset="100%" stopColor="#064e3b" />
                        </linearGradient>
                        <linearGradient id="ff3dVaultLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#022c22" />
                        </linearGradient>
                        <linearGradient id="ff3dVaultRight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#047857" />
                          <stop offset="100%" stopColor="#011913" />
                        </linearGradient>
                        <linearGradient id="ff3dGoldDial" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="50%" stopColor="#eab308" />
                          <stop offset="100%" stopColor="#a16207" />
                        </linearGradient>
                        <linearGradient id="ff3dEscrowShield" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6ee7b7" />
                          <stop offset="50%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#022c22" />
                        </linearGradient>

                        {/* Mini Photo Badge */}
                        <linearGradient id="ff3dMiniCard" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f0fdf4" />
                          <stop offset="50%" stopColor="#86efac" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>

                        {/* Orbital Rings Gradients */}
                        <linearGradient id="ffOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f0fdf4" />
                          <stop offset="50%" stopColor="#34d399" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="ffOrbitGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
                        </linearGradient>

                        {/* Satellites */}
                        <radialGradient id="ff3dSat1" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="40%" stopColor="#34d399" />
                          <stop offset="80%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#022c22" />
                        </radialGradient>
                        <radialGradient id="ff3dSat2" cx="35%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#e0f2fe" />
                          <stop offset="45%" stopColor="#38bdf8" />
                          <stop offset="85%" stopColor="#0284c7" />
                          <stop offset="100%" stopColor="#082f49" />
                        </radialGradient>
                      </defs>

                      {/* Ambient Shadow under Pedestal */}
                      <ellipse cx="70" cy="118" rx="54" ry="14" fill="#000000" opacity="0.65" filter="url(#ff3dShadow)" />

                      {/* 3D Pedestal Cylinder Rim Depth Wall */}
                      <path d="M26 106 C26 116 114 116 114 106 L114 112 C114 122 26 122 26 112 Z" fill="url(#ff3dPedestalRim)" />

                      {/* Pedestal Top Disc */}
                      <ellipse cx="70" cy="106" rx="44" ry="12" fill="url(#ff3dPedestalStage)" stroke="#10b981" strokeWidth="1" />
                      {/* Neon Laser Ring */}
                      <ellipse cx="70" cy="106" rx="39" ry="9.5" fill="none" stroke="#6ee7b7" strokeWidth="1.2" strokeDasharray="3 3" />
                      <ellipse cx="70" cy="106" rx="32" ry="7.5" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.6" />

                      {/* Volumetric Hologram Projection Beam */}
                      <polygon points="46,106 94,106 108,30 32,30" fill="url(#ff3dHoloBeam)" />

                      {/* Gyroscopic Cyber Orbit 1 */}
                      <ellipse cx="70" cy="58" rx="58" ry="24" fill="none" stroke="url(#ffOrbitGrad)" strokeWidth="1.3" strokeDasharray="4 2" transform="rotate(-20 70 58)" />

                      {/* Multi-Layered Floating Exam Document Parchment Stack */}
                      {/* Bottom Layer Shadow Sheet */}
                      <polygon points="44,56 86,34 104,64 62,86" fill="#022c22" stroke="#047857" strokeWidth="0.8" opacity="0.6" />
                      {/* Middle Sheet */}
                      <polygon points="40,50 82,28 100,58 58,80" fill="url(#ff3dDocMid)" stroke="#10b981" strokeWidth="0.9" opacity="0.85" />

                      {/* Primary Top 3D Extruded Document Slab */}
                      {/* Left Extrusion Wall */}
                      <polygon points="36,44 54,74 54,77 36,47" fill="#044e3b" stroke="#065f46" strokeWidth="0.5" />
                      {/* Bottom Extrusion Wall */}
                      <polygon points="54,74 96,52 96,55 54,77" fill="#022c22" stroke="#044e3b" strokeWidth="0.5" />
                      {/* Top Isometric Face */}
                      <polygon points="36,44 78,22 96,52 54,74" fill="url(#ff3dDocFace)" stroke="#a7f3d0" strokeWidth="1" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))" />

                      {/* Folded 3D Corner at Top-Right */}
                      <polygon points="90,49 96,52 92,58" fill="#024433" />
                      <polygon points="90,49 88,55 92,58" fill="#a7f3d0" stroke="#34d399" strokeWidth="0.6" />

                      {/* Document Top Header Banner */}
                      <polygon points="39,43 56,34 62,43 45,52" fill="url(#ff3dHeaderBanner)" opacity="0.9" />
                      {/* Form Fill Lines & Official Text Tracks */}
                      <line x1="48" y1="49" x2="68" y2="39" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                      <line x1="50" y1="54" x2="78" y2="40" stroke="#a7f3d0" strokeWidth="1.3" strokeLinecap="round" />
                      <line x1="52" y1="58" x2="82" y2="43" stroke="#6ee7b7" strokeWidth="1.3" strokeLinecap="round" />
                      <line x1="54" y1="62" x2="76" y2="51" stroke="#34d399" strokeWidth="1.1" strokeLinecap="round" />
                      {/* Mini Checkbox Fields */}
                      <rect x="42" y="55" width="2.5" height="2.5" fill="#10b981" transform="rotate(-25 42 55)" />
                      <rect x="45" y="60" width="2.5" height="2.5" fill="#10b981" transform="rotate(-25 45 60)" />

                      {/* Removed Official Examination Board Verified Stamp as requested */}


                      {/* 3D Holographic Laser Drafting Stylus / Quill */}
                      <polygon points="98,18 106,14 116,34 108,38" fill="url(#ff3dStylusShaft)" stroke="#6ee7b7" strokeWidth="0.8" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))" />
                      <polygon points="94,26 102,22 105,28 97,32" fill="url(#ff3dStylusGrip)" />
                      <polygon points="92,30 96,28 88,44" fill="#a7f3d0" />
                      {/* Glowing Laser Nib & Emission Beam */}
                      <circle cx="88" cy="44" r="2.2" fill="#ffffff" filter="url(#ffGlowFilter)" />
                      <line x1="88" y1="44" x2="72" y2="52" stroke="#67e8f9" strokeWidth="1.8" strokeDasharray="3 1.5" strokeLinecap="round" filter="url(#ffGlowFilter)" />

                      {/* 3D Golden Wax Seal / Rosette (Floating Lower Left) */}
                      <polygon points="32,74 26,86 34,82" fill="#713f12" />
                      <polygon points="34,74 36,86 42,82" fill="#a16207" />
                      <circle cx="34" cy="74" r="9" fill="url(#ff3dGoldSeal)" stroke="#fef08a" strokeWidth="1" filter="drop-shadow(0 4px 8px rgba(234,179,8,0.5))" />
                      <circle cx="34" cy="74" r="6" fill="#ca8a04" />
                      <path d="M31 74 L33 71 L37 71 L34 74 L36 77 L31 77 Z" fill="#fef9c3" />

                      {/* 3D Escrow Safe Vault Box (Floating Lower Right) */}
                      <polygon points="102,76 116,68 106,62 92,70" fill="url(#ff3dVaultTop)" stroke="#34d399" strokeWidth="0.8" />
                      <polygon points="92,70 102,76 102,88 92,82" fill="url(#ff3dVaultLeft)" stroke="#059669" strokeWidth="0.5" />
                      <polygon points="102,76 116,68 116,80 102,88" fill="url(#ff3dVaultRight)" stroke="#047857" strokeWidth="0.5" />
                      {/* Golden Dial */}
                      <ellipse cx="109" cy="74" rx="3.5" ry="4.5" fill="url(#ff3dGoldDial)" stroke="#fef08a" strokeWidth="0.8" />
                      <circle cx="109" cy="74" r="1.5" fill="#fef9c3" />
                      {/* Floating Mini Escrow Shield over Vault */}
                      <path d="M104 58 L110 55 L116 58 L116 64 C116 68 110 71 110 71 C110 71 104 68 104 64 Z" fill="url(#ff3dEscrowShield)" stroke="#6ee7b7" strokeWidth="0.8" filter="url(#ffGlowFilter)" />
                      <path d="M107 63 L109 65 L113 60" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

                      {/* 3D Floating Biometric ID Photo Card (Floating Upper Left) */}
                      <polygon points="20,38 38,28 46,42 28,52" fill="url(#ff3dMiniCard)" stroke="#34d399" strokeWidth="0.8" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.5))" />
                      <polygon points="23,39 31,34 33,40 25,45" fill="#047857" stroke="#6ee7b7" strokeWidth="0.5" />
                      <circle cx="28" cy="38" r="1.6" fill="#d1fae5" />
                      {/* Removed Verified Check Badge as requested */}


                      {/* Gyroscopic Cyber Orbit 2 */}
                      <ellipse cx="70" cy="58" rx="54" ry="20" fill="none" stroke="url(#ffOrbitGrad2)" strokeWidth="1.1" transform="rotate(35 70 58)" />

                      {/* Floating 3D Metallic Satellites */}
                      {/* Satellite 1 (Right) */}
                      <circle cx="120" cy="72" r="4.5" fill="url(#ff3dSat1)" filter="drop-shadow(0 0 6px #34d399)" />
                      <circle cx="118.5" cy="70.5" r="1.3" fill="#ffffff" />
                      {/* Satellite 2 (Left) */}
                      <circle cx="20" cy="68" r="3.5" fill="url(#ff3dSat2)" filter="drop-shadow(0 0 5px #38bdf8)" />
                      <circle cx="19" cy="67" r="1" fill="#ffffff" />
                      {/* Satellite 3 (Top Apex) */}
                      <circle cx="68" cy="14" r="3.2" fill="#a7f3d0" filter="drop-shadow(0 0 5px #34d399)" />
                      <circle cx="67" cy="13" r="1" fill="#ffffff" />

                      {/* Ambient Sparkles */}
                      <circle cx="86" cy="18" r="1" fill="#a7f3d0" opacity="0.8" />
                      <circle cx="50" cy="18" r="1" fill="#34d399" opacity="0.8" />
                      <circle cx="98" cy="88" r="1.2" fill="#6ee7b7" opacity="0.7" />
                      <circle cx="38" cy="94" r="1" fill="#22d3ee" opacity="0.7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 2. FORM FILLER EXPERT CARD CONTENT (CHILD 2 OF PORTAL 3) */}
              <div className="bg-[#030C09]/95 backdrop-blur-2xl rounded-b-[22px] p-7 sm:p-8 pt-5 flex flex-col justify-between flex-1 relative overflow-hidden border border-white/[0.08] border-t-0 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.8)] space-y-6">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                    {t('Form Filler Expert', 'फॉर्म फिलर एक्सपर्ट (Exam Specialist)')}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {t('Competitive exam & government job application bidding', 'प्रतियोगी परीक्षा एवं सरकारी भर्ती फॉर्म आवेदन')}
                  </p>
                </div>

                {/* High-Value Feature Micro-Cards */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('Custom Exam Form Bidding & Order Queue', 'कस्टम परीक्षा फॉर्म बिडिंग एवं आर्डर कतार')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('Live Direct Operator Call Panel with Citizen', 'नागरिक के साथ लाइव ऑडियो कॉल सुविधा')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium">
                      {t('Direct UPI payment; recipient confirmation required', 'सीधा UPI भुगतान; प्राप्तकर्ता की पुष्टि आवश्यक')}
                    </span>
                  </div>
                </div>

                {/* Interactive State-Of-The-Art Action Button */}
                <div className="pt-2 relative z-10">
                  <button
                    onClick={() => openPortalOrLogin('form_filler')}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-600 text-white font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-[0.98] group/btn cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-200" />
                    <span>{t('Filler Secure Login', 'फॉर्म फिलर सुरक्षित लॉगिन')}</span>
                    <ArrowRight className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform ml-1" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* 🛡️ Platform Admin — Bot Attack Log (ADMIN_TOKEN required) */}
          {typeof window !== 'undefined' && (
            (window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1' ||
              new URLSearchParams(window.location.search).get('admin') === '1' ||
              sessionStorage.getItem('digiseva_admin_token') ||
              localStorage.getItem('digiseva_admin_token'))
          ) && (
            <div className="flex justify-center">
              <button
                onClick={() => setStep('admin_security')}
                title="Restricted to authorized platform admin only"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.06] text-slate-500 hover:text-rose-300 text-[11px] font-bold tracking-wide transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t('Platform Admin • Security Console', 'प्लेटफ़ॉर्म एडमिन • सुरक्षा कंंसोल')}</span>
              </button>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* 🛡️ ADMIN SECURITY CONSOLE (bot attack log + IP blocklist)                    */}
      {/* ========================================================================= */}
      {step === 'admin_security' && (
        <AdminSecurityPanel onBack={() => setStep('landing')} language={lang} />
      )}

      {/* ========================================================================= */}
      {/* 2. CITIZEN LOGIN (ULTRA-PREMIUM 3D CLIENT REGISTRATION & ACCESS)         */}
      {/* ========================================================================= */}
      {step === 'client_login' && (
        <main className="flex-1 w-full min-w-0 max-w-lg mx-auto box-border px-4 py-8 sm:py-12">
          {/* 3D Multi-Layer Container with Bevel & Specular Highlight */}
          <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-cyan-400/80 via-blue-500/40 to-indigo-600/70 shadow-[0_25px_60px_-15px_rgba(6,182,212,0.3),0_15px_30px_-10px_rgba(2,6,23,0.8)] transition-all duration-500 hover:shadow-[0_35px_80px_-15px_rgba(6,182,212,0.4)] group">
            
            {/* Top 3D Specular Highlight Line */}
            <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />

            <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-6 sm:p-10 relative overflow-hidden space-y-6 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-2px_6px_rgba(0,0,0,0.8)]">
              
              {/* Ambient 3D Background Glows */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-[90px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[90px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              
              {/* 3D Cyber Grid Micro Pattern */}
              <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34,211,238,0.9) 1px, transparent 0)`,
                  backgroundSize: '20px 20px'
                }}
              />



              <button
                onClick={() => {
                  if (clientOtpSent) {
                    setClientOtpSent(false);
                    setClientMobileOtpCode('');
                    setClientAuthError('');
                  } else {
                    setStep('landing');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 hover:text-white border border-white/[0.1] text-xs font-bold transition-all shadow-sm active:scale-95 mb-2"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span>{clientOtpSent ? 'Back' : 'Back to Home'}</span>
              </button>

              {/* 3D Emblem & Header with Consistent Brand Identity */}
              <div className="text-center space-y-3 relative z-10">
                <div className="flex justify-center">
                  <BrandEmblem3D size="lg" layout="col" subtitle="CITIZEN & CLIENT ACCESS" />
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 font-['Inter',sans-serif] tracking-tight">
                    Citizen Portal Gateway
                  </h2>

                </div>
              </div>

              {!clientOtpSent ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setClientAuthError('');
                  const missingClientFields = collectMissingFields([
                    { label: 'Full Name', ok: isNonEmpty(clientName) },
                    { label: '10-Digit Mobile Number', ok: isValidMobile(clientPhone) },
                    { label: 'Gmail ID / Email', ok: isValidEmail(clientEmail) },
                    { label: 'State / UT', ok: isNonEmpty(clientState) },
                    { label: 'District', ok: isNonEmpty(clientDistrictFilter) },
                    { label: 'City / Tehsil', ok: isNonEmpty(clientCityFilter) },
                  ]);
                  if (missingClientFields.length > 0) {
                    setClientAuthError(requiredFieldsMessage(missingClientFields));
                    return;
                  }
                  setIsClientAuthBusy(true);
                  try {
                    const captchaToken = await getCaptchaToken();
                    const response = await fetchWithRetry('/api/auth/send-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ channel: 'both', target: clientPhone, emailTarget: clientEmail, role: 'client', name: clientName, captchaToken })
                    });
                    const data = await parseJsonResponse(response);
                    if (!response.ok || !data.success) {
                      throw new Error(data.error || ('Could not send the verification code. (HTTP ' + response.status + ') body=' + JSON.stringify(data)));
                    }
                    setClientOtpDeliveryMessage(data.message || '');
                    setClientMobileOtpCode('');
                    setClientOtpSent(true);
                  } catch (error) {
                    setClientAuthError(error instanceof Error ? error.message : 'Could not start verification. Please try again.');
                  } finally {
                    setIsClientAuthBusy(false);
                  }
                }} className="space-y-4 relative z-10">
                  
                  {/* Field 1: Full Name */}
                  <div className="space-y-1.5">
                    <label className="h-5 flex items-center justify-between text-xs font-semibold text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{t('Full Name (As per ID)', 'पूरा नाम (पहचान पत्र अनुसार)')}</span>
                      </span>
                    </label>
                    <div className="h-12 relative rounded-2xl bg-[#090F1D]/90 border border-white/[0.08] focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] transition-all flex items-center">
                      <input
                        type="text"
                        required
                        maxLength={50}
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value.slice(0, 50))}
                        placeholder={t('Enter Full Name as per ID', 'पूरा नाम (पहचान पत्र अनुसार दर्ज करें)')}
                        className="w-full h-full px-4 bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-zinc-500 min-w-0"
                      />
                    </div>
                  </div>

                  {/* Mobile Number & Gmail */}
                  <div className="space-y-4 w-full">
                    {/* Mobile Number */}
                    <div className="space-y-1.5">
                      <label className="h-5 flex items-center justify-between text-xs font-semibold text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{t('Mobile Number', 'मोबाइल नंबर')}</span>
                        </span>
                        <span className="text-[11px] font-mono text-cyan-400 font-semibold">+91</span>
                      </label>
                      <div className="h-12 relative rounded-2xl bg-[#090F1D]/90 border border-white/[0.08] focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] transition-all flex items-center">
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder={t('Enter 10-Digit Mobile Number', '10 अंकों का मोबाइल नंबर दर्ज करें')}
                          className="w-full h-full px-4 bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-zinc-500 min-w-0"
                        />
                      </div>
                    </div>

                    {/* Gmail ID */}
                    <div className="space-y-1.5">
                      <label className="h-5 flex items-center justify-between text-xs font-semibold text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{t('Gmail ID / Email Address', 'जीमेल आईडी / ईमेल पता')}</span>
                        </span>
                      </label>
                      <div className="h-12 relative rounded-2xl bg-[#090F1D]/90 border border-white/[0.08] focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] transition-all flex items-center">
                        <input
                          type="text"
                          name="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          required
                          maxLength={60}
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value.slice(0, 60))}
                          placeholder="name@example.com"
                          className="w-full h-full px-4 bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-zinc-500 min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* State / UT */}
                  <div className="space-y-1.5 w-full">
                    <label className="h-5 flex items-center text-xs font-semibold text-zinc-300">
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" /><span>{t('State / UT', 'राज्य / केंद्र शासित प्रदेश')}</span></span>
                    </label>
                    <div className="h-12 relative rounded-2xl bg-[#090F1D]/90 border border-white/[0.08] focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] transition-all flex items-center">
                      <StateSelect
                        value={clientState}
                        onChange={setClientState}
                        options={INDIAN_STATES}
                        emptyLabel="Select your State / UT"
                        ariaLabel="State / UT"
                        className="w-full h-full px-4 pr-9 bg-transparent text-white text-sm font-medium focus:outline-none min-w-0"
                      />
                    </div>
                  </div>

                  {/* Dual Field: District & City */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {/* District */}
                    <div className="space-y-1.5 flex flex-col min-w-0">
                      <label className="h-5 flex items-center justify-between text-xs font-semibold text-zinc-300">
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{t('District', 'जिला')}</span>
                        </span>
                      </label>
                      <div className="h-12 relative rounded-2xl bg-[#090F1D]/90 border border-white/[0.08] focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] transition-all flex items-center">
                        <LocationAutocomplete
                          value={clientDistrictFilter}
                          onChange={(val) => setClientDistrictFilter(val.slice(0, 40))}
                          preferType="district"
                          state={clientState}
                          placeholder="Lucknow / Kanpur"
                          wrapperClassName="w-full h-full flex items-center"
                          className="w-full h-full px-4 bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-zinc-500 min-w-0"
                        />
                      </div>
                    </div>

                    {/* City / Tehsil */}
                    <div className="space-y-1.5 flex flex-col min-w-0">
                      <label className="h-5 flex items-center justify-between text-xs font-semibold text-zinc-300">
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{t('City / Tehsil', 'शहर / तहसील')}</span>
                        </span>
                      </label>
                      <div className="h-12 relative rounded-2xl bg-[#090F1D]/90 border border-white/[0.08] focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] transition-all flex items-center">
                        <LocationAutocomplete
                          value={clientCityFilter}
                          onChange={(val) => setClientCityFilter(val.slice(0, 40))}
                          preferType="city"
                          state={clientState}
                          placeholder="e.g. Sadar"
                          wrapperClassName="w-full h-full flex items-center"
                          className="w-full h-full px-4 bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-zinc-500 min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clean Professional Action Button */}
                  {clientAuthError && (
                    <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                      {clientAuthError}
                    </p>
                  )}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isClientAuthBusy}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/40 border-t border-t-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group/btn"
                    >
                      <span>{isClientAuthBusy ? 'Sending code…' : t('Send Verification Code', 'सत्यापन कोड भेजें')}</span>
                      <ArrowRight className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <GoogleSignInButton
                    onCredential={handleClientGoogleCredential}
                    disabled={isClientAuthBusy}
                  />
                </form>
              ) : (
                <form id="client-otp-verify-form" onSubmit={async (e) => {
                  e.preventDefault();
                  if (isClientAuthBusy || clientVerifyLockRef.current) return;
                  setClientAuthError('');
                  if (clientMobileOtpCode.length !== 4) {
                    setClientAuthError('');
                    return;
                  }
                  const missingClientVerifyFields = collectMissingFields([
                    { label: 'Full Name', ok: isNonEmpty(clientName) },
                    { label: '10-Digit Mobile Number', ok: isValidMobile(clientPhone) },
                    { label: 'Gmail ID / Email', ok: isValidEmail(clientEmail) },
                    { label: 'State / UT', ok: isNonEmpty(clientState) },
                    { label: 'District', ok: isNonEmpty(clientDistrictFilter) },
                    { label: 'City / Tehsil', ok: isNonEmpty(clientCityFilter) },
                  ]);
                  if (missingClientVerifyFields.length > 0) {
                    setClientAuthError(requiredFieldsMessage(missingClientVerifyFields));
                    return;
                  }
                  clientVerifyLockRef.current = true;
                  setIsClientAuthBusy(true);
                  try {
                    const verifyResponse = await fetchWithRetry('/api/auth/verify-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ target: clientPhone, code: clientMobileOtpCode })
                    });
                    const verifyData = await parseJsonResponse(verifyResponse);
                    if (!verifyResponse.ok || !verifyData.verified) {
                      throw new Error(verifyData.error || 'Invalid OTP. Check the code and try again.');
                    }
                    if (!verifyData.verificationToken) {
                      throw new Error('OTP verification expired. Request a new code.');
                    }

                    const loginResponse = await fetchWithRetry('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: clientName,
                        phone: clientPhone,
                        email: clientEmail,
                        state: clientState,
                        district: clientDistrictFilter,
                        city: clientCityFilter,
                        role: 'client',
                        verificationToken: verifyData.verificationToken
                      })
                    });
                    const loginData = await parseJsonResponse(loginResponse);
                    if (!loginResponse.ok || !loginData.success) {
                      throw new Error(loginData.error || 'Login failed after verification. Please try again.');
                    }
                    // Use the saved server account, so the user's real stored
                    // details always appear on the dashboard after login.
                    const savedUser = loginData.user || {};
                    const resolvedName = String(savedUser.name || clientName || '').trim();
                    const resolvedPhone = String(savedUser.phone || clientPhone || '').replace(/\D/g, '').slice(-10);
                    const resolvedEmail = String(savedUser.email || clientEmail || '').trim().toLowerCase();
                    const resolvedState = String(savedUser.state || clientState || '').trim();
                    const rawDistrict = String(savedUser.district || clientDistrictFilter || '').trim();
                    const resolvedDistrict = sameAsStateValue(rawDistrict, resolvedState) ? '' : rawDistrict;
                    const rawCity = String(savedUser.city || clientCityFilter || '').trim();
                    const resolvedCity = sameAsStateValue(rawCity, resolvedState) ? '' : rawCity;

                    if (resolvedName) setClientName(resolvedName);
                    if (resolvedPhone) setClientPhone(resolvedPhone);
                    if (resolvedEmail) setClientEmail(resolvedEmail);
                    if (resolvedState) setClientState(resolvedState);
                    if (resolvedDistrict) setClientDistrictFilter(resolvedDistrict);
                    if (resolvedCity) setClientCityFilter(resolvedCity);

                    localStorage.setItem('client_name', resolvedName || clientName);
                    localStorage.setItem('client_phone', resolvedPhone || clientPhone);
                    localStorage.setItem('client_email', resolvedEmail || clientEmail);
                    localStorage.setItem('client_state', resolvedState || clientState);
                    if (resolvedDistrict) localStorage.setItem('client_district', resolvedDistrict);
                    if (resolvedCity) localStorage.setItem('client_city', resolvedCity);
                    writeStoredSession({
                      role: 'client',
                      name: resolvedName || clientName,
                      phone: resolvedPhone || clientPhone,
                      email: resolvedEmail || clientEmail,
                      state: resolvedState || clientState,
                      district: resolvedDistrict || clientDistrictFilter,
                      city: resolvedCity || clientCityFilter,
                      token: loginData.token,
                      loggedInAt: Date.now()
                    });
                    setIsClientLoggedIn(true);
                    setActiveRole('client');
                    setPendingRole('client');
                    setLegalAccepted(false);
                    try { localStorage.removeItem(LEGAL_ACCEPTED_KEY); } catch {}
                    setShowLegalModal(true);
                  } catch (error) {
                    setClientAuthError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
                  } finally {
                    clientVerifyLockRef.current = false;
                    setIsClientAuthBusy(false);
                  }
                }} className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {t('Enter the 4-digit code sent to your Gmail:', 'Gmail पर भेजा गया 4 अंकों का कोड दर्ज करें:')}
                    </span>
                  </div>

                  <div className="w-full">
                    <div className="space-y-1.5 flex flex-col min-w-0">
                      <div className="h-5 flex items-center">
                        <label className="text-[11px] font-bold text-emerald-400 tracking-wider truncate flex items-center gap-1.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span>{t('Gmail OTP', 'Gmail OTP')}</span>
                        </label>
                      </div>
                      <div className="h-12 relative rounded-2xl bg-[#090F1D]/90 border border-white/[0.08] focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] transition-all flex items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          required
                          autoFocus
                          autoComplete="one-time-code"
                          value={clientMobileOtpCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setClientMobileOtpCode(val);
                          }}
                          placeholder="• • • •"
                          className="w-full h-full px-3 bg-transparent text-white text-center text-lg font-black tracking-[0.4em] focus:outline-none min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    {clientOtpDeliveryMessage || t(`We sent a code to ${clientEmail}.`, `${clientEmail} पर कोड भेजा गया है।`)}
                  </p>
                  {clientAuthError && (
                    <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                      {clientAuthError}
                    </p>
                  )}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isClientAuthBusy || clientMobileOtpCode.length !== 4}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/40 border-t border-t-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group/btn"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-100 group-hover/btn:scale-110 transition-transform" />
                      <span>{isClientAuthBusy ? 'Verifying…' : t('Verify & Access Citizen Portal', 'सत्यापित करें एवं नागरिक पोर्टल खोलें')}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isClientAuthBusy) return;
                      setClientOtpSent(false);
                      setClientMobileOtpCode('');
                      setClientAuthError('');
                    }}
                    className="w-full text-center text-xs text-zinc-400 hover:text-emerald-300 transition-colors pt-1"
                  >
                    ← Edit Details / Resend Verification Code
                  </button>
                </form>
              )}



            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 3. CITIZEN PORTAL (With Live Orders, Direct Apply with Rajesh, Chat & Call) */}
      {/* ========================================================================= */}
      {step === 'client_portal' && activeRole === 'client' && (
        <main
          ref={clientPortalTopRef}
          id="client-portal-top"
          className="flex-1 w-full min-w-0 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 box-border scroll-mt-20"
        >
          
          {/* Top Quick Navigation & Back Bar */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                if (clientPortalTab === 'home') {
                  setStep('landing');
                  setActiveRole('none');
                } else {
                  setClientPortalTab('home');
                }
              }}
              className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-blue-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>{clientPortalTab === 'home' ? 'Back to Home' : 'Back to Dashboard'}</span>
            </button>
            {clientPortalTab !== 'home' && (
              <span className="truncate text-xs sm:text-sm font-black text-slate-200">
                {(clientPortalTab as string) === 'notifications' ? '💬 Live Chats & Notifications'
                  : (clientPortalTab as string) === 'services' ? '🏛️ All Jan Seva Kendra Services'
                  : (clientPortalTab as string) === 'orders' ? '⚡ Active Ongoing Orders'
                  : (clientPortalTab as string) === 'form_filling' ? '📝 Online Form Filling'
                  : (clientPortalTab as string) === 'jan_seva_docs' ? '🪪 Jan Seva Kendra Documents'
                  : clientPortalTab === 'custom_form' ? '✍️ Custom Form' : ''}
              </span>
            )}
          </div>
          
          {clientPortalTab === 'home' && (
            <>
          {/* ========================================================================= */}
          {/* CLIENT HOME BRAND HEADER: 3D LOGO, WEBSITE NAME & 4-BOX "HOW IT WORKS"   */}
          {/* ========================================================================= */}
          <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-cyan-400/80 via-blue-500/40 to-indigo-600/70 shadow-[0_25px_60px_-15px_rgba(6,182,212,0.25),0_15px_30px_-10px_rgba(2,6,23,0.8)] transition-all duration-500 group">
            
            {/* Top 3D Specular Highlight Line */}
            <div className="absolute top-0 left-12 right-12 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />

            <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-6 sm:p-10 relative overflow-hidden text-center space-y-8 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              {/* Subtle background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-cyan-500/15 blur-3xl pointer-events-none rounded-full" />
              <div className="absolute top-1/2 right-10 w-64 h-64 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />

              {/* 1. Official 3D Computer Logo + F + ILLUP + Signature ECG Line */}
              <div className="flex flex-col items-center justify-center space-y-3 relative z-10">
                <BrandEmblem3D
                  size="lg"
                  layout="col"
                  subtitle="DIGITAL JAN SEVA KENDRA NETWORK • DIRECT OPERATOR CONNECT"
                />
              </div>

            {/* 3. "Website Kaise Kaam Karti Hai? (How It Works)" in 4 Boxes */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80 relative z-10 text-left">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>{t('How It Works • 4 Simple Steps', 'कार्य प्रणाली • 4 आसान चरण')}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5">
                    {t('How The Platform Works', 'मंच कैसे काम करता है?')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t(
                      'Your application is processed by certified digital operators in 4 simple and secure steps:',
                      'प्रमाणित जन सेवा केंद्र ऑपरेटरों द्वारा 4 आसान व सुरक्षित चरणों में आवेदन प्रक्रिया:'
                    )}
                  </p>
                </div>
              </div>

              {/* 4 BOXES GRID (3D EMBOSSED & REAL WORKFLOW EXPLANATION) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-3">
                {/* 3D Box 1: Select Service / Custom Form */}
                <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-amber-400/80 via-orange-500/35 to-slate-900/90 shadow-[0_20px_45px_-15px_rgba(245,158,11,0.25),0_10px_20px_-10px_rgba(0,0,0,0.8)] hover:shadow-[0_25px_55px_-10px_rgba(245,158,11,0.45)] hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 group flex flex-col cursor-default">
                  <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-amber-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />
                  
                  <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-5 sm:p-6 space-y-4 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col justify-between h-full">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 p-[1.5px] shadow-[0_8px_20px_rgba(245,158,11,0.35)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center text-amber-400">
                            <FileText className="w-6 h-6" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 font-mono border border-amber-500/35 shadow-[0_2px_10px_rgba(245,158,11,0.2)] tracking-wider">
                          01 • {t('REQUEST', 'सेवा चयन')}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-amber-300 transition-colors font-['Outfit']">
                          {t('1. Select Service or Write Form', '1. सेवा चुनें या फॉर्म विवरण लिखें')}
                        </h4>
                        <p className="text-xs text-slate-300/90 mt-1.5 leading-relaxed">
                          {t(
                            'Choose from 20+ verified CSC citizen services (PAN, Domicile, Income, Caste, Ration) or type your exact custom application details in our Custom Form Writer.',
                            '20+ सत्यापित जन सेवा केंद्र सेवाओं (पैन कार्ड, आय, जाति, निवास, राशन कार्ड) में से चुनें या कस्टम फॉर्म में अपनी आवश्यकता दर्ज करें।'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3D Box 2: Direct Operator Connect & Live 2-Way Chat */}
                <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-cyan-400/80 via-sky-500/35 to-slate-900/90 shadow-[0_20px_45px_-15px_rgba(6,182,212,0.25),0_10px_20px_-10px_rgba(0,0,0,0.8)] hover:shadow-[0_25px_55px_-10px_rgba(6,182,212,0.45)] hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 group flex flex-col cursor-default">
                  <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />
                  
                  <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-5 sm:p-6 space-y-4 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col justify-between h-full">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 p-[1.5px] shadow-[0_8px_20px_rgba(6,182,212,0.35)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center text-cyan-400">
                            <MessageSquare className="w-6 h-6" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 font-mono border border-cyan-500/35 shadow-[0_2px_10px_rgba(6,182,212,0.2)] tracking-wider">
                          02 • {t('LIVE CONNECT', 'लाइव कनेक्ट')}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors font-['Outfit']">
                          {t('2. Live Chat & Direct Voice Call', '2. लाइव चैट व ऑपरेटर से ऑडियो कॉल')}
                        </h4>
                        <p className="text-xs text-slate-300/90 mt-1.5 leading-relaxed">
                          {t(
                            'Once an expert operator accepts your request, talk live in real-time via built-in audio calls and chat to clarify documents and share details securely.',
                            'ऑपरेटर द्वारा आवेदन स्वीकार करते ही सुरक्षित रूप से चैट व सीधे ऑडियो कॉल पर बात कर दस्तावेज़ साझा करें।'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3D Box 3: Official Filing & Photo Proof Receipt */}
                <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-purple-400/80 via-indigo-500/35 to-slate-900/90 shadow-[0_20px_45px_-15px_rgba(168,85,247,0.25),0_10px_20px_-10px_rgba(0,0,0,0.8)] hover:shadow-[0_25px_55px_-10px_rgba(168,85,247,0.45)] hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 group flex flex-col cursor-default">
                  <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-purple-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />
                  
                  <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-5 sm:p-6 space-y-4 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col justify-between h-full">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 via-indigo-500 to-violet-600 p-[1.5px] shadow-[0_8px_20px_rgba(168,85,247,0.35)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center text-purple-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 font-mono border border-purple-500/35 shadow-[0_2px_10px_rgba(168,85,247,0.2)] tracking-wider">
                          03 • {t('PHOTO PROOF', 'फोटो प्रूफ')}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-purple-300 transition-colors font-['Outfit']">
                          {t('3. Official Portal Filing & Photo Proof', '3. आधिकारिक पोर्टल आवेदन व फोटो प्रूफ')}
                        </h4>
                        <p className="text-xs text-slate-300/90 mt-1.5 leading-relaxed">
                          {t(
                            'The operator fills the official government portal, drafts the application, and uploads high-resolution photo proof and original acknowledgment slip for your inspection.',
                            'ऑपरेटर आधिकारिक सरकारी पोर्टल पर फॉर्म भरकर फाइनल रसीद व फोटो प्रूफ अपलोड करता है ताकि आप जांच सकें।'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3D Box 4: Safe Payment & Instant WhatsApp Delivery */}
                <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-emerald-400/80 via-teal-500/35 to-slate-900/90 shadow-[0_20px_45px_-15px_rgba(16,185,129,0.25),0_10px_20px_-10px_rgba(0,0,0,0.8)] hover:shadow-[0_25px_55px_-10px_rgba(16,185,129,0.45)] hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 group flex flex-col cursor-default">
                  <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />
                  
                  <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-5 sm:p-6 space-y-4 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col justify-between h-full">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-green-600 p-[1.5px] shadow-[0_8px_20px_rgba(16,185,129,0.35)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center text-emerald-400">
                            <Smartphone className="w-6 h-6" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/35 shadow-[0_2px_10px_rgba(16,185,129,0.2)] tracking-wider">
                          04 • {t('WHATSAPP DELIVERY', 'व्हाट्सएप डिलीवरी')}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors font-['Outfit']">
                          {t('4. Safe In-App Payment & WhatsApp Delivery', '4. सुरक्षित एस्क्रो भुगतान व व्हाट्सएप डिलीवरी')}
                        </h4>
                        <p className="text-xs text-slate-300/90 mt-1.5 leading-relaxed">
                          {t(
                            'Inspect the photo proof, pay using the displayed UPI details, and get your application credentials ready to share. WhatsApp opens a prepared message that you must send manually.',
                            'रसीद व फोटो देखकर सुरक्षित यूपीआई एस्क्रो भुगतान करें। आवेदन संख्या, पावती पर्ची और पीडीएफ तुरंत आपके व्हाट्सएप व जीमेल पर प्राप्त होगी।'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* CITIZEN PROFILE & LOCATION BAR (CLEAN & COMPACT)                          */}
          {/* ========================================================================= */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/30 via-slate-900 to-blue-950 border border-cyan-400/40 p-1 flex items-center justify-center shadow-[0_6px_20px_rgba(6,182,212,0.35)] shrink-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyan-400/10 rounded-2xl blur-sm pointer-events-none" />
                <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(6,182,212,0.5)]">
                  <defs>
                    <radialGradient id="grad3dAvatarBg" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#67e8f9" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#0e7490" />
                    </radialGradient>
                    <linearGradient id="grad3dAvatarHead" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#bae6fd" />
                    </linearGradient>
                    <linearGradient id="grad3dAvatarBody" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>
                  {/* Outer 3D Sphere */}
                  <circle cx="50" cy="50" r="44" fill="url(#grad3dAvatarBg)" />
                  <ellipse cx="40" cy="24" rx="20" ry="8" fill="#ffffff" opacity="0.35" />
                  {/* 3D Head */}
                  <circle cx="50" cy="38" r="15" fill="url(#grad3dAvatarHead)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
                  {/* 3D Torso */}
                  <path d="M26,76 C26,58 36,54 50,54 C64,54 74,58 74,76 Z" fill="url(#grad3dAvatarBody)" />
                  <path d="M30,76 C30,62 38,58 50,58 C62,58 70,62 70,76 Z" fill="#e0f2fe" opacity="0.3" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Welcome, {clientName || 'Citizen'}!</h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-slate-400">District:</span>
                <LocationAutocomplete
                  value={clientDistrictFilter}
                  onChange={setClientDistrictFilter}
                  preferType="district"
                  state={clientState}
                  wrapperClassName="w-24"
                  className="w-full px-1 py-0.5 bg-transparent border-b border-slate-700 text-white text-xs font-semibold focus:outline-none"
                />
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">City:</span>
                <LocationAutocomplete
                  value={clientCityFilter}
                  onChange={setClientCityFilter}
                  preferType="city"
                  state={clientState}
                  wrapperClassName="w-24"
                  className="w-full px-1 py-0.5 bg-transparent border-b border-slate-700 text-white text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>
            </>
          )}

          {clientOrderSuccessMsg && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between gap-3 text-blue-300 text-sm animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>{clientOrderSuccessMsg}</span>
              </div>
              <button onClick={() => setClientOrderSuccessMsg('')} className="text-blue-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {clientPortalTab === 'home' && (
            <>
          {/* ========================================================================= */}
          {/* 🎛️ TWO MAIN HERO OPTIONS RIGHT BELOW "HOW IT WORKS"                       */}
          {/* Option 1: Live Chats & Notifications | Option 2: All Jan Seva Services    */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                  Select Portal Section:
                </h3>
              </div>
            </div>

            {/* 2 MAIN HERO FEATURED ACTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HERO OPTION 1: CHATS & NOTIFICATIONS */}
              <div
                onClick={() => {
                  setClientPortalTab('notifications');
                  if (soundAlertEnabled) playChime();
                }}
                className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-xl ${
                  (clientPortalTab as string) === 'notifications'
                    ? 'bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-900 border-emerald-500 shadow-emerald-500/10 scale-[1.01]'
                    : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner relative overflow-hidden">
                      <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                        <defs>
                          <radialGradient id="gradBell3d" cx="35%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#93c5fd" />
                            <stop offset="35%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1e3a8a" />
                          </radialGradient>
                          <linearGradient id="ringBell3d" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                        {/* 3D Isometric Bell Body */}
                        <path d="M50 15 C35 15 25 35 25 55 L20 65 L80 65 L75 55 C75 35 65 15 50 15 Z" fill="url(#gradBell3d)" />
                        <ellipse cx="50" cy="65" rx="30" ry="8" fill="#1e40af" />
                        <ellipse cx="50" cy="65" rx="25" ry="6" fill="#1d4ed8" opacity="0.6" />
                        {/* Bell Top Loop */}
                        <circle cx="50" cy="15" r="5" fill="none" stroke="#60a5fa" strokeWidth="2.5" />
                        {/* Clapper */}
                        <circle cx="50" cy="72" r="4" fill="#60a5fa" filter="drop-shadow(0 0 4px #3b82f6)" />
                        {/* Floating Sound Waves */}
                        <path d="M15 45 Q5 45 5 35" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                        <path d="M85 45 Q95 45 95 35" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                        {/* Orbital Ring */}
                        <ellipse cx="50" cy="45" rx="40" ry="15" fill="none" stroke="url(#ringBell3d)" strokeWidth="1" strokeDasharray="4 3" transform="rotate(-15 50 45)" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white mt-1 group-hover:text-blue-300 transition-colors">
                        💬 Live Chats & Notifications
                      </h4>
                    </div>
                  </div>

                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    (clientPortalTab as string) === 'notifications' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    ✓
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-4 leading-relaxed relative z-10">
                  Live updates and operator responses appear here instantly. <b>Click any message to open the Live Chat Portal!</b>
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold relative z-10">
                  <span className="text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open Chats & Message Inbox</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {clientNotifications.length > 0 ? `${clientNotifications.length} Live Updates` : 'Ready & Connected'}
                  </span>
                </div>
              </div>

              {/* HERO OPTION 2: ALL JAN SEVA KENDRA SERVICES */}
              <div
                onClick={() => {
                  setClientPortalTab('services');
                  if (soundAlertEnabled) playChime();
                }}
                className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-xl ${
                  (clientPortalTab as string) === 'services'
                    ? 'bg-gradient-to-br from-sky-500/20 via-slate-900 to-slate-900 border-sky-400 shadow-sky-500/10 scale-[1.01]'
                    : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-sky-500/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all pointer-events-none" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner relative overflow-hidden">
                      <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]">
                        <defs>
                          <radialGradient id="gradKiosk3d" cx="35%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#7dd3fc" />
                            <stop offset="35%" stopColor="#0ea5e9" />
                            <stop offset="100%" stopColor="#0c4a6e" />
                          </radialGradient>
                          <linearGradient id="roofKiosk3d" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                        </defs>
                        {/* 3D Isometric Kiosk Body */}
                        <polygon points="20,40 80,40 80,80 20,80" fill="url(#gradKiosk3d)" />
                        <polygon points="20,40 50,20 80,40" fill="url(#roofKiosk3d)" />
                        {/* Window / Opening */}
                        <rect x="35" y="50" width="30" height="15" fill="#070a10" stroke="#38bdf8" strokeWidth="1" />
                        <rect x="38" y="53" width="24" height="9" fill="#0ea5e9" opacity="0.3" />
                        {/* Counter */}
                        <rect x="15" y="65" width="70" height="5" fill="#0369a1" />
                        {/* Floating Elements */}
                        <circle cx="20" cy="30" r="3" fill="#38bdf8" filter="drop-shadow(0 0 3px #0ea5e9)" />
                        <circle cx="80" cy="30" r="2" fill="#7dd3fc" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white mt-1 group-hover:text-sky-300 transition-colors">
                        🏛️ All Jan Seva Kendra Services
                      </h4>
                    </div>
                  </div>

                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    (clientPortalTab as string) === 'services' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    ✓
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-4 leading-relaxed relative z-10">
                  Explore all government and citizen services — PAN, Domicile, Income, Caste, Ration, Ayushman, and Driving License in one organized portal.
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold relative z-10">
                  <span className="text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Explore All Services</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* HERO OPTION 3: ONLINE FORM FILLING (NEET, JEE, SARKARI EXAMS, ADMISSIONS) */}
              <div
                onClick={() => {
                  setClientPortalTab('form_filling');
                  if (soundAlertEnabled) playChime();
                }}
                className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-xl ${
                  (clientPortalTab as string) === 'form_filling'
                    ? 'bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-900 border-emerald-400 shadow-emerald-500/10 scale-[1.01]'
                    : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner relative overflow-hidden">
                      <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                        <defs>
                          <linearGradient id="gradDoc3d" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a7f3d0" />
                            <stop offset="50%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#065f46" />
                          </linearGradient>
                          <linearGradient id="gradPen3d" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#047857" />
                          </linearGradient>
                        </defs>
                        {/* 3D Isometric Document */}
                        <path d="M30 20 L75 20 L80 85 L25 85 Z" fill="url(#gradDoc3d)" stroke="#059669" strokeWidth="1" />
                        <path d="M35 30 H65 M35 40 H70 M35 50 H60" stroke="#064e3b" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                        {/* Floating Pen */}
                        <path d="M60 10 L85 45" stroke="url(#gradPen3d)" strokeWidth="4" strokeLinecap="round" filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.5))" />
                        <circle cx="85" cy="45" r="1.5" fill="#10b981" />
                        {/* Checkmark Seal */}
                        <circle cx="35" cy="70" r="6" fill="#ecfdf5" stroke="#10b981" strokeWidth="1" />
                        <path d="M32 70 L34 72 L38 68" fill="none" stroke="#059669" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white mt-1 group-hover:text-emerald-300 transition-colors">
                        📝 Online Form Filling (NEET, JEE, Exams)
                      </h4>
                    </div>
                  </div>

                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    (clientPortalTab as string) === 'form_filling' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    ✓
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-4 leading-relaxed relative z-10">
                  Get your <b>NEET UG, JEE Mains, SSC CGL, Police Recruitment, UPSC, CUET or College Admission</b> forms filled. Simply enter the form name and details — certified expert typists will apply immediately!
                </p>

                {/* Popular Exam Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 relative z-10">
                  {['🎯 NEET 2026', '⚡ JEE Main', '📋 SSC CGL', '+ More Services'].map((examChip, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 text-[10px] font-semibold border border-slate-800">
                      {examChip}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold relative z-10">
                  <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>{t('Fill Exam Form Now (Enter Name & Description)', 'अभी परीक्षा फॉर्म भरें (नाम और विवरण दर्ज करें)')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* HERO OPTION 4: JAN SEVA KENDRA DOCUMENTS (PAN CARD, DOMICILE, INCOME, CASTE) */}
              <div
                onClick={() => {
                  setClientPortalTab('jan_seva_docs');
                  if (soundAlertEnabled) playChime();
                }}
                className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-xl ${
                  (clientPortalTab as string) === 'jan_seva_docs'
                    ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-amber-400 shadow-amber-500/10 scale-[1.01]'
                    : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-amber-500/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner relative overflow-hidden">
                      <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                        <defs>
                          <radialGradient id="gradCard3d" cx="35%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#fde68a" />
                            <stop offset="35%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#78350f" />
                          </radialGradient>
                          <linearGradient id="ringCard3d" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#d97706" />
                          </linearGradient>
                        </defs>
                        {/* 3D Isometric Card */}
                        <rect x="20" y="30" width="60" height="40" rx="4" fill="url(#gradCard3d)" transform="rotate(-5 50 50)" />
                        <rect x="25" y="35" width="20" height="20" rx="2" fill="#78350f" opacity="0.4" transform="rotate(-5 50 50)" />
                        <path d="M50 40 H70 M50 50 H65" stroke="#78350f" strokeWidth="2" strokeLinecap="round" opacity="0.5" transform="rotate(-5 50 50)" />
                        {/* Chip */}
                        <rect x="28" y="38" width="10" height="8" rx="1" fill="#fde68a" transform="rotate(-5 50 50)" />
                        {/* Holographic Shield */}
                        <path d="M75 15 L90 20 L90 35 L75 45 L60 35 L60 20 Z" fill="#f59e0b" opacity="0.8" filter="drop-shadow(0 0 4px #fbbf24)" />
                        <path d="M75 22 L83 26 L83 33 L75 38 L67 33 L67 26 Z" fill="#fef3c7" opacity="0.6" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white mt-1 group-hover:text-amber-300 transition-colors">
                        🪪 Jan Seva Kendra Documents & Official Rates
                      </h4>
                    </div>
                  </div>

                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    (clientPortalTab as string) === 'jan_seva_docs' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    ✓
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-4 leading-relaxed relative z-10">
                  Apply for official government certificates &amp; documents — <b>PAN Card (New/Correction), Domicile, Income, Caste, Ration Card, Ayushman Card</b>. Certified Jan Seva Kendra operators will process your application immediately!
                </p>

                {/* Popular Doc Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 relative z-10">
                  {['🪪 PAN Card', '📜 Niwas Praman', '🛡️ Jati Praman', '+ More Services'].map((docChip, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 text-[10px] font-semibold border border-slate-800">
                      {docChip}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold relative z-10">
                  <span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Apply For Documents (PAN Card, Certificates)</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* SECONDARY NAVIGATION BAR (Active Orders, Form Filling, Jan Seva Docs, Custom Form, All) */}
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-2 sm:p-3 flex items-center gap-2 overflow-x-auto scrollbar-none shadow-md">
              <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider hidden sm:inline flex-shrink-0">
                Navigation:
              </span>

              {/* Active Orders */}
              <button
                onClick={() => {
                  setClientPortalTab('orders');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  (clientPortalTab as string) === 'orders'
                    ? 'bg-indigo-600 text-white font-black shadow-md'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⚡ Active Ongoing Orders ({clientActiveOrders.length})</span>
              </button>

              {/* Form Filling (NEET, JEE, Exams) */}
              <button
                onClick={() => {
                  setClientPortalTab('form_filling');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  (clientPortalTab as string) === 'form_filling'
                    ? 'bg-emerald-600 text-white font-black shadow-md'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>📝 Form Filling (NEET/Exams)</span>
              </button>

              {/* Jan Seva Docs (PAN, Certificates) */}
              <button
                onClick={() => {
                  setClientPortalTab('jan_seva_docs');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  (clientPortalTab as string) === 'jan_seva_docs'
                    ? 'bg-amber-600 text-white font-black shadow-md'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>🪪 Jan Seva Docs (PAN/Certificates)</span>
              </button>

              {/* All Services */}
              <button
                onClick={() => {
                  setClientPortalTab('services');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  (clientPortalTab as string) === 'services'
                    ? 'bg-sky-600 text-white font-black shadow-md'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span>🏛️ All Services ({customPricingList.length})</span>
              </button>
            </div>
          </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: 🔔 LIVE CHATS & OPERATOR NOTIFICATIONS CENTER                     */}
          {/* ========================================================================= */}
          {(clientPortalTab as string) === 'notifications' && (
            <div id="notifications-section" className="bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 rounded-3xl border border-blue-500/30 p-4 sm:p-6 md:p-8 shadow-2xl space-y-6 max-w-full overflow-hidden box-border">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 p-0.5 shadow-lg shadow-indigo-900/30">
                      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950" />
                    </span>
                  </div>

                  <div className="min-w-0 w-full">
                    <h3 className="text-lg sm:text-2xl font-black text-white font-['Outfit'] leading-tight">
                      💬 Live Chats & Operator Notifications
                    </h3>
                    <p className="text-xs text-blue-300/90 mt-1 font-medium">
                      New operator replies appear here in real-time. <b>Click any message to open the Live Chat Portal!</b>
                    </p>
                  </div>
                </div>
              </div>

              {/* NOTIFICATION CARDS LIST */}
              {clientNotifications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full max-w-full overflow-hidden">
                  {clientNotifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleOpenNotification(notif.order)}
                      className="p-4 sm:p-6 rounded-3xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800/90 hover:border-emerald-500/60 shadow-xl cursor-pointer transition-all duration-200 group relative flex flex-col justify-between space-y-4 hover:-translate-y-0.5 w-full max-w-full overflow-hidden box-border"
                    >
                      <div className="space-y-4">
                        {/* Operator Identity & Order Info Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="relative shrink-0">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 p-0.5 shadow-sm">
                                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-bold text-sm text-blue-300 font-mono">
                                  {notif.operatorName ? notif.operatorName.slice(0, 2).toUpperCase() : 'JS'}
                                </div>
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                            </div>

                            <div className="min-w-0 w-full">
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-black text-white text-sm group-hover:text-blue-300 transition-colors">
                                  {notif.operatorName || 'Jan Seva Kendra VLE'}
                                </h5>
                                <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="text-blue-400 font-semibold">{notif.service}</span>
                                {Number(notif.messageCount) > 1 && (
                                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                                    {notif.messageCount} messages
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Message Speech Bubble — sirf latest message preview */}
                        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm text-slate-100 font-medium leading-relaxed relative group-hover:border-blue-500/30 transition-colors shadow-inner">
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 font-serif text-2xl leading-none font-black select-none">“</span>
                            <div className="flex-1">
                              <p className="text-slate-100 text-sm font-semibold">{notif.text}</p>
                              {notif.hasAttachment && (
                                <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 text-xs text-sky-300 font-mono border border-slate-800">
                                  <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                                  <span>{notif.attachmentName || 'Attachment Verified'}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-blue-400 font-serif text-2xl leading-none font-black select-none">”</span>
                          </div>

                          {/* Photo Proof Mini Preview if available */}
                          {notif.photoUrl && (
                            <div className="mt-3 flex items-center gap-3 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200">
                              <img
                                src={notif.photoUrl}
                                alt="Proof Thumbnail"
                                className="w-14 h-14 object-cover rounded-xl border border-purple-500/50 flex-shrink-0 shadow-md"
                              />
                              <div className="text-xs">
                                <p className="font-bold text-white flex items-center gap-1">
                                  <span>📸 Filled Form Photo Proof Ready!</span>
                                </p>
                                <p className="text-purple-300 text-[11px] mt-0.5">
                                  Click here to inspect full size original receipt before in-app payment
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Inline Quick Reply Box */}
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendQuickReply(notif.order);
                            }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={quickReplyText[notif.order.id] || ''}
                              onChange={(e) => setQuickReplyText(prev => ({ ...prev, [notif.order.id]: e.target.value }))}
                              placeholder="Type an instant reply to the operator..."
                              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="submit"
                              disabled={quickReplySendingId === notif.order.id}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {quickReplySendingId === notif.order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              <span>{quickReplySendingId === notif.order.id ? 'Sending…' : 'Reply'}</span>
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Prominent Click Button Footer */}
                      <div className="pt-3 border-t border-slate-900 flex items-center justify-between gap-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNotification(notif.order);
                          }}
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 transition-all group-hover:scale-[1.01]"
                        >
                          <MessageSquare className="w-4 h-4 text-white" />
                          <span>👉 Click Message to Open Live Chat Portal</span>
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void startVoiceCall(notif.order);
                          }}
                          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-800 transition-colors"
                          title="Instant Voice Call"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* LIVE OPERATOR HELP & WELCOME ADVISORY (When no active notifications yet) */
                <div className="bg-slate-950/80 rounded-3xl border border-slate-800/90 p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-slate-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-500 to-sky-500 p-0.5 shadow-lg">
                          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-300">
                            <Building2 className="w-8 h-8" aria-hidden="true" />
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 w-full">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base sm:text-lg font-black text-white font-['Outfit'] leading-tight">
                            Jan Seva Kendra Operator
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Operator details will appear after your request is accepted.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-400 text-xs font-semibold border border-slate-800">
                        Waiting for operator assignment
                      </span>
                    </div>
                  </div>

                  {/* Operator Welcome Speech Bubble */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-inner">
                    <p className="text-xs text-blue-300 font-semibold">
                      💡 Quick assistance — click any option below to ask questions or start chat/call:
                    </p>
                  </div>

                  {/* 3 Quick Suggested Inquiry Buttons */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Quick Questions (Click to Ask Operator):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { text: '🪪 What documents are required for a PAN Card?', service: 'PAN Card' },
                        { text: '📜 How many days does Domicile & Income certificate take?', service: 'Domicile Certificate' },
                        { text: '🌾 How to add a new member name to Ration card?', service: 'Ration Card' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={async () => {
                            const targetOrder = clientActiveOrders[0] || vleExclusiveOrders[0];
                            if (targetOrder) {
                              setQuickQuestionSendingText(item.text);
                              try {
                                await handleSendQuickReply(targetOrder, item.text);
                                handleOpenNotification(targetOrder);
                              } finally {
                                setQuickQuestionSendingText(null);
                              }
                            }
                          }}
                          disabled={(!clientActiveOrders.length && !vleExclusiveOrders.length) || Boolean(quickQuestionSendingText)}
                          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left text-xs font-semibold text-slate-200 hover:text-blue-300 transition-all flex items-center justify-between group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <span className="line-clamp-2">{item.text}</span>
                          {quickQuestionSendingText === item.text ? (
                            <Loader2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 ml-1.5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 🏛️ ALL JAN SEVA KENDRA SERVICES (CLEAN, FILTERED & UN-MIXED)       */}
          {/* ========================================================================= */}
          {(clientPortalTab as string) === 'services' && (
            <div id="services-section" className="bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      Location: <b className="text-sky-300">{clientCityFilter}, {clientDistrictFilter}</b>
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1 font-['Outfit']">
                    🏛️ All Jan Seva Kendra Services ({customPricingList.length})
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Jan Seva Kendra dwara daali gayi sabhi official government aur citizen services: PAN Card, Niwas, Aay, Jati, Ration Card, Ayushman Card aur Driving License.
                  </p>
                </div>
              </div>

              {/* Highlight Banner if pricing was just saved or updated */}
              {pricingJustUpdated && (
                <div className="p-4 bg-gradient-to-r from-emerald-500/20 via-sky-500/10 to-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in duration-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-white">✅ Pricing Config Successfully Applied & Live!</p>
                      <p className="text-emerald-300/90 text-[11px]">Aapke Jan Seva Kendra dwara set ki gayi dynamic pricing list client portal par live active hai ({customPricingList.length} Services).</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPricingJustUpdated(false)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* SEARCH INPUT & CATEGORY FILTER FOR TAB 2 SERVICES */}
              <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3 shadow-inner">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Jan Seva services (PAN, Domicile, Income, Caste, Ration, Notary, Agreement, Ayushman, DL)..."
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/50 text-white text-xs sm:text-sm placeholder-slate-500 transition-all outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-slate-400 px-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-[11px] text-sky-400 hover:text-sky-300 underline font-semibold cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Services Posted Live by Jan Seva Kendra Operators */}
              {customPricingList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Jan Seva Kendra &amp; Services</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customPricingList.map(item => (
                      <div key={item.id} className="bg-slate-950 rounded-2xl border border-amber-500/40 p-5 flex flex-col justify-between hover:border-amber-400 transition-all shadow-lg group">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-mono flex items-center gap-1">
                                <span>🏛️</span>
                                <span>{item.operatorName || 'Jan Seva Kendra'}</span>
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
                                {item.scope === 'national' ? 'All India' : item.scope === 'online_form' ? 'Online Form' : 'District'}
                              </span>
                            </div>
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              <span>Instant Processing</span>
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                            {item.docName}
                          </h4>

                          <p className="text-xs text-slate-400 mb-1">
                            Priced by {item.operatorName || 'a certified Jan Seva Kendra'} ({item.operatorCity || item.operatorDistrict || 'across India'}).
                          </p>
                        </div>

                        <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-black text-amber-400">₹{item.price}</span>
                                <span className="text-[10px] font-bold text-amber-300">Govt + Service Fee</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">
                                (Govt: ₹{item.govtFee || '0'} + Service: ₹{item.cscFee || item.price})
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Govt + Service
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleCatalogServiceApply(item)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Apply with {item.operatorName || 'Jan Seva Kendra'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ⚡ ACTIVE ONGOING ORDERS                                           */}
          {/* ========================================================================= */}
          {(clientPortalTab as string) === 'orders' && (
            <div id="orders-section" className="bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 rounded-3xl border border-blue-500/30 p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span>Aapke Active Orders ({clientActiveOrders.length}) • Chat, Call & Document Upload</span>
                </h3>
                <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Live Portal Connected
                </span>
              </div>

              {clientOrderSuccessMsg && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between gap-3 text-blue-300 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <span className="font-semibold">{clientOrderSuccessMsg}</span>
                  </div>
                  <button onClick={() => setClientOrderSuccessMsg('')} className="text-blue-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Status Filter Component (Toggle between Pending, Active, Completed, and All) */}
              <OrderStatusFilter
                language={lang}
                currentFilter={orderStatusFilter}
                onFilterChange={(newFilter) => {
                  setOrderStatusFilter(newFilter);
                  if (soundAlertEnabled) playChime();
                }}
                counts={{
                  all: clientActiveOrders.length,
                  pending: pendingOrdersCount,
                  active: activeOrdersCount,
                  completed: completedOrdersCount
                }}
              />

              {isInitialLoading && clientActiveOrders.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <WorkspaceSkeletonCard />
                  <WorkspaceSkeletonCard />
                </div>
              ) : filteredClientActiveOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredClientActiveOrders.map(ord => (
                    <div key={ord.id} className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg hover:border-blue-500/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-900 text-slate-400 border border-slate-800">
                            {ord.serviceName ? 'Jan Seva Kendra' : 'Form Filler'}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold ${
                          ord.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                          ord.status === 'paid' ? 'bg-blue-500/20 text-blue-300' :
                          ord.status === 'proof_submitted' ? 'bg-purple-500/20 text-purple-300 animate-pulse' :
                          ord.status === 'accepted' ? 'bg-sky-500/20 text-sky-300' :
                          ord.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300' :
                          ord.status === 'expired' ? 'bg-slate-700/40 text-slate-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {ord.status === 'completed' ? '✅ Completed (credentials ready)' :
                           ord.status === 'paid' ? '💳 Paid (Awaiting Delivery)' :
                           ord.status === 'proof_submitted' ? '📸 Photo Proof Ready to Verify' :
                           ord.status === 'accepted' ? '⚡ Operator Assigned' :
                           ord.status === 'cancelled' ? '🚫 Cancelled' :
                           ord.status === 'expired' ? '⌛ Expired' :
                           '⏳ Pending Operator'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-base">{ord.serviceName || ord.formTitle}</h4>
                        <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>Assigned Operator:</span>
                          {ord.acceptedByName || ord.acceptedByVleName || ord.acceptedByFillerName ? (
                            <span className="font-bold text-blue-300 flex items-center gap-1">
                              <span>{ord.acceptedByName || ord.acceptedByVleName || ord.acceptedByFillerName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {ord.acceptedByRoleLabel || (ord.acceptedByFillerName ? 'Form Filler Expert' : 'Jan Seva Kendra')}
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-300 font-medium flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                              <span>Live Broadcast to Jan Seva &amp; Form Fillers (Waiting for first accept...)</span>
                            </span>
                          )}
                        </div>
                        {ord.formDetails && (
                          <p className="text-[11px] text-blue-200/80 bg-slate-900/80 p-2 rounded-lg mt-1 font-mono line-clamp-2 border border-slate-800">
                            "{ord.formDetails}"
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 mt-0.5">Uploaded Docs: <b>{ord.clientDocuments?.length || 0} files (PDF/Photos)</b></p>
                      </div>

                      {/* Operator Rating Section */}
                      {(ord.acceptedByName || ord.acceptedByVleName || ord.acceptedByFillerName) && (
                        <div>
                          {ord.rating ? (
                            <div className="bg-slate-900/90 rounded-xl p-3 border border-amber-500/30 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1 text-amber-400">
                                {[1,2,3,4,5].map(s => (
                                  <span key={s} className={s <= ord.rating ? 'text-amber-400 font-bold' : 'text-slate-600'}>★</span>
                                ))}
                                <span className="text-white font-bold ml-1.5">{ord.rating}/5 Operator Rating</span>
                              </div>
                              <span className="text-[11px] text-slate-300 italic truncate max-w-[150px]">"{ord.review || 'Excellent work'}"</span>
                            </div>
                          ) : (
                            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-bold">⭐ Operator Ko Rating Dein (Kaam kaisa laga?):</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1">
                                  {ratingOrderId === ord.id ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Saving rating…</span>
                                    </span>
                                  ) : (
                                    [1, 2, 3, 4, 5].map(star => (
                                      <button
                                        key={star}
                                        onClick={() => handleRateOrder(ord.id, star, star === 5 ? 'Bahut accha aur tezi se kaam kiya!' : 'Achha kaam')}
                                        disabled={Boolean(ratingOrderId)}
                                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 font-bold text-xs flex items-center justify-center transition-all border border-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                        title={`Rate ${star} Stars`}
                                      >
                                        {star}★
                                      </button>
                                    ))
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">Click to Rate</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleOpenNotification(ord)}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Open Talking Panel & Upload Docs</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveWorkspaceOrder(ord);
                            endVoiceCall(true);
                          }}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 shadow-md flex items-center justify-center transition-all"
                          title="Open Panel / Call"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800 p-6">
                  <Clock className="w-9 h-9 text-slate-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {orderStatusFilter === 'pending'
                        ? t('No Pending Orders', 'कोई लंबित ऑर्डर नहीं है')
                        : orderStatusFilter === 'active'
                        ? t('No Active Orders In Progress', 'प्रक्रियाधीन कोई सक्रिय ऑर्डर नहीं है')
                        : orderStatusFilter === 'completed'
                        ? t('No Completed Orders Yet', 'अभी तक कोई पूर्ण ऑर्डर नहीं है')
                        : t('No Active Orders Currently', 'अभी कोई सक्रिय ऑर्डर नहीं है')}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      {orderStatusFilter === 'pending'
                        ? t('All orders have been accepted by operators.', 'सभी ऑर्डर ऑपरेटरों द्वारा स्वीकार किए जा चुके हैं।')
                        : orderStatusFilter === 'active'
                        ? t('No ongoing order is currently in verification or submission stage.', 'वर्तमान में कोई भी ऑर्डर सत्यापन या सबमिशन प्रक्रिया में नहीं है।')
                        : orderStatusFilter === 'completed'
                        ? t('Orders will appear here once the operator dispatches credentials & official receipts.', 'जैसे ही ऑपरेटर क्रेडेंशियल्स व सरकारी रसीद भेजेगा, ऑर्डर यहाँ दिखाई देगा।')
                        : t('You can apply for any government certificate or form filling service anytime.', 'आप किसी भी सरकारी दस्तावेज़ या फॉर्म भरने की सेवा के लिए कभी भी आवेदन कर सकते हैं।')}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2.5 pt-1">
                    {orderStatusFilter !== 'all' && (
                      <button
                        onClick={() => setOrderStatusFilter('all')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold border border-slate-700 transition-colors"
                      >
                        View All Orders ({clientActiveOrders.length})
                      </button>
                    )}
                    <button
                      onClick={() => setClientPortalTab('services')}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
                    >
                      Browse Services
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ========================================================================= */}
          {/* TAB 5: 📝 ONLINE FORM FILLING (NEET, JEE, SARKARI EXAM & ADMISSION)       */}
          {/* ========================================================================= */}
          {(clientPortalTab as string) === 'form_filling' && (
            <div id="form-filling-section" className="bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 rounded-3xl border border-emerald-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-900/30 flex-shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                      <FileText className="w-7 h-7" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                      📝 Online Form Filling (NEET, JEE &amp; All Exams)
                    </h3>
                  </div>
                </div>
              </div>

              {/* Quick Popular Exam Presets (1-Click Fill) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Quick Select Popular Exam / Form (Click to Auto-Fill):</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {visibleFillerServices.map((srv) => (
                    <button
                      key={`quick-${srv.id}`}
                      type="button"
                      onClick={() => {
                        setExamFormTitle(srv.docName);
                        setExamFormDesc(`Applied for: ${srv.docName}\nExpert: ${srv.expertName} (₹${Number(srv.price) + Number(srv.govtFee || 0)})\nZaroori Kagaz:\n${srv.requirements || ''}`);
                        if (soundAlertEnabled) playChime();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                        examFormTitle === srv.docName
                          ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-md shadow-emerald-900/30 scale-[1.02]'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <span>{srv.icon || '📝'}</span>
                      <span>{srv.docName} (₹{srv.price})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Input Fields */}
              <form id="form-filling-input-form" onSubmit={handleExamFormSubmit} className="space-y-4">
                {/* Applicant Contact Information Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/20">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Applicant Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={examApplicantName}
                      onChange={(e) => setExamApplicantName(e.target.value.slice(0, 50))}
                      placeholder=""
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mobile Number (10 Digits) *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={examApplicantPhone}
                      onChange={(e) => setExamApplicantPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder=""
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Gmail / Email (Alert)</span>
                    </label>
                    <input
                      type="email"
                      maxLength={60}
                      value={examApplicantEmail}
                      onChange={(e) => setExamApplicantEmail(e.target.value.slice(0, 60))}
                      placeholder=""
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Applicant Category (Gen / OBC / SC / ST) *</span>
                    </label>
                    <select
                      required
                      value={examApplicantCategory}
                      onChange={(e) => {
                        const next = e.target.value as GovtFeeCategoryKey;
                        setExamApplicantCategory(next);
                        try { localStorage.setItem('client_category', next); } catch {}
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      {GOVT_FEE_CATEGORIES.map(item => (
                        <option key={item.key} value={item.key}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Field 1: Form Ka Naam */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-emerald-400 font-black">1.</span>
                      <span>Which Form Do You Want To Fill? (Exam / Form Name) *</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={examFormTitle}
                      onChange={(e) => setExamFormTitle(e.target.value.slice(0, 100))}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                    />
                  </div>

                  {/* Field 2: Form Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-emerald-400 font-black">2.</span>
                      <span>Category / Stream</span>
                    </label>
                    <select
                      value={examFormCategory}
                      onChange={(e) => setExamFormCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Category / Stream</option>
                      <option value="Medical & Healthcare (NEET/AIIMS)">🩺 Medical &amp; NEET</option>
                      <option value="Engineering & Tech (JEE/GATE)">⚡ Engineering &amp; JEE</option>
                      <option value="Sarkari & SSC (Govt Jobs)">📋 SSC &amp; Sarkari Job</option>
                      <option value="Defence & Police">👮 Police &amp; Defence</option>
                      <option value="Scholarship & Admissions">🎓 Scholarship / Admissions</option>
                      <option value="Other Custom Form">📄 Other Exam Form</option>
                    </select>
                  </div>
                </div>

                {/* Field 3: Roll Number / Previous Registration (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Roll Number / Previous Registration No. (If applicable):</span>
                    <span className="text-[11px] text-slate-500">Optional</span>
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={examFormRoll}
                    onChange={(e) => setExamFormRoll(e.target.value.slice(0, 50))}
                    placeholder=""
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500 font-mono"
                  />
                </div>

                {/* Field 4: Description / Disction */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-black">3.</span>
                      <span>Form Ki Description &amp; Details (Discription) *</span>
                    </span>
                    <span className="text-[11px] text-emerald-400 font-medium">Spelling, Category, Choice preference likhein</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={examFormDesc}
                    onChange={(e) => setExamFormDesc(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans placeholder-slate-500 leading-relaxed"
                  />
                </div>

                {/* Client Contact & Escrow Protection Summary Bar */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Applicant: <b className="text-white">{examApplicantName || clientName || 'Citizen'}</b> • Mobile: <b className="text-emerald-300">{examApplicantPhone || clientPhone || '—'}</b></span>
                  </div>
                </div>

                {/* Action Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingExamForm}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
                  >
                    {isSubmittingExamForm ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                    <span>{isSubmittingExamForm ? 'Sending…' : 'Send Request to Jan Seva Kendras &amp; Form Fillers (In-App Order Queues)'}</span>
                  </button>
                </div>
              </form>

              {/* Form Filler Expert Published Application Forms (Available Forms) - Placed below Send Request */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {/* 3D Isometric Form & Stylus Icon */}
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-slate-900 to-slate-950 border border-emerald-400/40 p-1 flex items-center justify-center shadow-[0_4px_16px_rgba(16,185,129,0.3)] shrink-0 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-emerald-400/10 rounded-2xl blur-sm pointer-events-none" />
                      <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_2px_6px_rgba(16,185,129,0.5)]">
                        <defs>
                          <radialGradient id="grad3dFormBg" cx="30%" cy="30%" r="70%">
                            <stop offset="0%" stopColor="#6ee7b7" />
                            <stop offset="45%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#064e3b" />
                          </radialGradient>
                          <linearGradient id="grad3dFold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a7f3d0" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                          <linearGradient id="grad3dPenTip" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                        </defs>
                        {/* 3D Isometric Sheet Shadow */}
                        <polygon points="32,22 80,36 60,86 12,72" fill="#022c22" opacity="0.6" />
                        {/* 3D Isometric Sheet Base */}
                        <polygon points="28,16 76,30 56,80 8,66" fill="url(#grad3dFormBg)" />
                        {/* Top corner 3D fold */}
                        <polygon points="62,26 76,30 68,40" fill="url(#grad3dFold)" opacity="0.9" />
                        {/* Form Content Lines in 3D Isometric Angle */}
                        <line x1="22" y1="36" x2="52" y2="44" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
                        <line x1="20" y1="46" x2="48" y2="54" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
                        <line x1="18" y1="56" x2="42" y2="62" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                        {/* 3D Floating Pen */}
                        <polygon points="64,52 82,34 88,40 70,58" fill="url(#grad3dPenTip)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))" />
                        <polygon points="64,52 70,58 60,62" fill="#7dd3fc" />
                        <circle cx="60" cy="62" r="1.5" fill="#ffffff" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>Form Filler Expert Forms &amp; Services</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Forms published by Form Filler Experts — check fee, expert name and required documents to apply:
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {allPublishedForms.map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => {
                        setExamFormTitle(srv.docName);
                        setExamFormDesc(`Applied for: ${srv.docName}\nExpert: ${srv.expertName} (₹${Number(srv.price) + Number(srv.govtFee || 0)})\nRequired Documents:\n${srv.requirements || ''}`);
                        if (soundAlertEnabled) playChime();
                        document.getElementById('form-filling-input-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-3 ${
                        examFormTitle === srv.docName
                          ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg'
                          : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <FormCard3DIcon icon={srv.icon} size="md" />
                            <div>
                              <h5 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                                {srv.docName}
                              </h5>
                              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                                <UserIcon className="w-3 h-3 text-emerald-400" />
                                <span>Expert: <b className="text-white">{srv.expertName || 'Form Filler Expert'}</b></span>
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black font-mono shrink-0">
                            ₹{Number(srv.price) + Number(srv.govtFee || 0)}
                          </span>
                        </div>

                        {/* Required Documents & Fee Detail */}
                        <div className="space-y-2">
                          {srv.feeName && (
                            <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 font-bold bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">
                              <Zap className="w-3 h-3" />
                              <span>Fee Detail: {srv.feeName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">Govt: ₹{srv.govtFee || 0}</span>
                            <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">Service: ₹{srv.price}</span>
                            <span className="text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">{srv.state || 'All India'}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Required Documents (Zaroori Kagaz):</span>
                            </span>
                            <p className="text-[11px] text-slate-200 leading-relaxed font-sans line-clamp-3">
                              {srv.requirements || srv.description || 'Aadhaar Card, Passport Photo & Relevant Marksheets'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Direct operator UPI</span>
                        </span>
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                            examFormTitle === srv.docName
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-emerald-500/20'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          <span>{examFormTitle === srv.docName ? '✓ Selected' : '⚡ Select & Fill Form'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Experts & Operators List (Proximity Based) - Placed below form & submit button */}
              <div className="space-y-3 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Recommended Experts Near You (Form Fillers &amp; Jan Seva Kendra) ({mixedFormFillingExperts.filter(v => v.role === 'filler' || (v.formFillingList && v.formFillingList.length > 0)).length})</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mixedFormFillingExperts.map((vle, idx) => {
                    const isFiller = vle.role === 'filler';
                    // Only show Jan Seva operators in form section if they have formFillingList
                    const kendraList = (vle.formFillingList && vle.formFillingList.length > 0) 
                      ? vle.formFillingList 
                      : [];

                    if (!isFiller && kendraList.length === 0) return null;

                    const matchedFillerService = isFiller
                      ? (fillerServices.find(s => s.expertName === vle.name) || fillerServices[idx % fillerServices.length] || {
                          docName: 'NEET / JEE / Sarkari Exam Form',
                          price: '120',
                          requirements: 'Aadhaar Card, 10th & 12th Marksheet, Passport Photo, Signature',
                          icon: '📝'
                        })
                      : null;

                    const matchedKendraService = !isFiller
                      ? (kendraList[idx % kendraList.length] || {
                          docName: 'PAN Card / Domicile / Income / Caste',
                          price: '100',
                          govtFee: '30',
                          cscFee: '70',
                          requirements: 'Aadhaar Card, Passport Photo, Ration Card, Bank Passbook',
                          icon: '🏛️'
                        })
                      : null;

                    const formName = isFiller ? matchedFillerService?.docName : matchedKendraService?.docName;
                    const formPrice = isFiller ? matchedFillerService?.price : matchedKendraService?.price;
                    const centerOrSchool = isFiller
                      ? (vle.schoolName || vle.firmName || vle.centerName || 'Online Exam & Form Writing Desk')
                      : (vle.kendraName || vle.centerName || (vle.name?.includes('Kendra') ? vle.name : `${vle.name} Jan Seva Kendra`));
                    const rawRequirements = isFiller
                      ? (matchedFillerService?.requirements || matchedFillerService?.description || 'Aadhaar Card, Passport Photo, Marksheets & Category Certificate')
                      : (matchedKendraService?.requirements || getDocRequirements(matchedKendraService || {}));
                    const docList = typeof rawRequirements === 'string'
                      ? rawRequirements.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : (Array.isArray(rawRequirements) ? rawRequirements : ['Aadhaar Card', 'Passport Photo', 'Marksheet']);

                    return (
                      <div 
                        key={vle.id} 
                        className={`p-4 rounded-2xl bg-slate-900 border ${isFiller ? 'border-cyan-500/30 hover:border-cyan-400' : 'border-amber-500/30 hover:border-amber-400'} transition-all group relative flex flex-col justify-between gap-3 shadow-lg`}
                      >
                        <div className="space-y-2.5">
                          {/* Header: Avatar, Name, School/Center Name, Location & Role Badge */}
                          <div className="flex items-start justify-between gap-2 relative z-10">
                            <div className="flex items-center gap-3">
                              <FormCard3DIcon icon={isFiller ? (matchedFillerService?.icon || '✍️') : '🏛️'} size="md" />
                              <div>
                                <h5 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                                  {vle.name}
                                </h5>
                                <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1 mt-0.5 line-clamp-1">
                                  <span>🏫</span>
                                  <span>{centerOrSchool}</span>
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  <span className="text-[10px] font-semibold text-slate-400">{vle.city}, {vle.district}</span>
                                </div>
                              </div>
                            </div>
                            {isFiller ? (
                              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase border border-cyan-500/30 flex-shrink-0 flex items-center gap-1">
                                <span>✍️</span>
                                <span>Form Filler</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase border border-amber-500/30 flex-shrink-0 flex items-center gap-1">
                                <span>🏛️</span>
                                <span>Jan Seva Kendra</span>
                              </span>
                            )}
                          </div>

                          {/* Data Filled From Panel: Price & Konsa Form */}
                          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <span>📋</span>
                                <span>Konsa Form / Service:</span>
                              </span>
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black font-mono shrink-0">
                                  ₹{formPrice}
                                </span>
                                {(isFiller ? matchedFillerService?.feeName : matchedKendraService?.feeName) && (
                                  <span className="text-[8px] text-indigo-400 font-bold truncate max-w-[70px]">
                                    {isFiller ? matchedFillerService?.feeName : matchedKendraService?.feeName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <h6 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                              {formName}
                            </h6>
                          </div>

                          {/* Data Filled From Panel: Required Documents (ज़रूरी कागज़) */}
                          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>Required Documents (ज़रूरी कागज़):</span>
                              </span>
                              <span className="text-slate-500 font-mono text-[9px]">{docList.length} Docs</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {docList.slice(0, 4).map((d: string, dIdx: number) => (
                                <span key={dIdx} className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-200 border border-slate-800 text-[10px] font-medium flex items-center gap-1 line-clamp-1">
                                  <CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                  <span>{d}</span>
                                </span>
                              ))}
                              {docList.length > 4 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[9px] font-mono">
                                  +{docList.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons: Message, Connect / Select Form */}
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-1.5">

                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => handleDirectApply(vle)}
                              disabled={Boolean(directApplyVleId)}
                              className="px-2 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Personal Chat & Call"
                            >
                              {directApplyVleId === vle.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                              <span>{directApplyVleId === vle.id ? 'Sending…' : 'Chat'}</span>
                            </button>
                            <button 
                              onClick={() => {
                                if (isFiller) {
                                  setExamFormTitle(formName || '');
                                  setExamFormDesc(`Applied with ${vle.name} (${centerOrSchool})\nForm: ${formName}\nPrice: ₹${formPrice}\nZaroori Kagaz:\n${rawRequirements}`);
                                  document.getElementById('form-filling-section')?.scrollIntoView({ behavior: 'smooth' });
                                } else {
                                  handleDirectApply(vle);
                                }
                              }}
                              disabled={!isFiller && Boolean(directApplyVleId)}
                              className={`px-2.5 py-1.5 rounded-lg ${isFiller ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white text-[10px] font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                              {!isFiller && directApplyVleId === vle.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Sending…</span>
                                </>
                              ) : (
                                <span>⚡ {isFiller ? 'Select & Fill' : 'Connect'}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {mixedFormFillingExperts.length === 0 && (
                    <div className="col-span-full py-10 text-center space-y-2">
                      <Search className="w-8 h-8 text-slate-700 mx-auto" />
                      <p className="text-xs text-slate-500">
                        {t(
                          `No local operator found in ${clientDistrictFilter}. Request can be broadcast to all verified network experts below.`,
                          `आपके क्षेत्र (${clientDistrictFilter}) में कोई स्थानीय ऑपरेटर नहीं मिला। सभी प्रमाणित ऑपरेटरों को अनुरोध भेजा जा सकता है।`
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Real-time Broadcast Notice to Both Networks */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-950 to-blue-500/15 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>{t('📡 Central Broadcast: Jan Seva Kendras + Form Filler Experts Network', '📡 केंद्रीय नेटवर्क प्रसारण: जन सेवा केंद्र एवं फॉर्म एक्सपर्ट्स नेटवर्क')}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    Real-time Backend Sync
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {t(
                    'As soon as you submit, your request broadcasts instantly to all verified Jan Seva Kendra operators and Form Filler experts. Once an operator accepts, your private workspace opens immediately with real-time tracking.',
                    'जैसे ही आप अनुरोध भेजेंगे, यह अनुरोध सभी जन सेवा केंद्र ऑपरेटरों एवं फॉर्म एक्सपर्ट्स दोनों नेटवर्क के पास तुरंत प्रसारित हो जाएगा। कोई भी एक ऑपरेटर इसे स्वीकार करेगा और आपका लाइव वर्कस्पेस तुरंत शुरू हो जाएगा!'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: 🪪 JAN SEVA KENDRA DOCUMENTS (PAN CARD, CERTIFICATES & GOVT SCHEMES) */}
          {/* ========================================================================= */}
          {(clientPortalTab as string) === 'jan_seva_docs' && (
            <div id="jan-seva-docs-section" className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 rounded-3xl border border-amber-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 p-0.5 shadow-lg shadow-amber-900/30 flex-shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                      <CreditCard className="w-7 h-7" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                      🏛️ Jan Seva Kendra Official Rates & Government Documents
                    </h3>
                  </div>
                </div>
              </div>

              {/* Document Selection Cards with Search & Category Filter */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Which Form / Document Do You Want To Fill? (Click to Select Document):</span>
                  </label>
                  <span className="text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 self-start sm:self-auto">
                    Selected: <b className="text-white">{selectedJanSevaDoc}</b>
                  </span>
                </div>

                {/* Search Input Field & Category Chips */}
                <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-3 sm:p-4 space-y-3 shadow-inner">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={janSevaSearchQuery}
                        onChange={(e) => setJanSevaSearchQuery(e.target.value)}
                        placeholder="Search document (e.g. PAN Card, Niwas, Aay, Jati, Ration, Ayushman, DL, E-Shram)..."
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 text-white text-xs sm:text-sm placeholder-slate-500 transition-all outline-none"
                      />
                      {janSevaSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setJanSevaSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Reset filter button if active */}
                    {(janSevaSearchQuery || janSevaSelectedCategory !== 'all') && (
                      <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-slate-400 px-1">
                        <button
                          type="button"
                          onClick={() => {
                            setJanSevaSearchQuery('');
                            setJanSevaSelectedCategory('all');
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900">
                    <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-amber-400" />
                      <span>Category:</span>
                    </span>
                    {[
                      { id: 'all', label: 'All Services', icon: '✨' },
                      { id: 'certificates', label: 'Praman Patra (Certificates)', icon: '📜' },
                      { id: 'identity', label: 'Identity (PAN / Aadhaar / Voter)', icon: '🪪' },
                      { id: 'schemes', label: 'Govt Schemes (Ration / Ayushman / Shram)', icon: '🌾' },
                      { id: 'transport_land', label: 'Transport & Land (DL / Bhulekh)', icon: '🚗' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setJanSevaSelectedCategory(cat.id);
                          if (soundAlertEnabled) playChime();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          janSevaSelectedCategory === cat.id
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-[1.02]'
                            : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtered Grid or Empty State */}
                {filteredJanSevaPricingList.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {filteredJanSevaPricingList.map((docItem) => (
                      <div
                        key={docItem.id}
                        onClick={() => {
                          setSelectedJanSevaDoc(docItem.docName);
                          if (soundAlertEnabled) playChime();
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                          selectedJanSevaDoc === docItem.docName
                            ? 'bg-gradient-to-br from-amber-500/25 via-slate-900 to-slate-950 border-amber-400 shadow-md shadow-amber-900/30 scale-[1.02]'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{docItem.icon || '📜'}</span>
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] uppercase font-bold text-slate-400">Total:</span>
                              <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                                ₹{docItem.price}
                              </span>
                            </div>
                            {docItem.feeName && (
                              <span className="text-[8px] text-indigo-400 font-bold truncate max-w-[80px]">{docItem.feeName}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1">
                          <div className="text-xs font-bold text-white line-clamp-1">{docItem.docName}</div>
                          <div className="mt-1 space-y-1">
                            {docItem.requirements && (
                              <div className="text-[9px] text-slate-300 leading-tight bg-slate-900/50 p-1.5 rounded border border-slate-800/50 line-clamp-2">
                                <b className="text-amber-500/80">Kagaz:</b> {docItem.requirements}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                              <span className="truncate">{docItem.dept || 'Jan Seva Kendra'}</span>
                              <span className={`text-[10px] font-bold ${selectedJanSevaDoc === docItem.docName ? 'text-amber-400' : 'text-slate-500'}`}>
                                {selectedJanSevaDoc === docItem.docName ? '✓ Selected' : 'Select'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 px-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                    <Search className="w-8 h-8 text-amber-500/50 mx-auto" />
                    <p className="text-sm font-bold text-white">
                      {t(`No document found for "${janSevaSearchQuery}"`, `"${janSevaSearchQuery}" के लिए कोई दस्तावेज़ नहीं मिला`)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t(
                        'You can still apply for any customized document by typing its name in Step 1 below!',
                        'आप नीचे चरण 1 में किसी भी सरकारी दस्तावेज़ का नाम सीधे लिखकर भी आवेदन कर सकते हैं!'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJanSevaDoc(janSevaSearchQuery);
                        setJanSevaSearchQuery('');
                      }}
                      className="mt-2 px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      {t(`Use "${janSevaSearchQuery}" as Custom Document`, `"${janSevaSearchQuery}" को कस्टम दस्तावेज़ के रूप में चुनें`)}
                    </button>
                  </div>
                )}
              </div>

              {/* Document Application Form */}
              <form id="jan-seva-doc-form" onSubmit={handleJanSevaDocSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Selected Document Name (Can also type if different) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-amber-400 font-black">1.</span>
                      <span>{t('Selected Government Document *', 'चयनित सरकारी दस्तावेज़ / प्रमाण पत्र *')}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={selectedJanSevaDoc}
                      onChange={(e) => setSelectedJanSevaDoc(e.target.value)}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>

                  {/* Applicant Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-amber-400 font-black">2.</span>
                      <span>{t('Applicant Full Name *', 'आवेदक का पूरा नाम *')}</span>
                    </label>
                    <input
                      type="text"
                      value={janSevaDocApplicantName}
                      onChange={(e) => setJanSevaDocApplicantName(e.target.value)}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Aadhaar / Reference */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-amber-400 font-black">3.</span>
                      <span>{t('Aadhaar / Mobile Number', 'आधार / मोबाइल नंबर')}</span>
                    </label>
                    <input
                      type="text"
                      value={janSevaDocAadhaar}
                      onChange={(e) => setJanSevaDocAadhaar(e.target.value)}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  {/* Applicant Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-amber-400 font-black">4.</span>
                      <span>{t('Gmail / Email', 'जीमेल / ईमेल')}</span>
                    </label>
                    <input
                      type="email"
                      value={janSevaDocEmail}
                      onChange={(e) => setJanSevaDocEmail(e.target.value)}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Applicant Reservation Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-amber-400 font-black">5.</span>
                      <span>{t('Applicant Category *', 'आवेदक श्रेणी *')}</span>
                    </label>
                    <select
                      required
                      value={examApplicantCategory}
                      onChange={(e) => {
                        const next = e.target.value as GovtFeeCategoryKey;
                        setExamApplicantCategory(next);
                        try { localStorage.setItem('client_category', next); } catch {}
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                    >
                      {GOVT_FEE_CATEGORIES.map(item => (
                        <option key={item.key} value={item.key}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Details / Discription */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-black">6.</span>
                      <span>{t('Application Details & Description *', 'दस्तावेज़ बनवाने का आवश्यक विवरण (विवरण दर्ज करें) *')}</span>
                    </span>
                    <span className="text-[11px] text-amber-400 font-medium">
                      {t('Enter parent name, address, or correction details', 'पिता का नाम, पता या संशोधन विवरण यहाँ लिखें')}
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={janSevaDocDetails}
                    onChange={(e) => setJanSevaDocDetails(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Urgent Fast-Track Checkbox */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <input
                    type="checkbox"
                    id="urgentFastTrack"
                    checked={janSevaDocUrgent}
                    onChange={(e) => setJanSevaDocUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="urgentFastTrack" className="text-xs text-slate-300 font-medium cursor-pointer">
                    ⚡ <b>Urgent Fast-Track Service:</b> Need this document processed urgently on priority by Jan Seva Kendra operator
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingJanSevaDoc}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:via-orange-500 hover:to-rose-500 disabled:cursor-wait disabled:opacity-60 text-white font-black text-sm shadow-xl shadow-amber-900/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
                  >
                    {isSubmittingJanSevaDoc ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                    <span>{isSubmittingJanSevaDoc ? 'Submitting Application…' : 'Submit Application to Jan Seva Kendra Operator (Direct VLE Dispatch)'}</span>
                  </button>
                </div>
              </form>

              {/* Recommended Jan Seva Kendra Operators List (Exclusively Verified Jan Seva Kendras) */}
              <div className="space-y-3 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Recommended Jan Seva Kendra Operators Near You ({janSevaOnlyOperators.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Showing Jan Seva Kendras in {clientDistrictFilter || 'your district'}; city matches appear first</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {janSevaOnlyOperators.map((vle) => (
                    <div 
                      key={vle.id} 
                      className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 hover:border-amber-400 transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg shadow-inner text-amber-400 flex-shrink-0">
                            🏛️
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1">{vle.name}</h5>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                              <span className="text-[10px] font-bold text-slate-400">{vle.city}, {vle.district}</span>
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase border border-amber-500/30 flex-shrink-0 flex items-center gap-1">
                          <span>🏛️</span>
                          <span>Jan Seva Kendra</span>
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-[9px] font-bold text-amber-400/80 uppercase">
                            CSC Verified Kendra
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleDirectApply(vle)}
                            disabled={Boolean(directApplyVleId)}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Personal Message"
                          >
                            {directApplyVleId === vle.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                            <span>{directApplyVleId === vle.id ? 'Sending…' : '💬 Message'}</span>
                          </button>
                          <button 
                            onClick={() => handleDirectApply(vle)}
                            disabled={Boolean(directApplyVleId)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {directApplyVleId === vle.id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                <span>Sending…</span>
                              </>
                            ) : (
                              <span>Connect &amp; Request</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {janSevaOnlyOperators.length === 0 && (
                    <div className="col-span-full py-10 text-center space-y-2">
                      <Search className="w-8 h-8 text-slate-700 mx-auto" />
                      <p className="text-xs text-slate-500">Aapke district ({clientDistrictFilter || '—'}) me koi Jan Seva Kendra operator nahi mila. Request doosre district me nahi bheji jayegi. District details update karke baad me dobara try karein.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      )}

      {/* ========================================================================= */}
      {/* 4. JAN SEVA KENDRA LOGIN & REGISTRATION                                    */}
      {/* ========================================================================= */}
      {step === 'vle_login' && (
        <main className="flex-1 w-full min-w-0 max-w-lg mx-auto box-border px-4 py-8 sm:py-12">
          <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-purple-400/80 via-indigo-500/40 to-blue-600/70 shadow-[0_25px_60px_-15px_rgba(168,85,247,0.3),0_15px_30px_-10px_rgba(2,6,23,0.8)] transition-all duration-500 group">
            <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-purple-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />
            
            <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-6 sm:p-10 relative overflow-hidden space-y-6 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              {/* Ambient Glows */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[90px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[90px] pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <button
                  onClick={() => {
                    if (vleOtpSent) {
                      setVleOtpSent(false);
                    } else {
                      setStep('landing');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-purple-300 hover:text-white border border-white/[0.1] text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
                  <span>{vleOtpSent ? 'Back' : 'Home'}</span>
                </button>
              </div>

              {/* 3D Brand Logo & Header */}
              <div className="text-center space-y-3 relative z-10">
                <div className="flex justify-center">
                  <BrandEmblem3D size="lg" layout="col" subtitle="JAN SEVA KENDRA OPERATOR" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 font-['Inter',sans-serif] tracking-tight">
                    CSC Operator Portal Login
                  </h2>
                  <p className="text-xs text-purple-300/90 font-medium mt-1">Strict credential verification required. Authorized access only.</p>
                </div>
              </div>

              {!vleOtpSent ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setVleAuthError('');
                  const missingVleLoginFields = collectMissingFields([
                    { label: 'CSC / Operator ID', ok: isNonEmpty(vleId) },
                    { label: 'Operator Name', ok: isNonEmpty(vleName) },
                    { label: '10-Digit Mobile Number', ok: isValidMobile(vlePhone) },
                    { label: 'Account Gmail', ok: isValidEmail(vleEmail) },
                  ]);
                  if (missingVleLoginFields.length > 0) {
                    setVleAuthError(requiredFieldsMessage(missingVleLoginFields));
                    return;
                  }
                  setIsVleAuthBusy(true);
                  try {
                    const captchaToken = await getCaptchaToken();
                    const response = await fetchWithRetry('/api/auth/send-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ channel: 'both', target: vlePhone, emailTarget: vleEmail, role: 'vle', name: vleName, captchaToken })
                    });
                    const data = await parseJsonResponse(response);
                    if (!response.ok || !data.success) {
                      throw new Error(data.error || ('Could not send the verification code. (HTTP ' + response.status + ') body=' + JSON.stringify(data)));
                    }
                    setVleOtpDeliveryMessage(data.message || '');
                    setVleMobileOtpCode('');
                    setVleAuthError('');
                    setVleOtpSent(true);
                  } catch (error) {
                    setVleAuthError(error instanceof Error ? error.message : 'Could not start verification. Please try again.');
                  } finally {
                    setIsVleAuthBusy(false);
                  }
                }} className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">CSC / Operator ID</label>
                    <input
                      type="text"
                      required
                      maxLength={25}
                      value={vleId}
                      onChange={(e) => setVleId(e.target.value.slice(0, 25))}
                      placeholder="e.g. CSC-UP-088192"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">{t('Operator Name', 'ऑपरेटर का पूरा नाम')}</label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={vleName}
                      onChange={(e) => setVleName(e.target.value.slice(0, 50))}
                      placeholder={t('Operator Full Name', 'ऑपरेटर का पूरा नाम')}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="space-y-1.5 flex flex-col min-w-0">
                      <label className="h-5 flex items-center justify-between text-xs font-medium text-slate-300 min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{t('Mobile Number', 'मोबाइल नंबर')}</span>
                        </span>
                      </label>
                      <div className="h-12 relative rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 flex items-center transition-all">
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={vlePhone}
                          onChange={(e) => setVlePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10 Digits No."
                          className="w-full h-full px-3.5 sm:px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500 font-mono min-w-0"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 flex flex-col min-w-0">
                      <label className="h-5 flex items-center text-xs font-medium text-slate-300 min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">Account Gmail</span>
                        </span>
                      </label>
                      <div className="h-12 relative rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 flex items-center transition-all">
                        <input
                          type="text"
                          name="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          required
                          maxLength={60}
                          value={vleEmail}
                          onChange={(e) => setVleEmail(e.target.value.slice(0, 60))}
                          placeholder="name@example.com"
                          className="w-full h-full px-3.5 sm:px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500 min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">{vleOtpDeliveryMessage || 'A verification code will be sent to your Gmail.'}</p>
                  {vleAuthError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{vleAuthError}</p>}
                  <button
                    type="submit"
                    disabled={isVleAuthBusy}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-purple-900/30 text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isVleAuthBusy ? 'Sending code…' : 'Send Verification Code & Login'}</span>
                  </button>

                  <GoogleSignInButton
                    onCredential={handleVleGoogleCredential}
                    disabled={isVleAuthBusy}
                  />
                </form>
              ) : (
                <form id="vle-otp-verify-form" onSubmit={async (e) => {
                  e.preventDefault();
                  if (isVleAuthBusy) return;
                  setVleAuthError('');
                  if (vleMobileOtpCode.length !== 4) {
                    setVleAuthError('');
                    return;
                  }
                  const missingVleVerifyFields = collectMissingFields([
                    { label: 'CSC / Operator ID', ok: isNonEmpty(vleId) },
                    { label: 'Operator Name', ok: isNonEmpty(vleName) },
                    { label: '10-Digit Mobile Number', ok: isValidMobile(vlePhone) },
                    { label: 'Account Gmail', ok: isValidEmail(vleEmail) },
                  ]);
                  if (missingVleVerifyFields.length > 0) {
                    setVleAuthError(requiredFieldsMessage(missingVleVerifyFields));
                    return;
                  }
                  if (vleVerifyLockRef.current) return;
                  vleVerifyLockRef.current = true;
                  setIsVleAuthBusy(true);
                  try {
                    const verifyResponse = await fetchWithRetry('/api/auth/verify-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ target: vlePhone, code: vleMobileOtpCode })
                    });
                    const verifyData = await parseJsonResponse(verifyResponse);
                    if (!verifyResponse.ok || !verifyData.verified) {
                      throw new Error(verifyData.error || 'Invalid OTP. Please check the code and try again.');
                    }
                    if (!verifyData.verificationToken) {
                      throw new Error('OTP verification expired. Request a new code.');
                    }
                    // Retain login permanently in backend (Zero Data Retention is NOT for logins)
                    const loginResponse = await fetchWithRetry('/api/vle/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        cscId: vleId,
                        name: vleName,
                        phone: vlePhone,
                        email: vleEmail,
                        state: vleState,
                        district: vleDistrict,
                        city: vleCity,
                        verificationToken: verifyData.verificationToken
                      })
                    });
                    const loginData = await parseJsonResponse(loginResponse);
                    if (!loginResponse.ok || !loginData.success) {
                      throw new Error(loginData.error || 'Operator login failed. Please try again.');
                    }
                    // Prefer the saved server profile, so saved details always show
                    // up even on a fresh browser/device.
                    const savedAccount = loginData.user || {};
                    const savedOperator = loginData.operator || {};
                    const resolvedName = String(savedAccount.name || savedOperator.name || vleName || '').trim();
                    const resolvedCenter = String(savedAccount.centerName || savedOperator.centerName || vleCenterName || '').trim();
                    const resolvedCsc = String(savedAccount.cscId || savedOperator.cscId || vleId || '').trim();
                    const resolvedPhone = String(savedAccount.phone || savedOperator.phone || vlePhone || '').replace(/\D/g, '').slice(-10);
                    const resolvedEmail = String(savedAccount.email || savedOperator.email || vleEmail || '').trim().toLowerCase();
                    const accountState = String(savedAccount.state || savedOperator.state || vleState || '').trim();
                    const rawAccountDistrict = String(savedAccount.district || savedOperator.district || vleDistrict || '').trim();
                    const accountDistrict = sameAsStateValue(rawAccountDistrict, accountState) ? '' : rawAccountDistrict;
                    const rawAccountCity = String(savedAccount.city || savedOperator.city || vleCity || '').trim();
                    const accountCity = sameAsStateValue(rawAccountCity, accountState) ? '' : rawAccountCity;
                    const accountPhoto = String(savedAccount.photoUrl || savedOperator.photoUrl || '').trim();
                    const savedPricing = savedOperator.pricingList;

                    if (resolvedName) setVleName(resolvedName);
                    if (resolvedCenter) setVleCenterName(resolvedCenter);
                    if (resolvedCsc) setVleId(resolvedCsc);
                    if (resolvedPhone) setVlePhone(resolvedPhone);
                    if (resolvedEmail) setVleEmail(resolvedEmail);
                    if (accountState) setVleState(accountState);
                    if (accountDistrict) setVleDistrict(accountDistrict);
                    if (accountCity) setVleCity(accountCity);
                    if (Array.isArray(savedPricing) && savedPricing.length > 0) setCustomPricingList(savedPricing);
                    if (accountPhoto) setVlePhotoUrl(accountPhoto);

                    localStorage.setItem('vle_operator_name', resolvedName || vleName);
                    localStorage.setItem('vle_center_name', resolvedCenter || vleCenterName);
                    localStorage.setItem('vle_csc_id', resolvedCsc || vleId);
                    localStorage.setItem('vle_phone', resolvedPhone || vlePhone);
                    localStorage.setItem('vle_email', resolvedEmail || vleEmail);
                    if (accountState) localStorage.setItem('vle_state', accountState);
                    if (accountDistrict) localStorage.setItem('vle_district', accountDistrict);
                    if (accountCity) localStorage.setItem('vle_city', accountCity);
                    if (accountPhoto) {
                      try { localStorage.setItem('vle_photo_url', accountPhoto); } catch {}
                    }
                    writeStoredSession({
                      role: 'vle',
                      name: resolvedName || vleName,
                      phone: resolvedPhone || vlePhone,
                      email: resolvedEmail || vleEmail,
                      state: accountState || vleState,
                      district: accountDistrict || vleDistrict,
                      city: accountCity || vleCity,
                      cscId: resolvedCsc || vleId,
                      token: loginData.token,
                      loggedInAt: Date.now()
                    });
                    setIsVleLoggedIn(true);
                    setActiveRole('vle');
                    setPendingRole('vle');
                    setLegalAccepted(false);
                    try { localStorage.removeItem(LEGAL_ACCEPTED_KEY); } catch {}
                    setShowLegalModal(true);
                  } catch (error) {
                    setVleAuthError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
                  } finally {
                    vleVerifyLockRef.current = false;
                    setIsVleAuthBusy(false);
                  }
                }} className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] text-slate-400 font-semibold">{t('Enter the 4-digit code sent to your Gmail:', 'Gmail पर भेजा गया 4 अंकों का कोड दर्ज करें:')}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-emerald-400">Gmail OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      value={vleMobileOtpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setVleMobileOtpCode(val);
                      }}
                      placeholder="• • • •"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-center text-lg font-black tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <p className="text-xs text-slate-400">The code was sent to {vleEmail}.</p>
                  {vleAuthError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{vleAuthError}</p>}
                  <button
                    type="submit"
                    disabled={isVleAuthBusy || vleMobileOtpCode.length !== 4}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white font-black text-sm hover:shadow-xl transition-all"
                  >
                    {isVleAuthBusy ? t('Verifying…', 'सत्यापित हो रहा है…') : t('Verify & Enter CSC Dashboard', 'सत्यापित करें और CSC डैशबोर्ड खोलें')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVleOtpSent(false);
                      setVleMobileOtpCode('');
                      setVleAuthError('');
                    }}
                    className="w-full text-center text-xs text-zinc-400 hover:text-emerald-300 transition-colors pt-1"
                  >
                    ← Edit Details / Resend Code
                  </button>
                </form>
              )}

              <div className="pt-2 text-center relative z-10">
                <button
                  onClick={() => {
                    setVleOtpSent(false);
                    setVleRegistrationOtpCode('');
                    setVleAuthError('');
                    setStep('vle_register');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 hover:underline font-semibold"
                >
                  Register New Digital Center Operator →
                </button>
              </div>

              <button onClick={() => setStep('landing')} className="w-full text-xs text-slate-400 hover:text-white pt-1">
                ← Back to Portal Selection
              </button>
            </div>
          </div>
        </main>
      )}

      {step === 'vle_register' && (
        <main className="flex-1 w-full min-w-0 max-w-lg mx-auto box-border px-4 py-8 sm:py-12">
          <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-purple-400/80 via-indigo-500/40 to-blue-600/70 shadow-[0_25px_60px_-15px_rgba(168,85,247,0.3),0_15px_30px_-10px_rgba(2,6,23,0.8)] transition-all duration-500 group">
            <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-purple-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />

            <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-6 sm:p-10 relative overflow-hidden space-y-6 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              <button
                onClick={() => {
                  setVleOtpSent(false);
                  setVleRegistrationOtpCode('');
                  setVleAuthError('');
                  setStep('vle_login');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-purple-300 hover:text-white border border-white/[0.1] text-xs font-bold transition-all shadow-sm active:scale-95 mb-2"
              >
                <ArrowLeft className="w-4 h-4 text-purple-400" />
                <span>Back to Login</span>
              </button>

              <div className="text-center mb-4 space-y-3">
                <div className="flex justify-center">
                  <BrandEmblem3D size="lg" layout="col" subtitle="VLE REGISTRATION GATEWAY" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 font-['Inter',sans-serif] tracking-tight">
                    Jan Seva Kendra Operator Registration
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Verify your phone and Gmail before registering your CSC operator account.</p>
                </div>
              </div>

            {!vleOtpSent ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setVleAuthError('');
                const missingVleRegisterFields = collectMissingFields([
                  { label: 'Operator Name', ok: isNonEmpty(vleName) },
                  { label: 'Jan Seva Kendra / Center Name', ok: isNonEmpty(vleCenterName) },
                  { label: 'CSC / Operator ID', ok: isNonEmpty(vleId) },
                  { label: 'State / UT', ok: isNonEmpty(vleState) },
                  { label: 'District', ok: isNonEmpty(vleDistrict) },
                  { label: 'City / Tehsil', ok: isNonEmpty(vleCity) },
                  { label: '10-Digit Mobile Number', ok: isValidMobile(vlePhone) },
                  { label: 'Gmail ID', ok: isValidEmail(vleEmail) },
                ]);
                if (missingVleRegisterFields.length > 0) {
                  setVleAuthError(requiredFieldsMessage(missingVleRegisterFields));
                  return;
                }
                setVerifyingGovt(true);
                try {
                  const captchaToken = await getCaptchaToken();
                  const response = await fetchWithRetry('/api/auth/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channel: 'both', target: vlePhone, emailTarget: vleEmail, role: 'vle', name: vleName, captchaToken })
                  });
                  const data = await parseJsonResponse(response);
                  if (!response.ok || !data.success) {
                    throw new Error(data.error || ('Could not send the registration code. (HTTP ' + response.status + ') body=' + JSON.stringify(data)));
                  }
                  setVleOtpDeliveryMessage(data.message || '');
                  setVleRegistrationOtpCode('');
                  setVleAuthError('');
                  setVleOtpSent(true);
                } catch (error) {
                  setVleAuthError(error instanceof Error ? error.message : 'Could not start registration verification.');
                } finally {
                  setVerifyingGovt(false);
                }
              }} className="space-y-4">






                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Operator Name</label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={vleName}
                      onChange={(e) => setVleName(e.target.value.slice(0, 50))}
                      placeholder=""
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Jan Seva Kendra / Center Name</label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={vleCenterName}
                      onChange={(e) => setVleCenterName(e.target.value.slice(0, 60))}
                      placeholder=""
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">CSC / Operator ID</label>
                    <input
                      type="text"
                      required
                      maxLength={25}
                      value={vleId}
                      onChange={(e) => setVleId(e.target.value.slice(0, 25))}
                      placeholder=""
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">State / UT</label>
                    <StateSelect
                      value={vleState}
                      onChange={setVleState}
                      options={INDIAN_STATES}
                      emptyLabel={t('Select State / UT', 'राज्य / केंद्र शासित प्रदेश चुनें')}
                      ariaLabel="State / UT"
                      className="w-full px-3.5 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">District</label>
                      <LocationAutocomplete
                        value={vleDistrict}
                        onChange={(val) => setVleDistrict(val.slice(0, 40))}
                        preferType="district"
                        state={vleState}
                        placeholder=""
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">City / Tehsil</label>
                      <LocationAutocomplete
                        value={vleCity}
                        onChange={(val) => setVleCity(val.slice(0, 40))}
                        preferType="city"
                        state={vleState}
                        placeholder=""
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Number (10 Digits)</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={vlePhone}
                      onChange={(e) => setVlePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder=""
                      className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Gmail ID (Email Alert)</label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={vleEmail}
                      onChange={(e) => setVleEmail(e.target.value.slice(0, 60))}
                      placeholder="name@example.com"
                      className="w-full px-3 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {vleAuthError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{vleAuthError}</p>}
                <button
                  type="submit"
                  disabled={verifyingGovt}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-extrabold shadow-lg shadow-indigo-900/30 mt-4 text-sm disabled:opacity-60"
                >
                  {verifyingGovt ? 'Sending code…' : 'Send Verification Code'}
                </button>

                <GoogleSignInButton
                  onCredential={handleVleRegisterGoogleCredential}
                  disabled={verifyingGovt}
                />
              </form>
            ) : (
              <form id="vle-register-otp-verify-form" onSubmit={async (e) => {
                e.preventDefault();
                if (verifyingGovt) return;
                setVleAuthError('');
                if (vleRegistrationOtpCode.length !== 4) {
                  setVleAuthError('');
                  return;
                }
                const missingVleRegisterVerifyFields = collectMissingFields([
                  { label: 'Operator Name', ok: isNonEmpty(vleName) },
                  { label: 'Jan Seva Kendra / Center Name', ok: isNonEmpty(vleCenterName) },
                  { label: 'CSC / Operator ID', ok: isNonEmpty(vleId) },
                  { label: 'State / UT', ok: isNonEmpty(vleState) },
                  { label: 'District', ok: isNonEmpty(vleDistrict) },
                  { label: 'City / Tehsil', ok: isNonEmpty(vleCity) },
                  { label: '10-Digit Mobile Number', ok: isValidMobile(vlePhone) },
                  { label: 'Gmail ID', ok: isValidEmail(vleEmail) },
                ]);
                if (missingVleRegisterVerifyFields.length > 0) {
                  setVleAuthError(requiredFieldsMessage(missingVleRegisterVerifyFields));
                  return;
                }
                if (vleRegisterVerifyLockRef.current) return;
                vleRegisterVerifyLockRef.current = true;
                setVerifyingGovt(true);
                try {
                  const verifyResponse = await fetchWithRetry('/api/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target: vlePhone, code: vleRegistrationOtpCode })
                  });
                  const verifyData = await parseJsonResponse(verifyResponse);
                  if (!verifyResponse.ok || !verifyData.verified || !verifyData.verificationToken) {
                    throw new Error(verifyData.error || 'Invalid code. Check your email and try again.');
                  }
                  const registerResponse = await fetchWithRetry('/api/vle/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: vleName,
                      centerName: vleCenterName,
                      photoUrl: vlePhotoUrl,
                      cscId: vleId,
                      state: vleState,
                      district: vleDistrict,
                      city: vleCity,
                      phone: vlePhone,
                      email: vleEmail,
                      pricingList: customPricingList,
                      verificationToken: verifyData.verificationToken
                    })
                  });
                  const registerData = await parseJsonResponse(registerResponse);
                  if (!registerResponse.ok || !registerData.success) {
                    throw new Error(registerData.error || 'Could not register this operator.');
                  }
                  const savedAccount = registerData.user || {};
                  const savedOperator = registerData.operator || registerData.vle || {};
                  const resolvedName = String(savedAccount.name || savedOperator.name || vleName || '').trim();
                  const resolvedCenter = String(savedAccount.centerName || savedOperator.centerName || vleCenterName || '').trim();
                  const resolvedCsc = String(savedAccount.cscId || savedOperator.cscId || vleId || '').trim();
                  const resolvedPhone = String(savedAccount.phone || savedOperator.phone || vlePhone || '').replace(/\D/g, '').slice(-10);
                  const resolvedEmail = String(savedAccount.email || savedOperator.email || vleEmail || '').trim().toLowerCase();
                  const resolvedState = String(savedAccount.state || savedOperator.state || vleState || '').trim();
                  const resolvedDistrict = String(savedAccount.district || savedOperator.district || vleDistrict || '').trim();
                  const resolvedCity = String(savedAccount.city || savedOperator.city || vleCity || '').trim();
                  const resolvedPhoto = String(savedAccount.photoUrl || savedOperator.photoUrl || vlePhotoUrl || '').trim();
                  if (resolvedName) setVleName(resolvedName);
                  if (resolvedCenter) setVleCenterName(resolvedCenter);
                  if (resolvedCsc) setVleId(resolvedCsc);
                  if (resolvedPhone) setVlePhone(resolvedPhone);
                  if (resolvedEmail) setVleEmail(resolvedEmail);
                  if (resolvedState) setVleState(resolvedState);
                  if (resolvedDistrict) setVleDistrict(resolvedDistrict);
                  if (resolvedCity) setVleCity(resolvedCity);
                  if (resolvedPhoto) setVlePhotoUrl(resolvedPhoto);
                  await fetchAllData();
                  localStorage.setItem('vle_operator_name', resolvedName || vleName);
                  localStorage.setItem('vle_center_name', resolvedCenter || vleCenterName);
                  localStorage.setItem('vle_csc_id', resolvedCsc || vleId);
                  localStorage.setItem('vle_phone', resolvedPhone || vlePhone);
                  localStorage.setItem('vle_email', resolvedEmail || vleEmail);
                  localStorage.setItem('vle_state', resolvedState || vleState);
                  localStorage.setItem('vle_district', resolvedDistrict || vleDistrict);
                  localStorage.setItem('vle_city', resolvedCity || vleCity);
                  if (resolvedPhoto) {
                    try { localStorage.setItem('vle_photo_url', resolvedPhoto); } catch {}
                  }
                  writeStoredSession({
                    role: 'vle',
                    name: resolvedName || vleName,
                    phone: resolvedPhone || vlePhone,
                    email: resolvedEmail || vleEmail,
                    state: resolvedState || vleState,
                    district: resolvedDistrict || vleDistrict,
                    city: resolvedCity || vleCity,
                    cscId: resolvedCsc || vleId,
                    token: registerData.token,
                    loggedInAt: Date.now()
                  });
                  setIsVleLoggedIn(true);
                  setActiveRole('vle');
                  setPendingRole('vle');
                  setLegalAccepted(false);
                  try { localStorage.removeItem(LEGAL_ACCEPTED_KEY); } catch {}
                  setShowLegalModal(true);
                } catch (error) {
                  setVleAuthError(error instanceof Error ? error.message : 'Registration verification failed.');
                } finally {
                  vleRegisterVerifyLockRef.current = false;
                  setVerifyingGovt(false);
                }
              }} className="space-y-4">
                <p className="text-sm text-slate-300">{t('Enter the 4-digit code sent to', 'भेजा गया 4 अंकों का कोड दर्ज करें')} {vleEmail}.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={4}
                  required
                  value={vleRegistrationOtpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setVleRegistrationOtpCode(val);
                  }}
                  placeholder="4-digit code"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {vleAuthError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{vleAuthError}</p>}
                <button type="submit" disabled={verifyingGovt || vleRegistrationOtpCode.length !== 4} className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-extrabold shadow-lg shadow-indigo-900/30 text-sm disabled:opacity-60">
                  {verifyingGovt ? 'Verifying…' : 'Verify & Register Operator'}
                </button>
                <button type="button" onClick={() => { setVleOtpSent(false); setVleRegistrationOtpCode(''); setVleAuthError(''); }} className="w-full text-center text-xs text-slate-400 hover:text-white">
                  ← Edit registration details / resend OTP
                </button>
              </form>
            )}

            <button onClick={() => { setVleOtpSent(false); setVleRegistrationOtpCode(''); setVleAuthError(''); setStep('vle_login'); }} className="w-full text-xs text-slate-400 hover:text-white pt-4 text-center block">
              ← Already registered? Login here
            </button>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 5. JAN SEVA KENDRA DASHBOARD (Live Bids, Auto-Open Talking Panel on Accept) */}
      {/* ========================================================================= */}
      {step === 'vle_home' && isVleLoggedIn && (
        <main
          ref={vleDashboardTopRef}
          id="vle-dashboard-top"
          className="flex-1 w-full min-w-0 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 box-border scroll-mt-20"
        >
          
          {/* Top Quick Navigation & Back Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                onClick={() => {
                  if (vleDashboardTab === 'open_market') {
                    setStep('landing');
                    setActiveRole('none');
                  } else {
                    setVleDashboardTab('open_market');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-blue-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-blue-400" />
                <span>{vleDashboardTab === 'open_market' ? t('Back to Home', 'होम पर वापस जाएँ') : t('Back to Dashboard', 'डैशबोर्ड पर वापस जाएँ')}</span>
              </button>
              {vleDashboardTab !== 'open_market' && (
                <span className="truncate text-xs sm:text-sm font-black text-slate-200">
                  {vleDashboardTab === 'active_bids_chats' ? `💬 ${t('My Active Chats', 'मेरी सक्रिय चैट')}`
                    : vleDashboardTab === 'pricing' ? `💲 ${t('Document Pricing', 'दस्तावेज़ मूल्य')}`
                    : vleDashboardTab === 'form_pricing' ? `📝 ${t('Form Filling Price', 'फॉर्म भरने का मूल्य')}`
                    : vleDashboardTab === 'all_saved' ? `📚 ${t('All Saved Forms Here', 'सभी सेव किए गए फॉर्म यहाँ')}`
                    : vleDashboardTab === 'payments' ? `💳 ${t('Payments & Payouts', 'भुगतान और राशि निकासी')}` : ''}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsKendraDetailsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-800 hover:border-sky-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer flex-shrink-0"
            >
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Profile &amp; Location</span>
            </button>
          </div>

          {/* Compact Profile & Location Card — full editor opens in the modal */}
          <div className="min-w-0 bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {vlePhotoUrl ? (
                  <img
                    src={vlePhotoUrl}
                    alt="Operator"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-500/50 bg-slate-800 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {vleCenterName || 'Jan Seva Kendra Name'}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {vleName || 'Operator Name'}{vleId ? ` • ${vleId}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>{[vleCity, vleDistrict, vleState].filter(Boolean).join(', ') || 'Location not set'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKendraDetailsModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Profile &amp; Location</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Direct UPI payment notice */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-start gap-3 text-blue-300 text-xs">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-blue-400 mt-0.5" />
            <div>
              <b className="text-white block font-bold mb-0.5">⚠️ Direct UPI Payment Notice:</b>
              {t(
                'UPI payments go directly to one operator VPA; the app does not split or verify the transfer. Check the recipient account before treating an order as paid.',
                'UPI भुगतान सीधे एक ऑपरेटर के VPA पर जाता है; ऐप भुगतान को बाँटता या सत्यापित नहीं करता। ऑर्डर को भुगतान हुआ मानने से पहले प्राप्तकर्ता खाते में जाँच करें।'
              )}
            </div>
          </div>

          {vleNotificationMsg && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center gap-3 text-blue-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{vleNotificationMsg}</span>
            </div>
          )}

          {/* Dashboard Tabs Navigation */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl w-full sm:w-max shadow-inner">
            {[
              { id: 'open_market', label: t('Open Market Bids', 'ओपन मार्केट बोलियाँ'), icon: Zap, color: 'text-blue-400 bg-blue-500/10' },
              { id: 'active_bids_chats', label: t('My Active Chats', 'मेरी सक्रिय चैट'), icon: MessageSquare, color: 'text-emerald-400 bg-emerald-500/10' },
              { id: 'pricing', label: t('Document Pricing', 'दस्तावेज़ मूल्य'), icon: Edit3, color: 'text-amber-400 bg-amber-500/10' },
              { id: 'form_pricing', label: t('Form Filling Price', 'फॉर्म भरने का मूल्य'), icon: FileText, color: 'text-emerald-400 bg-emerald-500/10' },
              { id: 'all_saved', label: t('All Saved Forms Here', 'सभी सेव किए गए फॉर्म यहाँ'), icon: FileText, color: 'text-violet-300 bg-violet-500/10' },
              { id: 'payments', label: t('Payments & Payouts', 'भुगतान और राशि निकासी'), icon: CreditCard, color: 'text-cyan-300 bg-cyan-500/10' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setVleDashboardTab(tab.id as any)}
                className={`flex min-w-0 w-full sm:w-auto items-center justify-center gap-2 px-2 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                  vleDashboardTab === tab.id
                    ? `${tab.color} border border-white/10 shadow-lg`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 shrink-0 ${vleDashboardTab === tab.id ? '' : 'text-slate-500'}`} />
                <span className="min-w-0 text-center leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>

          {vleDashboardTab === 'payments' && (
            <>
              {/* Jan Seva Kendra Total Earnings */}
              {(() => {
                const myAccepted = vleExclusiveOrders.filter(ord =>
                  ord.acceptedByVleId === vleId || ord.acceptedByName === vleName || ord.acceptedByVleName === vleName || ord.acceptedBy === vleId
                );
                const myCompleted = myAccepted.filter(ord => ord.status === 'completed' || ord.status === 'approved' || ord.isPaymentDoneInApp);
                const totalEarned = myCompleted.reduce((sum, o) => sum + (Number(o.amountPaid) || 0), 0);
                const activeChats = myAccepted.filter(ord => ord.status !== 'completed' && ord.status !== 'approved').length;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-6 bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 rounded-3xl border border-sky-500/30 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-extrabold text-sky-300 tracking-wider">💰 Total Earnings</span>
                      </div>
                      <div className="text-3xl font-black text-white font-mono">₹{totalEarned.toLocaleString()}</div>
                      <p className="text-xs text-slate-400">Jan Seva Kendra certificate services</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-3xl border border-emerald-500/30 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-extrabold text-emerald-300 tracking-wider">✅ Completed Orders</span>
                      </div>
                      <div className="text-3xl font-black text-white font-mono">{myCompleted.length}</div>
                      <p className="text-xs text-slate-400">Successfully processed applications</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-3xl border border-indigo-500/30 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-extrabold text-indigo-300 tracking-wider">⚡ Active Requests &amp; Chats</span>
                      </div>
                      <div className="text-3xl font-black text-white font-mono">{activeChats} Requests</div>
                      <p className="text-xs text-slate-400">Ongoing Jan Seva work</p>
                    </div>
                  </div>
                );
              })()}
              <PayoutSettingsPanel role="vle" phone={vlePhone} email={vleEmail} language={lang} />
            </>
          )}

          {vleDashboardTab === 'pricing' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Dynamic Pricing Builder */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6 overflow-hidden max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-blue-400" />
                      <span>Set Dynamic Document Pricing ({vleCity}, {vleDistrict})</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('Set fees for each certificate or service (PAN, Domicile, etc). Reflects directly in citizen catalog.', 'प्रत्येक दस्तावेज़ व सेवा का शुल्क निर्धारित करें (पैन, निवास प्रमाण पत्र आदि)। यह सीधे नागरिक कैटलॉग में दिखेगा।')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto overflow-x-hidden pr-1">
                  {(showAllVleDocPricing ? customPricingList : customPricingList.slice(0, 3)).map(item => (
                    <div key={item.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-inner overflow-hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[10px] text-sky-400 font-bold">Service / Document Name</span>
                          <input
                            type="text"
                            value={item.docName}
                            onChange={(e) => setCustomPricingList(prev => prev.map(p => p.id === item.id ? { ...p, docName: e.target.value } : p))}
                            className="w-full bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b border-slate-700 pb-0.5"
                          />
                        </div>
                        <button
                          onClick={() => setCustomPricingList(customPricingList.filter(p => p.id !== item.id))}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                            <span className="text-[10px] text-sky-400 font-bold">Govt ₹</span>
                            <input type="number" value={item.govtFee || ''} onChange={(e) => setCustomPricingList(prev => prev.map(p => p.id === item.id ? { ...p, govtFee: e.target.value } : p))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white" />
                         </div>
                         <div className="space-y-1">
                            <span className="text-[10px] text-amber-400 font-bold">CSC ₹</span>
                            <input type="number" value={item.cscFee || ''} onChange={(e) => setCustomPricingList(prev => prev.map(p => p.id === item.id ? { ...p, cscFee: e.target.value } : p))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white" />
                         </div>
                         <div className="space-y-1 col-span-2">
                            <span className="text-[10px] text-indigo-400 font-bold">Shulka Name (Fee Description)</span>
                            <input type="text" value={item.feeName || ''} onChange={(e) => setCustomPricingList(prev => prev.map(p => p.id === item.id ? { ...p, feeName: e.target.value } : p))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white" />
                         </div>
                         <div className="space-y-1 col-span-2">
                            <span className="text-[10px] text-emerald-400 font-bold">Total Final Price (₹)</span>
                            <input type="number" value={item.price || ''} onChange={(e) => setCustomPricingList(prev => prev.map(p => p.id === item.id ? { ...p, price: e.target.value } : p))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white" />
                         </div>
                         <div className="col-span-2 space-y-1">
                            <span className="text-[10px] text-purple-400 font-bold">Service Scope (kahan bhejna hai)</span>
                            <select value={item.scope || 'district'} onChange={(e) => setCustomPricingList(prev => prev.map(p => p.id === item.id ? { ...p, scope: e.target.value as any } : p))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white">
                              <option value="district">District — only my district Jan Seva</option>
                              <option value="national">National — all India Jan Seva</option>
                              <option value="online_form">Online Form — all Jan Seva + all Form Fillers</option>
                            </select>
                         </div>
                         <div className="col-span-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] text-emerald-200">
                           Total citizen pays = Govt Fee + Service Fee. Admin fee (17%) is carved out of the service fee; you keep 83%. No extra charge is added on top.
                         </div>
                      </div>
                      <GovtFeeCategoryFields
                        value={item.govtFeeByCategory}
                        onChange={(next) => setCustomPricingList(prev => prev.map(p => p.id === item.id ? { ...p, govtFeeByCategory: next } : p))}
                        t={t}
                        accent="amber"
                        fallbackFee={item.govtFee}
                      />
                    </div>
                  ))}
                </div>

                {customPricingList.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllVleDocPricing(prev => !prev)}
                    className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                  >
                    {showAllVleDocPricing ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showAllVleDocPricing ? t('Show Less', 'कम दिखाएँ') : `${t('Show All', 'सभी दिखाएँ')} (${customPricingList.length})`}</span>
                  </button>
                )}

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300">Add New Service</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Service Name" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                    <input type="text" placeholder="Fee Name (Shulka)" value={newDocFeeName} onChange={(e) => setNewDocFeeName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                    <input type="number" placeholder="Govt Fee" value={newDocGovtFee} onChange={(e) => setNewDocGovtFee(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                    <input type="number" placeholder="Service Fee (CSC)" value={newDocCscFee} onChange={(e) => setNewDocCscFee(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                    <select value={newDocScope} onChange={(e) => setNewDocScope(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                      <option value="district">District scope</option>
                      <option value="national">National scope</option>
                      <option value="online_form">Online Form scope</option>
                    </select>
                    <StateSelect
                      value={newDocState}
                      onChange={setNewDocState}
                      options={INDIAN_STATES}
                      emptyLabel={t('All India (visible everywhere)', 'पूरे भारत (हर जगह दिखेगा)')}
                      ariaLabel="Service State / UT"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 pr-9 py-2 text-xs text-white"
                    />
                  </div>
                  <GovtFeeCategoryFields
                    value={newDocGovtFeeByCategory}
                    onChange={setNewDocGovtFeeByCategory}
                    t={t}
                    accent="amber"
                    fallbackFee={newDocGovtFee}
                  />
                  <button
                    onClick={() => {
                      if (!newDocName) return;
                      const tot = String((parseInt(newDocGovtFee) || 0) + (parseInt(newDocCscFee) || 0));
                      setCustomPricingList([...customPricingList, { id: Date.now().toString(), docName: newDocName, govtFee: newDocGovtFee, govtFeeByCategory: newDocGovtFeeByCategory, cscFee: newDocCscFee, price: tot, feeName: newDocFeeName, requirements: newDocRequirements, scope: newDocScope, state: newDocState }]);
                      setNewDocName(''); setNewDocGovtFee(''); setNewDocGovtFeeByCategory({}); setNewDocCscFee(''); setNewDocPrice(''); setNewDocFeeName(''); setNewDocRequirements(''); setNewDocState('');
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Service</span>
                  </button>
                </div>

                <button
                  onClick={handleSavePricingConfig}
                  disabled={isSavingPricing}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2"
                >
                  {isSavingPricing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Document Pricing</span>
                </button>
              </div>
            </div>
          )}

          {vleDashboardTab === 'form_pricing' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Form Filling Pricing Builder */}
              <div className="bg-slate-900 rounded-3xl border border-emerald-500/30 p-6 sm:p-8 shadow-xl space-y-6 overflow-hidden max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      <span>Set Online Form Filling Pricing</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('Set your form filling service charges (NEET, JEE, SSC, UPPSC etc).', 'अपने फॉर्म भरने की दरें निर्धारित करें (NEET, JEE, SSC, UPPSC आदि)।')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto overflow-x-hidden pr-1">
                  {(showAllVleFormPricing ? vleFormFillingList : vleFormFillingList.slice(0, 3)).map(item => (
                    <div key={item.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 hover:border-emerald-500/30 transition-all shadow-inner overflow-hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[10px] text-emerald-400 font-bold">Form Name</span>
                          <input
                            type="text"
                            value={item.docName}
                            onChange={(e) => setVleFormFillingList(prev => prev.map(p => p.id === item.id ? { ...p, docName: e.target.value } : p))}
                            className="w-full bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b border-slate-700 pb-0.5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="space-y-1">
                             <span className="text-[10px] text-emerald-400 font-bold block">Price (₹)</span>
                             <input
                               type="number"
                               value={item.price}
                               onChange={(e) => setVleFormFillingList(prev => prev.map(p => p.id === item.id ? { ...p, price: e.target.value } : p))}
                               className="w-16 bg-slate-900 px-2 py-1 rounded text-xs text-white font-mono font-bold focus:outline-none border border-slate-800"
                             />
                          </div>
                          <button
                            onClick={() => setVleFormFillingList(vleFormFillingList.filter(p => p.id !== item.id))}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors self-end"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-400 font-bold">Fee Name (e.g. Govt Fee, Commission)</span>
                        <input
                          type="text"
                          value={item.feeName || ''}
                          onChange={(e) => setVleFormFillingList(prev => prev.map(p => p.id === item.id ? { ...p, feeName: e.target.value } : p))}
                          className="w-full bg-slate-900 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 border border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] text-amber-400 font-bold">Govt Fee (₹)</span>
                          <input
                            type="number"
                            value={item.govtFee || ''}
                            onChange={(e) => setVleFormFillingList(prev => prev.map(p => p.id === item.id ? { ...p, govtFee: e.target.value } : p))}
                            className="w-full bg-slate-900 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 border border-slate-800 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-cyan-400 font-bold">Service State / UT</span>
                          <StateSelect
                            value={item.state || ''}
                            onChange={(nextState) => setVleFormFillingList(prev => prev.map(p => p.id === item.id ? { ...p, state: nextState } : p))}
                            options={INDIAN_STATES}
                            emptyLabel={t('All India', 'पूरे भारत')}
                            ariaLabel="Service State / UT"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 pr-8 py-1.5 text-[11px] text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {t('Required Documents (Requirements)', 'ज़रूरी दस्तावेज़ (Required Documents)')}
                        </span>
                        <input
                          type="text"
                          value={item.requirements || ''}
                          onChange={(e) => setVleFormFillingList(prev => prev.map(p => p.id === item.id ? { ...p, requirements: e.target.value } : p))}
                          placeholder="Required Documents..."
                          className="w-full bg-slate-900 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 border border-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-purple-400 font-bold">Service Scope (kahan bhejna hai)</span>
                        <select value={item.scope || 'online_form'} onChange={(e) => setVleFormFillingList(prev => prev.map(p => p.id === item.id ? { ...p, scope: e.target.value as any } : p))} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white">
                          <option value="district">District — only my district Jan Seva</option>
                          <option value="national">National — all India Jan Seva</option>
                          <option value="online_form">Online Form — all Jan Seva + all Form Fillers</option>
                        </select>
                      </div>
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] text-emerald-200">
                        Total citizen pays = this fee. Admin fee (17%) is carved out; you keep 83%.
                      </div>
                      <GovtFeeCategoryFields
                        value={item.govtFeeByCategory}
                        onChange={(next) => setVleFormFillingList(prev => prev.map(p => p.id === item.id ? { ...p, govtFeeByCategory: next } : p))}
                        t={t}
                        accent="emerald"
                        fallbackFee={item.govtFee}
                      />
                    </div>
                  ))}
                </div>

                {vleFormFillingList.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllVleFormPricing(prev => !prev)}
                    className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                  >
                    {showAllVleFormPricing ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showAllVleFormPricing ? t('Show Less', 'कम दिखाएँ') : `${t('Show All', 'सभी दिखाएँ')} (${vleFormFillingList.length})`}</span>
                  </button>
                )}

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('Add New Form Filling Service', 'नई फॉर्म फिलिंग सेवा जोड़ें')}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Exam Name" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                    <input type="text" placeholder="Shulka Name (Fee Desc)" value={newDocFeeName} onChange={(e) => setNewDocFeeName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                    <input type="number" placeholder="Fee (₹)" value={newDocPrice} onChange={(e) => setNewDocPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none" />
                    <input type="number" placeholder="Govt Fee (₹)" value={newVleFormGovtFee} onChange={(e) => setNewVleFormGovtFee(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none" />
                    <StateSelect
                      value={newVleFormState}
                      onChange={setNewVleFormState}
                      options={INDIAN_STATES}
                      emptyLabel={t('All India (visible everywhere)', 'पूरे भारत (हर जगह दिखेगा)')}
                      ariaLabel="Service State / UT"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 pr-9 py-2 text-xs text-white outline-none"
                    />
                    <select value={newFormScope} onChange={(e) => setNewFormScope(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none">
                      <option value="online_form">Online Form — all Jan Seva + Form Fillers</option>
                      <option value="national">National — all India Jan Seva</option>
                      <option value="district">District — only my district</option>
                    </select>
                  </div>
                  <input type="text" placeholder="Zaroori Documents..." value={newDocRequirements} onChange={(e) => setNewDocRequirements(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                  <GovtFeeCategoryFields
                    value={newVleFormGovtFeeByCategory}
                    onChange={setNewVleFormGovtFeeByCategory}
                    t={t}
                    accent="emerald"
                    fallbackFee={newVleFormGovtFee}
                  />
                  <button
                    onClick={() => {
                      if (!newDocName || !newDocPrice) return;
                      setVleFormFillingList([...vleFormFillingList, { id: 'vle-f-' + Date.now(), docName: newDocName, price: newDocPrice, govtFee: newVleFormGovtFee, govtFeeByCategory: newVleFormGovtFeeByCategory, feeName: newDocFeeName, requirements: newDocRequirements, icon: '📝', expertName: vleCenterName || vleName, scope: newFormScope, state: newVleFormState }]);
                      setNewDocName(''); setNewDocPrice(''); setNewDocRequirements(''); setNewDocFeeName(''); setNewVleFormGovtFee(''); setNewVleFormGovtFeeByCategory({}); setNewVleFormState('');
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-emerald-500/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Form Service</span>
                  </button>
                </div>

                <button
                  onClick={async () => {
                    setIsSavingPricing(true);
                    try {
                      localStorage.setItem('fillup_vle_form_pricing', JSON.stringify(vleFormFillingList));
                      const res = await fetchWithRetry('/api/vle/pricing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pricingList: customPricingList, formFillingList: vleFormFillingList })
                      });
                      const data = await parseJsonResponse(res).catch(() => ({}));
                      if (res.ok && data.success !== false) {
                        setVleNotificationMsg('✅ Form Filling Prices saved successfully!');
                        showSaveToast('✅ Form prices saved successfully!');
                        void fetchAllData();
                      } else {
                        setVleNotificationMsg(data.error || 'Could not save form prices. Please try again.');
                      }
                      setTimeout(() => setVleNotificationMsg(''), 4000);
                    } catch {
                      setVleNotificationMsg('Could not save form prices. Please try again.');
                      setTimeout(() => setVleNotificationMsg(''), 4000);
                    }
                    setIsSavingPricing(false);
                  }}
                  disabled={isSavingPricing}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm shadow-lg"
                >
                  <span>Save Form Prices</span>
                </button>
              </div>
            </div>
          )}

          {vleDashboardTab === 'all_saved' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 rounded-3xl border border-violet-500/30 p-6 sm:p-8 shadow-xl space-y-8 max-w-5xl mx-auto">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-400" />
                    <span>{t('All Saved Forms Here', 'सभी सेव किए गए फॉर्म यहाँ')}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('All your saved Document Prices and Form Filling Prices in one place — no long scrolling needed.', 'आपके सेव किए हुए सभी दस्तावेज़ मूल्य और फॉर्म भरने के मूल्य एक ही जगह — लंबा स्क्रॉल करने की ज़रूरत नहीं।')}
                  </p>
                </div>

                {/* Saved Document Pricing */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                      <span>📄</span>
                      <span>{t('Saved Document Prices', 'सेव किए गए दस्तावेज़ मूल्य')} ({customPricingList.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setVleDashboardTab('pricing')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all"
                    >
                      Edit
                    </button>
                  </div>
                  {customPricingList.length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      {t('No document prices saved yet. Add them in the Document Pricing tab.', 'अभी कोई दस्तावेज़ मूल्य सेव नहीं है। Document Pricing टैब में जोड़ें।')}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customPricingList.map(item => (
                        <div key={item.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-sm font-bold text-white break-words min-w-0">{item.docName || 'Untitled Service'}</h5>
                            <span className="shrink-0 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono">
                              ₹{Number(item.price) || 0}
                            </span>
                          </div>
                          {item.feeName && <p className="text-[10px] text-slate-400 truncate">{item.feeName}</p>}
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                            <span className="text-amber-300">Govt ₹{item.govtFee || 0}</span>
                            <span className="text-emerald-300">CSC ₹{item.cscFee || 0}</span>
                            <span className="text-cyan-300">{item.state || 'All India'}</span>
                            <span className="text-violet-300">
                              {item.scope === 'national' ? 'National' : item.scope === 'online_form' ? 'Online Form' : 'District'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Saved Form Filling Pricing */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-black text-emerald-300 flex items-center gap-2">
                      <span>📝</span>
                      <span>{t('Saved Form Filling Prices', 'सेव किए गए फॉर्म भरने के मूल्य')} ({vleFormFillingList.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setVleDashboardTab('form_pricing')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition-all"
                    >
                      Edit
                    </button>
                  </div>
                  {vleFormFillingList.length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      {t('No form filling prices saved yet. Add them in the Form Filling Price tab.', 'अभी कोई फॉर्म भरने का मूल्य सेव नहीं है। Form Filling Price टैब में जोड़ें।')}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {vleFormFillingList.map(item => (
                        <div key={item.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-sm font-bold text-white break-words min-w-0">{item.docName || 'Untitled Form'}</h5>
                            <span className="shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                              ₹{Number(item.price) || 0}
                            </span>
                          </div>
                          {item.feeName && <p className="text-[10px] text-slate-400 truncate">{item.feeName}</p>}
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                            <span className="text-amber-300">Govt ₹{item.govtFee || 0}</span>
                            <span className="text-cyan-300">{item.state || 'All India'}</span>
                            <span className="text-violet-300">
                              {item.scope === 'national' ? 'National' : item.scope === 'district' ? 'District' : 'Online Form'}
                            </span>
                          </div>
                          {item.requirements && (
                            <p className="text-[10px] text-slate-400 line-clamp-2">
                              <b className="text-slate-300">Docs:</b> {item.requirements}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {vleDashboardTab === 'open_market' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Exclusive Incoming Jan Seva Kendra Requests */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl space-y-4 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-400 animate-bounce" />
                    <span>Incoming Certificate Bids ({vleExclusiveOrders.length})</span>
                  </h3>
                  <button
                    onClick={handleManualRefresh}
                    disabled={isManualRefreshing}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isManualRefreshing ? 'Refreshing…' : 'Refresh Feed'}</span>
                  </button>
                </div>

                {vleBidStatusMsg && (
                  <div className={`p-3.5 rounded-2xl border text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                    vleBidStatusMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  }`}>
                    <span className="font-semibold">{vleBidStatusMsg.text}</span>
                    <button onClick={() => setVleBidStatusMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {isInitialLoading && vleExclusiveOrders.length === 0 ? (
                    <WorkspaceSkeletonList count={3} />
                  ) : vleExclusiveOrders.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">Abhi koi bid nahi hai.</div>
                  ) : (
                    vleExclusiveOrders.map(ord => {
                      const isAcceptedByMe = (ord.acceptedByVleId === vleId || ord.acceptedByName === vleName || ord.acceptedByVleName === vleName);
                      return (
                        <div key={ord.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-sm truncate">{ord.formTitle || ord.serviceName}</h4>
                            <p className="text-xs text-slate-400">Citizen: {ord.clientName}</p>
                            {ord.applicantCategory && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                Category: {categoryLabel(ord.applicantCategory)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-blue-400 font-mono font-bold text-sm">₹{ord.amountPaid}</span>
                            {ord.status === 'pending' ? (
                              <button
                                onClick={async () => {
                                   if (acceptingOrderId) return;
                                   setAcceptingOrderId(ord.id);
                                   try {
                                     setVleBidStatusMsg(null);
                                     const res = await fetch(`/api/vle/orders/${ord.id}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vleId, vleName }) });
                                     const data = await parseJsonResponse(res);
                                     if (data.success) { 
                                       setVleBidStatusMsg({ text: '✅ Bid accepted! Please set the fees to unlock chat.', type: 'success' });
                                       if (soundAlertEnabled) playChime();
                                       setVleDashboardTab('active_bids_chats'); 
                                       setIsWorkspaceMinimized(false);
                                       setActiveWorkspaceOrder(data.order || ord);
                                       setWorkspaceStatusMsg({ text: data.message || '✅ Bid accepted! Set the fees to unlock chat.', type: 'success' });
                                       await fetchAllData(); 
                                     } else {
                                       setVleBidStatusMsg({ 
                                         text: data.error || data.message || 'Unable to accept bid. Please try again.', 
                                         type: 'error' 
                                       });
                                       await fetchAllData();
                                     }
                                   } catch (err) {
                                     console.warn('Accept bid error:', err);
                                     setVleBidStatusMsg({ 
                                       text: 'Network error. Unable to accept bid.', 
                                       type: 'error' 
                                     });
                                   } finally {
                                     setAcceptingOrderId(null);
                                   }
                                }}
                                disabled={Boolean(acceptingOrderId)}
                                className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {acceptingOrderId === ord.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Accepting…</span>
                                  </>
                                ) : (
                                  <span>Accept</span>
                                )}
                              </button>
                            ) : isAcceptedByMe ? (
                              <button onClick={() => { setActiveWorkspaceOrder(ord); setVleDashboardTab('active_bids_chats'); }} className="px-3.5 py-2 bg-slate-800 text-emerald-300 text-xs font-bold rounded-xl cursor-pointer">Open</button>
                            ) : (
                              <span className="text-[10px] text-slate-500">Locked</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {vleDashboardTab === 'active_bids_chats' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl space-y-4 max-w-4xl mx-auto">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <span>My Active Workspaces & Chats</span>
                </h3>
                <div className="grid grid-cols-1 gap-3">
                   {vleExclusiveOrders.filter(o => o.status !== 'pending' && (o.acceptedByVleId === vleId || o.acceptedByName === vleName || o.acceptedByVleName === vleName)).length === 0 ? (
                     <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">No active chats.</div>
                   ) : (
                     vleExclusiveOrders.filter(o => o.status !== 'pending' && (o.acceptedByVleId === vleId || o.acceptedByName === vleName || o.acceptedByVleName === vleName)).map(ord => (
                       <div key={ord.id} className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/20 flex items-center justify-between gap-4">
                         <div className="flex-1">
                           <h4 className="font-bold text-white text-sm">{ord.formTitle || ord.serviceName}</h4>
                           <p className="text-xs text-slate-400">Client: {ord.clientName}</p>
                         </div>
                         <button onClick={() => setActiveWorkspaceOrder(ord)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl cursor-pointer">Open Panel</button>
                       </div>
                     ))
                   )}
                </div>
              </div>
            </div>
          )}

        </main>
      )}

      {/* ========================================================================= */}
      {/* 6. FORM FILLERS DASHBOARD                                                 */}
      {/* ========================================================================= */}
      {step === 'form_filler_login' && (
        <main className="flex-1 w-full min-w-0 max-w-lg mx-auto box-border px-4 py-8 sm:py-12">
          <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-emerald-400/80 via-teal-500/40 to-cyan-600/70 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.3),0_15px_30px_-10px_rgba(2,6,23,0.8)] transition-all duration-500 group">
            <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-200/90 to-transparent blur-[0.5px] pointer-events-none z-20" />
            
            <div className="bg-[#070A10]/95 backdrop-blur-2xl rounded-[22px] p-6 sm:p-10 relative overflow-hidden space-y-6 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              {/* Ambient Glows */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-[90px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-600/20 rounded-full blur-[90px] pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <button
                  onClick={() => {
                    if (fillerOtpSent) {
                      setFillerOtpSent(false);
                    } else {
                      setIsFillerRegistering(false);
                      setStep('landing');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-emerald-300 hover:text-white border border-white/[0.1] text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{fillerOtpSent ? 'Back' : 'Home'}</span>
                </button>
              </div>

              {/* 3D Brand Logo & Header */}
              <div className="text-center space-y-3 relative z-10">
                <div className="flex justify-center">
                  <BrandEmblem3D size="lg" layout="col" subtitle="FORM FILLER EXPERT HUB" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 font-['Inter',sans-serif] tracking-tight">
                    {isFillerRegistering ? 'Register Form Filler Expert' : 'Form Filler Operator Login'}
                  </h2>
                  <p className="text-xs text-emerald-300/90 font-medium mt-1">Strict credential verification required. Authorized access only.</p>
                </div>
              </div>

              {!fillerOtpSent ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setFillerAuthError('');
                  setFillerAuthNotice('');
                  const missingFillerFields = collectMissingFields([
                    { label: 'Expert Name', ok: isNonEmpty(fillerName) },
                    { label: '10-Digit Mobile Number', ok: isValidMobile(fillerPhone) },
                    { label: 'Gmail ID', ok: isValidEmail(fillerEmail) },
                    ...(isFillerRegistering ? [
                      { label: 'State / UT', ok: isNonEmpty(fillerState) },
                      { label: 'District', ok: isNonEmpty(fillerDistrict) },
                      { label: 'City / Tehsil', ok: isNonEmpty(fillerCity) },
                    ] : []),
                  ]);
                  if (missingFillerFields.length > 0) {
                    setFillerAuthError(requiredFieldsMessage(missingFillerFields));
                    return;
                  }
                  setIsFillerAuthBusy(true);
                  try {
                    const captchaToken = await getCaptchaToken();
                    const response = await fetchWithRetry('/api/auth/send-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ channel: 'both', target: fillerPhone, emailTarget: fillerEmail, role: 'filler', name: fillerName, captchaToken })
                    });
                    const data = await parseJsonResponse(response);
                    if (!response.ok || !data.success) {
                      throw new Error(data.error || ('Could not send the verification code. (HTTP ' + response.status + ') body=' + JSON.stringify(data)));
                    }
                    setFillerOtpDeliveryMessage(data.message || '');
                    setFillerMobileOtpCode('');
                    setFillerAuthError('');
                    setFillerOtpSent(true);
                  } catch (error) {
                    setFillerAuthError(error instanceof Error ? error.message : 'Could not start verification. Please try again.');
                  } finally {
                    setIsFillerAuthBusy(false);
                  }
                }} className="space-y-4 relative z-10">
                  <div className="space-y-1.5">
                    <label className="h-5 flex items-center text-xs font-medium text-slate-300">Expert Name</label>
                    <div className="h-12 relative rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 flex items-center transition-all">
                      <input
                        type="text"
                        required
                        maxLength={50}
                        value={fillerName}
                        onChange={(e) => setFillerName(e.target.value.slice(0, 50))}
                        placeholder="Expert Operator Name"
                        className="w-full h-full px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500 min-w-0"
                      />
                    </div>
                  </div>

                  {/* Mobile Number & Registered Gmail ID side-by-side in 1 row */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="space-y-1.5 flex flex-col min-w-0">
                      <label className="h-5 flex items-center justify-between text-xs font-medium text-slate-300 min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">Mobile Number</span>
                        </span>
                      </label>
                      <div className="h-12 relative rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 flex items-center transition-all">
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={fillerPhone}
                          onChange={(e) => setFillerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10 Digits No."
                          className="w-full h-full px-3.5 sm:px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500 font-mono min-w-0"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 flex flex-col min-w-0">
                      <label className="h-5 flex items-center justify-between text-xs font-medium text-slate-300 min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <Mail className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span className="truncate">{isFillerRegistering ? 'Gmail' : 'Registered Gmail'}</span>
                        </span>
                      </label>
                      <div className="h-12 relative rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 flex items-center transition-all">
                        <input
                          type="text"
                          name="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          spellCheck={false}
                          required
                          maxLength={60}
                          value={fillerEmail}
                          onChange={(e) => setFillerEmail(e.target.value.slice(0, 60))}
                          placeholder="name@example.com"
                          className="w-full h-full px-3.5 sm:px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500 min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  {isFillerRegistering && (
                    <div className="space-y-1.5 w-full">
                      <label className="h-5 flex items-center text-xs font-medium text-slate-300">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /><span>State / UT</span></span>
                      </label>
                      <div className="h-12 relative rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 flex items-center transition-all">
                        <StateSelect
                          value={fillerState}
                          onChange={setFillerState}
                          options={INDIAN_STATES}
                          emptyLabel={t('Select State / UT', 'राज्य / केंद्र शासित प्रदेश चुनें')}
                          ariaLabel="State / UT"
                          className="w-full h-full px-3.5 pr-9 sm:px-4 bg-transparent text-white text-sm focus:outline-none min-w-0"
                        />
                      </div>
                    </div>
                  )}

                  {isFillerRegistering && (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="space-y-1.5 flex flex-col min-w-0">
                        <label className="h-5 flex items-center justify-between text-xs font-medium text-slate-300 min-w-0">
                          <span className="flex items-center gap-1.5 min-w-0 truncate">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">District</span>
                          </span>
                        </label>
                        <div className="h-12 relative rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 flex items-center transition-all">
                          <LocationAutocomplete
                            value={fillerDistrict}
                            onChange={(val) => setFillerDistrict(val.slice(0, 40))}
                            preferType="district"
                            state={fillerState}
                            placeholder="Lucknow / Kanpur"
                            wrapperClassName="w-full h-full flex items-center"
                            className="w-full h-full px-3.5 sm:px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500 min-w-0"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 flex flex-col min-w-0">
                        <label className="h-5 flex items-center justify-between text-xs font-medium text-slate-300 min-w-0">
                          <span className="flex items-center gap-1.5 min-w-0 truncate">
                            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">City / Tehsil</span>
                          </span>
                        </label>
                        <div className="h-12 relative rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 flex items-center transition-all">
                          <LocationAutocomplete
                            value={fillerCity}
                            onChange={(val) => setFillerCity(val.slice(0, 40))}
                            preferType="city"
                            state={fillerState}
                            placeholder="e.g. Sadar"
                            wrapperClassName="w-full h-full flex items-center"
                            className="w-full h-full px-3.5 sm:px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-zinc-500 min-w-0"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500">{fillerOtpDeliveryMessage || 'A verification code will be sent to your Gmail.'}</p>
                  {fillerAuthError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{fillerAuthError}</p>}
                  <button
                    type="submit"
                    disabled={isFillerAuthBusy}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-emerald-900/30 text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isFillerAuthBusy ? 'Sending code…' : isFillerRegistering ? 'Send Code & Register' : 'Send Code & Access Hub'}</span>
                  </button>

                  <GoogleSignInButton
                    onCredential={handleFillerGoogleCredential}
                    disabled={isFillerAuthBusy}
                  />
                </form>
              ) : (
                <form id="filler-otp-verify-form" onSubmit={async (e) => {
                  e.preventDefault();
                  if (isFillerAuthBusy) return;
                  setFillerAuthError('');
                  if (fillerMobileOtpCode.length !== 4) {
                    setFillerAuthError('');
                    return;
                  }
                  const missingFillerVerifyFields = collectMissingFields([
                    { label: 'Expert Name', ok: isNonEmpty(fillerName) },
                    { label: '10-Digit Mobile Number', ok: isValidMobile(fillerPhone) },
                    { label: 'Gmail ID', ok: isValidEmail(fillerEmail) },
                    ...(isFillerRegistering ? [
                      { label: 'State / UT', ok: isNonEmpty(fillerState) },
                      { label: 'District', ok: isNonEmpty(fillerDistrict) },
                      { label: 'City / Tehsil', ok: isNonEmpty(fillerCity) },
                    ] : []),
                  ]);
                  if (missingFillerVerifyFields.length > 0) {
                    setFillerAuthError(requiredFieldsMessage(missingFillerVerifyFields));
                    return;
                  }
                  if (fillerVerifyLockRef.current) return;
                  fillerVerifyLockRef.current = true;
                  setIsFillerAuthBusy(true);
                  try {
                    const verifyResponse = await fetchWithRetry('/api/auth/verify-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ target: fillerPhone, code: fillerMobileOtpCode })
                    });
                    const verifyData = await parseJsonResponse(verifyResponse);
                    if (!verifyResponse.ok || !verifyData.verified) {
                      throw new Error(verifyData.error || 'Invalid OTP. Please check the code and try again.');
                    }
                    if (!verifyData.verificationToken) {
                      throw new Error('OTP verification expired. Request a new code.');
                    }
                    const loginResponse = await fetchWithRetry(isFillerRegistering ? '/api/filler/register' : '/api/filler/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: fillerName,
                        phone: fillerPhone,
                        email: fillerEmail,
                        state: fillerState,
                        district: fillerDistrict,
                        city: fillerCity,
                        verificationToken: verifyData.verificationToken
                      })
                    });
                    const loginData = await parseJsonResponse(loginResponse);
                    if (!loginResponse.ok || !loginData.success) {
                      throw new Error(loginData.error || 'Form Filler login failed. Please try again.');
                    }
                    if (isFillerRegistering) {
                      setFillerAuthNotice('');
                    }
                    const savedUser = loginData.user || {};
                    const resolvedName = String(savedUser.name || fillerName || '').trim();
                    const resolvedPhone = String(savedUser.phone || fillerPhone || '').replace(/\D/g, '').slice(-10);
                    const resolvedEmail = String(savedUser.email || fillerEmail || '').trim().toLowerCase();
                    const accountState = String(savedUser.state || fillerState || '').trim();
                    const rawAccountDistrict = String(savedUser.district || fillerDistrict || '').trim();
                    const accountDistrict = sameAsStateValue(rawAccountDistrict, accountState) ? '' : rawAccountDistrict;
                    const rawAccountCity = String(savedUser.city || fillerCity || '').trim();
                    const accountCity = sameAsStateValue(rawAccountCity, accountState) ? '' : rawAccountCity;

                    if (resolvedName) setFillerName(resolvedName);
                    if (resolvedPhone) setFillerPhone(resolvedPhone);
                    if (resolvedEmail) setFillerEmail(resolvedEmail);
                    if (accountState) setFillerState(accountState);
                    if (accountDistrict) setFillerDistrict(accountDistrict);
                    if (accountCity) setFillerCity(accountCity);

                    localStorage.setItem('filler_operator_name', resolvedName || fillerName);
                    localStorage.setItem('filler_phone', resolvedPhone || fillerPhone);
                    localStorage.setItem('filler_email', resolvedEmail || fillerEmail);
                    if (accountState) localStorage.setItem('filler_state', accountState);
                    if (accountDistrict) localStorage.setItem('filler_district', accountDistrict);
                    if (accountCity) localStorage.setItem('filler_city', accountCity);
                    writeStoredSession({
                      role: 'form_filler',
                      name: resolvedName || fillerName,
                      phone: resolvedPhone || fillerPhone,
                      email: resolvedEmail || fillerEmail,
                      state: accountState || fillerState,
                      district: accountDistrict || fillerDistrict,
                      city: accountCity || fillerCity,
                      token: loginData.token,
                      loggedInAt: Date.now()
                    });
                    setIsFormFillerLoggedIn(true);
                    setActiveRole('form_filler');
                    setPendingRole('form_filler');
                    setLegalAccepted(false);
                    try { localStorage.removeItem(LEGAL_ACCEPTED_KEY); } catch {}
                    setShowLegalModal(true);
                    setFillerOtpSent(false);
                    setFillerMobileOtpCode('');
                  } catch (error) {
                    setFillerAuthError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
                  } finally {
                    fillerVerifyLockRef.current = false;
                    setIsFillerAuthBusy(false);
                  }
                }} className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] text-slate-400 font-semibold">{t('Enter the 4-digit code sent to your Gmail:', 'Gmail पर भेजा गया 4 अंकों का कोड दर्ज करें:')}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-emerald-400">Gmail OTP</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      value={fillerMobileOtpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setFillerMobileOtpCode(val);
                      }}
                      placeholder="• • • •"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-center text-lg font-black tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <p className="text-xs text-slate-400">The code was sent to {fillerEmail}.</p>
                  {fillerAuthError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{fillerAuthError}</p>}
                  <button
                    type="submit"
                    disabled={isFillerAuthBusy || fillerMobileOtpCode.length !== 4}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm hover:shadow-xl transition-all"
                  >
                    {isFillerAuthBusy ? 'Verifying…' : isFillerRegistering ? 'Verify & Register' : 'Verify & Enter Expert Hub'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFillerOtpSent(false);
                      setFillerMobileOtpCode('');
                      setFillerAuthError('');
                    }}
                    className="w-full text-center text-xs text-zinc-400 hover:text-emerald-300 transition-colors pt-1"
                  >
                    ← Edit Details / Resend OTP
                  </button>
                </form>
              )}

              {!fillerOtpSent && (
                <>
                  {fillerAuthNotice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">{fillerAuthNotice}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      setIsFillerRegistering(!isFillerRegistering);
                      setFillerAuthError('');
                      setFillerAuthNotice('');
                    }}
                    className="w-full text-center text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
                  >
                    {isFillerRegistering ? 'Already registered? Log in' : 'New Form Filler Expert? Register'}
                  </button>
                </>
              )}

              <button onClick={() => { setIsFillerRegistering(false); setFillerOtpSent(false); setStep('landing'); }} className="w-full text-xs text-slate-400 hover:text-white pt-2 text-center block">
                ← Back to Portal Selection
              </button>
            </div>
          </div>
        </main>
      )}

      {step === 'form_filler_app' && isFormFillerLoggedIn && (
        <main
          ref={fillerDashboardTopRef}
          id="filler-dashboard-top"
          className="flex-1 w-full min-w-0 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 box-border scroll-mt-20"
        >
          {/* Top Header Bar with Back to Home / Dashboard (Cleanly positioned at top) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (fillerDashboardTab === 'services') {
                    setStep('landing');
                    setActiveRole('none');
                  } else {
                    setFillerDashboardTab('services');
                  }
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-blue-400" />
                <span>{fillerDashboardTab === 'services' ? t('Back to Home', 'होम पर वापस जाएँ') : t('Back to Dashboard', 'डैशबोर्ड पर वापस जाएँ')}</span>
              </button>
              <h2 className="min-w-0 truncate text-xl sm:text-2xl font-black text-white">
                {fillerDashboardTab === 'services' ? (
                  <>{t('Form Expert Dashboard:', 'फॉर्म विशेषज्ञ डैशबोर्ड:')} <span className="text-emerald-400">{fillerName || t('Expert', 'विशेषज्ञ')}</span> ✍️</>
                ) : fillerDashboardTab === 'all_saved' ? (
                  <>📚 {t('All Saved Forms Here', 'सभी सेव किए गए फॉर्म यहाँ')}</>
                ) : (
                  <>💳 {t('Payments & Payouts', 'भुगतान और राशि निकासी')}</>
                )}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-2">
            <button
              type="button"
              onClick={() => setFillerDashboardTab('services')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${fillerDashboardTab === 'services' ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <FileText className="h-4 w-4" /> {t('Forms & Requests', 'फॉर्म और अनुरोध')}
            </button>
            <button
              type="button"
              onClick={() => setFillerDashboardTab('all_saved')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${fillerDashboardTab === 'all_saved' ? 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <FileText className="h-4 w-4" /> {t('All Saved Forms Here', 'सभी सेव किए गए फॉर्म यहाँ')}
            </button>
            <button
              type="button"
              onClick={() => setFillerDashboardTab('payments')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${fillerDashboardTab === 'payments' ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <CreditCard className="h-4 w-4" /> {t('Payments & Payouts', 'भुगतान और राशि निकासी')}
            </button>
            <button
              type="button"
              onClick={() => setIsFillerDetailsModalOpen(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-400 hover:bg-white/5 hover:text-white transition"
              title={t('Profile & Location', 'प्रोफ़ाइल और स्थान')}
            >
              <UserCheck className="h-4 w-4" /> {t('Profile & Location', 'प्रोफ़ाइल और स्थान')}
            </button>
          </div>

          {fillerDashboardTab === 'payments' ? (
            <PayoutSettingsPanel role="filler" phone={fillerPhone} email={fillerEmail} language={lang} />
          ) : fillerDashboardTab === 'all_saved' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 rounded-3xl border border-violet-500/30 p-6 sm:p-8 shadow-xl space-y-6 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-violet-400" />
                      <span>{t('All Saved Forms Here', 'सभी सेव किए गए फॉर्म यहाँ')}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('All your published forms in one place. To edit or delete, open the Forms & Requests tab.', 'आपके प्रकाशित सभी फॉर्म एक ही जगह। संपादित या हटाने के लिए Forms & Requests टैब खोलें।')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFillerDashboardTab('services')}
                    className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shrink-0"
                  >
                    + Add / Edit Forms
                  </button>
                </div>
                {fillerServices.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    {t('No forms published yet. Add a new form in the Forms & Requests tab.', 'अभी कोई फॉर्म प्रकाशित नहीं हुआ है। Forms & Requests टैब में नया फॉर्म जोड़ें।')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fillerServices.map((srv) => (
                      <div key={srv.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FormCard3DIcon icon={srv.icon} size="md" />
                            <div className="min-w-0">
                              <h5 className="text-xs sm:text-sm font-bold text-white line-clamp-2">{srv.docName}</h5>
                              <span className="text-[11px] text-emerald-400 font-medium">By: {srv.expertName}</span>
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                            ₹{Number(srv.price) + Number(srv.govtFee || 0)}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 line-clamp-2">
                          <b className="text-slate-400">Required Documents:</b> {srv.requirements}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                          <span className="text-amber-300">Govt ₹{srv.govtFee || 0}</span>
                          <span className="text-emerald-300">Service ₹{srv.price}</span>
                          <span className="text-cyan-300">{srv.state || 'All India'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
          <>
          {/* Form Filler Wallet & Earnings Tracker (Total Earnings and 3 cards Placed Up at Top) */}
          {(() => {
            const myCompleted = fillerOrders.filter(ord => 
              (ord.acceptedByFillerName === fillerName || ord.acceptedByVleId === fillerName || ord.acceptedByFillerId === ('FILLER-' + fillerPhone)) && 
              (ord.status === 'completed' || ord.status === 'approved' || ord.isPaymentDoneInApp)
            );
            const totalEarned = myCompleted.reduce((sum, o) => sum + (Number(o.amountPaid) || 0), 0);
            const activeBids = fillerOrders.filter(ord => 
              (ord.acceptedByFillerName === fillerName || ord.acceptedByVleId === fillerName || ord.acceptedByFillerId === ('FILLER-' + fillerPhone)) &&
              ord.status !== 'completed' && ord.status !== 'approved'
            ).length;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 rounded-3xl border border-sky-500/30 shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-extrabold text-sky-300 tracking-wider">💰 Total Earnings</span>
                  </div>
                  <div className="text-3xl font-black text-white font-mono">₹{totalEarned.toLocaleString()}</div>
                  <p className="text-xs text-slate-400">Custom form writing &amp; verified expert payouts</p>
                </div>

                <div className="p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-3xl border border-emerald-500/30 shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-extrabold text-emerald-300 tracking-wider">✅ Forms Written</span>
                  </div>
                  <div className="text-3xl font-black text-white font-mono">{myCompleted.length}</div>
                  <p className="text-xs text-slate-400">Successfully submitted application drafts &amp; proofs</p>
                </div>

                <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-3xl border border-indigo-500/30 shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-extrabight text-indigo-300 tracking-wider">⚡ Active Requests &amp; Chats</span>
                  </div>
                  <div className="text-3xl font-black text-white font-mono">{activeBids} Requests</div>
                  <p className="text-xs text-slate-400">Open market customer inquiries &amp; active communications</p>
                </div>
              </div>
            );
          })()}

          {/* Form Filler Expert: Proper Form Creation & Pricing Manager */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-slate-900 to-slate-950 border border-emerald-400/40 p-1.5 flex items-center justify-center shadow-[0_6px_20px_rgba(16,185,129,0.35)] shrink-0 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-400/10 rounded-2xl blur-sm pointer-events-none" />
                  <svg viewBox="0 0 100 100" className="w-9 h-9 drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]">
                    <defs>
                      <radialGradient id="grad3dFormBgExpert" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="45%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#064e3b" />
                      </radialGradient>
                      <linearGradient id="grad3dFoldExpert" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a7f3d0" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                      <linearGradient id="grad3dPenTipExpert" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                    <polygon points="32,22 80,36 60,86 12,72" fill="#022c22" opacity="0.6" />
                    <polygon points="28,16 76,30 56,80 8,66" fill="url(#grad3dFormBgExpert)" />
                    <polygon points="62,26 76,30 68,40" fill="url(#grad3dFoldExpert)" opacity="0.9" />
                    <line x1="22" y1="36" x2="52" y2="44" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
                    <line x1="20" y1="46" x2="48" y2="54" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
                    <line x1="18" y1="56" x2="42" y2="62" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                    <polygon points="64,52 82,34 88,40 70,58" fill="url(#grad3dPenTipExpert)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))" />
                    <polygon points="64,52 70,58 60,62" fill="#7dd3fc" />
                    <circle cx="60" cy="62" r="1.5" fill="#ffffff" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    Create New Application Form (Form Creation &amp; Pricing)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set form name, pricing and required documents list — once published, this will instantly appear in the Citizen Dashboard. Your expert name and state come from your saved Expert Details.
                  </p>
                </div>
              </div>
            </div>

            {formSaveSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs text-emerald-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{formSaveSuccessMsg}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormSaveSuccessMsg('')}
                  className="text-emerald-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form Inputs Grid */}
            <form id="filler-form-editor" onSubmit={handlePublishFillerForm} className="space-y-4">
              {editingFillerServiceId && (
                <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-bold">✏️ Edit mode: published form update ho raha hai. Govt fee change karke Save karo.</span>
                  <button
                    type="button"
                    onClick={cancelFillerFormEdit}
                    className="rounded-lg border border-amber-400/40 px-3 py-1.5 font-bold text-amber-100 hover:bg-amber-500/20"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Form Name */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-emerald-400 font-black">1.</span>
                    <span>Form Name (Application / Exam Form Name) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={newFormDocName}
                    onChange={(e) => setNewFormDocName(e.target.value)}
                    placeholder="e.g. UP Police Constable 2026, NEET UG 2026, Scholarship, SSC CGL"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500 font-medium"
                  />
                </div>

                {/* 2. Form Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-emerald-400 font-black">2.</span>
                    <span>Price / Fees (₹) *</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      required
                      min={10}
                      max={10000}
                      value={newFormPrice}
                      onChange={(e) => setNewFormPrice(e.target.value)}
                      placeholder="120"
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-emerald-400 font-black">2a.</span>
                    <span>Government Fee (₹)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={newFillerFormGovtFee}
                      onChange={(e) => setNewFillerFormGovtFee(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>
                <GovtFeeCategoryFields
                  value={newFillerFormGovtFeeByCategory}
                  onChange={setNewFillerFormGovtFeeByCategory}
                  t={t}
                  accent="emerald"
                  fallbackFee={newFillerFormGovtFee}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category / Icon */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-emerald-400 font-black">3.</span>
                    <span>Category Icon</span>
                  </label>
                  <select
                    value={newFormIcon}
                    onChange={(e) => setNewFormIcon(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="🎓">🎓 Scholarship &amp; College</option>
                    <option value="📋">📋 Sarkari Job &amp; SSC</option>
                    <option value="🩺">🩺 Medical &amp; NEET</option>
                    <option value="⚡">⚡ Engineering &amp; JEE</option>
                    <option value="👮">👮 Police &amp; Defence</option>
                    <option value="📝">📝 General Exam / Form</option>
                  </select>
                </div>
              </div>

              {/* 4. Description: Required Documents to Fill this Form */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-emerald-400 font-black">4.</span>
                  <span>Description: Required Documents List (Documents Needed to Apply) *</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={newFormRequirements}
                  onChange={(e) => setNewFormRequirements(e.target.value)}
                  placeholder="e.g. 1. Aadhaar Card, 2. 10th & 12th Marksheet, 3. Passport Size Photo (White background), 4. Signature scan, 5. Category Certificate"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500 leading-relaxed font-sans"
                />
              </div>

              {/* Submit & Publish Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-black text-sm shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4 text-white" />
                  <span>{editingFillerServiceId ? '💾 Update Published Form & Govt Fee' : '💾 Save & Publish Form to Citizen Dashboard'}</span>
                </button>
              </div>
            </form>

            {/* List of Published Forms */}
            <div className="space-y-3 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Currently Published Forms ({fillerServices.length})</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(showAllFillerForms ? fillerServices : fillerServices.slice(0, 3)).map((srv) => (
                  <div key={srv.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 relative group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FormCard3DIcon icon={srv.icon} size="md" />
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{srv.docName}</h5>
                          <span className="text-[11px] text-emerald-400 font-medium">By: {srv.expertName}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                        ₹{Number(srv.price) + Number(srv.govtFee || 0)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 line-clamp-2">
                      <b className="text-slate-400">Required Documents:</b> {srv.requirements}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="text-amber-300">Govt ₹{srv.govtFee || 0}</span>
                      <span className="text-emerald-300">Service ₹{srv.price}</span>
                      <span className="text-cyan-300">{srv.state || 'All India'}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      {!!srv.ownerEmail && srv.ownerEmail.toLowerCase() === fillerEmail.toLowerCase() && (
                        <button
                          type="button"
                          onClick={() => handleEditFillerForm(srv)}
                          className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-[11px] font-bold p-1 rounded hover:bg-sky-500/10 cursor-pointer"
                          title="Edit form and government fee"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteFillerForm(srv.id)}
                        disabled={Boolean(deletingServiceId)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-bold p-1 rounded hover:bg-rose-500/10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Remove form"
                      >
                        {deletingServiceId === srv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>{deletingServiceId === srv.id ? 'Deleting…' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {fillerServices.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllFillerForms(prev => !prev)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-violet-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                >
                  {showAllFillerForms ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showAllFillerForms ? t('Show Less', 'कम दिखाएँ') : `${t('Show All', 'सभी दिखाएँ')} (${fillerServices.length})`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Form Requests Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-sky-400 animate-bounce" />
                <span>Incoming Form Requests / Bids ({fillerOrders.length})</span>
              </h3>
              <button
                onClick={handleManualRefresh}
                disabled={isManualRefreshing}
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                <span>{isManualRefreshing ? 'Refreshing…' : 'Refresh Bids'}</span>
              </button>
            </div>

            {fillerNotificationMsg && (
              <div className={`p-3.5 rounded-2xl border text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                fillerNotificationMsg.includes('🎉') || fillerNotificationMsg.includes('✅')
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              }`}>
                <span className="font-semibold">{fillerNotificationMsg}</span>
                <button onClick={() => setFillerNotificationMsg('')} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {isInitialLoading && fillerOrders.length === 0 && (
                <>
                  <WorkspaceSkeletonCard />
                  <WorkspaceSkeletonCard />
                </>
              )}
              {fillerOrders.map(ord => {
                const isAcceptedByMe = (
                  ord.acceptedByFillerId === ('FILLER-' + fillerPhone) ||
                  ord.acceptedByName === fillerName ||
                  ord.acceptedByFillerName === fillerName ||
                  ord.acceptedByFillerName?.toLowerCase().includes(fillerName.toLowerCase()) ||
                  fillerName.toLowerCase().includes(ord.acceptedByFillerName?.toLowerCase() || '')
                );

                return (
                  <div key={ord.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl hover:border-slate-700 transition-all">
                    <div>
                      <h4 className="text-base font-bold text-white">{ord.formTitle || ord.serviceName}</h4>
                      <p className="text-xs text-slate-400 mt-1">Client: <b>{ord.clientName}</b> ({ord.clientPhone})</p>
                      {ord.applicantCategory && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          Category: {categoryLabel(ord.applicantCategory)}
                        </span>
                      )}
                      {ord.formDetails && (
                        <p className="text-xs text-blue-300 mt-2 bg-slate-950 p-3 rounded-xl font-mono border border-slate-800/80 leading-relaxed">
                          "{ord.formDetails}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-sky-400 font-mono font-bold text-sm">Payout: ₹{ord.amountPaid}</span>

                        <div className="flex items-center gap-2">
                          {ord.status === 'pending' ? (
                            <button
                              onClick={async () => {
                                if (acceptingOrderId) return;
                                setAcceptingOrderId(ord.id);
                                try {
                                  const res = await fetch(`/api/filler/orders/${ord.id}/accept`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      fillerId: 'FILLER-' + fillerPhone,
                                      fillerName: fillerName
                                    })
                                  });
                                  const data = await parseJsonResponse(res);
                                  if (data.success) {
                                    setFillerNotificationMsg(`🎉 Bid #${ord.id} accepted successfully! Please set the fees to unlock chat.`);
                                    if (soundAlertEnabled) playChime();
                                    setIsWorkspaceMinimized(false);
                                    setActiveWorkspaceOrder(data.order || ord);
                                    setWorkspaceStatusMsg({ text: data.message || '✅ Bid accepted! Set the fees to unlock chat.', type: 'success' });
                                    await fetchAllData();
                                  } else {
                                    setFillerNotificationMsg(data.error || data.message || '⚠️ Unable to accept bid. Please try again.');
                                    await fetchAllData();
                                  }
                                } catch (err) {
                                  console.warn('Accept form error:', err);
                                  setFillerNotificationMsg('⚠️ Network error. Please try again.');
                                } finally {
                                  setAcceptingOrderId(null);
                                }
                              }}
                              disabled={Boolean(acceptingOrderId)}
                              className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-emerald-600 hover:from-sky-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {acceptingOrderId === ord.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Accepting…</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Accept Bid</span>
                                </>
                              )}
                            </button>
                          ) : isAcceptedByMe ? (
                            <button
                              onClick={() => setActiveWorkspaceOrder(ord)}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Open Talking Panel / Photo Proof</span>
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* If NOT accepted by me, show the clear "Bid Accepted - Wait for new bid" notification requested by user */}
                      {ord.status !== 'pending' && !isAcceptedByMe && (
                        <div className="w-full mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-amber-300 font-medium">
                            <Clock className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                            <div>
                              <span className="font-bold text-amber-200">
                                Bid Accepted by {ord.acceptedByName || ord.acceptedByFillerName || ord.acceptedByVleName || 'Another Operator'}
                              </span>
                              <p className="text-[11px] text-amber-300/80 mt-0.5">
                                ⏳ <b>Wait for new bid</b> — {t('(Please wait for a new bid, this order has already been accepted)', '(नई बोली आने की प्रतीक्षा करें, यह ऑर्डर पहले ही स्वीकार हो चुका है)')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* 7. LIVE TALKING & WORKSPACE PANEL: CHAT, DIRECT CALL, MULTI-DOC UPLOAD,    */}
      {/*    PHOTO PROOF VERIFICATION, IN-APP PAYMENT & WHATSAPP DELIVERY           */}
      {/* ========================================================================= */}
      {activeWorkspaceOrder && !isWorkspaceMinimized && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col z-50 overflow-hidden">
            
            {/* Workspace Header with Back, Minimize, Fullscreen & Call Buttons */}
            <div className={`overflow-hidden bg-slate-950 transition-all duration-200 md:max-h-none md:opacity-100 ${isWorkspaceHeaderHidden ? 'max-h-0 opacity-0' : 'max-h-52 opacity-100'}`}>
            <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                {/* ⬅️ Prominent Back Button */}
                <button
                  onClick={() => {
                    setActiveWorkspaceOrder(null);
                    endVoiceCall(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Back to Portal"
                >
                  <ArrowLeft className="w-4 h-4 text-blue-400" />
                  <span>Back</span>
                </button>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate max-w-xs sm:max-w-md">
                    {activeWorkspaceOrder.serviceName || activeWorkspaceOrder.formTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                    Citizen: <b>{activeWorkspaceOrder.clientName}</b> • Operator: <b>{activeWorkspaceOrder.acceptedByVleName || activeWorkspaceOrder.acceptedByFillerName || 'Digital Center Operator'}</b>
                    {activeWorkspaceOrder.applicantCategory && (
                      <> • Category: <b className="text-amber-300">{categoryLabel(activeWorkspaceOrder.applicantCategory)}</b></>
                    )}
                  </p>
                </div>
                <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${isRealtimeConnected ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {isRealtimeConnected ? 'Live connection' : 'Reconnecting…'}
                </span>
              </div>

              {/* Action Buttons: QR Pay, Call, Minimize, Fullscreen, Close */}
              <div className="flex items-center gap-2">
                {/* QR Code Quick Modal Trigger */}


                {/* Voice Call Trigger Button */}
                <button
                  onClick={handleWorkspaceCallButton}
                  className={`hidden md:flex px-3 py-2 rounded-xl text-xs font-bold items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    callingState === 'connected' ? 'bg-rose-600 text-white animate-pulse' :
                    callingState === 'calling' ? 'bg-amber-600 text-white animate-bounce' :
                    callingState === 'incoming' ? 'bg-emerald-600 text-white animate-bounce' :
                    'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                  title={callingState === 'idle' ? 'Start in-app voice call' : callingState === 'incoming' ? 'Answer call' : 'End call'}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {callingState === 'connected' ? `In Call (${callDuration}s)` :
                     callingState === 'calling' ? 'Calling…' :
                     callingState === 'incoming' ? 'Answer' : 'Direct Call'}
                  </span>
                </button>

                {/* 🗕 Minimize Button */}
                <button
                  onClick={() => setIsWorkspaceMinimized(true)}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                  title="Minimize to Floating Bar"
                >
                  <Minus className="w-4 h-4 text-slate-300" />
                  <span className="hidden md:inline">Minimize</span>
                </button>

                {/* 🗖 Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="w-4 h-4 text-blue-400" />
                      <span className="hidden md:inline">Window</span>
                    </>
                  ) : (
                    <>
                      <Maximize className="w-4 h-4 text-blue-400" />
                      <span className="hidden md:inline">Full Screen</span>
                    </>
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setActiveWorkspaceOrder(null);
                    endVoiceCall(true);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700 active:scale-95"
                  title="Close Workspace"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            </div>

            {isWorkspaceHeaderHidden && (
              <button
                type="button"
                onClick={() => setIsWorkspaceHeaderHidden(false)}
                className="md:hidden flex w-full items-center justify-center gap-1 border-b border-slate-800 bg-slate-900 py-1 text-[10px] font-bold text-slate-400 active:bg-slate-800"
                title="Show top bar"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>{t('Show controls', 'कंट्रोल दिखाएं')}</span>
              </button>
            )}

            {/* Active Voice Call Screen Notification Bar */}
            {callingState !== 'idle' && (
              <div className="p-3 border-b flex items-center justify-between text-xs animate-in slide-in-from-top duration-200 bg-emerald-950/80 border-emerald-500/30 text-emerald-200">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${callingState === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {callingState === 'connected' ? '🔊 Voice Call Connected' :
                       callingState === 'incoming' ? '📞 Incoming Call…' : '📡 Calling…'}
                    </span>
                    <span className="text-[11px] text-emerald-300/80">
                      {callPeerLabel || 'Connected user'}
                    </span>
                  </div>
                  {callingState === 'connected' && (
                    <span className="font-mono bg-slate-900 px-2.5 py-0.5 rounded-full text-white text-[11px] border border-slate-700">
                      ⏱️ {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {callingState === 'incoming' ? (
                    <>
                      <button
                        onClick={() => void acceptVoiceCall()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Answer</span>
                      </button>
                      <button
                        onClick={rejectVoiceCall}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <PhoneCall className="w-3.5 h-3.5 rotate-135" />
                        <span>Decline</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {callingState === 'connected' && (
                        <button
                          onClick={toggleCallMute}
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                            isCallMuted ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {isCallMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          <span>{isCallMuted ? 'Muted' : 'Mute'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => endVoiceCall()}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
                      >
                        {callingState === 'calling' ? 'Cancel' : 'End Call'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Workspace Status Toast / Notification Banner */}
            {workspaceStatusMsg && (
              <div className={`p-3 border-b flex items-center justify-between text-xs transition-all ${
                workspaceStatusMsg.type === 'success' ? 'bg-emerald-950/80 border-blue-500/30 text-blue-300' :
                workspaceStatusMsg.type === 'error' ? 'bg-rose-950/80 border-rose-500/30 text-rose-300' :
                'bg-sky-950/80 border-sky-500/30 text-sky-300'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{workspaceStatusMsg.text}</span>
                </div>
                <button onClick={() => setWorkspaceStatusMsg(null)} className="hover:text-white text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Main Workspace Body */}
            <div
              className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative"
              onClick={handleWorkspaceBackgroundClick}
              onDragEnter={handleWorkspaceDragEnter}
              onDragOver={handleWorkspaceDragOver}
              onDragLeave={handleWorkspaceDragLeave}
              onDrop={handleWorkspaceDrop}
            >
              {isDraggingOverWorkspace && !isDraggingOverChat && !isDraggingOverProof && (
                <div className="pointer-events-none absolute inset-0 z-[60] flex flex-col items-center justify-center gap-2 bg-blue-950/70 p-6 text-center text-white backdrop-blur-sm">
                  <FileUp className="h-10 w-10 animate-bounce text-cyan-300" />
                  <p className="text-sm font-black">📥 Yahan drop karein</p>
                  <p className="max-w-xs text-[11px] font-medium text-blue-100">
                    Chat ke liye file attach hogi. Photo Proof card par drop karein to proof set hoga.
                  </p>
                </div>
              )}
              
              {/* PENDING NOTICE OVERLAY FOR CITIZEN (English Message as requested) */}
              {activeWorkspaceOrder.status === 'pending' && (
                <div className="absolute top-0 inset-x-0 z-50 bg-amber-500/90 backdrop-blur-sm text-slate-950 py-2.5 px-4 flex items-center justify-center gap-3 font-black text-xs shadow-xl animate-in slide-in-from-top duration-300 border-b border-amber-400/50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin-slow" />
                    <span>PLEASE WAIT: Your request is being broadcasted to all experts. An operator will accept your message shortly.</span>
                  </div>
                  <button 
                    onClick={() => setActiveWorkspaceOrder(null)}
                    className="ml-4 px-3 py-1 rounded-lg bg-slate-950 text-white hover:bg-slate-900 transition-colors text-[10px]"
                  >
                    Go Back
                  </button>
                </div>
              )}

              <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden w-full h-full">
                  {/* Left Column: Live Chat & Upload Interface */}
              <div 
                className="order-2 md:order-1 flex-1 min-h-0 flex flex-col border-t md:border-t-0 md:border-r border-slate-800 bg-slate-900/50 relative"
                onDragOver={handleChatDragOver}
                onDragLeave={handleChatDragLeave}
                onDrop={handleChatDrop}
              >
                {isDraggingOverChat && (
                  <div className="absolute inset-0 bg-blue-600/30 border-2 border-dashed border-cyan-400 z-40 flex flex-col items-center justify-center text-white font-bold text-sm backdrop-blur-xs gap-2 pointer-events-none">
                    <Paperclip className="w-10 h-10 text-cyan-400 animate-bounce" />
                    <span>📁 Drop photos & documents here to attach to chat!</span>
                  </div>
                )}
                
                {/* Chat Messages Log */}
                <div
                  className="flex-1 min-h-0 p-4 overflow-y-auto space-y-1"
                  onClick={() => {
                    // Chat area par tap karne se keyboard band ho aur view
                    // normal ho jaye (zoom/scroll wapas apni jagah).
                    const active = document.activeElement as HTMLElement | null;
                    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) active.blur();
                  }}
                >
                  {(() => {
                    const msgs = activeWorkspaceOrder.chatMessages || [];
                    const groups: any[] = [];
                    for (let i = 0; i < msgs.length; i++) {
                      const msg = msgs[i];
                      const last = groups[groups.length - 1];
                      const sameSender = last && last.senderId === msg.senderId && last.sender === msg.sender && last.senderName === msg.senderName;
                      if (sameSender) {
                        last.items.push(msg);
                      } else {
                        groups.push({ senderId: msg.senderId, sender: msg.sender, senderName: msg.senderName, items: [msg] });
                      }
                    }
                    return groups.map((group, gIdx) => {
                      const isMine = (activeRole === 'client' && group.sender === 'client') || (activeRole !== 'client' && group.sender === 'operator');
                      return (
                        <div key={group.items[0].id || gIdx} className={`flex flex-col max-w-[85%] ${isMine ? 'ml-auto items-end' : 'mr-auto items-start'} mt-2`}>
                          <span className={`text-[10px] text-slate-500 mb-0.5 px-1 ${isMine ? 'text-right' : 'text-left'}`}>{group.senderName} • {group.items[group.items.length - 1]?.time || ''}</span>
                          <div className={`flex flex-col gap-0.5 w-full`}>
                            {group.items.map((msg: any, idx: number) => {
                              const isFirst = idx === 0;
                              const isLast = idx === group.items.length - 1;
                              return (
                                <div
                                  key={msg.id || `${gIdx}-${idx}`}
                                  className={`p-2.5 text-xs leading-relaxed w-fit max-w-full ${
                                    isMine
                                      ? `bg-indigo-600 text-white font-medium ${isFirst ? 'rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl' : 'rounded-2xl rounded-tr-md'} ${!isFirst ? '-mt-0.5' : ''}`
                                      : `bg-slate-800 text-slate-200 border border-slate-700 ${isFirst ? 'rounded-tr-2xl rounded-tl-2xl rounded-br-2xl' : 'rounded-2xl rounded-tl-md'} ${!isFirst ? '-mt-0.5' : ''}`
                                  }`}
                                >
                                  {msg.isVoiceNote ? (
                          <div className="flex items-center gap-2 py-0.5">
                            <button 
                              onClick={() => {
                                if (msg.audioDataUrl) {
                                  const audio = new Audio(msg.audioDataUrl);
                                  audio.onerror = () => {
                                    setWorkspaceStatusMsg({ text: '⚠️ Is device par ye voice note play nahi ho saki (format support nahi hai).', type: 'error' });
                                  };
                                  audio.play().catch(e => {
                                    console.warn('Audio playback error:', e);
                                    setWorkspaceStatusMsg({ text: '⚠️ Voice note play nahi ho saki. Dobara tap karein.', type: 'error' });
                                  });
                                } else {
                                  setWorkspaceStatusMsg({ text: '⚠️ Voice note data missing hai.', type: 'error' });
                                }
                              }} 
                              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xs shadow cursor-pointer"
                              title="Play Voice Note"
                            >
                              ▶
                            </button>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold flex items-center gap-1">
                                <span>🎙️ Voice Note</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/30 text-white/90 font-mono">{msg.audioDuration || '0:05'}</span>
                              </span>
                              <div className="flex items-center gap-0.5 mt-1">
                                {[40, 80, 50, 90, 30, 70, 40, 85, 60, 40].map((h, i) => (
                                  <div key={i} className="w-1 bg-white/70 rounded-full" style={{ height: `${h * 0.14}px` }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          msg.text
                        )}

                        {/* Rich Document Card inside Chat message */}
                        {msg.attachment && (
                          <div
                            className="mt-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center justify-between gap-2 text-white shadow-inner"
                            draggable={activeRole !== 'client' && msg.attachment.type !== 'pdf' && Boolean(msg.attachment.url)}
                            onDragStart={(e) => {
                              const url = msg.attachment?.url;
                              if (activeRole === 'client' || !url || msg.attachment?.type === 'pdf') {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.setData('application/x-digiseva-proof', url);
                              e.dataTransfer.setData('text/uri-list', url);
                              e.dataTransfer.effectAllowed = 'copy';
                              setDraggedChatImageUrl(url);
                            }}
                            onDragEnd={() => {
                              setDraggedChatImageUrl(null);
                              setIsDraggingOverWorkspace(false);
                              setIsDraggingOverProof(false);
                            }}
                            onTouchStart={() => {
                              const url = msg.attachment?.url;
                              if (url && msg.attachment?.type !== 'pdf') startChatImageLongPress(url);
                            }}
                            onTouchEnd={cancelChatImageLongPress}
                            onTouchMove={cancelChatImageLongPress}
                            onTouchCancel={cancelChatImageLongPress}
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-2 flex-1 min-w-0">
                              {msg.attachment.type === 'pdf' ? (
                                <FileText className="w-5 h-5 text-rose-400 flex-shrink-0" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-sky-400 flex-shrink-0" />
                              )}
                              <div className="text-left overflow-hidden min-w-0">
                                <p className="text-[11px] font-bold truncate">{msg.attachment.name}</p>
                                <span className="text-[9px] uppercase text-blue-300 font-mono">
                                  {msg.attachment.type.toUpperCase()} Attached & Verified
                                  {activeRole !== 'client' && msg.attachment.type !== 'pdf' && msg.attachment.url && (
                                    <span className="normal-case text-emerald-300"> · Proof me drag karein</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {msg.attachment.url ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleDownloadAttachment(msg.attachment)}
                                  disabled={Boolean(attachmentActionKey)}
                                  className="inline-flex items-center gap-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-200 hover:bg-blue-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                  title="Download attachment"
                                >
                                  {attachmentActionKey === attachmentActionKeyFor('download', msg.attachment) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                  <span>{attachmentActionKey === attachmentActionKeyFor('download', msg.attachment) ? 'Downloading…' : 'Download'}</span>
                                </button>
                                <button
                                  onClick={() => handleViewAttachment(msg.attachment)}
                                  disabled={Boolean(attachmentActionKey)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                  title="Open attachment"
                                >
                                  {attachmentActionKey === attachmentActionKeyFor('view', msg.attachment) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                  <span>{attachmentActionKey === attachmentActionKeyFor('view', msg.attachment) ? 'Opening…' : 'View'}</span>
                                </button>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-md border border-blue-500/30 shrink-0">
                                Ready
                              </span>
                            )}
                          </div>
                        )}

                      </div>
                    );
                    })}
                  </div>
                </div>
              );
            });
          })()}

                  {(!activeWorkspaceOrder.chatMessages || activeWorkspaceOrder.chatMessages.length === 0) && (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Chat room started. Type a message or upload documents (PDF/Photos) below.
                    </div>
                  )}
                  <div ref={chatLogEndRef} />
                </div>

                {/* Check if operator or expert has accepted yet */}
                {(() => {
                  const isAccepted = Boolean(
                    activeWorkspaceOrder?.acceptedByVleName ||
                    activeWorkspaceOrder?.acceptedByFillerName ||
                    activeWorkspaceOrder?.acceptedByName ||
                    activeWorkspaceOrder?.status === 'accepted' ||
                    activeWorkspaceOrder?.status === 'proof_submitted' ||
                    activeWorkspaceOrder?.status === 'completed'
                  );

                  return (
                    <>
                      {/* Waiting message in English while awaiting operator / expert acceptance */}
                      {activeRole === 'client' && !isAccepted && (
                        <div className="p-3.5 bg-amber-500/10 border-t border-amber-500/30 text-amber-300 text-xs text-center space-y-1">
                          <p className="font-bold flex items-center justify-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                            <span>⏳ Waiting for Jan Seva Kendra or Form Filler Expert to accept your request</span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Your message has been sent. Certified operators are reviewing your application. Please wait while an expert accepts your request.
                          </p>
                        </div>
                      )}

                      {/* Chat Input & Document Upload File Input */}
                      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                        <label
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1 text-xs font-bold ${
                            isUploadingDocs
                              ? 'bg-slate-800 text-sky-300 border-sky-500/40 cursor-wait'
                              : 'bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white cursor-pointer border-slate-700'
                          }`}
                          title={isUploadingDocs ? 'Uploading documents…' : 'Upload Multiple Documents (PDF/Photos)'}
                        >
                          {isUploadingDocs ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                          <span className="hidden sm:inline">{isUploadingDocs ? 'Uploading…' : 'Upload Docs'}</span>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            disabled={isUploadingDocs}
                            onClick={(e) => e.stopPropagation()}
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0 && activeWorkspaceOrder) {
                                setIsUploadingDocs(true);
                                setWorkspaceStatusMsg({ text: `📤 Uploading ${files.length} document(s)…`, type: 'info' });
                                try {
                                  const actualSender = activeRole === 'client' ? 'client' : 'operator';
                                  const actualSenderName = activeRole === 'client'
                                    ? (clientName || 'Citizen')
                                    : (activeRole === 'form_filler' ? (fillerName || 'Form Filler') : (vleName || 'Jan Seva Operator'));
                                  const uploadedOrder = await uploadDocumentsToOrder(
                                    activeWorkspaceOrder.id,
                                    files,
                                    actualSender,
                                    actualSenderName
                                  );
                                  if (uploadedOrder) {
                                    setActiveWorkspaceOrder(uploadedOrder);
                                  }
                                  setWorkspaceStatusMsg({ text: `🔒 ${files.length} document(s) uploaded — auto delete after 24 hours.`, type: 'success' });
                                  fetchAllData();
                                } catch (err) {
                                  setWorkspaceStatusMsg({
                                    text: err instanceof Error ? err.message : 'The documents could not be uploaded.',
                                    type: 'error'
                                  });
                                } finally {
                                  setIsUploadingDocs(false);
                                }
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>

                        <button
                          onClick={handleToggleVoiceRecording}
                          disabled={isSendingVoiceNote}
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-1 text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed ${
                            isVoiceRecording
                              ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                              : isSendingVoiceNote
                                ? 'bg-slate-800 border-sky-500/40 text-sky-300 cursor-wait'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-indigo-400 hover:text-indigo-300'
                          }`}
                          title={isSendingVoiceNote
                            ? 'Sending voice note…'
                            : isVoiceRecording
                              ? 'Recording… click again to stop & send'
                              : 'Voice note record karein — click = start, click = stop & send'}
                        >
                          {isSendingVoiceNote ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mic className={`w-4 h-4 ${isVoiceRecording ? 'animate-bounce' : ''}`} />
                          )}
                          <span className="hidden sm:inline">
                            {isSendingVoiceNote ? 'Sending…' : isVoiceRecording ? `⏹ Stop ${formatDurationLabel(voiceRecordSeconds)}` : '🎙️ Voice'}
                          </span>
                        </button>

                        {/* Mobile call button — sits next to the mic so calling stays
                            reachable even when the top bar is hidden. */}
                        <button
                          type="button"
                          onClick={handleWorkspaceCallButton}
                          className={`md:hidden p-2.5 rounded-xl border transition-all flex items-center gap-1 text-xs font-bold ${
                            callingState === 'connected'
                              ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                              : callingState === 'calling'
                                ? 'bg-amber-600 border-amber-500 text-white animate-bounce'
                                : callingState === 'incoming'
                                  ? 'bg-emerald-600 border-emerald-500 text-white animate-bounce'
                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-blue-300 hover:text-blue-200'
                          }`}
                          title={
                            callingState === 'idle' ? t('Start voice call', 'कॉल शुरू करें')
                              : callingState === 'incoming' ? t('Accept call', 'कॉल उठाएं')
                                : t('End call', 'कॉल बंद करें')
                          }
                          aria-label={t('Voice call', 'वॉइस कॉल')}
                        >
                          <PhoneCall className={`w-4 h-4 ${callingState !== 'idle' ? 'animate-bounce' : ''}`} />
                        </button>

                        <input
                          type="text"
                          value={chatInputText}
                          onChange={(e) => setChatInputText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
                          onFocus={(e) => {
                            hideMobileWorkspaceHeader();
                            const inputEl = e.currentTarget;
                            // Keyboard khulne ke baad input ko visible area me rakho
                            // taaki workspace header / minimize / fullscreen upar na chhupen.
                            setTimeout(() => {
                              try { inputEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch {}
                            }, 300);
                          }}
                          enterKeyHint="send"
                          inputMode="text"
                          autoComplete="off"
                          placeholder={activeRole === 'client' ? "Type message, record voice, or attach docs..." : "Type reply or record voice note..."}
                          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                          onClick={handleSendMessage}
                          disabled={isSendingMessage}
                          title={isSendingMessage ? 'Sending…' : 'Send message'}
                          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* 🔒 Privacy footer — sabse niche (documents 24h me auto delete) */}
                      <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-1.5 text-center">
                        <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-500 tracking-wide">
                          24 hours auto data delete due to privacy
                        </span>
                      </div>
                    </>
                  );
                })()}

              </div>

              {/* Right Column: Documents Vault, Photo Proof, In-App Payment & WhatsApp Delivery */}
              <div className={`order-1 md:order-2 w-full md:w-96 min-h-0 shrink-0 bg-slate-950 p-3 md:p-5 overflow-y-auto space-y-2 md:space-y-5 ${mobileWorkspacePanel === 'none' ? 'max-h-none' : 'max-h-[42vh]'} md:max-h-none`}>

                {/* Mobile quick badges: tap a badge to expand that card above the chat. */}
                <div className="md:hidden sticky top-0 z-20 -mx-3 -mt-3 border-b border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {mobileWorkspaceBadges.map(badge => {
                      const Icon = badge.icon;
                      const active = mobileWorkspacePanel === badge.key;
                      const waitingForProofBadge = badge.key === 'proof' && Boolean(pendingProofChatImage);
                      return (
                        <button
                          key={badge.key}
                          type="button"
                          onClick={() => handleMobileWorkspaceBadgeClick(badge.key)}
                          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                            waitingForProofBadge
                              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 animate-pulse'
                              : active
                                ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                                : 'border-slate-700 bg-slate-900 text-slate-300'
                          }`}
                          aria-expanded={active}
                          title={
                            waitingForProofBadge
                              ? t('Tap to set the selected chat photo as proof', 'चुनी हुई चैट फोटो को प्रूफ बनाने के लिए टैप करें')
                              : undefined
                          }
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${mobileBadgeDotClass(badge.status)}`} />
                        </button>
                      );
                    })}
                    {mobileWorkspacePanel !== 'none' && (
                      <button
                        type="button"
                        onClick={() => setMobileWorkspacePanel('none')}
                        className="shrink-0 inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 p-1.5 text-slate-400 active:scale-95"
                        title={t('Hide details', 'विवरण छिपाएं')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`${mobileWorkspacePanel === 'proof' ? 'block' : 'hidden'} md:block rounded-2xl transition-all ${
                    isDraggingOverProof ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950' : ''
                  }`}
                  onDragOver={handleProofDragOver}
                  onDragLeave={handleProofDragLeave}
                  onDrop={handleProofDrop}
                >
                {/* Stage 2: Photo Proof of Filled Form (Operator Uploads, Client Reviews) */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      <span>Photo Proof of Filled Form</span>
                    </h4>
                    {isUploadingProof ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/20 text-sky-300 text-[10px] font-bold rounded-md">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading…
                      </span>
                    ) : activeWorkspaceOrder.previewPhotoProof && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-md">
                        Proof Ready
                      </span>
                    )}
                  </div>

                  {activeWorkspaceOrder.previewPhotoProof ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 group cursor-pointer" onClick={() => setZoomProofPhoto(activeWorkspaceOrder.previewPhotoProof)}>
                        <img
                          src={activeWorkspaceOrder.previewPhotoProof}
                          alt="Filled Form Proof"
                          className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-xs text-white font-bold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Click to Zoom & Inspect</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={activeWorkspaceOrder.previewPhotoProof}
                          target="_blank"
                          rel="noreferrer"
                          download="filled-form-proof.jpg"
                          className="inline-flex items-center gap-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-200 hover:bg-blue-500/20 transition-colors"
                          title="Download proof photo"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>
                        <a
                          href={activeWorkspaceOrder.previewPhotoProof}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                          title="Open proof photo"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </a>
                      </div>
                      <p className="text-[11px] text-blue-400 flex items-center gap-1 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Operator has uploaded the filled form screenshot proof!</span>
                      </p>

                      {activeRole === 'client' && (
                        !activeWorkspaceOrder.isProofApprovedByClient ? (
                          <button
                            onClick={async () => {
                              if (isApprovingProof) return;
                              setIsApprovingProof(true);
                              const currentOrder = activeWorkspaceOrder;
                              try {
                                const res = await fetch(`/api/orders/${currentOrder.id}/approve-proof`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                const data = await parseJsonResponse(res);
                                if (data.success) {
                                  const serverOrder = data.order || currentOrder;
                                  const approvalMessage = {
                                    id: 'm-apprv-' + Date.now(),
                                    sender: 'client',
                                    senderName: clientName || 'Citizen',
                                    text: '✅ Verified and Approved Photo Proof! Payment methods unlocked.',
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  };
                                  const serverMessages = Array.isArray(serverOrder.chatMessages) ? serverOrder.chatMessages : [];
                                  setActiveWorkspaceOrder({
                                    ...serverOrder,
                                    isProofApprovedByClient: true,
                                    chatMessages: serverMessages.length > (currentOrder.chatMessages?.length || 0)
                                      ? serverMessages
                                      : [...(currentOrder.chatMessages || []), approvalMessage]
                                  });
                                  setPaymentIntentRefreshKey(key => key + 1);
                                  setWorkspaceStatusMsg({ text: '✅ Proof approved! Payment methods unlocked.', type: 'success' });
                                  if (soundAlertEnabled) playChime();
                                } else {
                                  setWorkspaceStatusMsg({ text: data.error || 'Could not approve proof. Please try again.', type: 'error' });
                                }
                              } catch (err) {
                                console.warn('Error approving proof:', err);
                                setWorkspaceStatusMsg({ text: 'Network error while approving proof. Please try again.', type: 'error' });
                              } finally {
                                setIsApprovingProof(false);
                                fetchAllData();
                              }
                            }}
                            disabled={isApprovingProof}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isApprovingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            <span>{isApprovingProof ? 'Approving…' : '👍 OK / Approve Proof & Unlock Payment Methods'}</span>
                          </button>
                        ) : (
                          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span>Proof Approved! Payment methods are unlocked below.</span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
                      <p className="text-[11px] text-slate-400">Photo proof has not been uploaded yet.</p>
                      {activeRole !== 'client' ? (
                        <div className="space-y-2">
                          <label className={`w-full py-2 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 ${
                            isUploadingProof
                              ? 'bg-slate-700 cursor-wait'
                              : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 cursor-pointer'
                          }`}>
                            {isUploadingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            <span>{isUploadingProof ? 'Uploading Photo Proof…' : '📸 Pick / Upload Form Photo Proof'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploadingProof}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadPhotoProofFile(file);
                                e.target.value = '';
                              }}
                            />
                          </label>

                        </div>
                      ) : (
                        <p className="text-[10px] text-blue-300 font-medium">
                          The operator will draft the application and send preview screenshots before payment is released.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                </div>

                <div className={`${mobileWorkspacePanel === 'payments' ? 'block' : 'hidden'} md:block`}>
                {/* Stage 3: Compact split UPI payment */}
                {(activeWorkspaceOrder.isProofApprovedByClient || activeRole !== 'client') ? (
                  <div className="rounded-2xl border border-emerald-500/40 bg-slate-900 p-3.5 space-y-3 shadow-lg animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <CreditCard className="h-4 w-4 text-emerald-400" />
                        <span>Payments</span>
                      </p>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {workspacePaymentIntent?.qrs
                          ? workspacePaymentIntent.qrs.filter(qr => qr.status === 'confirmed').length
                          : 0}/3 Done
                      </span>
                    </div>

                    {workspacePaymentIntent?.breakdown && (
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="rounded-md bg-slate-950 px-2 py-1 text-slate-400">Govt <b className="text-white">₹{workspacePaymentIntent.breakdown.govtFee.toFixed(2)}</b></span>
                        <span className="rounded-md bg-slate-950 px-2 py-1 text-slate-400">Form <b className="text-white">₹{workspacePaymentIntent.breakdown.serviceFee.toFixed(2)}</b></span>
                        <span className="rounded-md bg-slate-950 px-2 py-1 text-slate-400">Admin <b className="text-amber-300">₹{workspacePaymentIntent.breakdown.adminCommission.toFixed(2)}</b></span>
                        <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-200">Total <b>₹{workspacePaymentIntent.breakdown.total.toFixed(2)}</b></span>
                      </div>
                    )}

                    {paymentIntentError ? (
                      <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[10px] text-amber-200">{paymentIntentError}</p>
                    ) : workspacePaymentIntent?.qrs ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {workspacePaymentIntent.operatorUpiCooling && (
                          <p className="col-span-full rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-200">
                            Operator ne UPI change ki hai — security cooling active hai. Tab tak payment purani (last known good) UPI par jayegi.
                            {workspacePaymentIntent.operatorUpiActiveAt ? ` Nayi UPI ${new Date(workspacePaymentIntent.operatorUpiActiveAt).toLocaleString()} ke baad active hogi.` : ''}
                          </p>
                        )}
                        {workspacePaymentIntent.governmentUpiRequired && (
                          <p className="col-span-full rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[10px] leading-relaxed text-rose-200">
                            Is order ke liye Government UPI/QR set nahi hai. Operator ko payment se pehle government UPI ya QR add karna hoga.
                          </p>
                        )}
                        {workspacePaymentIntent.qrs.map(qr => {
                          const uri = qr.upiUri;
                          const isConfirmed = qr.status === 'confirmed';
                          const legKey = qr.role === 'government' ? 'govt' : qr.role === 'admin' ? 'admin' : 'operator';
                          const isAdmin = qr.role === 'admin';
                          const statusLabel = isConfirmed ? 'Done' : qr.clientConfirmed ? 'Paid' : isAdmin ? 'Auto' : 'Pending';
                          const statusClass = isConfirmed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : qr.clientConfirmed
                              ? 'bg-sky-500/20 text-sky-300'
                              : isAdmin
                                ? 'bg-violet-500/15 text-violet-300'
                                : 'bg-slate-800 text-slate-400';
                          return (
                            <div key={qr.role} className={`flex flex-col gap-2 rounded-xl border bg-slate-950 p-3 ${isConfirmed ? 'border-emerald-500/60' : qr.clientConfirmed ? 'border-sky-500/40' : 'border-slate-800'}`}>
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-300">{qr.label}</span>
                                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusClass}`}>{statusLabel}</span>
                              </div>
                              <p className="text-base font-black text-white">₹{qr.amount}</p>
                              {qr.payeeName && (
                                <p className="truncate text-[9px] font-semibold text-slate-400" title={qr.payeeName}>Payee: {qr.payeeName}</p>
                              )}

                              {qr.qrImage || uri ? (
                                <div className="flex justify-center">
                                  {uri ? (
                                    <a
                                      href={uri}
                                      className="block rounded-lg bg-white p-1.5 shadow-md ring-1 ring-black/5 transition-transform hover:scale-[1.03] active:scale-95"
                                      title="Tap to open UPI app"
                                    >
                                      {qr.qrImage ? (
                                        <img src={qr.qrImage} alt={`${qr.label} QR`} className="h-[120px] w-[120px] object-contain" />
                                      ) : (
                                        <QRCodeSVG value={uri} size={120} level="M" marginSize={2} className="h-auto w-[120px]" />
                                      )}
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setQrZoomImage(qr.qrImage || '');
                                      }}
                                      className="block rounded-lg bg-white p-1.5 shadow-md ring-1 ring-black/5 transition-transform hover:scale-[1.03] active:scale-95"
                                      title="Tap to zoom QR"
                                    >
                                      <img src={qr.qrImage} alt={`${qr.label} QR`} className="h-[120px] w-[120px] object-contain" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-slate-800 px-2 text-center text-[10px] text-slate-500">
                                  QR not set
                                </div>
                              )}

                              {qr.upiId ? (
                                <button
                                  type="button"
                                  onClick={() => handleCopyUpiId(qr.upiId)}
                                  className="flex w-full items-center justify-between gap-1 rounded-md bg-slate-900 px-2 py-1 text-left hover:bg-slate-800"
                                  title="Copy UPI ID"
                                >
                                  <span className="truncate font-mono text-[9px] text-slate-300">
                                    {copiedUpiId === qr.upiId ? 'Copied ✓' : qr.upiId}
                                  </span>
                                  <Copy className="h-3 w-3 shrink-0 text-slate-500" />
                                </button>
                              ) : null}

                              {uri && !isConfirmed && (
                                <a href={uri} className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-sky-600/20 px-2 py-1 text-[9px] font-bold text-sky-300 hover:bg-sky-600/30">
                                  <ExternalLink className="h-3 w-3" /> Open UPI App
                                </a>
                              )}

                              {isConfirmed ? (
                                <div className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500/10 py-1.5 text-[10px] font-bold text-emerald-300">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Done
                                </div>
                              ) : activeRole === 'client' ? (
                                !qr.clientConfirmed && (
                                  <button
                                    type="button"
                                    onClick={() => handleClientConfirmLeg(legKey)}
                                    disabled={isVerifyingPayment}
                                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-2 py-1.5 text-[10px] font-bold text-white hover:brightness-110 disabled:opacity-50"
                                  >
                                    <Check className="h-3.5 w-3.5" /> Paid
                                  </button>
                                )
                              ) : !isAdmin && qr.clientConfirmed ? (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmSplitLeg(qr.role === 'government' ? 'govt' : 'operator')}
                                  disabled={isVerifyingPayment}
                                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-2 py-1.5 text-[10px] font-bold text-white hover:brightness-110 disabled:opacity-50"
                                >
                                  <Check className="h-3.5 w-3.5" /> Confirm
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">Loading payment request…</p>
                    )}

                    {activeRole !== 'client' && (
                      <details className="rounded-xl border border-slate-800 bg-slate-950/60">
                        <summary className="cursor-pointer px-3 py-2 text-[10px] font-bold text-slate-300">
                          ⚙️ Government fee / UPI / QR
                        </summary>
                        <div className="space-y-2 border-t border-slate-800 p-3">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <label className="space-y-1">
                              <span className="text-[9px] font-semibold text-slate-400">Government Fee (₹)</span>
                              <input
                                value={govtFeeInput}
                                onChange={event => setGovtFeeInput(event.target.value)}
                                placeholder="0"
                                type="number"
                                min="0"
                                step="1"
                                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-mono text-white outline-none focus:border-sky-500"
                                autoComplete="off"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[9px] font-semibold text-slate-400">Government UPI ID</span>
                              <input
                                value={govtUpiInput}
                                onChange={event => setGovtUpiInput(event.target.value)}
                                placeholder="treasury@bank"
                                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-mono text-white outline-none focus:border-sky-500"
                                autoComplete="off"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[9px] font-semibold text-slate-400">Government QR Image</span>
                              <span className="flex cursor-pointer items-center justify-center rounded-md bg-slate-700 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-slate-600">
                                {govtQrImageInput ? 'QR selected ✓' : 'Upload QR'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={event => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = () => setGovtQrImageInput(reader.result as string);
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </span>
                            </label>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSaveGovtDetails}
                              disabled={isSavingGovtDetails || (!govtUpiInput.trim() && !govtQrImageInput && !govtFeeInput.trim())}
                              className="rounded-md bg-sky-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-sky-500 disabled:opacity-50"
                            >
                              {isSavingGovtDetails ? 'Saving…' : 'Save'}
                            </button>
                            {govtQrImageInput && (
                              <button type="button" onClick={() => setGovtQrImageInput('')} className="text-[9px] text-slate-400 underline">Remove QR</button>
                            )}
                          </div>
                        </div>
                      </details>
                    )}

                    {activeWorkspaceOrder.isPaymentDoneInApp && (
                      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-[10px] font-bold text-emerald-200">
                        ✓ All payments confirmed
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                    <p className="text-[11px] font-bold text-slate-400">🔒 Payment locked</p>
                    <p className="mt-1 text-[10px] text-slate-500">Approve the photo proof above to unlock payments.</p>
                  </div>
                )}
                </div>

                <div className={`${mobileWorkspacePanel === 'pdf' ? 'block' : 'hidden'} md:block`}>
                {/* Stage 3.5: Final completed form PDF (completion = payment + this PDF) */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-2 shadow-md">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    <span>Final Completed Form PDF</span>
                  </h4>
                  {activeWorkspaceOrder.completedFormPdfUrl ? (
                    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-200">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{activeWorkspaceOrder.completedFormPdfName || 'Completed_Form.pdf'} uploaded</span>
                      </p>
                      <a
                        href={`/api/orders/${activeWorkspaceOrder.id}/completed-form?authToken=${encodeURIComponent(readStoredSession()?.token || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-[11px] font-bold text-white hover:bg-emerald-500"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Completed Form PDF</span>
                      </a>
                    </div>
                  ) : activeRole !== 'client' ? (
                    <label className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-black text-white ${isUploadingFinalPdf ? 'bg-slate-700 cursor-wait' : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 cursor-pointer'}`}>
                      {isUploadingFinalPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                      <span>{isUploadingFinalPdf ? 'Uploading PDF…' : '📄 Upload Final Completed Form PDF'}</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        disabled={isUploadingFinalPdf}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                            setWorkspaceStatusMsg({ text: 'Please choose a real PDF file.', type: 'error' });
                            return;
                          }
                          if (file.size > 8 * 1024 * 1024) {
                            setWorkspaceStatusMsg({ text: 'PDF is too large. Maximum 8 MB allowed.', type: 'error' });
                            return;
                          }
                          setIsUploadingFinalPdf(true);
                          try {
                            const pdfDataUrl = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = () => reject(new Error('Could not read the PDF file.'));
                              reader.readAsDataURL(file);
                            });
                            const res = await fetch(`/api/orders/${activeWorkspaceOrder.id}/upload-completed-form`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ pdfDataUrl, fileName: file.name })
                            });
                            const data = await parseJsonResponse(res);
                            if (data.success && data.order) {
                              setActiveWorkspaceOrder(data.order);
                              fetchAllData();
                              setWorkspaceStatusMsg({ text: data.message || 'Final PDF uploaded.', type: 'success' });
                            } else {
                              setWorkspaceStatusMsg({ text: data.error || 'Failed to upload final PDF.', type: 'error' });
                            }
                          } catch (err) {
                            setWorkspaceStatusMsg({ text: err instanceof Error ? err.message : 'Network error uploading PDF.', type: 'error' });
                          } finally {
                            setIsUploadingFinalPdf(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <p className="text-[10px] font-medium text-blue-300">
                      Operator final completed form PDF upload karega. Payment + PDF dono complete hote hi order finish ho jaayega.
                    </p>
                  )}
                  {activeWorkspaceOrder.status === 'completed' && (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-[10px] font-bold text-emerald-200">
                      ✅ Order complete — payment confirmed + final PDF uploaded.
                    </p>
                  )}
                </div>
                </div>

                <div className={`${mobileWorkspacePanel === 'whatsapp' ? 'block' : 'hidden'} md:block`}>
                {/* Stage 4: WhatsApp Direct Dispatch of Application No & Password */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span>Share Details & Password via WhatsApp</span>
                  </h4>

                  {activeWorkspaceOrder.status === 'completed' && activeWorkspaceOrder.credentialsDispatched ? (
                    <div className="p-3 bg-slate-950 rounded-xl space-y-2 border border-blue-500/30 text-xs">
                      {activeRole !== 'client' && activeWorkspaceOrder.isPaymentDoneInApp && !editingCredentials && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditAppNo(activeWorkspaceOrder.credentialsDispatched?.appNumber || '');
                            setEditPassword(activeWorkspaceOrder.credentialsDispatched?.pass || '');
                            setEditingCredentials(true);
                          }}
                          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-sky-300 border border-slate-700"
                        >
                          Edit Application No / Password (after payment)
                        </button>
                      )}
                      {activeRole !== 'client' && editingCredentials && (
                        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={editAppNo}
                              onChange={(e) => setEditAppNo(e.target.value.slice(0, 80))}
                              placeholder="Application No"
                              className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-[11px] text-white"
                            />
                            <input
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value.slice(0, 80))}
                              placeholder="Password"
                              className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-[11px] text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSaveCredentials}
                              disabled={isSavingCredentials}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-50"
                            >
                              {isSavingCredentials ? 'Saving…' : 'Save Changes'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCredentials(false)}
                              className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-blue-400 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp Message Ready to Send</span>
                      </p>
                      <div className="space-y-1.5 text-[11px] text-slate-300 font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span>App No: <b>{activeWorkspaceOrder.credentialsDispatched.appNumber}</b></span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeWorkspaceOrder.credentialsDispatched.appNumber);
                              setCopiedAppNo(true);
                              setTimeout(() => setCopiedAppNo(false), 2000);
                            }}
                            className="p-1 hover:text-blue-400"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p>Password: <b>{activeWorkspaceOrder.credentialsDispatched.pass}</b></p>
                        <p>Phone: <b>{activeWorkspaceOrder.clientPhone}</b></p>
                      </div>

                      {/* Real 1-Click WhatsApp Link */}
                      <a
                        href={`https://wa.me/91${activeWorkspaceOrder.clientPhone}?text=${encodeURIComponent(
                          `Hello ${activeWorkspaceOrder.clientName}! Your ${activeWorkspaceOrder.serviceName || activeWorkspaceOrder.formTitle} application has been successfully submitted.\n\nApplication No: ${activeWorkspaceOrder.credentialsDispatched?.appNumber || ''}\nPortal Password: ${activeWorkspaceOrder.credentialsDispatched?.pass || ''}\n\nThank you! FILLUP Digital Citizen Services.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm mt-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Chat in WhatsApp</span>
                      </a>
                    </div>
                  ) : activeRole !== 'client' ? (
                    <button
                      disabled={!activeWorkspaceOrder.isPaymentDoneInApp || isDispatchingCredentials}
                      onClick={async () => {
                        if (isDispatchingCredentials) return;
                        setIsDispatchingCredentials(true);
                        try {
                          const res = await fetch(`/api/orders/${activeWorkspaceOrder.id}/dispatch-whatsapp`, {
                            method: 'POST'
                          });
                          const data = await parseJsonResponse(res);
                          if (data.success) {
                            setActiveWorkspaceOrder(data.order);
                            fetchAllData();
                            setWorkspaceStatusMsg({ text: `📲 Credentials are ready. Open WhatsApp and tap Send to deliver them to ${activeWorkspaceOrder.clientPhone}.`, type: 'success' });
                          } else {
                            setWorkspaceStatusMsg({ text: data.error || 'Failed to dispatch', type: 'error' });
                          }
                        } catch (err) {
                          console.warn('Dispatch error:', err);
                          setWorkspaceStatusMsg({ text: 'Network error while preparing credentials. Please try again.', type: 'error' });
                        } finally {
                          setIsDispatchingCredentials(false);
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        activeWorkspaceOrder.isPaymentDoneInApp
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-emerald-600/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isDispatchingCredentials ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                      <span>{isDispatchingCredentials ? 'Preparing credentials…' : 'Send Credentials Direct to WhatsApp'}</span>
                    </button>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center">
                      After payment, credentials will be prepared here. Open WhatsApp and tap Send to deliver them to {activeWorkspaceOrder.clientPhone}.
                    </p>
                    )}
                  </div>
                </div>
                </div>
              </div>
            </div>

            {feeGateActive && (
              <div className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
                <div className="w-full max-w-md overflow-hidden rounded-3xl border border-blue-500/40 bg-slate-900 shadow-2xl shadow-blue-950/60">
                  <div className="border-b border-slate-800 bg-slate-900/95 p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/15 text-blue-300">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-white">
                          {activeRole === 'client' ? 'Fees Approval Required' : 'Set Government & Form Fees'}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {activeRole === 'client'
                            ? 'Fees dekh kar OK dabao. Tab tak chat locked rahega.'
                            : 'Dono fees save hote hi citizen ko dikhengi. Citizen OK karega tab chat khulega.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5 sm:p-6">
                    {activeRole === 'client' ? (
                      !activeWorkspaceOrder.feesSetAt ? (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
                          <Clock className="mx-auto h-7 w-7 animate-spin text-amber-300" />
                          <p className="mt-3 text-sm font-bold text-amber-100">Operator fees set kar raha hai</p>
                          <p className="mt-1 text-[11px] text-amber-200/80">Fees aate hi yahi modal me aapko Government Fee, Form Charge aur Total dikhega. Please wait.</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950 p-4">
                            {activeWorkspaceOrder.applicantCategory && (
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="text-slate-400">Applicant Category</span>
                                <b className="text-amber-300">{categoryLabel(activeWorkspaceOrder.applicantCategory)}</b>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-slate-400">Government Fee</span>
                              <b className="font-mono text-white">₹{Number(activeWorkspaceOrder.govtFee || 0).toFixed(2)}</b>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-slate-400">Form / Service Charge</span>
                              <b className="font-mono text-white">₹{Number(activeWorkspaceOrder.amountPaid || 0).toFixed(2)}</b>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-2 text-sm">
                              <span className="font-bold text-slate-200">Total</span>
                              <b className="font-mono text-emerald-300">₹{(Number(activeWorkspaceOrder.govtFee || 0) + Number(activeWorkspaceOrder.amountPaid || 0)).toFixed(2)}</b>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleApproveOrderFees()}
                            disabled={isApprovingOrderFees}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Check className="h-4 w-4" />
                            <span>{isApprovingOrderFees ? 'Approving…' : 'OK — Approve Fees & Unlock Chat'}</span>
                          </button>
                        </>
                      )
                    ) : (
                      <>
                        {activeWorkspaceOrder.applicantCategory && (
                          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
                            <span className="text-[11px] font-bold text-amber-100">Citizen Category</span>
                            <b className="text-xs font-black text-amber-300">{categoryLabel(activeWorkspaceOrder.applicantCategory)}</b>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-300">Government Fee (₹)</span>
                            <input
                              value={feeGovtInput}
                              onChange={event => {
                                setFeeGovtInput(event.target.value);
                                feeDraftTouchedRef.current = true;
                                setFeeModalMsg(null);
                              }}
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500"
                              autoComplete="off"
                            />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-300">Form / Service Charge (₹)</span>
                            <input
                              value={feeServiceInput}
                              onChange={event => {
                                setFeeServiceInput(event.target.value);
                                feeDraftTouchedRef.current = true;
                                setFeeModalMsg(null);
                              }}
                              type="number"
                              min="1"
                              step="1"
                              placeholder="e.g. 100"
                              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500"
                              autoComplete="off"
                            />
                          </label>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                          <span className="text-xs font-bold text-emerald-100">Citizen Total</span>
                          <b className="font-mono text-base text-emerald-300">₹{Math.max(0, feeTotalPreview).toFixed(2)}</b>
                        </div>

                        {activeWorkspaceOrder.feesSetAt && (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-semibold text-amber-200">
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                            <span>Fees citizen ko bhej di gayi hain. Ab citizen OK karega tab chat unlock hoga. Aap fees badal bhi sakte hain — approval phir se reset ho jayega.</span>
                          </div>
                        )}

                        {feeModalMsg && (
                          <p className={`rounded-xl border p-3 text-[11px] font-bold ${feeModalMsg.type === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : feeModalMsg.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-sky-500/30 bg-sky-500/10 text-sky-200'}`}>
                            {feeModalMsg.text}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => void saveOrderFees('manual')}
                          disabled={isSavingOrderFees || feeGovtInput.trim() === '' || !(Number(feeServiceInput) > 0) || !Number.isFinite(Number(feeGovtInput)) || Number(feeGovtInput) < 0}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>{isSavingOrderFees ? 'Saving…' : 'Set & Send Fees to Citizen'}</span>
                        </button>
                        <p className="text-center text-[10px] leading-relaxed text-slate-500">
                          Dono fees valid hote hi 650ms me auto-save ho jayengi. Background chat citizen OK hone tak locked hai.
                        </p>
                      </>
                    )}

                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-[10px] font-bold text-slate-400">
                      <Lock className="h-3 w-3 text-emerald-400" />
                      <span>Background locked until citizen approves fees</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* 📞 Hidden audio sink + GLOBAL call overlay (workspace band/minimized ho tab bhi call chale).
          Incoming call hamesha dikhta hai — chahe koi bhi workspace khula ho. */}
      <audio ref={callAudioRef} autoPlay playsInline className="hidden" />
      {callingState !== 'idle' && (
        callingState === 'incoming'
        || !activeWorkspaceOrder
        || isWorkspaceMinimized
        || (activeCallOrderId !== null && activeWorkspaceOrder.id !== activeCallOrderId)
      ) && (
        <div className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center">
          <div className="relative mb-6">
            <div className={`absolute inset-0 rounded-full ${callingState === 'connected' ? 'bg-emerald-500/30' : 'bg-amber-500/30'} animate-ping`} />
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
              callingState === 'connected' ? 'bg-emerald-600' : callingState === 'incoming' ? 'bg-emerald-600' : 'bg-amber-600'
            }`}>
              <PhoneCall className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-black text-white mb-1">{callPeerLabel || 'Connected user'}</h2>
          {callingState === 'incoming' && (callIncomingOrderRef.current?.serviceName || callIncomingOrderRef.current?.formTitle) && (
            <p className="text-xs font-bold text-emerald-300 mb-1 max-w-xs truncate">
              {callIncomingOrderRef.current?.serviceName || callIncomingOrderRef.current?.formTitle}
            </p>
          )}
          <p className="text-sm text-slate-400 mb-8">
            {callingState === 'connected' ? `In call • ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}` :
             callingState === 'incoming' ? '📞 Incoming voice call… Answer dabate hi call connect hogi' : 'Calling…'}
          </p>
          <div className="flex items-center gap-4">
            {callingState === 'incoming' ? (
              <>
                <button
                  onClick={() => void acceptVoiceCall()}
                  className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
                  title="Answer"
                >
                  <Phone className="w-7 h-7" />
                </button>
                <button
                  onClick={rejectVoiceCall}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
                  title="Decline"
                >
                  <PhoneCall className="w-7 h-7 rotate-135" />
                </button>
              </>
            ) : (
              <>
                {callingState === 'connected' && (
                  <button
                    onClick={toggleCallMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all ${
                      isCallMuted ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    title="Mute"
                  >
                    {isCallMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                )}
                <button
                  onClick={() => endVoiceCall()}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
                  title="End call"
                >
                  <PhoneCall className="w-7 h-7 rotate-135" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* FLOATING MINIMIZED WORKSPACE BAR */}
      {activeWorkspaceOrder && isWorkspaceMinimized && (
        <div
          onClick={() => setIsWorkspaceMinimized(false)}
          className="fixed bottom-5 right-5 z-50 bg-white text-black px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer hover:scale-105 transition-all font-black text-xs sm:text-sm border border-white/40 animate-in slide-in-from-bottom"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-black" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-1 -right-1 animate-ping" />
          </div>
          <div className="text-left">
            <p className="font-extrabold leading-tight text-black">💬 Live Chat Active</p>
            <p className="text-[10px] font-semibold text-zinc-600 truncate max-w-[200px]">
              {activeWorkspaceOrder.serviceName || activeWorkspaceOrder.id}
            </p>
          </div>
          <div className="bg-black text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ml-2 shadow-md">
            <Maximize className="w-3.5 h-3.5 text-white" />
            <span>Open Full</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* JAN SEVA KENDRA & OPERATOR IDENTITY MODAL (SERVICES PAR DIKHNE WALA NAAM)  */}
      {/* ========================================================================= */}
      {isKendraDetailsModalOpen && (
        <div className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="glass-window w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl relative space-y-5 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>{t('Jan Seva Kendra & Operator Details', 'जन सेवा केंद्र एवं ऑपरेटर विवरण')}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('Your Center and Operator details will appear on all official services and citizen receipts.', 'आपके जन सेवा केंद्र और ऑपरेटर का नाम सभी आधिकारिक सेवाओं और ग्राहक रसीद पर प्रदर्शित होगा।')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="glass-control-btn text-sky-300"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsKendraDetailsModalOpen(false)}
                  className="glass-control-btn glass-control-btn-close text-rose-300"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info Notice */}
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-2.5 text-xs text-sky-200">
              <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                {t(
                  'Enter your name and Jan Seva Kendra details here. All service catalog cards, apply buttons, and receipts will show this name live!',
                  'यहाँ आप अपना या अपने जन सेवा केंद्र का नाम दर्ज करें। वेबसाइट की सभी सेवाओं की सूची, आवेदन बटन और आधिकारिक रसीद पर यही नाम दिखाई देगा!'
                )}
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('Kendra / Center Name', 'जन सेवा केंद्र का नाम')}</span>
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={kendraEditCenterName}
                    onChange={e => setKendraEditCenterName(e.target.value.slice(0, 60))}
                    placeholder="e.g. Sai Jan Seva Kendra"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-sky-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('Operator Name', 'ऑपरेटर का नाम')}</span>
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={kendraEditOperatorName}
                    onChange={e => setKendraEditOperatorName(e.target.value.slice(0, 50))}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>CSC ID / Kendra Registration No.</span>
                  </label>
                  <input
                    type="text"
                    maxLength={25}
                    value={kendraEditVleId}
                    onChange={e => setKendraEditVleId(e.target.value.slice(0, 25))}
                    placeholder="CSC ID"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:border-sky-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('10-Digit Mobile Number', '10 अंकों का मोबाइल नंबर')}</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={kendraEditPhone}
                    onChange={e => setKendraEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('Gmail / Email Address', 'जीमेल / ईमेल पता')}</span>
                </label>
                <input
                  type="email"
                  maxLength={80}
                  value={kendraEditEmail}
                  onChange={e => setKendraEditEmail(e.target.value.slice(0, 80))}
                  placeholder="name@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-sky-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t('State / UT', 'राज्य / केंद्र शासित प्रदेश')}</span>
                </label>
                <StateSelect
                  value={kendraEditStateValue}
                  onChange={(val) => {
                    setKendraEditStateValue(val);
                    if (sameAsStateValue(kendraEditDistrict, val)) setKendraEditDistrict('');
                    if (sameAsStateValue(kendraEditCity, val)) setKendraEditCity('');
                  }}
                  options={INDIAN_STATES}
                  emptyLabel={t('Select State / UT', 'राज्य / केंद्र शासित प्रदेश चुनें')}
                  ariaLabel="State / UT"
                  className="w-full px-3.5 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('District', 'जिला')}</span>
                  </label>
                  <LocationAutocomplete
                    value={kendraEditDistrict}
                    onChange={val => setKendraEditDistrict(val.slice(0, 40))}
                    preferType="district"
                    state={kendraEditStateValue}
                    placeholder="e.g. Lucknow"
                    wrapperClassName="w-full"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-sky-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('City / Tehsil', 'शहर / तहसील')}</span>
                  </label>
                  <LocationAutocomplete
                    value={kendraEditCity}
                    onChange={val => setKendraEditCity(val.slice(0, 40))}
                    preferType="city"
                    state={kendraEditStateValue}
                    placeholder="e.g. Sadar"
                    wrapperClassName="w-full"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('Operator Photo', 'ऑपरेटर फोटो')}</span>
                  </label>
                  {kendraEditPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setKendraEditPhotoUrl('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {kendraEditPhotoUrl ? (
                    <img
                      src={kendraEditPhotoUrl}
                      alt="Operator preview"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-500/50 shadow-md bg-slate-800 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        setKendraSaveError('Photo 2MB se chhoti honi chahiye. Kripya chhoti image chunein.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setKendraEditPhotoUrl(event.target.result as string);
                          setKendraSaveError('');
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="block flex-1 min-w-0 text-xs text-slate-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-600 hover:file:bg-sky-500 file:text-white file:cursor-pointer file:shadow-md bg-slate-950 border border-slate-700 rounded-xl cursor-pointer p-1.5 focus:border-sky-500 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {t('Camera or gallery se JPG / PNG / WebP photo upload karein (max 2MB).', 'कैमरा या गैलरी से JPG / PNG / WebP फोटो अपलोड करें (max 2MB)।')}
                </p>
              </div>

              {kendraSaveError && (
                <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                  {kendraSaveError}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                {t('✨ Updates live instantly across all services.', '✨ सभी सेवा कार्ड्स पर तुरंत लाइव अपडेट हो जाएगा।')}
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsKendraDetailsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  {t('Cancel', 'रद्द करें')}
                </button>
                <button
                  type="button"
                  onClick={saveKendraDetails}
                  disabled={isSavingKendraDetails}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingKendraDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingKendraDetails ? t('Saving…', 'सुरक्षित हो रहा है…') : t('Save Details', 'विवरण सुरक्षित करें')}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ✍️ FORM EXPERT PROFILE & LOCATION MODAL */}
      {isFillerDetailsModalOpen && (
        <div className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="glass-window w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl relative space-y-5 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>{t('Form Expert Details', 'फॉर्म विशेषज्ञ विवरण')}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('These details appear on your published forms, applications and citizen receipts.', 'ये विवरण आपके प्रकाशित फॉर्म, आवेदन और ग्राहक रसीद पर दिखाई देंगे।')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="glass-control-btn text-emerald-300"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFillerDetailsModalOpen(false)}
                  className="glass-control-btn glass-control-btn-close text-rose-300"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Info Notice */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                {t(
                  'Save your name and location once — every new form you publish will use these details automatically.',
                  'अपना नाम और स्थान एक बार सुरक्षित करें — आपके द्वारा प्रकाशित हर नए फॉर्म में यही विवरण स्वतः उपयोग होगा।'
                )}
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('Expert Name', 'विशेषज्ञ का नाम')}</span>
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={fillerEditName}
                    onChange={e => setFillerEditName(e.target.value.slice(0, 60))}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('10-Digit Mobile Number', '10 अंकों का मोबाइल नंबर')}</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={fillerEditPhone}
                    onChange={e => setFillerEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('Gmail / Email Address', 'जीमेल / ईमेल पता')}</span>
                </label>
                <input
                  type="email"
                  maxLength={80}
                  value={fillerEditEmail}
                  onChange={e => setFillerEditEmail(e.target.value.slice(0, 80))}
                  placeholder="name@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('State / UT', 'राज्य / केंद्र शासित प्रदेश')}</span>
                </label>
                <StateSelect
                  value={fillerEditStateValue}
                  onChange={(val) => {
                    setFillerEditStateValue(val);
                    if (sameAsStateValue(fillerEditDistrict, val)) setFillerEditDistrict('');
                    if (sameAsStateValue(fillerEditCity, val)) setFillerEditCity('');
                  }}
                  options={INDIAN_STATES}
                  emptyLabel={t('Select State / UT', 'राज्य / केंद्र शासित प्रदेश चुनें')}
                  ariaLabel="State / UT"
                  className="w-full px-3.5 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('District', 'जिला')}</span>
                  </label>
                  <LocationAutocomplete
                    value={fillerEditDistrict}
                    onChange={val => setFillerEditDistrict(val.slice(0, 40))}
                    preferType="district"
                    state={fillerEditStateValue}
                    placeholder="e.g. Lucknow"
                    wrapperClassName="w-full"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('City / Tehsil', 'शहर / तहसील')}</span>
                  </label>
                  <LocationAutocomplete
                    value={fillerEditCity}
                    onChange={val => setFillerEditCity(val.slice(0, 40))}
                    preferType="city"
                    state={fillerEditStateValue}
                    placeholder="e.g. Sadar"
                    wrapperClassName="w-full"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('Profile Photo', 'प्रोफ़ाइल फोटो')}</span>
                  </label>
                  {fillerEditPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFillerEditPhotoUrl('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {fillerEditPhotoUrl ? (
                    <img
                      src={fillerEditPhotoUrl}
                      alt="Expert preview"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md bg-slate-800 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        setFillerSaveError('Photo 2MB se chhoti honi chahiye. Kripya chhoti image chunein.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setFillerEditPhotoUrl(event.target.result as string);
                          setFillerSaveError('');
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="block flex-1 min-w-0 text-xs text-slate-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 hover:file:bg-emerald-500 file:text-white file:cursor-pointer file:shadow-md bg-slate-950 border border-slate-700 rounded-xl cursor-pointer p-1.5 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {t('Camera or gallery se JPG / PNG / WebP photo upload karein (max 2MB).', 'कैमरा या गैलरी से JPG / PNG / WebP फोटो अपलोड करें (max 2MB)।')}
                </p>
              </div>

              {fillerSaveError && (
                <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                  {fillerSaveError}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                {t('✨ Saved details are used automatically in new forms.', '✨ सुरक्षित विवरण नए फॉर्म में स्वतः उपयोग होगा।')}
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsFillerDetailsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  {t('Cancel', 'रद्द करें')}
                </button>
                <button
                  type="button"
                  onClick={saveFillerDetails}
                  disabled={isSavingFillerDetails}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingFillerDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingFillerDetails ? t('Saving…', 'सुरक्षित हो रहा है…') : t('Save Details', 'विवरण सुरक्षित करें')}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 💰 CITIZEN CATEGORY CONFIRM POPUP — every request passes through this */}
      <CategoryConfirmModal
        config={categoryConfirm}
        category={categoryConfirmValue}
        onCategoryChange={setCategoryConfirmValue}
        busy={isCategoryConfirmBusy}
        onCancel={() => {
          if (isCategoryConfirmBusy) return;
          setCategoryConfirm(null);
        }}
        onConfirm={handleCategoryConfirm}
        t={t}
      />

      {/* ZOOM PHOTO PROOF MODAL */}
      {zoomProofPhoto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="my-auto max-h-[calc(100vh-1rem)] max-h-[calc(100dvh-1rem)] max-w-4xl w-full glass-window p-4 sm:p-6 space-y-4 relative shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomProofPhoto(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-sky-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-sky-400" />
                  <span>Back</span>
                </button>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-sky-400" />
                  <span>Photo Proof Inspection</span>
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="glass-control-btn text-sky-300"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setZoomProofPhoto(null)}
                  className="glass-control-btn glass-control-btn-close text-rose-300"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-700 max-h-[55vh] sm:max-h-[75vh] flex items-center justify-center bg-black/60">
              <img src={zoomProofPhoto} alt="Zoomed Proof" className="max-w-full max-h-[55vh] sm:max-h-[75vh] object-contain" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
              <span>Inspect all spellings, names, date of birth, and roll numbers carefully.</span>
              <button
                onClick={() => setZoomProofPhoto(null)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black rounded-xl shadow-md active:scale-95"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}



      {/* LIVE CAMERA CAPTURE MODAL (Triggered via SMS / WhatsApp Link / Website Notification) */}
      {liveCameraToken && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="my-auto max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] max-w-md w-full overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-center relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  stopLiveCamera();
                  setLiveCameraToken(null);
                }}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 mx-auto flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/30">
                📸
              </div>
              <h3 className="text-xl font-black text-white">Live Camera Photo Request</h3>
              <p className="text-xs text-slate-300">
                Jan Seva Kendra Expert <b>{liveCameraSessionInfo?.expertName || 'Form Expert'}</b> has requested your live photo for <b>{liveCameraSessionInfo?.serviceName || 'Sarkari Form'}</b>.
              </p>
            </div>

            {!liveCamSuccess ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-2">
                  <p className="font-bold text-white flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>You control camera access</span>
                  </p>
                  <p>Your camera starts only after you allow browser access. Once the preview is live, the Jan Seva / Form Filler expert can capture your photo directly from their dashboard.</p>
                  <p>By continuing, you consent to share your live photo for this application form. The photo gets a date/time &amp; application ID watermark to prevent misuse. For liveness, blink your eyes once when prompted.</p>
                </div>

                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                  <video
                    ref={clientCameraVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onCanPlay={() => setIsClientPreviewReady(true)}
                    onError={() => {
                      setIsClientPreviewReady(false);
                      setClientCameraError('Could not display the camera preview. Turn the camera off and try again.');
                    }}
                    className={`h-full w-full object-cover ${isClientCameraOn ? 'block' : 'hidden'} [transform:scaleX(-1)]`}
                  />
                  {!isClientCameraOn ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                      <Camera className="h-8 w-8 text-slate-500" />
                      <p className="text-xs font-bold text-slate-300">Your camera is off</p>
                      <p className="text-[11px] text-slate-500">Allow access when your browser asks. You can turn it off at any time.</p>
                    </div>
                  ) : !isClientPreviewReady ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                      <p className="text-xs font-bold text-white">Preparing camera preview…</p>
                    </div>
                  ) : (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-slate-950/75 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Preview ready
                    </span>
                  )}
                  {isClientCameraOn && isClientPreviewReady && (
                    <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${clientBlinkVerified ? 'border border-emerald-300/40 bg-emerald-500/15 text-emerald-200' : 'border border-amber-300/40 bg-amber-500/15 text-amber-200'}`}>
                      {clientBlinkVerified ? '✅ Blink verified' : `👁️ ${clientBlinkMessage || 'Blink check…'}`}
                    </span>
                  )}
                </div>

                {!isClientCameraOn ? (
                  <button
                    onClick={handleEnableClientCamera}
                    disabled={!liveCameraSessionInfo}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="w-5 h-5 text-white" />
                    <span>{clientCameraError ? 'Try Camera Access Again' : 'Allow Camera & Start Preview'}</span>
                  </button>
                ) : (
                  <button
                    onClick={captureAndSubmitLivePhoto}
                    disabled={isSubmittingLiveCam || !isClientPreviewReady || (isClientBlinkActive && !clientBlinkVerified)}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    {isSubmittingLiveCam || !isClientPreviewReady
                      ? <Loader2 className="w-5 h-5 animate-spin text-white" />
                      : <Camera className="w-5 h-5 text-white" />}
                    <span>{isSubmittingLiveCam ? 'Submitting Live Photo…' : !isClientPreviewReady ? 'Preparing Preview…' : (isClientBlinkActive && !clientBlinkVerified) ? 'Blink your eyes to continue' : 'Capture & Send Now'}</span>
                  </button>
                )}
                {clientCameraError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">{clientCameraError}</p>}
                {isClientCameraOn && (
                  <button type="button" onClick={() => stopLiveCamera()} className="w-full text-xs font-bold text-slate-400 hover:text-white">
                    Turn camera off
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto font-bold text-xl">
                  ✓
                </div>
                <h4 className="text-base font-bold text-white">Live Photo Submitted Successfully!</h4>
                <p className="text-xs text-emerald-200">
                  Your live photo has been securely transmitted to the form expert's dashboard in real-time. You can now close this window.
                </p>
                <button
                  onClick={() => {
                    stopLiveCamera();
                    setLiveCameraToken(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer with Clean, Minimal & Professional Design */}
      <footer className="bg-[#07090E] border-t border-white/[0.08] py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
            {/* Brand & Description */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <BrandEmblem3D
                size="md"
                layout="row"
                onClick={() => {
                  setStep('landing');
                  setActiveRole('none');
                }}
              />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  FILLUP | Digital Jan Seva Kendra
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Independent assistant platform. Not a government portal.
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <a
                href="mailto:supportfillup.in@gmail.com"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-cyan-400 border border-white/[0.06] transition-all"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>supportfillup.in@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Legal Links */}

          {/* Copyright */}
          <div className="text-center">
            <p className="text-xs text-slate-500 font-mono">
              © 2026 FILLUP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {step === 'terms_citizen' && (
        <TermsCitizen onBack={() => {
          if (showLegalModal || pendingRole) {
            setShowLegalModal(true);
            setStep('landing');
            return;
          } else {
            const session = readStoredSession();
            if (session?.role === 'client') setStep('client_portal');
            else if (session?.role === 'vle') setStep('vle_home');
            else if (session?.role === 'form_filler') setStep('form_filler_app');
            else setStep('landing');
          }
        }} language={lang} />
      )}
      {step === 'terms_janseva' && (
        <TermsJanSeva onBack={() => {
          if (showLegalModal || pendingRole) {
            setShowLegalModal(true);
            setStep('landing');
            return;
          } else {
            const session = readStoredSession();
            if (session?.role === 'client') setStep('client_portal');
            else if (session?.role === 'vle') setStep('vle_home');
            else if (session?.role === 'form_filler') setStep('form_filler_app');
            else setStep('landing');
          }
        }} language={lang} />
      )}
      {step === 'terms_formfiller' && (
        <TermsFormFiller onBack={() => {
          if (showLegalModal || pendingRole) {
            setShowLegalModal(true);
            setStep('landing');
            return;
          } else {
            const session = readStoredSession();
            if (session?.role === 'client') setStep('client_portal');
            else if (session?.role === 'vle') setStep('vle_home');
            else if (session?.role === 'form_filler') setStep('form_filler_app');
            else setStep('landing');
          }
        }} language={lang} />
      )}
      {step === 'privacy_policy' && (
        <PrivacyPolicy onBack={() => {
          if (showLegalModal || pendingRole) {
            setShowLegalModal(true);
            setStep('landing');
            return;
          } else {
            const session = readStoredSession();
            if (session?.role === 'client') setStep('client_portal');
            else if (session?.role === 'vle') setStep('vle_home');
            else if (session?.role === 'form_filler') setStep('form_filler_app');
            else setStep('landing');
          }
        }} language={lang} />
      )}

      {showLegalModal && pendingRole && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-white/[0.08]">
              <h3 className="text-lg font-black text-white mb-1">Terms & Conditions & Privacy Policy</h3>
              <p className="text-xs text-slate-400">Please read and accept to continue to dashboard</p>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-slate-300 leading-relaxed">
                I have read and agree to the Terms & Conditions and Privacy Policy applicable to my role on FILLUP platform.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLegalModal(false);
                    if (pendingRole === 'client') setStep('terms_citizen');
                    else if (pendingRole === 'vle') setStep('terms_janseva');
                    else if (pendingRole === 'form_filler') setStep('terms_formfiller');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-400/40 text-cyan-300 hover:text-white text-sm font-semibold transition-all"
                >
                  View Terms & Conditions
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLegalModal(false);
                    setStep('privacy_policy');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-400/40 text-purple-300 hover:text-white text-sm font-semibold transition-all"
                >
                  View Privacy Policy
                </button>
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-950/50 border border-white/[0.06]">
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(e) => setLegalAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-slate-700"
                />
                <span className="text-sm text-slate-300 leading-relaxed">
                  I have read and accept the Terms & Conditions and Privacy Policy
                </span>
              </label>
            </div>
            <div className="p-5 border-t border-white/[0.08]">
              <button
                disabled={!legalAccepted}
                onClick={() => {
                  try { localStorage.setItem(LEGAL_ACCEPTED_KEY, 'true'); } catch {}
                  setShowLegalModal(false);
                  if (pendingRole === 'client') setStep('client_portal');
                  else if (pendingRole === 'vle') setStep('vle_home');
                  else if (pendingRole === 'form_filler') setStep('form_filler_app');
                  setPendingRole(null);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg"
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR ZOOM MODAL (uploaded QR image ko bada karke scan karne ke liye) */}
      {qrZoomImage && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setQrZoomImage('')}
        >
          <div
            className="relative bg-white rounded-2xl p-4 shadow-2xl max-w-[92vw] max-h-[92vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setQrZoomImage('')}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-slate-900 text-white border border-white/20 flex items-center justify-center shadow-lg hover:bg-slate-700"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={qrZoomImage}
              alt="Payment QR — zoomed"
              className="block max-w-[86vw] max-h-[82vh] object-contain rounded-lg"
            />
            <p className="mt-2 text-center text-[11px] font-semibold text-slate-600">
              Phone se scan karke payment karein
            </p>
          </div>
        </div>
      )}

    </div>
    </LocalizedTree>
  );
}
