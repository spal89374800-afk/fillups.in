import { ArrowLeft, FileText, Shield, AlertCircle, CreditCard, Lock, Users } from 'lucide-react';
import { BrandEmblem3D } from '../../App';

interface TermsJanSevaProps {
  onBack: () => void;
}

export default function TermsJanSeva({ onBack }: TermsJanSevaProps) {
  return (
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-400/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Terms & Conditions - Jan Seva Kendra Operator (VLE)</h1>
              <p className="text-slate-400 text-sm mt-1">Last Updated: January 2026</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Please read these Terms and Conditions carefully before using the FILLUP platform as a Jan Seva Kendra Operator.
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              1. Eligibility & Account
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You must possess a valid CSC ID or be a valid Jan Seva Kendra Operator with correct details.</li>
                <li>You must provide accurate registration details and keep them updated.</li>
                <li>Your account is for your authorized use only. Sharing of account is strictly prohibited.</li>
                <li>FILLUP reserves the right to verify your credentials and suspend accounts on finding false details.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              2. Service Obligations
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>When filling forms, you must fill all details strictly as per the original documents provided by the citizen. You must only use information available in the documents - do not guess, assume, add or alter details.</li>
                <li>It is mandatory to fill the form by referring to the documents. Ensuring accuracy by checking the documents is your sole responsibility.</li>
                <li>If the application is rejected, requires correction or any issue arises due to an incorrect entry made by you while filling the form, the entire responsibility for such error shall rest with you. FILLUP platform shall have no legal, financial or any other liability in this regard.</li>
                <li>You must upload clear photo proof of the filled form before requesting payment approval.</li>
                <li>You must not make false promises like "100% approval guaranteed" or similar claims.</li>
                <li>You must follow all applicable government portal rules while submitting forms.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              3. Pricing, Payments & Commission
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You must set correct Government Fee and Service Charge. Setting incorrect or fake fees is strictly prohibited.</li>
                <li>You agree to the platform's split payment system and admin commission as applicable.</li>
                <li>You must confirm your share only after ensuring correct details. All three legs must be confirmed for the order to be considered paid.</li>
                <li>You must not collect any payment directly from the citizen outside the platform.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              4. Data Confidentiality
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You must keep all citizen data, documents and details strictly confidential.</li>
                <li>You must not share, sell or misuse any citizen's personal information or documents with any third party.</li>
                <li>You must handle documents responsibly and only use them for the purpose of completing the requested service.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              5. Suspension, Termination & Liability
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violation of these terms may result in warning, suspension or permanent termination of your account.</li>
                <li>You shall indemnify and hold FILLUP harmless from any claims, losses or damages arising due to your negligence, incorrect entries, misconduct or violation of these terms.</li>
                <li>FILLUP shall not be responsible for any loss arising out of your actions or services provided by you.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4">6. Governing Law & Jurisdiction</h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>These Terms shall be governed by and construed in accordance with the laws of India. All disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>
            </div>
          </section>

          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
            <p className="text-purple-200 font-medium">
              By using the FILLUP platform as a Jan Seva Kendra Operator, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
