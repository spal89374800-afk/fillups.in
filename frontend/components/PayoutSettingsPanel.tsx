import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, LockKeyhole, QrCode, ShieldCheck } from 'lucide-react';
import { LocalizedTree, type AppLanguage } from '../localization';
import { fetchWithRetry, parseJsonResponse } from '../services/apiClient';

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
  const t = (en: string, hi: string) => (language === 'HI' ? hi : en);
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
    fetchWithRetry('/api/payments/profile')
      .then(async response => {
        const data = await parseJsonResponse(response);
        if (!response.ok || !data.success) throw new Error(data.error || t('Could not load payout profile.', 'भुगतान प्रोफ़ाइल लोड नहीं हो सकी।'));
        if (!cancelled && data.profile) {
          setProfile(data.profile);
        }
      })
      .catch(loadError => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : t('Could not load payout profile.', 'भुगतान प्रोफ़ाइल लोड नहीं हो सकी।'));
      });
    return () => { cancelled = true; };
  }, [role, phone, email]);

  const sendOtp = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await fetchWithRetry('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'both', target: phone, emailTarget: email, role })
      });
      const data = await parseJsonResponse(response);
      if (!response.ok || !data.success) throw new Error(data.error || t('Could not send verification code.', 'सत्यापन कोड नहीं भेजा जा सका।'));
      setOtpSent(true);
      setVerificationToken('');
      setOtpCode('');
      setMessage(data.message || t('Verification code sent.', 'सत्यापन कोड भेज दिया गया है।'));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : t('Could not send verification code.', 'सत्यापन कोड नहीं भेजा जा सका।'));
    } finally {
      setLoading(false);
    }
  };

  const verifyAndSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!upiId.trim()) {
      setError(t('Please enter your UPI ID.', 'कृपया अपनी UPI आईडी दर्ज करें।'));
      return;
    }
    setLoading(true);
    try {
      let token = verificationToken;
      if (!token) {
        const verifyResponse = await fetchWithRetry('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: phone, code: otpCode })
        });
        const verifyData = await parseJsonResponse(verifyResponse);
        if (!verifyResponse.ok || !verifyData.verified || !verifyData.verificationToken) {
          throw new Error(verifyData.error || t('OTP could not be verified. Please check and try again.', 'OTP सत्यापित नहीं हुआ। कृपया जाँचकर दोबारा प्रयास करें।'));
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
      const saveData = await parseJsonResponse(saveResponse);
      if (!saveResponse.ok || !saveData.success) throw new Error(saveData.error || t('Could not save payout details.', 'भुगतान विवरण सहेजे नहीं जा सके।'));
      setProfile(saveData.profile);
      setOtpCode('');
      setVerificationToken('');
      setOtpSent(false);
      setUpiId('');
      setMessage(saveData.message || t('UPI ID saved.', 'UPI आईडी सेव हो गई।'));
    } catch (saveError) {
      setVerificationToken('');
      setError(saveError instanceof Error ? saveError.message : t('Could not save payout details.', 'भुगतान विवरण सहेजे नहीं जा सके।'));
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
            <h2 className="text-xl font-black text-white sm:text-2xl">{t('UPI ID & Payments', 'UPI आईडी और भुगतान')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('Add your UPI ID. It will be saved after OTP verification on your registered mobile number.', 'अपनी UPI आईडी जोड़ें। पंजीकृत मोबाइल नंबर पर OTP सत्यापन के बाद यह सेव होगी।')}</p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p><b>{t('UPI ID only.', 'केवल UPI आईडी।')}</b> {t('Bank account details are not collected here. This UPI ID is used as the recipient for your Govt Fee and Operator Share QR codes. After the citizen approves proof, 3 QRs are shown: Govt Fee (your UPI), Admin Fee (platform UPI), and Operator Share (your UPI). Each QR is confirmed by the owner’s right-tick.', 'यहाँ बैंक खाते का विवरण नहीं लिया जाता। यह UPI आईडी आपके सरकारी शुल्क और ऑपरेटर शेयर QR कोड के प्राप्तकर्ता के रूप में उपयोग होगी। नागरिक द्वारा प्रमाण स्वीकृत होने के बाद 3 QR मिलते हैं: सरकारी शुल्क (आपकी UPI), एडमिन शुल्क (प्लेटफ़ॉर्म UPI), और ऑपरेटर शेयर (आपकी UPI)। हर QR उसके मालिक के राइट-टिक से पुष्टि होता है।')}</p>
        </div>

        {profile && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{t('UPI ID saved. Details are hidden; enter a new UPI ID to replace it.', 'UPI आईडी सेव हो गई। विवरण छिपा है; बदलने के लिए नई UPI आईडी दर्ज करें।')}</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={verifyAndSave} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-extrabold text-white">{t('Add UPI ID', 'UPI आईडी जोड़ें')}</h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">{t('Only a UPI ID is required for payout. Your registered mobile number will be used; bank account, IFSC, or account number is not needed.', 'भुगतान के लिए केवल UPI आईडी चाहिए। आपका पंजीकृत मोबाइल नंबर उपयोग होगा; बैंक खाता, IFSC या खाता संख्या की ज़रूरत नहीं है।')}</p>
          <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
            <span>{t('Registered mobile number', 'पंजीकृत मोबाइल नंबर')}</span>
            <input className={`${inputClass} text-slate-400`} value={phone} readOnly aria-readonly="true" />
          </label>
          <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
            <span>{t('UPI ID (VPA)', 'UPI आईडी (VPA)')}</span>
            <input className={inputClass} value={upiId} onChange={event => setUpiId(event.target.value.slice(0, 80))} autoComplete="off" placeholder={profile?.hasUpiId ? t('Enter new UPI ID to replace', 'बदलने के लिए नई UPI आईडी दर्ज करें') : 'name@bank'} required />
          </label>

          {otpSent && (
            <div className="space-y-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">
                <span>{t('OTP code', 'OTP कोड')}</span>
                <input className={inputClass} value={otpCode} onChange={event => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="one-time-code" maxLength={4} required />
              </label>
              <p className="text-[11px] text-slate-400">{t('OTP will be sent to your registered email and WhatsApp number; SMS OTP is not enabled.', 'OTP आपके पंजीकृत ईमेल और WhatsApp नंबर पर भेजा जाएगा; SMS OTP सक्षम नहीं है।')}</p>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-200">{message}</p>}

          {otpSent ? (
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60">
              <LockKeyhole className="h-4 w-4" />{loading ? t('Verifying & saving…', 'सत्यापित करके सहेजा जा रहा है…') : t('Verify OTP & Save UPI ID', 'OTP सत्यापित करें और UPI आईडी सेव करें')}
            </button>
          ) : (
            <button type="button" onClick={sendOtp} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60">
              <ShieldCheck className="h-4 w-4" />{loading ? t('Sending OTP…', 'OTP भेजा जा रहा है…') : t('Send OTP to Verify Mobile', 'मोबाइल सत्यापित करने के लिए OTP भेजें')}
            </button>
          )}
          {otpSent && <button type="button" onClick={sendOtp} disabled={loading} className="w-full text-xs font-bold text-slate-400 hover:text-white">{t('Resend OTP', 'OTP दोबारा भेजें')}</button>}
        </form>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <h3 className="font-extrabold text-white">{t('Payment confirmation: manual right-tick', 'भुगतान पुष्टि: मैन्युअल राइट-टिक')}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{t('No payment gateway is connected. Submitting a UTR does not confirm payment. The operator confirms Govt/Operator Share legs with their right-tick; admin verifies the admin fee. The order becomes paid and WhatsApp dispatch unlocks only after all three are confirmed.', 'कोई भुगतान गेटवे कनेक्ट नहीं है। UTR जमा करने से भुगतान पुष्टि नहीं होता। ऑपरेटर सरकारी/ऑपरेटर शेयर को अपने राइट-टिक से पुष्टि करता है; एडमिन शुल्क एडमिन सत्यापित करता है। तीनों पुष्टि होने पर ही ऑर्डर भुगतान पूरा होता है और WhatsApp डिस्पैच अनलॉक होता है।')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </LocalizedTree>
  );
}
