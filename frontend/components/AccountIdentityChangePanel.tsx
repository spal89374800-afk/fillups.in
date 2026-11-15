import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Lock, Mail, Phone, ShieldCheck } from 'lucide-react';
import type { AppLanguage } from '../localization';
import { fetchWithRetry, parseJsonResponse } from '../services/apiClient';
import { getCaptchaToken } from '../services/turnstile';

type OperatorRole = 'vle' | 'filler';

interface AccountIdentityChangePanelProps {
  role: OperatorRole;
  phone: string;
  email: string;
  language?: AppLanguage;
  /** Identity change hone par parent ko naye values do. */
  onChanged?: (phone: string, email: string) => void;
}

interface SecurityStatus {
  pinSet: boolean;
  locked: boolean;
  lockRemainingMs: number;
  lockedUntil: string | null;
  failedAttempts: number;
  attemptsRemaining: number;
}

function formatLockTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function AccountIdentityChangePanel({ role, phone, email, language = 'EN', onChanged }: AccountIdentityChangePanelProps) {
  const t = (en: string, hi: string) => (language === 'HI' ? hi : en);
  const [open, setOpen] = useState(false);
  const [security, setSecurity] = useState<SecurityStatus | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [pin, setPin] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchWithRetry('/api/account/security')
      .then(async response => {
        const data = await parseJsonResponse(response);
        if (!cancelled && response.ok && data.success) setSecurity(data.security);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [phone, email]);

  const emailChanged = newEmail.trim().toLowerCase() !== '' && newEmail.trim().toLowerCase() !== email.trim().toLowerCase();
  const phoneChanged = newPhone.replace(/\D/g, '').slice(-10) !== '' && newPhone.replace(/\D/g, '').slice(-10) !== phone.replace(/\D/g, '').slice(-10);
  const weakPinPattern = (value: string) => {
    if (!/^\d{6}$/.test(value)) return true;
    const digits = value.split('').map(Number);
    if (digits.every(d => d === digits[0])) return true;
    if (digits.every((d, i) => i === 0 || d === digits[i - 1] + 1)) return true;
    if (digits.every((d, i) => i === 0 || d === digits[i - 1] - 1)) return true;
    return /^(\d{2})\1{2}$/.test(value) || /^(\d{3})\1$/.test(value) || /^(\d)\1(\d)\2(\d)\3$/.test(value);
  };

  const sendOtp = async () => {
    setError('');
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim().toLowerCase())) {
      setError(t('Enter a valid new Gmail/email address first.', 'पहले नया Gmail/ईमेल सही दर्ज करें।'));
      return;
    }
    setSendingOtp(true);
    try {
      const captchaToken = await getCaptchaToken();
      const response = await fetchWithRetry('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'both',
          target: phone,
          emailTarget: newEmail.trim().toLowerCase(),
          role,
          captchaToken
        })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || t('Could not send OTP.', 'OTP नहीं भेजा जा सका।'));
      setOtpToken('');
      setOtpCode('');
      setNotice(data.message || t('OTP sent to the new Gmail.', 'नए Gmail पर OTP भेज दिया गया है।'));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : t('Could not send OTP.', 'OTP नहीं भेजा जा सका।'));
    } finally {
      setSendingOtp(false);
    }
  };

  const submitIdentityChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!emailChanged && !phoneChanged) {
      setError(t('Enter a new Gmail or mobile number.', 'नया Gmail या मोबाइल नंबर दर्ज करें।'));
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError(t('Enter your 6-digit security PIN.', '6 अंकों का सुरक्षा PIN दर्ज करें।'));
      return;
    }
    setBusy(true);
    try {
      // Nayi Gmail ke liye OTP verify karo (agar abhi token nahi hai).
      let token = otpToken;
      if (emailChanged && !token) {
        const verifyResponse = await fetchWithRetry('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: phone, code: otpCode })
        });
        const verifyData = await parseJsonResponse(verifyResponse);
        if (!verifyResponse.ok || !verifyData.verified || !verifyData.verificationToken) {
          throw new Error(verifyData.error || t('OTP verify nahi hua. Check the code and try again.', 'OTP सत्यापित नहीं हुआ। कोड जाँचकर दोबारा प्रयास करें।'));
        }
        token = String(verifyData.verificationToken);
        setOtpToken(token);
      }

      const response = await fetchWithRetry('/api/account/identity/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          newEmail: emailChanged ? newEmail.trim().toLowerCase() : undefined,
          newPhone: phoneChanged ? newPhone.replace(/\D/g, '').slice(-10) : undefined,
          otpToken: token || undefined
        })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || t('Identity change failed.', 'पहचान बदलने में विफल।'));
      const savedEmail = String(data.email || email).trim().toLowerCase();
      const savedPhone = String(data.phone || phone).replace(/\D/g, '').slice(-10);
      setNotice(data.message || t('Login identity updated.', 'लॉगिन पहचान अपडेट हो गई।'));
      setSecurity(data.security || null);
      setPin('');
      setNewEmail('');
      setNewPhone('');
      setOtpCode('');
      setOtpToken('');
      onChanged?.(savedPhone, savedEmail);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : t('Identity change failed.', 'पहचान बदलने में विफल।'));
    } finally {
      setBusy(false);
    }
  };

  const submitPinChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(nextPin)) {
      setError(t('Both PINs must be 6 digits.', 'दोनों PIN 6 अंकों के होने चाहिए।'));
      return;
    }
    if (nextPin !== confirmPin) {
      setError(t('New PIN and confirm PIN do not match.', 'नया PIN और कन्फर्म PIN मेल नहीं खाते।'));
      return;
    }
    if (weakPinPattern(nextPin)) {
      setError(t('That new PIN is too easy to guess. Choose a different 6-digit PIN.', 'यह नया PIN बहुत आसान है। कोई अलग 6 अंकों का PIN चुनें।'));
      return;
    }
    setBusy(true);
    try {
      const response = await fetchWithRetry('/api/account/pin/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin: nextPin })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || t('PIN change failed.', 'PIN बदलने में विफल।'));
      setNotice(data.message || t('Security PIN changed.', 'सुरक्षा PIN बदल गया।'));
      setSecurity(data.security || null);
      setCurrentPin('');
      setNextPin('');
      setConfirmPin('');
    } catch (pinError) {
      setError(pinError instanceof Error ? pinError.message : t('PIN change failed.', 'PIN बदलने में विफल।'));
    } finally {
      setBusy(false);
    }
  };

  const lockLabel = security?.locked
    ? t(`PIN locked until ${formatLockTime(security.lockedUntil)}.`, `PIN ${formatLockTime(security.lockedUntil)} तक लॉक है।`)
    : '';

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3.5 space-y-3">
      <button
        type="button"
        onClick={() => {
          setOpen(value => !value);
          setError('');
          setNotice('');
        }}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 text-xs font-black text-slate-200">
          <KeyRound className="w-4 h-4 text-cyan-400" />
          {t('Change Gmail / Mobile (Security PIN)', 'Gmail / मोबाइल बदलें (सुरक्षा PIN)')}
        </span>
        <span className="text-[11px] font-bold text-cyan-300">{open ? t('Hide', 'छिपाएं') : t('Open', 'खोलें')}</span>
      </button>

      {open && (
        <div className="space-y-3">
          {security && !security.pinSet && (
            <p className="flex items-start gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span>{t('This account has no security PIN, so Gmail/mobile change is locked. Create a new account or ask admin/support.', 'इस खाते में सुरक्षा PIN नहीं है, इसलिए Gmail/मोबाइल बदलाव लॉक है। नया खाता बनाएं या एडमिन/सपोर्ट से संपर्क करें।')}</span>
            </p>
          )}
          {security?.locked && (
            <p className="flex items-start gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
              <span>{lockLabel}</span>
            </p>
          )}

          {security?.pinSet && !security.locked && (
            <>
              <form onSubmit={submitIdentityChange} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      {t('New Gmail (optional)', 'नया Gmail (वैकल्पिक)')}
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={event => setNewEmail(event.target.value.slice(0, 80))}
                      placeholder={email || 'name@gmail.com'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      {t('New mobile (optional)', 'नया मोबाइल (वैकल्पिक)')}
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={newPhone}
                      onChange={event => setNewPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder={phone || '9876543210'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {emailChanged && (
                  <div className="rounded-xl border border-slate-700/80 bg-slate-950/70 p-2.5 space-y-2">
                    <p className="text-[11px] text-slate-400">{t('Verify the new Gmail before saving.', 'सेव करने से पहले नया Gmail सत्यापित करें।')}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={otpCode}
                        onChange={event => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="4-digit OTP"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs text-center tracking-[0.3em]"
                      />
                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={sendingOtp}
                        className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                      >
                        {sendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        {otpToken ? t('Resend OTP', 'OTP फिर भेजें') : t('Send OTP', 'OTP भेजें')}
                      </button>
                    </div>
                    {otpToken && (
                      <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('OTP verified.', 'OTP सत्यापित हो गया।')}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    {t('Security PIN (6 digits)', 'सुरक्षा PIN (6 अंक)')}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm text-center tracking-[0.4em] focus:border-amber-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy || (!emailChanged && !phoneChanged)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {t('Save new Gmail / Mobile', 'नया Gmail / मोबाइल सेव करें')}
                </button>
              </form>

              <div className="border-t border-slate-700/70 pt-3">
                <form onSubmit={submitPinChange} className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                    <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                    {t('Change security PIN', 'सुरक्षा PIN बदलें')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={currentPin}
                      onChange={event => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('Current PIN', 'पुराना PIN')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs text-center tracking-[0.2em]"
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={nextPin}
                      onChange={event => setNextPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('New PIN', 'नया PIN')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs text-center tracking-[0.2em]"
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmPin}
                      onChange={event => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('Confirm PIN', 'PIN दोबारा')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs text-center tracking-[0.2em]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                  >
                    {t('Update PIN', 'PIN अपडेट करें')}
                  </button>
                </form>
              </div>
            </>
          )}

          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300">{error}</p>}
          {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300">{notice}</p>}
        </div>
      )}
    </div>
  );
}
