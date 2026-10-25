import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, LockKeyhole, QrCode, ShieldCheck } from 'lucide-react';
import { LocalizedTree, type AppLanguage } from '../localization';

type OperatorRole = 'vle' | 'filler';

interface PayoutSettingsPanelProps {
  role: OperatorRole;
  phone: string;
  email: string;
  language?: AppLanguage;
}

interface PayoutProfileSummary {
  hasSavedDetails: boolean;
  hasUpiId: boolean;
  updatedAt: string;
}

export function PayoutSettingsPanel({ role, phone, email, language = 'EN' }: PayoutSettingsPanelProps) {
  const [upiId, setUpiId] = useState('');
  const [profile, setProfile] = useState<PayoutProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phone || !email) return;
    let cancelled = false;
    fetch('/api/payments/profile')
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not load payout profile.');
        if (!cancelled && data.profile) {
          setProfile(data.profile);
        }
      })
      .catch(loadError => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load payout profile.');
      });
    return () => { cancelled = true; };
  }, [role, phone, email]);

  const sendOtp = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'both', target: phone, emailTarget: email, role })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not send verification code.');
      setOtpSent(true);
      setVerificationToken('');
      setOtpCode(data.testOtp || '');
      setMessage(data.message || 'Verification code sent.');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!upiId.trim()) {
      setError('Apna UPI ID enter karein.');
      return;
    }
    setLoading(true);
    try {
      let token = verificationToken;
      if (!token) {
        const verifyResponse = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: phone, code: otpCode })
        });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok || !verifyData.verified || !verifyData.verificationToken) {
          throw new Error(verifyData.error || 'OTP verify nahi hua. Dobara check karke try karein.');
        }
        token = verifyData.verificationToken;
        setVerificationToken(token);
      }

      const saveResponse = await fetch('/api/payments/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          phone,
          email,
          verificationToken: token,
          upiId: upiId.trim()
        })
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok || !saveData.success) throw new Error(saveData.error || 'Could not save payout details.');
      setProfile(saveData.profile);
      setOtpCode('');
      setVerificationToken('');
      setOtpSent(false);
      setUpiId('');
      setMessage(saveData.message);
    } catch (saveError) {
      setVerificationToken('');
      setError(saveError instanceof Error ? saveError.message : 'Could not save payout details.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20';

  return (
    <LocalizedTree language={language}>
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-5 shadow-xl sm:p-8">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-cyan-300"><QrCode className="h-6 w-6" /></div>
          <div>
            <h2 className="text-xl font-black text-white sm:text-2xl">UPI ID &amp; Payments</h2>
            <p className="mt-1 text-sm text-slate-400">Sirf apna UPI ID add karein. Registered mobile number par OTP verification ke baad save hoga.</p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p><b>UPI ID only.</b> Is form mein bank account details nahi li jaati. Yeh UPI ID aapke Govt Fee aur Operator Share QR codes ke recipient ke roop mein use hogi. Citizen proof approve karne ke baad 3 QR milte hain: Govt Fee (aapki UPI), Admin Fee (platform UPI), aur Operator Share (aapki UPI). Har QR ko uske owner ke right-tick se confirm kiya jaata hai.</p>
        </div>

        {profile && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>UPI ID saved. Details are hidden; enter a new UPI ID to replace it.</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={verifyAndSave} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-extrabold text-white">Add UPI ID</h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">Payout ke liye sirf UPI ID chahiye. Mobile number aapke registered account se liya jayega; alag se bank account, IFSC ya account number dene ki zaroorat nahi.</p>
          <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
            <span>Registered mobile number</span>
            <input className={`${inputClass} text-slate-400`} value={phone} readOnly aria-readonly="true" />
          </label>
          <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
            <span>UPI ID (VPA)</span>
            <input className={inputClass} value={upiId} onChange={event => setUpiId(event.target.value.slice(0, 80))} autoComplete="off" placeholder={profile?.hasUpiId ? 'Enter new UPI ID to replace' : 'name@bank'} required />
          </label>

          {otpSent && (
            <div className="space-y-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
                <span>OTP code</span>
                <input className={inputClass} value={otpCode} onChange={event => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="one-time-code" maxLength={4} required />
              </label>
              <p className="text-[11px] text-slate-400">OTP aapke registered email aur WhatsApp number dono par bheja jayega; SMS OTP enabled nahi hai.</p>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-200">{message}</p>}

          {otpSent ? (
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60">
              <LockKeyhole className="h-4 w-4" />{loading ? 'Verifying & saving…' : 'Verify OTP & Save UPI ID'}
            </button>
          ) : (
            <button type="button" onClick={sendOtp} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60">
              <ShieldCheck className="h-4 w-4" />{loading ? 'Sending OTP…' : 'Send OTP to Verify Mobile'}
            </button>
          )}
          {otpSent && <button type="button" onClick={sendOtp} disabled={loading} className="w-full text-xs font-bold text-slate-400 hover:text-white">Resend OTP</button>}
        </form>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <h3 className="font-extrabold text-white">Payment confirmation: manual right-tick</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">No payment gateway is connected. UTR submit karne se payment confirm nahi hota. Operator Govt/Operator Share legs ko apne right-tick se confirm karta hai; admin fee admin verify karta hai. Teeno confirm hone par hi order paid hota hai aur WhatsApp dispatch unlock hota hai.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </LocalizedTree>
  );
}
