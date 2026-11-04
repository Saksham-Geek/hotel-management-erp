import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  changePasswordSchema,
  collectFolioPaymentSchema,
  createCorporateAccountSchema,
  createFormCSchema,
  createGuestSchema,
  createReservationSchema,
  createRoomSchema,
  createRoomTypeSchema,
  issueTaxInvoiceSchema,
  postFolioChargeSchema,
  requestEmailChangeSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  updateGuestSchema,
  updateOwnProfileSchema,
  updateRoomSchema,
  updateRoomTypeSchema,
  verifyEmailChangeSchema,
  switchPlanSchema,
  saveOtaConnectionSchema,
  simulateOtaBookingSchema,
  createStaffSchema,
  sendReviewRequestSchema,
  createMarketingCampaignSchema,
  updateGuestLoyaltySchema,
  FEATURES,
  HOSPITALITY_PLAN_TIERS,
} from '@erp/shared';
import { AllExceptionsFilter } from '../src/common/pg-exception.filter';
import { parseApiEnv } from '../src/env-validation';
import { decodeGuestDocument, guestDocumentUploadSchema } from '../src/hotel/guest-document-validation';
import { createEmailChangeToken, emailVerificationUrl, hashEmailChangeToken } from '../src/auth/email-verification';
import { calculateGstTax } from '../src/hotel/tax-calculator';
import { decryptSensitiveField, encryptSensitiveField } from '../src/common/field-encryption';

const validEnv = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  DATABASE_URL: 'postgres://erp_app:secret@localhost:5433/erp',
  JWT_SECRET: 'a-development-secret-that-is-long-enough',
  ...overrides,
});

test('accepts configured PostgreSQL URL and default port', () => {
  const env = parseApiEnv(validEnv());
  assert.equal(env.port, 4000);
  assert.equal(env.jwtExpiresIn, '8h');
  assert.equal(env.databaseUrl, 'postgres://erp_app:secret@localhost:5433/erp');
  assert.equal(env.appBaseUrl, 'http://localhost:3000');
  assert.equal(env.resendApiKey, '');
});

test('email verification configuration accepts optional mail credentials and validates the app URL', () => {
  const configured = parseApiEnv(validEnv({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'Hotel <auth@example.test>', APP_BASE_URL: 'https://hotel.example.test/path' }));
  assert.equal(configured.resendApiKey, 're_test');
  assert.equal(configured.emailFrom, 'Hotel <auth@example.test>');
  assert.equal(configured.appBaseUrl, 'https://hotel.example.test');
  assert.throws(() => parseApiEnv(validEnv({ APP_BASE_URL: 'not a URL' })), /APP_BASE_URL/);
  assert.throws(() => parseApiEnv(validEnv({ NODE_ENV: 'production', APP_BASE_URL: 'http://hotel.example.test' })), /HTTPS/);
});

test('email change input is normalized and requires a valid email and current password', () => {
  assert.deepEqual(requestEmailChangeSchema.parse({ newEmail: '  New.Owner@example.test ', currentPassword: 'current-password' }), {
    newEmail: 'new.owner@example.test', currentPassword: 'current-password',
  });
  assert.equal(requestEmailChangeSchema.safeParse({ newEmail: 'bad', currentPassword: 'pw' }).success, false);
  assert.equal(requestEmailChangeSchema.safeParse({ newEmail: 'new@example.test', currentPassword: '' }).success, false);
});

test('password change and reset schemas enforce current password, minimum length, confirmation, and normalized account lookup', () => {
  const password = 'strong-password-123';
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old-password', newPassword: password, confirmPassword: password }).success, true);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: '', newPassword: password, confirmPassword: password }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old-password', newPassword: 'short', confirmPassword: 'short' }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old-password', newPassword: password, confirmPassword: 'different-password' }).success, false);
  assert.deepEqual(requestPasswordResetSchema.parse({ tenant: ' grand-azure ', email: ' Owner@Example.test ' }), { tenant: 'grand-azure', email: 'owner@example.test' });
  assert.equal(resetPasswordSchema.safeParse({ token: createEmailChangeToken().token, newPassword: password, confirmPassword: password }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ token: createEmailChangeToken().token, newPassword: password, confirmPassword: 'different-password' }).success, false);
});

