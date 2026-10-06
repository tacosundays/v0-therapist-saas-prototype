# SessionSteps HIPAA Security Risk Assessment

Date: October 6, 2026  
Owner: SessionSteps LLC  
Status: Initial launch assessment; owner approval and qualified legal/security review remain required.

## Scope

This assessment covers the SessionSteps production application, its Supabase database and authentication services, Vercel hosting, Paubox transactional email, OpenAI-powered features, Stripe billing, Google Workspace support operations, administrator devices, workforce access, and documented incident/backup procedures.

## Information handled

- Account, practice, workforce, and subscription information.
- Client identifiers and behavioral-health workflow information, including assignments, responses, check-ins, reflections, and session-preparation content.
- Audit, security, device, and operational metadata.

## Safeguards verified before launch

- HTTPS and managed encryption at rest.
- Row-level security and server-side authorization with tenant-isolation tests.
- Least-privilege database grants and authenticated role enforcement.
- Audit events for sensitive workflows.
- Multi-factor authentication support and enforced 2-step verification for the company Workspace.
- Production payment webhooks, subscription lifecycle handling, and Stripe-hosted payment collection.
- Documented backup/recovery test and incident-response procedure.
- Google Workspace BAA accepted; public privacy, security, retention, subprocessor, BAA, AI/emergency, and acceptable-use notices published.

## Risk register

| Risk | Likelihood | Impact | Current controls | Required treatment |
| --- | --- | --- | --- | --- |
| Cross-tenant disclosure | Low after controls | Critical | RLS, server authorization, tenant-isolation tests | Re-run tests before releases that change data access |
| Compromised workforce account | Medium | High | MFA/2SV, least privilege, access review policy | Review access quarterly and immediately on role change |
| Vendor handles PHI without appropriate terms | Medium until all evidence retained | Critical | Vendor register and feature scoping | Obtain and retain eligibility/BAA evidence before permitting PHI for each vendor |
| Sensitive content sent through payment or ordinary support fields | Medium | High | Product notices and public guidance | Train support; remove PHI from tickets; use approved channels only |
| AI disclosure or inappropriate clinical reliance | Medium | High | Authorization, AI/emergency notice, minimum-necessary prompts | Confirm OpenAI contractual eligibility and preserve human clinical review |
| Lost or unavailable data | Low/Medium | High | Managed backups and tested recovery procedure | Schedule recurring restore drills and retain results |
| Unpatched dependency or application flaw | Medium | High | Automated tests, dependency scanning, deployment checks | Review alerts and patch critical issues promptly |
| Incident not recognized or reported promptly | Medium | High | Incident and breach-response runbook | Run tabletop exercise and retain evidence |
| Tracking/advertising exposes health information | Low with current design | Critical | No ad pixels in authenticated clinical areas | Require privacy/security review before adding pixels or session replay |
| Administrator endpoint loss or malware | Medium | High | Workspace 2SV and device security expectations | Enable disk encryption, screen lock, OS updates, and remote wipe where available |

## Launch decision

Technical controls substantially reduce the identified application risks, but this document does not certify HIPAA compliance. Launch approval requires the owner to complete the open vendor-agreement evidence, approve the written policies, restrict PHI to eligible services, and obtain professional review appropriate to SessionSteps' role and customers.

## Review cadence

Review at least annually and after a material architecture change, security incident, new PHI-handling vendor, or substantial change in applicable requirements. Record the reviewer, changes, new risks, and remediation owner.
