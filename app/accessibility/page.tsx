import type { Metadata } from "next"
import { PublicPolicyPage } from "@/components/legal/public-policy-page"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contact"
export const metadata: Metadata = { title: "Accessibility | SessionSteps" }
export default function AccessibilityPage() { return <PublicPolicyPage eyebrow="Accessibility" title="Accessibility Statement" description="SessionSteps is committed to making its service usable by people with disabilities.">
  <section><h2>Our approach</h2><p>We aim to provide clear structure, keyboard access, meaningful labels, readable contrast, responsive layouts, and compatibility with common assistive technologies. Accessibility is part of ongoing design, development, and testing rather than a one-time claim.</p></section>
  <section><h2>Known limitations</h2><p>Some complex interactive workflows, third-party payment or authentication pages, generated documents, or older content may not yet provide an equivalent experience in every assistive technology. We prioritize barriers that prevent core account, client, assignment, and support tasks.</p></section>
  <section><h2>Get help or report a barrier</h2><p>Email <a href={SUPPORT_EMAIL_HREF}>{SUPPORT_EMAIL}</a> with the page, task, browser, device, and assistive technology involved. Do not include PHI. We will acknowledge the report and work to provide an accessible alternative while reviewing the underlying issue.</p></section>
  </PublicPolicyPage> }
