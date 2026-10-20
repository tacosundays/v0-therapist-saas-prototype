import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { PRIVACY_EMAIL, PRIVACY_EMAIL_HREF } from "@/lib/contact"

export const metadata: Metadata = { title: "Subprocessors | SessionSteps" }

const processors = [
  {
    name: "Supabase",
    purpose: "Database, authentication, and file storage",
    data: "Account data and customer content, including PHI when the service is configured for that use",
  },
  {
    name: "Vercel",
    purpose: "Application hosting, content delivery, security, and operational web analytics",
    data: "Application requests, device and network information, and limited usage metadata",
  },
  {
    name: "OpenAI",
    purpose: "Optional AI-assisted features requested by authorized users",
    data: "Prompts, selected context, and generated output; PHI only under an approved configuration and applicable agreement",
  },
  {
    name: "Stripe",
    purpose: "Subscriptions, payments, invoicing, tax, and fraud prevention",
    data: "Billing, transaction, and payment-related information; clinical content should not be entered",
  },
  {
    name: "Google Workspace",
    purpose: "Company email, support, administration, and optional Google Calendar connectivity",
    data: "Business communications, support information, and integration data authorized by the user",
  },
  {
    name: "Paubox",
    purpose: "Transactional and secure email delivery",
    data: "Recipient, delivery, and message information; PHI only through the covered configuration",
  },
]

export default function SubprocessorsPage() {
  return (
    <PublicPolicyPage
      eyebrow="Privacy"
      title="Subprocessor List"
      description="Service providers SessionSteps uses to operate, secure, support, and bill for the platform."
      lastUpdated="October 20, 2026"
    >
      <section>
        <h2>1. What a subprocessor is</h2>
        <p>A subprocessor is a third party that processes personal information on behalf of SessionSteps to help provide the service. SessionSteps remains responsible for selecting providers, limiting their access, and using appropriate contractual and security safeguards.</p>
      </section>
      <section>
        <h2>2. Current providers</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead><tr className="border-b"><th className="p-3 text-foreground">Provider</th><th className="p-3 text-foreground">Purpose</th><th className="p-3 text-foreground">Information involved</th></tr></thead>
            <tbody>{processors.map((processor) => <tr className="border-b align-top" key={processor.name}><td className="p-3 font-medium text-foreground">{processor.name}</td><td className="p-3">{processor.purpose}</td><td className="p-3">{processor.data}</td></tr>)}</tbody>
          </table>
        </div>
        <p>Providers may use personnel and infrastructure in the United States and other locations where they lawfully operate. Contractual protections and the provider&apos;s documented transfer mechanisms apply where required.</p>
      </section>
      <section>
        <h2>3. Optional integrations</h2>
        <p>A customer may choose to connect third-party services such as Google Calendar. When enabled, those providers process information under both SessionSteps&apos; instructions and the customer&apos;s settings and agreements with the provider. Disabling an integration stops future synchronization but may not delete information previously sent to that provider.</p>
      </section>
      <section>
        <h2>4. PHI and provider safeguards</h2>
        <p>A provider receives PHI only when needed for a covered feature and when SessionSteps has determined that the provider&apos;s agreement and configuration are appropriate for that use. Customers must not place PHI in payment fields, general support requests, analytics fields, or integrations that have not been approved for PHI.</p>
      </section>
      <section>
        <h2>5. Changes and questions</h2>
        <p>SessionSteps may add or replace providers as the service evolves. This list will be updated, and additional notice will be provided when required by a customer agreement or applicable law. Questions or contractually permitted objections may be sent to <a href={PRIVACY_EMAIL_HREF}>{PRIVACY_EMAIL}</a>.</p>
      </section>
    </PublicPolicyPage>
  )
}
