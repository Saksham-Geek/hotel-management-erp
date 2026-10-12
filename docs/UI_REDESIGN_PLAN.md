# Hotel ERP UI redesign plan

## Verified route and workflow inventory

| Route | Existing data/actions | Redesign focus |
| --- | --- | --- |
| `/login` | Login server action calls `/auth/login`; stores an HTTP-only token | Responsive branded sign-in; retain authentication and error behavior |
| `/dashboard` | `/hotel/dashboard`, `/hotel/rooms` | Real occupancy/arrival/departure KPIs and property-local date; room board |
| `/rooms` | `/hotel/rooms`, `/hotel/room-types`; create/update inventory and status actions | Room inventory, rate configuration, permission-aware maintenance/status controls |
| `/reservations` | `/hotel/reservations`, `/hotel/rooms`, guest search; create, check-in, check-out, cancel | Front-desk reservation workflow, guest companions, nightly/hourly rates, status/search controls |
| `/guests` | `/hotel/guests`; guest create/update and protected document upload/download | Guest directory, profile editing, upload UX; keep identity data out of ordinary rows |
| `/housekeeping` | `/hotel/rooms`; room status action | Cleaning/maintenance queue and role-aware ready action |
| `/upgrade` | `/entitlements/me` | Clear current-plan and gated-feature explanation |
| `/` | Redirects to `/dashboard` | Preserve redirect |
| `/api/guest-documents/[guestId]/[documentId]` | Authenticated proxy to protected API download | Preserve private/no-store response handling |

The frontend has no billing, folio, payment, invoice, staff, password recovery, notification, or report pages today. Do not add static mockups for these absent capabilities. The project uses Next.js App Router, React Server Actions, Tailwind CSS, and shared React components. It does not currently install shadcn/ui, Lucide, charting, or data-grid packages. The redesign will reuse the existing stack and avoid new dependencies.

## Stages

1. Audit verified routes, dependencies, API calls, authorization gates, and current shared components (complete).
2. Add semantic CSS variables, accessible shared controls, status badges, room tiles, and page primitives (complete).
3. Replace the shared shell with a collapsible desktop sidebar, mobile drawer, contextual header, and existing property/account actions (complete).
4. Redesign dashboard and reservation/room/guest/housekeeping operational pages without changing API authority or business rules (complete).
5. Redesign login and plan-gate routes; refine forms, tables, empty/error states, keyboard access, and responsive behavior (complete).
6. Run TypeScript checks, tests, production builds, and authenticated route/API checks (complete). Visually inspected the dashboard and reservation workflow in the local browser at its current desktop viewport; explicit device-width emulation was unavailable in the connected browser controls.

## Boundaries

- Preserve existing authentication, property switching, plan gating, and role checks.
- Keep nightly/hourly calculations and reservation transitions server-authoritative.
- Do not create fake charts or pages for backend features that do not exist.
- Do not change the database schema or migrations for this frontend redesign.
