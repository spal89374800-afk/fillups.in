import { ArrowLeft, FileText, Shield, AlertCircle, CreditCard, Lock, Users } from 'lucide-react';
import { BrandEmblem3D } from '../BrandEmblem3D';
import { LocalizedTree, type AppLanguage } from '../../localization';

interface TermsCitizenProps {
  onBack: () => void;
  language?: AppLanguage;
}

export default function TermsCitizen({ onBack, language = 'EN' }: TermsCitizenProps) {
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
              <FileText className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Terms & Conditions - Citizen</h1>
              <p className="text-slate-400 text-sm mt-1">Last Updated: January 2026</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Please read these Terms and Conditions carefully before using the FILLUP platform as a Citizen.
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              1. Platform Nature
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>FILLUP | Digital Jan Seva Kendra is an independent digital assistant platform and is NOT a government portal, website, or entity. We do not represent any government department or authority. The platform acts only as a facilitator connecting citizens with registered Jan Seva Kendra Operators and Form Filler Experts.</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              2. User Responsibilities
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You must provide accurate, complete and genuine information and documents during registration and service requests.</li>
                <li>You are solely responsible for the correctness of all details filled in forms and uploaded documents.</li>
                <li>You must not provide fake, forged or misleading details or documents.</li>
                <li>You must keep your login credentials confidential and are responsible for all activities under your account.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              3. Payments & Fees
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>The platform uses a three-leg split payment system via UPI:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Government Fee - Paid directly to the assigned operator's UPI ID for government fees</li>
                <li>Admin Fee - A percentage of the service fee paid to Admin's UPI ID</li>
                <li>Operator/Form Filler Share - Remaining portion of the service fee paid to the service provider</li>
              </ul>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Citizen total = Government Fee + Service Fee. Admin fee is carved out of the service fee, not added on top.</li>
                <li>You must review and approve the photo proof uploaded by the operator before making payment.</li>
                <li>Payments are confirmed manually by respective parties. The platform does not use automated payment gateway webhooks.</li>
                <li>Order is marked as paid only after all three legs are confirmed. Submitting UTR alone does not confirm payment.</li>
                <li>You agree not to make any payment directly to the operator/form filler outside the platform. Any such direct payment is done at your own risk and FILLUP shall not be responsible for it.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              4. Documents & Data
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Documents uploaded for service processing are subject to automatic deletion after 24 hours.</li>
                <li>You are responsible for ensuring you have the rights to upload any document you share on the platform.</li>
                <li>FILLUP does not guarantee the storage of documents beyond the retention period.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              5. Disclaimer & Limitation of Liability
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>FILLUP is only a facilitator. Approval/rejection of any application is at the sole discretion of the concerned government authority.</li>
                <li>FILLUP does not guarantee approval, timeline or outcome of any form/application.</li>
                <li>Government fees, rules, eligibility and requirements may change without notice.</li>
                <li>FILLUP shall not be liable for any loss, delay, rejection or damage arising from incorrect details provided by you, technical issues, or acts of government authorities.</li>
                <li>In no event shall FILLUP be liable for any indirect, incidental, special or consequential damages.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4">6. Governing Law & Jurisdiction</h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>These Terms shall be governed by and construed in accordance with the laws of India. All disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              7. Additional Citizen Terms
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">{'Age Eligibility:'}</strong> You must be 18 years or older to create an account and place service requests on fillupo.in. Minors (under 18 years of age, such as school students) may only use fillupo.in under the direct supervision, guidance, and consent of a parent or legal guardian.
                </li>
                <li>
                  <strong className="text-white">{'Mandatory Live Screen Verification:'}</strong> fillupo.in provides a Live Screen Sharing feature during form filling. You must carefully inspect and verify all details (Name, Father's/Mother's Name, Date of Birth, Category, Address, Photo, Signature) on the live screen before giving final confirmation. Once approved by you, fillupo.in or the operator will not be responsible for any spelling errors, wrong entries, or application rejection.
                </li>
                <li>
                  <strong className="text-white">{'Live Session Cooperation & Portal Credentials Safety:'}</strong> During an active order, you must remain available on fillupo.in's in-built chat/call to verify the live screen and provide required OTPs promptly. If you become unresponsive for an extended period after work has begun, the operator may close the session without any refund. Once your form is submitted, it is your sole responsibility to download and safely store your receipt, registration number, and portal password (and change any shared login password immediately after completion).
                </li>
                <li>
                  <strong className="text-white">{'Non-Payment & Post-Registration Absconding Policy:'}</strong> Final submission on the official portal is executed only after full payment verification. In many online forms, the Registration Number or Login Password is sent directly by the official portal to your registered mobile number and email address during registration or data entry. If you intentionally leave the session midway, upload a fake/edited payment proof, or refuse to pay after registration/form entry is completed:
                  <ol className="list-decimal list-inside space-y-2 ml-4 mt-3">
                    <li>Your account, mobile number, email ID, and device IP address will be automatically and permanently blocked on fillupo.in.</li>
                    <li>Withholding payment after receiving service benefits or submitting fake payment proofs constitutes digital cheating and breach of contract under Indian Law (Bharatiya Nyaya Sanhita / IT Act). fillupo.in reserves the full right to file a police/cybercrime complaint using your submitted details and recover unpaid fees with penalty charges.</li>
                  </ol>
                </li>
                <li>
                  <strong className="text-white">{'Prohibition of False UPI Chargebacks:'}</strong> Raising false UPI chargebacks, bank transaction reversals, or cyber complaints after genuine form processing on fillupo.in is strictly prohibited and will lead to permanent blacklisting and legal recovery action.
                </li>
                <li>
                  <strong className="text-white">{'Server Downtime & Fair Refund Rule:'}</strong> If the official government website crashes or stops responding during your live session, you will not be penalized or blocked; the operator will cancel the order under "Official Website / Server Down" or place it on hold until the portal resumes. Once processing begins or government fees are paid, no refund applies (pre-processing refunds take 5 to 7 working days to the original payment source).
                </li>
                <li>
                  <strong className="text-white">{'Last-Minute Deadline Responsibility:'}</strong> You must submit your service request at least 24 to 48 hours before the official form deadline. fillupo.in will not be responsible if an application misses the deadline due to last-hour orders, slow government servers, or payment delays.
                </li>
                <li>
                  <strong className="text-white">{'7-Day Chat Auto-Deletion:'}</strong> Along with 24-hour document auto-deletion, all in-built chat messages exchanged during the order are automatically deleted after 7 days of order completion.
                </li>
                <li>
                  <strong className="text-white">{'Code of Conduct, Indemnity & Termination:'}</strong> Citizens must maintain respectful behavior during live calls and chats; abusive language or harassment will lead to permanent account termination without refund. You agree to indemnify and hold fillupo.in harmless from any legal claims arising from fake documents or unauthorized use of another person's details. fillupo.in reserves the right to suspend or terminate any account at any time without prior notice for policy violations.
                </li>
                <li>
                  <strong className="text-white">{'Electronic Consent, Grievance & Jurisdiction:'}</strong> By registering via OTP, clicking "I Agree", or placing an order on fillupo.in, you provide legally binding electronic consent under Section 10A of the Information Technology Act, 2000. Any user complaint will be acknowledged within 48 hours and resolved within 30 days (Contact: supportfillupo.in@gmail.com). All legal disputes shall be governed by Indian law under the exclusive jurisdiction of the courts in Lucknow, Uttar Pradesh.
                </li>
              </ul>
            </div>
          </section>

          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
            <p className="text-cyan-200 font-medium">
              By using the FILLUP platform as a Citizen, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
            </p>
          </div>
        </div>
      </main>
    </div>
    </LocalizedTree>
  );
}
