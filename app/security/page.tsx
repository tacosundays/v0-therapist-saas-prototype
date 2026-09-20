import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Security | SessionSteps" }

export default function SecurityPage() {
  return <LegalPage title="Security at SessionSteps" updated="September 20, 2026">
    <section><h2>Security approach</h2><p>SessionSteps uses defense-in-depth controls designed for sensitive behavioral-health workflows. Security is a shared responsibility between SessionSteps, practices, and every authorized user.</p></section>
    <section><h2>Platform controls</h2><ul><li>Encrypted HTTPS connections and encryption at rest through managed infrastructure.</li><li>Role-based access, tenant isolation, database row-level security, and server-side authorization checks.</li><li>Audit logging for sensitive administrative and clinical-workflow events.</li><li>Multi-factor authentication support, session controls, and recovery-code safeguards.</li><li>Secure email delivery through Paubox and payment processing through Stripe.</li></ul></section>
    <section><h2>Healthcare safeguards</h2><p>SessionSteps is built with HIPAA-conscious security controls. Whether a particular use is HIPAA compliant also depends on the practice&apos;s configuration, policies, workforce training, access management, and signed agreements.</p></section>
    <section><h2>Report a concern</h2><p>Do not include protected health information in a general security report. Use the in-product support channel to report a suspected security issue so it can be triaged promptly.</p></section>
  </LegalPage>
}
