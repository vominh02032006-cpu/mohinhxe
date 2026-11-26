import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const customerCookieName = 'bhgarage_session';
export const customerSessionMaxAgeSeconds = 7 * 24 * 60 * 60;

export function getSessionSecret(env = process.env) {
  const secret = env.SESSION_SECRET;
  return secret && Buffer.byteLength(secret) >= 32 ? secret : undefined;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return { passwordSalt: salt, passwordHash: Buffer.from(derivedKey).toString('hex') };
}

export async function verifyPassword(password, salt, expectedHash) {
  if (
    typeof password !== 'string' ||
    typeof salt !== 'string' ||
    typeof expectedHash !== 'string' ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(expectedHash)
  ) {
    return false;
  }

  const derivedKey = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHash, 'hex');
  return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected);
}

export function createCustomerSession(userId, env = process.env, now = Date.now()) {
  const secret = getSessionSecret(env);
  if (!secret) {
    throw new Error('Cấu hình SESSION_SECRET chưa hợp lệ.');
  }

  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: now + customerSessionMaxAgeSeconds * 1000,
    nonce: randomBytes(16).toString('hex'),
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyCustomerSession(token, env = process.env, now = Date.now()) {
  const secret = getSessionSecret(env);
  if (!secret || typeof token !== 'string') {
    return undefined;
  }

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) {
    return undefined;
  }

  const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64url');
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return undefined;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      typeof session.userId === 'string' &&
      Number.isSafeInteger(session.expiresAt) &&
      session.expiresAt > now &&
      typeof session.nonce === 'string'
    ) {
      return session.userId;
    }
    return undefined;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
}
