import { z } from 'zod';
import { PLAN_KEYS, ROLES } from './features';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');

export const loginSchema = z.object({
  tenant: z.string().min(2).max(41),
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export const createUserSchema = z.object({
  email: z.string().email().max(200),
  fullName: z.string().min(1).max(120),
  role: z.enum(ROLES).refine((r) => r !== 'owner', 'Only the account owner can be an owner'),
  password: z.string().min(10, 'Use at least 10 characters').max(200),
});

export const updateOwnProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(120),
  phone: z.string().trim().max(30).transform((value) => value || null)
    .refine((value) => value === null || (/^\+?[0-9 ().-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15), 'Enter a valid phone number with 7 to 15 digits.'),
});

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().email('Enter a valid email address').max(200).transform((value) => value.toLowerCase()),
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
});

export const verifyEmailChangeSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/, 'This verification link is invalid or expired.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
  newPassword: z.string().min(10, 'Use at least 10 characters').max(200),
  confirmPassword: z.string().min(10).max(200),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'The new passwords do not match.',
});

export const requestPasswordResetSchema = z.object({
  tenant: z.string().trim().min(2).max(41),
  email: z.string().trim().email('Enter a valid email address').max(200).transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/, 'This reset link is invalid or expired.'),
  newPassword: z.string().min(10, 'Use at least 10 characters').max(200),
  confirmPassword: z.string().min(10).max(200),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'The new passwords do not match.',
});

export const switchPlanSchema = z.object({
  planKey: z.enum(PLAN_KEYS),
});

export type SwitchPlanInput = z.infer<typeof switchPlanSchema>;

export const createRoomTypeSchema = z.object({
  name: z.string().min(1).max(80),
  baseRate: z.coerce.number().min(0).max(10_000_000),
  hourlyRate: z.coerce.number().min(0).max(10_000_000).optional(),
  capacity: z.coerce.number().int().min(1).max(20).default(2),
  description: z.string().max(500).optional(),
});

export const createRoomSchema = z.object({
  roomTypeId: z.string().uuid(),
  number: z.string().min(1).max(20),
  floor: z.coerce.number().int().min(-5).max(200).default(0),
  baseRate: z.coerce.number().min(0).max(10_000_000).optional(),
  hourlyRate: z.coerce.number().min(0).max(10_000_000).optional(),
});

const nullableRateValue = z.union([
  z.null(),
  z.coerce.number().min(0).max(10_000_000),
]);

export const updateRoomTypeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  baseRate: z.coerce.number().min(0).max(10_000_000).optional(),
  hourlyRate: nullableRateValue.optional(),
  capacity: z.coerce.number().int().min(1).max(20).optional(),
  description: z.string().max(500).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Change at least one room type field');

export const updateRoomSchema = z.object({
  roomTypeId: z.string().uuid().optional(),
  number: z.string().min(1).max(20).optional(),
  floor: z.coerce.number().int().min(-5).max(200).optional(),
  baseRate: nullableRateValue.optional(),
  hourlyRate: nullableRateValue.optional(),
}).refine((value) => Object.keys(value).length > 0, 'Change at least one room field');

export const ROOM_STATUSES = ['available', 'occupied', 'cleaning', 'maintenance'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];
export const updateRoomStatusSchema = z.object({ status: z.enum(ROOM_STATUSES) });

const guestProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  phone: z.string().trim().min(7, 'Phone number is required and must contain at least 7 digits').max(30)
    .regex(/^\+?[0-9 ().-]+$/, 'Enter a valid phone number')
    .refine((phone) => phone.replace(/\D/g, '').length >= 7 && phone.replace(/\D/g, '').length <= 15, 'Phone number must contain 7 to 15 digits'),
  email: z.string().email().max(200).optional().or(z.literal('').transform(() => undefined)),
  nationality: z.string().max(60).optional(),
  idType: z.string().max(40).optional(),
  idNumber: z.string().max(60).optional(),
  vip: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
  customFields: z.record(z.unknown()).default({}),
});

