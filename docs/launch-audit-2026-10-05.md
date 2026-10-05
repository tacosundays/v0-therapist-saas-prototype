# Launch audit — 2026-10-05

## Verified

- Production health reports application, database, AI, email, and billing configured.
- Security headers include HSTS, frame denial, MIME sniffing protection, permissions policy, and no-store where required.
- Lint, type checking, 123 automated security/reliability tests, and the production build pass.
- Production database has organization tenancy, tenant columns, RLS on 31 tables, and 70 policies.
- Production integrity checks found no therapist/client organization gaps or mismatches.
- A two-tenant production rehearsal proved foreign reads and writes are blocked; the transaction was rolled back.
- The production permission hardening migration was applied, and the two-tenant isolation rehearsal passed again afterward.
- Supabase now reports the production project as healthy, with no overview-advisor issues and no database errors in the last 24 hours. The security advisor has no errors; its remaining warnings are documented below.
- Stripe live checkout and subscription cancellation events were delivered successfully with HTTP 200.
- Stripe webhook coverage includes checkout, subscription updates/deletions, failed payments, and successful renewal payments.
- Stripe's customer portal allows invoice history, billing-information and payment-method updates, and end-of-period cancellation with a required cancellation reason. Legal links point to the production Terms and Privacy pages.
- Password reset was manually verified.
- SPF, DKIM, DMARC, and Google Workspace MX records are published.
- Google Workspace BAA was accepted and 2-Step Verification was enabled.
- Public legal/trust pages and support addresses are published.

## Release gates requiring owner or counsel

- Counsel approval of Privacy Policy, Terms, BAA, Acceptable Use, retention, cookie, accessibility, and AI/emergency language.
- Retained executed BAA/eligibility evidence for every PHI-handling vendor listed in `docs/vendor-baa-register.md`.
- Intentional live refund rehearsal, if desired, using a documented test charge and owner approval.
- Final physical-phone and second-browser invitation rehearsal.

## Accepted technical notes

- Supabase's function-level advisor still flags authenticated execution of tenant helper functions and the authenticated session-topic workflow function. Those functions are required by signed-in workflows and RLS; the production isolation rehearsal passed after hardening.
- The pre-sign-in invitation validator remains available to anonymous users by design. It validates an invitation token and email and does not return clinical content.

Do not market the service as “fully HIPAA compliant.” HIPAA readiness depends on technical controls, signed agreements, documented policies, training, and the customer’s own compliant use.
