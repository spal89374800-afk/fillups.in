import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { fetchPublicService, PublicService } from '../services/publicCatalogApi';
import { applyUrlLanguage, fromUrlLanguage, storeLanguage } from '../language';

type Lang = 'en' | 'hi';

interface PublicServicePageProps {
  slug: string;
  lang: Lang;
  initialService?: PublicService | null;
}

const money = (value: number) =>
  `₹${Math.max(0, Math.round(value)).toLocaleString('en-IN')}`;

const feeRange = (service: PublicService) => {
  if (!service.fees.totalMin && !service.fees.totalMax) return null;
  if (service.fees.totalMin === service.fees.totalMax) return money(service.fees.totalMin);
  return `${money(service.fees.totalMin)} – ${money(service.fees.totalMax)}`;
};

export function PublicServicePage({ slug, lang, initialService }: PublicServicePageProps) {
  const [service, setService] = useState<PublicService | null>(initialService || null);
  const [loading, setLoading] = useState(!initialService);
  const [error, setError] = useState('');

  const t = (en: string, hi: string) => (lang === 'hi' ? hi : en);

  useEffect(() => {
    applyUrlLanguage(lang);
    document.title = service
      ? `${service.name} ${lang === 'hi' ? 'ऑनलाइन आवेदन' : 'Apply Online'} | Fillups.in`
      : 'Fillups.in';
  }, [lang, service]);

  useEffect(() => {
    if (initialService) return;
    let cancelled = false;
    setLoading(true);
    fetchPublicService(slug)
      .then(result => {
        if (!cancelled) {
          setService(result);
          setError('');
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Service not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, initialService]);

  const applyUrl = useMemo(() => {
    if (!service) return '/';
    return `/?service=${encodeURIComponent(service.slug)}&apply=1&name=${encodeURIComponent(service.name)}&scope=${encodeURIComponent(service.scope)}`;
  }, [service]);

  const handleApply = () => {
    storeLanguage(fromUrlLanguage(lang));
    window.location.href = applyUrl;
  };

  const switchLanguage = () => {
    const next = lang === 'hi' ? 'en' : 'hi';
    storeLanguage(fromUrlLanguage(next));
    window.location.href = next === 'hi'
      ? `/hi/services/${encodeURIComponent(slug)}`
      : `/services/${encodeURIComponent(slug)}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-amber-400 font-bold">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('Loading service…', 'सेवा लोड हो रही है…')}</span>
        </div>
      </main>
    );
  }

  if (error || !service) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center space-y-4">
          <FileText className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black">{t('Service not found', 'सेवा नहीं मिली')}</h1>
          <p className="text-sm text-slate-400">
            {error || t('This service is not available right now.', 'यह सेवा अभी उपलब्ध नहीं है।')}
          </p>
          <a
            href="/services"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
          >
            {t('Browse all services', 'सभी सेवाएं देखें')}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
    );
  }

  const totalFee = feeRange(service);
  const govtFee = service.fees.govtFeeMin
    ? `${money(service.fees.govtFeeMin)}${service.fees.govtFeeMax && service.fees.govtFeeMax !== service.fees.govtFeeMin ? ` – ${money(service.fees.govtFeeMax)}` : ''}`
    : t('Included / state dependent', 'राज्य के अनुसार');
  const serviceFee = service.fees.serviceFeeMin
    ? `${money(service.fees.serviceFeeMin)}${service.fees.serviceFeeMax && service.fees.serviceFeeMax !== service.fees.serviceFeeMin ? ` – ${money(service.fees.serviceFeeMax)}` : ''}`
    : t('Confirmed by operator', 'ऑपरेटर द्वारा पुष्टि');
  const scopeText = service.scope === 'online_form'
    ? t('Online form · Jan Seva + Form Experts', 'ऑनलाइन फॉर्म · जन सेवा + फॉर्म विशेषज्ञ')
    : service.scope === 'district'
      ? t('City / district level service', 'शहर / जिला स्तर की सेवा')
      : t('Available across India', 'पूरे भारत में उपलब्ध');
  const requirements = service.requirements.length > 0
    ? service.requirements
    : [
        t('Aadhaar Card', 'आधार कार्ड'),
        t('Passport size photo', 'पासपोर्ट साइज़ फोटो'),
        t('Mobile number', 'मोबाइल नंबर'),
        t('Supporting documents', 'संबंधित दस्तावेज़')
      ];
  const steps = [
    t('Login and confirm your city / district', 'लॉगिन करें और अपना शहर / जिला चुनें'),
    t('Upload documents and fill the application details', 'दस्तावेज़ अपलोड करें और आवेदन विवरण भरें'),
    t('A verified operator accepts and processes the request', 'सत्यापित ऑपरेटर अनुरोध स्वीकार करता है'),
    t('Track the status from your dashboard', 'डैशबोर्ड से स्थिति ट्रैक करें')
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <a href="/" className="text-lg sm:text-xl font-black tracking-tight">
            Fillups<span className="text-amber-400">.in</span>
          </a>
          <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-bold">
            <a href="/services" className="text-slate-300 hover:text-white px-2 py-1.5">
              {t('All services', 'सभी सेवाएं')}
            </a>
            <button
              type="button"
              onClick={switchLanguage}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:border-amber-500/60 text-slate-200"
            >
              {lang === 'hi' ? 'English' : 'हिंदी'}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
        <nav className="flex items-center gap-2 text-xs text-slate-500 flex-wrap" aria-label="Breadcrumb">
          <a href="/" className="hover:text-amber-400">{t('Home', 'होम')}</a>
          <span>›</span>
          <a href="/services" className="hover:text-amber-400">{t('Services', 'सेवाएं')}</a>
          <span>›</span>
          <span className="text-slate-300">{service.name}</span>
        </nav>

        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-5 sm:p-8 shadow-2xl">
          <div className="absolute -top-24 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl sm:text-4xl shrink-0">
                {service.icon || '📄'}
              </div>
              <div className="min-w-0 space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  {scopeText}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  {service.name} {t('Apply Online', 'ऑनलाइन आवेदन')}
                </h1>
              </div>
            </div>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {lang === 'hi'
                ? `${service.name} के लिए सत्यापित जन सेवा केंद्र के माध्यम से आवेदन करें। सरकारी शुल्क, ज़रूरी दस्तावेज़ और पूरी प्रक्रिया एक ही जगह देखें।`
                : `Apply for ${service.name} through a verified Jan Seva Kendra. Check the government fee, required documents and the complete process in one place.`}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-2 px-5 sm:px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-900/30 transition-all active:scale-95"
              >
                {t('Apply Online', 'ऑनलाइन आवेदन करें')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="px-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-950/70">
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Total fee', 'कुल शुल्क')}</span>
                <span className="text-lg font-black text-white">{totalFee || t('On request', 'ऑन रिक्वेस्ट')}</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl border border-slate-800 bg-slate-950/50 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">{t('Login required to submit', 'अनुरोध भेजने के लिए लॉगिन')}</span>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500">
              {t(
                'You will return to this same page after login, with this service pre-selected.',
                'लॉगिन के बाद आप उसी पेज पर वापस आएंगे और यह सेवा पहले से चुनी हुई होगी।'
              )}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4">
            <Users className="w-4 h-4 text-amber-400 mb-2" />
            <div className="text-xl sm:text-2xl font-black">{service.operatorCount}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{t('Verified operators', 'सत्यापित ऑपरेटर')}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4">
            <MapPin className="w-4 h-4 text-sky-400 mb-2" />
            <div className="text-xl sm:text-2xl font-black">{service.cities.length || '—'}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{t('Cities covered', 'शहर कवर')}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-2" />
            <div className="text-xl sm:text-2xl font-black">{service.requirements.length || 4}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{t('Documents needed', 'ज़रूरी दस्तावेज़')}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4">
            <BadgeCheck className="w-4 h-4 text-violet-400 mb-2" />
            <div className="text-xl sm:text-2xl font-black">{t('Secure', 'सुरक्षित')}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">{t('Login protected request', 'लॉगिन सुरक्षित अनुरोध')}</div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              {t('Fee details', 'शुल्क विवरण')}
            </h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-800">
                <span className="text-slate-400">{t('Total fee', 'कुल शुल्क')}</span>
                <span className="font-black text-white">{totalFee || t('On request', 'ऑन रिक्वेस्ट')}</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-800">
                <span className="text-slate-400">{t('Government fee', 'सरकारी शुल्क')}</span>
                <span className="font-bold text-slate-200">{govtFee}</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-slate-400">{t('Operator service fee', 'ऑपरेटर सेवा शुल्क')}</span>
                <span className="font-bold text-slate-200">{serviceFee}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {t(
                'The exact fee can vary by state, applicant category and the operator you choose. It is confirmed before you pay.',
                'सटीक शुल्क राज्य, आवेदक श्रेणी और चुने गए ऑपरेटर के अनुसार बदल सकता है। भुगतान से पहले इसकी पुष्टि की जाती है।'
              )}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {t('Required documents', 'ज़रूरी दस्तावेज़')}
            </h2>
            <ul className="space-y-2">
              {requirements.map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[9px] text-emerald-400 font-black shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-black">{t('Application process', 'आवेदन प्रक्रिया')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center justify-center mb-3">
                  {index + 1}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              {t('Available operators', 'उपलब्ध ऑपरेटर')}
            </h2>
            <span className="text-[11px] text-slate-500">
              {t('Your city operators appear first after login', 'लॉगिन के बाद आपके शहर के ऑपरेटर पहले दिखेंगे')}
            </span>
          </div>
          {service.operators.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {service.operators.slice(0, 6).map(operator => (
                <div key={`${operator.role}-${operator.id}-${operator.city}`} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white truncate">{operator.name}</h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[operator.city, operator.district, operator.state].filter(Boolean).join(', ') || t('India', 'भारत')}
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[9px] font-black uppercase">
                      {operator.role === 'filler' ? t('Form expert', 'फॉर्म विशेषज्ञ') : t('Jan Seva', 'जन सेवा')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {t('Verified operator', 'सत्यापित ऑपरेटर')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {t(
                'Operator availability for this service is confirmed after login.',
                'इस सेवा के लिए ऑपरेटर की उपलब्धता लॉगिन के बाद पुष्टि की जाती है।'
              )}
            </p>
          )}
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all active:scale-95"
          >
            {t('Login & send request', 'लॉगिन करें और अनुरोध भेजें')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-2">
          <h2 className="text-lg font-black mb-2">{t('Frequently asked questions', 'अक्सर पूछे जाने वाले प्रश्न')}</h2>
          {service.faqs.map(faq => (
            <details key={faq.q} className="group border-b border-slate-800 py-3 last:border-b-0">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-3 text-sm font-bold text-slate-200">
                <span>{lang === 'hi' ? faq.qHi : faq.q}</span>
                <span className="text-amber-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
              </summary>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-400 leading-relaxed">
                {lang === 'hi' ? faq.aHi : faq.a}
              </p>
            </details>
          ))}
        </section>

        <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/12 via-slate-900 to-slate-950 p-6 sm:p-8 space-y-3">
          <h2 className="text-xl sm:text-2xl font-black">{t('Start your application', 'अभी आवेदन शुरू करें')}</h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            {t(
              'Login with your mobile number and email, confirm your city and send the request to a verified operator. You will return to this page after login.',
              'मोबाइल नंबर और ईमेल से लॉगिन करें, अपना शहर चुनें और सत्यापित ऑपरेटर को अनुरोध भेजें। लॉगिन के बाद आप इसी पेज पर वापस आएंगे।'
            )}
          </p>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-900/30 transition-all active:scale-95"
          >
            {t('Apply Online', 'ऑनलाइन आवेदन करें')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      <footer className="border-t border-slate-800 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>© {new Date().getFullYear()} Fillups.in</span>
          <span>{t('Online Jan Seva & Cyber Cafe Portal', 'ऑनलाइन जन सेवा एवं साइबर कैफ़े पोर्टल')}</span>
        </div>
      </footer>
    </div>
  );
}

export default PublicServicePage;
