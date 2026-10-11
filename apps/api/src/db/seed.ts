import '../load-env';
import { hash } from 'bcryptjs';
import { Client } from 'pg';

/** Creates a demo hotel on the Plus plan. Safe to re-run. Uses the OWNER connection. */
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
  await client.connect();
  try {
    await client.query('begin');
    const t = await client.query(
      `insert into tenants (slug, name, vertical) values ('grand-azure', 'Grand Azure Hotel', 'hotel')
       on conflict (slug) do update set name = excluded.name returning id`,
    );
    const tenantId: string = t.rows[0].id;
    await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);

    await client.query(
      `insert into properties (tenant_id, name, timezone, currency, is_default)
       values ($1, 'Grand Azure Hotel', 'Asia/Kolkata', 'INR', true)
       on conflict (tenant_id, name) do update set name = excluded.name returning id`,
      [tenantId],
    );
    const property = await client.query(`select id from properties where tenant_id = $1 and name = 'Grand Azure Hotel'`, [tenantId]);
    const propertyId: string = property.rows[0].id;
    await client.query("select set_config('app.property_id', $1, true)", [propertyId]);
    await client.query(
      `insert into property_subscriptions (tenant_id, property_id, plan_key, status) values ($1,$2,'plus','active')
       on conflict (tenant_id, property_id) do nothing`,
      [tenantId, propertyId],
    );

    const pw = await hash('ChangeMe-123!', 10);
    const users: [string, string, string][] = [
      ['owner@grandazure.test', 'Asha Verma', 'owner'],
      ['manager@grandazure.test', 'Rohan Iyer', 'manager'],
      ['desk@grandazure.test', 'Meera Nair', 'frontdesk'],
    ];
    for (const [email, name, role] of users) {
      const inserted = await client.query(
        `insert into users (tenant_id, email, password_hash, full_name, role) values ($1,$2,$3,$4,$5)
         on conflict (tenant_id, email) do nothing returning id`,
        [tenantId, email, pw, name, role],
      );
      const existing = inserted.rows[0] ?? (await client.query(
        `select id from users where tenant_id = $1 and email = $2`, [tenantId, email],
      )).rows[0];
      await client.query(
        `insert into property_users (tenant_id, property_id, user_id, role) values ($1,$2,$3,$4)
         on conflict (tenant_id, property_id, user_id) do nothing`,
        [tenantId, propertyId, existing.id, role],
      );
    }

    const types: [string, number, number][] = [['Standard', 3200, 2], ['Deluxe', 4800, 3], ['Suite', 9500, 4]];
    for (const [name, rate, cap] of types) {
      await client.query(
        `insert into room_types (tenant_id, name, base_rate, capacity) values ($1,$2,$3,$4)
         on conflict (tenant_id, property_id, name) do nothing`,
        [tenantId, name, rate, cap],
      );
    }
    const rt = await client.query('select id, name from room_types where tenant_id = $1', [tenantId]);
    const typeId = (n: string) => rt.rows.find((r) => r.name === n).id as string;
    for (let floor = 1; floor <= 3; floor++) {
      for (let i = 1; i <= 6; i++) {
        const number = `${floor}0${i}`;
        const type = floor === 3 ? (i <= 2 ? 'Suite' : 'Deluxe') : i <= 3 ? 'Standard' : 'Deluxe';
        await client.query(
          `insert into rooms (tenant_id, room_type_id, number, floor) values ($1,$2,$3,$4)
           on conflict (tenant_id, property_id, number) do nothing`,
          [tenantId, typeId(type), number, floor],
        );
      }
    }
    await client.query('commit');
    console.log('Seeded tenant "grand-azure" (Plus plan). Login: owner@grandazure.test / ChangeMe-123!');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