const validateGuestIdentity = (guest: { idType?: string; idNumber?: string }, ctx: z.RefinementCtx) => {
  if (guest.idType?.toLocaleLowerCase() === 'aadhaar' && guest.idNumber && !/^\d{4}$/.test(guest.idNumber.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['idNumber'], message: 'For Aadhaar, store only the last four digits.' });
  }
};

export const createGuestSchema = guestProfileSchema.superRefine(validateGuestIdentity);
export const updateGuestSchema = guestProfileSchema.partial().superRefine(validateGuestIdentity);

export const guestIdentityAttachmentSchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64: z.string().min(1),
  documentType: z.enum(['aadhaar_masked', 'passport', 'driving_license', 'voter_id', 'other']),
  consentGiven: z.literal(true),
  consentMethod: z.enum(['written', 'verbal', 'digital']),
  aadhaarMasked: z.boolean().default(false),
}).superRefine((attachment, ctx) => {
  if (attachment.documentType === 'aadhaar_masked' && !attachment.aadhaarMasked) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['aadhaarMasked'], message: 'Confirm the Aadhaar image has the first eight digits masked.' });
  }
});

const reservationGuestSchema = guestProfileSchema.extend({
  idType: z.enum(['aadhaar', 'passport', 'driving_license', 'voter_id', 'other']),
  idNumber: z.string().trim().min(1, 'Identity number is required').max(60),
  identityDocument: guestIdentityAttachmentSchema,
}).superRefine((guest, ctx) => {
  validateGuestIdentity(guest, ctx);
  const expectedType = guest.idType === 'aadhaar' ? 'aadhaar_masked' : guest.idType;
  if (guest.identityDocument.documentType !== expectedType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['identityDocument', 'documentType'], message: 'Uploaded document category must match the identity type.' });
  }
});

export const createReservationSchema = z
  .object({
    guestId: z.string().uuid().optional(),
    newGuest: reservationGuestSchema.optional(),
    guestIds: z.array(z.string().uuid()).max(19).optional().default([]),
    newCompanions: z.array(reservationGuestSchema).max(19).optional().default([]),
    existingGuestDocuments: z.array(z.object({ guestId: z.string().uuid(), attachment: guestIdentityAttachmentSchema })).max(20).optional().default([]),
    roomId: z.string().uuid(),
    checkIn: isoDate,
    checkOut: isoDate,
    checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    rateMode: z.enum(['nightly','hourly']).default('nightly'),
    priceOverride: z.coerce.number().min(0).max(100_000_000).optional(),
    hourlyRateOverride: z.coerce.number().min(0).max(10_000_000).optional(),
    unitRateOverride: z.coerce.number().min(0).max(10_000_000).optional(),
    overrideReason: z.string().max(300).optional(),
  })
  .refine((v) => v.guestIds.length + v.newCompanions.length <= 19, { path: ['newCompanions'], message: 'A reservation can include up to 20 guests including the primary guest.' })
  .refine((v) => new Set(v.existingGuestDocuments.map((item) => item.guestId)).size === v.existingGuestDocuments.length, { path: ['existingGuestDocuments'], message: 'Only one identity upload per selected guest is allowed.' })
  .refine((v) => (!!v.guestId !== !!v.newGuest), { path: ['guestId'], message: 'Select an existing guest or enter a new guest profile.' })
  .refine((v) => v.checkOut > v.checkIn || (v.checkOut === v.checkIn && v.rateMode === 'hourly' && !!v.checkInTime && !!v.checkOutTime && v.checkOutTime > v.checkInTime), { path: ['checkOut'], message: 'Check-out must be after check-in' })
  .refine((v) => v.rateMode !== 'hourly' || (!!v.checkInTime && !!v.checkOutTime), { path: ['checkInTime'], message: 'Hourly bookings require check-in and check-out times' })
  .refine((v) => (v.priceOverride === undefined && v.hourlyRateOverride === undefined && v.unitRateOverride === undefined) || !!v.overrideReason?.trim(), { path: ['overrideReason'], message: 'A reason is required for a manual rate or total price override' })
  .refine((v) => [v.priceOverride, v.hourlyRateOverride, v.unitRateOverride].filter((value) => value !== undefined).length <= 1, { path: ['unitRateOverride'], message: 'Use only one manual price override.' })
  .refine((v) => v.hourlyRateOverride === undefined || v.rateMode === 'hourly', { path: ['hourlyRateOverride'], message: 'An hourly rate override can only be used for hourly reservations.' });

