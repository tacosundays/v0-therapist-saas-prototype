import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contact"

export const metadata: Metadata = { title: "AI and Emergency Use Notice | SessionSteps" }

export default function AiEmergencyPage() {
  return (
    <PublicPolicyPage
      eyebrow="Clinical safety"
      title="AI and Emergency Use Notice"
      description="Important limits for SessionSteps AI-assisted features and between-session workflows."
      lastUpdated="October 20, 2026"
    >
      <section><h2>1. SessionSteps is not an emergency service</h2><p>SessionSteps does not continuously monitor assignments, check-ins, messages, or client activity and cannot guarantee that a therapist or practice will see information promptly. Do not use SessionSteps to request emergency help or report an immediate safety threat. In the United States, call 911 for an emergency or call or text 988 for the Suicide &amp; Crisis Lifeline. Outside the United States, contact the appropriate local emergency or crisis service.</p></section>
      <section><h2>2. What AI-assisted features do</h2><p>When an authorized user requests an AI feature, SessionSteps may use selected account or client context to create a summary, draft, suggestion, or educational material. These features are intended to reduce administrative preparation time and organize information already available to the professional. They do not independently monitor clients or make clinical decisions.</p></section>
      <section><h2>3. AI output has important limitations</h2><p>AI-generated content can be incomplete, inaccurate, biased, outdated, or unsuitable for a particular person. It may omit context, misstate source information, or present a confident answer that is wrong. AI output is not a diagnosis, treatment recommendation, risk assessment, clinical record, or substitute for reviewing the underlying information.</p></section>
      <section><h2>4. Human review is required</h2><p>A qualified professional must review, edit, and approve AI output before relying on it, placing it in a record, or sharing it. AI output must not be the sole basis for diagnosis, treatment, medication, safety planning, involuntary intervention, eligibility, discharge, or any other consequential clinical or legal decision.</p></section>
      <section><h2>5. Prohibited uses</h2><ul><li>Do not use AI features for emergency triage or real-time crisis monitoring.</li><li>Do not represent generated content as independently verified or as the judgment of a licensed professional.</li><li>Do not use AI to discriminate, impersonate another person, create deceptive records, or make unlawful eligibility decisions.</li><li>Do not enter information that the user is not authorized to process or disclose.</li></ul></section>
      <section><h2>6. Customer and clinician responsibilities</h2><ul><li>Confirm facts against source information and the client&apos;s current circumstances.</li><li>Exercise independent professional judgment and follow licensure, consent, documentation, supervision, and standard-of-care obligations.</li><li>Tell clients how between-session tools are monitored and provide separate crisis instructions.</li><li>Use AI with PHI only when the customer&apos;s agreement, BAA, configuration, policies, and applicable law permit it.</li></ul></section>
      <section><h2>7. Privacy and questions</h2><p>AI features use only the information needed to perform the requested function and are subject to the Privacy Policy, applicable BAA, and our subprocessor controls. For product questions, contact <a href={SUPPORT_EMAIL_HREF}>{SUPPORT_EMAIL}</a>. Do not send urgent requests or unnecessary PHI to this address.</p></section>
    </PublicPolicyPage>
  )
}
