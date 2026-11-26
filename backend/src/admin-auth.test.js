import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdminSession,
  verifyAdminCredentials,
  verifyAdminSession,
} from './admin-auth.js';

const env = {
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'correct horse battery staple',
  ADMIN_SESSION_SECRET: 'test-secret-with-at-least-32-characters-long',
};

describe('admin authentication', () => {
  it('accepts configured credentials and rejects incorrect credentials', () => {
    assert.equal(verifyAdminCredentials('admin', env.ADMIN_PASSWORD, env), true);
    assert.equal(verifyAdminCredentials('admin', 'wrong', env), false);
    assert.equal(verifyAdminCredentials('other', env.ADMIN_PASSWORD, env), false);
  });

  it('requires a session secret of at least 32 bytes', () => {
    assert.equal(verifyAdminCredentials('admin', env.ADMIN_PASSWORD, {
      ...env,
      ADMIN_SESSION_SECRET: 'too-short',
    }), false);
  });

  it('accepts a valid session and rejects expired or tampered sessions', () => {
    const now = 1_800_000_000_000;
    const token = createAdminSession(env, now);
    assert.equal(verifyAdminSession(token, env, now), true);
    assert.equal(verifyAdminSession(token, env, now + 8 * 60 * 60 * 1000), false);
    assert.equal(verifyAdminSession(`${token}x`, env, now), false);
  });
});
