# SessionSteps backup and recovery runbook

## Scope and safety

This runbook covers the production Supabase database for SessionSteps. A restore
test must use an approved, access-controlled non-production project. Never start
a restore over the production project as a drill.

The production organization is on Supabase Pro. The baseline recovery mechanism
is therefore the platform's daily database backup. Unless Point-in-Time Recovery
(PITR) is separately enabled, plan for a recovery point objective (RPO) of up to
24 hours. Do not promise a recovery time objective (RTO) until a timed restore
has been completed with production-scale data.

Supabase database backups include database records and Storage metadata, but not
the actual files stored through the Storage API. Storage objects need a separate,
tested copy and recovery process before the product handles irreplaceable uploads.

The application currently uses `therapist-avatars` for public, user-replaceable
profile images and `feedback-screenshots` for private support attachments. A
production inventory on 2026-09-20 found three avatar objects and no feedback
screenshots. No clinical worksheet, reflection, check-in, or session-prep content
is stored as a file; those records remain in the database backup.

## Storage object recovery

Use a separate, access-controlled Supabase project as the target. Do not copy
production objects to a developer laptop or print object paths. Provide source
and target service-role credentials only through the operator's secret manager,
then run `npm run storage:copy` for an aggregate-only inventory. Run
`npm run storage:copy -- --execute` to create matching buckets, copy every
object directly between projects, and verify each copy with SHA-256. The script
refuses to run when the source and target URLs match.

After a drill, confirm aggregate bucket counts, test access with dedicated test
accounts, retain only non-sensitive evidence, and delete the target project.
Service-role credentials must be rotated if they were exposed outside an
approved secret manager. If feedback screenshots begin to be retained, this
copy-and-restore drill becomes a quarterly requirement.

## Roles

- Incident lead: authorizes recovery and owns the incident timeline.
- Database operator: has Supabase project-owner access and performs the restore.
- Application verifier: runs the verification steps without using real client
  accounts for testing.
- Privacy/security owner: approves any environment that will contain PHI.

At least two people should review a production recovery. Never paste passwords,
database connection strings, service-role keys, or backup contents into tickets
or chat.

## Quarterly restore exercise

1. In Supabase, open the production project and go to **Database > Backups**.
2. Record the newest successful backup timestamp, retention expiry, backup type,
   and whether PITR is enabled. Take a screenshot that contains no secrets.
3. Choose **Restore to a New Project**. Use an approved staging organization,
   private access, the same region where practical, and a clearly disposable
   name such as `sessionsteps-restore-drill-YYYY-MM-DD`.
4. Do not connect the restored project to the production domain, Paubox, Stripe
   live mode, production webhooks, calendar providers, or live AI credentials.
5. Restrict access to the named drill participants. Treat the restored database
   as production PHI; do not downgrade its security controls.
6. Start a timer when the restore is requested. Record the backup timestamp,
   restore start, database-ready time, and verification-complete time.
7. Connect with a database-owner connection string and run:

   ```bash
   psql "$RESTORE_DATABASE_URL" -f supabase/rehearsal/004_restore_verification.sql
   ```

8. Point a disposable preview deployment at the restored project using new,
   non-production secrets. Keep all outbound integrations disabled.
9. Verify login with dedicated test users, tenant isolation, client lists,
   worksheet assignment/completion, check-ins, session prep, and audit history.
10. Compare the restore report counts with the most recent retained production
    counts. Investigate any unexplained mismatch before declaring success.
11. Record the measured RPO (restore start minus backup timestamp), database
    restore duration, full verification duration, defects, and owners.
12. Delete the disposable preview and restored project after evidence is retained
    and the privacy/security owner approves deletion.

## Recovery during an incident

1. Contain writes first when continued traffic could worsen data loss.
2. Preserve logs and record the incident start, discovery, and last known-good
   transaction time.
3. Decide between PITR, a daily backup restore, or a reviewed forward repair.
4. Restore to a new project when possible and validate it before switching the
   application. A destructive in-place restore requires explicit incident-lead
   approval and a second-person review.
5. Rotate database and service credentials after a compromise.
6. Reconfigure items that a database clone does not carry over, including Auth
   settings, API keys, Storage objects, Edge Functions, Realtime settings,
   webhooks, and application environment variables.
7. Run `supabase/rehearsal/004_restore_verification.sql`, the cross-tenant RLS
   rehearsal, and the critical application acceptance tests.
8. Switch traffic only after the incident lead and verifier sign off.
9. Monitor authentication, database errors, Paubox, Stripe, and `/api/health`.

## Evidence record

Retain this record outside the restored project:

| Field | Result |
| --- | --- |
| Exercise date and operators | 2026-09-20; project owner with Codex-assisted verification |
| Source project reference | `etujpjkmptempluidgaf` |
| Backup timestamp and type | 2026-09-20 04:44:09 UTC; completed daily physical backup |
| Restore target | `sessionsteps-restore-drill-2026-09-20` (`viwjgiopeywipoemetgw`) |
| Restore requested | 2026-09-20 15:52:15 UTC |
| Database ready | Healthy before verification completed; no application integrations connected |
| Verification complete | 2026-09-20 15:58:25 UTC |
| Measured RPO | 11 hours 8 minutes |
| Database restore duration | Less than 6 minutes 10 seconds (healthy when first checked) |
| Full RTO | 6 minutes 10 seconds through read-only database verification |
| SQL verification result | Passed: all required tables present; therapist organization assignments, client tenant references, and active memberships valid; aggregate counts returned without PHI |
| Application checks | Intentionally omitted for this database-only drill; restored project was never connected to the app or outbound services |
| Storage recovery check | Live inventory verified without opening files: `therapist-avatars` contains 3 public, user-replaceable profile images; `feedback-screenshots` contains 0 objects. Direct project-to-project copy and hash-verification procedure added. |
| Defects and owners | None in database restore verification. No irreplaceable production Storage objects exist today; repeat the Storage drill when retained support uploads appear. |
| Cleanup confirmed | Yes; temporary project deleted and confirmed absent from the organization project list on 2026-09-20 |

## Current launch gate

The timed database restore and read-only structural verification passed on
2026-09-20. The live Storage inventory contains only three replaceable public
profile images and no feedback screenshots, and a direct copy-and-verification
procedure is documented. Backup recovery is therefore not a current public
launch blocker. Repeat the Storage drill when irreplaceable uploads are retained.
