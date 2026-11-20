import { ArrowLeft, FileText, Shield, Lock, AlertCircle } from 'lucide-react';
import { BrandEmblem3D } from '../BrandEmblem3D';
import { LocalizedTree, type AppLanguage } from '../../localization';

interface PrivacyPolicyProps {
  onBack: () => void;
  language?: AppLanguage;
}

export default function PrivacyPolicy({ onBack, language = 'EN' }: PrivacyPolicyProps) {
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
              <span className="text-sm font-medium">Back to Terms Modal</span>
            </button>
            <BrandEmblem3D size="sm" layout="row" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Privacy Policy</h1>
              <p className="text-slate-400 text-sm mt-1">Last Updated: January 2026</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">
            This Privacy Policy explains how fillupo.in collects, uses and protects your information.
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              1. Information We Collect
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account details: Name, Mobile Number, Email, State, District, City</li>
                <li>Service details: Form information, documents uploaded for service processing</li>
                <li>Payment information: UPI details as shared for payment confirmation (we do not store full bank/card details)</li>
                <li>Communication data: Messages, chats related to orders</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              2. How We Use Information
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>To facilitate connection between citizens and service providers</li>
                <li>To process orders and enable communication</li>
                <li>To verify users and maintain platform security</li>
                <li>To facilitate the split payment system</li>
                <li>To comply with legal obligations</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              3. Data Retention & Deletion
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Uploaded documents are subject to automatic deletion after 24 hours.</li>
                <li>We follow a zero-retention approach for temporary documents where applicable.</li>
                <li>Account and order-related data may be retained as necessary for platform operations, dispute resolution and legal compliance.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              4. Data Sharing & Security
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Documents and details are shared only with the assigned service provider for the purpose of completing the requested service.</li>
                <li>We do not sell your personal data to third parties.</li>
                <li>We implement reasonable security measures, however no system is completely secure.</li>
                <li>Service providers are bound by confidentiality obligations under their terms.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4">5. Your Rights & Contact</h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>You may contact us regarding your data or privacy concerns:</p>
              <p className="font-semibold text-white">{'Grievance Redressal & Contact'}</p>
              <p>Under Indian IT and E-Commerce Rules, any complaint regarding your personal data or privacy will be acknowledged within 24–48 hours. We will make every reasonable effort to resolve the issue at the earliest (typically within 7–15 days) and no later than 30 days from the date of receipt.</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">{'Platform:'}</strong>{' '}
                  <a href="https://fillupo.in" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200 underline">https://fillupo.in</a>
                </li>
                <li>
                  <strong className="text-white">{'Grievance & Support Email:'}</strong>{' '}
                  <a href="mailto:supportfillupo.in@gmail.com" className="text-cyan-300 hover:text-cyan-200 underline">supportfillupo.in@gmail.com</a>
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              6. Live Screen Sharing & Call Privacy
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>fillupo.in uses real-time screen sharing and in-built voice/chat features solely to let you verify your application live. Live screen sessions are not recorded or stored on our servers once the session ends.</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              7. 7-Day Chat Auto-Deletion
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>Along with the 24-hour automatic deletion of uploaded documents, all in-built chat messages exchanged between you and the operator are permanently and automatically deleted after 7 days of order completion (unless temporarily retained to resolve an active payment or fraud dispute).</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              8. Minors' Data Protection (DPDP Act)
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>We do not knowingly collect or process personal documents of individuals under 18 years of age without the verifiable consent and supervision of a parent or legal guardian, in compliance with India's Digital Personal Data Protection (DPDP) Act.</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              9. Data Security & Breach Notification
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>fillupo.in uses SSL encryption and strict access controls to protect your uploaded documents during the 24-hour active window. In the unlikely event of any unauthorized data breach, we will notify affected users and the Data Protection Board of India promptly in accordance with the DPDP Act.</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              10. Secure Cloud Storage & Essential Cookies
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>All user information, live session data, and temporary documents are processed and stored securely on encrypted cloud servers under strict confidentiality agreements. fillupo.in uses only strictly necessary session cookies to keep your login and live dashboard functioning securely.</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              11. Legal Disclosure
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>Aside from the assigned operator and the official government portal where you instruct us to apply, your information may be disclosed to law enforcement or cybercrime authorities strictly if required by Indian law or in cases of payment fraud/forged document submission.</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              12. Your Rights Under Indian Data Law (DPDP Act)
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>As a Citizen, you have the right to access a summary of your data, request correction of inaccurate details, withdraw your consent, or request permanent deletion of your account at any time.</p>
            </div>
          </section>

          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
            <p className="text-cyan-200 font-medium">
              By using the fillupo.in platform, you consent to this Privacy Policy.
            </p>
          </div>
        </div>
      </main>
    </div>
    </LocalizedTree>
  );
}
