import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Terms of Service | SessionSteps" }

export default function TermsPage() {
  return <LegalPage title="Terms of Service" updated="September 20, 2026">
    <section><h2>Using SessionSteps</h2><p>SessionSteps provides software that helps behavioral-health professionals manage between-session activities. You must provide accurate account information, protect your credentials, and use the service only as permitted by law and your professional obligations.</p></section>
    <section><h2>Clinical responsibility</h2><p>SessionSteps is a workflow tool, not a substitute for professional judgment, diagnosis, treatment, emergency care, or direct communication with a clinician. Providers remain responsible for clinical decisions and for obtaining any required consents.</p></section>
    <section><h2>Not for emergencies</h2><p>Do not use SessionSteps for urgent or emergency communication. If you may be in immediate danger or are experiencing a medical or mental-health emergency, call local emergency services or go to the nearest emergency department.</p></section>
    <section><h2>Accounts and content</h2><p>You are responsible for activity under your account and for content you submit. You retain ownership of your content and authorize SessionSteps to process it solely to operate, secure, and support the service.</p></section>
    <section><h2>Subscriptions</h2><p>Paid plans renew according to the terms shown at purchase. Fees, limits, and cancellation options are displayed in the billing area. Taxes may apply. Access may be suspended for nonpayment, misuse, or material security risk.</p></section>
    <section><h2>Availability and changes</h2><p>We work to keep the service reliable and secure, but no online service is uninterrupted. Features may change as the product improves. Material changes to these terms will be communicated through the service or by email when appropriate.</p></section>
  </LegalPage>
}
