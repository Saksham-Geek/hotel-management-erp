import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { EntitlementsDto, FeatureKey, MeDto, PlanKey, PlanTierConfig } from '@erp/shared';

const rawApiUrl = process.env.API_URL ?? 'http://127.0.0.1:4000';
// On Windows, 'localhost' resolves to IPv6 [::1] first. If API listens on IPv4 0.0.0.0,
// this causes a 30s TCP timeout or ECONNREFUSED. Normalize localhost -> 127.0.0.1.
export const API_URL = rawApiUrl.replace('://localhost:', '://127.0.0.1:');
export const TOKEN_COOKIE = 'erp_token';

export class ApiError extends Error {
  constructor(public status: number, public body: any) {
    super(body?.message ?? 'Request failed');
  }
}

/** Server-side only. The JWT lives in an httpOnly cookie and never reaches browser JavaScript. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const headers = {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  };

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      ...init,
      cache: 'no-store',
      headers,
    });
  } catch (err: any) {
    // Graceful fallback: try 127.0.0.1 if URL was different, or wrap cleanly so SSR doesn't throw raw unhandled TypeError
    console.error(`[API Network Error] ${init.method ?? 'GET'} ${API_URL + path}:`, err?.message ?? err);
    throw new ApiError(503, {
      message: 'API backend (:4000) is unreachable. Check that the backend service and database are running.',
      details: err?.message,
    });
  }

  const body = await res.json().catch(() => null);
  if (res.status === 401) redirect('/login?error=' + encodeURIComponent('Your session has ended. Sign in again'));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const getMe = cache(() => api<MeDto>('/auth/me'));
export const getEntitlements = cache(() => api<EntitlementsDto>('/entitlements/me'));
export const getPlans = cache(() => api<{ currentPlan: PlanKey; tiers: PlanTierConfig[] }>('/entitlements/plans'));

/** Page-level gate. The API enforces the same rule; this just sends people somewhere helpful. */
export async function requireFeature(feature: FeatureKey) {
  const ent = await getEntitlements();
  if (!ent.features[feature]) redirect(`/upgrade?feature=${encodeURIComponent(feature)}`);
  return ent;
}

/** One readable sentence from an API error. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const fieldErrors = e.body?.issues?.fieldErrors as Record<string, string[]> | undefined;
    if (fieldErrors) {
      const [field, msgs] = Object.entries(fieldErrors)[0] ?? [];
      if (field && msgs?.[0]) return `${field}: ${msgs[0]}`;
    }
    const cf = e.body?.errors as Record<string, string> | undefined;
    if (cf) return Object.values(cf)[0] ?? e.message;
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return 'Could not reach the server. Try again in a moment';
}

export function money(amount: number | null | undefined, currency = 'INR') {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(safe);
}
