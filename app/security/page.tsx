import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { SECURITY_EMAIL, SECURITY_EMAIL_HREF } from "@/lib/contact"

export const metadata: Metadata = { title: "Security and Trust Center | SessionSteps" }

export default function SecurityPage() {
  return (
    <PublicPolicyPage
      eyebrow="Trust center"
      title="Security at SessionSteps"
      description="Administrative, technical, and operational safeguards for sensitive behavioral-health workflows."
      lastUpdated="October 20, 2026"
    >
      <section><h2>1. Shared responsibility</h2><p>SessionSteps uses layered safeguards designed to protect the confidentiality, integrity, and availability of information. Security and HIPAA compliance are shared responsibilities: SessionSteps protects the platform, while each practice must configure its account, authorize users, train its workforce, manage devices, and use the service consistently with its policies and agreements.</p></section>
      <section><h2>2. Data protection</h2><ul><li>Encrypted HTTPS connections for information transmitted between supported clients and the service.</li><li>Encryption at rest through managed infrastructure and storage providers.</li><li>Data minimization and restricted access for service providers based on the functions they perform.</li><li>Protected backups and recovery processes designed to support service continuity.</li></ul></section>
      <section><h2>3. Identity and access controls</h2><ul><li>Role-based permissions and server-side authorization checks.</li><li>Tenant isolation and database row-level security designed to prevent one practice from accessing another practice&apos;s records.</li><li>Session, password-recovery, and multi-factor authentication safeguards.</li><li>Audit events for sensitive administrative and clinical-workflow activity.</li></ul></section>
      <section><h2>4. Secure development and operations</h2><ul><li>Code review, automated checks, dependency maintenance, and production configuration controls.</li><li>Monitoring and logging intended to detect reliability, access, and security issues.</li><li>Limited production access based on job responsibilities and operational need.</li><li>Incident assessment, containment, remediation, and notification processes.</li></ul></section>
      <section><h2>5. Healthcare and vendor safeguards</h2><p>SessionSteps maintains safeguards designed for covered healthcare workflows and offers a Business Associate Agreement for eligible customers. Service providers that may handle PHI are evaluated for an appropriate agreement and configuration. A BAA does not make every use compliant; the customer must use covered features correctly and must not place PHI in payment fields, ordinary analytics, or unapproved integrations.</p></section>
      <section><h2>6. Customer security responsibilities</h2><ul><li>Use unique accounts, strong passwords, and multi-factor authentication.</li><li>Remove access promptly when a workforce member&apos;s role changes or ends.</li><li>Secure endpoints, browsers, email accounts, and downloaded or exported files.</li><li>Review permissions and account activity and report suspected compromise promptly.</li><li>Maintain required risk analyses, policies, training, contingency plans, and client notices.</li></ul></section>
      <section><h2>7. Reporting a security concern</h2><p>Email <a href={SECURITY_EMAIL_HREF}>{SECURITY_EMAIL}</a> to report a suspected vulnerability, unauthorized access, or security incident. Include a clear description, relevant dates, and safe reproduction steps, but do not include PHI or exploit data unnecessarily. We review reports in good faith and prioritize them based on potential impact. No online system can guarantee absolute security.</p></section>
    </PublicPolicyPage>
  )
}
