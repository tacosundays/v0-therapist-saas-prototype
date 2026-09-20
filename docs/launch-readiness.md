# SessionSteps launch readiness

## Required before public launch

- Have healthcare counsel approve the public Privacy Policy, Terms of Service, consent language, and BAA workflow.
- Confirm signed BAAs are retained for every vendor that may handle protected health information.
- Verify production secrets, Stripe live-mode products/webhook, Paubox sender domain, Supabase redirect URLs, and the canonical `NEXT_PUBLIC_APP_URL`.
- Run the Supabase preflight, migrations, cross-tenant RLS rehearsal, and postflight against the production project; retain the results.
- Exercise backup restoration in a non-production environment and record recovery time and recovery point using `docs/backup-recovery-runbook.md`.
- Inventory Supabase Storage and run the direct object-copy recovery drill whenever irreplaceable uploads are retained.
- Configure uptime monitoring for `/api/health`, error alerting, database alerts, and an on-call recipient.
- Complete end-to-end acceptance tests with fresh therapist and client accounts on desktop and mobile.
- Confirm support ownership, response targets, refund/cancellation process, and incident escalation contacts.

## Release procedure

1. Confirm the working tree contains only the intended release.
2. Run `npm run validate`.
3. Review database migrations and rehearse them outside production.
4. Deploy a preview and test signup, login, invitation, worksheet assignment/completion, check-ins, AI session prep, billing, cancellation, and email delivery.
5. Deploy production during a monitored window.
6. Verify the home page, `/api/health`, authentication, billing, and Paubox delivery.
7. Watch application, database, email, and payment logs for at least 30 minutes.

## Rollback

- Roll back the Vercel deployment to the last known-good build.
- Do not reverse a database migration until its rollback has been rehearsed and data impact is understood.
- Disable affected integrations or features when containment is safer than rollback.
- Record the incident timeline, impact, actions, and follow-up owners.

## Recurring operations

- Monthly: review access, inactive accounts, audit events, dependency advisories, email reputation, and payment failures.
- Quarterly: restore a backup using `docs/backup-recovery-runbook.md`, review vendors and BAAs, test incident response, and run tenant-isolation tests.
- Annually: obtain legal and security review and update public policies.
