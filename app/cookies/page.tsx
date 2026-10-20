import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { PRIVACY_EMAIL, PRIVACY_EMAIL_HREF } from "@/lib/contact"

export const metadata: Metadata = { title: "Cookie Notice | SessionSteps" }

export default function CookiesPage() {
  return <PublicPolicyPage eyebrow="Privacy" title="Cookie Notice" description="How SessionSteps uses cookies, browser storage, and similar technologies." lastUpdated="October 20, 2026">
    <section><h2>1. What these technologies are</h2><p>Cookies are small text files stored by a browser. Local storage, session storage, pixels, and similar technologies can perform related functions. In this notice, “cookies” includes these technologies unless the context requires otherwise.</p></section>
    <section><h2>2. Essential technologies</h2><p>SessionSteps uses technologies necessary to authenticate users, maintain secure sessions, route requests, remember preferences, prevent abuse, protect forms, preserve a requested workflow, and provide core service functions. These are required for the service to operate, and disabling them may prevent sign-in or other features from working.</p></section>
    <section><h2>3. Analytics and performance</h2><p>We use limited first-party product events and Vercel Web Analytics to understand traffic, feature use, performance, errors, and reliability. We configure analytics to avoid clinical content and do not intentionally place client notes, worksheet responses, or other PHI in analytics event properties. Analytics information may include page or feature interactions, device and browser details, approximate location derived from network information, referral information, and timestamps.</p></section>
    <section><h2>4. Third-party services</h2><p>When you open a third-party service, such as Stripe&apos;s payment portal or a connected authentication or calendar service, that provider may use its own cookies under its own notice. SessionSteps does not control cookies placed on a third party&apos;s separate website.</p></section>
    <section><h2>5. Advertising and sale</h2><p>SessionSteps does not currently use third-party advertising cookies on the service, sell personal information, or share it for cross-context behavioral advertising. If this practice materially changes, we will update this notice and provide any choice required by law before using nonessential technologies.</p></section>
    <section><h2>6. Your choices</h2><p>You can delete or block cookies through browser settings and use browser privacy or tracking-protection controls. Blocking essential technologies may prevent the service from functioning. Because our current website use is limited to essential and operational analytics technologies, SessionSteps does not presently display a marketing-cookie banner.</p></section>
    <section><h2>7. Retention and updates</h2><p>Session cookies generally expire when the browser session ends. Other identifiers and analytics records are retained only as reasonably needed for the purposes described here, security, troubleshooting, or legal obligations. We may update this notice as our technology changes and will revise the date above.</p></section>
    <section><h2>8. Contact</h2><p>Questions about cookies or privacy choices may be sent to <a href={PRIVACY_EMAIL_HREF}>{PRIVACY_EMAIL}</a>.</p></section>
  </PublicPolicyPage>
}
