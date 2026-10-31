import { Router } from 'express';
import { isRasterImageDataUrl } from '../services/mediaService.ts';
import {
  vleListStore,
  vleOrdersStore,
  fillerOrdersStore,
  createBroadcastFormBid,
  saveOrUpdateUserAccount,
  userAccountsStore,
  getLocalVleRecipients,
  findVleOperatorForAccount,
  getOperatorPricing,
  saveOperatorPricing,
  getOperatorFormFilling,
  saveOperatorFormFilling,
  getPublicOperatorCatalog,
  isOrderVisibleToAccount,
  orderBelongsToClient,
  getDocumentScope,
  serviceVisibleForAccount,
  getBidLimitStatus,
  recordBidAccepted,
  persistOrder,
  matchesAnyOperatorId,
  normalizeLocation,
  locationMatches
} from '../services/storeService.ts';
import { VleOperator, VleOrder, ServiceScope } from '../types/index.ts';
import { consumeOtpVerification } from './authRoutes.ts';
import { getRequestAccount, requireAccount } from '../middleware/securityMiddleware.ts';
import { dispatchNewOrderToVle, dispatchNewOrderToFillers, dispatchOrderTaken } from '../services/orderDispatchService.ts';
import { emitOrderUpdate, isOperatorOnline } from '../services/realtimeService.ts';

export const vleRouter = Router();

function normalizeScope(value: unknown, fallback: ServiceScope): ServiceScope {
  return value === 'district' || value === 'national' || value === 'online_form' ? value : fallback;
}

function getAllVleRecipients(): VleOperator[] {
  return vleListStore.filter(operator => operator.role !== 'filler');
}

function dedupeOrders(): VleOrder[] {
  const seen = new Set<string>();
  return [...vleOrdersStore, ...fillerOrdersStore].filter(order => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    return true;
  }) as VleOrder[];
}

vleRouter.post('/vle/login', (req, res) => {
  const { cscId, phone, email } = req.body;
  const normalizedCscId = String(cscId || '').trim().toLowerCase();
  const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const registeredAccount = userAccountsStore.find(account =>
    account.role === 'vle' &&
    account.cscId?.trim().toLowerCase() === normalizedCscId &&
    account.phone.replace(/\D/g, '').slice(-10) === normalizedPhone &&
    account.email.trim().toLowerCase() === normalizedEmail
  );
  if (!registeredAccount) {
    return res.status(403).json({ success: false, error: 'No registered operator account matches this CSC ID, phone, and Gmail. Register first or check your details.' });
  }
  if (!consumeOtpVerification(phone, req.body.verificationToken, 'vle', email)) {
    return res.status(401).json({ success: false, error: 'Verify the OTP sent to this phone and email before logging in.' });
  }
  registeredAccount.lastLoginAt = new Date().toISOString();
  res.json({
    success: true,
    message: '✅ Jan Seva Kendra Operator Logged in successfully (Permanent Account Retention Active).',
    token: registeredAccount.token,
    user: registeredAccount
  });
});

vleRouter.get('/vle/list', (_req, res) => {
  // Public directory: never expose operator phone/email to anonymous visitors.
  const publicVles = vleListStore.map(operator => ({
    id: operator.id,
    name: operator.name,
    cscId: operator.cscId,
    district: operator.district,
    city: operator.city,
    state: operator.state,
    role: operator.role,
    status: operator.status,
    complianceScore: operator.complianceScore,
    pricingList: (operator.pricingList || []).filter(item => serviceVisibleForAccount(item)),
    formFillingList: (operator.formFillingList || []).filter(item => serviceVisibleForAccount(item))
  }));
  res.json({ success: true, vles: publicVles, catalog: getPublicOperatorCatalog() });
});

vleRouter.get('/vle/pricing', requireAccount('vle'), (req, res) => {
  const account = getRequestAccount(req)!;
  res.json({
    success: true,
    pricingList: getOperatorPricing(account),
    formFillingList: getOperatorFormFilling(account)
  });
});

