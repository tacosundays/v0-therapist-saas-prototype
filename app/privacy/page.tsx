import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/legal-page"
import { PRIVACY_EMAIL, PRIVACY_EMAIL_HREF, SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contact"

export const metadata: Metadata = { title: "Privacy Policy | SessionSteps" }

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="October 19, 2026">
    <section>
      <h2>1. Overview and scope</h2>
      <p>SessionSteps LLC (&quot;SessionSteps,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides a software platform that helps behavioral-health professionals manage between-session assignments, client check-ins, reflections, progress information, and session preparation. This Privacy Policy explains how we collect, use, disclose, and protect personal information when you visit sessionsteps.com, create or use a SessionSteps account, communicate with us, or otherwise use our services.</p>
      <p>This policy does not replace a therapist or practice&apos;s own privacy notice or Notice of Privacy Practices. A practice controls the care relationship and the records it places in SessionSteps. If you are a client of a practice, that practice&apos;s notice also applies to its handling of your information.</p>
    </section>

    <section>
      <h2>2. Our role in handling information</h2>
      <p>When a therapist or practice uses SessionSteps to handle information about its clients, the practice generally acts as the controller of that information and, when HIPAA applies, as the Covered Entity. SessionSteps generally acts as the practice&apos;s service provider, processor, and Business Associate. We process that information on the practice&apos;s instructions, under our agreements, and as permitted or required by law.</p>
      <p>For information about website visitors, account administrators, prospective customers, and our direct business relationships, SessionSteps may determine the purposes and means of processing. Eligible customers that use SessionSteps for protected health information may enter into our <Link href="/baa">Business Associate Agreement</Link>.</p>
    </section>

    <section>
      <h2>3. Information we collect</h2>
      <p>The information we collect depends on how you interact with SessionSteps and may include:</p>
      <ul>
        <li><strong>Account and practice information:</strong> name, business name, email address, role, professional information, authentication details, account preferences, and workspace membership.</li>
        <li><strong>Client and service content:</strong> client contact information, assignments, worksheet responses, reflections, check-ins, progress information, session-preparation content, messages, and other information submitted by a practice or its clients.</li>
        <li><strong>Payment information:</strong> subscription plan, billing contact information, transaction status, and payment-related identifiers. Payment card and bank details are handled by Stripe rather than stored directly by SessionSteps.</li>
        <li><strong>Communications:</strong> support requests, feedback, survey responses, and other communications you send to us. Please do not place protected health information in general feedback or support messages unless specifically requested through an approved secure channel.</li>
        <li><strong>Device and activity information:</strong> IP address, browser and device type, operating system, sign-in and security events, pages or features used, approximate location derived from IP address, timestamps, and diagnostic logs.</li>
        <li><strong>Cookies and similar technologies:</strong> information needed to maintain secure sessions, remember preferences, prevent abuse, and understand aggregate site and product performance, as described in our <Link href="/cookies">Cookie Notice</Link>.</li>
      </ul>
    </section>

    <section>
      <h2>4. Sources of information</h2>
      <p>We receive information directly from you; from the therapist, practice, or organization that provides your access; automatically from your browser or device; from service providers that support authentication, billing, email, hosting, security, and analytics; and from integrations or third parties that you authorize. Practices are responsible for having an appropriate basis to provide client information to SessionSteps.</p>
    </section>

    <section>
      <h2>5. How we use information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>Provide, maintain, personalize, and improve the services requested by users and practices.</li>
        <li>Create and secure accounts, authenticate users, enforce permissions, and prevent fraud, abuse, or unauthorized access.</li>
        <li>Process subscriptions, administer trials, provide receipts, and manage customer accounts.</li>
        <li>Deliver assignments, notifications, support, and other requested communications.</li>
        <li>Generate session-preparation materials and other features a user chooses to invoke.</li>
        <li>Monitor reliability, troubleshoot errors, measure aggregate product usage, and improve accessibility and performance.</li>
        <li>Comply with law, enforce our agreements, protect rights and safety, and establish or defend legal claims.</li>
      </ul>
      <p>We do not sell clinical content, use it for third-party advertising, or use it to build advertising profiles.</p>
    </section>

    <section>
      <h2>6. Artificial intelligence features</h2>
      <p>SessionSteps includes optional AI-assisted features, such as session preparation and worksheet support. When an authorized user invokes one of these features, relevant content may be securely sent to an AI service provider solely to return the requested output. AI output may be incomplete or inaccurate and is not a diagnosis, treatment recommendation, crisis service, or substitute for professional judgment. We do not permit our AI providers to use protected health information submitted through covered services to train their general-purpose models. Additional limitations are described in our <Link href="/ai-and-emergency-use">AI &amp; Emergency Use Notice</Link>.</p>
    </section>

    <section>
      <h2>7. How we disclose information</h2>
      <p>We may disclose information in the following circumstances:</p>
      <ul>
        <li><strong>To the relevant practice:</strong> users authorized by a practice may access information according to their roles and the practice&apos;s settings.</li>
        <li><strong>To service providers:</strong> vendors may process information for hosting, databases, email delivery, AI features, payments, security, support, and limited analytics. They may use it only to provide contracted services and are subject to appropriate confidentiality, security, and data-protection obligations.</li>
        <li><strong>For legal and safety reasons:</strong> when required by law or valid legal process, or when reasonably necessary to protect users, SessionSteps, or others from fraud, abuse, security threats, or harm.</li>
        <li><strong>For a business transaction:</strong> in connection with a financing, merger, acquisition, reorganization, or sale of assets, subject to appropriate confidentiality protections and applicable law.</li>
        <li><strong>With your direction or consent:</strong> when you instruct us to share information or authorize an integration.</li>
      </ul>
      <p>Our current categories of vendors and their functions are listed on the <Link href="/subprocessors">Subprocessors</Link> page.</p>
    </section>

    <section>
      <h2>8. HIPAA and protected health information</h2>
      <p>When SessionSteps receives protected health information on behalf of a Covered Entity under a Business Associate Agreement, we use and disclose that information as permitted by the agreement and HIPAA. SessionSteps does not provide healthcare, make clinical decisions, or control a practice&apos;s legal or clinical recordkeeping obligations.</p>
      <p>If you are a therapy client seeking access to, correction of, or an accounting concerning your clinical information, contact your therapist or practice first. We will assist the practice in responding where required. Nothing in this policy limits rights available under HIPAA or other applicable law.</p>
    </section>

    <section>
      <h2>9. Cookies, analytics, and advertising</h2>
      <p>We use essential cookies and browser storage to operate secure accounts. We also use limited first-party product events and Vercel Analytics to understand aggregate traffic, feature use, performance, and reliability. We design product analytics to avoid clinical content. SessionSteps does not currently use third-party advertising cookies, sell personal information, or share personal information for cross-context behavioral advertising. Browser privacy signals may not affect technologies that are necessary to provide a signed-in service.</p>
    </section>

    <section>
      <h2>10. Data retention</h2>
      <p>We retain information for as long as reasonably necessary to provide the service, maintain security and audit records, comply with contracts and law, resolve disputes, and enforce agreements. Retention varies by data type, account status, practice instructions, legal requirements, and backup schedules. A practice may have independent professional or legal retention duties. More information is available in our <Link href="/data-retention">Data Retention Standard</Link>.</p>
    </section>

    <section>
      <h2>11. Security</h2>
      <p>We use administrative, technical, and physical safeguards designed to protect information, including encrypted connections, managed encryption at rest, role-based permissions, tenant isolation, database row-level security, audit logging, and security monitoring. No system can guarantee absolute security. Users must protect their credentials, use multi-factor authentication where available, and promptly report suspected unauthorized access. See our <Link href="/security">Security &amp; Trust Center</Link> for more information.</p>
    </section>

    <section>
      <h2>12. Your privacy choices and rights</h2>
      <p>Depending on where you live and the context in which we process your information, you may have the right to request access, correction, deletion, or a portable copy of personal information; to restrict or object to certain processing; to withdraw consent where processing relies on consent; or to appeal a denied request. You may also have the right not to receive discriminatory treatment for exercising a privacy right.</p>
      <p>Account holders can update some information in the service. To submit a request about information SessionSteps controls directly, email <a href={PRIVACY_EMAIL_HREF}>{PRIVACY_EMAIL}</a>. We may verify your identity and authority before acting. An authorized agent may submit a request where permitted by law, but we may require proof of authorization. If SessionSteps holds the information only for a practice, we will direct the request to that practice or assist it as required.</p>
      <p>You may unsubscribe from promotional email using the link in the message. We may continue to send service, security, billing, and other non-promotional communications needed to administer your account.</p>
    </section>

    <section>
      <h2>13. Children and minors</h2>
      <p>SessionSteps is sold to professionals and practices and is not directed to children for independent use. A minor may use a client-facing feature only when invited and managed by an authorized practice and with any consent required by the practice and applicable law. We do not knowingly collect personal information from a child through the public website without appropriate authorization. Contact us if you believe a child submitted information outside an authorized care relationship.</p>
    </section>

    <section>
      <h2>14. International data transfers</h2>
      <p>SessionSteps and its service providers may process information in the United States and other countries where they operate. Those countries may have privacy laws different from those where you live. Where required, we use contractual or other lawful safeguards for international transfers.</p>
    </section>

    <section>
      <h2>15. Third-party services and links</h2>
      <p>The service may link to or interoperate with third-party websites or services. Their privacy practices are governed by their own notices. We encourage you to review those notices before providing information or enabling an integration.</p>
    </section>

    <section>
      <h2>16. Changes to this policy</h2>
      <p>We may update this policy as our services, vendors, or legal obligations change. We will post the revised policy with a new &quot;Last updated&quot; date and provide additional notice when required by law or when a change materially affects how we handle personal information.</p>
    </section>

    <section>
      <h2>17. Contact us</h2>
      <p>SessionSteps LLC is located in Jacksonville, Florida, United States. For privacy questions or requests, email <a href={PRIVACY_EMAIL_HREF}>{PRIVACY_EMAIL}</a>. For general product support, email <a href={SUPPORT_EMAIL_HREF}>{SUPPORT_EMAIL}</a>.</p>
    </section>
  </LegalPage>
}
