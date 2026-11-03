import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, Search } from 'lucide-react';
import { fetchPublicServices, PublicService } from '../services/publicCatalogApi';

type Lang = 'en' | 'hi';

interface PublicServicesIndexPageProps {
  lang: Lang;
  initialServices?: PublicService[] | null;
}

const feeText = (service: PublicService) => {
  if (!service.fees.totalMin && !service.fees.totalMax) return '';
  if (service.fees.totalMin === service.fees.totalMax) {
    return `₹${Math.round(service.fees.totalMin).toLocaleString('en-IN')}`;
  }
  return `₹${Math.round(service.fees.totalMin).toLocaleString('en-IN')} – ₹${Math.round(service.fees.totalMax).toLocaleString('en-IN')}`;
};

export function PublicServicesIndexPage({ lang, initialServices }: PublicServicesIndexPageProps) {
  const t = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [services, setServices] = useState<PublicService[]>(initialServices || []);
  const [loading, setLoading] = useState(!initialServices);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'hi'
      ? 'सभी ऑनलाइन सरकारी सेवाएं और दस्तावेज़ | Fillups.in'
      : 'All Online Government Services & Documents | Fillups.in';
  }, [lang]);

  useEffect(() => {
    if (initialServices && initialServices.length > 0) return;
    let cancelled = false;
    setLoading(true);
    fetchPublicServices()
      .then(result => {
        if (!cancelled) {
          setServices(result);
          setError('');
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load services.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialServices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(service =>
      service.name.toLowerCase().includes(q) ||
      service.slug.includes(q) ||
      service.requirements.some(item => item.toLowerCase().includes(q))
    );
  }, [services, query]);

  const switchLanguage = () => {
    const next = lang === 'hi' ? 'en' : 'hi';
    try {
      localStorage.setItem('app_lang', next === 'hi' ? 'HI' : 'EN');
    } catch {}
    window.location.href = next === 'hi' ? '/hi/services' : '/services';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <a href="/" className="text-lg sm:text-xl font-black tracking-tight">
            Fillups<span className="text-amber-400">.in</span>
          </a>
          <nav className="flex items-center gap-2 text-sm font-bold">
            <a href="/" className="text-slate-300 hover:text-white px-2 py-1.5">{t('Home', 'होम')}</a>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 sm:p-8 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">
            {t('Verified Jan Seva Kendra network', 'सत्यापित जन सेवा केंद्र नेटवर्क')}
          </p>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            {t('All Online Government Services & Documents', 'सभी ऑनलाइन सरकारी सेवाएं और दस्तावेज़')}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            {t(
              'Apply online for PAN card, domicile, income, caste, ration card, Ayushman, driving licence and other government documents through verified operators.',
              'पैन कार्ड, निवास प्रमाण, आय प्रमाण, जाति प्रमाण, राशन कार्ड, आयुष्मान, ड्राइविंग लाइसेंस और अन्य सरकारी दस्तावेज़ों के लिए सत्यापित ऑपरेटर के माध्यम से ऑनलाइन आवेदन करें।'
            )}
          </p>
        </section>

        <section className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-amber-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t('Search PAN card, domicile, ration card…', 'पैन कार्ड, निवास, राशन कार्ड खोजें…')}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 text-sm text-white placeholder:text-slate-500 outline-none"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-amber-400 font-bold text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('Loading services…', 'सेवाएं लोड हो रही हैं…')}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              {t('No service found for this search.', 'इस खोज के लिए कोई सेवा नहीं मिली।')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(service => (
                <a
                  key={service.slug}
                  href={lang === 'hi' ? `/hi/services/${service.slug}` : `/services/${service.slug}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-amber-500/50 hover:bg-slate-900 p-4 flex items-start gap-3 transition-all"
                >
                  <span className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-xl shrink-0">
                    {service.icon || '📄'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                      {service.name}
                    </strong>
                    <span className="block text-[11px] text-slate-400 mt-1">
                      {service.scope === 'online_form'
                        ? t('Online form', 'ऑनलाइन फॉर्म')
                        : service.scope === 'district'
                          ? t('City / district level', 'शहर / जिला स्तर')
                          : t('All India', 'पूरे भारत')}
                      {feeText(service) ? ` · ${feeText(service)}` : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 mt-2">
                      {t('View details', 'विवरण देखें')}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </span>
                </a>
              ))}
            </div>
          )}
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

export default PublicServicesIndexPage;
