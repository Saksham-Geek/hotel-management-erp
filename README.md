# Hotel ERP (multi-tenant, plan-gated)

Foundation for a hotel management system that can later host a hospital/clinic vertical on the same core.

- **apps/api**: NestJS modular monolith (PostgreSQL, row-level security, plan entitlements)
- **apps/web**: Next.js 15 App Router front desk UI (session in an httpOnly cookie)
- **packages/shared**: feature keys, roles and zod schemas used by both
- **db/migrations**: plain SQL, applied in order by `pnpm db:migrate`

## Run it

```bash
cp .env.example .env
pnpm install
pnpm db:up          # Postgres in Docker (or point the .env URLs at your own Postgres 14+)
pnpm db:migrate     # creates tables, RLS policies, the restricted erp_app role, plan catalogue
pnpm db:seed        # demo hotel on the Plus plan
pnpm dev            # web on :3000, API on :4000
```

Sign in at http://localhost:3000 with hotel code `grand-azure`, email `owner@grandazure.test`,
password `ChangeMe-123!` (also `manager@...` and `desk@...`). Change these before any real deployment.

With the API running, `node scripts/smoke.mjs` runs 24 end-to-end checks: auth, plan gating, user limits,
double-booking protection, role checks and tenant isolation.

## How plans work

Plans and their features live in the database (`plans`, `features`, `plan_features`), with per-tenant
exceptions in `tenant_feature_overrides`. To gate an API route add `@RequireFeature(FEATURES.X)`.
To gate a page call `requireFeature(FEATURES.X)`. To change what a plan includes, edit rows, no deploy needed.
Feature keys are listed in `packages/shared/src/features.ts` and must match the `features` table.

## Adding a new vertical (e.g. hospital)

1. New migration `db/migrations/00N_hospital.sql`: `patients` (references `parties`), visits, etc. with `tenant_id`, composite FKs and the RLS policy block.
2. New Nest module `apps/api/src/hospital/` with its own controllers, guarded by `hospital.*` features.
3. Insert `hospital.*` rows into `features` / `plan_features`.
4. Reuse parties, users, audit log, custom fields, entitlements and billing from the core.

Modules talk only through service interfaces, never each other's tables, so one can be moved into its own
service later.

## Hotel operations upgrade (migration 003)

The latest upgrade adds reusable guest profiles and companion links, nightly/hourly pricing, server-side price overrides with a required reason, timestamp-based room conflict prevention, one default folio per reservation, folio item/payment storage, private encrypted guest-document storage, and enforcement of subscription period expiry. The guest directory is available at `/guests`; reservation creation lets staff select existing guests and add companions without creating new profiles.

### Required encryption setup

Before storing identity numbers or uploading guest documents, set `GUEST_DOCUMENT_ENCRYPTION_KEY` to a unique 32-byte key encoded as 64 hex characters. Generate one with `openssl rand -hex 32`. Keep it in your secret manager / deployment environment, not source control, and keep a secure backup: losing the key makes encrypted identity data and documents unrecoverable. The API uses AES-256-GCM and stores encrypted bytes plus IV/authentication tag in PostgreSQL. Documents are limited to JPEG/PNG/WebP, 5 MB each, and 8 per upload. Access requires an authenticated authorized staff role and is audit logged.

### Apply the upgrade

1. Back up the database.
2. Set the encryption key in the local `.env` (do not share or commit `.env`).
3. Run `pnpm db:migrate`; the migration is forward-only and preserves existing reservations.
4. Restart API and web processes.
5. Test new guest creation, returning guest selection, companion linking, nightly/hourly reservations, cancellation/check-in/check-out, and document upload/download in a non-production environment.

### Important rollout note

Existing legacy `guests.id_number` values, if any, remain in their original column until a controlled data migration encrypts them. Back up and re-encrypt those values before production use; new writes use the encrypted columns. Do not treat this project as production-certified until the full typecheck/build, migration tests, authorization tests, concurrency tests, and security review pass.