test('email verification token is random, URL safe, hashed for storage, and expires through migration schema', () => {
  const first = createEmailChangeToken();
  const second = createEmailChangeToken();
  assert.match(first.token, /^[A-Za-z0-9_-]{40,60}$/);
  assert.equal(first.tokenHash, hashEmailChangeToken(first.token));
  assert.notEqual(first.tokenHash, first.token);
  assert.notEqual(first.token, second.token);
  assert.equal(verifyEmailChangeSchema.safeParse({ token: first.token }).success, true);
  assert.equal(verifyEmailChangeSchema.safeParse({ token: 'short' }).success, false);
  assert.equal(emailVerificationUrl('https://hotel.example.test/base', first.token), `https://hotel.example.test/verify-email?token=${first.token}`);

  const migration = readFileSync(resolve(__dirname, '../../../db/migrations/009_user_email_change_verification.sql'), 'utf8');
  assert.match(migration, /token_hash text primary key/i);
  assert.match(migration, /expires_at timestamptz not null/i);
  assert.match(readFileSync(resolve(__dirname, '../src/auth/auth.service.ts'), 'utf8'), /now\(\) \+ interval '30 minutes'/i);
  assert.match(migration, /references users\(tenant_id, id\) on delete cascade/i);
});

test('rejects missing or non-PostgreSQL database URLs', () => {
  assert.throws(() => parseApiEnv(validEnv({ DATABASE_URL: '' })), /DATABASE_URL/);
  assert.throws(() => parseApiEnv(validEnv({ DATABASE_URL: 'https://localhost/erp' })), /postgres/i);
});

test('rejects malformed ports and weak production secrets', () => {
  assert.throws(() => parseApiEnv(validEnv({ PORT: '4000abc' })), /PORT/);
  assert.throws(() => parseApiEnv(validEnv({ PORT: '65536' })), /PORT/);
  assert.throws(() => parseApiEnv(validEnv({ NODE_ENV: 'production', JWT_SECRET: 'short' })), /32 characters/);
});

test('the operations migration replaces the autogenerated date check for hourly stays', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/003_hotel_operations.sql'),
    'utf8',
  );
  assert.match(migration, /drop constraint if exists reservations_check;/i);
  assert.match(migration, /reservation_date_order check \(check_out > check_in or \(rate_mode = 'hourly' and check_out = check_in\)\)/i);
});

test('the corrective migration removes the legacy date constraint from already-upgraded databases', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/005_hourly_reservation_dates.sql'),
    'utf8',
  );
  assert.match(migration, /drop constraint if exists reservations_check;/i);
  assert.match(migration, /add constraint reservation_date_order[\s\S]*rate_mode = 'hourly'/i);
});

test('the multi-property migration backfills a default property and scopes business rows', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/004_multi_property.sql'),
    'utf8',
  );
  assert.match(migration, /insert into properties[\s\S]*select id, name, timezone, currency, true from tenants/i);
  assert.match(migration, /create policy property_isolation[\s\S]*property_id = current_property_id\(\)/i);
  assert.match(migration, /reservations_property_guest_fkey[\s\S]*foreign key \(tenant_id, property_id, guest_id\)/i);
  assert.match(migration, /reservations_property_room_fkey[\s\S]*foreign key \(tenant_id, property_id, room_id\)/i);
});

test('profile migration adds a nullable contact number to users', () => {
  const migration = readFileSync(resolve(__dirname, '../../../db/migrations/008_user_contact_profile.sql'), 'utf8');
  assert.match(migration, /alter table users add column if not exists phone text/i);
});

test('password reset migration supports revoking issued sessions and stores only hashed, expiring reset tokens', () => {
  const migration = readFileSync(resolve(__dirname, '../../../db/migrations/010_password_reset.sql'), 'utf8');
  assert.match(migration, /add column if not exists auth_version integer not null default 0/i);
  assert.match(migration, /create table user_password_reset_tokens/i);
  assert.match(migration, /token_hash text primary key/i);
  assert.match(migration, /expires_at timestamptz not null/i);
  assert.match(migration, /grant select, insert, update, delete on user_password_reset_tokens to erp_app/i);
  assert.match(readFileSync(resolve(__dirname, '../src/auth/jwt-auth.guard.ts'), 'utf8'), /p\.ver \?\? 0/);
});