export const RESERVATION_STATUSES = ['reserved', 'checked_in', 'checked_out', 'cancelled'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const customFieldDefinitionSchema = z.object({
  entity: z.enum(['guest']),
  key: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/, 'Lowercase letters, digits and underscores'),
  label: z.string().min(1).max(80),
  fieldType: z.enum(['text', 'number', 'date', 'boolean', 'select']),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(80)).max(50).optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const postFolioChargeSchema = z.object({
  category: z.enum(['ACCOMMODATION', 'FNB_REST', 'FNB_ROOM_SERVICE', 'LAUNDRY', 'SPA', 'OTHER']).default('ACCOMMODATION'),
  description: z.string().trim().min(1, 'Description is required').max(120),
  quantity: z.coerce.number().finite('Quantity must be a valid number').min(0.01).max(1000).default(1),
  unitPrice: z.coerce.number().finite('Unit price must be a valid number').min(0).max(10_000_000),
  isInterstate: z.boolean().default(false),
});

export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const collectFolioPaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'corporate_ledger', 'pos_machine', 'other']),
  amount: z.coerce.number().finite('Amount must be a valid number').min(0.01).max(100_000_000),
  reference: z.string().trim().max(100).optional(),
  payerGuestId: z.string().uuid().optional(),
  corporateAccountId: z.string().uuid().optional(),
  panNumber: z.string().trim().toUpperCase().optional().transform((v) => v || undefined),
  notes: z.string().trim().max(300).optional(),
  // POS Hardware Machine Fields
  posTerminalId: z.string().uuid().optional(),
  cardBrand: z.string().trim().max(40).optional(),
  cardLastFour: z.string().trim().max(4).optional(),
  bankRrn: z.string().trim().max(30).optional(),
  authCode: z.string().trim().max(30).optional(),
  posSlipData: z.record(z.any()).optional(),
}).superRefine((data, ctx) => {
  if (data.method === 'cash') {
    if (data.amount >= 200_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Under Section 269ST, cash payments of ₹2,00,000 or more are prohibited. Settle via Card/UPI/Bank Transfer.',
      });
    }
    if (data.amount > 50_000 && (!data.panNumber || !panRegex.test(data.panNumber))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['panNumber'],
        message: 'Under Rule 114B of the Income Tax Act, cash payments exceeding ₹50,000 require a valid PAN card number.',
      });
    }
  }
  if (data.method === 'corporate_ledger' && !data.corporateAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['corporateAccountId'],
      message: 'Select a corporate company account for direct ledger billing.',
    });
  }
});

export const issueTaxInvoiceSchema = z.object({
  invoiceType: z.enum(['B2C', 'B2B', 'CREDIT_NOTE', 'DEBIT_NOTE']).default('B2C'),
  guestGstin: z.string().trim().toUpperCase().optional().transform((v) => v || undefined),
  guestCompanyName: z.string().trim().max(120).optional().transform((v) => v || undefined),
  placeOfSupplyStateCode: z.string().regex(/^[0-9]{2}$/, 'Enter a 2-digit Indian State code (e.g. 27 for Maharashtra)').default('27'),
  isInterstate: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.invoiceType === 'B2B') {
    if (!data.guestGstin || !gstinRegex.test(data.guestGstin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guestGstin'],
        message: 'A valid 15-character GSTIN is required for B2B tax invoices.',
      });
    }
    if (!data.guestCompanyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guestCompanyName'],
        message: 'Company name is required for B2B invoices.',
      });
    }
  }
});

