"use client"

import {
  AlertTriangle,
  Archive,
  ClipboardCheck,
  DatabaseBackup,
  FileArchive,
  FileText,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DocumentPlaceholder,
  ReadinessBadge,
  TrustSection,
  TrustStatusCard,
  TrustTable,
} from "@/components/dashboard/trust-center-components"

const securityOverview = [
  {
    title: "Encryption in transit",
    description: "Connections are expected to use HTTPS/TLS so data is protected while moving between browsers and services.",
  },
  {
    title: "Encryption at rest",
    description: "Application data is stored with managed infrastructure protections designed to protect data while stored.",
  },
  {
    title: "MFA status",
    description: "Therapists can use multi-factor authentication to add a second verification step after password login.",
  },
  {
    title: "Audit logging",
    description: "Security and workspace events are collected for administrative review inside the Security Center.",
  },
  {
    title: "Session management",
    description: "Session timeout and active-session review help administrators understand account access posture.",
  },
  {
    title: "Access controls",
    description: "Therapist-owned data is presented through authenticated workspace views and existing access boundaries.",
  },
]

const complianceReadiness = [
  "HIPAA Security Rule safeguards readiness",
  "Access controls",
  "Audit controls",
  "Integrity safeguards",
  "Transmission security",
]

const vendorRows = [
  ["Supabase", "Application database and authentication infrastructure", "Configurable by workspace use", "Required if PHI is stored", <Badge key="review" variant="outline">Review required</Badge>, "Quarterly"],
  ["Vercel", "Application hosting and delivery", "No intended direct PHI storage", "Review required", <Badge key="planned" variant="outline">Planned review</Badge>, "Quarterly"],
  ["OpenAI", "AI workflow assistance when enabled", "May process selected therapist-owned context", "Required before PHI use", <Badge key="admin" variant="outline">Administrative review</Badge>, "Quarterly"],
  ["Google Calendar", "Read-only calendar event integration", "Calendar titles may contain client-identifying data", "Review required", <Badge key="connected" variant="outline">Optional integration</Badge>, "Semiannual"],
  ["Stripe", "Subscription and payment management", "No clinical PHI intended", "Not typically required", <Badge key="billing" variant="outline">Billing vendor</Badge>, "Annual"],
]

const incidentWorkflow = [
  "Identify and classify the reported issue.",
  "Contain access, affected workflows, or integrations when needed.",
  "Assess scope, impacted users, and data categories.",
  "Notify internal stakeholders and determine external notification obligations.",
  "Recover service and document corrective actions.",
]

const retentionRows = [
  ["Client records", "Practice-defined retention period", "Export before deletion when required by policy"],
  ["Audit logs", "Security review period", "Retain long enough for operational review"],
  ["Deleted users", "Access disabled immediately", "Associated records follow practice retention rules"],
  ["Attachments", "Practice-defined retention period", "Review storage and deletion procedures"],
  ["Exports", "Short-lived administrative availability", "Remove downloaded files from unmanaged devices"],
]

const documentation = [
  ["Privacy Policy", "Workspace-facing privacy documentation placeholder."],
  ["Terms of Service", "Administrative placeholder for contractual terms."],
  ["Business Associate Agreement", "BAA workflow placeholder; do not claim availability until approved."],
  ["Security Whitepaper", "Plain-language security posture overview placeholder."],
  ["Subprocessor List", "Vendor and subprocessors documentation placeholder."],
  ["Release Notes", "Operational change history placeholder."],
]