vleRouter.post('/vle/pricing', requireAccount('vle'), (req, res) => {
  const account = getRequestAccount(req)!;
  const savedPricing = saveOperatorPricing(account, req.body.pricingList);
  const savedFormFilling = saveOperatorFormFilling(account, req.body.formFillingList);
  res.json({
    success: true,
    message: '✅ Pricing saved for your Jan Seva Kendra only.',
    pricingList: savedPricing,
    formFillingList: savedFormFilling
  });
});

vleRouter.post('/vle/register', async (req, res) => {
  const { name, cscId, district, city, state, phone, email, pricingList, formFillingList } = req.body;
  const normalizedCscId = String(cscId || '').trim().toLowerCase();
  const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim();
  const normalizedDistrict = String(district || '').trim();
  const normalizedCity = String(city || '').trim();
  const normalizedState = String(state || '').trim();
  if (
    !normalizedName ||
    !normalizedCscId ||
    !normalizedDistrict ||
    !normalizedCity ||
    !normalizedState ||
    !/^\d{10}$/.test(normalizedPhone) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return res.status(400).json({ success: false, error: 'All details are required: operator name, CSC ID, state, district, city, valid 10-digit phone number, and valid Gmail address.' });
  }

  // Block same CSC ID from being used by a different person
  const cscIdOwner = userAccountsStore.find(account =>
    account.role === 'vle' &&
    account.cscId?.trim().toLowerCase() === normalizedCscId
  );
  if (cscIdOwner) {
    const isSamePerson =
      cscIdOwner.phone.replace(/\D/g, '').slice(-10) === normalizedPhone &&
      cscIdOwner.email.trim().toLowerCase() === normalizedEmail;
    if (!isSamePerson) {
      return res.status(409).json({
        success: false,
        error: 'This CSC ID is already registered with another mobile number and email. Only one account per CSC ID is allowed.'
      });
    }
  }

  const existingAccount = userAccountsStore.find(account =>
    account.role === 'vle' &&
    account.cscId?.trim().toLowerCase() === normalizedCscId &&
    account.phone.replace(/\D/g, '').slice(-10) === normalizedPhone &&
    account.email.trim().toLowerCase() === normalizedEmail
  );
  if (existingAccount) {
    return res.status(409).json({ success: false, error: 'This CSC operator account is already registered. Please log in with the registered details.' });
  }
  if (!consumeOtpVerification(phone, req.body.verificationToken, 'vle', email)) {
    return res.status(401).json({ success: false, error: 'Verify the OTP sent to this phone and email before registering.' });
  }

  const ownPricing = Array.isArray(pricingList) ? pricingList : [];
  const account = saveOrUpdateUserAccount({
    cscId: cscId || '',
    name: name || '',
    phone: phone || '',
    email: email || '',
    district: district || '',
    city: city || '',
    state: normalizedState,
    role: 'vle',
    pricingList: ownPricing
  });

  const existingIndex = vleListStore.findIndex(v => v.cscId === cscId || (v.name === name && v.district === district));
  const updatedVle: VleOperator = {
    id: existingIndex >= 0 ? vleListStore[existingIndex].id : 'VLE-' + Date.now(),
    name: name || '',
    cscId: cscId || ('CSC-UP-' + Math.floor(10000 + Math.random() * 90000)),
    district: district || '',
    city: city || '',
    state: normalizedState,
    phone: phone || '',
    email: email || '',
    role: 'vle',
    status: 'Online',
    bidsSuspended: false,
    complianceScore: 100,
    pricingList: ownPricing,
    formFillingList: formFillingList || []
  };

  if (existingIndex >= 0) {
    vleListStore[existingIndex] = updatedVle;
  } else {
    vleListStore.unshift(updatedVle);
  }
  try {
    const { persistToMongo } = await import('../services/storeService.ts');
    await persistToMongo('vleOperator', updatedVle);
  } catch {}
  saveOperatorPricing(account, ownPricing);
  saveOperatorFormFilling(account, formFillingList || []);

  res.json({ success: true, token: account.token, vle: updatedVle, pricingList: ownPricing });
});

