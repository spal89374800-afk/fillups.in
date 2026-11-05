/**
 * Hindi translations for messages that contain dynamic values.
 *
 * Exact-match translations live in `localization.tsx` / `localizationPhase2.ts`.
 * Backend and status messages often interpolate values (for example
 * `Blocked 1.2.3.4.`), so they can never match a static key. Each entry here is
 * an English template with `{0}`, `{1}`, ... placeholders; `translateText`
 * matches it and copies the captured values into the Hindi translation.
 */
export const hindiTemplateTranslations: Record<string, string> = {
  // ----------------------------------------------------------- Admin console
  [`Blocked {0}.`]: `ब्लॉक किया गया {0}।`,
  [`Unblocked {0}.`]: `अनब्लॉक किया गया {0}।`,

  // ------------------------------------------------------ Order notifications
  [`Fee updated to ₹{0}`]: `शुल्क ₹{0} में अपडेट किया गया`,
  [`✅ Order dispatched! {0}`]: `✅ अनुरोध भेज दिया गया! {0}`,
  [`✅ Form request is now open to all {0} Jan Seva operator(s) and all Form Filler experts. Online: in-app notification, Offline: email.`]: `✅ फॉर्म अनुरोध अब सभी {0} जन सेवा ऑपरेटर(ों) और सभी फॉर्म विशेषज्ञों के लिए खुला है। ऑनलाइन: ऐप में सूचना, ऑफ़लाइन: ईमेल।`,
  [`✅ Form request for "{0}" dispatched to all Jan Seva operators and Form Filler experts. Online operators get an instant in-app alert; offline operators get an email.`]: `✅ "{0}" के लिए फॉर्म अनुरोध सभी जन सेवा ऑपरेटरों और फॉर्म विशेषज्ञों को भेज दिया गया। ऑनलाइन ऑपरेटरों को तुरंत ऐप सूचना मिलती है; ऑफ़लाइन ऑपरेटरों को ईमेल जाता है।`,
  [`⚠️ Bid Accepted! This bid was already accepted by {0} ({1}). Please wait for a new bid!`]: `⚠️ बोली स्वीकृत! यह बोली पहले ही {0} ({1}) द्वारा स्वीकार की जा चुकी है। कृपया नई बोली की प्रतीक्षा करें!`,

  // --------------------------------------------------------------- Auth/OTP
  [`Verification code aapke Gmail ({0}) par bheja gaya hai. Phone ke Gmail app me check karein.`]: `सत्यापन कोड आपके Gmail ({0}) पर भेज दिया गया है। फ़ोन के Gmail ऐप में जाँचें।`,

  // -------------------------------------------------------- Workspace status
  [`📁 {0} file(s) attached via drag & drop! Click send to upload.`]: `📁 ड्रैग और ड्रॉप से {0} फ़ाइल(ें) संलग्न! अपलोड करने के लिए भेजें पर क्लिक करें।`,
  [`🔒 {0} document(s) uploaded — auto delete after 24 hours.`]: `🔒 {0} दस्तावेज़ अपलोड हुए — 24 घंटे बाद स्वतः हट जाएँगे।`,
  [`📲 Credentials are ready. Open WhatsApp and tap Send to deliver them to {0}.`]: `📲 जानकारी तैयार है। WhatsApp खोलें और {0} को भेजने के लिए Send पर टैप करें।`,
  [`Application No: {0} | Password: {1}`]: `आवेदन संख्या: {0} | पासवर्ड: {1}`,
  [`Call room join nahi hua: {0}. Page refresh karke dobara try karein.`]: `कॉल रूम से जुड़ाव नहीं हुआ: {0}। पेज रीफ़्रेश करके दोबारा प्रयास करें।`,

  // ------------------------------------------------------------ Admin ledger
  [`Admin payment marked {0}.`]: `एडमिन भुगतान {0} के रूप में चिह्नित किया गया।`,
};

/**
 * Order-dispatch routing notes are composed by the backend and returned both on
 * their own (`order.routingNote`) and prefixed with `✅ Order dispatched!`.
 */
const routingNoteTranslations: Record<string, string> = {
  [`Yeh exam/online form request poore India ke Jan Seva operators aur Form Filler experts ko bheji gayi hai. Online operators ko turant in-app notification, offline ko email.`]: `यह परीक्षा/ऑनलाइन फॉर्म अनुरोध पूरे भारत के जन सेवा ऑपरेटरों और फॉर्म विशेषज्ञों को भेज दिया गया है। ऑनलाइन ऑपरेटरों को तुरंत ऐप सूचना, ऑफ़लाइन को ईमेल।`,
  [`Aapne {0} ko choose kiya hai. Request sirf unhi ko bheji gayi hai.`]: `आपने {0} को चुना है। अनुरोध केवल उन्हीं को भेजा गया है।`,
  [`Aapke chune hue operator {0} abhi offline hain. Unhe email notification bheji gayi hai — online aate hi wo request dekh payenge.`]: `आपके चुने हुए ऑपरेटर {0} अभी ऑफ़लाइन हैं। उन्हें ईमेल सूचना भेज दी गई है — ऑनलाइन आते ही वे अनुरोध देख पाएँगे।`,
  [`Aapke city ({0}) ke online Jan Seva operators ko request bheji gayi hai.`]: `आपके शहर ({0}) के ऑनलाइन जन सेवा ऑपरेटरों को अनुरोध भेज दिया गया है।`,
  [`Aapke city ({0}) me koi operator online nahi hai, isliye request district ke online operators ko bheji gayi hai.`]: `आपके शहर ({0}) में कोई ऑपरेटर ऑनलाइन नहीं है, इसलिए अनुरोध ज़िले के ऑनलाइन ऑपरेटरों को भेज दिया गया है।`,
  [`Aapke city ({0}) me Jan Seva Kendra available nahi hai, isliye request district ke operators ko bheji gayi hai.`]: `आपके शहर ({0}) में जन सेवा केंद्र उपलब्ध नहीं है, इसलिए अनुरोध ज़िले के ऑपरेटरों को भेज दिया गया है।`,
  [`Abhi district me koi operator online nahi hai. Sabhi district operators ko email notification bheji ja rahi hai.`]: `अभी ज़िले में कोई ऑपरेटर ऑनलाइन नहीं है। सभी ज़िला ऑपरेटरों को ईमेल सूचना भेजी जा रही है।`,
  [`Yeh national-scope request all-India ke online Jan Seva operators ko bheji gayi hai.`]: `यह राष्ट्रीय-स्तर का अनुरोध पूरे भारत के ऑनलाइन जन सेवा ऑपरेटरों को भेज दिया गया है।`,
  [`Abhi koi operator online nahi hai. Sabhi eligible operators ko email notification bheji ja rahi hai.`]: `अभी कोई ऑपरेटर ऑनलाइन नहीं है। सभी पात्र ऑपरेटरों को ईमेल सूचना भेजी जा रही है।`,
};

for (const [note, translation] of Object.entries(routingNoteTranslations)) {
  if (!(note in hindiTemplateTranslations)) hindiTemplateTranslations[note] = translation;
  const prefixed = `✅ Order dispatched! ${note}`;
  if (!(prefixed in hindiTemplateTranslations)) {
    hindiTemplateTranslations[prefixed] = `✅ अनुरोध भेज दिया गया! ${translation}`;
  }
}