export const createFormCSchema = z.object({
  reservationId: z.string().uuid(),
  guestId: z.string().uuid(),
  passportNumber: z.string().trim().min(3).max(30),
  passportCountry: z.string().trim().min(2).max(60),
  passportIssueDate: isoDate,
  passportExpiryDate: isoDate,
  visaNumber: z.string().trim().min(3).max(30),
  visaType: z.string().trim().min(1).max(30),
  visaValidUntil: isoDate,
  visaIssuePlace: z.string().trim().min(2).max(60),
  arrivalDateInIndia: isoDate,
  arrivedFromCityCountry: z.string().trim().min(2).max(100),
  nextDestinationCityCountry: z.string().trim().min(2).max(100),
  purposeOfVisit: z.enum(['tourism', 'business', 'medical', 'conference', 'employment', 'other']).default('tourism'),
  employedInIndia: z.boolean().default(false),
});

export const createCorporateAccountSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required').max(120),
  gstin: z.string().trim().toUpperCase().optional().transform((v) => v || undefined),
  panNumber: z.string().trim().toUpperCase().optional().transform((v) => v || undefined),
  contactPerson: z.string().trim().max(100).optional(),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal('').transform(() => undefined)),
  contactPhone: z.string().trim().max(30).optional(),
  creditLimit: z.coerce.number().finite('Credit limit must be a valid number').min(0).max(100_000_000).default(0),
  creditPeriodDays: z.coerce.number().int().min(0).max(180).default(30),
  billingAddress: z.record(z.unknown()).default({}),
}).superRefine((data, ctx) => {
  if (data.gstin && !gstinRegex.test(data.gstin)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gstin'], message: 'Enter a valid 15-character GSTIN' });
  }
  if (data.panNumber && !panRegex.test(data.panNumber)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['panNumber'], message: 'Enter a valid 10-character PAN' });
  }
});

export type PostFolioChargeInput = z.infer<typeof postFolioChargeSchema>;
export type CollectFolioPaymentInput = z.infer<typeof collectFolioPaymentSchema>;
export type IssueTaxInvoiceInput = z.infer<typeof issueTaxInvoiceSchema>;
export type CreateFormCInput = z.infer<typeof createFormCSchema>;
export type CreateCorporateAccountInput = z.infer<typeof createCorporateAccountSchema>;

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type GuestIdentityAttachment = z.infer<typeof guestIdentityAttachmentSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CustomFieldDefinitionInput = z.infer<typeof customFieldDefinitionSchema>;

// --- OTA Channel Manager Schemas ---

export const otaChannelKeys = ['makemytrip', 'booking_com', 'agoda', 'expedia', 'airbnb'] as const;
export type OtaChannelKey = (typeof otaChannelKeys)[number];

export const saveOtaConnectionSchema = z.object({
  channelKey: z.enum(otaChannelKeys),
  channelName: z.string().trim().min(2).max(100),
  hotelCode: z.string().trim().min(1, 'Property/Hotel ID on channel is required').max(100),
  apiKey: z.string().trim().optional(),
  apiSecret: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  syncMode: z.enum(['two_way', 'inbound_only', 'outbound_only']).default('two_way'),
  commissionRate: z.coerce.number().finite().min(0).max(100).default(15),
});

export const simulateOtaBookingSchema = z.object({
  channelKey: z.enum(otaChannelKeys),
  guestName: z.string().trim().min(2, 'Guest name is required'),
  guestPhone: z.string().trim().optional(),
  guestEmail: z.string().trim().email().optional().or(z.literal('')),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD required'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD required'),
  roomTypeId: z.string().uuid().optional(),
  totalAmount: z.coerce.number().finite().min(1, 'Amount must be greater than zero'),
  commissionRate: z.coerce.number().finite().min(0).max(100).default(15),
});

export type SaveOtaConnectionInput = z.infer<typeof saveOtaConnectionSchema>;
export type SimulateOtaBookingInput = z.infer<typeof simulateOtaBookingSchema>;

// --- Enterprise Delegation & Staff Provisioning Schemas ---

export const createStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  role: z.enum(['owner', 'manager', 'frontdesk', 'housekeeping']),
  department: z.string().trim().min(2).max(80).default('Front Office'),
  shift: z.string().trim().min(2).max(80).default('General'),
  password: z.string().min(8, 'Use at least 8 characters').max(200).default('HotelStaff123!'),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

