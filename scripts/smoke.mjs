// End-to-end smoke test: node scripts/smoke.mjs   (API must be running, DB migrated + seeded)
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const API = process.env.API_URL ?? `http://localhost:${env.PORT ?? 4000}`;
let failed = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`); if (!cond) failed++; };
async function call(method, path, token, body) {
  const res = await fetch(API + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const login = async (tenant, email, password = 'ChangeMe-123!') => (await call('POST', '/auth/login', null, { tenant, email, password }));

// --- set up a second tenant on the Basic plan (via the owner connection) ---
const admin = new Client({ connectionString: env.DATABASE_ADMIN_URL });
await admin.connect();
const t2 = (await admin.query(`insert into tenants (slug, name, vertical) values ('sea-breeze','Sea Breeze Inn','hotel') on conflict (slug) do update set name = excluded.name returning id`)).rows[0].id;
const propertyB = (await admin.query(
  `insert into properties (tenant_id, name, timezone, currency, is_default)
   values ($1,'Sea Breeze Inn','Asia/Kolkata','INR',true)
   on conflict (tenant_id, name) do update set name = excluded.name returning id`, [t2],
)).rows[0].id;
await admin.query('begin');
await admin.query(`select set_config('app.tenant_id', $1, true)`, [t2]);
await admin.query(`select set_config('app.property_id', $1, true)`, [propertyB]);
await admin.query(`insert into property_subscriptions (tenant_id, property_id, plan_key, status) values ($1,$2,'basic','active') on conflict (tenant_id, property_id) do nothing`, [t2, propertyB]);
const userB = await admin.query(`insert into users (tenant_id, email, password_hash, full_name, role) values ($1,'owner@seabreeze.test',$2,'Dev Patel','owner') on conflict (tenant_id, email) do nothing returning id`, [t2, await bcrypt.hash('ChangeMe-123!', 10)]);
const userBId = userB.rows[0]?.id ?? (await admin.query(`select id from users where tenant_id=$1 and email='owner@seabreeze.test'`, [t2])).rows[0].id;
await admin.query(`insert into property_users (tenant_id, property_id, user_id, role) values ($1,$2,$3,'owner') on conflict do nothing`, [t2, propertyB, userBId]);
await admin.query('commit');
await admin.end();

// --- auth ---
ok('rejects wrong password', (await login('grand-azure', 'owner@grandazure.test', 'nope')).status === 401);
ok('rejects unknown hotel code', (await login('no-such-hotel', 'x@y.com')).status === 401);
ok('rejects request without token', (await call('GET', '/hotel/rooms')).status === 401);
const a = (await login('grand-azure', 'owner@grandazure.test')).body.token;
const desk = (await login('grand-azure', 'desk@grandazure.test')).body.token;
const b = (await login('sea-breeze', 'owner@seabreeze.test')).body.token;
ok('owner can log in', !!a && !!b && !!desk);

// --- plan gating ---
const entA = (await call('GET', '/entitlements/me', a)).body;
const entB = (await call('GET', '/entitlements/me', b)).body;
ok('Plus plan has housekeeping, not channel manager', !!entA.features['hotel.housekeeping'] && !entA.features['hotel.channel_manager']);
ok('Basic plan has no custom fields', !entB.features['core.custom_fields']);
const cf = await call('GET', '/custom-fields/guest', b);
ok('Basic tenant is blocked from custom fields (403)', cf.status === 403 && cf.body.code === 'FEATURE_NOT_IN_PLAN', JSON.stringify(cf));
ok('Plus tenant can use custom fields', (await call('GET', '/custom-fields/guest', a)).status === 200);

// --- hotel flow ---
const rooms = (await call('GET', '/hotel/rooms', a)).body;
ok('seeded at least 18 rooms', rooms.length >= 18, String(rooms.length));
const room = rooms.find((r) => r.number === '101');
const roomTypes = (await call('GET', '/hotel/room-types', a)).body;
const standardType = roomTypes.find((type) => type.name === 'Standard');
ok('front desk cannot create room types', (await call('POST', '/hotel/room-types', desk, { name: `Blocked ${Date.now()}`, baseRate: 1000 })).status === 403);
ok('front desk cannot change nightly or hourly rates', (await call('PATCH', `/hotel/room-types/${standardType.id}`, desk, { baseRate: standardType.baseRate })).status === 403);
const typeRateUpdate = await call('PATCH', `/hotel/room-types/${standardType.id}`, a, { baseRate: standardType.baseRate, hourlyRate: null });
ok('owner can edit room-type nightly and hourly defaults', typeRateUpdate.status === 200 && typeRateUpdate.body.baseRate === standardType.baseRate && typeRateUpdate.body.hourlyRate === null, JSON.stringify(typeRateUpdate));
ok('front desk cannot change room configuration', (await call('PATCH', `/hotel/rooms/${room.id}`, desk, { number: room.number })).status === 403);
ok('front desk cannot create room inventory', (await call('POST', '/hotel/rooms', desk, { roomTypeId: standardType.id, number: `B${Date.now()}` })).status === 403);
const housekeepingUser = await call('POST', '/users', a, { email: `house${Date.now()}@grandazure.test`, fullName: 'Smoke Housekeeper', role: 'housekeeping', password: 'a-long-password-1' });
const housekeepingToken = housekeepingUser.body?.id ? (await login('grand-azure', housekeepingUser.body.email, 'a-long-password-1')).body?.token : null;
ok('owner can create a housekeeping account for room-state checks', housekeepingUser.status === 201 && !!housekeepingToken, JSON.stringify(housekeepingUser));
const configurationRoom = await call('POST', '/hotel/rooms', a, { roomTypeId: standardType.id, number: `S${Date.now()}`, floor: 9 });
ok('owner can create a room record', configurationRoom.status === 201, JSON.stringify(configurationRoom));
const configRoomId = configurationRoom.body?.id;
if (configRoomId) {
  const rateEdit = await call('PATCH', `/hotel/rooms/${configRoomId}`, a, { hourlyRate: 275 });
  ok('owner can set a room-level hourly override', rateEdit.status === 200 && rateEdit.body.hourlyRateOverride === 275, JSON.stringify(rateEdit));
  const rateClear = await call('PATCH', `/hotel/rooms/${configRoomId}`, a, { hourlyRate: null });
  ok('owner can clear a room-level hourly override', rateClear.status === 200 && rateClear.body.hourlyRateOverride === null, JSON.stringify(rateClear));
  const maintenance = await call('PATCH', `/hotel/rooms/${configRoomId}/status`, a, { status: 'maintenance' });
  ok('owner can mark a room under maintenance', maintenance.status === 200, JSON.stringify(maintenance));
  ok('front desk cannot alter maintenance state', (await call('PATCH', `/hotel/rooms/${configRoomId}/status`, desk, { status: 'available' })).status === 403);
  ok('housekeeping cannot alter maintenance state', (await call('PATCH', `/hotel/rooms/${configRoomId}/status`, housekeepingToken, { status: 'available' })).status === 403);
  const ready = await call('PATCH', `/hotel/rooms/${configRoomId}/status`, a, { status: 'available' });
  ok('owner can return a room from maintenance', ready.status === 200, JSON.stringify(ready));
  const cleaning = await call('PATCH', `/hotel/rooms/${configRoomId}/status`, a, { status: 'cleaning' });
  const hkReady = await call('PATCH', `/hotel/rooms/${configRoomId}/status`, housekeepingToken, { status: 'available' });
  ok('housekeeping can mark a non-maintenance room ready', cleaning.status === 200 && hkReady.status === 200, JSON.stringify(hkReady));
}
const stamp = Date.now() % 100000;
const smokeStayStart = Date.now() + (730 + stamp) * 24 * 60 * 60 * 1000;
const day = (n) => new Date(smokeStayStart + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
await call('POST', '/custom-fields', a, { entity: 'guest', key: `meal_pref_${stamp}`, label: 'Meal preference', fieldType: 'select', options: ['veg', 'non-veg'], required: false });
const guest = (await call('POST', '/hotel/guests', a, { fullName: `Test Guest ${stamp}`, phone: `+91 ${String(stamp).padStart(10, '0')}` })).body;
ok('creates a guest', !!guest?.id, JSON.stringify(guest));
if (configRoomId) {
  const bothRates = await call('PATCH', `/hotel/rooms/${configRoomId}`, a, { baseRate: 1800, hourlyRate: 275 });
  const listedRates = (await call('GET', '/hotel/rooms', a)).body.find((r) => r.id === configRoomId);
  ok('room-level nightly and hourly rates are independently configurable', bothRates.status === 200 && listedRates.baseRate === 1800 && listedRates.hourlyRate === 275, JSON.stringify({ bothRates, listedRates }));
  const nightlyOverrideStay = await call('POST', '/hotel/reservations', a, { guestId: guest.id, roomId: configRoomId, checkIn: day(20), checkOut: day(21) });
  ok('reservation pricing uses the room nightly override', nightlyOverrideStay.status === 201 && nightlyOverrideStay.body.totalAmount === 1800, JSON.stringify(nightlyOverrideStay));
  const hourlyOverrideStay = await call('POST', '/hotel/reservations', a, { guestId: guest.id, roomId: configRoomId, checkIn: day(22), checkOut: day(22), checkInTime: '14:00', checkOutTime: '16:00', rateMode: 'hourly' });
  ok('reservation pricing uses the room hourly override', hourlyOverrideStay.status === 201 && hourlyOverrideStay.body.totalAmount === 550, JSON.stringify(hourlyOverrideStay));
  const resetRates = await call('PATCH', `/hotel/rooms/${configRoomId}`, a, { baseRate: null, hourlyRate: null });
  const inheritedRates = (await call('GET', '/hotel/rooms', a)).body.find((r) => r.id === configRoomId);
  ok('clearing room overrides restores the room-type nightly default', resetRates.status === 200 && inheritedRates.baseRate === standardType.baseRate, JSON.stringify({ resetRates, inheritedRates }));
}

// --- property isolation within one tenant ---
const secondProperty = await call('POST', '/properties', a, { name: `Second property ${stamp}` });
const secondPropertyToken = secondProperty.body?.id
  ? (await call('POST', '/auth/select-property', a, { propertyId: secondProperty.body.id })).body?.token
  : null;
ok('owner can create and select a second property', secondProperty.status === 201 && !!secondPropertyToken, JSON.stringify(secondProperty));
const otherPropertyRooms = await call('GET', '/hotel/rooms', secondPropertyToken);
ok('second property cannot read first property rooms', otherPropertyRooms.status === 200 && otherPropertyRooms.body.length === 0, JSON.stringify(otherPropertyRooms));
const propertyLocalType = await call('POST', '/hotel/room-types', secondPropertyToken, { name: 'Standard', baseRate: 3200, capacity: 2 });
ok('same room type name can be configured in separate properties', propertyLocalType.status === 201, JSON.stringify(propertyLocalType));
const propertyLocalRoom = await call('POST', '/hotel/rooms', secondPropertyToken, { roomTypeId: propertyLocalType.body?.id, number: '101' });
ok('same room number can be used in separate properties', propertyLocalRoom.status === 201, JSON.stringify(propertyLocalRoom));
const crossPropertyWrite = await call('POST', '/hotel/reservations', secondPropertyToken, { guestId: guest.id, roomId: room.id, checkIn: day(30), checkOut: day(32) });
ok('second property cannot book first property guest or room', crossPropertyWrite.status === 400 || crossPropertyWrite.status === 404, JSON.stringify(crossPropertyWrite));
const crossPropertyUpdate = await call('PATCH', `/hotel/rooms/${room.id}/status`, secondPropertyToken, { status: 'maintenance' });
ok('second property cannot modify first property room', crossPropertyUpdate.status === 404, JSON.stringify(crossPropertyUpdate));

const badCf = await call('POST', '/hotel/guests', a, { fullName: 'X', customFields: { bogus: 1 } });
ok('rejects unknown custom field', badCf.status === 400 && badCf.body.code === 'CUSTOM_FIELDS_INVALID', JSON.stringify(badCf));

const r1 = await call('POST', '/hotel/reservations', a, {
  guestId: guest.id,
  newCompanions: [{ fullName: `New Companion ${stamp}`, phone: `+91 ${String(stamp + 1).padStart(10, '0')}` }],
  roomId: room.id,
  checkIn: day(0),
  checkOut: day(3),
});
ok('creates reservation and attaches a newly registered companion', r1.status === 201 && r1.body.guestIds.length === 2, JSON.stringify(r1));
ok('server computes total (3 nights x 3200)', r1.status === 201 && r1.body.totalAmount === 9600, JSON.stringify(r1));
const room102 = rooms.find((r) => r.number === '102');
const room103 = rooms.find((r) => r.number === '103');
const hourly2 = await call('POST', '/hotel/reservations', a, {
  guestId: guest.id, roomId: room102.id,
  checkIn: day(10), checkOut: day(10), checkInTime: '14:00', checkOutTime: '16:00',
  rateMode: 'hourly', unitRateOverride: 250, overrideReason: 'Approved smoke-test rate',
});
ok('same-day two-hour stay uses its hourly override ($500)', hourly2.status === 201 && hourly2.body.unitRate === 250 && hourly2.body.totalAmount === 500, JSON.stringify(hourly2));
const hourly3 = await call('POST', '/hotel/reservations', a, {
  guestId: guest.id, roomId: room103.id,
  checkIn: day(10), checkOut: day(10), checkInTime: '14:00', checkOutTime: '17:00',
  rateMode: 'hourly', unitRateOverride: 250, overrideReason: 'Approved smoke-test rate',
});
ok('same-day three-hour stay uses its hourly override ($750)', hourly3.status === 201 && hourly3.body.unitRate === 250 && hourly3.body.totalAmount === 750, JSON.stringify(hourly3));
const frontDeskOverride = await call('POST', '/hotel/reservations', desk, {
  guestId: guest.id, roomId: room102.id,
  checkIn: day(11), checkOut: day(11), checkInTime: '14:00', checkOutTime: '16:00',
  rateMode: 'hourly', unitRateOverride: 250, overrideReason: 'Should be rejected for front desk',
});
ok('front desk cannot apply a manual hourly rate override', frontDeskOverride.status === 403 && frontDeskOverride.body.code === 'PRICE_OVERRIDE_FORBIDDEN', JSON.stringify(frontDeskOverride));
const r2 = await call('POST', '/hotel/reservations', a, { guestId: guest.id, roomId: room.id, checkIn: day(2), checkOut: day(5) });
ok('overlapping dates are refused by the database (409)', r2.status === 409 && r2.body.code === 'ROOM_UNAVAILABLE', JSON.stringify(r2));
const r3 = await call('POST', '/hotel/reservations', a, { guestId: guest.id, roomId: room.id, checkIn: day(3), checkOut: day(5) });
ok('back-to-back stay (check-out day = next check-in) is allowed', r3.status === 201, JSON.stringify(r3));
ok('rejects check-out before check-in (400)', (await call('POST', '/hotel/reservations', a, { guestId: guest.id, roomId: room.id, checkIn: day(9), checkOut: day(8) })).status === 400);

const ci = await call('POST', `/hotel/reservations/${r1.body.id}/check-in`, a);
ok('check-in works and room becomes occupied', ci.status === 201 && (await call('GET', '/hotel/rooms', a)).body.find((r) => r.id === room.id).status === 'occupied', JSON.stringify(ci));
ok('cannot check in twice (400)', (await call('POST', `/hotel/reservations/${r1.body.id}/check-in`, a)).status === 400);
await call('POST', `/hotel/reservations/${r1.body.id}/check-out`, a);
ok('check-out sets room to cleaning', (await call('GET', '/hotel/rooms', a)).body.find((r) => r.id === room.id).status === 'cleaning');

// --- roles & limits ---
const newUser = (i) => ({ email: `staff${stamp}${i}@seabreeze.test`, fullName: 'Staff', role: 'frontdesk', password: 'a-long-password-1' });
ok('front desk cannot create users (403)', (await call('POST', '/users', desk, newUser(0))).status === 403);
let last;
for (let i = 1; i <= 6; i++) last = await call('POST', '/users', b, newUser(i)); // Basic plan allows 5 users, owner counts as 1
ok('Basic plan user limit is enforced (LIMIT_REACHED)', last.status === 403 && last.body.code === 'LIMIT_REACHED', JSON.stringify(last));

// --- tenant isolation ---
const tenantBRooms = (await call('GET', '/hotel/rooms', b)).body;
ok('tenant B sees none of tenant A\'s rooms', !tenantBRooms.some((r) => r.id === room.id));
const crossTenantReservation = await call('POST', '/hotel/reservations', b, { guestId: guest.id, roomId: room.id, checkIn: day(20), checkOut: day(22) });
ok('tenant B cannot book tenant A\'s room', crossTenantReservation.status === 400 || crossTenantReservation.status === 404, JSON.stringify(crossTenantReservation));
const rtB = (await call('POST', '/hotel/room-types', b, { name: 'Basic Room', baseRate: 1500, capacity: 2 })).body;
const roomB = (await call('POST', '/hotel/rooms', b, { roomTypeId: rtB.id, number: '1', floor: 1 })).body;
const cross = await call('POST', '/hotel/reservations', b, { guestId: guest.id, roomId: roomB.id, checkIn: day(20), checkOut: day(22) });
ok('tenant B cannot reference tenant A\'s guest (400)', cross.status === 400, JSON.stringify(cross));
ok('tenant B cannot read tenant A\'s guest list', !(await call('GET', '/hotel/guests', b)).body.some((g) => g.id === guest.id));

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