export default function TrustCenterPage() {
  return (
    <div className="space-y-6">
      <div className="saas-page-header flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="saas-eyebrow mb-2">Administrative trust portal</p>
          <h1 className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Trust Center
          </h1>
          <p className="saas-muted mt-2 max-w-3xl">
            A centralized administrative view of SessionSteps security, privacy, compliance readiness, vendor oversight, and operational procedures.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
          Internal administrative use
        </Badge>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p>
            This Trust Center is informational and administrative. It does not disclose sensitive implementation details and does not claim certification, legal compliance, or audit completion.
          </p>
        </div>
      </div>

      <TrustSection
        eyebrow="Security"
        title="Security Overview"
        description="Plain-language controls and posture indicators for practice administrators."
        icon={LockKeyhole}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {securityOverview.map((item) => (
            <TrustStatusCard key={item.title} title={item.title} description={item.description} />
          ))}
        </div>
      </TrustSection>

      <TrustSection
        eyebrow="Compliance"
        title="Compliance Readiness"
        description="Readiness indicators are informational only and should be reviewed with legal, compliance, and security advisors."
        icon={ClipboardCheck}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {complianceReadiness.map((item) => (
            <ReadinessBadge key={item} label={item} />
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Badges indicate intended safeguard alignment, not certification or third-party attestation.
        </p>
      </TrustSection>

      <TrustSection
        eyebrow="Third parties"
        title="Vendor Management"
        description="Vendor inventory for administrative review. Additions can be made by extending the inventory list or replacing it with a policy-backed source later."
        icon={ServerCog}
      >
        <TrustTable
          columns={["Vendor", "Purpose", "Stores PHI", "BAA Required", "BAA Status", "Review Date"]}
          rows={vendorRows}
        />
      </TrustSection>

      <TrustSection
        eyebrow="Operations"
        title="Incident Response"
        description="Administrative workflow for triage, escalation, response, and recovery."
        icon={LifeBuoy}
      >
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Emergency contact</p>
            <p className="mt-2 font-semibold text-slate-950">Practice administrator or designated security owner</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Configure internal escalation contacts before production incident response use.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {incidentWorkflow.map((step, index) => (
              <div key={step} className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{step}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TrustStatusCard title="Response timeline" description="Initial triage target, impact assessment, notification review, and resolution updates should be documented by policy." status="Policy placeholder" />
          <TrustStatusCard title="Escalation steps" description="Escalate from practice admin to security owner, legal/compliance advisor, and affected service vendors when appropriate." status="Administrative" />
          <TrustStatusCard title="Recovery process" description="Contain, restore normal operations, validate access, document root cause, and review corrective actions." status="Administrative" />
        </div>
      </TrustSection>

      <TrustSection
        eyebrow="Resilience"
        title="Disaster Recovery"
        description="Operational recovery planning and testing information for administrators."
        icon={DatabaseBackup}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TrustStatusCard title="Backup frequency" description="Define and review backup expectations with infrastructure providers and internal policy owners." status="Policy managed" />
          <TrustStatusCard title="RPO/RTO" description="Recovery point and recovery time objectives should be documented for each critical workflow." status="To be defined" />
          <TrustStatusCard title="Testing history" description="Record tabletop exercises and recovery tests when completed." status="Not published" />
          <TrustStatusCard title="Recovery documentation" description="Maintain administrator-only runbooks for service restoration and communication." status="Internal" />
        </div>
      </TrustSection>

      <TrustSection
        eyebrow="Governance"
        title="Data Retention"
        description="Configurable retention-policy placeholders for practice administrators."
        icon={Archive}
      >
        <TrustTable columns={["Data Category", "Policy", "Administrative Notes"]} rows={retentionRows} />
      </TrustSection>

      <TrustSection
        eyebrow="Administrative exports"
        title="Export Center"
        description="Completed exports will appear here when export workflows are connected to this portal."
        icon={FileArchive}
      >
        <TrustTable
          columns={["Date", "User", "Type", "Status", "Download"]}
          rows={[
            ["No completed exports recorded", "Not available", "Not available", <Badge key="none" variant="outline">No exports</Badge>, <Button key="download" variant="outline" size="sm" disabled>Download</Button>],
          ]}
        />
      </TrustSection>

      <TrustSection
        eyebrow="Documents"
        title="Documentation"
        description="Administrative placeholders for formal policy and trust documentation."
        icon={FileText}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {documentation.map(([title, description]) => (
            <DocumentPlaceholder key={title} title={title} description={description} />
          ))}
        </div>
      </TrustSection>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-950">Future extension points</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Vendor records, retention policies, export records, policy documents, and disaster-recovery tests can later be backed by existing admin-controlled data sources.
            </p>
          </div>
          <Users className="h-6 w-6 text-slate-400" />
        </div>
      </div>
    </div>
  )
}
