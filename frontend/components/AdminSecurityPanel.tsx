import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldAlert, ShieldCheck, Ban, RefreshCw, Globe2, Server, Activity, Lock, Unlock, CreditCard, Save, Trash2, BookOpen, CheckCircle, XCircle, Users, UserX, UserCheck, Search, Clock } from 'lucide-react';
import { fetchWithRetry, parseJsonResponse } from '../services/apiClient';
import { LocalizedTree, type AppLanguage } from '../localization';

// ========================================================
// 🛡️ ADMIN SECURITY CONSOLE
// ========================================================
// Attack log dikhata hai: kaunsa IP, kaunsa country, kaunsa Cloudflare ray,
// kaunsa path target ho raha hai, aur kitne requests aaye.
// Yahan se IP ko block/unblock bhi kar sakte ho.

export type SecurityVerdict = 'ALLOWED' | 'SUSPICIOUS' | 'BLOCKED';

export interface SecurityEvent {
  id: number;
  time: string;
  ip: string;
  country: string;
  cfRay: string;
  viaCloudflare: boolean;
  method: string;
  path: string;
  status: number;
  score: number;
  verdict: SecurityVerdict;
  reasons: string[];
  userAgent: string;
  referer: string;
}

export interface SecuritySummary {
  totalRequests: number;
  last24hRequests: number;
  last1hRequests: number;
  blocked: number;
  suspicious: number;
  allowed: number;
  blockedLast24h: number;
  viaCloudflare: number;
  directToOrigin: number;
  thresholds: { blockScore: number; suspiciousScore: number; allowedCountries: string[] };
  topBlockedIps: { key: string; count: number }[];
  topPaths: { key: string; count: number }[];
  byCountry: { key: string; count: number }[];
  blockedIpList: string[];
}

export interface AdminSecurityPanelProps {
  onBack: () => void;
  language?: AppLanguage;
}

interface AdminUpiSettings {
  upiId: string;
  payeeName: string;
  source: string;
}

interface OperatorSuspensionEntry {
  action: 'suspend' | 'unsuspend' | 'auto-expired';
  reason: string;
  days?: number;
  note?: string;
  at: string;
  by?: string;
}

interface AdminOperatorView {
  id: string;
  accountId?: string;
  name: string;
  centerName?: string;
  cscId: string;
  role: 'vle' | 'filler';
  district: string;
  city: string;
  state?: string;
  phone: string;
  email?: string;
  status: string;
  complianceScore: number;
  bidsSuspended: boolean;
  bidsSuspendedAt?: string;
  bidsSuspendedReason?: string;
  bidsSuspendedUntil?: string;
  suspensionHistory: OperatorSuspensionEntry[];
  activeBidCount: number;
}

const TOKEN_STORAGE_KEY = 'digiseva_admin_token';

const SUSPENSION_REASON_PRESETS = [
  'In-app payment bypass — client ne direct UPI/WhatsApp se paisa diya',
  'Chat me phone/UPI share karke platform se bahar payment maanga',
  'Fake / galat document ya PDF upload kiya',
  'Order accept karke abandon kiya (client ko wait karaya)',
  'Verified client complaint (screenshot/proof ke saath)',
  'Fake payment screenshot / UTR mismatch'
];

const getStoredToken = () => {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY) || '';
};

