import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { PRIVACY_EMAIL, PRIVACY_EMAIL_HREF } from "@/lib/contact"
export const metadata: Metadata = { title: "Subprocessors | SessionSteps" }
const processors = [
  ["Supabase", "Database, authentication, and file storage", "United States / configured cloud region"],
  ["Vercel", "Application hosting, delivery, and aggregate web analytics", "United States / global infrastructure"],
  ["OpenAI", "AI-assisted features invoked by authorized users", "United States"],
  ["Stripe", "Subscriptions, payments, invoicing, and fraud prevention", "United States / global infrastructure"],
  ["Google Workspace", "Company email and support communications", "United States / global infrastructure"],
  ["Paubox", "Transactional email delivery", "United States"],
]
export default function SubprocessorsPage() { return <PublicPolicyPage eyebrow="Privacy" title="Subprocessor List" description="Third parties SessionSteps uses to provide, secure, support, and bill for the service.">
  <section><h2>Current providers</h2><div className="overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-left"><thead><tr className="border-b"><th className="p-3 text-foreground">Provider</th><th className="p-3 text-foreground">Purpose</th><th className="p-3 text-foreground">Location</th></tr></thead><tbody>{processors.map(([name,purpose,location]) => <tr className="border-b" key={name}><td className="p-3 font-medium text-foreground">{name}</td><td className="p-3">{purpose}</td><td className="p-3">{location}</td></tr>)}</tbody></table></div></section>
  <section><h2>PHI conditions</h2><p>A provider receives PHI only when needed for an enabled feature and when SessionSteps has determined the provider&apos;s agreement and configuration are appropriate for that use. Customers should not send PHI through payment fields, general support email, or an integration not approved for PHI.</p></section>
  <section><h2>Changes</h2><p>We may add or replace providers as the service evolves. We will update this page and provide additional notice where a customer agreement or law requires it. Questions or objections may be sent to <a href={PRIVACY_EMAIL_HREF}>{PRIVACY_EMAIL}</a>.</p></section>
  </PublicPolicyPage> }
