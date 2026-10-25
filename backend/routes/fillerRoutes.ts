import { Router } from 'express';
import { isRasterImageDataUrl } from '../services/mediaService.ts';
import {
  fillerOrdersStore,
  vleOrdersStore,
  createBroadcastFormBid,
  saveOrUpdateUserAccount,
  userAccountsStore,
  fillerServicesStore,
  addOrUpdateFillerService,
  isOrderVisibleToAccount,
  normalizeEmail
} from '../services/storeService.ts';
import { consumeOtpVerification } from './authRoutes.ts';
import { getRequestAccount, requireAccount } from '../middleware/securityMiddleware.ts';

export const fillerRouter = Router();

function dedupeFillerOrders() {
  const seen = new Set<string>();
  return [...fillerOrdersStore, ...vleOrdersStore].filter(order => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    return true;
  });
}

fillerRouter.post('/filler/register', (req, res) => {
  const { name, phone, email, district, city, state, verificationToken } = req.body;
  const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim();
  const normalizedDistrict = String(district || '').trim();
  const normalizedCity = String(city || '').trim();
  const normalizedState = String(state || '').trim();
  if (
    !normalizedName ||
    !normalizedDistrict ||
    !normalizedCity ||
    !normalizedState ||
    !/^\d{10}$/.test(normalizedPhone) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return res.status(400).json({ success: false, error: 'All details are required: name, state, district, city, valid 10-digit phone number, and valid Gmail address.' });
  }
  const existingAccount = userAccountsStore.find(account =>
    account.role === 'filler' &&
    (account.phone.replace(/\D/g, '').slice(-10) === normalizedPhone || account.email.trim().toLowerCase() === normalizedEmail)
  );
  if (existingAccount) {
    return res.status(409).json({ success: false, error: 'This Form Filler account is already registered. Please log in.' });
  }
  if (!consumeOtpVerification(phone, verificationToken, 'filler', email)) {
    return res.status(401).json({ success: false, error: 'Verify the OTP sent to this phone and email before registering.' });
  }

  const user = saveOrUpdateUserAccount({
    name,
    phone: normalizedPhone,
    email: normalizedEmail,
    district: district || '',
    city: city || '',
    state: normalizedState,
    role: 'filler'
  });
  res.status(201).json({ success: true, token: user.token, message: 'Form Filler account registered. You can now log in with these verified details.', user });
});

// Form Expert Login (Permanent Account Retention per user instruction)
fillerRouter.post('/filler/login', (req, res) => {
  const { phone, email } = req.body;
  const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const registeredAccount = userAccountsStore.find(account =>
    account.role === 'filler' &&
    account.phone.replace(/\D/g, '').slice(-10) === normalizedPhone &&
    account.email.trim().toLowerCase() === normalizedEmail
  );
  if (!registeredAccount) {
    return res.status(403).json({ success: false, error: 'No registered Form Filler account matches this phone and Gmail. Register first or check your details.' });
  }
  if (!consumeOtpVerification(phone, req.body.verificationToken, 'filler', email)) {
    return res.status(401).json({ success: false, error: 'Verify the OTP sent to this phone and email before logging in.' });
  }
  registeredAccount.lastLoginAt = new Date().toISOString();
  res.json({
    success: true,
    message: '✅ Form Expert Operator Logged in successfully (Permanent Account Retention Active).',
    token: registeredAccount.token,
    user: registeredAccount
  });
});

// Form Filler Services List & Creation (published forms are public; management is per-account)
fillerRouter.get('/filler/services', (_req, res) => {
  res.json({ success: true, services: fillerServicesStore });
});

