import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Privacy Policy | SessionSteps" }

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="September 20, 2026">
    <section><h2>What this policy covers</h2><p>This policy explains how SessionSteps handles information when therapists, practice staff, and clients use the service. SessionSteps is designed for behavioral-health workflows and uses administrative, technical, and contractual safeguards appropriate to the information it processes.</p></section>
    <section><h2>Information we process</h2><ul><li>Account and practice information, such as names, email addresses, roles, and subscription details.</li><li>Information entered into the service, including assignments, worksheet responses, reflections, check-ins, and session-preparation content.</li><li>Security, audit, device, and service-usage information needed to operate and protect the platform.</li></ul></section>
    <section><h2>How information is used</h2><p>We use information to provide and secure the service, support users, process subscriptions, deliver requested notifications, troubleshoot problems, and improve reliability. We do not sell personal information or use clinical content for advertising.</p></section>
    <section><h2>Service providers</h2><p>We use carefully selected providers for hosting, database services, secure email delivery, payments, and limited product operations. Access is limited to the purpose of providing the service, and healthcare vendors are covered by appropriate agreements where required.</p></section>
    <section><h2>Retention and choices</h2><p>Practice administrators control their workspace and client records. Requests to access, correct, export, or delete information should first be directed to the relevant practice. We retain information only as needed to provide the service, meet contractual obligations, resolve disputes, and satisfy applicable law.</p></section>
    <section><h2>Contact</h2><p>Privacy questions may be sent through the in-product feedback and support channel. This policy should be reviewed together with any privacy notice provided by your therapist or practice.</p></section>
  </LegalPage>
}
