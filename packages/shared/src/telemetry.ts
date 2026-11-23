export interface TelemetryDescriptor {
  page: string;
  feature: string;
  operation: string;
}

export interface TelemetryLogEntry extends TelemetryDescriptor {
  durationMs: number;
  timestamp: string;
  dbDurationMs?: number;
  status?: number;
  details?: string;
}

/**
 * Maps any page route pathname to a human-readable Page, Feature, and Operation.
 */
export function describePageRoute(pathname: string): TelemetryDescriptor {
  const cleanPath = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/';

  if (cleanPath === '/' || cleanPath === '/dashboard') {
    return {
      page: 'Executive Dashboard',
      feature: 'Front Desk KPIs',
      operation: 'Occupancy, ADR & Real-Time Pulse',
    };
  }
  if (cleanPath.startsWith('/tape-chart')) {
    return {
      page: 'Room Calendar',
      feature: 'Tape Chart',
      operation: 'Multi-Day Grid & Room Rack',
    };
  }
  if (cleanPath.startsWith('/reservations')) {
    return {
      page: 'Front Desk',
      feature: 'Guest Stays',
      operation: 'Active Reservations & Stays',
    };
  }
  if (cleanPath.startsWith('/rooms')) {
    return {
      page: 'Front Desk',
      feature: 'Room Rack',
      operation: 'Room Status & Cleanliness',
    };
  }
  if (cleanPath.startsWith('/restaurant/captain')) {
    return {
      page: 'Restaurant POS',
      feature: 'Captain Waiter',
      operation: 'Table Order Dispatch',
    };
  }
  if (cleanPath.startsWith('/restaurant')) {
    return {
      page: 'Restaurant POS',
      feature: 'Dining Floor & KOT',
      operation: 'Live Tables & Kitchen KDS',
    };
  }
  if (cleanPath.startsWith('/guest/room-service')) {
    return {
      page: 'Digital Guest',
      feature: 'Room Service',
      operation: 'In-Room QR Dining & Menu',
    };
  }
  if (cleanPath.startsWith('/channel-manager')) {
    return {
      page: 'Channel Manager',
      feature: 'OTA Distribution',
      operation: 'OTAs, Inventory & Sync Logs',
    };
  }
  if (cleanPath.startsWith('/billing')) {
    return {
      page: 'Cashiering & Billing',
      feature: 'Folios & Invoices',
      operation: 'Guest Folios & GST Invoices',
    };
  }
  if (cleanPath.startsWith('/income')) {
    return {
      page: 'Income & Revenue',
      feature: 'Financial Reports',
      operation: 'Departmental Revenue Analysis',
    };
  }
  if (cleanPath.startsWith('/night-audit')) {
    return {
      page: 'Night Audit',
      feature: 'Daily Closing',
      operation: 'Day End Roll & Revenue Post',
    };
  }
  if (cleanPath.startsWith('/housekeeping')) {
    return {
      page: 'Housekeeping',
      feature: 'Room Cleaning',
      operation: 'Cleaning Tasks & Turnaround',
    };
  }
  if (cleanPath.startsWith('/keycards')) {
    return {
      page: 'Door Locks & Keys',
      feature: 'Hardware Access',
      operation: 'RFID Encoders & Keycards',
    };
  }
  if (cleanPath.startsWith('/compliance')) {
    return {
      page: 'Statutory BoI & GST',
      feature: 'Police & Tax Governance',
      operation: 'Form-C BoI & GST Summary',
    };
  }
  if (cleanPath.startsWith('/marketing')) {
    return {
      page: 'Marketing & Loyalty',
      feature: 'Guest Retention',
      operation: 'Loyalty CRM & Promo Campaigns',
    };
  }
  if (cleanPath.startsWith('/guests')) {
    return {
      page: 'Guest CRM',
      feature: 'Guest Directory',
      operation: 'Guest KYC & Identity Vault',
    };
  }
  if (cleanPath.startsWith('/settings')) {
    return {
      page: 'Settings Hub',
      feature: 'Configuration & Setup',
      operation: 'Rooms, Outlets, UPI & Hardware',
    };
  }
  if (cleanPath.startsWith('/staff')) {
    return {
      page: 'Staff & Hierarchy',
      feature: 'Access Control',
      operation: 'Staff Roster & Shift Security',
    };
  }
  if (cleanPath.startsWith('/profile')) {
    return {
      page: 'User Profile',
      feature: 'Credentials',
      operation: 'Account Profile & Security',
    };
  }
  if (cleanPath.startsWith('/upgrade')) {
    return {
      page: 'Subscription Plans',
      feature: 'Tier Licensing',
      operation: 'Feature Entitlements & Plan Upgrades',
    };
  }
  if (cleanPath.startsWith('/guide')) {
    return {
      page: 'SOP & Guide',
      feature: 'Knowledge Base',
      operation: 'Operational Manuals & Training',
    };
  }
  if (cleanPath.startsWith('/super-admin')) {
    return {
      page: 'Super Admin',
      feature: 'Platform Governance',
      operation: 'System Metrics & Tenants',
    };
  }
  if (cleanPath.startsWith('/platform-admin')) {
    return {
      page: 'Platform Admin',
      feature: 'Tenant Provisioning',
      operation: 'Hotel Properties & Tenants',
    };
  }
  if (cleanPath.startsWith('/login')) {
    return {
      page: 'Staff Portal',
      feature: 'Authentication',
      operation: 'Staff Sign-In & OTP Entry',
    };
  }
  if (cleanPath.startsWith('/onboard')) {
    return {
      page: 'Hotel Onboarding',
      feature: 'Property Setup',
      operation: 'Workspace Registration',
    };
  }
  if (cleanPath.startsWith('/book/')) {
    return {
      page: 'Direct Booking Engine',
      feature: 'Guest Portal',
      operation: 'Direct Room Reservation',
    };
  }
  if (cleanPath.startsWith('/showcase')) {
    return {
      page: 'Demo Showcase',
      feature: 'Portfolio Preview',
      operation: 'Interactive Showcase Stays',
    };
  }
  if (cleanPath.startsWith('/forgot-password')) {
    return {
      page: 'Staff Portal',
      feature: 'Password Reset',
      operation: 'Request Recovery Link',
    };
  }
  if (cleanPath.startsWith('/reset-password')) {
    return {
      page: 'Staff Portal',
      feature: 'Password Reset',
      operation: 'Set New Password',
    };
  }
  if (cleanPath.startsWith('/verify-email')) {
    return {
      page: 'Staff Portal',
      feature: 'Email Verification',
      operation: 'Verify Work Email',
    };
  }

  // Fallback for custom or nested routes
  const segments = cleanPath.split('/').filter(Boolean);
  const title = segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  return {
    page: title || 'Application',
    feature: 'Navigation',
    operation: `View ${title || 'Home'} Page`,
  };
}

