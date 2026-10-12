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

/** Stable action keys shared by API authorization and UI affordance checks. */
export const PERMISSIONS = {
  STAFF_READ: 'staff.read',
  STAFF_INVITE: 'staff.invite',
  STAFF_ASSIGN_ROLE: 'staff.role.assign',
  STAFF_DEACTIVATE: 'staff.deactivate',
  PROPERTY_CREATE: 'property.create',
  ROOM_READ: 'rooms.read',
  ROOM_CONFIGURATION_WRITE: 'rooms.configuration.write',
  ROOM_STATUS_UPDATE: 'rooms.status.update',
  ROOM_MAINTENANCE_MANAGE: 'rooms.maintenance.manage',
  GUEST_READ: 'guests.read',
  GUEST_WRITE: 'guests.write',
  GUEST_DOCUMENT_METADATA_READ: 'guests.documents.metadata.read',
  GUEST_DOCUMENT_WRITE: 'guests.documents.write',
  GUEST_DOCUMENT_IMAGE_READ: 'guests.documents.image.read',
  RESERVATION_READ: 'reservations.read',
  RESERVATION_WRITE: 'reservations.write',
  RESERVATION_PRICE_OVERRIDE: 'reservations.price.override',
  BILLING_REFUND: 'billing.refund',
  REPORTS_READ: 'reports.read',
  CUSTOM_FIELDS_WRITE: 'custom_fields.write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.STAFF_READ, PERMISSIONS.STAFF_INVITE, PERMISSIONS.STAFF_ASSIGN_ROLE, PERMISSIONS.STAFF_DEACTIVATE,
    PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_CONFIGURATION_WRITE, PERMISSIONS.ROOM_STATUS_UPDATE, PERMISSIONS.ROOM_MAINTENANCE_MANAGE,
    PERMISSIONS.GUEST_READ, PERMISSIONS.GUEST_WRITE, PERMISSIONS.GUEST_DOCUMENT_METADATA_READ, PERMISSIONS.GUEST_DOCUMENT_WRITE,
    PERMISSIONS.GUEST_DOCUMENT_IMAGE_READ, PERMISSIONS.RESERVATION_READ, PERMISSIONS.RESERVATION_WRITE,
    PERMISSIONS.RESERVATION_PRICE_OVERRIDE, PERMISSIONS.BILLING_REFUND, PERMISSIONS.REPORTS_READ,
    PERMISSIONS.CUSTOM_FIELDS_WRITE,
  ],
  frontdesk: [
    PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_STATUS_UPDATE, PERMISSIONS.GUEST_READ, PERMISSIONS.GUEST_WRITE,
    PERMISSIONS.GUEST_DOCUMENT_METADATA_READ, PERMISSIONS.GUEST_DOCUMENT_WRITE,
    PERMISSIONS.RESERVATION_READ, PERMISSIONS.RESERVATION_WRITE,
  ],
  housekeeping: [PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_STATUS_UPDATE],
};

export function roleHasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

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
  phone: string | null;
  role: Role;
  tenant: { id: string; slug: string; name: string; vertical: 'hotel' | 'hospital'; currency: string };
  property: { id: string; name: string; timezone: string; currency: string };
  properties: { id: string; name: string; role: Role }[];
}