export const AdminSecurityPanel: React.FC<AdminSecurityPanelProps> = ({ onBack, language = 'EN' }) => {
  const [token, setToken] = useState<string>(() => getStoredToken());
  const [tokenInput, setTokenInput] = useState<string>(token);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | SecurityVerdict>('ALL');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'error' } | null>(null);
  const [upiSettings, setUpiSettings] = useState<AdminUpiSettings | null>(null);
  const [upiInput, setUpiInput] = useState('');
  const [upiNameInput, setUpiNameInput] = useState('');
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerNote, setLedgerNote] = useState('');
  const [operators, setOperators] = useState<AdminOperatorView[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<AdminOperatorView | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDays, setSuspendDays] = useState('7');
  const [suspendNote, setSuspendNote] = useState('');
  const [suspendBusy, setSuspendBusy] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<AdminOperatorView | null>(null);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['x-admin-token'] = token;
    return headers;
  }, [token]);

  const loadLedger = async () => {
    setLedgerLoading(true);
    try {
      const res = await fetchWithRetry('/api/admin/payments/ledger', { headers: authHeaders });
      const data = await parseJsonResponse(res);
      if (data.success && Array.isArray(data.ledger)) setLedger(data.ledger);
    } catch {}
    setLedgerLoading(false);
  };

  const updateLedgerStatus = async (id: string, status: 'Reconciled' | 'Reversed') => {
    try {
      await fetchWithRetry(`/api/admin/payments/ledger/${id}/status`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status, note: ledgerNote })
      });
      setLedgerNote('');
      await loadLedger();
    } catch {}
  };

  const loadOperators = useCallback(async (search = '') => {
    setOperatorsLoading(true);
    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const res = await fetchWithRetry(`/api/admin/operators${query}`, { headers: authHeaders });
      const data = await parseJsonResponse(res);
      if (res.ok && data.success && Array.isArray(data.operators)) {
        setOperators(data.operators as AdminOperatorView[]);
      }
    } catch {}
    setOperatorsLoading(false);
  }, [authHeaders]);

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    if (!suspendReason.trim()) {
      setMessage({ text: 'Suspension reason likhna zaroori hai (proof-based action).', type: 'error' });
      return;
    }
    setSuspendBusy(true);
    try {
      const res = await fetchWithRetry(`/api/admin/operators/${encodeURIComponent(suspendTarget.id)}/suspend`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          reason: suspendReason.trim(),
          days: Number(suspendDays) || 0,
          note: suspendNote.trim()
        })
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not suspend the operator.');
      setMessage({ text: data.message || 'Operator suspended.', type: 'ok' });
      setSuspendTarget(null);
      setSuspendReason('');
      setSuspendNote('');
      setSuspendDays('7');
      await loadOperators(operatorSearch);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not suspend the operator.', type: 'error' });
    } finally {
      setSuspendBusy(false);
    }
  };

  const handleUnsuspend = async (operator: AdminOperatorView) => {
    setSuspendBusy(true);
    try {
      const res = await fetchWithRetry(`/api/admin/operators/${encodeURIComponent(operator.id)}/unsuspend`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: 'Admin review ke baad suspension hataayi gayi.' })
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not unsuspend the operator.');
      setMessage({ text: data.message || 'Operator unsuspended.', type: 'ok' });
      setHistoryTarget(null);
      await loadOperators(operatorSearch);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not unsuspend the operator.', type: 'error' });
    } finally {
      setSuspendBusy(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!token.trim()) {
      setMessage({ text: 'Enter the ADMIN_TOKEN to open the security console.', type: 'error' });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const query = new URLSearchParams({ limit: '200' });
      if (verdictFilter !== 'ALL') query.set('verdict', verdictFilter);
      if (countryFilter.trim()) query.set('country', countryFilter.trim());

      const [summaryResponse, logResponse, upiResponse] = await Promise.all([
        fetchWithRetry('/api/admin/security/summary', { headers: authHeaders }),
        fetchWithRetry(`/api/admin/security/log?${query.toString()}`, { headers: authHeaders }),
        fetchWithRetry('/api/admin/settings/upi', { headers: authHeaders })
      ]);

      const summaryData = await parseJsonResponse(summaryResponse);
      const logData = await parseJsonResponse(logResponse);
      const upiData = await parseJsonResponse(upiResponse);

      if (!summaryResponse.ok || !summaryData.success) {
        throw new Error(summaryData.error || 'Could not load the security summary.');
      }
      if (!logResponse.ok || !logData.success) {
        throw new Error(logData.error || 'Could not load the attack log.');
      }

      setSummary(summaryData.summary as SecuritySummary);
      setEvents((logData.events as SecurityEvent[]) || []);
      if (upiResponse.ok && upiData.success) {
        setUpiSettings(upiData.settings as AdminUpiSettings);
        setUpiInput(upiData.settings?.upiId || '');
        setUpiNameInput(upiData.settings?.payeeName || '');
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not load security data.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders, countryFilter, token, verdictFilter]);

  useEffect(() => {
    if (token) void loadData();
  }, [token, loadData]);

  useEffect(() => {
    if (token) void loadOperators('');
  }, [token, loadOperators]);

  const handleSaveToken = () => {
    const clean = tokenInput.trim();
    setToken(clean);
    if (clean) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, clean);
      localStorage.setItem(TOKEN_STORAGE_KEY, clean);
      setMessage({ text: 'Admin token saved.', type: 'ok' });
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const handleBlockIp = async (ip: string, action: 'block' | 'unblock') => {
    try {
      const response = await fetchWithRetry(`/api/admin/security/${action}-ip`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ip })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Action failed.');
      setMessage({
        text: action === 'block' ? `Blocked ${ip}.` : `Unblocked ${ip}.`,
        type: 'ok'
      });
      await loadData();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Action failed.', type: 'error' });
    }
  };

  const blockedSet = useMemo(() => new Set(summary?.blockedIpList || []), [summary]);

  const handleSaveUpi = async () => {
    setIsSavingUpi(true);
    try {
      const response = await fetchWithRetry('/api/admin/settings/upi', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ upiId: upiInput.trim(), payeeName: upiNameInput.trim() })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not save the admin UPI.');
      setUpiSettings(data.settings as AdminUpiSettings);
      setMessage({ text: data.message || 'Admin UPI saved.', type: 'ok' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not save the admin UPI.', type: 'error' });
    } finally {
      setIsSavingUpi(false);
    }
  };

  const handleClearUpi = async () => {
    setIsSavingUpi(true);
    try {
      const response = await fetchWithRetry('/api/admin/settings/upi', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ upiId: '', payeeName: '' })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not clear the admin UPI.');
      setUpiSettings(data.settings as AdminUpiSettings);
      setUpiInput(data.settings?.upiId || '');
      setMessage({ text: data.message || 'Admin UPI cleared.', type: 'ok' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not clear the admin UPI.', type: 'error' });
    } finally {
      setIsSavingUpi(false);
    }
  };

  const statCards = summary
    ? [
        { label: 'Requests (24h)', value: summary.last24hRequests, icon: Activity, tone: 'text-cyan-300' },
        { label: 'Blocked', value: summary.blocked, icon: ShieldAlert, tone: 'text-rose-300' },
        { label: 'Suspicious', value: summary.suspicious, icon: ShieldCheck, tone: 'text-amber-300' },
        { label: 'Via Cloudflare', value: summary.viaCloudflare, icon: Globe2, tone: 'text-emerald-300' },
        { label: 'Direct to origin', value: summary.directToOrigin, icon: Server, tone: 'text-orange-300' }
      ]
    : [];

  return (
    <LocalizedTree language={language}>
    <div className="min-h-screen bg-[#050914] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-rose-400" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Admin Security Console</h1>
              <p className="text-xs text-slate-400">Bot attack log • blocked IPs • Cloudflare traffic split</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-cyan-300 hover:text-white border border-white/10 text-xs font-bold transition"
          >
            Back
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0A1020]/80 p-4 space-y-3">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" /> ADMIN_TOKEN
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={event => setTokenInput(event.target.value)}
              placeholder="Paste the ADMIN_TOKEN from the server env"
              className="flex-1 h-11 px-4 rounded-xl bg-[#090F1D] border border-white/10 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20 text-sm font-medium outline-none"
            />
            <button
              onClick={handleSaveToken}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition"
            >
              Save & Load
            </button>
            <button
              onClick={() => void loadData()}
              disabled={isLoading}
              className="h-11 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {message && (
            <p role="status" className={`text-xs font-semibold ${message.type === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {message.text}
            </p>
          )}
        </div>

        {upiSettings && (
          <div className="rounded-2xl border border-white/10 bg-[#0A1020]/80 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-300" />
              <h2 className="text-sm font-black text-white">Admin Fee UPI (platform commission)</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Yeh UPI ID citizen ke &quot;Admin Fee&quot; QR me dikhti hai. Yahan save karte hi turant apply ho jaati hai — server restart ki zaroorat nahi.
              {!upiSettings.upiId && ' Abhi koi UPI set nahi hai, isliye citizen ko Admin Fee QR nahi dikh raha.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={upiInput}
                onChange={event => setUpiInput(event.target.value)}
                placeholder="admin upi id (e.g. digiseva@okaxis)"
                className="flex-1 h-10 px-3 rounded-xl bg-[#090F1D] border border-white/10 text-xs font-mono text-white outline-none focus:border-cyan-400/70"
                autoComplete="off"
              />
              <input
                value={upiNameInput}
                onChange={event => setUpiNameInput(event.target.value)}
                placeholder="Payee name"
                className="flex-1 h-10 px-3 rounded-xl bg-[#090F1D] border border-white/10 text-xs text-white outline-none focus:border-cyan-400/70"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => void handleSaveUpi()}
                disabled={isSavingUpi}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> Save Admin UPI
              </button>
              <button
                onClick={() => void handleClearUpi()}
                disabled={isSavingUpi}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 text-xs font-bold transition disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
              <span className="text-[10px] font-mono text-slate-500">
                Current: {upiSettings.upiId || '(not set)'} • source: {upiSettings.source}
              </span>
            </div>
          </div>
        )}

        {/* 🚫 Operator Management — list, suspend, unsuspend, audit trail */}
        <div className="rounded-2xl border border-white/10 bg-[#0A1020]/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-300" />
              <div>
                <h2 className="text-sm font-black text-white">Operator Management</h2>
                <p className="text-[11px] text-slate-400">Suspend / unsuspend bids with proof-based reason &amp; audit trail.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-rose-300">
                {operators.filter(item => item.bidsSuspended).length} suspended
              </span>
              <button
                onClick={() => void loadOperators(operatorSearch)}
                disabled={operatorsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-slate-300 hover:bg-white/[0.12] disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${operatorsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={operatorSearch}
                onChange={event => setOperatorSearch(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') void loadOperators(operatorSearch); }}
                placeholder="Search by name, CSC ID, phone, email, district…"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#090F1D] border border-white/10 text-xs text-white outline-none focus:border-cyan-400/70"
              />
            </div>
            <button
              onClick={() => void loadOperators(operatorSearch)}
              disabled={operatorsLoading}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
            >
              Search
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-400 uppercase tracking-wider">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3">Operator</th>
                  <th className="py-2 pr-3">Contact</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {operators.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      {operatorsLoading ? 'Loading operators…' : 'No operators found.'}
                    </td>
                  </tr>
                )}
                {operators.map(operator => (
                  <tr key={operator.id + (operator.accountId || '')} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3">
                      <p className="font-bold text-white">{operator.centerName || operator.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {operator.name} • {operator.cscId || operator.id}
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded font-bold ${operator.role === 'filler' ? 'bg-violet-500/20 text-violet-200' : 'bg-cyan-500/20 text-cyan-200'}`}>
                          {operator.role === 'filler' ? 'Form Expert' : 'Jan Seva'}
                        </span>
                      </p>
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      <p className="font-mono">{operator.phone || '-'}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[160px]" title={operator.email}>{operator.email || '-'}</p>
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      <p>{operator.city || '-'}</p>
                      <p className="text-[10px] text-slate-500">{operator.district}{operator.state ? `, ${operator.state}` : ''}</p>
                    </td>
                    <td className="py-2 pr-3 font-mono text-cyan-300">{operator.activeBidCount}</td>
                    <td className="py-2 pr-3 max-w-[220px]">
                      {operator.bidsSuspended ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-400/30 font-bold">
                            <UserX className="w-3 h-3" /> Suspended
                          </span>
                          <p className="text-[10px] text-rose-200/80 break-words" title={operator.bidsSuspendedReason}>{operator.bidsSuspendedReason || 'No reason recorded.'}</p>
                          <p className="text-[10px] text-slate-400">
                            {operator.bidsSuspendedUntil
                              ? `Until ${new Date(operator.bidsSuspendedUntil).toLocaleString()}`
                              : 'Permanent'}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 font-bold">
                          <UserCheck className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {operator.bidsSuspended ? (
                          <button
                            onClick={() => void handleUnsuspend(operator)}
                            disabled={suspendBusy}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-[10px] font-bold hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            <UserCheck className="w-3 h-3" /> Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSuspendTarget(operator);
                              setSuspendReason('');
                              setSuspendNote('');
                              setSuspendDays('7');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-200 text-[10px] font-bold hover:bg-rose-500/25"
                          >
                            <UserX className="w-3 h-3" /> Suspend
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryTarget(operator)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-slate-300 text-[10px] font-bold hover:bg-white/[0.12]"
                        >
                          <Clock className="w-3 h-3" /> History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suspend modal */}
        {suspendTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0A1020] p-5 space-y-4 my-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white">Suspend Operator</h3>
                  <p className="text-[11px] text-slate-400">{suspendTarget.centerName || suspendTarget.name} • {suspendTarget.cscId || suspendTarget.id}</p>
                </div>
                <button onClick={() => setSuspendTarget(null)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-300">Reason (proof-based) *</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUSPENSION_REASON_PRESETS.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setSuspendReason(preset)}
                      className={`text-left text-[10px] px-2 py-1 rounded-lg border transition ${
                        suspendReason === preset
                          ? 'bg-rose-500/20 border-rose-400/50 text-rose-100'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  value={suspendReason}
                  onChange={event => setSuspendReason(event.target.value)}
                  rows={2}
                  placeholder="Ya apna reason likhein…"
                  className="w-full px-3 py-2 rounded-xl bg-[#090F1D] border border-white/10 text-xs text-white outline-none focus:border-rose-400/70"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-300">Duration</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Permanent', value: '0' },
                    { label: '7 days', value: '7' },
                    { label: '15 days', value: '15' },
                    { label: '30 days', value: '30' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSuspendDays(option.value)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                        suspendDays === option.value
                          ? 'bg-rose-500/20 border-rose-400/50 text-rose-100'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">Temporary suspension khud expire ho jaati hai. Permanent sirf admin unsuspend kar sakta hai.</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-300">Note (optional)</p>
                <input
                  value={suspendNote}
                  onChange={event => setSuspendNote(event.target.value)}
                  placeholder="Order ID, proof reference, complaint details…"
                  className="w-full h-9 px-3 rounded-xl bg-[#090F1D] border border-white/10 text-xs text-white outline-none focus:border-rose-400/70"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setSuspendTarget(null)} className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/[0.12]">
                  Cancel
                </button>
                <button
                  onClick={() => void handleSuspend()}
                  disabled={suspendBusy || !suspendReason.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" /> {suspendBusy ? 'Suspending…' : 'Confirm Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History modal */}
        {historyTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0A1020] p-5 space-y-3 my-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white">Suspension History</h3>
                  <p className="text-[11px] text-slate-400">{historyTarget.centerName || historyTarget.name} • {historyTarget.cscId || historyTarget.id}</p>
                </div>
                <button onClick={() => setHistoryTarget(null)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
              </div>
              {historyTarget.suspensionHistory.length === 0 ? (
                <p className="text-[11px] text-slate-500">No suspension history yet.</p>
              ) : (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {[...historyTarget.suspensionHistory].reverse().map((entry, index) => (
                    <li key={`${entry.at}-${index}`} className="rounded-xl border border-white/10 bg-[#090F1D] p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          entry.action === 'suspend'
                            ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                            : entry.action === 'unsuspend'
                              ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20'
                              : 'bg-amber-500/15 text-amber-200 border border-amber-400/20'
                        }`}>
                          {entry.action === 'suspend' ? 'Suspended' : entry.action === 'unsuspend' ? 'Unsuspended' : 'Auto-expired'}
                        </span>
                        <span className="text-[10px] text-slate-500">{new Date(entry.at).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{entry.reason}</p>
                      {entry.days ? <p className="text-[10px] text-slate-400">Duration: {entry.days} day(s)</p> : null}
                      {entry.note ? <p className="text-[10px] text-slate-400">Note: {entry.note}</p> : null}
                      {entry.by ? <p className="text-[10px] text-slate-500">By: {entry.by}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setHistoryTarget(null)} className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/[0.12]">
                  Close
                </button>
                {historyTarget.bidsSuspended && (
                  <button
                    onClick={() => void handleUnsuspend(historyTarget)}
                    disabled={suspendBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Unsuspend
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {summary && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {statCards.map(card => (
                <div key={card.label} className="rounded-2xl border border-white/10 bg-[#0A1020]/80 p-4">
                  <card.icon className={`w-4 h-4 mb-2 ${card.tone}`} />
                  <p className="text-2xl font-black">{card.value}</p>
                  <p className="text-[11px] text-slate-400 font-semibold">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <MiniList title="Top blocked IPs" items={summary.topBlockedIps} language={language} />
              <MiniList title="Top attacked paths" items={summary.topPaths} language={language} />
              <MiniList title="Traffic by country" items={summary.byCountry} language={language} />
            </div>

            {summary.blockedIpList.length > 0 && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
                <p className="text-xs font-bold text-rose-300 mb-2">Manually blocked IPs ({summary.blockedIpList.length})</p>
                <div className="flex flex-wrap gap-2">
                  {summary.blockedIpList.map(ip => (
                    <button
                      key={ip}
                      onClick={() => void handleBlockIp(ip, 'unblock')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-200 text-[11px] font-mono hover:bg-rose-500/25 transition"
                    >
                      <Unlock className="w-3 h-3" /> {ip}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}


        <div className="rounded-2xl border border-white/10 bg-[#0A1020]/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-300" />
              <p className="text-sm font-bold text-white">Admin Payment Ledger (Auto-Verified)</p>
            </div>
            <button onClick={() => void loadLedger()} disabled={ledgerLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-slate-300 hover:bg-white/[0.12]">
              <RefreshCw className={`w-3 h-3 ${ledgerLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <p className="text-[11px] text-slate-400">Auto entries created when citizen ticks Admin QR + operator confirms Govt &amp; Operator shares. Reconcile or Reverse from here.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={ledgerNote} onChange={e => setLedgerNote(e.target.value)} placeholder="Note for reconcile/reverse (optional)" className="flex-1 h-9 px-3 rounded-xl bg-[#090F1D] border border-white/10 text-xs text-white outline-none" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-400 uppercase tracking-wider">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Order ID</th>
                  <th className="py-2 pr-3">Citizen</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Note</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-slate-500">No ledger entries yet.</td></tr>
                )}
                {ledger.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</td>
                    <td className="py-2 pr-3 font-mono text-cyan-300">{entry.orderId}</td>
                    <td className="py-2 pr-3 text-slate-300">{entry.citizenName || '-'}</td>
                    <td className="py-2 pr-3 font-mono text-emerald-300">₹{entry.amount}</td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${entry.status === 'Auto-Verified' ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30' : entry.status === 'Reconciled' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'}`}>{entry.status}</span>
                    </td>
                    <td className="py-2 pr-3 text-slate-400 max-w-[200px] truncate" title={entry.source}>{entry.source}</td>
                    <td className="py-2 pr-3 text-slate-400 max-w-[200px] truncate" title={entry.note}>{entry.note || '-'}</td>
                    <td className="py-2 flex items-center gap-1.5">
                      {entry.status !== 'Reconciled' && (
                        <button onClick={() => void updateLedgerStatus(entry.id, 'Reconciled')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3" /> Reconcile
                        </button>
                      )}
                      {entry.status !== 'Reversed' && (
                        <button onClick={() => void updateLedgerStatus(entry.id, 'Reversed')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-200 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" /> Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        <div className="rounded-2xl border border-white/10 bg-[#0A1020]/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <select
              value={verdictFilter}
              onChange={event => setVerdictFilter(event.target.value as 'ALL' | SecurityVerdict)}
              className="h-10 px-3 rounded-xl bg-[#090F1D] border border-white/10 text-xs font-semibold outline-none"
            >
              <option value="ALL">All traffic</option>
              <option value="BLOCKED">Blocked only</option>
              <option value="SUSPICIOUS">Suspicious only</option>
              <option value="ALLOWED">Allowed only</option>
            </select>
            <input
              value={countryFilter}
              onChange={event => setCountryFilter(event.target.value)}
              placeholder="Filter by country code (e.g. IN)"
              className="h-10 px-3 rounded-xl bg-[#090F1D] border border-white/10 text-xs font-semibold outline-none flex-1"
            />
            <button
              onClick={() => void loadData()}
              className="h-10 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-cyan-300 text-xs font-bold transition"
            >
              Apply filter
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-400 uppercase tracking-wider">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">IP</th>
                  <th className="py-2 pr-3">Country</th>
                  <th className="py-2 pr-3">Path</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Verdict</th>
                  <th className="py-2 pr-3">Reasons</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      No traffic captured yet.
                    </td>
                  </tr>
                )}
                {events.map(event => (
                  <tr key={event.id} className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(event.time).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 font-mono text-cyan-300 whitespace-nowrap">{event.ip}</td>
                    <td className="py-2 pr-3 font-mono text-slate-300 whitespace-nowrap">
                      {event.country || 'XX'}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-300 max-w-[240px] truncate" title={`${event.method} ${event.path}`}>
                      {event.method} {event.path}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-300">{event.score}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          event.verdict === 'BLOCKED'
                            ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                            : event.verdict === 'SUSPICIOUS'
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                              : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20'
                        }`}
                      >
                        {event.verdict}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-400 max-w-[260px]">
                      <span className="break-words">{event.reasons.join(', ') || '—'}</span>
                    </td>
                    <td className="py-2">
                      {blockedSet.has(event.ip) ? (
                        <button
                          onClick={() => void handleBlockIp(event.ip, 'unblock')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-[10px] font-bold hover:bg-emerald-500/25 transition"
                        >
                          <Unlock className="w-3 h-3" /> Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => void handleBlockIp(event.ip, 'block')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-200 text-[10px] font-bold hover:bg-rose-500/25 transition"
                        >
                          <Ban className="w-3 h-3" /> Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </LocalizedTree>
  );
};

const MiniList: React.FC<{ title: string; items: { key: string; count: number }[]; language?: AppLanguage }> = ({ title, items, language = 'EN' }) => (
  <LocalizedTree language={language}>
  <div className="rounded-2xl border border-white/10 bg-[#0A1020]/80 p-4">
    <p className="text-xs font-bold text-slate-300 mb-2">{title}</p>
    {items.length === 0 && <p className="text-[11px] text-slate-500">No data yet.</p>}
    <ul className="space-y-1">
      {items.slice(0, 6).map(item => (
        <li key={item.key} className="flex items-center justify-between gap-3 text-[11px]">
          <span className="font-mono text-slate-400 truncate" title={item.key}>
            {item.key}
          </span>
          <span className="font-mono text-cyan-300 font-bold">{item.count}</span>
        </li>
      ))}
    </ul>
  </div>
  </LocalizedTree>
);

export default AdminSecurityPanel;