/**
 * Maps any backend API route or action path + HTTP method to a descriptive
 * Page, Feature, and Operation.
 */
export function describeApiRoute(rawPath: string, method: string = 'GET'): TelemetryDescriptor {
  const normMethod = method.toUpperCase();
  const urlPath = (rawPath.split('?')[0] || '/').replace(/\/$/, '') || '/';

  // Auth & Session
  if (urlPath === '/auth/login') {
    return { page: 'Staff Portal', feature: 'Authentication', operation: 'Password Sign-In' };
  }
  if (urlPath === '/auth/email-otp/send') {
    return { page: 'Staff Portal', feature: 'Email OTP', operation: 'Dispatch One-Time Login Code' };
  }
  if (urlPath === '/auth/email-otp/verify') {
    return { page: 'Staff Portal', feature: 'Email OTP', operation: 'Verify OTP & Issue Session Token' };
  }
  if (urlPath === '/auth/me') {
    return { page: 'Staff Portal', feature: 'Session', operation: 'Validate Session & User Profile' };
  }
  if (urlPath === '/auth/logout') {
    return { page: 'Staff Portal', feature: 'Session', operation: 'Invalidate Session Token' };
  }
  if (urlPath === '/auth/forgot-password') {
    return { page: 'Staff Portal', feature: 'Password Reset', operation: 'Send Password Reset Link' };
  }
  if (urlPath === '/auth/reset-password') {
    return { page: 'Staff Portal', feature: 'Password Reset', operation: 'Set New Password' };
  }

  // Entitlements
  if (urlPath === '/entitlements/me') {
    return { page: 'Entitlements Hub', feature: 'Feature Gates', operation: 'Fetch Active Plan Entitlements' };
  }
  if (urlPath === '/entitlements/plans') {
    return { page: 'Entitlements Hub', feature: 'Plan Catalog', operation: 'Fetch Available Tiers & Pricing' };
  }

  // Tape Chart & Room Calendar
  if (urlPath === '/hotel/tape-chart') {
    return { page: 'Room Calendar', feature: 'Tape Chart', operation: 'Fetch Availability & Stays Grid' };
  }

  // Reservations & Stays
  if (urlPath === '/hotel/reservations') {
    return normMethod === 'POST'
      ? { page: 'Front Desk', feature: 'Reservations', operation: 'Create Reservation / Direct Booking' }
      : { page: 'Front Desk', feature: 'Reservations', operation: 'Query Active Reservations & Stays' };
  }
  if (urlPath.match(/^\/hotel\/reservations\/[^/]+\/check-in$/)) {
    return { page: 'Front Desk', feature: 'Guest Stays', operation: 'Check-In Guest & Assign Physical Unit' };
  }
  if (urlPath.match(/^\/hotel\/reservations\/[^/]+\/check-out$/)) {
    return { page: 'Front Desk', feature: 'Guest Stays', operation: 'Check-Out Guest & Settle Balance' };
  }
  if (urlPath.match(/^\/hotel\/reservations\/[^/]+\/assign-room$/)) {
    return { page: 'Front Desk', feature: 'Room Allocation', operation: 'Assign Room Number' };
  }
  if (urlPath.match(/^\/hotel\/reservations\/[^/]+\/cancel$/)) {
    return { page: 'Front Desk', feature: 'Reservations', operation: 'Cancel Reservation' };
  }

  // Rooms & Inventory
  if (urlPath === '/hotel/room-types' || urlPath === '/hotel/rooms/types') {
    return normMethod === 'POST'
      ? { page: 'Settings Hub', feature: 'Room Types', operation: 'Create Room Type & Tariffs' }
      : { page: 'Settings Hub', feature: 'Room Types', operation: 'Fetch Room Types & Tariffs' };
  }
  if (urlPath === '/hotel/rooms') {
    return normMethod === 'POST'
      ? { page: 'Settings Hub', feature: 'Physical Rooms', operation: 'Create Physical Room' }
      : { page: 'Settings Hub', feature: 'Physical Rooms', operation: 'Fetch Physical Rooms Inventory' };
  }
  if (urlPath.match(/^\/hotel\/rooms\/[^/]+\/status$/)) {
    return { page: 'Room Rack', feature: 'Housekeeping', operation: 'Update Room Clean/Inspected Status' };
  }

  // Restaurant POS & F&B
  if (urlPath === '/hotel/restaurant/outlets') {
    return { page: 'Restaurant POS', feature: 'Dining Outlets', operation: 'Fetch F&B Outlets' };
  }
  if (urlPath === '/hotel/restaurant/tables') {
    return { page: 'Restaurant POS', feature: 'Floor Plan', operation: 'Fetch Dining Tables & Status' };
  }
  if (urlPath === '/hotel/restaurant/menu') {
    return { page: 'Restaurant POS', feature: 'Menu Catalog', operation: 'Fetch Menu Categories & Dishes' };
  }
  if (urlPath === '/hotel/restaurant/kots') {
    return normMethod === 'POST'
      ? { page: 'Restaurant POS', feature: 'Order Dispatch', operation: 'Fire KOT Order to Kitchen' }
      : { page: 'Restaurant POS', feature: 'Kitchen Orders', operation: 'Fetch Active KOT Tickets' };
  }
  if (urlPath.match(/^\/hotel\/restaurant\/kots\/[^/]+$/)) {
    return { page: 'Restaurant POS', feature: 'Kitchen Display', operation: 'Update KOT Ticket Status' };
  }
  if (urlPath.match(/^\/hotel\/restaurant\/orders\/[^/]+\/settle$/)) {
    return { page: 'Restaurant POS', feature: 'Billing Settlement', operation: 'Settle Dining Bill' };
  }
  if (urlPath.match(/^\/hotel\/restaurant\/orders\/[^/]+\/room-charge$/)) {
    return { page: 'Restaurant POS', feature: 'Room Posting', operation: 'Post Dining Bill to Room Folio' };
  }

  // Channel Manager
  if (urlPath === '/hotel/channels') {
    return { page: 'Channel Manager', feature: 'OTA Connections', operation: 'Fetch Connected Channels & Rates' };
  }
  if (urlPath === '/hotel/channels/logs') {
    return { page: 'Channel Manager', feature: 'Sync Logs', operation: 'Fetch Real-Time OTA Sync Logs' };
  }
  if (urlPath === '/hotel/channels/sync') {
    return { page: 'Channel Manager', feature: 'Inventory Sync', operation: 'Push Rates & Availability to OTAs' };
  }
  if (urlPath.match(/^\/hotel\/channels\/[^/]+\/test$/)) {
    return { page: 'Channel Manager', feature: 'Health Check', operation: 'Verify OTA Connection Credentials' };
  }

  // Billing & Folios
  if (urlPath === '/hotel/billing/folios') {
    return { page: 'Cashiering & Billing', feature: 'Guest Folios', operation: 'Fetch Active & Settled Folios' };
  }
  if (urlPath === '/hotel/billing/invoices') {
    return { page: 'Cashiering & Billing', feature: 'GST Invoices', operation: 'Fetch Indian GST Tax Invoices' };
  }
  if (urlPath.match(/^\/hotel\/billing\/folios\/[^/]+\/charges$/)) {
    return { page: 'Cashiering & Billing', feature: 'Folio Postings', operation: 'Post Charge to Guest Folio' };
  }
  if (urlPath.match(/^\/hotel\/billing\/folios\/[^/]+\/payments$/)) {
    return { page: 'Cashiering & Billing', feature: 'Payments', operation: 'Record Payment (UPI/Card/Cash)' };
  }

  // Dashboard & Metrics
  if (urlPath === '/hotel/dashboard/metrics') {
    return { page: 'Executive Dashboard', feature: 'KPI Metrics', operation: 'Fetch Occupancy, RevPAR & ADR' };
  }
  if (urlPath === '/hotel/dashboard/arrivals-departures') {
    return { page: 'Executive Dashboard', feature: 'Daily Movement', operation: 'Fetch Arrivals & Departures' };
  }

  // Night Audit
  if (urlPath === '/hotel/night-audit/status') {
    return { page: 'Night Audit', feature: 'Daily Closing', operation: 'Check Business Day Audit Status' };
  }
  if (urlPath === '/hotel/night-audit/close-day') {
    return { page: 'Night Audit', feature: 'Daily Closing', operation: 'Roll Business Date & Post Stays' };
  }

  // Compliance & BoI
  if (urlPath === '/hotel/compliance/c-form') {
    return { page: 'Statutory BoI & GST', feature: 'Police BoI', operation: 'Fetch Form-C Foreigner Records' };
  }
  if (urlPath === '/hotel/compliance/gst-summary') {
    return { page: 'Statutory BoI & GST', feature: 'GST Governance', operation: 'Generate GSTR-1 Tax Summary' };
  }

  // Guests & CRM
  if (urlPath === '/hotel/guests') {
    return normMethod === 'POST'
      ? { page: 'Guest CRM', feature: 'Guest Directory', operation: 'Save Guest KYC & ID Vault' }
      : { page: 'Guest CRM', feature: 'Guest Directory', operation: 'Query Guest Profiles & KYC' };
  }

  // Keycards & Locks
  if (urlPath === '/hotel/keycards/locks') {
    return { page: 'Door Locks & Keys', feature: 'Hardware Access', operation: 'Fetch Lock Hardware Status' };
  }
  if (urlPath === '/hotel/keycards/issue') {
    return { page: 'Door Locks & Keys', feature: 'RFID Encoder', operation: 'Issue RFID Keycard / Digital PIN' };
  }

  // Income & Marketing
  if (urlPath === '/hotel/income/reports') {
    return { page: 'Income & Revenue', feature: 'Revenue Reports', operation: 'Fetch Departmental Revenue Analysis' };
  }
  if (urlPath === '/hotel/marketing/campaigns') {
    return { page: 'Marketing & Loyalty', feature: 'Campaigns', operation: 'Fetch Loyalty & Promo Campaigns' };
  }

  // Users & Staff
  if (urlPath === '/users') {
    return normMethod === 'POST'
      ? { page: 'Staff & Hierarchy', feature: 'Access Control', operation: 'Invite / Create Staff Member' }
      : { page: 'Staff & Hierarchy', feature: 'Staff Directory', operation: 'Fetch Staff Members & Roles' };
  }

  // Properties & Tenants
  if (urlPath === '/properties') {
    return normMethod === 'POST'
      ? { page: 'Organization', feature: 'Properties', operation: 'Create Hotel Branch Property' }
      : { page: 'Organization', feature: 'Properties', operation: 'Fetch Organization Properties' };
  }

  // Direct Booking & Public
  if (urlPath.startsWith('/public/hotels/')) {
    return { page: 'Direct Booking Engine', feature: 'Hotel Profile', operation: 'Fetch Public Hotel Catalog' };
  }
  if (urlPath === '/public/reservations') {
    return { page: 'Direct Booking Engine', feature: 'Reservation', operation: 'Submit Direct Guest Booking' };
  }

  // Client-side Next.js internal API routes
  if (urlPath.startsWith('/api/export/gstr-1')) {
    return { page: 'Statutory BoI & GST', feature: 'Tax Export', operation: 'Download GSTR-1 Excel File' };
  }
  if (urlPath.startsWith('/api/export/tally-xml')) {
    return { page: 'Statutory BoI & GST', feature: 'Accounting Export', operation: 'Download Tally XML File' };
  }
  if (urlPath.includes('/payment-status')) {
    return { page: 'Cashiering & Billing', feature: 'UPI QR', operation: 'Poll Dynamic UPI Payment Status' };
  }
  if (urlPath.includes('/simulate-payment')) {
    return { page: 'Cashiering & Billing', feature: 'UPI Simulation', operation: 'Simulate UPI Payment Webhook' };
  }
  if (urlPath.includes('/guest/room-service/order')) {
    return { page: 'Digital Guest', feature: 'Room Service', operation: 'Submit Digital Room Service Order' };
  }

  // Fallback heuristic based on URL segments
  const parts = urlPath.replace(/^\/(hotel|api)\//, '').split('/').filter(Boolean);
  const featureName = parts[0]
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, ' ')
    : 'Core';
  const opName = `${normMethod} ${urlPath}`;

  return {
    page: 'Hotel Operations',
    feature: featureName,
    operation: opName,
  };
}

/**
 * Format a unified telemetry console string.
 * Example: `[Room Calendar] - [Tape Chart] - Fetch Availability & Stays Grid (done in 35ms)`
 */
export function formatTelemetryLog(
  desc: TelemetryDescriptor,
  durationMs: number,
  dbDurationMs?: number,
): string {
  const rounded = Math.round(durationMs);
  const dbPart = typeof dbDurationMs === 'number' && dbDurationMs >= 0 ? ` | DB: ${Math.round(dbDurationMs)}ms` : '';
  return `[${desc.page}] - [${desc.feature}] - ${desc.operation} (done in ${rounded}ms${dbPart})`;
}