test('room configuration schemas validate nightly and hourly rates and allow clearing overrides', () => {
  assert.equal(createRoomTypeSchema.safeParse({ name: 'Deluxe', baseRate: 3000, hourlyRate: 250, capacity: 2 }).success, true);
  assert.equal(createRoomSchema.safeParse({ roomTypeId: '22222222-2222-4222-8222-222222222222', number: '201', baseRate: 1800, hourlyRate: 200 }).success, true);
  assert.equal(updateRoomTypeSchema.safeParse({ hourlyRate: null }).success, true);
  assert.equal(updateRoomTypeSchema.safeParse({ hourlyRate: '275' }).success, true);
  assert.equal(updateRoomSchema.safeParse({ hourlyRate: null }).success, true);
  assert.equal(updateRoomSchema.safeParse({ baseRate: null }).success, true);
  assert.equal(updateRoomTypeSchema.safeParse({}).success, false);
  assert.equal(updateRoomSchema.safeParse({}).success, false);
});

test('property room inventory migration scopes room type names and room numbers to a property', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/006_property_room_inventory.sql'),
    'utf8',
  );
  assert.match(migration, /unique \(tenant_id, property_id, name\)/i);
  assert.match(migration, /unique \(tenant_id, property_id, number\)/i);
  assert.match(migration, /add column if not exists base_rate numeric\(12,2\)/i);
});

test('room type and room updates allow clearing optional hourly overrides', () => {
  assert.equal(updateRoomTypeSchema.safeParse({ hourlyRate: null, description: null }).success, true);
  assert.equal(updateRoomSchema.safeParse({ hourlyRate: null }).success, true);
  assert.equal(updateRoomTypeSchema.safeParse({ baseRate: -1 }).success, false);
  assert.equal(updateRoomSchema.safeParse({ floor: 201 }).success, false);
});

test('guest identity data only stores the last four Aadhaar digits', () => {
  assert.equal(createGuestSchema.safeParse({ fullName: 'Guest', phone: '+91 9000000000', idType: 'aadhaar', idNumber: '1234' }).success, true);
  assert.equal(createGuestSchema.safeParse({ fullName: 'Guest', phone: '+91 9000000000', idType: 'aadhaar', idNumber: '123456789012' }).success, false);
  assert.equal(updateGuestSchema.safeParse({ idType: 'aadhaar', idNumber: '123456789012' }).success, false);
});

test('new guest reservations require a valid phone and validate email when supplied', () => {
  const valid = { fullName: 'New guest', phone: '+91 9000000000', email: 'guest@example.test' };
  assert.equal(createGuestSchema.safeParse(valid).success, true);
  assert.equal(createGuestSchema.safeParse({ fullName: 'New guest' }).success, false);
  assert.equal(createGuestSchema.safeParse({ ...valid, phone: 'call me' }).success, false);
  assert.equal(createGuestSchema.safeParse({ ...valid, email: 'invalid-email' }).success, false);
});

test('own profile updates validate a required name and optional phone number', () => {
  assert.deepEqual(updateOwnProfileSchema.parse({ fullName: '  Asha Verma  ', phone: '+91 9876543210' }), { fullName: 'Asha Verma', phone: '+91 9876543210' });
  assert.deepEqual(updateOwnProfileSchema.parse({ fullName: 'Asha Verma', phone: '' }), { fullName: 'Asha Verma', phone: null });
  assert.equal(updateOwnProfileSchema.safeParse({ fullName: '  ' }).success, false);
  assert.equal(updateOwnProfileSchema.safeParse({ fullName: 'Asha Verma', phone: 'not a phone' }).success, false);
});

test('identity document upload requires consent and confirmation for masked Aadhaar', () => {
  const document = { fileName: 'id.png', mimeType: 'image/png', base64: 'iVBORw0KGgo=', documentType: 'aadhaar_masked' };
  assert.equal(guestDocumentUploadSchema.safeParse({ documents: [document], consentGiven: true, consentMethod: 'verbal' }).success, false);
  assert.equal(guestDocumentUploadSchema.safeParse({ documents: [document], consentGiven: true, consentMethod: 'verbal', aadhaarMasked: true }).success, true);
  assert.equal(guestDocumentUploadSchema.safeParse({ documents: [document], consentGiven: false, consentMethod: 'verbal', aadhaarMasked: true }).success, false);
});