fillerRouter.post('/filler/services', requireAccount('filler'), (req, res) => {
  const account = getRequestAccount(req)!;
  const { id, docName, price, govtFee, expertName, requirements, description, icon, scope, state } = req.body;
  if (!docName || !price) {
    return res.status(400).json({ success: false, error: 'Form Name and Price are required.' });
  }

  const existingService = id ? fillerServicesStore.find(service => service.id === String(id)) : undefined;
  if (id && !existingService) {
    return res.status(404).json({ success: false, error: 'This published form was not found.' });
  }
  if (existingService) {
    const ownsService =
      existingService.ownerId === account.id ||
      (!!existingService.ownerEmail && existingService.ownerEmail.toLowerCase() === account.email.toLowerCase());
    if (!ownsService) {
      return res.status(403).json({ success: false, error: 'You can only edit forms published from your own account.' });
    }
  }

  const addedService = addOrUpdateFillerService({
    id: existingService?.id,
    docName,
    price: String(price),
    govtFee: govtFee !== undefined ? String(govtFee) : '',
    expertName: expertName || account.name || 'Form Filler Expert',
    requirements: requirements || description || 'Aadhaar Card, Passport Photo & Marksheet',
    description: description || requirements || '',
    icon: icon || '📝',
    scope: scope === 'national' || scope === 'district' ? scope : 'online_form',
    ownerId: account.id,
    ownerPhone: account.phone,
    ownerEmail: account.email,
    ownerDistrict: account.district,
    ownerCity: account.city,
    ownerState: account.state,
    state: state || ''
  });

  res.json({
    success: true,
    message: existingService
      ? `✅ Form "${docName}" updated successfully!`
      : `✅ Form "${docName}" successfully published to Citizen Dashboard!`,
    service: addedService,
    services: fillerServicesStore
  });
});

fillerRouter.delete('/filler/services/:id', requireAccount('filler'), (req, res) => {
  const account = getRequestAccount(req)!;
  const { id } = req.params;
  const idx = fillerServicesStore.findIndex(s => s.id === id);
  if (idx >= 0) {
    const owned = !fillerServicesStore[idx].ownerId || fillerServicesStore[idx].ownerId === account.id ||
      (fillerServicesStore[idx].ownerEmail && normalizeEmail(fillerServicesStore[idx].ownerEmail) === normalizeEmail(account.email));
    if (!owned) {
      return res.status(403).json({ success: false, error: 'You can only remove forms published by your own account.' });
    }
    fillerServicesStore.splice(idx, 1);
  }
  res.json({ success: true, message: 'Service removed.', services: fillerServicesStore });
});

fillerRouter.get('/filler/orders', requireAccount('filler'), (req, res) => {
  const account = getRequestAccount(req)!;
  const orders = dedupeFillerOrders()
    .filter(order => isOrderVisibleToAccount(order, account))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, orders });
});

// Broadcast Form Bid submission (Used by Online Form Filling and Custom Form)
fillerRouter.post('/bids/form-filling', requireAccount('client'), (req, res) => {
  const account = getRequestAccount(req)!;
  const { formTitle, formDetails, formCategory, formRoll, amountPaid, govtFee, orderType } = req.body;
  const newBid = createBroadcastFormBid({
    formTitle: formTitle || 'Online Application Form',
    formDetails: formDetails || 'Details provided by citizen',
    formCategory: formCategory || 'General Exam / Govt Scheme',
    formRoll: formRoll || '',
    clientName: account.name || 'Citizen',
    clientPhone: account.phone || '',
    clientEmail: account.email || '',
    district: account.district || '',
    city: account.city || '',
    amountPaid: amountPaid || 150,
    govtFee: govtFee,
    orderType: orderType || 'online_form_filling'
  });
  newBid.clientId = account.id;

  res.json({
    success: true,
    message: `✅ Form request for "${newBid.formTitle}" added to the all-India Jan Seva operator network and the Form Filler order queue.`,
    order: newBid
  });
});

