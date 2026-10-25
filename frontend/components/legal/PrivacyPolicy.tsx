import { ArrowLeft, FileText, Shield, Lock, AlertCircle } from 'lucide-react';
import { BrandEmblem3D } from '../../App';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Privacy Policy</h1>
              <p className="text-slate-400 text-sm mt-1">Last Updated: January 2026</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">
            This Privacy Policy explains how FILLUP collects, uses and protects your information.
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
              <p><strong className="text-white">Email:</strong> supportfillup.in@gmail.com</p>
              <p><strong className="text-white">Phone:</strong> +91 98765 43210</p>
            </div>
          </section>

          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
            <p className="text-cyan-200 font-medium">
              By using the FILLUP platform, you consent to this Privacy Policy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
