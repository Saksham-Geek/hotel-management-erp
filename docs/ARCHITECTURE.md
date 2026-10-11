# Architecture notes

## Decisions
| Decision | Choice | Why |
|---|---|---|
| Shape | Modular monolith | One deployable fits a ~$20/month box; module boundaries keep later extraction cheap |
| Database | PostgreSQL | Transactions, relational integrity, JSONB for custom fields, RLS, range exclusion constraints |
| Tenant isolation | `tenant_id` + forced RLS, API connects as a non-owner role | A forgotten `WHERE` cannot leak data |
| Cross-tenant references | Composite `(tenant_id, id)` foreign keys | FK checks bypass RLS, so single-column FKs would allow cross-tenant links |
| Double booking | `EXCLUDE USING gist` on room + date range | Correct under concurrent requests; no app-level locking needed |
| Plans | Data-driven entitlements, enforced in the API | UI hiding is cosmetic; the guard is the real control |
| Plan/tenant writes | Revoked from the runtime DB role | A tenant admin must not be able to upgrade their own plan |
| Sessions | JWT in an httpOnly cookie, set by Next server actions | Token never reaches browser JavaScript |
| Money | `numeric(12,2)`, totals computed server-side | Clients never set prices |
| "Today" | Computed in the tenant's timezone (`tenant_today()`) | Arrivals/departures are wrong near midnight otherwise |

## Known gaps (deliberately not done yet)
- Short-lived access tokens with rotating refresh tokens, MFA, password reset, account lockout
- Permission table (today: four fixed roles checked with `@Roles`)
- Field-level encryption for guest ID numbers (column is plain text with a TODO)
- Guest de-duplication (the reservation form creates a new guest each time)
- Subscription admin path (billing webhooks, plan changes, `EntitlementsService.invalidate`) and a super-admin console
- Production Docker images, Caddy config, memory limits, backup + restore scripts, CI
- Reports, housekeeping tasks (the board only shows rooms by status), POS, channel manager
- Browser-level tests; only the API smoke test exists
- Hospital vertical