// --- Guest Loyalty & Marketing Schemas ---

export const loyaltyTiers = ['bronze', 'silver', 'gold', 'platinum', 'kohinoor'] as const;
export type LoyaltyTier = (typeof loyaltyTiers)[number];

export const sendReviewRequestSchema = z.object({
  guestId: z.string().uuid(),
  reservationId: z.string().uuid().optional(),
  channel: z.enum(['whatsapp', 'email', 'sms']).default('whatsapp'),
  recipientPhone: z.string().trim().optional(),
  recipientEmail: z.string().trim().email().optional().or(z.literal('')),
  customMessage: z.string().trim().max(1000).optional(),
  platform: z.enum(['google', 'tripadvisor', 'direct_nps']).default('google'),
});

export const createMarketingCampaignSchema = z.object({
  title: z.string().trim().min(3, 'Campaign title must be at least 3 characters').max(120),
  campaignType: z.enum(['repeat_booking', 'inactive_reengagement', 'festive_offer', 'vip_loyalty', 'corporate_renewal']),
  channel: z.enum(['whatsapp', 'email']).default('whatsapp'),
  audienceSegment: z.enum(['all_guests', 'recent_checkouts', 'inactive_90_days', 'vip_platinum', 'corporate']),
  templateMessage: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
  discountCode: z.string().trim().max(30).optional(),
});

export const updateGuestLoyaltySchema = z.object({
  tier: z.enum(loyaltyTiers).optional(),
  preferences: z.record(z.any()).optional(),
  anniversaryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  birthdayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  pointsAdjustment: z.number().int().optional(),
});

export type SendReviewRequestInput = z.infer<typeof sendReviewRequestSchema>;
export type CreateMarketingCampaignInput = z.infer<typeof createMarketingCampaignSchema>;
export type UpdateGuestLoyaltyInput = z.infer<typeof updateGuestLoyaltySchema>;

export const updateUpiSettingsSchema = z.object({
  upiId: z
    .string()
    .trim()
    .min(3, 'UPI ID must be at least 3 characters')
    .max(120, 'UPI ID cannot exceed 120 characters')
    .regex(
      /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,64}$/,
      'Enter a valid UPI ID (e.g. hotel@hdfcbank or 9876543210@paytm)',
    ),
  upiMerchantName: z.string().trim().min(2, 'Merchant name must be at least 2 characters').max(120).optional(),
});
export type UpdateUpiSettingsInput = z.infer<typeof updateUpiSettingsSchema>;

// --- Hardware POS Terminal (EDC Machine) Integration Schemas ---

export const posProviderEnum = z.enum([
  'pine_labs',
  'paytm_edc',
  'razorpay_pos',
  'innoviti',
  'ingenico_lan',
  'generic_serial',
  'generic_ip',
]);
export type PosProvider = z.infer<typeof posProviderEnum>;

export const posConnectionTypeEnum = z.enum(['cloud_lan', 'local_ip', 'web_serial', 'standalone']);
export type PosConnectionType = z.infer<typeof posConnectionTypeEnum>;

export const createPosTerminalSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  terminalId: z.string().trim().min(3, 'Terminal ID (TID) must be at least 3 characters').max(50),
  merchantId: z.string().trim().max(50).optional(),
  provider: posProviderEnum.default('pine_labs'),
  connectionType: posConnectionTypeEnum.default('cloud_lan'),
  ipAddress: z.string().trim().max(60).optional(),
  port: z.coerce.number().int().min(1).max(65535).default(8080),
  serialBaudRate: z.coerce.number().int().default(115200),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});
export type CreatePosTerminalInput = z.infer<typeof createPosTerminalSchema>;

