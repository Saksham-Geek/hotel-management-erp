import { z } from 'zod';
import { ROLES } from './features';

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

export const createGuestSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional().or(z.literal('').transform(() => undefined)),
  nationality: z.string().max(60).optional(),
  idType: z.string().max(40).optional(),
  idNumber: z.string().max(60).optional(),
  vip: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
  customFields: z.record(z.unknown()).default({}),
});

export const createReservationSchema = z
  .object({
    guestId: z.string().uuid().optional(),
    newGuest: createGuestSchema.optional(),
    guestIds: z.array(z.string().uuid()).max(19).optional().default([]),
    newCompanions: z.array(createGuestSchema).max(19).optional().default([]),
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

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CustomFieldDefinitionInput = z.infer<typeof customFieldDefinitionSchema>;
