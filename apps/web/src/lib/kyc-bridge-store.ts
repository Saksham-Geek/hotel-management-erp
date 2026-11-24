import { randomUUID } from 'node:crypto';

export interface KycBridgeSession {
  id: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'uploaded' | 'claimed' | 'expired';
  data?: {
    fileName: string;
    mimeType: string;
    base64: string;
    fileSize: number;
    uploadedAt: number;
  };
}

// In-memory singleton store for ephemeral mobile bridge sessions (5-minute TTL)
declare global {
  // eslint-disable-next-line no-var
  var __kycBridgeSessions: Map<string, KycBridgeSession> | undefined;
}

const sessions: Map<string, KycBridgeSession> =
  global.__kycBridgeSessions || new Map<string, KycBridgeSession>();

if (process.env.NODE_ENV !== 'production') {
  global.__kycBridgeSessions = sessions;
}

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Periodically purge expired sessions to prevent memory leaks
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt < now || session.status === 'claimed') {
      sessions.delete(id);
    }
  }
}

export function createKycBridgeSession(): KycBridgeSession {
  cleanupExpiredSessions();
  const id = randomUUID();
  const now = Date.now();
  const session: KycBridgeSession = {
    id,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    status: 'pending',
  };
  sessions.set(id, session);
  return session;
}

export function getKycBridgeSession(id: string): KycBridgeSession | null {
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    session.status = 'expired';
    sessions.delete(id);
    return null;
  }
  return session;
}

export function uploadToKycBridgeSession(
  id: string,
  payload: { fileName: string; mimeType: string; base64: string; fileSize: number },
): boolean {
  const session = getKycBridgeSession(id);
  if (!session || session.status !== 'pending') return false;

  session.status = 'uploaded';
  session.data = {
    ...payload,
    uploadedAt: Date.now(),
  };
  return true;
}

export function claimKycBridgeSession(id: string): KycBridgeSession['data'] | null {
  const session = getKycBridgeSession(id);
  if (!session || session.status !== 'uploaded' || !session.data) return null;

  const data = session.data;
  session.status = 'claimed';
  // Immediate removal upon claiming to free memory
  sessions.delete(id);
  return data;
}
