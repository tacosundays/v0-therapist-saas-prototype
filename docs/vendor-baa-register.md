# Vendor and BAA register

Maintain executed agreements outside the source repository. Record only status and renewal/review dates here; never commit account numbers, secrets, or signed agreements.

| Vendor | Purpose | PHI permitted? | Evidence required before launch | Status |
| --- | --- | --- | --- | --- |
| Supabase | Authentication and application database | Yes | Executed BAA; production project covered | Confirm and retain |
| Vercel | Application hosting and logs | Treat as potentially exposed | Written HIPAA/BAA determination and PHI-safe logging controls | Confirm with counsel/vendor |
| OpenAI | AI session-prep processing | Only under approved account/configuration | Executed BAA or eligible enterprise agreement; zero-retention/approved data controls | Confirm and retain |
| Paubox | Transactional email | Yes when a message contains PHI | Executed BAA and production sending domain | Confirm and retain |
| Google Workspace | Support, privacy, security, and billing mailboxes | Yes only in covered services | HIPAA BAA accepted; 2-Step Verification enforced | Completed 2026-10-05 |
| Stripe | Subscription billing | No clinical PHI | Keep clinical details out of metadata/descriptions | Configured; monitor webhooks |

Before launch, the owner and counsel must confirm that every service which creates, receives, maintains, or transmits PHI is covered and configured within its agreement's supported HIPAA services.