vleRouter.get('/vle/orders', requireAccount(), (req, res) => {
  const account = getRequestAccount(req)!;
  const orders = dedupeOrders()
    .filter(order => isOrderVisibleToAccount(order, account))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, orders });
});

vleRouter.post('/vle/orders', requireAccount('client'), async (req, res) => {
  const account = getRequestAccount(req)!;
  const {
    serviceName, formTitle, formDetails, formCategory, formRoll, orderType,
    district, city, amountPaid, govtFee, targetOperatorId, targetOperatorName,
    targetOperatorPhone, targetOperatorEmail
  } = req.body;

  const clientName = String(req.body.clientName || '').trim() || account.name || 'Citizen';
  const clientPhone = String(req.body.clientPhone || '').trim() || account.phone || '';
  const clientEmail = String(req.body.clientEmail || '').trim() || account.email || '';
  const requestDistrict = String(district || '').trim() || account.district || '';
  const requestCity = String(city || '').trim() || account.city || '';

  const inferredScope: ServiceScope = (orderType === 'online_form_filling' || orderType === 'custom_form' || formTitle)
    ? 'online_form'
    : getDocumentScope(serviceName);
  const serviceScope = normalizeScope(req.body.serviceScope, inferredScope);

  // ======================================================
  // 📝 EXAM / ONLINE FORM → all-India broadcast (VLE + Form Fillers)
  // ======================================================
  if (serviceScope === 'online_form') {
    const broadcastBid = createBroadcastFormBid({
      formTitle: formTitle || serviceName || 'Online Application Form',
      formDetails: formDetails || 'Requested via citizen portal',
      formCategory: formCategory || 'General Exam / Govt Scheme',
      formRoll: formRoll || '',
      clientName,
      clientPhone,
      clientEmail,
      district: requestDistrict,
      city: requestCity,
      amountPaid: amountPaid || 150,
      govtFee,
      orderType: orderType || 'online_form_filling'
    });
    broadcastBid.clientId = account.id;
    broadcastBid.routingNote = 'Yeh exam/online form request poore India ke Jan Seva operators aur Form Filler experts ko bheji gayi hai. Online operators ko turant in-app notification, offline ko email.';

    const allVle = getAllVleRecipients();
    const vleResult = await dispatchNewOrderToVle(broadcastBid, allVle, 'national');
    const fillerResult = await dispatchNewOrderToFillers(broadcastBid);

    broadcastBid.notificationsSent = {
      phone: false,
      email: (vleResult.emails + fillerResult.emails) > 0,
      broadcastToVle: vleResult.inApp > 0,
      broadcastToFiller: fillerResult.inApp > 0,
      inApp: vleResult.inApp + fillerResult.inApp,
      emailCount: vleResult.emails + fillerResult.emails,
      routing: 'national'
    };
    await persistOrder(broadcastBid);

    return res.json({
      success: true,
      message: `✅ Form request is now open to all ${allVle.length} Jan Seva operator(s) and all Form Filler experts. Online: in-app notification, Offline: email.`,
      order: broadcastBid
    });
  }

  // ======================================================
  // 📄 JAN SEVA DOCUMENT → city-first, then district
  // ======================================================
  const districtPool = serviceScope === 'district'
    ? getLocalVleRecipients(requestDistrict, '')
    : getAllVleRecipients();

  if (serviceScope === 'district' && districtPool.length === 0) {
    return res.status(409).json({
      success: false,
      error: 'Not found Jan Seva Kendra in your district.'
    });
  }

  const cityPool = serviceScope === 'district' && requestCity
    ? districtPool.filter(operator => locationMatches(operator.city, requestCity))
    : [];

  let eligibleOperators: VleOperator[] = [];
  let routing: 'city' | 'district' | 'target' | 'national' | 'offline_fallback' = 'national';
  let routingNote = '';
  let targetOperator: VleOperator | undefined;

  if (targetOperatorId) {
    // Citizen ne specific operator chuna hai. City pool me na mile to poore
    // district/India me dekho, taaki chosen operator target ho sake.
    const searchPool = [
      ...cityPool,
      ...districtPool,
      ...getAllVleRecipients()
    ];
    targetOperator = searchPool.find(operator =>
      operator.id === targetOperatorId || operator.cscId === targetOperatorId
    );
    if (!targetOperator) {
      return res.status(403).json({ success: false, error: 'That operator is not eligible for this request scope.' });
    }
    eligibleOperators = [targetOperator];
    routing = 'target';
    routingNote = isOperatorOnline(targetOperator)
      ? `Aapne ${targetOperator.name} ko choose kiya hai. Request sirf unhi ko bheji gayi hai.`
      : `Aapke chune hue operator ${targetOperator.name} abhi offline hain. Unhe email notification bheji gayi hai — online aate hi wo request dekh payenge.`;
  } else if (serviceScope === 'district') {
    const cityOnline = cityPool.filter(operator => isOperatorOnline(operator));
    const districtOnline = districtPool.filter(operator => isOperatorOnline(operator));

    if (cityOnline.length > 0) {
      // ✅ City me online operator mil gaya → sirf unhi ko.
      eligibleOperators = cityOnline;
      routing = 'city';
      routingNote = `Aapke city (${requestCity}) ke online Jan Seva operators ko request bheji gayi hai.`;
    } else if (districtOnline.length > 0) {
      // ↩️ City me online nahi → turant district ke online operators.
      eligibleOperators = districtOnline;
      routing = 'district';
      routingNote = cityPool.length > 0
        ? `Aapke city (${requestCity}) me koi operator online nahi hai, isliye request district ke online operators ko bheji gayi hai.`
        : `Aapke city (${requestCity}) me Jan Seva Kendra available nahi hai, isliye request district ke operators ko bheji gayi hai.`;
    } else {
      // 📧 Koi online nahi → district ko email se notify karo.
      eligibleOperators = districtPool;
      routing = 'offline_fallback';
      routingNote = `Abhi district me koi operator online nahi hai. Sabhi district operators ko email notification bheji ja rahi hai.`;
    }
  } else {
    // National scope: online ko in-app, offline ko email.
    const online = districtPool.filter(operator => isOperatorOnline(operator));
    eligibleOperators = online.length > 0 ? online : districtPool;
    routing = online.length > 0 ? 'national' : 'offline_fallback';
    routingNote = online.length > 0
      ? 'Yeh national-scope request all-India ke online Jan Seva operators ko bheji gayi hai.'
      : 'Abhi koi operator online nahi hai. Sabhi eligible operators ko email notification bheji ja rahi hai.';
  }

  const newOrder: VleOrder = {
    id: `JSK-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    serviceName: serviceName || 'Digital Document Service',
    formDetails: formDetails || '',
    orderType: orderType === 'vle_service' ? 'vle_service' : undefined,
    serviceScope,
    clientId: account.id,
    clientName,
    clientPhone,
    clientEmail,
    district: requestDistrict,
    city: requestCity,
    availableOperatorIds: eligibleOperators.flatMap(operator => [operator.id, operator.cscId]).filter(Boolean),
    targetOperatorId: targetOperator ? (targetOperator.cscId || targetOperator.id) : undefined,
    targetOperatorName: targetOperator ? targetOperator.name : (targetOperatorName || undefined),
    targetOperatorPhone: targetOperator ? targetOperator.phone : (targetOperatorPhone || undefined),
    targetOperatorEmail: targetOperator ? targetOperator.email : (targetOperatorEmail || undefined),
    routingNote,
    status: 'pending',
    amountPaid: amountPaid || 150,
    govtFee: Math.max(0, Number(govtFee) || 0),
    createdAt: new Date().toISOString(),
    notificationsSent: { phone: false, email: false, routing },
    chatMessages: [],
    clientDocuments: []
  };

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  newOrder.chatMessages.push({
    id: 'sys-routing-' + Date.now(),
    sender: 'operator',
    senderName: 'DigiSeva Dispatch',
    text: `📢 ${routingNote}`,
    time: timeStr
  });

  vleOrdersStore.unshift(newOrder);

  const dispatchResult = await dispatchNewOrderToVle(newOrder, eligibleOperators, routing);
  newOrder.notificationsSent = {
    phone: false,
    email: dispatchResult.emails > 0,
    broadcastToVle: dispatchResult.inApp > 0,
    broadcastToFiller: false,
    inApp: dispatchResult.inApp,
    emailCount: dispatchResult.emails,
    routing
  };
  await persistOrder(newOrder);

  res.json({
    success: true,
    message: `✅ Order dispatched! ${routingNote}`,
    routing,
    notifications: {
      inApp: dispatchResult.inApp,
      email: dispatchResult.emails,
      online: dispatchResult.onlineIds.length,
      offline: dispatchResult.offlineIds.length
    },
    order: newOrder
  });
});

vleRouter.post('/vle/orders/:id/accept', requireAccount('vle'), async (req, res) => {
  const { id } = req.params;
  const account = getRequestAccount(req)!;

  const order: any = vleOrdersStore.find(o => o.id === id) || fillerOrdersStore.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: 'Request not found.' });

  if (order.status !== 'pending') {
    const accepterName = order.acceptedByName || order.acceptedByVleName || order.acceptedByFillerName || 'another operator';
    const accepterRole = order.acceptedByRoleLabel || (order.acceptedByFillerName ? 'Form Filler Expert' : 'Jan Seva Kendra Operator');
    return res.status(400).json({
      success: false,
      alreadyAccepted: true,
      error: `⚠️ Bid Accepted! This bid was already accepted by ${accepterName} (${accepterRole}). Please wait for a new bid!`,
      message: 'Bid Accepted — Please wait for new bid. (Yeh bid accept ho chuki hai, nayi bid aane ka intezar karein)',
      order
    });
  }

  let operator = findVleOperatorForAccount(account);
  if (!operator && account.cscId) {
    operator = {
      id: 'VLE-' + account.id,
      name: account.name,
      cscId: account.cscId,
      district: account.district || '',
      city: account.city || '',
      state: account.state || '',
      phone: account.phone,
      email: account.email,
      role: 'vle',
      status: 'Online',
      bidsSuspended: false,
      complianceScore: 100,
      pricingList: getOperatorPricing(account)
    };
    vleListStore.unshift(operator);
  }
  if (!operator) {
    return res.status(403).json({ success: false, error: 'A registered Jan Seva operator account is required to accept requests.' });
  }
  if (operator.bidsSuspended) {
    return res.status(403).json({
      success: false,
      error: '🚫 BIDS SUSPENDED: Your account has been blocked from accepting bids because an in-app payment was bypassed.'
    });
  }
  if (!isOrderVisibleToAccount(order, account)) {
    return res.status(403).json({ success: false, error: 'This request is not available in your district, city, or scope.' });
  }
  const limit = getBidLimitStatus(account);
  if (!limit.allowed) {
    return res.status(403).json({
      success: false,
      limitReached: true,
      error: limit.reason,
      activeCount: limit.activeCount,
      dailyCount: limit.dailyCount
    });
  }

  order.status = 'accepted';
  order.acceptedById = operator.cscId;
  order.acceptedByName = operator.name;
  order.acceptedByRole = 'jan_seva_vle';
  order.acceptedByRoleLabel = 'Jan Seva Kendra Operator';
  order.acceptedAt = new Date().toISOString();
  order.acceptedByVleId = operator.cscId;
  order.acceptedByVleName = operator.name;
  order.feesApprovalRequired = true;
  order.feesApprovedByClient = false;
  order.feesApprovedAt = undefined;

  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-' + Date.now(),
    sender: 'operator',
    senderName: order.acceptedByName,
    text: `Hello ${order.clientName}! I am ${order.acceptedByName} from Jan Seva Kendra. I have accepted your ${order.formTitle || order.serviceName} request. Please attach all required documents and details here to proceed.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  recordBidAccepted(account);
  dispatchOrderTaken(order);
  emitOrderUpdate(order);
  await persistOrder(order);

  res.json({
    success: true,
    message: 'Request accepted successfully! Order assigned to you. Set the government fee and form charge to unlock chat.',
    activeCount: limit.activeCount + 1,
    dailyCount: limit.dailyCount + 1,
    order
  });
});

function accountOwnsAcceptedOrder(order: any, account: ReturnType<typeof getRequestAccount>): boolean {
  if (!account) return false;
  if (account.role === 'filler') {
    return order.acceptedByFillerId === account.id || order.acceptedById === account.id;
  }
  return order.acceptedByVleId === account.cscId || order.acceptedById === account.cscId || order.acceptedById === account.id;
}

vleRouter.post('/vle/orders/:id/update-pricing', requireAccount('vle'), async (req, res) => {
  const { id } = req.params;
  const account = getRequestAccount(req)!;
  const { amount } = req.body;
  const order = vleOrdersStore.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountOwnsAcceptedOrder(order, account)) {
    return res.status(403).json({ success: false, error: 'Only the assigned operator can update this order price.' });
  }

  order.amountPaid = Number(amount) || order.amountPaid;
  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-price-' + Date.now(),
    sender: 'operator',
    senderName: order.acceptedByVleName || 'Operator',
    text: `💰 Service fee updated to ₹${order.amountPaid}. Please complete the payment securely in the app.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  emitOrderUpdate(order);
  await persistOrder(order);
  res.json({ success: true, message: `Fee updated to ₹${order.amountPaid}`, order });
});

vleRouter.post('/vle/orders/:id/upload-proof', requireAccount('vle'), async (req, res) => {
  const { id } = req.params;
  const account = getRequestAccount(req)!;
  const { photoUrl } = req.body;
  if (!isRasterImageDataUrl(photoUrl)) {
    return res.status(400).json({ success: false, error: 'Upload a real JPG, PNG, or WebP photo.' });
  }
  const order = vleOrdersStore.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountOwnsAcceptedOrder(order, account)) {
    return res.status(403).json({ success: false, error: 'Only the assigned operator can upload proof for this order.' });
  }

  order.previewPhotoProof = photoUrl;
  order.status = 'proof_submitted';
  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-proof-' + Date.now(),
    sender: 'operator',
    senderName: order.acceptedByVleName || 'Operator',
    text: '📸 I have filled the application draft and uploaded the photo proof! Please inspect all details carefully and approve payment.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attachment: {
      name: 'Application_Draft_Proof.jpg',
      type: 'jpg',
      url: order.previewPhotoProof || ''
    }
  });

  emitOrderUpdate(order);
  await persistOrder(order);
  res.json({ success: true, message: 'Photo proof submitted successfully! Client can inspect and pay.', order });
});

vleRouter.post('/vle/orders/:id/approve-proof', requireAccount('client'), async (req, res) => {
  const { id } = req.params;
  const account = getRequestAccount(req)!;
  const order = vleOrdersStore.find(o => o.id === id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!orderBelongsToClient(order, account)) {
    return res.status(403).json({ success: false, error: 'You can only approve your own order.' });
  }

  order.isProofApprovedByClient = true;
  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-apprv-' + Date.now(),
    sender: 'client',
    senderName: order.clientName,
    text: '✅ All details in the photo proof are verified and approved! Proceeding with payment.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  emitOrderUpdate(order);
  await persistOrder(order);
  res.json({ success: true, message: 'Draft approved! Please proceed with payment.', order });
});
