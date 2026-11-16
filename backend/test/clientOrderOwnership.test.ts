import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, beforeEach, test } from 'node:test';
import type { VleOrder } from '../types/index.ts';
import { orderBelongsToClient, userAccountsStore, type UserAccount } from '../services/storeService.ts';

const originalAccounts = userAccountsStore.slice();

const makeAccount = (id: string, phone: string, email: string): UserAccount => ({
  id,
  name: 'Same Citizen Name',
  phone,
  email,
  role: 'client',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: '2026-01-01T00:00:00.000Z'
});

const makeOrder = (overrides: Partial<VleOrder> = {}): VleOrder => ({
  id: `ownership-test-${randomUUID()}`,
  serviceName: 'Citizen request',
  clientId: 'client-a',
  clientName: 'Same Citizen Name',
  clientPhone: '9876543210',
  clientEmail: 'a@example.com',
  status: 'pending',
  amountPaid: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  notificationsSent: { phone: false, email: false },
  chatMessages: [],
  clientDocuments: [],
  ...overrides
});

beforeEach(() => {
  userAccountsStore.splice(
    0,
    userAccountsStore.length,
    makeAccount('client-a', '9876543210', 'a@example.com'),
    makeAccount('client-b', '9876543211', 'b@example.com')
  );
});

after(() => {
  userAccountsStore.splice(0, userAccountsStore.length, ...originalAccounts);
});

test('a citizen can access only orders owned by their account id', () => {
  const order = makeOrder();
  const [accountA, accountB] = userAccountsStore;

  assert.equal(orderBelongsToClient(order, accountA), true);
  assert.equal(orderBelongsToClient(order, accountB), false);
});

test('a uniquely matched legacy order is linked to its verified account once', () => {
  const order = makeOrder({ clientId: '' });
  const [accountA, accountB] = userAccountsStore;

  assert.equal(orderBelongsToClient(order, accountA), true);
  assert.equal(order.clientId, accountA.id);
  assert.equal(orderBelongsToClient(order, accountB), false);
});

test('an ambiguous legacy order is not exposed to either account', () => {
  const [accountA] = userAccountsStore;
  userAccountsStore.push(makeAccount('client-c', accountA.phone, 'c@example.com'));
  const order = makeOrder({ clientId: '', clientEmail: '' });

  assert.equal(orderBelongsToClient(order, accountA), false);
  assert.equal(orderBelongsToClient(order, userAccountsStore[2]), false);
  assert.equal(order.clientId, '');
});
