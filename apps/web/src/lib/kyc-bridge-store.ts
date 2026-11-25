import { randomUUID } from 'node:crypto';
import { API_URL } from '@/lib/api';

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

// In-memory fallback cache for ephemeral mobile bridge sessions (5-minute TTL)
declare global {
  // eslint-disable-next-line no-var
  var __kycBridgeSessions: Map<string, KycBridgeSession> | undefined;
}

const fallbackSessions: Map<string, KycBridgeSession> =
  global.__kycBridgeSessions || new Map<string, KycBridgeSession>();

if (process.env.NODE_ENV !== 'production') {
  global.__kycBridgeSessions = fallbackSessions;
}

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates an ephemeral KYC bridge session stored in the shared database
 * (safe across multi-pod clusters and serverless instances).
 */
export async function createKycBridgeSession(): Promise<KycBridgeSession> {
  try {
    const res = await fetch(`${API_URL}/public/kyc-bridge/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        status: data.status,
      };
    }
  } catch (err) {
    console.warn('[KYC Bridge] API store unreachable, using in-memory fallback:', err);
  }

  // Fallback to local in-memory store
  const id = randomUUID();
  const now = Date.now();
  const session: KycBridgeSession = {
    id,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    status: 'pending',
  };
  fallbackSessions.set(id, session);
  return session;
}

export async function getKycBridgeSession(id: string): Promise<KycBridgeSession | null> {
  try {
    const res = await fetch(`${API_URL}/public/kyc-bridge/${id}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'expired') return null;
      return data;
    }
  } catch {}

  const session = fallbackSessions.get(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    fallbackSessions.delete(id);
    return null;
  }
  return session;
}

export async function uploadToKycBridgeSession(
  id: string,
  payload: { fileName: string; mimeType: string; base64: string; fileSize: number },
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/public/kyc-bridge/${id}/upload`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (res.ok) return true;
  } catch {}

  const session = fallbackSessions.get(id);
  if (!session || session.status !== 'pending') return false;

  session.status = 'uploaded';
  session.data = {
    ...payload,
    uploadedAt: Date.now(),
  };
  return true;
}

export async function claimKycBridgeSession(id: string): Promise<KycBridgeSession['data'] | null> {
  try {
    const res = await fetch(`${API_URL}/public/kyc-bridge/${id}/claim`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch {}

  const session = fallbackSessions.get(id);
  if (!session || session.status !== 'uploaded' || !session.data) return null;

  const data = session.data;
  session.status = 'claimed';
  fallbackSessions.delete(id);
  return data;
}
