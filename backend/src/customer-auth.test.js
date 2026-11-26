import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCustomerSession,
  getSessionSecret,
  hashPassword,
  verifyCustomerSession,
  verifyPassword,
} from './customer-auth.js';

const env = { SESSION_SECRET: 'customer-session-secret-at-least-32-characters' };

describe('customer authentication', () => {
  it('hashes passwords and verifies only the matching password', async () => {
    const credentials = await hashPassword('strong-password');
    assert.notEqual(credentials.passwordHash, 'strong-password');
    assert.equal(await verifyPassword('strong-password', credentials.passwordSalt, credentials.passwordHash), true);
    assert.equal(await verifyPassword('wrong-password', credentials.passwordSalt, credentials.passwordHash), false);
  });

  it('requires a 32-byte session secret', () => {
    assert.equal(getSessionSecret({ SESSION_SECRET: 'too-short' }), undefined);
  });

  it('validates signed sessions and their expiration', () => {
    const now = 1_800_000_000_000;
    const token = createCustomerSession('user-id', env, now);
    assert.equal(verifyCustomerSession(token, env, now), 'user-id');
    assert.equal(verifyCustomerSession(token, env, now + 7 * 24 * 60 * 60 * 1000), undefined);
    assert.equal(verifyCustomerSession(`${token}x`, env, now), undefined);
  });
});
