import '../load-env';
import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';

/**
 * Applies db/migrations/*.sql in order using the OWNER connection.
 * Also creates the restricted `erp_app` role that the API uses at runtime.
 */
async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  const appPassword = process.env.APP_DB_PASSWORD;
  if (!adminUrl || !appPassword) throw new Error('DATABASE_ADMIN_URL and APP_DB_PASSWORD are required');

  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    const role = await client.query("select 1 from pg_roles where rolname = 'erp_app'");
    const pw = appPassword.replace(/'/g, "''");
    if (role.rowCount === 0) await client.query(`create role erp_app login password '${pw}' nosuperuser nobypassrls`);
    else await client.query(`alter role erp_app password '${pw}'`);
    const { rows } = await client.query('select current_database() as db');
    await client.query(`grant connect on database "${rows[0].db}" to erp_app`);

    await client.query(`create table if not exists schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`);

    const dir = resolve(__dirname, '../../../../db/migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const done = await client.query('select 1 from schema_migrations where name = $1', [file]);
      if (done.rowCount) continue;
      console.log(`applying ${file}`);
      await client.query('begin');
      try {
        await client.query(readFileSync(resolve(dir, file), 'utf8'));
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }
    console.log('migrations up to date');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
