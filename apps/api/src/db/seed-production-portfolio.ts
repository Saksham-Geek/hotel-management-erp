import '../load-env';
import { hash } from 'bcryptjs';
import { Client } from 'pg';

/**
 * Seeds the complete Customer Showcase & Production Portfolio:
 * 1. Testing Sandbox: Grand Azure Hotel (18 keys)
 * 2. Luxury Chain 1: ITC Hotels Group (ITC Maurya Delhi 32 keys + ITC Mughal Agra 28 keys)
 * 3. Luxury Chain 2: Taj Hotels IHCL (The Taj Mahal Palace Mumbai 35 keys + Taj Ganges Varanasi 25 keys)
 * 4. Mid-Market Chain 1: Sayaji Hotels (Sayaji Indore 24 keys + Sayaji Pune 20 keys)
 * 5. Mid-Market Chain 2: Radisson Hotels India (Radisson Blu Mumbai 26 keys + Radisson Blu Udaipur 24 keys)
 * 6. Local Independent Boutique Multi-Hotel: Singhania Hospitality (Heritage Haveli Jaipur 16 keys + Lakeview Resort Udaipur 14 keys)
 * 7. Churned Hotel: Coastal Haven Morjim Goa (12 keys, canceled subscription)
 * 8. Past Due Hotel: Alpine Pines Manali (18 keys, overdue payment)
 * 9. Platform Cloud HQ: Antigravity ERP Cloud Headquarters (Founder & Employee Console)
 */
