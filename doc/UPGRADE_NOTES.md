# Hotel ERP upgrade notes

## Implemented in this patch

- Responsive front-desk reservation form and a cleaner responsive app shell/navigation.
- Guest directory with profile registration/editing, guest search, returning guest selection, companion selection, and server-side duplicate warnings for matching name + phone/email.
- Reservation creation is transactional when a new lead guest is registered: guest, reservation, companion links, folio, and initial room charge commit or roll back together.
- Reservation-to-guest many-to-many mapping. One reservation/room has one default consolidated folio/bill; a guest can appear on multiple stays with different companions.
- Nightly and hourly rate modes, room-level hourly override or room-type hourly rate, server-side calculation, manual total override with mandatory reason and audit metadata.
- Timestamp range exclusion constraint prevents concurrent overlapping bookings at the database layer.
- Room occupancy cannot be manually set; check-in/check-out drives occupancy. Housekeeping role has a narrower room-status transition surface.
- One folio per reservation, item and payment tables for the billing domain.
- Guest identity-number encryption for new writes and AES-256-GCM encrypted document storage with role checks and access audit records.
- Subscription `current_period_end` is now enforced in entitlement resolution.

## Not yet complete / requires follow-up before production

- Owner-level multi-property organization, one login with property switching, and property-scoped subscription administration are not implemented in this patch. Current auth still operates in a tenant/property context.
- Full invoice issuance, tax jurisdiction/rate configuration, discount/deposit/refund workflows, payment reconciliation, and billing UI/API are not yet complete. This patch creates the folio schema and initial room-charge item only.
- Guest document listing/download UI and guest-profile merge workflow need finishing; the authenticated API endpoints exist.
- Existing legacy plaintext `guests.id_number` values require a controlled encryption/backfill procedure using the configured key.
- Full typecheck/build and database integration tests could not be run in this environment because package dependencies could not be installed. Run all checks locally before using this build with real guest data.
