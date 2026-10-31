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

export const UserAccountModel = mongoose.models.UserAccount || model('UserAccount', UserAccountSchema);
export const VleOperatorModel = mongoose.models.VleOperator || model('VleOperator', VleOperatorSchema);
export const FillerExpertModel = mongoose.models.FillerExpert || model('FillerExpert', FillerExpertSchema);
export const VleOrderModel = mongoose.models.VleOrder || model('VleOrder', VleOrderSchema);
export const FillerOrderModel = mongoose.models.FillerOrder || model('FillerOrder', FillerOrderSchema);
export const FillerServiceModel = mongoose.models.FillerService || model('FillerService', FillerServiceSchema);
export const GlobalPricingModel = mongoose.models.GlobalPricing || model('GlobalPricing', GlobalPricingSchema);
export const AdminPaymentLedgerModel = mongoose.models.AdminPaymentLedger || model('AdminPaymentLedger', AdminPaymentLedgerSchema);
export const PayoutProfileModel = mongoose.models.PayoutProfile || model('PayoutProfile', PayoutProfileSchema);
