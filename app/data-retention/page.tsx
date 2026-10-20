import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { PRIVACY_EMAIL, PRIVACY_EMAIL_HREF } from "@/lib/contact"

export const metadata: Metadata = { title: "Data Retention and Deletion | SessionSteps" }

export default function DataRetentionPage() {
  return (
    <PublicPolicyPage
      eyebrow="Privacy"
      title="Data Retention and Deletion Policy"
      description="How SessionSteps retains, exports, deletes, and de-identifies information."
      lastUpdated="October 20, 2026"
    >
      <section><h2>1. Scope and roles</h2><p>This policy supplements the Privacy Policy, Terms of Service, and any Business Associate Agreement. For customer content, the subscribing healthcare practice generally determines why and how long records must be retained, while SessionSteps processes that information on its instructions.</p></section>
      <section><h2>2. Active accounts</h2><p>Account information and customer content are retained while an account is active and as needed to provide, secure, support, and improve the service. Healthcare customers are responsible for establishing retention schedules that satisfy clinical, licensing, payer, and legal-record obligations.</p></section>
      <section><h2>3. Cancellation and termination</h2><p>Authorized account owners should export required information before access ends. Following cancellation or termination, SessionSteps may maintain a limited recovery period described in the applicable order, account notice, or agreement. After that period, customer content is deleted or de-identified from active systems unless retention is required by law, legal hold, dispute, security investigation, payment obligation, or written agreement.</p></section>
      <section><h2>4. Backups and continuity copies</h2><p>Deleted information may remain temporarily in protected backups until those backups are overwritten through normal rotation. Backup copies are not available for ordinary product use and are retained only for continuity, security, recovery, or legal obligations. If restored after a disruption, deletion instructions are reapplied where practicable.</p></section>
      <section><h2>5. Logs, billing, and legal records</h2><p>Security, authentication, and audit records may be retained longer when reasonably needed to investigate activity, prevent abuse, demonstrate compliance, or protect the service. Invoices, transaction records, contracts, authorizations, consent records, and required business records may be kept for tax, accounting, contractual, or legal purposes. These records are not used to recreate deleted clinical content.</p></section>
      <section><h2>6. De-identified and aggregated information</h2><p>SessionSteps may retain information that has been de-identified or aggregated so that it no longer identifies a person, subject to applicable law and contractual restrictions. We do not attempt to re-identify information treated as de-identified.</p></section>
      <section><h2>7. Requests and exports</h2><p>An authorized account owner may request an export, correction, or deletion through available product controls or at <a href={PRIVACY_EMAIL_HREF}>{PRIVACY_EMAIL}</a>. We verify identity and authority before acting and will explain the applicable scope and timing. A client should generally direct a records or privacy request to their healthcare practice, which controls the record.</p></section>
    </PublicPolicyPage>
  )
}
