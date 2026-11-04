import type { FeatureKey } from '@erp/shared';

/** Plain-language names for the upgrade page. */
export const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  'hotel.rooms': 'Room inventory management',
  'hotel.reservations': 'Reservations & frontdesk stays',
  'hotel.tape_chart': 'Interactive Tape Chart Room Rack',
  'hotel.billing': 'Folio cashiering & GST tax invoices',
  'hotel.compliance': 'Daily Police Beat Sheet & BoI Form C',
  'hotel.housekeeping': 'Housekeeping board & room turns',
  'hotel.night_audit': 'Daily Night Audit & automated rollover',
  'hotel.reports_basic': 'Occupancy, ADR & RevPAR reports',
  'hotel.reports_advanced': 'Yield management & channel analytics',
  'hotel.corporate_ledger': 'Corporate City Ledger & B2B AR',
  'hotel.crs': 'Central Reservation System & Multi-Property',
  'hotel.keycards': 'RFID Keycard Encoder Integration',
  'hotel.loyalty': 'Central Guest Loyalty & Recognition',
  'hotel.pos': 'Multi-outlet restaurant & banquet POS',
  'hotel.channel_manager': '2-Way OTA Channel Manager (MMT/Agoda)',
  'core.users': 'Staff user accounts',
  'core.custom_fields': 'Custom guest fields & preferences',
  'core.api_access': 'Public developer REST API access',
  'core.sso': 'Enterprise Single Sign-On (SAML/Okta)',
  'core.audit_export': 'Audit trail compliance export',
};
