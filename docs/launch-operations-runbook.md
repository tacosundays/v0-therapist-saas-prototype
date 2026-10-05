# Launch operations runbook

## Daily through launch

- Confirm the production monitor has no open failure issue.
- Check Vercel function errors and Supabase service health.
- Check Stripe webhook deliveries for failed events.
- Check the support inbox and respond to access, billing, and safety reports.

## Incident response

1. Record when the issue began, affected users, and whether PHI may be involved.
2. Stop the affected workflow if continued use could expose or corrupt data.
3. Preserve logs; never paste PHI, credentials, invite tokens, or payment data into an issue.
4. For access incidents, revoke sessions/keys and rotate the affected secret.
5. For suspected PHI exposure, follow the breach-response process and contact counsel before notifying users.
6. Document the fix, validation, affected records, and follow-up control.

## Billing support

- Verify the customer and subscription in Stripe before changing anything.
- Use the Stripe customer portal for plan changes and cancellation.
- Refunds are intentional financial actions: record the reason and amount before submitting.
- After any change, confirm the matching webhook returned HTTP 200 and the app reflects the new status.

## Restore and rollback

- Database recovery steps and the last restore rehearsal are in `docs/backup-recovery-runbook.md`.
- For an application regression, redeploy the last known-good Vercel deployment.
- Re-run `pnpm monitor:production` after rollback or recovery.

## Escalation

- User support: support@sessionsteps.com
- Privacy requests: privacy@sessionsteps.com
- Security reports: security@sessionsteps.com
- Legal notices: legal@sessionsteps.com
- Billing: billing@sessionsteps.com
