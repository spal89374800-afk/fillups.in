import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const UserAccountSchema = new Schema({
  id: { type: String, unique: true, index: true },
  role: { type: String, enum: ['client', 'vle', 'filler'], required: true },
  name: String,
  phone: String,
  email: String,
  state: String,
  district: String,
  city: String,
  cscId: String,
  pricingList: Array,
  token: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: false });

const VleOperatorSchema = new Schema({
  id: { type: String, unique: true, index: true },
  cscId: String,
  name: String,
  centerName: String,
  phone: String,
  email: String,
  state: String,
  district: String,
  city: String,
  photoUrl: String,
  pricingList: Array,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: false });

const FillerExpertSchema = new Schema({
  id: { type: String, unique: true, index: true },
  name: String,
  phone: String,
  email: String,
  state: String,
  district: String,
  city: String,
  photoUrl: String,
  pricingList: Array,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: false });

const VleOrderSchema = new Schema({
  id: { type: String, unique: true, index: true },
  clientName: String,
  clientPhone: String,
  clientEmail: String,
  clientState: String,
  clientDistrict: String,
  clientCity: String,
  serviceName: String,
  amount: Number,
  govtFee: Number,
  serviceFee: Number,
  adminCommission: Number,
  operatorShare: Number,
  status: String,
  orderType: String,
  createdAt: { type: Date, default: Date.now },
  documents: Array,
  formData: Object,
  acceptedByVleId: String,
  acceptedByName: String,
  acceptedByVleName: String,
  acceptedBy: String,
  acceptedAt: Date,
  messages: Array,
  isPaymentDoneInApp: Boolean,
  paymentDetails: Object,
  finalProof: Object,
  acknowledgementSlip: Object,
  adminQrConfirmed: Boolean,
  govtFeePaidByClient: Boolean,
  operatorSharePaid: Boolean,
  adminCommissionPaid: Boolean
}, { timestamps: true, strict: false });

const FillerOrderSchema = new Schema({
  id: { type: String, unique: true, index: true },
  clientName: String,
  clientPhone: String,
  clientEmail: String,
  serviceName: String,
  expertName: String,
  amount: Number,
  status: String,
  createdAt: { type: Date, default: Date.now },
  documents: Array,
  messages: Array
}, { timestamps: true, strict: false });

const FillerServiceSchema = new Schema({
  id: { type: String, unique: true, index: true },
  docName: String,
  price: String,
  govtFee: String,
  expertName: String,
  requirements: String,
  description: String,
  icon: String,
  scope: String,
  state: String,
  ownerId: String,
  ownerPhone: String,
  ownerEmail: String,
  ownerDistrict: String,
  ownerCity: String,
  ownerState: String
}, { timestamps: true, strict: false });

const GlobalPricingSchema = new Schema({
  id: { type: String, unique: true, index: true },
  docName: String,
  price: String,
  icon: String,
  dept: String
}, { timestamps: true, strict: false });

const AdminPaymentLedgerSchema = new Schema({
  id: { type: String, unique: true, index: true },
  orderId: String,
  dateTime: String,
  clientName: String,
  clientPhone: String,
  serviceName: String,
  operatorName: String,
  amount: Number,
  status: String,
  source: String,
  qrNote: String,
  adminUpiId: String,
  note: String,
  updatedAt: String
}, { timestamps: true, strict: false });

const PayoutProfileSchema = new Schema({
  key: { type: String, unique: true, index: true },
  upiId: String,
  accountHolder: String,
  verified: Boolean,
  updatedAt: Date
}, { timestamps: true, strict: false });

// Platform-level settings (admin fee UPI). Single doc with a fixed id so it
// survives server restarts, Render sleep and redeploys.
const AdminUpiSettingSchema = new Schema({
  id: { type: String, unique: true, index: true },
  upiId: String,
  payeeName: String
}, { timestamps: true, strict: false });

