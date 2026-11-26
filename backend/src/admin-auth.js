import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const adminCookieName = 'bhgarage_admin';
export const adminSessionMaxAgeSeconds = 8 * 60 * 60;

export function getAdminConfiguration(env = process.env) {
  const username = env.ADMIN_USERNAME;
  const password = env.ADMIN_PASSWORD;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!username || !password || !secret || Buffer.byteLength(secret) < 32) {
    return undefined;
  }
  return { username, password, secret };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminCredentials(username, password, env = process.env) {
  const configuration = getAdminConfiguration(env);
  if (!configuration || typeof username !== 'string' || typeof password !== 'string') {
    return false;
  }
  return (
    safeEqual(username, configuration.username) &&
    safeEqual(password, configuration.password)
  );
}

export function createAdminSession(env = process.env, now = Date.now()) {
  const configuration = getAdminConfiguration(env);
  if (!configuration) {
    throw new Error('Cấu hình đăng nhập admin chưa hợp lệ.');
  }

  const payload = Buffer.from(JSON.stringify({
    username: configuration.username,
    expiresAt: now + adminSessionMaxAgeSeconds * 1000,
    nonce: randomBytes(16).toString('hex'),
  })).toString('base64url');
  const signature = createHmac('sha256', configuration.secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdminSession(token, env = process.env, now = Date.now()) {
  const configuration = getAdminConfiguration(env);
  if (!configuration || typeof token !== 'string') {
    return false;
  }

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) {
    return false;
  }

  const expectedSignature = createHmac('sha256', configuration.secret)
    .update(payload)
    .digest('base64url');
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return (
      session.username === configuration.username &&
      Number.isSafeInteger(session.expiresAt) &&
      session.expiresAt > now &&
      typeof session.nonce === 'string'
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return false;
    }
    throw error;
  }
}
