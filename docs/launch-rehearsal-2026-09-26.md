# Launch rehearsal — September 26, 2026

## Result

The core SessionSteps production journey passed a desktop launch rehearsal, including a clean-browser end-to-end test with brand-new therapist and client accounts. No product error was observed during the tested public, demo, therapist, client, worksheet, billing, or session-prep flows.

This rehearsal does not clear the product for public launch by itself. The remaining launch gates are listed below.

## Passed

- Production home page, navigation, pricing, calls to action, and public legal/security pages load.
- Demo chooser clearly states that no account is required.
- Isolated therapist demo loads synthetic practice data, eight fictional clients, worksheets, progress, and guided tour controls.
- Therapist demo session prep is synthetic and does not call a live model.
- Client demo supports assignment completion, mood check-in, a next-session note, completion progress, and reset back to the initial state.
- Authenticated therapist dashboard loads successfully.
- Client directory shows the production acceptance-test client and current homework state.
- Content Library loads 215 worksheets with category filters and assignment actions.
- Billing page shows the active trial, plan limits, and subscription-management actions.
- AI Suggestions and the client Session Prep command center load successfully.
- The acceptance-test record contains a complete real journey: client creation, Paubox invitation, client registration, worksheet assignment, worksheet start and completion, reflection, mood check-in, and generated AI session summary.
- A brand-new therapist account completed the seven-step onboarding flow in a clean browser session.
- That therapist created a brand-new client, and Paubox accepted the invitation email for delivery.
- The new client registered through the secure invite, opened the assigned homework, submitted a written response, and marked it complete.
- The new client saved a 5/10 mood check-in and a separate journal reflection.
- The therapist's client command center immediately showed 100% homework completion, the homework response, the journal reflection, the 5/10 mood check-in, and the complete activity timeline under the correct client.
- The fresh client record exposed all required inputs for AI Session Prep: homework, reflection, and mood trend.
- No live card was charged during this rehearsal.

## Mobile browser audit

- Tested the production homepage and demo chooser at a 390 × 844 phone viewport.
- Both pages fit without horizontal scrolling and retained usable navigation and calls to action.
- Confirmed the therapist demo opens without the former `Auth session missing!` error and its welcome guide fits the phone viewport.
- Found horizontal overflow in the therapist demo dashboard caused by cards retaining their intrinsic minimum width.
- Fixed the card layout locally by allowing cards to shrink within the mobile grid and added an automated regression test.
- The therapist-demo fix still needs to be committed, deployed, and retested on production.

## Still required before public launch

- Complete and record the full authenticated journey on a physical phone. The public homepage and demo chooser have passed a phone-sized browser audit.
- Complete a smoke test in a second desktop browser; a separate desktop browser was unavailable to the automated test session.
- Exercise Stripe checkout, cancellation, and refund in a controlled test environment; verify the production live-mode configuration without creating an unintended charge.
- Obtain healthcare-counsel approval of Privacy Policy, Terms of Service, consent language, and the BAA workflow.
- Confirm signed BAAs are retained for every vendor that may handle protected health information.
- Configure uptime, error, database, payment, and email alerts with a named on-call recipient.
- Finalize support ownership, response targets, cancellation/refund handling, and incident escalation contacts.
- During launch, run the release procedure in `docs/launch-readiness.md` and monitor production for at least 30 minutes.

## Recommended launch decision

Core product readiness: **pass**.

Public launch readiness: **conditional** on the remaining operational, legal, payment, and clean-device acceptance gates above.