// Anonymized financial record kept after an order is deleted by the 7-day
// retention sweep. No name, phone, address, chat, documents or UTR.
const OrderArchiveSchema = new Schema({
  id: { type: String, unique: true, index: true },
  orderType: String,
  serviceName: String,
  formTitle: String,
  amountPaid: Number,
  govtFee: Number,
  adminCommission: Number,
  operatorShare: Number,
  status: String,
  createdAt: String,
  completedAt: String,
  cancelledAt: String,
  deletedAt: String
}, { strict: false });

// ======================================================
// 💬 CHAT MESSAGES (alag collection)
// ======================================================
// Har chat message ek chhota document hai. Pehle chat order document ke andar
// embedded thi, isliye har naye message par poora order dobara save hota tha
// (documents + form data + saari purani chat). Ab order halka rehta hai aur
// chat apni collection me per-message save hoti hai.
//
// Retention: order ki tarah chat bhi 7 din baad auto-delete (TTL index).
const ChatMessageSchema = new Schema({
  // Kis order ki chat hai — isi par saari queries chalti hain.
  orderId: { type: String, required: true, index: true },
  // Message id (clientMessageId). Frontend/API shape same rakhne ke liye `id`
  // hi primary id hai; `messageId` sirf padhne me clarity ke liye rakha hai.
  id: { type: String, required: true },
  messageId: { type: String },
  clientMessageId: String,
  sender: { type: String, enum: ['client', 'operator'] },
  senderName: String,
  text: { type: String, default: '' },
  time: String,
  // TTL index isi field par lagega, isliye ye Date hai (string nahi).
  createdAt: { type: Date, default: Date.now },
  attachment: { type: Schema.Types.Mixed },
  isVoiceNote: Boolean,
  audioDataUrl: String,
  audioDuration: String,
  replyTo: { type: Schema.Types.Mixed },
  // ✅ Ticks
  deliveredAt: String,
  readAt: String,
  // Soft delete (content scrub, record rehta hai)
  isDeleted: Boolean,
  deletedAt: String,
  deletedBy: { type: String, enum: ['client', 'operator'] }
}, { timestamps: false, strict: false });

// Ek order ke andar message id unique — do baar save (retry) par duplicate nahi.
ChatMessageSchema.index({ orderId: 1, id: 1 }, { unique: true });
// Chat kholne / paginate karne ke liye.
ChatMessageSchema.index({ orderId: 1, createdAt: 1 });
// 7 din baad purane messages auto-delete.
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const UserAccountModel = mongoose.models.UserAccount || model('UserAccount', UserAccountSchema);
export const VleOperatorModel = mongoose.models.VleOperator || model('VleOperator', VleOperatorSchema);
export const FillerExpertModel = mongoose.models.FillerExpert || model('FillerExpert', FillerExpertSchema);
export const VleOrderModel = mongoose.models.VleOrder || model('VleOrder', VleOrderSchema);
export const FillerOrderModel = mongoose.models.FillerOrder || model('FillerOrder', FillerOrderSchema);
export const FillerServiceModel = mongoose.models.FillerService || model('FillerService', FillerServiceSchema);
export const GlobalPricingModel = mongoose.models.GlobalPricing || model('GlobalPricing', GlobalPricingSchema);
export const AdminPaymentLedgerModel = mongoose.models.AdminPaymentLedger || model('AdminPaymentLedger', AdminPaymentLedgerSchema);
export const PayoutProfileModel = mongoose.models.PayoutProfile || model('PayoutProfile', PayoutProfileSchema);
export const AdminUpiSettingModel = mongoose.models.AdminUpiSetting || model('AdminUpiSetting', AdminUpiSettingSchema);
export const OrderArchiveModel = mongoose.models.OrderArchive || model('OrderArchive', OrderArchiveSchema);
export const ChatMessageModel = mongoose.models.ChatMessage || model('ChatMessage', ChatMessageSchema);
