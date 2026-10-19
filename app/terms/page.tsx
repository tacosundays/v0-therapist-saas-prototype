import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"
import {
  BILLING_EMAIL,
  BILLING_EMAIL_HREF,
  LEGAL_EMAIL,
  LEGAL_EMAIL_HREF,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
} from "@/lib/contact"

export const metadata: Metadata = {
  title: "Terms of Service | SessionSteps",
  description: "The terms that govern access to and use of the SessionSteps platform.",
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 19, 2026">
      <section>
        <h2>1. Agreement to these Terms</h2>
        <p>
          These Terms of Service (the &ldquo;Terms&rdquo;) are a legal agreement between you and SessionSteps LLC
          (&ldquo;SessionSteps,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to and use of the
          SessionSteps websites, applications, client portal, and related services (collectively, the
          &ldquo;Service&rdquo;). By creating an account, accepting an order, or using the Service, you agree to these
          Terms and our <a href="/privacy">Privacy Policy</a>.
        </p>
        <p>
          If you use the Service for an organization, practice, or other legal entity, you represent that you
          have authority to bind that entity. In that case, &ldquo;you&rdquo; and &ldquo;Customer&rdquo; include both you and that
          entity. If you do not agree to these Terms, do not use the Service.
        </p>
      </section>

      <section>
        <h2>2. Eligibility and account authority</h2>
        <p>
          You must be at least 18 years old and legally able to enter into a contract. The Service is intended
          for licensed or otherwise authorized behavioral-health professionals, their practices and authorized
          workforce members, and clients whom those professionals invite. You are responsible for confirming
          that your use is permitted by the laws, licensing rules, contracts, and professional standards that
          apply to you.
        </p>
      </section>

      <section>
        <h2>3. What SessionSteps provides</h2>
        <p>
          SessionSteps provides workflow tools for between-session assignments, client check-ins, reflections,
          progress review, session preparation, practice administration, and related functions. Features and
          plan limits may vary by subscription. SessionSteps is a technology provider and does not provide
          therapy, diagnosis, medical advice, crisis intervention, or other healthcare services.
        </p>
      </section>

      <section>
        <h2>4. Clinical responsibility and professional judgment</h2>
        <p>
          Providers remain solely responsible for all clinical decisions, treatment, documentation, informed
          consent, client communications, supervision, recordkeeping, mandated reporting, and compliance with
          professional obligations. Information, summaries, suggestions, alerts, and other outputs from the
          Service are assistive only and must be independently reviewed by a qualified professional before
          being relied upon.
        </p>
        <p>
          SessionSteps does not establish a clinician-patient relationship and is not a substitute for direct
          communication between a client and their provider.
        </p>
      </section>

      <section>
        <h2>5. Not for emergencies</h2>
        <p>
          The Service is not an emergency service and should not be used to request or provide urgent help.
          Messages, check-ins, and submissions may not be reviewed immediately. If you or another person may be
          in danger or is experiencing a medical or mental-health emergency, call 911 or the applicable local
          emergency number, call or text 988 in the United States, or go to the nearest emergency department.
          Additional limitations appear in our <a href="/ai-and-emergency-use">AI &amp; Emergency Use notice</a>.
        </p>
      </section>

      <section>
        <h2>6. Customer responsibilities</h2>
        <p>You are responsible for:</p>
        <ul>
          <li>using the Service lawfully and consistently with professional and ethical duties;</li>
          <li>obtaining all permissions, authorizations, and consents required for client participation;</li>
          <li>deciding what information to enter, assign, review, download, or retain;</li>
          <li>configuring access appropriately and promptly removing users who no longer need access;</li>
          <li>maintaining accurate account, contact, billing, and professional information; and</li>
          <li>responding appropriately to client submissions, safety concerns, and clinical information.</li>
        </ul>
        <p>
          If you invite a client, minor, guardian, colleague, or workforce member, you are responsible for
          determining that the invitation and their use are appropriate and lawful.
        </p>
      </section>

      <section>
        <h2>7. Accounts and security</h2>
        <p>
          Each user must use their own account unless the Service expressly supports shared access. You must
          protect credentials, use reasonable security measures, and notify us promptly at{" "}
          <a href={SUPPORT_EMAIL_HREF}>{SUPPORT_EMAIL}</a> if you suspect unauthorized access or a security
          incident. You are responsible for activity performed through your account except to the extent caused
          by SessionSteps&rsquo; breach of these Terms.
        </p>
        <p>
          You may not share authentication credentials, bypass access controls, or attempt to access another
          customer&rsquo;s information. We may require password changes, multi-factor authentication, or other
          safeguards when reasonably necessary to protect the Service or its users.
        </p>
      </section>

      <section>
        <h2>8. Customer content and data</h2>
        <p>
          As between you and SessionSteps, you retain your rights in information, files, text, responses,
          worksheets, and other content submitted to the Service (&ldquo;Customer Content&rdquo;). You grant SessionSteps
          and its subprocessors a limited, nonexclusive right to host, copy, transmit, process, and display
          Customer Content only as reasonably necessary to provide, secure, maintain, improve, and support the
          Service; comply with law; and enforce these Terms.
        </p>
        <p>
          You represent that you have the rights and permissions necessary to submit Customer Content and permit
          its processing. Our handling of personal information is described in the{" "}
          <a href="/privacy">Privacy Policy</a>, and our operational retention practices are described in the{" "}
          <a href="/data-retention">Data Retention Policy</a>.
        </p>
      </section>

      <section>
        <h2>9. HIPAA and protected health information</h2>
        <p>
          If Customer is a HIPAA covered entity or business associate and uses the Service to create, receive,
          maintain, or transmit protected health information, the parties must enter into the SessionSteps{" "}
          <a href="/baa">Business Associate Agreement</a> (&ldquo;BAA&rdquo;). The BAA is effective only when accepted or
          signed by an authorized representative through a method SessionSteps provides. If the BAA conflicts
          with these Terms regarding protected health information, the BAA controls.
        </p>
        <p>
          Customer is responsible for determining whether HIPAA applies, configuring and using the Service in a
          compliant manner, and limiting protected health information to what is appropriate. No statement in
          these Terms is legal or compliance advice.
        </p>
      </section>

      <section>
        <h2>10. Artificial intelligence features</h2>
        <p>
          Certain features may use artificial intelligence to organize information or produce drafts,
          suggestions, summaries, or session-preparation materials. AI output may be incomplete, inaccurate, or
          inappropriate for a particular person or situation. It is not a diagnosis, treatment recommendation,
          risk assessment, or substitute for professional judgment. You must review AI output before using or
          sharing it and remain responsible for decisions made with it.
        </p>
      </section>

      <section>
        <h2>11. Acceptable use</h2>
        <p>
          You must comply with our <a href="/acceptable-use">Acceptable Use Policy</a>. Among other things, you
          may not use the Service to violate law or another person&rsquo;s rights; upload malicious code; harass,
          exploit, or endanger others; send spam; probe or circumvent security; reverse engineer the Service
          except where law expressly permits it; scrape the Service; resell access without authorization; or
          interfere with the Service or another user&rsquo;s access.
        </p>
      </section>

      <section>
        <h2>12. Subscriptions, trials, and payment</h2>
        <p>
          Paid subscriptions, plan limits, billing frequency, and applicable fees are shown at checkout or in
          the billing area. Unless stated otherwise, subscriptions automatically renew for successive billing
          periods until canceled. You authorize SessionSteps and its payment processor, Stripe, to charge your
          selected payment method for subscription fees, applicable taxes, and authorized plan changes.
        </p>
        <p>
          A free trial lasts for the period displayed when you enroll. Unless checkout expressly states that a
          payment method will be charged at the end of a trial, you must select a paid plan to continue paid
          access. Promotional offers may have additional terms and may be changed or withdrawn as permitted by
          law.
        </p>
        <p>
          You may cancel through the billing area or Stripe customer portal. Cancellation takes effect at the
          end of the current paid period unless otherwise stated. Except where required by law or expressly
          stated in writing, fees already paid are nonrefundable and partial billing periods are not prorated.
          Questions may be sent to <a href={BILLING_EMAIL_HREF}>{BILLING_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>13. Taxes</h2>
        <p>
          Fees do not include taxes unless stated otherwise. You are responsible for sales, use, value-added,
          and similar taxes associated with your purchase, excluding taxes based on SessionSteps&rsquo; net income.
          We may collect taxes when required by law.
        </p>
      </section>

      <section>
        <h2>14. Third-party services and subprocessors</h2>
        <p>
          The Service may interoperate with third-party services, including payment, email, hosting,
          authentication, and AI providers. Your use of a third-party service may be governed by that provider&rsquo;s
          terms and privacy practices. SessionSteps is not responsible for third-party services that you choose
          to connect or use, but remains responsible for its obligations under an applicable BAA and law. Current
          service providers are listed on our <a href="/subprocessors">Subprocessors page</a>.
        </p>
      </section>

      <section>
        <h2>15. SessionSteps intellectual property</h2>
        <p>
          SessionSteps and its licensors own the Service, including its software, design, branding,
          documentation, and all related intellectual-property rights. Subject to these Terms and payment of
          applicable fees, we grant you a limited, nonexclusive, nontransferable, revocable right to access and
          use the Service during your subscription for your internal professional or personal use.
        </p>
        <p>
          If you provide feedback or suggestions, you allow us to use them without restriction or payment,
          provided we do not publicly identify you without permission.
        </p>
      </section>

      <section>
        <h2>16. Service availability and changes</h2>
        <p>
          We work to provide a reliable and secure Service, but no online service is uninterrupted or error-free.
          Maintenance, security events, internet failures, third-party outages, or other circumstances may
          affect availability. We may modify features to improve the Service, address risk, comply with law, or
          reflect product changes. We will provide reasonable notice if a material change substantially reduces
          core paid functionality, when practicable.
        </p>
      </section>

      <section>
        <h2>17. Suspension and termination</h2>
        <p>
          You may stop using the Service at any time and may cancel a paid subscription as described above. We
          may suspend or restrict access when reasonably necessary to prevent harm, address a security threat,
          investigate suspected unlawful activity, respond to nonpayment, or enforce these Terms. When
          practicable, we will notify you and provide an opportunity to cure the issue.
        </p>
        <p>
          We may terminate an account for a material or repeated breach, unlawful use, nonpayment, or conduct
          that creates material risk to the Service or others. After termination, access to Customer Content may
          end. Customers should export needed information before closing an account. Deletion and retention are
          handled according to our <a href="/data-retention">Data Retention Policy</a>, applicable law, and any
          BAA.
        </p>
      </section>

      <section>
        <h2>18. Disclaimer of warranties</h2>
        <p>
          To the fullest extent permitted by law, the Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
          SessionSteps disclaims implied warranties of merchantability, fitness for a particular purpose,
          noninfringement, and any warranties arising from course of dealing or usage of trade. We do not warrant
          that the Service will be uninterrupted, error-free, or suitable for any particular clinical,
          regulatory, or business outcome. Some jurisdictions do not permit certain disclaimers, so portions of
          this section may not apply to you.
        </p>
      </section>

      <section>
        <h2>19. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, neither party will be liable for indirect, incidental,
          special, consequential, exemplary, or punitive damages, or for lost profits, revenues, goodwill, or
          business opportunities, arising from or related to the Service, even if advised that such damages were
          possible.
        </p>
        <p>
          To the fullest extent permitted by law, SessionSteps&rsquo; total aggregate liability arising from or
          related to the Service or these Terms will not exceed the greater of (a) the amounts Customer paid to
          SessionSteps for the Service during the 12 months before the event giving rise to the claim or (b) one
          hundred U.S. dollars. These limits do not apply to liability that cannot legally be limited.
        </p>
      </section>

      <section>
        <h2>20. Indemnification</h2>
        <p>
          To the extent permitted by law, Customer will defend and indemnify SessionSteps and its officers,
          employees, and affiliates from third-party claims, damages, and reasonable costs arising from
          Customer Content, Customer&rsquo;s unlawful or unauthorized use of the Service, or Customer&rsquo;s material
          breach of these Terms. This obligation does not apply to the extent a claim was caused by
          SessionSteps&rsquo; breach, negligence, or willful misconduct. We will provide reasonable notice of an
          indemnified claim and permit Customer to control the defense, subject to our right to participate.
        </p>
      </section>

      <section>
        <h2>21. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of the State of Florida, without regard to conflict-of-law rules.
          Before filing a formal claim, each party agrees to make a good-faith effort to resolve the dispute by
          written notice and discussion for at least 30 days. Unless applicable law requires otherwise, disputes
          that cannot be resolved informally will be brought in the state or federal courts located in Duval
          County, Florida, and each party consents to their jurisdiction and venue.
        </p>
      </section>

      <section>
        <h2>22. Changes to these Terms</h2>
        <p>
          We may update these Terms to reflect changes in the Service, law, security practices, or our business.
          We will post the revised Terms with an updated date and provide additional notice when a change is
          material. Unless a later date is stated, updated Terms become effective when posted. Continued use
          after the effective date constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2>23. General terms</h2>
        <p>
          These Terms, the Privacy Policy, an applicable BAA, and any order or additional terms accepted by the
          parties form the entire agreement concerning the Service. If a provision is unenforceable, it will be
          limited to the minimum extent necessary and the remaining provisions will remain effective. A failure
          to enforce a provision is not a waiver. You may not assign these Terms without our written consent,
          except in connection with a merger, reorganization, or sale of substantially all relevant assets. We
          may assign these Terms as part of a merger, reorganization, financing, or sale of our business, with
          appropriate protection for Customer Content. Neither party is liable for delay caused by events beyond
          its reasonable control.
        </p>
      </section>

      <section>
        <h2>24. Contact us</h2>
        <p>
          Questions about these Terms or legal notices may be sent to{" "}
          <a href={LEGAL_EMAIL_HREF}>{LEGAL_EMAIL}</a>. SessionSteps LLC is located in Jacksonville, Florida,
          United States.
        </p>
      </section>
    </LegalPage>
  )
}
