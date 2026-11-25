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
  HOTEL_RESTAURANT_POS: 'hotel.restaurant.pos',
  HOTEL_INVENTORY: 'hotel.inventory',
  HOTEL_RECIPES_BOM: 'hotel.recipes_bom',
  HOTEL_ACCOUNTING_GL: 'hotel.accounting_gl',
  HOTEL_DYNAMIC_PRICING: 'hotel.dynamic_pricing',
  HOTEL_BANQUETS: 'hotel.banquets',
  HOTEL_EXPENSES: 'hotel.expenses',
  HOTEL_MINIBAR: 'hotel.minibar',
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
    targetSegment: 'Homestays, B&Bs, Heritage Villas, Guesthouses (1 - 20 rooms)',
    monthlyPriceInr: 1499,
    maxRooms: 20,
    maxStaff: 3,
    features: [
      FEATURES.HOTEL_ROOMS,
      FEATURES.HOTEL_RESERVATIONS,
      FEATURES.HOTEL_TAPE_CHART,
      FEATURES.HOTEL_BILLING,
      FEATURES.HOTEL_COMPLIANCE,
      FEATURES.CORE_USERS,
    ],
    highlights: [
      'Visual Tape Chart Room Rack (Gantt timeline view)',
      'Direct Walk-in & Phone Hourly/Day Stays',
      'Instant Cashiering (NPCI Dynamic UPI QR, Cash & Card receipts)',
      'Commission-Free Direct Guest Booking Engine (/book)',
      'Statutory Daily Police Station Beat Report & BoI Form C',
      'Client-Side Aadhaar Masking & UIDAI ID Redaction Canvas',
    ],
  },
  {
    key: 'growth',
    name: 'Growth (Mid-Scale & Resort)',
    tagline: 'Full-cycle operations with restaurant POS, inventory, housekeeping & automated night audit.',
    targetSegment: 'Business Hotels, Heritage Havelis, Boutique Resorts (20 - 60 rooms)',
    monthlyPriceInr: 3799,
    maxRooms: 60,
    maxStaff: 10,
    badge: 'Most Popular',
    features: [
      FEATURES.HOTEL_ROOMS,
      FEATURES.HOTEL_RESERVATIONS,
      FEATURES.HOTEL_TAPE_CHART,
      FEATURES.HOTEL_BILLING,
      FEATURES.HOTEL_COMPLIANCE,
      FEATURES.CORE_USERS,
      FEATURES.HOTEL_HOUSEKEEPING,
      FEATURES.HOTEL_NIGHT_AUDIT,
      FEATURES.HOTEL_REPORTS_BASIC,
      FEATURES.HOTEL_RESTAURANT_POS,
      FEATURES.HOTEL_INVENTORY,
      FEATURES.HOTEL_EXPENSES,
      FEATURES.HOTEL_BANQUETS,
      FEATURES.HOTEL_MINIBAR,
      FEATURES.CORE_CUSTOM_FIELDS,
    ],
    highlights: [
      'Everything in Starter, plus:',
      'Aura Dine F&B Restaurant POS with Multi-Round KOTs & KDS',
      'Mobile-Ready Housekeeping Attendant Hub (1-Tap Turnaround)',
      'In-Room Minibar Billing Directly to Guest Folio',
      'Stores & Kitchen Raw Material Inventory with GRN Stock-In',
      'Front Desk Petty Cash Drawer & Approved Vendor Registry',
      'Banquet Halls & Event Space Scheduling with Billing',
      'Daily Automated 02:00 AM Night Audit & Business Date Rollover',
      'EDC POS Card Machine Integration (Pine Labs, Paytm, Innoviti)',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise Chain (Taj & Luxury Edition)',
    tagline: 'Multi-property governance, double-entry GL accounting, recipe BOM depletion & 2-way OTAs.',
    targetSegment: 'Luxury Hotel Chains, 5-Star Palace Properties (Taj, Oberoi, ITC, Luxury Havelis)',
    monthlyPriceInr: 8999,
    maxRooms: null,
    maxStaff: null,
    badge: 'Taj & Luxury Chain Grade',
    features: [
      FEATURES.HOTEL_ROOMS,
      FEATURES.HOTEL_RESERVATIONS,
      FEATURES.HOTEL_TAPE_CHART,
      FEATURES.HOTEL_BILLING,
      FEATURES.HOTEL_COMPLIANCE,
      FEATURES.CORE_USERS,
      FEATURES.HOTEL_HOUSEKEEPING,
      FEATURES.HOTEL_NIGHT_AUDIT,
      FEATURES.HOTEL_REPORTS_BASIC,
      FEATURES.HOTEL_REPORTS_ADVANCED,
      FEATURES.HOTEL_RESTAURANT_POS,
      FEATURES.HOTEL_INVENTORY,
      FEATURES.HOTEL_EXPENSES,
      FEATURES.HOTEL_BANQUETS,
      FEATURES.HOTEL_MINIBAR,
      FEATURES.HOTEL_RECIPES_BOM,
      FEATURES.HOTEL_ACCOUNTING_GL,
      FEATURES.HOTEL_DYNAMIC_PRICING,
      FEATURES.HOTEL_CHANNEL_MANAGER,
      FEATURES.HOTEL_KEYCARDS,
      FEATURES.HOTEL_CORPORATE_LEDGER,
      FEATURES.HOTEL_CRS,
      FEATURES.HOTEL_LOYALTY,
      FEATURES.HOTEL_POS,
      FEATURES.CORE_CUSTOM_FIELDS,
      FEATURES.CORE_SSO,
      FEATURES.CORE_AUDIT_EXPORT,
      FEATURES.CORE_API_ACCESS,
    ],
    highlights: [
      'Everything in Growth, plus:',
      'Double-Entry General Ledger with Live Trial Balance, P&L & Balance Sheet',
      'Recipe Bill of Materials (BOM) with Automated Kitchen Depletion & Live Margins',
      'Dynamic Pricing Rules Engine (RMS) with Occupancy Surge Multipliers',
      'Two-Way OTA Channel Manager (MakeMyTrip, Booking.com, Agoda, Expedia)',
      'W3C Web Serial RFID Keycard Encoder Hardware Integration (MIFARE 1K)',
      'Corporate City Ledger & B2B Accounts Receivable (30/60/90 Day Aging)',
      'Multi-Property Portfolio Governance & Instant Switching (/super-admin)',
      'Unlimited Rooms, Unlimited Staff Logins, Priority 24/7 SLA',
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
  PROPERTY_BANKING_MANAGE: 'property.banking.manage',
  POS_TERMINAL_MANAGE: 'pos.terminal.manage',
  RESTAURANT_VIEW: 'restaurant.view',
  RESTAURANT_ORDER: 'restaurant.order',
  RESTAURANT_MANAGE: 'restaurant.manage',
  KEYCARD_MANAGE: 'keycard.manage',
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_MANAGE: 'expenses.manage',
  BANQUET_VIEW: 'banquet.view',
  BANQUET_MANAGE: 'banquet.manage',
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
    PERMISSIONS.POS_TERMINAL_MANAGE,
    PERMISSIONS.RESTAURANT_VIEW, PERMISSIONS.RESTAURANT_ORDER, PERMISSIONS.RESTAURANT_MANAGE,
    PERMISSIONS.KEYCARD_MANAGE,
    PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.EXPENSES_MANAGE,
    PERMISSIONS.BANQUET_VIEW, PERMISSIONS.BANQUET_MANAGE,
  ],
  frontdesk: [
    PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_STATUS_UPDATE, PERMISSIONS.GUEST_READ, PERMISSIONS.GUEST_WRITE,
    PERMISSIONS.GUEST_DOCUMENT_METADATA_READ, PERMISSIONS.GUEST_DOCUMENT_WRITE, PERMISSIONS.GUEST_IDENTITY_DECRYPT,
    PERMISSIONS.RESERVATION_READ, PERMISSIONS.RESERVATION_WRITE,
    PERMISSIONS.BILLING_READ, PERMISSIONS.BILLING_CHARGE_POST, PERMISSIONS.BILLING_PAYMENT_COLLECT, PERMISSIONS.BILLING_INVOICE_ISSUE,
    PERMISSIONS.FORM_C_MANAGE, PERMISSIONS.POLICE_REPORT_EXPORT,
    PERMISSIONS.RESTAURANT_VIEW, PERMISSIONS.RESTAURANT_ORDER,
    PERMISSIONS.KEYCARD_MANAGE,
    PERMISSIONS.EXPENSES_VIEW, PERMISSIONS.EXPENSES_MANAGE,
    PERMISSIONS.BANQUET_VIEW, PERMISSIONS.BANQUET_MANAGE,
  ],
  housekeeping: [PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_STATUS_UPDATE, PERMISSIONS.KEYCARD_MANAGE],
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
