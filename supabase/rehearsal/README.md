# Organization migration rehearsal

Run this only against an approved disposable staging branch or sanitized clone.
Do not point these commands at production.

Required tooling: `psql`, a database-owner connection string, and a complete
schema containing the pre-002 base tables.

Order:

1. Take a staging snapshot and record its restore identifier.
2. Run `001_preflight.sql`; stop on any exception.
3. Apply migrations `026`, `027`, and `028` in a single maintenance window.
4. Run `002_postflight.sql`.
5. Run `003_cross_tenant_rls.sql`.
6. Exercise signup, client invite, team join/removal, billing, AI, MFA, and
   calendar flows through the staging application.
7. Compare therapist, client, practice, membership, and Stripe counts to the
   preflight output.

Rollback criteria:

- Roll back immediately if a therapist has zero or multiple active tenants,
  a client/clinician organization mismatch exists, an RLS isolation assertion
  fails, or billing identifiers do not map one-to-one.
- Before application traffic uses the new schema, restore the staging snapshot.
- After new organization writes begin, do not use a down migration: restore the
  snapshot or perform a reviewed forward repair so tenant assignments and audit
  history are not silently discarded.
