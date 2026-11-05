import '../load-env';
import { Client } from 'pg';
import { calculateGstTax } from '../hotel/tax-calculator';

function addDays(d: Date, n: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + n);
  return res;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) throw new Error('DATABASE_ADMIN_URL is required');

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    console.log('✨ Seeding active, upcoming and VIP stays for all showcase hotel properties...');

    const now = new Date();
    const todayStr = formatDate(now);

    const tenants = [
      {
        slug: 'itc-hotels',
        guests: [
          { name: 'Dr. Praveen Someshwar', phone: '+91 98200 11223', vip: true, company: 'Hindustan Media' },
          { name: 'Ambassador Jean-Marc', phone: '+91 98111 22334', vip: true, company: 'Embassy of France' },
          { name: 'Natasha Poonawalla', phone: '+91 99200 33445', vip: true, company: 'Serum Institute' },
          { name: 'Vikram Chandra', phone: '+91 98100 44556', vip: false, company: 'Editorji Technologies' },
          { name: 'Arundhati Bhattacharya', phone: '+91 98210 55667', vip: true, company: 'Salesforce India' },
          { name: 'Rajeev Chandrasekhar', phone: '+91 98450 66778', vip: true, company: 'BPL Group' },
          { name: 'Sophie Zhang', phone: '+1 415 555 0199', vip: false, company: 'McKinsey & Co' },
        ],
      },
      {
        slug: 'taj-hotels',
        guests: [
          { name: 'N. Chandrasekaran', phone: '+91 98200 99887', vip: true, company: 'Tata Sons' },
          { name: 'Maharaja Gaj Singh II', phone: '+91 94140 12345', vip: true, company: 'Umaid Bhawan Royal' },
          { name: 'Falguni Nayar', phone: '+91 98201 23456', vip: true, company: 'Nykaa E-Retail' },
          { name: 'Sir James Dyson', phone: '+44 7700 900077', vip: true, company: 'Dyson Holdings' },
          { name: 'Harish Manwani', phone: '+91 98202 34567', vip: true, company: 'Unilever Global' },
          { name: 'Kavita Krishnamurthy', phone: '+91 98203 45678', vip: false, company: 'Sangeet Kala Academy' },
          { name: 'Kunal Bahl', phone: '+91 98110 56789', vip: false, company: 'Titan Capital' },
        ],
      },
      {
        slug: 'sayaji-hotels',
        guests: [
          { name: 'Anand Mahindra Jr.', phone: '+91 98211 44332', vip: true, company: 'Tech Mahindra' },
          { name: 'Sunil Agrawal', phone: '+91 94250 55667', vip: false, company: 'Pithampur Auto Components' },
          { name: 'Pooja Chhabra', phone: '+91 98260 66778', vip: false, company: 'Indore Pharma Ltd' },
          { name: 'Ketan Deshmukh', phone: '+91 98220 77889', vip: false, company: 'Hinjawadi IT Park' },
          { name: 'Deepak Parekh', phone: '+91 98200 88990', vip: true, company: 'HDFC Capital' },
        ],
      },
      {
        slug: 'radisson-india',
        guests: [
          { name: 'Captain Rahul Bajaj', phone: '+91 98205 11223', vip: true, company: 'IndiGo Airlines Crew' },
          { name: 'Elena Rostova', phone: '+7 916 555 4321', vip: false, company: 'Lufthansa Cargo' },
          { name: 'Rohan Mehra', phone: '+91 98101 22334', vip: false, company: 'MakeMyTrip Corporate' },
          { name: 'Gaurav Munjal', phone: '+91 98451 33445', vip: true, company: 'Unacademy Media' },
          { name: 'Divya Gokulnath', phone: '+91 98452 44556', vip: false, company: 'EdTech Innovations' },
        ],
      },
      {
        slug: 'city-boutique',
        guests: [
          { name: 'Rani Padmini Kumari', phone: '+91 94141 22334', vip: true, company: 'Jaipur Heritage Trust' },
          { name: 'Alexander Hamilton-Smith', phone: '+44 7911 123456', vip: true, company: 'Conde Nast Traveller' },
          { name: 'Siddharth Roy Kapur', phone: '+91 98204 33445', vip: true, company: 'Roy Kapur Films' },
          { name: 'Aditi Rao Hydari', phone: '+91 98206 44556', vip: true, company: 'Film Heritage Foundation' },
          { name: 'Dr. Shashi Tharoor', phone: '+91 98112 55667', vip: true, company: 'All India Literary Festival' },
        ],
      },
    ];

    for (const tConfig of tenants) {
      const tRes = await client.query('SELECT id FROM tenants WHERE slug = $1', [tConfig.slug]);
      if (!tRes.rows.length) continue;
      const tenantId = tRes.rows[0].id;

      const pRes = await client.query('SELECT id, name FROM properties WHERE tenant_id = $1', [tenantId]);
      const properties = pRes.rows;

      for (const prop of properties) {
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
        await client.query("SELECT set_config('app.property_id', $1, true)", [prop.id]);

        // Get rooms for this property
        const roomRes = await client.query(
          `SELECT r.id, r.number, rt.name as "roomType", coalesce(r.base_rate, rt.base_rate)::float8 as "baseRate"
           FROM rooms r
           JOIN room_types rt ON rt.id = r.room_type_id
           WHERE r.tenant_id = $1 AND r.property_id = $2
           ORDER BY r.number ASC`,
          [tenantId, prop.id],
        );
        const rooms = roomRes.rows;
        if (!rooms.length) continue;

        // Seed 4-6 active / upcoming stays
        for (let sIdx = 0; sIdx < Math.min(rooms.length, 6); sIdx++) {
          const room = rooms[sIdx * 2 % rooms.length];
          const gInfo = tConfig.guests[(sIdx + prop.name.length) % tConfig.guests.length];

          // Upsert Party
          const existingParty = (
            await client.query(
              'SELECT id FROM parties WHERE tenant_id = $1 AND property_id = $2 AND phone = $3',
              [tenantId, prop.id, gInfo.phone],
            )
          ).rows[0];
          let partyId: string;
          if (existingParty) {
            partyId = existingParty.id;
          } else {
            const partyRes = await client.query(
              `INSERT INTO parties (tenant_id, property_id, full_name, phone, email)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [
                tenantId,
                prop.id,
                gInfo.name,
                gInfo.phone,
                `${gInfo.name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
              ],
            );
            partyId = partyRes.rows[0].id;
          }

          // Upsert Guest
          const existingGuest = (
            await client.query(
              'SELECT id FROM guests WHERE tenant_id = $1 AND property_id = $2 AND party_id = $3',
              [tenantId, prop.id, partyId],
            )
          ).rows[0];
          let guestId: string;
          if (existingGuest) {
            guestId = existingGuest.id;
            await client.query('UPDATE guests SET vip = $1 WHERE id = $2', [gInfo.vip, guestId]);
          } else {
            const guestRes = await client.query(
              `INSERT INTO guests (tenant_id, property_id, party_id, vip)
               VALUES ($1, $2, $3, $4)
               RETURNING id`,
              [tenantId, prop.id, partyId, gInfo.vip],
            );
            guestId = guestRes.rows[0].id;
          }

          // Determine stay status and dates
          let status: 'checked_in' | 'reserved' = 'checked_in';
          let checkIn = todayStr;
          let checkOut = formatDate(addDays(now, 2 + (sIdx % 3)));

          if (sIdx % 2 === 1) {
            // In-house stay started 1 or 2 days ago
            checkIn = formatDate(addDays(now, -1 - (sIdx % 2)));
            checkOut = formatDate(addDays(now, 1 + (sIdx % 2)));
            status = 'checked_in';
          } else if (sIdx >= 4) {
            // Upcoming confirmed stay
            checkIn = formatDate(addDays(now, 1 + sIdx));
            checkOut = formatDate(addDays(now, 4 + sIdx));
            status = 'reserved';
          }

          const channels = ['direct', 'corporate', 'makemytrip', 'booking_com', 'agoda'];
          const channel = channels[(sIdx + prop.name.length) % channels.length];
          const duration = Math.max(1, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
          const totalTariff = room.baseRate * duration;
          const tax = calculateGstTax('ACCOMMODATION', room.baseRate, duration, false);
          const gross = tax.lineTotal;

          const checkInAt = `${checkIn} 14:00:00+05:30`;
          const checkOutAt = `${checkOut} 11:00:00+05:30`;

          const resRes = await client.query(
            `INSERT INTO reservations (
               tenant_id, property_id, guest_id, room_id, check_in, check_out,
               check_in_at, check_out_at, status, total_amount, rate_mode, booking_source
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'nightly', $11)
             RETURNING id`,
            [tenantId, prop.id, guestId, room.id, checkIn, checkOut, checkInAt, checkOutAt, status, gross, channel],
          );
          const resId = resRes.rows[0].id;

          // Link guest
          await client.query(
            `INSERT INTO reservation_guests (tenant_id, property_id, reservation_id, guest_id, is_primary)
             VALUES ($1, $2, $3, $4, true) ON CONFLICT DO NOTHING`,
            [tenantId, prop.id, resId, guestId],
          );

          // Folio
          const folioRes = await client.query(
            `INSERT INTO reservation_folios (tenant_id, property_id, reservation_id, currency, status, total, subtotal, tax_total)
             VALUES ($1, $2, $3, 'INR', $4, $5, $6, $7)
             RETURNING id`,
            [tenantId, prop.id, resId, status === 'checked_in' ? 'open' : 'open', gross, gross - tax.taxTotal, tax.taxTotal],
          );
          const folioId = folioRes.rows[0].id;

          // Folio charge
          await client.query(
            `INSERT INTO folio_items (
               tenant_id, property_id, folio_id, description, quantity, unit_price,
               tax_category_code, hsn_sac, tax_rate, cgst_amount, sgst_amount, igst_amount, line_total, created_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, 'ACCOMMODATION', '996311', $7, $8, $9, 0, $10, $11)`,
            [
              tenantId,
              prop.id,
              folioId,
              `${room.roomType} (${duration} nights)`,
              duration,
              room.baseRate,
              tax.cgstRate + tax.sgstRate,
              tax.cgstAmount,
              tax.sgstAmount,
              tax.lineTotal,
              checkInAt,
            ],
          );

          // If checked in, record 50% deposit or full payment
          if (status === 'checked_in') {
            await client.query(
              `INSERT INTO folio_payments (tenant_id, property_id, folio_id, amount, method, status, created_at)
               VALUES ($1, $2, $3, $4, 'card', 'captured', $5)`,
              [tenantId, prop.id, folioId, Math.round(gross * 0.5), checkInAt],
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Successfully seeded active stays across all showcase properties!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during showcase stay seeding:', err);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
