import { Router } from 'express';
import {
  communityQueriesStore,
  fillerOrdersStore,
  fillerServicesStore,
  findVleOperatorForAccount,
  getOperatorPricing,
  getOperatorFormFilling,
  getPublicOperatorCatalog,
  isOrderVisibleToAccount,
  pendingMongoWriteCount,
  serviceVisibleForAccount,
  userAccountsStore,
  vleListStore,
  vleOrdersStore
} from '../services/storeService.ts';
import { getRequestAccount } from '../middleware/securityMiddleware.ts';
import { getMongoStatus } from '../config/db.ts';

export const statsRouter = Router();

// Public, read-only database health. Helps confirm whether the deployed
// backend is actually connected to MongoDB Atlas or running in memory.
statsRouter.get('/health', (_req, res) => {
  const database = getMongoStatus();
  res.status(database.connected ? 200 : 503).json({
    success: database.connected,
    database: {
      ...database,
      mode: database.connected ? 'mongodb' : (database.configured ? 'in-memory (connection failed)' : 'in-memory (MONGODB_URI missing)'),
      pendingWrites: pendingMongoWriteCount()
    }
  });
});

function getPlatformStats() {
  const completedOrders = new Map(
    [...vleOrdersStore, ...fillerOrdersStore]
      .filter(order => order.status === 'completed' || order.status === 'paid')
      .map(order => [order.id, order])
  );

  return {
    stats: {
      activeUsers: userAccountsStore.length,
      activeVles: vleListStore.filter(operator => operator.role === 'vle').length,
      activeOperators: vleListStore.length,
      totalTrustedFormsFilled: completedOrders.size,
      successRate: '—',
      avgProcessingTime: '—',
      satisfactionRate: '—'
    },
    recentDeliveries: []
  };
}

function getPublicVles(account?: ReturnType<typeof getRequestAccount>) {
  return vleListStore.map(operator => ({
    id: operator.id,
    name: operator.name,
    centerName: operator.centerName,
    photoUrl: operator.photoUrl,
    cscId: operator.cscId,
    district: operator.district,
    city: operator.city,
    state: operator.state,
    role: operator.role,
    status: operator.status,
    complianceScore: operator.complianceScore,
    pricingList: (operator.pricingList || []).filter(item => serviceVisibleForAccount(item, account)),
    formFillingList: (operator.formFillingList || []).filter(item => serviceVisibleForAccount(item, account))
  }));
}

function getPublicFillerServices(account?: ReturnType<typeof getRequestAccount>) {
  return fillerServicesStore.filter(service => serviceVisibleForAccount(service, account));
}

function dedupeOrders() {
  const seen = new Set<string>();
  return [...vleOrdersStore, ...fillerOrdersStore].filter(order => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    return true;
  });
}

statsRouter.get('/stats', (_req, res) => {
  res.json({ success: true, ...getPlatformStats() });
});

statsRouter.get('/dashboard', (req, res) => {
  const account = getRequestAccount(req);
  const payload: Record<string, unknown> = {
    success: true,
    ...getPlatformStats(),
    // Saved account details so every device restores the logged-in user's
    // name, phone, email and location instead of blank form fields.
    account: account ? {
      id: account.id,
      role: account.role,
      name: account.name,
      phone: account.phone,
      email: account.email,
      state: account.state || '',
      district: account.district || '',
      city: account.city || '',
      cscId: account.cscId || '',
      centerName: account.centerName || '',
      photoUrl: account.photoUrl || ''
    } : null,
    vles: getPublicVles(account),
    catalog: getPublicOperatorCatalog(account),
    fillerServices: getPublicFillerServices(account),
    communityQueries: communityQueriesStore
  };
  if (account?.role === 'vle') {
    payload.operatorProfile = findVleOperatorForAccount(account) || null;
  }

  const allOrders = dedupeOrders();

  if (!account) {
    payload.pricingList = getPublicOperatorCatalog();
    payload.vleOrders = [];
    payload.fillerOrders = [];
    return res.json(payload);
  }

  const visibleOrders = allOrders.filter(order => isOrderVisibleToAccount(order, account));

  if (account.role === 'client') {
    payload.pricingList = getPublicOperatorCatalog(account);
    payload.services = getPublicOperatorCatalog(account);
    payload.vleOrders = visibleOrders;
    payload.fillerOrders = visibleOrders;
  } else if (account.role === 'vle') {
    payload.pricingList = getOperatorPricing(account);
    payload.formFillingList = getOperatorFormFilling(account);
    payload.vleOrders = visibleOrders;
    payload.fillerOrders = [];
  } else if (account.role === 'filler') {
    payload.pricingList = [];
    payload.vleOrders = [];
    payload.fillerOrders = visibleOrders;
    payload.fillerServices = getPublicFillerServices(account).filter(service =>
      !service.ownerId || service.ownerId === account.id ||
      (service.ownerEmail && service.ownerEmail.toLowerCase() === account.email.toLowerCase())
    );
  } else {
    payload.pricingList = [];
    payload.vleOrders = [];
    payload.fillerOrders = [];
  }

  return res.json(payload);
});
