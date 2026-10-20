import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { LEGAL_EMAIL, LEGAL_EMAIL_HREF, SECURITY_EMAIL, SECURITY_EMAIL_HREF } from "@/lib/contact"

export const metadata: Metadata = { title: "Business Associate Agreement | SessionSteps" }

export default function BaaPage() {
  return (
    <PublicPolicyPage
      eyebrow="HIPAA"
      title="Business Associate Agreement"
      description="The standard HIPAA Business Associate Agreement offered by SessionSteps LLC to eligible healthcare customers."
      lastUpdated="October 20, 2026"
    >
      <section>
        <h2>Important: how this BAA becomes effective</h2>
        <p>This Business Associate Agreement (“BAA”) is between SessionSteps LLC (“Business Associate,” “SessionSteps,” “we,” or “us”) and the healthcare organization or professional accepting it (“Covered Entity” or “Customer”).</p>
        <p>This BAA becomes binding only when an authorized representative of Customer accepts it through a SessionSteps order, subscription, onboarding, or other contracting process that expressly incorporates this BAA, or when both parties sign a written agreement incorporating it. Publishing this page, visiting it, or using the public website alone does not execute a BAA.</p>
        <p>The effective date is the date of that acceptance or signature. The person accepting represents that they have authority to bind Customer. Customer should retain the acceptance confirmation with its HIPAA records.</p>
      </section>

      <section>
        <h2>1. Purpose and relationship to the services agreement</h2>
        <p>Customer may disclose Protected Health Information to SessionSteps, and SessionSteps may create, receive, maintain, or transmit that information while providing the SessionSteps platform and related support (the “Services”). This BAA supplements the SessionSteps Terms of Service, applicable order form, and any other agreement governing the Services (collectively, the “Services Agreement”).</p>
        <p>If this BAA conflicts with the Services Agreement regarding Protected Health Information, this BAA controls. All other provisions of the Services Agreement remain in effect.</p>
      </section>

      <section>
        <h2>2. Definitions</h2>
        <p>Capitalized terms not defined in this BAA have the meanings given to them under the Health Insurance Portability and Accountability Act of 1996 and its implementing regulations, as amended (“HIPAA”), including the Privacy, Security, Breach Notification, and Enforcement Rules.</p>
        <ul>
          <li><strong>“Breach”</strong> has the meaning in 45 C.F.R. § 164.402.</li>
          <li><strong>“Designated Record Set”</strong> has the meaning in 45 C.F.R. § 164.501.</li>
          <li><strong>“Electronic Protected Health Information” or “ePHI”</strong> has the meaning in 45 C.F.R. § 160.103.</li>
          <li><strong>“Protected Health Information” or “PHI”</strong> means PHI that SessionSteps creates, receives, maintains, or transmits for Customer in connection with the Services.</li>
          <li><strong>“Required by Law,” “Security Incident,”</strong> and <strong>“Unsecured PHI”</strong> have the meanings assigned by HIPAA.</li>
        </ul>
      </section>

      <section>
        <h2>3. Permitted uses and disclosures</h2>
        <p>SessionSteps may use or disclose PHI only:</p>
        <ul>
          <li>to provide, secure, maintain, support, and improve the Services for Customer as described in the Services Agreement;</li>
          <li>as permitted by this BAA;</li>
          <li>as Required by Law; or</li>
          <li>as otherwise authorized in writing by Customer and permitted by HIPAA.</li>
        </ul>
        <p>SessionSteps may use PHI for its proper management and administration or to carry out its legal responsibilities. It may disclose PHI for those purposes only if the disclosure is Required by Law or it obtains reasonable assurances that the recipient will keep the information confidential, use or further disclose it only as Required by Law or for the stated purpose, and notify SessionSteps of any breach of confidentiality.</p>
        <p>SessionSteps may provide data-aggregation services relating to Customer&apos;s healthcare operations where permitted by HIPAA and may de-identify PHI in accordance with 45 C.F.R. § 164.514. Information that has been properly de-identified is not PHI under this BAA.</p>
      </section>

      <section>
        <h2>4. Prohibited uses</h2>
        <p>SessionSteps will not use or disclose PHI in a manner that would violate the HIPAA Privacy Rule if done by Customer, except for uses expressly permitted for a Business Associate. SessionSteps will not sell PHI, use PHI for targeted advertising, or use PHI to train a general-purpose artificial intelligence model available to other customers.</p>
      </section>

      <section>
        <h2>5. Safeguards and Security Rule compliance</h2>
        <p>SessionSteps will use appropriate administrative, physical, and technical safeguards to prevent uses or disclosures of PHI other than those permitted by this BAA. SessionSteps will comply with the applicable requirements of the HIPAA Security Rule with respect to ePHI and will maintain reasonable measures designed to protect its confidentiality, integrity, and availability.</p>
        <p>SessionSteps will mitigate, to the extent practicable, harmful effects it knows resulted from an impermissible use or disclosure of PHI by SessionSteps in violation of this BAA.</p>
      </section>

      <section>
        <h2>6. Incident and breach reporting</h2>
        <p>SessionSteps will notify Customer of any use or disclosure of PHI not permitted by this BAA, any reportable Security Incident, and any Breach of Unsecured PHI of which SessionSteps becomes aware. Notice will be provided without unreasonable delay and no later than 60 calendar days after discovery, or sooner if required by applicable law.</p>
        <p>To the extent known at the time, a Breach notice will identify the affected individuals, describe what happened and the types of information involved, provide information reasonably available for Customer&apos;s notifications, and describe mitigation and corrective actions. SessionSteps may provide information in phases as its investigation continues.</p>
        <p>Customer acknowledges that routine unsuccessful attempts to gain unauthorized access, use, disclosure, modification, or destruction of information—such as blocked probes, pings, denial-of-service attempts, and failed login attempts—occur in normal system operations. Unless an event results in unauthorized access or otherwise requires notice under HIPAA, this paragraph serves as notice of those unsuccessful events.</p>
      </section>

      <section>
        <h2>7. Subcontractors</h2>
        <p>SessionSteps will require any subcontractor that creates, receives, maintains, or transmits PHI on its behalf to agree in writing to restrictions, conditions, and safeguards that apply to SessionSteps with respect to that PHI, including applicable Security Rule requirements. SessionSteps remains responsible for managing its subcontractor relationships as required by HIPAA. Current service providers are identified on the <a href="/subprocessors">Subprocessor List</a>.</p>
      </section>

      <section>
        <h2>8. Access, amendment, and accounting</h2>
        <p>To the extent SessionSteps maintains PHI in a Designated Record Set for Customer, SessionSteps will make that PHI available to Customer as needed for Customer to satisfy its obligations under 45 C.F.R. § 164.524. SessionSteps will also incorporate amendments or make PHI available for amendment as required by 45 C.F.R. § 164.526.</p>
        <p>SessionSteps will document disclosures and provide information reasonably necessary for Customer to respond to a request for an accounting of disclosures under 45 C.F.R. § 164.528. SessionSteps will respond within the time reasonably necessary for Customer to meet its legal deadlines.</p>
      </section>

      <section>
        <h2>9. Delegated Privacy Rule duties and government access</h2>
        <p>To the extent SessionSteps performs an obligation of Customer under the HIPAA Privacy Rule, SessionSteps will comply with the Privacy Rule requirements that apply to Customer in performing that obligation.</p>
        <p>SessionSteps will make its internal practices, books, and records relating to the use and disclosure of PHI received from, created for, or received on behalf of Customer available to the Secretary of the U.S. Department of Health and Human Services for purposes of determining Customer&apos;s HIPAA compliance.</p>
      </section>

      <section>
        <h2>10. Minimum necessary</h2>
        <p>SessionSteps will limit its uses, disclosures, and requests for PHI to the minimum necessary to accomplish the intended purpose, to the extent required by HIPAA. Where appropriate and practicable, SessionSteps will use a limited data set.</p>
      </section>

      <section>
        <h2>11. Customer obligations</h2>
        <p>Customer will:</p>
        <ul>
          <li>use the Services in compliance with HIPAA and other applicable law;</li>
          <li>notify SessionSteps of limitations in its notice of privacy practices, changes to individual authorizations, and agreed restrictions that affect SessionSteps&apos; permitted use or disclosure of PHI;</li>
          <li>not request that SessionSteps use or disclose PHI in a manner that would violate HIPAA if done by Customer, except where HIPAA permits a Business Associate to do so;</li>
          <li>obtain all consents, authorizations, and other legal permissions necessary to disclose PHI to SessionSteps;</li>
          <li>configure users, permissions, integrations, exports, and account security appropriately, promptly remove access that is no longer needed, and protect account credentials; and</li>
          <li>avoid sending PHI through support channels or integrations that SessionSteps has not designated for PHI.</li>
        </ul>
      </section>

      <section>
        <h2>12. Term and termination</h2>
        <p>This BAA begins on its effective date and continues while SessionSteps maintains PHI for Customer. If either party knows of a material breach by the other, it will provide an opportunity to cure within a reasonable period where cure is possible. If the breach is not cured, or cure is not possible, the non-breaching party may terminate the affected Services Agreement to the extent feasible. If termination is not feasible, the non-breaching party may report the violation to the Secretary of Health and Human Services as required by HIPAA.</p>
      </section>

      <section>
        <h2>13. Return or destruction of PHI</h2>
        <p>Upon termination of this BAA, SessionSteps will return or destroy PHI if feasible, including PHI held by its subcontractors, in accordance with the Services Agreement and applicable data-retention obligations. If return or destruction is infeasible, SessionSteps will extend this BAA&apos;s protections to the retained PHI and limit further uses and disclosures to the purposes that make return or destruction infeasible. Secure backup copies may remain until overwritten in the ordinary course, subject to these continuing protections.</p>
      </section>

      <section>
        <h2>14. Miscellaneous</h2>
        <ul>
          <li><strong>Regulatory references.</strong> A reference to a HIPAA provision means that provision as amended.</li>
          <li><strong>Amendment.</strong> The parties will take action reasonably necessary to amend this BAA so both may comply with HIPAA and other applicable law.</li>
          <li><strong>Interpretation.</strong> Any ambiguity will be resolved to permit compliance with HIPAA.</li>
          <li><strong>No third-party beneficiaries.</strong> This BAA does not create rights in any person other than the parties, except as applicable law requires.</li>
          <li><strong>Survival.</strong> Obligations concerning retained PHI, return or destruction, confidentiality, and provisions intended by their nature to survive will survive termination.</li>
          <li><strong>Governing law.</strong> The governing-law and dispute provisions in the Services Agreement apply unless HIPAA requires otherwise.</li>
        </ul>
      </section>

      <section>
        <h2>15. Notices and BAA requests</h2>
        <p>Legal questions and requests to execute this BAA: <a href={LEGAL_EMAIL_HREF}>{LEGAL_EMAIL}</a>. Security incidents and suspected breaches: <a href={SECURITY_EMAIL_HREF}>{SECURITY_EMAIL}</a>. Do not include PHI in unencrypted email. Notices under this BAA may also be delivered through the contact information in the applicable order or Services Agreement.</p>
      </section>
    </PublicPolicyPage>
  )
}
