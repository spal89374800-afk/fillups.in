import { ArrowLeft, FileText, Shield, AlertCircle, CreditCard, Lock, Users } from 'lucide-react';
import { BrandEmblem3D } from '../BrandEmblem3D';
import { LocalizedTree, type AppLanguage } from '../../localization';

interface TermsFormFillerProps {
  onBack: () => void;
  language?: AppLanguage;
}

export default function TermsFormFiller({ onBack, language = 'EN' }: TermsFormFillerProps) {
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Terms & Conditions - Form Filler Expert</h1>
              <p className="text-slate-400 text-sm mt-1">Last Updated: January 2026</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Please read these Terms and Conditions carefully before using the fillupo.in platform as a Form Filler Expert.
          </p>
          <p className="text-slate-300 leading-relaxed mt-3">
            Welcome to fillupo.in. By registering as a Form Expert (Student / Independent Operator) using your Name, Mobile Number, and Email ID, you agree to strictly follow all rules, quality standards, and data privacy obligations listed below:
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              1. Eligibility & Account
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You must register with accurate details and provide valid information.</li>
                <li>Your account is for your authorized use only. Sharing of account is strictly prohibited.</li>
                <li>fillupo.in reserves the right to verify and suspend accounts on finding false details.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              2. Service Obligations
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You may only fill forms that are allowed on the platform. Do not fill unauthorized forms.</li>
                <li>When filling forms, you must fill all details strictly as per the original documents provided by the citizen. You must only use information available in the documents - do not guess, assume, add or alter details.</li>
                <li>It is mandatory to fill the form by referring to the documents. Ensuring accuracy by checking the documents is your sole responsibility.</li>
                <li>If the application is rejected, requires correction or any issue arises due to an incorrect entry made by you while filling the form, the entire responsibility for such error shall rest with you. fillupo.in platform shall have no legal, financial or any other liability in this regard.</li>
                <li>You must upload clear photo proof of the filled form before requesting payment approval.</li>
                <li>You must not make false promises like "100% approval guaranteed" or similar claims.</li>
                <li>You must follow all applicable government portal rules while submitting forms.</li>
                <li>You are solely responsible for the accuracy of every entry made by you.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              3. Pricing, Payments & Commission
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You must set correct pricing as per platform guidelines.</li>
                <li>You agree to the platform's split payment system and admin commission as applicable.</li>
                <li>You must confirm your share only after ensuring correct details. All three legs must be confirmed for the order to be considered paid.</li>
                <li>You must not collect any payment directly from the citizen outside the platform.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
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
                <li>You shall indemnify and hold fillupo.in harmless from any claims, losses or damages arising due to your negligence, incorrect entries, misconduct or violation of these terms.</li>
                <li>fillupo.in shall not be responsible for any loss arising out of your actions or services provided by you.</li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4">6. Governing Law & Jurisdiction</h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <p>All disputes shall be governed by Indian law under the exclusive jurisdiction of the courts in Lucknow, Uttar Pradesh.</p>
              <p className="font-semibold text-white">{'Grievance & Legal Jurisdiction'}</p>
              <p><strong className="text-white">{'Support & Grievance Email:'}</strong> supportfillupo.in@gmail.com (Acknowledged within 24–48 hours; resolved within 7–30 days).</p>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              7. Eligibility & Independent Status
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">{'Age & Skill Requirement:'}</strong> You must be 18 years or older and possess a working laptop/computer, stable internet connection, and accurate knowledge of online form filling.
                </li>
                <li>
                  <strong className="text-white">{'Independent Operator:'}</strong> You work as an independent freelancer/service facilitator on fillupo.in, not as an employee, agent, or partner of fillupo.in. You are solely responsible for reporting and paying any applicable taxes on your 83% earnings.
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              8. Strict Accuracy & Zero-Negligence Rule (फॉर्म गलत न भरने की सख्त जिम्मेदारी)
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">{'100% Careful Form Filling:'}</strong> If any detail on the citizen's document is unclear, you must immediately ask the citizen via in-built call or chat.
                </li>
                <li>
                  <strong className="text-white">{'Mandatory Live Screen Verification:'}</strong> Before clicking the final "Submit" button on any official portal, you must share your active browser tab via Live Screen Sharing and get clear confirmation from the citizen that every field (Name, DOB, Category, Photo, Signature, etc.) is correct.
                </li>
                <li>
                  <strong className="text-white">{'Penalty for Negligence / Wrong Form:'}</strong> If you submit an incorrect form without the citizen's live confirmation, or cause financial loss to a citizen due to carelessness:
                  <ol className="list-decimal list-inside space-y-2 ml-4 mt-3">
                    <li>You will be required to refund your 83% service fee (and compensate for official re-application fees if proven negligent).</li>
                    <li>Your account, mobile number, and email ID will be permanently banned from fillupo.in.</li>
                  </ol>
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              9. Strict Data Privacy & Zero Storage Policy (डेटा सुरक्षा और गोपनीयता नियम)
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">{'No Downloading or Saving Documents:'}</strong> Even though you join fillupo.in with basic registration details (Name, Email, Mobile), you are handling sensitive citizen documents (Aadhaar, PAN, photos, certificates, OTPs). You are strictly prohibited from saving, screenshotting, downloading permanently, or sharing any citizen's documents or OTPs outside the active session.
                </li>
                <li>
                  <strong className="text-white">{'Delete Temporary Files Immediately:'}</strong> Any photo or signature temporarily resized on your laptop for uploading must be permanently deleted (including from the Recycle Bin) immediately after the form is submitted.
                </li>
                <li>
                  <strong className="text-white">{'Criminal Liability for Data Misuse:'}</strong> Any attempt to misuse, leak, or store citizen data or OTPs is a punishable cybercrime under the Information Technology Act, 2000 and Bharatiya Nyaya Sanhita (BNS). fillupo.in will hand over your registered mobile number, email, IP logs, and UPI details to police/cybercrime authorities for strict legal action.
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              10. Order Acceptance, Fair Cancellation & 17% Commission Rule
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">{'One Active Order Limit:'}</strong> You can accept only one order at a time. Once accepted, you must connect with the citizen immediately on fillupo.in's in-built call/chat.
                </li>
                <li>
                  <strong className="text-white">{'Honest Cancellation Only:'}</strong> If an official website/server is down or the citizen's documents are incomplete, you must cancel the order honestly by selecting the exact valid reason on your dashboard so innocent citizens are not unfairly auto-blocked.
                </li>
                <li>
                  <strong className="text-white">{'No Platform Bypass (17% Commission Protection):'}</strong> All communication and payments must happen strictly inside fillupo.in. Asking citizens for personal phone numbers or accepting direct payments outside fillupo.in to avoid the 17% platform fee will result in immediate permanent banning and forfeiture of pending payouts.
                </li>
                <li>
                  <strong className="text-white">{'Honest Payment Verification:'}</strong> Verify incoming UPI payments directly in your bank/UPI app before marking an order as paid.
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              11. How fillupo.in Uses & Protects Form Expert Data (Privacy Policy for Experts)
            </h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">{'Data Collected:'}</strong> We collect your Name, Mobile Number, Email ID, City/State, UPI ID (for receiving your 83% share), and session/order activity logs.
                </li>
                <li>
                  <strong className="text-white">{'Purpose & Security:'}</strong> Your details are used strictly for order routing, payout processing, dispute resolution, and platform security. fillupo.in never sells your personal details to third-party advertisers.
                </li>
                <li>
                  <strong className="text-white">{'Auto-Deletion & Retention:'}</strong> Citizen documents are auto-deleted in 24 hours and chats in 7 days. However, your account logs, IP address, and payout records are securely retained on encrypted servers in India for tax compliance, fraud prevention, and legal accountability.
                </li>
              </ul>
            </div>
          </section>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
            <p className="text-emerald-200 font-medium">
              By using the fillupo.in platform as a Form Filler Expert, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
            </p>
          </div>
        </div>
      </main>
    </div>
    </LocalizedTree>
  );
}
