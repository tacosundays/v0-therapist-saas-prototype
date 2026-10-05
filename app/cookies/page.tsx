import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { PRIVACY_EMAIL, PRIVACY_EMAIL_HREF } from "@/lib/contact"
export const metadata: Metadata = { title: "Cookie Notice | SessionSteps" }
export default function CookiesPage() { return <PublicPolicyPage eyebrow="Privacy" title="Cookie Notice" description="How SessionSteps uses cookies, browser storage, and analytics technologies.">
  <section><h2>Essential technologies</h2><p>SessionSteps uses cookies or browser storage necessary to sign users in, maintain secure sessions, remember preferences, prevent abuse, and operate requested features. Disabling these technologies may prevent the service from working.</p></section>
  <section><h2>Analytics</h2><p>We use limited first-party product events and Vercel Analytics to understand aggregate traffic, feature use, performance, and reliability. We design product analytics to avoid clinical content. SessionSteps does not currently use third-party advertising cookies or sell information for targeted advertising.</p></section>
  <section><h2>Your choices</h2><p>You can control cookies through browser settings and can use privacy or tracking-protection features. Essential session technologies cannot be disabled within SessionSteps while remaining signed in. If our use changes to include nonessential cookies requiring consent, we will provide an appropriate preference control before using them.</p></section>
  <section><h2>Contact</h2><p>Questions may be sent to <a href={PRIVACY_EMAIL_HREF}>{PRIVACY_EMAIL}</a>.</p></section>
  </PublicPolicyPage> }
