export type ServiceScope = 'district' | 'national' | 'online_form';

export type SplitStatus = 'pending' | 'confirmed';

export interface PaymentSplit {
  status: SplitStatus;
  utr?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  // Citizen ka apna payment attestation ("maine yeh payment kar diya").
  // Ye leg ko 'confirmed' nahi karta — settlement verify karne ka kaam
  // recipient (operator / admin) ka hi rehta hai.
  clientConfirmed?: boolean;
  clientConfirmedAt?: string;
  clientConfirmedBy?: string;
  clientUtr?: string;
}

export interface PaymentSplits {
  govt: PaymentSplit;
  admin: PaymentSplit;
  operator: PaymentSplit;
}

export interface ChatMessage {
  id: string;
  sender: 'client' | 'operator';
  senderName: string;
  text: string;
  time: string;
  attachment?: {
    name: string;
    type: 'pdf' | 'jpg' | 'png';
    url: string;
    expiresAt?: string;
    fileId?: string;
  };
  isVoiceNote?: boolean;
  audioDataUrl?: string;
  audioDuration?: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: 'pdf' | 'jpg' | 'png';
  url: string;
  size: string;
  storageFile?: string;
  expiresAt?: string;
}

export interface VleOrder {
  id: string;
  serviceName: string;
  formTitle?: string;
  formDetails?: string;
  formCategory?: string;
  formRoll?: string;
  orderType?: 'vle_service' | 'online_form_filling' | 'custom_form';
  isBroadcastBid?: boolean;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  district?: string;
  city?: string;
  availableOperatorIds?: string[];
  targetOperatorId?: string;
  targetOperatorName?: string;
  targetOperatorPhone?: string;
  targetOperatorEmail?: string;
  status: 'pending' | 'accepted' | 'proof_submitted' | 'paid' | 'completed';
  acceptedById?: string;
  acceptedByName?: string;
  acceptedByRole?: 'jan_seva_vle' | 'form_filler_expert';
  acceptedByRoleLabel?: string;
  acceptedAt?: string;
  acceptedByVleId?: string;
  acceptedByVleName?: string;
  acceptedByFillerId?: string;
  acceptedByFillerName?: string;
  amountPaid: number;
  govtFee?: number;
  feesApprovalRequired?: boolean;
  feesSetAt?: string;
  feesSetByRole?: 'jan_seva_vle' | 'form_filler_expert';
  feesApprovedByClient?: boolean;
  feesApprovedAt?: string;
  serviceScope?: ServiceScope;
  createdAt: string;
  notificationsSent: {
    phone: boolean;
    email: boolean;
    broadcastToVle?: boolean;
    broadcastToFiller?: boolean;
    inApp?: number;
    emailCount?: number;
    routing?: string;
  };
  chatMessages: ChatMessage[];
  clientDocuments: ClientDocument[];
  previewPhotoProof?: string;
  completedFormPdfUrl?: string;
  completedFormPdfName?: string;
  completedFormUploadedAt?: string;
  routingNote?: string;
  isProofApprovedByClient?: boolean;
  isPaymentDoneInApp?: boolean;
  paymentTxnId?: string;
  paymentVerificationStatus?: 'reported' | 'confirmed';
  paymentReportedAt?: string;
  paymentSplits?: PaymentSplits;
  credentialsDispatched?: { appNumber: string; pass: string; sentToWhatsApp: boolean; sentToPhone: boolean };
  rating?: number;
  review?: string;
  ratedAt?: string;
  completedAt?: string;
}

export interface FillerOrder {
  id: string;
  formTitle: string;
  serviceName?: string;
  formDetails: string;
  formCategory?: string;
  formRoll?: string;
  orderType?: 'vle_service' | 'online_form_filling' | 'custom_form';
  isBroadcastBid?: boolean;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  district?: string;
  city?: string;
  availableOperatorIds?: string[];
  status: 'pending' | 'accepted' | 'proof_submitted' | 'paid' | 'completed';
  acceptedById?: string;
  acceptedByName?: string;
  acceptedByRole?: 'jan_seva_vle' | 'form_filler_expert';
  acceptedByRoleLabel?: string;
  acceptedAt?: string;
  acceptedByFillerId?: string;
  acceptedByFillerName?: string;
  acceptedByVleId?: string;
  acceptedByVleName?: string;
  amountPaid: number;
  govtFee?: number;
  feesApprovalRequired?: boolean;
  feesSetAt?: string;
  feesSetByRole?: 'jan_seva_vle' | 'form_filler_expert';
  feesApprovedByClient?: boolean;
  feesApprovedAt?: string;
  serviceScope?: ServiceScope;
  createdAt: string;
  notificationsSent: {
    phone: boolean;
    email: boolean;
    broadcastToVle?: boolean;
    broadcastToFiller?: boolean;
    inApp?: number;
    emailCount?: number;
    routing?: string;
  };
  chatMessages: ChatMessage[];
  clientDocuments: ClientDocument[];
  previewPhotoProof?: string;
  completedFormPdfUrl?: string;
  completedFormPdfName?: string;
  completedFormUploadedAt?: string;
  routingNote?: string;
  isProofApprovedByClient?: boolean;
  isPaymentDoneInApp?: boolean;
  paymentTxnId?: string;
  paymentVerificationStatus?: 'reported' | 'confirmed';
  paymentReportedAt?: string;
  paymentSplits?: PaymentSplits;
  credentialsDispatched?: { appNumber: string; pass: string; sentToWhatsApp: boolean; sentToPhone: boolean };
  rating?: number;
  review?: string;
  ratedAt?: string;
  completedAt?: string;
}

export interface VleOperator {
  id: string;
  name: string;
  cscId: string;
  district: string;
  city: string;
  state?: string;
  phone: string;
  email?: string;
  role?: 'vle' | 'filler';
  status: 'Online' | 'Busy';
  bidsSuspended?: boolean;
  complianceScore: number;
  pricingList: {
    id: string;
    docName: string;
    price: string;
    govtFee?: string;
    cscFee?: string;
    requirements?: string;
    scope?: ServiceScope;
    state?: string;
    feeName?: string;
    dept?: string;
    icon?: string;
  }[];
  formFillingList?: {
    id: string;
    docName: string;
    price: string;
    govtFee?: string;
    requirements?: string;
    expertName?: string;
    icon?: string;
    scope?: ServiceScope;
    state?: string;
  }[];
}

export type AdminPaymentLedgerStatus = 'Auto-Verified' | 'Reconciled' | 'Reversed';

export interface AdminPaymentLedgerEntry {
  id: string;
  orderId: string;
  dateTime: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  operatorName: string;
  amount: number;
  status: AdminPaymentLedgerStatus;
  source: string;
  qrNote: string;
  adminUpiId?: string;
  note?: string;
  updatedAt?: string;
}