test('reservation guest identity requires ID details, consent, and an image attachment', () => {
  const base = {
    roomId: '22222222-2222-4222-8222-222222222222',
    checkIn: '2032-05-10',
    checkOut: '2032-05-11',
  };
  const validGuest = {
    fullName: 'New guest',
    phone: '+91 9000000000',
    idType: 'passport',
    idNumber: 'P1234567',
    identityDocument: {
      fileName: 'passport.png',
      mimeType: 'image/png',
      base64: 'iVBORw0KGgo=',
      documentType: 'passport',
      consentGiven: true,
      consentMethod: 'verbal',
      aadhaarMasked: false,
    },
  };
  assert.equal(createReservationSchema.safeParse({ ...base, newGuest: validGuest }).success, true);
  assert.equal(createReservationSchema.safeParse({ ...base, newGuest: { ...validGuest, identityDocument: undefined } }).success, false);
  assert.equal(createReservationSchema.safeParse({ ...base, newGuest: { ...validGuest, idNumber: '' } }).success, false);
  assert.equal(createReservationSchema.safeParse({ ...base, newGuest: { ...validGuest, identityDocument: { ...validGuest.identityDocument, consentGiven: false } } }).success, false);
  assert.equal(createReservationSchema.safeParse({
    ...base,
    guestId: '11111111-1111-4111-8111-111111111111',
    existingGuestDocuments: [{ guestId: '11111111-1111-4111-8111-111111111111', attachment: validGuest.identityDocument }],
  }).success, true);
});

test('document bytes must match the declared image MIME type', () => {
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64');
  assert.equal(decodeGuestDocument(pngHeader, 'image/png').length, 8);
  assert.throws(() => decodeGuestDocument(pngHeader, 'image/jpeg'), /contents do not match/);
  assert.throws(() => decodeGuestDocument('not base64!', 'image/png'), /valid base64/);
});

test('guest identity migration adds nullable consent audit fields for legacy records', () => {
  const migration = readFileSync(resolve(__dirname, '../../../db/migrations/007_guest_identity_consent.sql'), 'utf8');
  assert.match(migration, /add column if not exists consent_method/i);
  assert.match(migration, /foreign key \(consent_recorded_by\) references users/i);
  assert.match(migration, /where consent_method is not null/i);
});

