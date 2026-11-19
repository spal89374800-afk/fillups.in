import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, beforeEach, test } from 'node:test';
import { userAccountsStore, type UserAccount } from '../services/storeService.ts';
import {
  accountBlockedPayload,
  applyAutoBlockToOrder,
  blockAccount,
  findAccountsForOrder,
  findBlockedAccountByIdentity,
  isAccountBlocked,
  operatorMetaForOrder,
  shouldAutoBlockOrder,
  unblockAccount,
  AUTO_BLOCK_REASON
} from '../services/accountBlockService.ts';

const originalAccounts = userAccountsStore.slice();
const TWO_HOURS = 2 * 60 * 60 * 1000;
const THREE_HOURS = 3 * 60 * 60 * 1000;

const makeAccount = (overrides: Partial<UserAccount> = {}): UserAccount => ({
  id: `acct-${randomUUID()}`,
  name: 'Test User',
  phone: '9876543210',
  email: 'citizen@example.com',
  role: 'client',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

const staleStamp = () => new Date(Date.now() - THREE_HOURS).toISOString();

beforeEach(() => {
  userAccountsStore.splice(0, userAccountsStore.length);
});

after(() => {
  userAccountsStore.splice(0, userAccountsStore.length, ...originalAccounts);
});

test('paid order is never auto-blocked even with stale presence', () => {
  const order = {
    id: 'paid-1',
    previewPhotoProof: 'proof.jpg',
    isPaymentDoneInApp: true,
    lastPresenceAt: staleStamp()
  };
  assert.equal(shouldAutoBlockOrder(order), false);
});

test('UTR-reported order is held, not auto-blocked', () => {
  const order = {
    id: 'utr-1',
    previewPhotoProof: 'proof.jpg',
    paymentVerificationStatus: 'reported',
    lastPresenceAt: staleStamp()
  };
  assert.equal(shouldAutoBlockOrder(order), false);
});

test('fresh presence heartbeat prevents auto-block', () => {
  const order = {
    id: 'open-page-1',
    previewPhotoProof: 'proof.jpg',
    lastPresenceAt: new Date().toISOString()
  };
  assert.equal(shouldAutoBlockOrder(order), false);
});

test('30-minute tab-close grace is enforced after the beacon arrives', () => {
  const order = {
    id: 'grace-1',
    previewPhotoProof: 'proof.jpg',
    lastPresenceAt: staleStamp(),
    presenceEndedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  };
  assert.equal(shouldAutoBlockOrder(order), false);
});

test('order without work proof is never auto-blocked', () => {
  const order = { id: 'no-proof-1', status: 'accepted', lastPresenceAt: staleStamp() };
  assert.equal(shouldAutoBlockOrder(order), false);
});

test('proof + unpaid + UTR-missing + stale presence for 2h is auto-blocked once', async () => {
  const citizen = makeAccount();
  userAccountsStore.push(citizen);
  const order: any = {
    id: 'abandoned-1',
    clientId: citizen.id,
    clientPhone: citizen.phone,
    clientEmail: citizen.email,
    status: 'proof_submitted',
    previewPhotoProof: 'proof.jpg',
    chatMessages: [],
    lastPresenceAt: staleStamp()
  };

  assert.equal(shouldAutoBlockOrder(order), true);
  assert.equal(await applyAutoBlockToOrder(order), true);
  assert.equal(order.autoBlockReason, AUTO_BLOCK_REASON);
  assert.equal(isAccountBlocked(citizen), true);
  assert.equal(await applyAutoBlockToOrder(order), false);
});

test('identity matching uses Gmail or phone, never IP', () => {
  const citizen = makeAccount({ email: 'unique@example.com', phone: '9876543210' });
  userAccountsStore.push(citizen);
  assert.equal(findBlockedAccountByIdentity({ email: 'unique@example.com' }), undefined);

  blockAccount(citizen, { reason: 'Test block', ip: '1.2.3.4', actor: 'test' });
  assert.equal(findBlockedAccountByIdentity({ email: 'unique@example.com' }), citizen);
  assert.equal(findBlockedAccountByIdentity({ phone: '9876543210' }), citizen);
  // Role switch se block evade nahi ho sakta.
  assert.equal(findBlockedAccountByIdentity({ email: 'unique@example.com', role: 'vle' }), citizen);
  assert.equal(findBlockedAccountByIdentity({ email: 'other@example.com' }), undefined);
  assert.equal(accountBlockedPayload(citizen).code, 'ACCOUNT_BLOCKED');
  assert.equal(citizen.lastBlockedIp, '1.2.3.4');

  unblockAccount(citizen, { reason: 'Test unblock', actor: 'test' });
  assert.equal(isAccountBlocked(citizen), false);
  assert.equal(citizen.blockHistory?.length, 2);
});

test('order participant lookup resolves citizen and operator with the real order fields', () => {
  const citizen = makeAccount({ id: 'citizen-1', email: 'citizen@example.com', phone: '9876543210' });
  const operator = makeAccount({
    id: 'op-1',
    cscId: 'CSC123',
    name: 'Rakesh Kumar',
    email: 'operator@example.com',
    phone: '9876543211',
    role: 'vle'
  });
  userAccountsStore.push(citizen, operator);

  const order = {
    id: 'lookup-1',
    clientEmail: citizen.email,
    clientPhone: citizen.phone,
    acceptedByVleId: operator.cscId,
    acceptedByVleName: operator.name,
    acceptedByRoleLabel: 'Jan Seva Kendra'
  };

  const { client, operator: foundOperator } = findAccountsForOrder(order);
  assert.equal(client, citizen);
  assert.equal(foundOperator, operator);
  assert.deepEqual(operatorMetaForOrder(order), {
    id: 'CSC123',
    name: 'Rakesh Kumar',
    roleLabel: 'Jan Seva Kendra'
  });
});
