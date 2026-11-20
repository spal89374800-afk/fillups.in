import { ArrowLeft, FileText, Shield, CreditCard, Lock, Gavel, AlertCircle, Mail } from 'lucide-react';
import { BrandEmblem3D } from '../BrandEmblem3D';
import { LocalizedTree, type AppLanguage } from '../../localization';

interface PlatformLegalPolicyProps {
  onBack: () => void;
  language?: AppLanguage;
}

const SECTIONS: Array<{ no: number; title: string; points: string[] }> = [
  {
    no: 1,
    title: 'About fillupo.in & Non-Government Disclaimer',
    points: [
      'fillupo.in is a private online digital assistance and facilitator marketplace.',
      'We are NOT a government website and are NOT affiliated, associated, authorized, or endorsed by any Government body, Ministry, or official portal (such as SSC, UPSC, Railway, UIDAI, or State e-District portals).',
      'fillupo.in acts solely as a technology bridge connecting users who need online form-filling/document assistance with independent verified operators.'
    ]
  },
  {
    no: 2,
    title: 'Intermediary Safe Harbour Protection (IT Act Section 79)',
    points: [
      'fillupo.in operates strictly as an online intermediary under Section 2(1)(w) and Section 79 of the Information Technology Act, 2000.',
      'fillupo.in does not create, alter, certify, or guarantee the authenticity of any user-submitted documents or applications. We shall not be held legally liable for any unlawful act, misrepresentation, typing error, or negligence committed by any user or independent operator on the platform.'
    ]
  },
  {
    no: 3,
    title: 'Platform Commission & Transparent Payment Structure',
    points: [
      "fillupo.in charges a flat 17% platform facilitation fee on service charges for connecting users and providing live screen sharing, in-built calling, and chat infrastructure.",
      "All payments are processed transparently via the platform's 3-QR UPI mechanism. fillupo.in does not hold or store government fees in its own account."
    ]
  },
  {
    no: 4,
    title: 'Automatic Data Deletion & Privacy Guarantee',
    points: [
      '24-Hour Document Auto-Deletion: To ensure complete data security, all sensitive documents uploaded on fillupo.in (such as Aadhaar Card, PAN Card, photos, signatures, and certificates) are permanently and automatically deleted from our servers within 24 hours of order completion.',
      '7-Day Chat Auto-Deletion: All in-built chat messages on the platform are automatically deleted after 7 days of order completion.',
      'Zero Data Selling: fillupo.in never sells, rents, or shares user data or mobile numbers with any third-party marketing agencies.'
    ]
  },
  {
    no: 5,
    title: 'Account Termination & Anti-Fraud Rights',
    points: [
      'fillupo.in reserves the absolute right to suspend, blacklist, or permanently block any account, mobile number, or IP address without prior notice if fake documents, fake payment proofs, platform bypass (attempting to deal outside fillupo.in), or abusive behavior is detected.'
    ]
  },
  {
    no: 6,
    title: 'Indemnification & Limitation of Liability',
    points: [
      'Users agree to indemnify and hold harmless fillupo.in and its founders from any legal claims, police complaints, penalties, or losses arising out of misuse of the platform or submission of forged documents.',
      'fillupo.in is not responsible for delays or failures caused by official government portal crashes, server downtime, internet outages, or changes in government rules.'
    ]
  },
  {
    no: 7,
    title: 'Grievance Officer & Legal Jurisdiction',
    points: [
      'In compliance with Indian IT and E-Commerce Rules, any grievance or complaint will be acknowledged within 48 hours and resolved within 30 days.',
      'Any legal disputes arising out of the use of fillupo.in shall be governed by the laws of India and fall under the exclusive jurisdiction of the courts in Lucknow, Uttar Pradesh.'
    ]
  },
  {
    no: 8,
    title: 'Intellectual Property & Acceptable Use Policy',
    points: [
      'Intellectual Property Rights: All website content, brand name (fillupo.in), logos, UI/UX design, software code, and workflow architecture are the exclusive intellectual property of fillupo.in. No user, operator, or third party is permitted to copy, clone, scrape, modify, or commercially exploit any part of the platform without prior written permission.',
      'Acceptable Use & Account Security: Users must keep their login credentials and OTPs confidential. Any attempt to hack, reverse-engineer, spam, upload viruses, or use fillupo.in for any unlawful or fraudulent activity will result in immediate permanent termination and legal prosecution.',
      'Age Eligibility: Services on fillupo.in are intended for individuals aged 18 years and above. Users under 18 may access the platform strictly under the supervision and consent of a parent or legal guardian.',
      'Third-Party Portals Disclaimer: fillupo.in facilitates applications on external government and institutional portals. We have no control over and assume no responsibility for the availability, sudden fee revisions, rule changes, or technical failures of any third-party or government websites.'
    ]
  },
  {
    no: 9,
    title: 'Financial Liability Cap, Electronic Consent & Severability',
    points: [
      'Maximum Financial Liability Cap: Under all circumstances, the maximum cumulative liability of fillupo.in towards any user or operator for any claim, dispute, or service issue shall be strictly limited to the 17% platform facilitation fee actually received by fillupo.in for that specific order. fillupo.in shall never be liable for any indirect, consequential, or speculative damages (such as loss of job opportunity, exam failure, or missed deadlines).',
      'Electronic Consent & Cookies (IT Act Section 10A): By registering via OTP, clicking "I Agree", or using fillupo.in, you provide legally binding electronic consent under Section 10A of the Information Technology Act, 2000. fillupo.in uses strictly necessary session cookies to keep your login, live screen sharing, and order dashboard functioning securely.',
      'Severability: If any provision of these Terms is found to be invalid or unenforceable by a court of law, the remaining provisions shall continue to remain in full force and legal effect.'
    ]
  },
  {
    no: 10,
    title: 'Refund Timeline, Tax Responsibility & Order Availability',
    points: [
      "Refund Timeline & 3-QR Responsibility: In eligible cancellation cases where a refund is approved before form processing begins, the refundable amount will be credited to the user's original UPI/bank source within 5 to 7 working days. Since operator charges (83%) and government fees are transferred directly via separate UPI QRs, fillupo.in is responsible only for refunding its 17% platform facilitation fee where applicable.",
      'Tax & Statutory Compliance: Independent operators (Jan Seva Kendras and students) are solely responsible for reporting their earnings and paying any applicable Income Tax or GST on their 83% service revenue. fillupo.in is accountable only for tax compliance on its 17% platform commission.',
      'No Guarantee of Order Volume: fillupo.in does not guarantee a fixed number of daily or monthly orders to any registered operator. Order allocation depends entirely on real-time citizen demand, location matching, and first-come-first-served acceptance.'
    ]
  }
];

