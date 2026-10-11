import type { FeatureKey } from '@erp/shared';

/** Plain-language names for the upgrade page. */
export const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  'hotel.housekeeping': 'Housekeeping board',
  'hotel.reports_basic': 'Occupancy and revenue reports',
  'hotel.reports_advanced': 'Advanced analytics',
  'hotel.pos': 'Restaurant and spa billing',
  'hotel.channel_manager': 'Booking-site sync',
  'core.custom_fields': 'Custom guest fields',
  'core.api_access': 'API access',
  'core.sso': 'Single sign-on',
  'core.audit_export': 'Audit trail export',
};
