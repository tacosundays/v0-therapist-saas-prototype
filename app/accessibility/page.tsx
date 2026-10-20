import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contact"

export const metadata: Metadata = { title: "Accessibility | SessionSteps" }

export default function AccessibilityPage() {
  return <PublicPolicyPage eyebrow="Accessibility" title="Accessibility Statement" description="SessionSteps is committed to making its service usable by people with disabilities." lastUpdated="October 20, 2026">
    <section><h2>1. Our commitment</h2><p>We want therapists, practice staff, clients, and visitors to use SessionSteps regardless of disability or assistive technology. Accessibility is an ongoing part of product design, development, content review, and testing—not a one-time certification.</p></section>
    <section><h2>2. Accessibility target</h2><p>We use the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA as a design and testing target where reasonably applicable. This is a goal and does not mean every page or workflow currently conforms in every respect.</p></section>
    <section><h2>3. Measures we take</h2><ul><li>Use semantic structure, meaningful labels, descriptive link text, and visible focus states.</li><li>Support keyboard navigation for core workflows.</li><li>Consider text contrast, zoom, responsive layouts, motion preferences, and error identification.</li><li>Test important therapist and client tasks with automated tools and manual review.</li><li>Prioritize fixes that block sign-in, client access, assignments, check-ins, billing, or support.</li></ul></section>
    <section><h2>4. Compatibility and limitations</h2><p>SessionSteps is designed for current versions of major browsers and common assistive technologies. Some complex interactive workflows, third-party payment or authentication pages, generated documents, or older content may not yet provide an equivalent experience in every configuration. Third-party services are governed by their providers&apos; accessibility practices.</p></section>
    <section><h2>5. Request help or report a barrier</h2><p>Email <a href={SUPPORT_EMAIL_HREF}>{SUPPORT_EMAIL}</a> with the page or feature, the task you were trying to complete, and—if comfortable—the browser, device, and assistive technology involved. Do not include PHI. We will acknowledge the report, work to provide a reasonable alternative, and evaluate the underlying issue.</p></section>
    <section><h2>6. Feedback</h2><p>We welcome feedback about clarity, keyboard access, screen-reader behavior, captions, contrast, forms, or any other accessibility concern. Accessibility requests will not affect a person&apos;s eligibility to use SessionSteps.</p></section>
  </PublicPolicyPage>
}