fillerRouter.post('/filler/orders', requireAccount('client'), (req, res) => {
  const account = getRequestAccount(req)!;
  const { formTitle, formDetails, formCategory, formRoll, amountPaid, govtFee, orderType } = req.body;

  // Broadcast to BOTH Form Fillers (all India) and Jan Seva Kendra networks
  const newBid = createBroadcastFormBid({
    formTitle: formTitle || 'Custom Form Writing Request',
    formDetails: formDetails || 'No details provided',
    formCategory: formCategory || 'General Form',
    formRoll: formRoll || '',
    clientName: account.name || 'Citizen',
    clientPhone: account.phone || '',
    clientEmail: account.email || '',
    district: account.district || '',
    city: account.city || '',
    amountPaid: amountPaid || 150,
    govtFee: govtFee,
    orderType: orderType || 'online_form_filling'
  });
  newBid.clientId = account.id;

  res.json({
    success: true,
    message: '✅ Form request added to the all-India Jan Seva Kendra and Form Filler in-app order queues.',
    order: newBid
  });
});

fillerRouter.post('/filler/orders/:id/accept', requireAccount('filler'), (req, res) => {
  const { id } = req.params;
  const account = getRequestAccount(req)!;

  const order: any = fillerOrdersStore.find(o => o.id === id) || vleOrdersStore.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: 'Form request not found.' });

  // ATOMIC CHECK: Check if already accepted by anyone (a Jan Seva Kendra or another Form Filler)
  if (order.status !== 'pending') {
    const accepterName = order.acceptedByName || order.acceptedByFillerName || order.acceptedByVleName || 'another operator';
    const accepterRole = order.acceptedByRoleLabel || (order.acceptedByVleName ? 'Jan Seva Kendra Operator' : 'Form Filler Expert');
    return res.status(400).json({
      success: false,
      alreadyAccepted: true,
      error: `⚠️ Bid Accepted! This bid was already accepted by ${accepterName} (${accepterRole}). Please wait for a new bid!`,
      message: 'Bid Accepted — Please wait for new bid. (Yeh bid accept ho chuki hai, nayi bid aane ka intezar karein)',
      order
    });
  }

  if (!isOrderVisibleToAccount(order, account)) {
    return res.status(403).json({ success: false, error: 'This form request is not available to your account.' });
  }

  order.status = 'accepted';
  order.acceptedById = account.id;
  order.acceptedByName = account.name || 'Form Filler Expert';
  order.acceptedByRole = 'form_filler_expert';
  order.acceptedByRoleLabel = 'Form Filler Expert';
  order.acceptedAt = new Date().toISOString();
  order.acceptedByFillerId = account.id;
  order.acceptedByFillerName = account.name || 'Form Filler Expert';
  order.feesApprovalRequired = true;
  order.feesApprovedByClient = false;
  order.feesApprovedAt = undefined;

  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-' + Date.now(),
    sender: 'operator',
    senderName: order.acceptedByName,
    text: `Hello ${order.clientName}! I am ${order.acceptedByName}, a verified Form Filler Expert. I have accepted your request for "${order.formTitle || order.serviceName}". Please send your marksheet, photo, or required details here to proceed.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json({
    success: true,
    message: 'Bid accepted successfully! Order assigned to you. Set the government fee and form charge to unlock chat.',
    order
  });
});

fillerRouter.post('/filler/orders/:id/upload-proof', requireAccount('filler'), (req, res) => {
  const { id } = req.params;
  const account = getRequestAccount(req)!;
  const { photoUrl } = req.body;
  if (!isRasterImageDataUrl(photoUrl)) {
    return res.status(400).json({ success: false, error: 'Upload a real JPG, PNG, or WebP photo.' });
  }
  const order = fillerOrdersStore.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (order.acceptedByFillerId !== account.id && order.acceptedById !== account.id) {
    return res.status(403).json({ success: false, error: 'Only the assigned Form Filler can upload proof for this order.' });
  }

  order.previewPhotoProof = photoUrl;
  order.status = 'proof_submitted';
  order.chatMessages.push({
    id: 'm-proof-' + Date.now(),
    sender: 'operator',
    senderName: order.acceptedByFillerName || 'Form Filler',
    text: '📸 Form filling completed! Attached is the preview photo proof. Please review and complete payment.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attachment: {
      name: 'Form_Preview_Proof.jpg',
      type: 'jpg',
      url: order.previewPhotoProof || ''
    }
  });

  res.json({ success: true, message: 'Photo proof submitted successfully.', order });
});