test('reservations accept a new companion alongside an existing primary guest', () => {
  const attachment = {
    fileName: 'passport.png', mimeType: 'image/png', base64: 'iVBORw0KGgo=',
    documentType: 'passport', consentGiven: true, consentMethod: 'verbal', aadhaarMasked: false,
  };
  const parsed = createReservationSchema.safeParse({
    guestId: '11111111-1111-4111-8111-111111111111',
    newCompanions: [{ fullName: 'New arrival', phone: '+91 9000000000', email: 'arrival@example.test', idType: 'passport', idNumber: 'P1234567', identityDocument: attachment }],
    roomId: '22222222-2222-4222-8222-222222222222',
    checkIn: '2032-05-10',
    checkOut: '2032-05-11',
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.newCompanions[0].vip, false);
});

test('reservations reject more than 20 total guests including the primary guest', () => {
  const attachment = {
    fileName: 'passport.png', mimeType: 'image/png', base64: 'iVBORw0KGgo=',
    documentType: 'passport', consentGiven: true, consentMethod: 'verbal', aadhaarMasked: false,
  };
  const parsed = createReservationSchema.safeParse({
    guestId: '11111111-1111-4111-8111-111111111111',
    guestIds: Array.from({ length: 19 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`),
    newCompanions: [{ fullName: 'One too many', phone: '+91 9000000000', idType: 'passport', idNumber: 'P1234567', identityDocument: attachment }],
    roomId: '22222222-2222-4222-8222-222222222222',
    checkIn: '2032-05-10',
    checkOut: '2032-05-11',
  });
  assert.equal(parsed.success, false);
});

test('same-day hourly reservations accept an hourly rate with an override reason', () => {
  const parsed = createReservationSchema.safeParse({
    guestId: '11111111-1111-4111-8111-111111111111',
    roomId: '22222222-2222-4222-8222-222222222222',
    checkIn: '2032-05-10',
    checkOut: '2032-05-10',
    checkInTime: '14:00',
    checkOutTime: '16:00',
    rateMode: 'hourly',
    unitRateOverride: 250,
    overrideReason: 'Approved front desk rate',
  });
  assert.equal(parsed.success, true);
});

test('per-unit reservation overrides work for either mode, require a reason, and cannot be combined', () => {
  const base = {
    guestId: '11111111-1111-4111-8111-111111111111',
    roomId: '22222222-2222-4222-8222-222222222222',
    checkIn: '2032-05-10',
    checkOut: '2032-05-11',
    overrideReason: 'Approved rate',
  };
  assert.equal(createReservationSchema.safeParse({ ...base, unitRateOverride: 250 }).success, true);
  const missingReason = createReservationSchema.safeParse({
    ...base,
    rateMode: 'hourly',
    checkInTime: '14:00',
    checkOutTime: '16:00',
    unitRateOverride: 250,
    overrideReason: undefined,
  });
  assert.equal(missingReason.success, false);
  assert.equal(createReservationSchema.safeParse({
    ...base,
    rateMode: 'hourly',
    checkInTime: '14:00',
    checkOutTime: '16:00',
    unitRateOverride: 250,
    priceOverride: 500,
  }).success, false);
  assert.equal(createReservationSchema.safeParse({
    ...base,
    rateMode: 'hourly',
    checkInTime: '14:00',
    checkOutTime: '16:00',
    unitRateOverride: 250,
    overrideReason: undefined,
  }).success, false);
});

test('hourly room overlap constraints return a conflict response', () => {
  const response = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; },
  };
  const host = { switchToHttp: () => ({ getResponse: () => response }) };
  new AllExceptionsFilter().catch(
    { code: '23P01', constraint: 'no_double_booking_time' },
    host as never,
  );
  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, {
    statusCode: 409,
    code: 'ROOM_UNAVAILABLE',
    message: 'That room is already booked for these dates',
  });
});

test('Indian GST statutory calculation correctly applies 12% and 18% accommodation slabs and 5% F&B', () => {
  // Slab 1: Tariff <= 7,500 INR -> 12% total (6% CGST + 6% SGST, SAC 996311)
  const roomUnderThreshold = calculateGstTax('ACCOMMODATION', 5000, 1, false);
  assert.equal(roomUnderThreshold.hsnSac, '996311');
  assert.equal(roomUnderThreshold.cgstRate, 6);
  assert.equal(roomUnderThreshold.sgstRate, 6);
  assert.equal(roomUnderThreshold.cgstAmount, 300);
  assert.equal(roomUnderThreshold.sgstAmount, 300);
  assert.equal(roomUnderThreshold.taxTotal, 600);
  assert.equal(roomUnderThreshold.lineTotal, 5600);

  // Slab 2: Tariff > 7,500 INR -> 18% total (9% CGST + 9% SGST, SAC 996311)
  const roomOverThreshold = calculateGstTax('ACCOMMODATION', 10000, 1, false);
  assert.equal(roomOverThreshold.cgstRate, 9);
  assert.equal(roomOverThreshold.sgstRate, 9);
  assert.equal(roomOverThreshold.cgstAmount, 900);
  assert.equal(roomOverThreshold.sgstAmount, 900);
  assert.equal(roomOverThreshold.taxTotal, 1800);
  assert.equal(roomOverThreshold.lineTotal, 11800);

  // Inter-state Accommodation -> 18% IGST (0% CGST, 0% SGST)
  const roomInterstate = calculateGstTax('ACCOMMODATION', 10000, 1, true);
  assert.equal(roomInterstate.cgstAmount, 0);
  assert.equal(roomInterstate.sgstAmount, 0);
  assert.equal(roomInterstate.igstAmount, 1800);
  assert.equal(roomInterstate.lineTotal, 11800);

  // F&B Room Service -> 5% total (2.5% CGST + 2.5% SGST, SAC 996331)
  const fnbItem = calculateGstTax('FNB_ROOM_SERVICE', 800, 2, false);
  assert.equal(fnbItem.hsnSac, '996331');
  assert.equal(fnbItem.taxableAmount, 1600);
  assert.equal(fnbItem.cgstRate, 2.5);
  assert.equal(fnbItem.sgstRate, 2.5);
  assert.equal(fnbItem.taxTotal, 80);
  assert.equal(fnbItem.lineTotal, 1680);
});

test('Section 269ST cash limit and Rule 114B PAN card requirements are enforced', () => {
  // Prohibit single cash payment >= Rs 2,00,000 under Section 269ST
  const cash2Lakh = collectFolioPaymentSchema.safeParse({
    method: 'cash',
    amount: 200000,
  });
  assert.equal(cash2Lakh.success, false);

  // Cash payment <= 50,000 does not strictly require PAN
  const cashSmall = collectFolioPaymentSchema.safeParse({
    method: 'cash',
    amount: 45000,
  });
  assert.equal(cashSmall.success, true);

  // Cash payment > 50,000 requires PAN under Rule 114B
  const cashOver50kNoPan = collectFolioPaymentSchema.safeParse({
    method: 'cash',
    amount: 60000,
  });
  assert.equal(cashOver50kNoPan.success, false);

  const cashOver50kValidPan = collectFolioPaymentSchema.safeParse({
    method: 'cash',
    amount: 60000,
    panNumber: 'ABCDE1234F',
  });
  assert.equal(cashOver50kValidPan.success, true);

  // Card or UPI allows payments >= 200,000
  const upiLarge = collectFolioPaymentSchema.safeParse({
    method: 'upi',
    amount: 350000,
    reference: 'UPI1234567890',
  });
  assert.equal(upiLarge.success, true);
});

test('Statutory GST Tax Invoice schema enforces 15-char GSTIN on B2B invoices', () => {
  const b2c = issueTaxInvoiceSchema.safeParse({
    invoiceType: 'B2C',
    placeOfSupplyStateCode: '27',
  });
  assert.equal(b2c.success, true);

  const b2bMissingGstin = issueTaxInvoiceSchema.safeParse({
    invoiceType: 'B2B',
  });
  assert.equal(b2bMissingGstin.success, false);

  const b2bValid = issueTaxInvoiceSchema.safeParse({
    invoiceType: 'B2B',
    guestGstin: '27AAAAA0000A1Z5',
    guestCompanyName: 'Tata Consultancy Services',
    placeOfSupplyStateCode: '27',
  });
  assert.equal(b2bValid.success, true);
});

test('Form C foreign guest schema validates passport, visa, and arrival details', () => {
  const formC = createFormCSchema.safeParse({
    reservationId: '00000000-0000-0000-0000-000000000001',
    guestId: '00000000-0000-0000-0000-000000000002',
    passportNumber: 'P12345678',
    passportCountry: 'United Kingdom',
    passportIssueDate: '2020-01-01',
    passportExpiryDate: '2030-01-01',
    visaNumber: 'V98765432',
    visaType: 'Tourist',
    visaValidUntil: '2027-01-01',
    visaIssuePlace: 'London',
    arrivalDateInIndia: '2026-11-01',
    arrivedFromCityCountry: 'London, UK',
    nextDestinationCityCountry: 'Goa, India',
    purposeOfVisit: 'tourism',
  });
  assert.equal(formC.success, true);
});

test('Sensitive guest identity numbers can be decrypted by authorized staff with AES-256-GCM', () => {
  process.env.GUEST_DOCUMENT_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const plainText = '9876';
  const encrypted = encryptSensitiveField(plainText);
  assert.ok(encrypted.ciphertext);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.authTag);

  const decrypted = decryptSensitiveField(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
  assert.equal(decrypted, plainText);
});

test('Statutory billing migration creates tax categories, corporate accounts, invoices, and Form C', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/011_statutory_and_billing.sql'),
    'utf8',
  );
  assert.match(migration, /create table if not exists tax_categories/i);
  assert.match(migration, /create table if not exists tax_slabs/i);
  assert.match(migration, /create table if not exists corporate_accounts/i);
  assert.match(migration, /create table if not exists tax_invoices/i);
  assert.match(migration, /create table if not exists guest_form_c/i);
  assert.match(migration, /create table if not exists hotel_business_dates/i);
  assert.match(migration, /folio_payments_cash_limit_check/i);
});

test('Subscription tier catalogue defines Starter, Growth, and Enterprise with exact hospitality limits', () => {
  assert.equal(HOSPITALITY_PLAN_TIERS.length, 3);
  const [starter, growth, enterprise] = HOSPITALITY_PLAN_TIERS;

  // Starter Edition (Small hotel / Homestay / B&B)
  assert.equal(starter.key, 'starter');
  assert.equal(starter.maxRooms, 25);
  assert.equal(starter.maxStaff, 3);
  assert.ok(starter.features.includes(FEATURES.HOTEL_ROOMS));
  assert.ok(starter.features.includes(FEATURES.HOTEL_TAPE_CHART));
  assert.ok(starter.features.includes(FEATURES.HOTEL_BILLING));
  assert.ok(starter.features.includes(FEATURES.HOTEL_COMPLIANCE));
  // Excluded from Starter
  assert.equal(starter.features.includes(FEATURES.HOTEL_NIGHT_AUDIT), false);
  assert.equal(starter.features.includes(FEATURES.HOTEL_HOUSEKEEPING), false);
  assert.equal(starter.features.includes(FEATURES.HOTEL_CORPORATE_LEDGER), false);

  // Growth Edition (Mid-Scale / Resort)
  assert.equal(growth.key, 'growth');
  assert.equal(growth.maxRooms, 80);
  assert.equal(growth.maxStaff, 15);
  assert.ok(growth.features.includes(FEATURES.HOTEL_NIGHT_AUDIT));
  assert.ok(growth.features.includes(FEATURES.HOTEL_HOUSEKEEPING));
  assert.ok(growth.features.includes(FEATURES.HOTEL_REPORTS_BASIC));

  // Enterprise Chain Edition (Taj / Oberoi / ITC Luxury)
  assert.equal(enterprise.key, 'enterprise');
  assert.equal(enterprise.maxRooms, null); // Unlimited
  assert.equal(enterprise.maxStaff, null); // Unlimited
  assert.ok(enterprise.features.includes(FEATURES.HOTEL_CORPORATE_LEDGER));
  assert.ok(enterprise.features.includes(FEATURES.HOTEL_CRS));
  assert.ok(enterprise.features.includes(FEATURES.HOTEL_KEYCARDS));
  assert.ok(enterprise.features.includes(FEATURES.HOTEL_LOYALTY));
  assert.ok(enterprise.features.includes(FEATURES.HOTEL_CHANNEL_MANAGER));
  assert.ok(enterprise.features.includes(FEATURES.HOTEL_POS));
  assert.ok(enterprise.features.includes(FEATURES.CORE_SSO));
});

test('SwitchPlanSchema accepts valid tier keys and rejects unknown plans', () => {
  assert.equal(switchPlanSchema.safeParse({ planKey: 'starter' }).success, true);
  assert.equal(switchPlanSchema.safeParse({ planKey: 'growth' }).success, true);
  assert.equal(switchPlanSchema.safeParse({ planKey: 'enterprise' }).success, true);
  assert.equal(switchPlanSchema.safeParse({ planKey: 'basic' }).success, true);
  assert.equal(switchPlanSchema.safeParse({ planKey: 'invalid-tier' }).success, false);
});

test('Tier catalog migration 013 seeds hospitality features and enforces room/user limits', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/013_tier_subscription_catalog.sql'),
    'utf8',
  );
  assert.match(migration, /hotel\.corporate_ledger/);
  assert.match(migration, /hotel\.crs/);
  assert.match(migration, /hotel\.keycards/);
  assert.match(migration, /hotel\.loyalty/);
  assert.match(migration, /Starter \(Homestay & Small Hotel\)/);
  assert.match(migration, /Growth \(Mid-Scale & Resort\)/);
  assert.match(migration, /Enterprise Chain \(Taj & Luxury Edition\)/);
  // Verify Starter 25 room cap and Growth 80 room cap
  assert.match(migration, /\('starter',\s*'hotel\.rooms',\s*25\)/);
  assert.match(migration, /\('growth',\s*'hotel\.rooms',\s*80\)/);
});

test('calculateGstTax safely handles non-finite, negative, and edge-case quantities and prices', () => {
  const resultNaN = calculateGstTax('ACCOMMODATION', NaN, 1);
  assert.equal(resultNaN.taxableAmount, 0);
  assert.equal(resultNaN.taxTotal, 0);
  assert.equal(resultNaN.lineTotal, 0);

  const resultNegative = calculateGstTax('FNB_REST', -500, -2);
  assert.equal(resultNegative.taxableAmount, 0);
  assert.equal(resultNegative.taxTotal, 0);

  const resultZero = calculateGstTax('ACCOMMODATION', 0, 1);
  assert.equal(resultZero.taxableAmount, 0);
  assert.equal(resultZero.taxTotal, 0);
  assert.equal(resultZero.cgstRate, 6);
  assert.equal(resultZero.sgstRate, 6);
});

test('decryptSensitiveField returns null gracefully on tampered ciphertext or wrong auth tag', () => {
  process.env.GUEST_DOCUMENT_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const encrypted = encryptSensitiveField('1234');
  assert.ok(encrypted.authTag);
  assert.ok(encrypted.ciphertext);
  assert.ok(encrypted.iv);

  // Tamper with the authentication tag
  const tamperedTag = Buffer.from(encrypted.authTag);
  tamperedTag[0] = tamperedTag[0] ^ 0xff;

  const result = decryptSensitiveField(encrypted.ciphertext, encrypted.iv, tamperedTag);
  assert.equal(result, null);
});

test('Zod schemas reject non-finite numbers and zero payments', () => {
  assert.equal(postFolioChargeSchema.safeParse({ description: 'Test', unitPrice: NaN }).success, false);
  assert.equal(postFolioChargeSchema.safeParse({ description: 'Test', unitPrice: Infinity }).success, false);
  assert.equal(collectFolioPaymentSchema.safeParse({ method: 'cash', amount: 0 }).success, false);
  assert.equal(collectFolioPaymentSchema.safeParse({ method: 'cash', amount: -100 }).success, false);
  assert.equal(collectFolioPaymentSchema.safeParse({ method: 'cash', amount: NaN }).success, false);
});

test('Migration 014 creates composite performance indexes and single-invoice constraint', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/014_performance_indexes_and_integrity.sql'),
    'utf8',
  );
  assert.match(migration, /folio_items_folio_idx/);
  assert.match(migration, /folio_payments_folio_status_idx/);
  assert.match(migration, /reservations_tape_chart_idx/);
  assert.match(migration, /tax_invoices_single_per_folio_idx/);
});

test('Migration 015 creates OTA channels, sync logs, and reservation source columns', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/015_channel_manager_and_ota_integrations.sql'),
    'utf8',
  );
  assert.match(migration, /booking_source/);
  assert.match(migration, /ota_booking_id/);
  assert.match(migration, /create table if not exists ota_channels/);
  assert.match(migration, /create table if not exists ota_sync_logs/);
  assert.match(migration, /hotel\.channel_manager/);
});

test('OTA connection and simulation schemas validate channel keys and positive amounts', () => {
  assert.equal(
    saveOtaConnectionSchema.safeParse({
      channelKey: 'makemytrip',
      channelName: 'MakeMyTrip & Goibibo',
      hotelCode: 'MMT-DEL-101',
      commissionRate: 18,
    }).success,
    true,
  );
  assert.equal(
    saveOtaConnectionSchema.safeParse({
      channelKey: 'invalid_ota',
      channelName: 'Unknown',
      hotelCode: 'TEST',
    }).success,
    false,
  );

  assert.equal(
    simulateOtaBookingSchema.safeParse({
      channelKey: 'booking_com',
      guestName: 'Pooja Sharma',
      checkIn: '2026-11-05',
      checkOut: '2026-11-07',
      totalAmount: 6400,
    }).success,
    true,
  );
  assert.equal(
    simulateOtaBookingSchema.safeParse({
      channelKey: 'booking_com',
      guestName: '',
      checkIn: 'invalid-date',
      checkOut: '2026-11-07',
      totalAmount: 0,
    }).success,
    false,
  );
});

test('createStaffSchema validates hierarchy roles, shifts, and credentials', () => {
  const valid = createStaffSchema.safeParse({
    email: 'gm.shekhawat@tajhotel.com',
    fullName: 'Ranveer Singh Shekhawat',
    role: 'manager',
    department: 'Executive Office',
    shift: 'General',
    password: 'SecurePassword123!',
  });
  assert.equal(valid.success, true);

  const invalidRole = createStaffSchema.safeParse({
    email: 'staff@hotel.com',
    fullName: 'Test Staff',
    role: 'super_admin_invalid',
  });
  assert.equal(invalidRole.success, false);
});

test('Marketing & Loyalty schemas validate post-checkout outreach, tiers, and campaigns', () => {
  // Review request schema
  assert.equal(
    sendReviewRequestSchema.safeParse({
      guestId: '7b78d648-f8ee-419a-877e-506b524fede3',
      channel: 'whatsapp',
      platform: 'google',
      recipientPhone: '+91 98201 11223',
    }).success,
    true,
  );

  // Marketing campaign schema
  assert.equal(
    createMarketingCampaignSchema.safeParse({
      title: 'Monsoon Palace Weekend Escape',
      campaignType: 'repeat_booking',
      channel: 'whatsapp',
      audienceSegment: 'all_guests',
      templateMessage: 'Enjoy 25% savings on all suites with code MONSOON25.',
      discountCode: 'MONSOON25',
    }).success,
    true,
  );

  // Guest loyalty schema
  assert.equal(
    updateGuestLoyaltySchema.safeParse({
      tier: 'kohinoor',
      preferences: { pillow_type: 'Goose Feather', dietary: 'Jain' },
      anniversaryDate: '2026-12-14',
    }).success,
    true,
  );
  assert.equal(
    updateGuestLoyaltySchema.safeParse({
      tier: 'invalid_tier_name',
    }).success,
    false,
  );
});

test('Migration 016 creates enterprise hierarchy, loyalty profiles, and marketing tables', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../db/migrations/016_enterprise_hierarchy_and_loyalty_marketing.sql'),
    'utf8',
  );
  assert.match(migration, /guest_loyalty_profiles/);
  assert.match(migration, /guest_followup_logs/);
  assert.match(migration, /marketing_campaigns/);
  assert.match(migration, /post_checkout_review/);
  assert.match(migration, /kohinoor/);
});