export const updatePosTerminalSchema = createPosTerminalSchema.partial().extend({
  status: z.enum(['online', 'offline', 'busy', 'maintenance']).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePosTerminalInput = z.infer<typeof updatePosTerminalSchema>;

export const initiatePosChargeSchema = z.object({
  terminalId: z.string().uuid('Select a valid connected POS terminal'),
  folioId: z.string().uuid(),
  amount: z.coerce.number().finite().min(1, 'Amount must be at least ₹1.00').max(100_000_000),
  currency: z.string().default('INR'),
  reference: z.string().optional(),
});
export type InitiatePosChargeInput = z.infer<typeof initiatePosChargeSchema>;

export interface PosChargeResponse {
  status: 'SUCCESS' | 'DECLINED' | 'CANCELLED' | 'TIMEOUT';
  terminalId: string;
  terminalName: string;
  provider: string;
  amount: number;
  currency: string;
  bankRrn: string;
  authCode: string;
  cardBrand: string;
  cardLastFour: string;
  cardholderName?: string;
  batchNumber: string;
  invoiceNumber: string;
  slipData: {
    merchantName: string;
    merchantId?: string;
    terminalId: string;
    dateTime: string;
    aid?: string;
    tvr?: string;
    cardBrand: string;
    maskedPan: string;
    authCode: string;
    rrn: string;
    amount: number;
    currency: string;
    entryMode: 'EMV_CHIP' | 'CONTACTLESS_NFC' | 'MAGSTRIPE';
    verificationMethod: 'PIN_VERIFIED' | 'SIGNATURE_VERIFIED' | 'NO_PIN_NFC';
  };
}

// -------------------------------------------------------------
// Phase 2: Restaurant POS & KOT (Petpooja-Grade) Schemas
// -------------------------------------------------------------

export const kotItemSchema = z.object({
  menuItemId: z.string().uuid(),
  itemName: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().int().min(1).max(50),
  unitPrice: z.coerce.number().finite().min(0).max(1_000_000),
  gstRate: z.coerce.number().finite().default(5.00),
  foodType: z.enum(['veg', 'non_veg', 'egg']).default('veg'),
  specialNotes: z.string().trim().max(200).optional(),
});
export type KotItemInput = z.infer<typeof kotItemSchema>;

export const createKotOrderSchema = z.object({
  outletId: z.string().uuid(),
  tableId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  roomNumber: z.string().trim().max(20).optional(),
  orderType: z.enum(['dine_in', 'room_service', 'takeaway']).default('dine_in'),
  guestName: z.string().trim().max(100).optional(),
  serverName: z.string().trim().max(100).optional(),
  specialInstructions: z.string().trim().max(500).optional(),
  items: z.array(kotItemSchema).min(1, 'Order must contain at least 1 food or beverage item'),
});
export type CreateKotOrderInput = z.infer<typeof createKotOrderSchema>;

export const updateKotStatusSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'served', 'settled', 'cancelled']),
});
export type UpdateKotStatusInput = z.infer<typeof updateKotStatusSchema>;

export const chargeKotToRoomSchema = z.object({
  reservationId: z.string().uuid('Valid active room reservation is required'),
  roomNumber: z.string().trim().min(1),
  guestName: z.string().trim().optional(),
});
export type ChargeKotToRoomInput = z.infer<typeof chargeKotToRoomSchema>;

// -------------------------------------------------------------
// Phase 4: Room Keycard & Key Management Schemas
// -------------------------------------------------------------

export const updateRoomKeyStatusSchema = z.object({
  status: z.enum(['in_slot', 'issued_to_guest', 'with_housekeeping', 'lost']),
  issuedToReservationId: z.string().uuid().optional().nullable(),
  issuedToGuestName: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
});
export type UpdateRoomKeyStatusInput = z.infer<typeof updateRoomKeyStatusSchema>;

export const encodeKeycardSchema = z.object({
  keyId: z.string().uuid(),
  roomNumber: z.string().trim().min(1),
  guestName: z.string().trim().min(1),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  cardUid: z.string().trim().optional(),
  protocol: z.enum(['mifare_classic_1k', 'mifare_ultralight', 'saflok_ascii', 'salto_virtual']).default('mifare_classic_1k'),
});
export type EncodeKeycardInput = z.infer<typeof encodeKeycardSchema>;




