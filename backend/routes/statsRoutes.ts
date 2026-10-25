import { Router } from 'express';
import {
  communityQueriesStore,
  fillerOrdersStore,
  fillerServicesStore,
  getOperatorPricing,
  getOperatorFormFilling,
  getPublicOperatorCatalog,
  isOrderVisibleToAccount,
  serviceVisibleForAccount,
  userAccountsStore,
  vleListStore,
  vleOrdersStore
} from '../services/storeService.ts';
import { getRequestAccount } from '../middleware/securityMiddleware.ts';

export const statsRouter = Router();

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
    vles: getPublicVles(account),
    catalog: getPublicOperatorCatalog(account),
    fillerServices: getPublicFillerServices(account),
    communityQueries: communityQueriesStore
  };

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