const SECTION_ICONS = [FileText, Shield, CreditCard, Lock, AlertCircle, Gavel, Gavel, Shield, Shield, Shield];

export default function PlatformLegalPolicy({ onBack, language = 'EN' }: PlatformLegalPolicyProps) {
  const tr = (en: string, hi: string) => (language === 'HI' ? hi : en);

  return (
    <LocalizedTree language={language}>
      <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#0a0f1c] to-[#050810] text-white">
        <header className="sticky top-0 z-50 bg-[#07090E]/95 backdrop-blur-xl border-b border-white/[0.08]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{tr('Back to Terms Modal', 'टर्म्स मोडल पर वापस जाएँ')}</span>
              </button>
              <BrandEmblem3D size="sm" layout="row" />
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {'Platform Terms & Legal Policy — fillupo.in'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">Last Updated: November 2026</p>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {'Welcome to fillupo.in ("the Platform"). By accessing or using fillupo.in, you agree to comply with and be bound by the following platform policies and legal terms.'}
            </p>
          </div>

          <div className="space-y-8">
            {SECTIONS.map((section, index) => {
              const Icon = SECTION_ICONS[index];
              return (
                <section
                  key={section.no}
                  className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8"
                >
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Icon className="w-5 h-5 text-cyan-400" />
                    {`${section.no}. ${section.title}`}
                  </h2>
                  <ul className="list-disc list-inside space-y-3 text-slate-300 leading-relaxed ml-4">
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>
              );
            })}

            <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
              <ul className="list-disc list-inside space-y-3 text-slate-300 leading-relaxed ml-4">
                <li>
                  <span className="text-white font-semibold">Website: </span>
                  <a href="https://fillupo.in" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200 underline">
                    https://fillupo.in
                  </a>
                </li>
                <li>
                  <span className="text-white font-semibold">Grievance &amp; Support Email: </span>
                  <a href="mailto:supportfillupo.in@gmail.com" className="text-cyan-300 hover:text-cyan-200 underline">
                    supportfillupo.in@gmail.com
                  </a>
                </li>
              </ul>
              <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Mail className="w-4 h-4" />
                {tr('For any policy or legal query, use the contact details above.', 'किसी भी नीति या कानूनी प्रश्न के लिए ऊपर दी गई संपर्क जानकारी का उपयोग करें।')}
              </p>
            </section>
          </div>
        </main>
      </div>
    </LocalizedTree>
  );
}