async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) throw new Error('DATABASE_ADMIN_URL is required');

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    console.log('🚀 Seeding Production Multi-Tenant Portfolio...');

    const defaultPw = await hash('Password123!', 10);
    const itcPw = await hash('ItcLuxury2026!', 10);
    const tajPw = await hash('TajPalace2026!', 10);
    const sayajiPw = await hash('SayajiGrowth2026!', 10);
    const radissonPw = await hash('Radisson2026!', 10);
    const boutiquePw = await hash('Boutique2026!', 10);
    const founderPw = await hash('FounderCloud2026!', 10);
    const staffPw = await hash('HotelStaff123!', 10);

    // -------------------------------------------------------------
    // Helper: Provision Tenant & Subscriptions
    // -------------------------------------------------------------
    async function upsertTenant(data: {
      slug: string;
      name: string;
      vertical: 'hotel';
      planKey: 'starter' | 'growth' | 'enterprise';
      status?: 'active' | 'suspended';
      contactEmail: string;
      contactPhone: string;
      churnReason?: string;
      churnedAt?: string;
    }) {
      const res = await client.query(
        `INSERT INTO tenants (slug, name, vertical, status, contact_email, contact_phone, churn_reason, churned_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           status = EXCLUDED.status,
           contact_email = EXCLUDED.contact_email,
           contact_phone = EXCLUDED.contact_phone,
           churn_reason = EXCLUDED.churn_reason,
           churned_at = EXCLUDED.churned_at
         RETURNING id`,
        [
          data.slug,
          data.name,
          data.vertical,
          data.status ?? 'active',
          data.contactEmail,
          data.contactPhone,
          data.churnReason ?? null,
          data.churnedAt ?? null,
        ],
      );
      const tenantId = res.rows[0].id;
      return tenantId as string;
    }

    // Helper: Provision Property
    async function upsertProperty(data: {
      tenantId: string;
      name: string;
      timezone?: string;
      currency?: string;
      isDefault?: boolean;
      status?: 'active' | 'suspended';
      planKey: 'starter' | 'growth' | 'enterprise';
      subStatus?: 'active' | 'trialing' | 'past_due' | 'canceled';
    }) {
      const res = await client.query(
        `INSERT INTO properties (tenant_id, name, timezone, currency, is_default, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, name) DO UPDATE SET
           status = EXCLUDED.status,
           is_default = EXCLUDED.is_default
         RETURNING id`,
        [
          data.tenantId,
          data.name,
          data.timezone ?? 'Asia/Kolkata',
          data.currency ?? 'INR',
          data.isDefault ?? false,
          data.status ?? 'active',
        ],
      );
      const propertyId = res.rows[0].id as string;

      await client.query("SELECT set_config('app.tenant_id', $1, true)", [data.tenantId]);
      await client.query("SELECT set_config('app.property_id', $1, true)", [propertyId]);

      await client.query(
        `INSERT INTO property_subscriptions (tenant_id, property_id, plan_key, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, property_id) DO UPDATE SET
           plan_key = EXCLUDED.plan_key,
           status = EXCLUDED.status`,
        [data.tenantId, propertyId, data.planKey, data.subStatus ?? 'active'],
      );

      return propertyId;
    }

    // Helper: Provision User & Property Role
    async function upsertUser(data: {
      tenantId: string;
      propertyId: string;
      email: string;
      fullName: string;
      passwordHash: string;
      role: 'owner' | 'manager' | 'frontdesk' | 'housekeeping';
    }) {
      const res = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role
         RETURNING id`,
        [data.tenantId, data.email.toLowerCase(), data.passwordHash, data.fullName, data.role],
      );
      const userId = res.rows[0].id as string;

      await client.query(
        `INSERT INTO property_users (tenant_id, property_id, user_id, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, property_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [data.tenantId, data.propertyId, userId, data.role],
      );

      return userId;
    }

    // Helper: Provision Room Types & Rooms
    async function seedRooms(
      tenantId: string,
      propertyId: string,
      roomTypesConfig: { name: string; baseRate: number; capacity: number; count: number; prefix: number }[],
    ) {
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      await client.query("SELECT set_config('app.property_id', $1, true)", [propertyId]);

      for (const rt of roomTypesConfig) {
        const typeRes = await client.query(
          `INSERT INTO room_types (tenant_id, property_id, name, base_rate, capacity)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tenant_id, property_id, name) DO UPDATE SET base_rate = EXCLUDED.base_rate
           RETURNING id`,
          [tenantId, propertyId, rt.name, rt.baseRate, rt.capacity],
        );
        const typeId = typeRes.rows[0].id;

        for (let i = 1; i <= rt.count; i++) {
          const roomNum = `${rt.prefix}${i.toString().padStart(2, '0')}`;
          await client.query(
            `INSERT INTO rooms (tenant_id, property_id, room_type_id, number, floor, status)
             VALUES ($1, $2, $3, $4, $5, 'available')
             ON CONFLICT (tenant_id, property_id, number) DO UPDATE SET room_type_id = EXCLUDED.room_type_id`,
            [tenantId, propertyId, typeId, roomNum, rt.prefix],
          );
        }
      }
    }

    // Helper: Seed SaaS Invoices into platform_subscription_invoices
    async function seedSaaSInvoices(
      tenantId: string,
      slug: string,
      planKey: string,
      monthlyAmount: number,
      monthsPaid: number,
      hasPending: boolean = false,
    ) {
      const now = new Date();
      for (let m = monthsPaid; m >= 1; m--) {
        const periodStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
        const invNum = `INV-${slug.toUpperCase()}-${periodStart.getFullYear()}${(periodStart.getMonth() + 1).toString().padStart(2, '0')}`;

        await client.query(
          `INSERT INTO platform_subscription_invoices (
             tenant_id, invoice_number, plan_key, amount, currency, status,
             billing_period_start, billing_period_end, paid_at, payment_method, created_at
           )
           VALUES ($1, $2, $3, $4, 'INR', 'paid', $5, $6, $7, 'razorpay_mandate', $7)
           ON CONFLICT (invoice_number) DO NOTHING`,
          [
            tenantId,
            invNum,
            planKey,
            monthlyAmount,
            periodStart.toISOString().slice(0, 10),
            periodEnd.toISOString().slice(0, 10),
            periodStart.toISOString(),
          ],
        );
      }

      if (hasPending) {
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const invNum = `INV-${slug.toUpperCase()}-${periodStart.getFullYear()}${(periodStart.getMonth() + 1).toString().padStart(2, '0')}`;

        await client.query(
          `INSERT INTO platform_subscription_invoices (
             tenant_id, invoice_number, plan_key, amount, currency, status,
             billing_period_start, billing_period_end, paid_at, payment_method, created_at
           )
           VALUES ($1, $2, $3, $4, 'INR', 'pending', $5, $6, null, 'bank_neft', $7)
           ON CONFLICT (invoice_number) DO NOTHING`,
          [
            tenantId,
            invNum,
            planKey,
            monthlyAmount,
            periodStart.toISOString().slice(0, 10),
            periodEnd.toISOString().slice(0, 10),
            now.toISOString(),
          ],
        );
      }
    }

    // -------------------------------------------------------------
    // 1. UPDATE TEST SANDBOX: Grand Azure Hotel (grand-azure)
    // -------------------------------------------------------------
    console.log('1. Configuring Testing Sandbox: Grand Azure Hotel...');
    const tGrandAzure = await upsertTenant({
      slug: 'grand-azure',
      name: 'Grand Azure Hotel',
      vertical: 'hotel',
      planKey: 'growth',
      contactEmail: 'owner@grandazure.test',
      contactPhone: '+91 98765 43210',
    });
    await seedSaaSInvoices(tGrandAzure, 'grand-azure', 'growth', 5999, 6);

    // -------------------------------------------------------------
    // 2. LUXURY CHAIN 1: ITC Hotels Group (itc-hotels)
    // -------------------------------------------------------------
    console.log('2. Provisioning Luxury Chain 1: ITC Hotels Group (ITC Maurya & ITC Mughal)...');
    const tItc = await upsertTenant({
      slug: 'itc-hotels',
      name: 'ITC Hotels & Resorts',
      vertical: 'hotel',
      planKey: 'enterprise',
      contactEmail: 'owner@itchotels.com',
      contactPhone: '+91 11 2611 2233',
    });

    const pMaurya = await upsertProperty({
      tenantId: tItc,
      name: 'ITC Maurya, New Delhi',
      isDefault: true,
      planKey: 'enterprise',
    });
    const pMughal = await upsertProperty({
      tenantId: tItc,
      name: 'ITC Mughal, Agra',
      isDefault: false,
      planKey: 'enterprise',
    });

    // Users
    const uItcOwner = await upsertUser({
      tenantId: tItc,
      propertyId: pMaurya,
      email: 'owner@itchotels.com',
      fullName: 'Nakul Anand',
      passwordHash: itcPw,
      role: 'owner',
    });
    // Grant owner access to second property as well
    await client.query(
      `INSERT INTO property_users (tenant_id, property_id, user_id, role)
       VALUES ($1, $2, $3, 'owner') ON CONFLICT DO NOTHING`,
      [tItc, pMughal, uItcOwner],
    );

    await upsertUser({
      tenantId: tItc,
      propertyId: pMaurya,
      email: 'maurya.gm@itchotels.com',
      fullName: 'Amaresh Tiwari',
      passwordHash: staffPw,
      role: 'manager',
    });
    await upsertUser({
      tenantId: tItc,
      propertyId: pMughal,
      email: 'mughal.gm@itchotels.com',
      fullName: 'Deepak Menezes',
      passwordHash: staffPw,
      role: 'manager',
    });

    // Rooms
    await seedRooms(tItc, pMaurya, [
      { name: 'Executive Club Room', baseRate: 14000, capacity: 2, count: 14, prefix: 1 },
      { name: 'The Towers Luxury Suite', baseRate: 24000, capacity: 3, count: 10, prefix: 2 },
      { name: 'Grand Presidential Suite', baseRate: 95000, capacity: 4, count: 8, prefix: 3 },
    ]);
    await seedRooms(tItc, pMughal, [
      { name: 'Mughal Chamber', baseRate: 11000, capacity: 2, count: 14, prefix: 1 },
      { name: 'Royal Mughal Suite', baseRate: 19000, capacity: 3, count: 10, prefix: 2 },
      { name: 'Mumtaz Mahal Suite', baseRate: 48000, capacity: 4, count: 4, prefix: 3 },
    ]);
    await seedSaaSInvoices(tItc, 'itc', 'enterprise', 19999, 10);

    // -------------------------------------------------------------
    // 3. LUXURY CHAIN 2: Taj Hotels Group (taj-hotels)
    // -------------------------------------------------------------
    console.log('3. Provisioning Luxury Chain 2: Taj Hotels IHCL (The Taj Mahal Palace & Taj Ganges)...');
    const tTaj = await upsertTenant({
      slug: 'taj-hotels',
      name: 'The Indian Hotels Company (Taj Hotels)',
      vertical: 'hotel',
      planKey: 'enterprise',
      contactEmail: 'director@tajhotels.com',
      contactPhone: '+91 22 6665 3366',
    });

    const pTajPalace = await upsertProperty({
      tenantId: tTaj,
      name: 'The Taj Mahal Palace, Mumbai',
      isDefault: true,
      planKey: 'enterprise',
    });
    const pTajGanges = await upsertProperty({
      tenantId: tTaj,
      name: 'Taj Ganges, Varanasi',
      isDefault: false,
      planKey: 'enterprise',
    });

    // Users
    const uTajOwner = await upsertUser({
      tenantId: tTaj,
      propertyId: pTajPalace,
      email: 'director@tajhotels.com',
      fullName: 'Puneet Chhatwal',
      passwordHash: tajPw,
      role: 'owner',
    });
    await client.query(
      `INSERT INTO property_users (tenant_id, property_id, user_id, role)
       VALUES ($1, $2, $3, 'owner') ON CONFLICT DO NOTHING`,
      [tTaj, pTajGanges, uTajOwner],
    );

    await upsertUser({
      tenantId: tTaj,
      propertyId: pTajPalace,
      email: 'palace.gm@tajhotels.com',
      fullName: 'Taljinder Singh',
      passwordHash: staffPw,
      role: 'manager',
    });
    await upsertUser({
      tenantId: tTaj,
      propertyId: pTajGanges,
      email: 'ganges.gm@tajhotels.com',
      fullName: 'Nandeesh R.',
      passwordHash: staffPw,
      role: 'manager',
    });

    // Rooms
    await seedRooms(tTaj, pTajPalace, [
      { name: 'Palace Wing Luxury Grande', baseRate: 22000, capacity: 2, count: 15, prefix: 1 },
      { name: 'Sea Facing Heritage Suite', baseRate: 42000, capacity: 3, count: 12, prefix: 2 },
      { name: 'Tata Presidential Suite', baseRate: 150000, capacity: 4, count: 8, prefix: 3 },
    ]);
    await seedRooms(tTaj, pTajGanges, [
      { name: 'Deluxe Valley View', baseRate: 10500, capacity: 2, count: 12, prefix: 1 },
      { name: 'Ganges Executive Suite', baseRate: 18500, capacity: 3, count: 9, prefix: 2 },
      { name: 'Maharaja Suite', baseRate: 45000, capacity: 4, count: 4, prefix: 3 },
    ]);
    await seedSaaSInvoices(tTaj, 'taj', 'enterprise', 19999, 12);

    // -------------------------------------------------------------
    // 4. MID-MARKET CHAIN 1: Sayaji Hotels (sayaji-hotels)
    // -------------------------------------------------------------
    console.log('4. Provisioning Mid-Market Chain 1: Sayaji Hotels (Indore & Pune)...');
    const tSayaji = await upsertTenant({
      slug: 'sayaji-hotels',
      name: 'Sayaji Hotels Group',
      vertical: 'hotel',
      planKey: 'growth',
      contactEmail: 'owner@sayajihotels.com',
      contactPhone: '+91 731 400 6666',
    });

    const pSayajiIndore = await upsertProperty({
      tenantId: tSayaji,
      name: 'Sayaji Hotel Indore',
      isDefault: true,
      planKey: 'growth',
    });
    const pSayajiPune = await upsertProperty({
      tenantId: tSayaji,
      name: 'Sayaji Hotel Pune',
      isDefault: false,
      planKey: 'growth',
    });

    const uSayajiOwner = await upsertUser({
      tenantId: tSayaji,
      propertyId: pSayajiIndore,
      email: 'owner@sayajihotels.com',
      fullName: 'Raoof Dhanani',
      passwordHash: sayajiPw,
      role: 'owner',
    });
    await client.query(
      `INSERT INTO property_users (tenant_id, property_id, user_id, role)
       VALUES ($1, $2, $3, 'owner') ON CONFLICT DO NOTHING`,
      [tSayaji, pSayajiPune, uSayajiOwner],
    );

    await upsertUser({
      tenantId: tSayaji,
      propertyId: pSayajiIndore,
      email: 'indore.gm@sayajihotels.com',
      fullName: 'Nitin Sharma',
      passwordHash: staffPw,
      role: 'manager',
    });
    await upsertUser({
      tenantId: tSayaji,
      propertyId: pSayajiPune,
      email: 'pune.gm@sayajihotels.com',
      fullName: 'Sanjay Verma',
      passwordHash: staffPw,
      role: 'manager',
    });

    await seedRooms(tSayaji, pSayajiIndore, [
      { name: 'Sayaji Grande Room', baseRate: 5500, capacity: 2, count: 14, prefix: 1 },
      { name: 'Sayaji Club Suite', baseRate: 8500, capacity: 3, count: 10, prefix: 2 },
    ]);
    await seedRooms(tSayaji, pSayajiPune, [
      { name: 'Executive Club Room', baseRate: 6000, capacity: 2, count: 12, prefix: 1 },
      { name: 'Presidential Suite', baseRate: 10000, capacity: 3, count: 8, prefix: 2 },
    ]);
    await seedSaaSInvoices(tSayaji, 'sayaji', 'growth', 5999, 8);

    // -------------------------------------------------------------
    // 5. MID-MARKET CHAIN 2: Radisson Hotels India (radisson-india)
    // -------------------------------------------------------------
    console.log('5. Provisioning Mid-Market Chain 2: Radisson Hotels (Mumbai Airport & Udaipur Palace)...');
    const tRadisson = await upsertTenant({
      slug: 'radisson-india',
      name: 'Radisson Hotel Group India',
      vertical: 'hotel',
      planKey: 'growth',
      contactEmail: 'franchise@radissonhotels.com',
      contactPhone: '+91 22 5005 0000',
    });

    const pRadissonMumbai = await upsertProperty({
      tenantId: tRadisson,
      name: 'Radisson Blu Mumbai Airport',
      isDefault: true,
      planKey: 'growth',
    });
    const pRadissonUdaipur = await upsertProperty({
      tenantId: tRadisson,
      name: 'Radisson Blu Udaipur Palace Resort',
      isDefault: false,
      planKey: 'growth',
    });

    const uRadissonOwner = await upsertUser({
      tenantId: tRadisson,
      propertyId: pRadissonMumbai,
      email: 'franchise@radissonhotels.com',
      fullName: 'Zubin Saxena',
      passwordHash: radissonPw,
      role: 'owner',
    });
    await client.query(
      `INSERT INTO property_users (tenant_id, property_id, user_id, role)
       VALUES ($1, $2, $3, 'owner') ON CONFLICT DO NOTHING`,
      [tRadisson, pRadissonUdaipur, uRadissonOwner],
    );

    await upsertUser({
      tenantId: tRadisson,
      propertyId: pRadissonMumbai,
      email: 'mumbai.gm@radissonhotels.com',
      fullName: 'Vikas Sharma',
      passwordHash: staffPw,
      role: 'manager',
    });
    await upsertUser({
      tenantId: tRadisson,
      propertyId: pRadissonUdaipur,
      email: 'udaipur.gm@radissonhotels.com',
      fullName: 'Anurag Gupta',
      passwordHash: staffPw,
      role: 'manager',
    });

    await seedRooms(tRadisson, pRadissonMumbai, [
      { name: 'Superior Room', baseRate: 7500, capacity: 2, count: 16, prefix: 1 },
      { name: 'Business Class Suite', baseRate: 12000, capacity: 3, count: 10, prefix: 2 },
    ]);
    await seedRooms(tRadisson, pRadissonUdaipur, [
      { name: 'Deluxe Lake View', baseRate: 8500, capacity: 2, count: 14, prefix: 1 },
      { name: 'Heritage Palace Suite', baseRate: 15500, capacity: 3, count: 10, prefix: 2 },
    ]);
    await seedSaaSInvoices(tRadisson, 'radisson', 'growth', 5999, 7);

    // -------------------------------------------------------------
    // 6. LOCAL CITY INDEPENDENT MULTI-HOTEL OWNER: Singhania Boutique
    // -------------------------------------------------------------
    console.log('6. Provisioning Local Boutique Multi-Hotel: Singhania Group (Heritage Haveli & Lakeview Resort)...');
    const tBoutique = await upsertTenant({
      slug: 'city-boutique',
      name: 'Singhania Boutique Hospitality',
      vertical: 'hotel',
      planKey: 'growth',
      contactEmail: 'owner@singhaniahotels.com',
      contactPhone: '+91 141 238 8899',
    });

    const pHaveli = await upsertProperty({
      tenantId: tBoutique,
      name: 'Heritage Haveli, Jaipur',
      isDefault: true,
      planKey: 'growth',
    });
    const pLakeview = await upsertProperty({
      tenantId: tBoutique,
      name: 'Lakeview Boutique Resort, Udaipur',
      isDefault: false,
      planKey: 'growth',
    });

    const uBoutiqueOwner = await upsertUser({
      tenantId: tBoutique,
      propertyId: pHaveli,
      email: 'owner@singhaniahotels.com',
      fullName: 'Vikram Singhania',
      passwordHash: boutiquePw,
      role: 'owner',
    });
    await client.query(
      `INSERT INTO property_users (tenant_id, property_id, user_id, role)
       VALUES ($1, $2, $3, 'owner') ON CONFLICT DO NOTHING`,
      [tBoutique, pLakeview, uBoutiqueOwner],
    );

    await upsertUser({
      tenantId: tBoutique,
      propertyId: pHaveli,
      email: 'jaipur.mgr@singhaniahotels.com',
      fullName: 'Mahesh Bhati',
      passwordHash: staffPw,
      role: 'manager',
    });
    await upsertUser({
      tenantId: tBoutique,
      propertyId: pLakeview,
      email: 'udaipur.mgr@singhaniahotels.com',
      fullName: 'Devendra Rathore',
      passwordHash: staffPw,
      role: 'manager',
    });

    await seedRooms(tBoutique, pHaveli, [
      { name: 'Haveli Deluxe Room', baseRate: 4800, capacity: 2, count: 10, prefix: 1 },
      { name: 'Royal Courtyard Suite', baseRate: 7800, capacity: 3, count: 6, prefix: 2 },
    ]);
    await seedRooms(tBoutique, pLakeview, [
      { name: 'Lakefront Villa', baseRate: 6200, capacity: 2, count: 8, prefix: 1 },
      { name: 'Sunset Cottage Suite', baseRate: 9800, capacity: 3, count: 6, prefix: 2 },
    ]);
    await seedSaaSInvoices(tBoutique, 'boutique', 'growth', 5999, 5);

    // -------------------------------------------------------------
    // 7. CHURNED HOTEL: Coastal Haven Goa (coastal-haven)
    // -------------------------------------------------------------
    console.log('7. Provisioning Churned Account: Coastal Haven Goa (Canceled)...');
    const tCoastal = await upsertTenant({
      slug: 'coastal-haven',
      name: 'Coastal Haven Boutique Retreat, Goa',
      vertical: 'hotel',
      planKey: 'starter',
      status: 'suspended',
      contactEmail: 'owner@coastalhaven.test',
      contactPhone: '+91 832 245 7788',
      churnReason: 'Seasonal monsoon closure & property lease expired',
      churnedAt: '2026-09-01T00:00:00Z',
    });

    const pCoastal = await upsertProperty({
      tenantId: tCoastal,
      name: 'Coastal Haven Retreat, Morjim',
      isDefault: true,
      status: 'suspended',
      planKey: 'starter',
      subStatus: 'canceled',
    });

    await upsertUser({
      tenantId: tCoastal,
      propertyId: pCoastal,
      email: 'owner@coastalhaven.test',
      fullName: "Anthony D'Souza",
      passwordHash: defaultPw,
      role: 'owner',
    });
    await seedRooms(tCoastal, pCoastal, [
      { name: 'Beachside Cabana', baseRate: 3500, capacity: 2, count: 8, prefix: 1 },
      { name: 'Sea View Suite', baseRate: 6000, capacity: 3, count: 4, prefix: 2 },
    ]);
    await seedSaaSInvoices(tCoastal, 'coastal', 'starter', 1999, 8);

    // -------------------------------------------------------------
    // 8. PAST DUE HOTEL: Alpine Pines Resort Manali (alpine-manali)
    // -------------------------------------------------------------
    console.log('8. Provisioning Past Due Account: Alpine Pines Resort Manali (Overdue)...');
    const tAlpine = await upsertTenant({
      slug: 'alpine-manali',
      name: 'Alpine Pines Resort, Manali',
      vertical: 'hotel',
      planKey: 'growth',
      contactEmail: 'owner@alpinepines.test',
      contactPhone: '+91 1902 252 111',
    });

    const pAlpine = await upsertProperty({
      tenantId: tAlpine,
      name: 'Alpine Pines Resort, Manali',
      isDefault: true,
      planKey: 'growth',
      subStatus: 'past_due',
    });

    await upsertUser({
      tenantId: tAlpine,
      propertyId: pAlpine,
      email: 'owner@alpinepines.test',
      fullName: 'Rajeshwar Thakur',
      passwordHash: defaultPw,
      role: 'owner',
    });
    await seedRooms(tAlpine, pAlpine, [
      { name: 'Pine Chalet Room', baseRate: 4500, capacity: 2, count: 12, prefix: 1 },
      { name: 'Valley View Suite', baseRate: 7200, capacity: 3, count: 6, prefix: 2 },
    ]);
    await seedSaaSInvoices(tAlpine, 'alpine', 'growth', 5999, 4, true);

    // -------------------------------------------------------------
    // 9. PLATFORM FOUNDER & EMPLOYEES HQ: Antigravity ERP Cloud
    // -------------------------------------------------------------
    console.log('9. Provisioning Platform Founder & Employees HQ (Antigravity ERP Cloud)...');
    const tHq = await upsertTenant({
      slug: 'platform-hq',
      name: 'Antigravity ERP Cloud HQ',
      vertical: 'hotel',
      planKey: 'enterprise',
      contactEmail: 'founder@antigravity-erp.com',
      contactPhone: '+91 80 4000 1122',
    });

    const pHq = await upsertProperty({
      tenantId: tHq,
      name: 'SaaS Platform Operations HQ',
      isDefault: true,
      planKey: 'enterprise',
    });

    await upsertUser({
      tenantId: tHq,
      propertyId: pHq,
      email: 'founder@antigravity-erp.com',
      fullName: 'SaaS Platform Founder',
      passwordHash: founderPw,
      role: 'owner',
    });
    await upsertUser({
      tenantId: tHq,
      propertyId: pHq,
      email: 'ops@antigravity-erp.com',
      fullName: 'Kavita Sharma (Lead Ops)',
      passwordHash: staffPw,
      role: 'manager',
    });

    // Also link owner@grandazure.test to platform-hq as an authorized owner so the testing user has instant HQ access
    const existingTestOwner = (
      await client.query(`SELECT id FROM users WHERE tenant_id = $1 AND email = 'owner@grandazure.test'`, [tGrandAzure])
    ).rows[0];
    if (existingTestOwner) {
      await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
         VALUES ($1, 'owner@grandazure.test', $2, 'Asha Verma (Platform Director)', 'owner')
         ON CONFLICT (tenant_id, email) DO NOTHING`,
        [tHq, await hash('ChangeMe-123!', 10)],
      );
      const hqTestOwner = (
        await client.query(`SELECT id FROM users WHERE tenant_id = $1 AND email = 'owner@grandazure.test'`, [tHq])
      ).rows[0];
      if (hqTestOwner) {
        await client.query(
          `INSERT INTO property_users (tenant_id, property_id, user_id, role)
           VALUES ($1, $2, $3, 'owner') ON CONFLICT DO NOTHING`,
          [tHq, pHq, hqTestOwner.id],
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Successfully seeded entire Customer Showcase Portfolio & SaaS Platform HQ!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding production portfolio:', err);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
