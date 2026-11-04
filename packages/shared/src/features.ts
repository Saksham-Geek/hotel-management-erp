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
  HOTEL_BILLING: 'hotel.billing',
  HOTEL_NIGHT_AUDIT: 'hotel.night_audit',
  HOTEL_COMPLIANCE: 'hotel.compliance',
  HOTEL_TAPE_CHART: 'hotel.tape_chart',
  HOTEL_REPORTS_BASIC: 'hotel.reports_basic',
  HOTEL_REPORTS_ADVANCED: 'hotel.reports_advanced',
  HOTEL_POS: 'hotel.pos',
  HOTEL_CHANNEL_MANAGER: 'hotel.channel_manager',
  HOTEL_CORPORATE_LEDGER: 'hotel.corporate_ledger',
  HOTEL_CRS: 'hotel.crs',
  HOTEL_KEYCARDS: 'hotel.keycards',
  HOTEL_LOYALTY: 'hotel.loyalty',
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

export const PLAN_KEYS = ['starter', 'growth', 'enterprise', 'basic', 'plus', 'premium'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export interface PlanTierConfig {
  key: PlanKey;
  name: string;
  tagline: string;
  targetSegment: string;
  monthlyPriceInr: number;
  maxRooms: number | null;
  maxStaff: number | null;
  badge?: string;
  features: readonly FeatureKey[];
  highlights: readonly string[];
}

export const HOSPITALITY_PLAN_TIERS: readonly PlanTierConfig[] = [
  {
    key: 'starter',
    name: 'Starter (Homestay & Small Hotel)',
    tagline: 'Streamlined operations for boutique homestays, bed & breakfasts, and budget hotels.',
    targetSegment: 'Homestays, B&Bs, Heritage Villas, Guesthouses (1 - 25 rooms)',
    monthlyPriceInr: 1999,
    maxRooms: 25,
    maxStaff: 3,
    features: [
      FEATURES.HOTEL_ROOMS,
      FEATURES.HOTEL_RESERVATIONS,
      FEATURES.HOTEL_TAPE_CHART,
      FEATURES.HOTEL_BILLING,
      FEATURES.HOTEL_COMPLIANCE,
    ],
    highlights: [
      'Visual Tape Chart Room Rack (Gantt timeline view)',
      'Direct Walk-in & Phone Reservations',
      'Instant Cashiering (UPI, Cash & Card receipts)',
      'Statutory Daily Police Station Beat Report',
      'Fast 5-Minute Onboarding, Zero Technical Training',
    ],
  },
  {
    key: 'growth',
    name: 'Growth (Mid-Scale & Resort)',
    tagline: 'Full-cycle property management with automated night audit, housekeeping & GST compliance.',
    targetSegment: 'Business Hotels, Heritage Havelis, Boutique Resorts (25 - 80 rooms)',
    monthlyPriceInr: 5999,
    maxRooms: 80,
    maxStaff: 15,
    badge: 'Most Popular',
    features: [
      FEATURES.HOTEL_ROOMS,
      FEATURES.HOTEL_RESERVATIONS,
      FEATURES.HOTEL_TAPE_CHART,
      FEATURES.HOTEL_BILLING,
      FEATURES.HOTEL_COMPLIANCE,
      FEATURES.HOTEL_HOUSEKEEPING,
      FEATURES.HOTEL_NIGHT_AUDIT,
      FEATURES.HOTEL_CHANNEL_MANAGER,
      FEATURES.HOTEL_REPORTS_BASIC,
      FEATURES.CORE_CUSTOM_FIELDS,
    ],
    highlights: [
      'Everything in Starter, plus:',
      'Daily Automated Night Audit & Day Close (Business Date Rollover)',
      'Housekeeping Status Board & Priority Room Cleaning',
      'Dual-Slab Indian GST Tax Invoicing (12% vs 18% with SAC Codes)',
      'Bureau of Immigration (BoI) Form C Foreigner Portal Filing',
      'ADR, RevPAR & Occupancy Flash Reports',
      'Room Service & Additional Charge Posting',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise Chain (Taj & Luxury Edition)',
    tagline: 'Multi-property portfolio governance, corporate AR city ledger, CRS & enterprise security.',
    targetSegment: 'Luxury Hotel Chains, 5-Star Palace Properties (Taj, Oberoi, ITC, Lemon Tree)',
    monthlyPriceInr: 19999,
    maxRooms: null,
    maxStaff: null,
    badge: 'Taj & Enterprise Grade',
    features: [
      FEATURES.HOTEL_ROOMS,
      FEATURES.HOTEL_RESERVATIONS,
      FEATURES.HOTEL_TAPE_CHART,
      FEATURES.HOTEL_BILLING,
      FEATURES.HOTEL_COMPLIANCE,
      FEATURES.HOTEL_HOUSEKEEPING,
      FEATURES.HOTEL_NIGHT_AUDIT,
      FEATURES.HOTEL_REPORTS_BASIC,
      FEATURES.HOTEL_REPORTS_ADVANCED,
      FEATURES.HOTEL_CORPORATE_LEDGER,
      FEATURES.HOTEL_CRS,
      FEATURES.HOTEL_KEYCARDS,
      FEATURES.HOTEL_LOYALTY,
      FEATURES.HOTEL_CHANNEL_MANAGER,
      FEATURES.HOTEL_POS,
      FEATURES.CORE_CUSTOM_FIELDS,
      FEATURES.CORE_SSO,
      FEATURES.CORE_AUDIT_EXPORT,
      FEATURES.CORE_API_ACCESS,
    ],
    highlights: [
      'Everything in Growth, plus:',
      'Multi-Property Portfolio Governance & Instant Property Switching',
      'Corporate City Ledger & B2B Accounts Receivable (30/60/90 Day Aging)',
      'Section 269ST Cash Freeze (₹2 Lakh limit) & Rule 114B PAN Validation',
      'NIC E-Invoicing Integration (IRN & Digitally Signed B2B QR Code)',
      'Central Reservation System (CRS) & 2-Way Channel Manager (MMT/Agoda/Booking.com)',
      'Multi-Outlet F&B Point of Sale (Restaurant, Bar, Banquets with KOT/KDS)',
      'RFID Keycard Encoder Hardware Integration (Assa Abloy / Salto / Dormakaba)',
      'Central Guest Loyalty & Lifetime Stay Recognition',
      'Enterprise SSO (SAML 2.0 / Okta / Azure AD) & Immutable Audit Log Export',
    ],
  },
];

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
  GUEST_IDENTITY_DECRYPT: 'guests.identity.decrypt',
  RESERVATION_READ: 'reservations.read',
  RESERVATION_WRITE: 'reservations.write',
  RESERVATION_PRICE_OVERRIDE: 'reservations.price.override',
  BILLING_READ: 'billing.read',
  BILLING_CHARGE_POST: 'billing.charge.post',
  BILLING_PAYMENT_COLLECT: 'billing.payment.collect',
  BILLING_INVOICE_ISSUE: 'billing.invoice.issue',
  BILLING_REFUND: 'billing.refund',
  NIGHT_AUDIT_EXECUTE: 'night_audit.execute',
  FORM_C_MANAGE: 'form_c.manage',
  POLICE_REPORT_EXPORT: 'police_report.export',
  CORPORATE_ACCOUNT_MANAGE: 'corporate_account.manage',
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
    PERMISSIONS.GUEST_DOCUMENT_IMAGE_READ, PERMISSIONS.GUEST_IDENTITY_DECRYPT, PERMISSIONS.RESERVATION_READ, PERMISSIONS.RESERVATION_WRITE,
    PERMISSIONS.RESERVATION_PRICE_OVERRIDE, PERMISSIONS.BILLING_READ, PERMISSIONS.BILLING_CHARGE_POST, PERMISSIONS.BILLING_PAYMENT_COLLECT,
    PERMISSIONS.BILLING_INVOICE_ISSUE, PERMISSIONS.BILLING_REFUND, PERMISSIONS.NIGHT_AUDIT_EXECUTE, PERMISSIONS.FORM_C_MANAGE,
    PERMISSIONS.POLICE_REPORT_EXPORT, PERMISSIONS.CORPORATE_ACCOUNT_MANAGE, PERMISSIONS.REPORTS_READ,
    PERMISSIONS.CUSTOM_FIELDS_WRITE,
  ],
  frontdesk: [
    PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_STATUS_UPDATE, PERMISSIONS.GUEST_READ, PERMISSIONS.GUEST_WRITE,
    PERMISSIONS.GUEST_DOCUMENT_METADATA_READ, PERMISSIONS.GUEST_DOCUMENT_WRITE, PERMISSIONS.GUEST_IDENTITY_DECRYPT,
    PERMISSIONS.RESERVATION_READ, PERMISSIONS.RESERVATION_WRITE,
    PERMISSIONS.BILLING_READ, PERMISSIONS.BILLING_CHARGE_POST, PERMISSIONS.BILLING_PAYMENT_COLLECT, PERMISSIONS.BILLING_INVOICE_ISSUE,
    PERMISSIONS.FORM_C_MANAGE, PERMISSIONS.POLICE_REPORT_EXPORT,
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
