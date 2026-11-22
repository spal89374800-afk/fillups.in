import { ArrowLeft, Mail, ShieldCheck, Clock, MonitorSmartphone, Trash2, FileCheck2, Users, Globe } from 'lucide-react';
import { BrandEmblem3D } from '../BrandEmblem3D';
import { LocalizedTree, type AppLanguage } from '../../localization';

interface AboutUsProps {
  onBack: () => void;
  language?: AppLanguage;
}

const SUPPORT_EMAIL = 'supportfillupo.in@gmail.com';

export default function AboutUs({ onBack, language = 'EN' }: AboutUsProps) {
  const tr = (en: string, hi: string) => (language === 'HI' ? hi : en);

  return (
    <LocalizedTree language={language}>
      <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#0a0f1c] to-[#050810] text-white">
        <header className="sticky top-0 z-50 bg-[#07090E]/95 backdrop-blur-xl border-b border-white/[0.08]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{tr('Back', 'वापस जाएँ')}</span>
              </button>
              <BrandEmblem3D size="sm" layout="row" />
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-6">
              <Globe className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
              {tr('About Us – Fillupo', 'हमारे बारे में – Fillupo')}
            </h1>
            <p className="text-lg text-slate-300 max-w-3xl mx-auto">
              {tr(
                "India's Most Transparent Online Certificate & Form Facilitation Platform — 24/7 Service, Live Call, Live Chat, Live Screen Sharing & Auto-Delete Privacy.",
                'भारत का सबसे पारदर्शी ऑनलाइन प्रमाणपत्र और फॉर्म सुविधा प्लेटफ़ॉर्म — 24/7 सेवा, लाइव कॉल, लाइव चैट, लाइव स्क्रीन शेयरिंग और ऑटो-डिलीट प्राइवेसी।'
              )}
            </p>
          </div>

          <div className="space-y-6">
            <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
              <p className="text-slate-300 leading-relaxed">
                {tr(
                  'Welcome to Fillupo (fillupo.in), a next-generation digital facilitation platform created to make official certificates (such as Income, Caste, Domicile, and Birth/Death certificates) and online form submissions more transparent, fast, and stress-free. Users can submit requests anytime on the platform, and available operators can assist based on their availability. Instead of standing in long queues or worrying about typing mistakes, Fillupo gives you the comfort of verifying your details live—right from your phone or computer—through Live Call, Live Chat, and Live Screen Sharing.',
                  'Fillupo (fillupo.in) में आपका स्वागत है — एक अगली पीढ़ी का डिजिटल सुविधा प्लेटफ़ॉर्म, जो आय, जाति, निवास, जन्म/मृत्यु प्रमाणपत्र जैसे आधिकारिक दस्तावेज़ों और ऑनलाइन फॉर्म सबमिशन को अधिक पारदर्शी, तेज़ और तनाव-मुक्त बनाने के लिए बनाया गया है। उपयोगकर्ता प्लेटफ़ॉर्म पर कभी भी अनुरोध भेज सकते हैं, और उपलब्ध ऑपरेटर अपनी उपलब्धता के अनुसार सहायता कर सकते हैं। लंबी कतारों या टाइपिंग गलती की चिंता के बजाय, Fillupo आपको अपने फोन या कंप्यूटर से ही लाइव कॉल, लाइव चैट और लाइव स्क्रीन शेयरिंग के जरिए विवरण सत्यापित करने की सुविधा देता है।'
                )}
              </p>
            </section>

            <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-cyan-400" />
                {tr('Our Network: Verified Jan Seva Kendra Operators & Form Experts', 'हमारा नेटवर्क: सत्यापित जन सेवा केंद्र ऑपरेटर और फॉर्म एक्सपर्ट')}
              </h2>
              <p className="text-slate-300 leading-relaxed">
                {tr(
                  'Fillupo connects you directly with a trusted network of verified Jan Seva Kendra (CSC) operators and experienced Form Experts. Whether you are applying for a state certificate, exam or scholarship form, or general documentation (for example, PAN card updates or corrections), your application is handled by skilled professionals who process official forms regularly.',
                  'Fillupo आपको सत्यापित जन सेवा केंद्र (CSC) ऑपरेटरों और अनुभवी फॉर्म एक्सपर्ट्स के विश्वसनीय नेटवर्क से सीधे जोड़ता है। चाहे आप राज्य प्रमाणपत्र, परीक्षा/छात्रवृत्ति फॉर्म, या सामान्य दस्तावेज़ी कार्य (जैसे PAN कार्ड अपडेट/सुधार) के लिए आवेदन कर रहे हों, आपका आवेदन ऐसे कुशल पेशेवरों द्वारा संभाला जाता है जो नियमित रूप से आधिकारिक फॉर्म प्रोसेस करते हैं।'
                )}
              </p>
            </section>

            <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                {tr('What Makes Fillupo Truly Different?', 'Fillupo को अलग क्या बनाता है?')}
              </h2>
              <ul className="space-y-4 text-slate-300 leading-relaxed">
                <li className="flex gap-3"><Clock className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" /><span><strong className="text-white">{tr('24/7 Platform Availability:', '24/7 प्लेटफ़ॉर्म उपलब्धता:')}</strong> {tr('Submit your request anytime, day or night. The platform stays active 24 hours, 7 days a week, and available operators can assist you as per their availability.', 'दिन या रात कभी भी अपना अनुरोध भेजें। प्लेटफ़ॉर्म 24 घंटे, 7 दिन सक्रिय रहता है, और उपलब्ध ऑपरेटर अपनी उपलब्धता के अनुसार सहायता कर सकते हैं।')}</span></li>
                <li className="flex gap-3"><MonitorSmartphone className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" /><span><strong className="text-white">{tr('Live Call, Live Chat & Real-Time Interaction:', 'लाइव कॉल, लाइव चैट और रियल-टाइम इंटरैक्शन:')}</strong> {tr('Talk directly with your assigned operator over live call or live chat while your request is being processed—ask questions, clarify document requirements, and get updates.', 'जब आपका अनुरोध प्रोसेस हो रहा हो, तब असाइन किए गए ऑपरेटर से लाइव कॉल या लाइव चैट पर सीधे बात करें—सवाल पूछें, दस्तावेज़ ज़रूरतें स्पष्ट करें और अपडेट पाएं।')}</span></li>
                <li className="flex gap-3"><MonitorSmartphone className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" /><span><strong className="text-white">{tr('Live Screen Sharing (Watch Your Form Being Filled):', 'लाइव स्क्रीन शेयरिंग (अपना फॉर्म भरते हुए देखें):')}</strong> {tr('See your application being filled live on your screen in real time. Verify spelling, date of birth, and address details before final submission to reduce mistakes.', 'अपना आवेदन रियल-टाइम में स्क्रीन पर भरते हुए देखें। अंतिम सबमिशन से पहले नाम, जन्मतिथि और पता जैसी जानकारी जांचें ताकि गलतियां कम हों।')}</span></li>
                <li className="flex gap-3"><Trash2 className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" /><span><strong className="text-white">{tr('24-Hour Automatic Document Deletion:', '24 घंटे में स्वचालित दस्तावेज़ हटाना:')}</strong> {tr('Your privacy is a priority. Uploaded personal documents (such as Aadhaar, photos, and supporting certificates) are automatically and permanently deleted within 24 hours as per platform policy.', 'आपकी गोपनीयता प्राथमिकता है। अपलोड किए गए व्यक्तिगत दस्तावेज़ (जैसे आधार, फोटो और सहायक प्रमाणपत्र) प्लेटफ़ॉर्म नीति के अनुसार 24 घंटे के भीतर स्वचालित और स्थायी रूप से हटा दिए जाते हैं।')}</span></li>
                <li className="flex gap-3"><Trash2 className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" /><span><strong className="text-white">{tr('7-Day Auto-Delete Chat History:', '7 दिन में चैट हिस्ट्री ऑटो-डिलीट:')}</strong> {tr('Chat conversations between you and the operator are automatically deleted after 7 days, as per platform policy.', 'आप और ऑपरेटर के बीच चैट बातचीत प्लेटफ़ॉर्म नीति के अनुसार 7 दिनों के बाद स्वचालित रूप से हटा दी जाती है।')}</span></li>
                <li className="flex gap-3"><FileCheck2 className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" /><span><strong className="text-white">{tr('Photo Proof Acknowledgment:', 'फोटो प्रूफ पावती:')}</strong> {tr('Once submitted, you receive a photo proof acknowledgment / application receipt for transparency and peace of mind.', 'सबमिट होने के बाद आपको पारदर्शिता और भरोसे के लिए फोटो प्रूफ पावती / आवेदन रसीद मिलती है।')}</span></li>
              </ul>
            </section>

            <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-4">{tr('How Fillupo Works (4 Simple Steps)', 'Fillupo कैसे काम करता है (4 आसान कदम)')}</h2>
              <ol className="space-y-3 text-slate-300 leading-relaxed list-decimal list-inside">
                <li><strong className="text-white">{tr('Select Your Service:', 'सेवा चुनें:')}</strong> {tr('Choose the certificate or online form-filling service you need on fillupo.in.', 'fillupo.in पर अपनी जरूरत की प्रमाणपत्र या ऑनलाइन फॉर्म सेवा चुनें।')}</li>
                <li><strong className="text-white">{tr('Connect with an Expert:', 'एक्सपर्ट से जुड़ें:')}</strong> {tr('Upload required documents and connect via Live Call or Live Chat with an available Jan Seva operator or Form Expert.', 'ज़रूरी दस्तावेज़ अपलोड करें और उपलब्ध जन सेवा ऑपरेटर या फॉर्म एक्सपर्ट से लाइव कॉल/चैट के जरिए जुड़ें।')}</li>
                <li><strong className="text-white">{tr('Watch & Verify Live:', 'लाइव देखें और जांचें:')}</strong> {tr('Watch your form being filled through Live Screen Sharing and verify your details before final submission.', 'लाइव स्क्रीन शेयरिंग के जरिए अपना फॉर्म भरते हुए देखें और अंतिम सबमिशन से पहले विवरण जांचें।')}</li>
                <li><strong className="text-white">{tr('Get Proof & Auto-Privacy:', 'प्रूफ पाएं और ऑटो-प्राइवेसी:')}</strong> {tr('Receive photo proof acknowledgment/receipt. Documents auto-delete in 24 hours and chats auto-delete in 7 days, as per policy.', 'फोटो प्रूफ पावती/रसीद प्राप्त करें। नीति के अनुसार दस्तावेज़ 24 घंटे में और चैट 7 दिनों में स्वतः हट जाते हैं।')}</li>
              </ol>
            </section>

            <section className="bg-amber-500/10 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-amber-300 mb-4">{tr('Important Disclaimer', 'महत्वपूर्ण अस्वीकरण')}</h2>
              <p className="text-slate-200 leading-relaxed">
                {tr(
                  'Fillupo (fillupo.in) is a private online facilitation platform that connects users with independent Jan Seva Kendra (CSC) operators and form-filling experts. Fillupo is not a government website, nor is it owned, operated, or endorsed by any Government Ministry, Department, or e-District authority. We operate strictly as a secure technology platform to make form-filling assistance transparent, interactive, and convenient.',
                  'Fillupo (fillupo.in) एक निजी ऑनलाइन सुविधा प्लेटफ़ॉर्म है जो उपयोगकर्ताओं को स्वतंत्र जन सेवा केंद्र (CSC) ऑपरेटरों और फॉर्म-भरने वाले विशेषज्ञों से जोड़ता है। Fillupo कोई सरकारी वेबसाइट नहीं है, और न ही यह किसी सरकारी मंत्रालय, विभाग या ई-डिस्ट्रिक्ट प्राधिकरण द्वारा स्वामित्व, संचालित या समर्थित है। हम फॉर्म-भरने में सहायता को पारदर्शी, इंटरैक्टिव और सुविधाजनक बनाने के लिए एक सुरक्षित तकनीकी प्लेटफ़ॉर्म के रूप में काम करते हैं।'
                )}
              </p>
            </section>

            <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <Mail className="w-5 h-5 text-cyan-400" />
                {tr('Contact Us', 'संपर्क करें')}
              </h2>
              <p className="text-slate-300 mb-4">{tr('Have a question or need help getting started? Our team is here to assist you:', 'कोई सवाल है या शुरू करने में मदद चाहिए? हमारी टीम आपकी सहायता के लिए है:')}</p>
              <ul className="space-y-3 text-slate-300">
                <li><span className="text-white font-semibold">{tr('Website:', 'वेबसाइट:')} </span><a href="https://fillupo.in" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200 underline">https://fillupo.in</a></li>
                <li><span className="text-white font-semibold">{tr('Support Email:', 'सपोर्ट ईमेल:')} </span><a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan-300 hover:text-cyan-200 underline">{SUPPORT_EMAIL}</a></li>
                <li><span className="text-white font-semibold">{tr('Service & Platform Availability:', 'सेवा और प्लेटफ़ॉर्म उपलब्धता:')} </span>{tr('24 Hours, 7 Days a Week (24/7)', '24 घंटे, 7 दिन (24/7)')}</li>
                <li><span className="text-white font-semibold">{tr('Location:', 'स्थान:')} </span>{tr('Lucknow, Uttar Pradesh – India', 'लखनऊ, उत्तर प्रदेश – भारत')}</li>
              </ul>
            </section>
          </div>
        </main>
      </div>
    </LocalizedTree>
  );
}
