import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { changePasswordSchema, createGuestSchema, createReservationSchema, createRoomSchema, createRoomTypeSchema, requestEmailChangeSchema, requestPasswordResetSchema, resetPasswordSchema, updateGuestSchema, updateOwnProfileSchema, updateRoomSchema, updateRoomTypeSchema, verifyEmailChangeSchema } from '@erp/shared';
import { AllExceptionsFilter } from '../src/common/pg-exception.filter';
import { parseApiEnv } from '../src/env-validation';
import { decodeGuestDocument, guestDocumentUploadSchema } from '../src/hotel/guest-document-validation';
import { createEmailChangeToken, emailVerificationUrl, hashEmailChangeToken } from '../src/auth/email-verification';

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
