/**
 * Single list of feature keys used by guards (API) and gates (web).
 * The same keys are seeded into the `features` table (db/migrations/003_seed_catalog.sql).
 * Which plan gets which feature lives in the DB, not here, so plans can change without a deploy.
 */
export const FEATURES = {
  CORE_USERS: 'core.users',
  CORE_CUSTOM_FIELDS: 'core.custom_fields',
  CORE_API_ACCESS: 'core.api_access',
  CORE_AUDIT_EXPORT: 'core.audit_export',
  CORE_SSO: 'core.sso',
  HOTEL_ROOMS: 'hotel.rooms',
  HOTEL_RESERVATIONS: 'hotel.reservations',
  HOTEL_HOUSEKEEPING: 'hotel.housekeeping',
  HOTEL_REPORTS_BASIC: 'hotel.reports_basic',
  HOTEL_REPORTS_ADVANCED: 'hotel.reports_advanced',
  HOTEL_POS: 'hotel.pos',
  HOTEL_CHANNEL_MANAGER: 'hotel.channel_manager',
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

export const PLAN_KEYS = ['basic', 'plus', 'premium', 'enterprise'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const ROLES = ['owner', 'manager', 'frontdesk', 'housekeeping'] as const;
export type Role = (typeof ROLES)[number];

export interface EntitlementsDto {
  plan: PlanKey | null;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';
  /** true when the account may read but not change data (past due / expired trial) */
  readOnly: boolean;
  features: Partial<Record<FeatureKey, { limit: number | null }>>;
}

export interface MeDto {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  tenant: { id: string; slug: string; name: string; vertical: 'hotel' | 'hospital'; currency: string };
  property: { id: string; name: string; timezone: string; currency: string };
  properties: { id: string; name: string; role: Role }[];
}
