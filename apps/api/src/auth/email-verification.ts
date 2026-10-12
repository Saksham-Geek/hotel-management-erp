import { createHash, randomBytes } from 'node:crypto';

export function createEmailChangeToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashEmailChangeToken(token) };
}

export function hashEmailChangeToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function emailVerificationUrl(baseUrl: string, token: string) {
  const url = new URL('/verify-email', baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}
