"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Inbox as InboxIcon,
  Loader2,
  Mail,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"

type InboxFilter = "all" | "homework" | "reflections" | "mood" | "ai" | "team"

type ClientRecord = {
  id: string
  full_name: string
  email: string | null
  status: string | null
  created_at: string
  invite_sent_at: string | null
  invite_accepted_at: string | null
  user_id: string | null
}

type AssignmentRecord = {
  id: string
  client_id: string
  title: string | null
  completed: boolean | null
  status: string | null
  reflection: string | null
  created_at: string
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
}

type WorksheetAssignmentRecord = {
  id: string
  client_id: string
  status: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  worksheet_templates: { title: string | null } | { title: string | null }[] | null
}

type ReflectionRecord = {
  id: string
  client_id: string
  title: string | null
  reflection_text: string
  mood_rating: number | null
  created_at: string
}

type MoodCheckInRecord = {
  id: string
  client_id: string
  mood_rating: number
  anxiety_rating: number | null
  stress_rating: number | null
  note: string | null
  created_at: string
}

type SessionSummaryRecord = {
  id: string
  client_id: string
  created_at: string
}

type InboxItem = {
  id: string
  filter: Exclude<InboxFilter, "all">
  clientId: string
  clientName: string
  timestamp: string
  description: string
  actionLabel: string
  href: string
  icon: LucideIcon
  tone: "purple" | "green" | "amber" | "orange" | "red" | "teal" | "slate"
  event?: string
}

const filters: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "homework", label: "Homework" },
  { id: "reflections", label: "Reflections" },
  { id: "mood", label: "Mood" },
  { id: "ai", label: "AI" },
  { id: "team", label: "Team" },
]

const toneClasses = {
  purple: "bg-[#6D5EF5]/10 text-[#6D5EF5]",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-rose-50 text-rose-600",
  teal: "bg-[#18B7A0]/10 text-[#109986]",
  slate: "bg-slate-100 text-slate-600",
}

const softToneBorders = {
  purple: "border-[#6D5EF5]/15 bg-[#6D5EF5]/5",
  green: "border-emerald-200/70 bg-emerald-50/55",
  amber: "border-amber-200/70 bg-amber-50/55",
  orange: "border-orange-200/70 bg-orange-50/55",
  red: "border-rose-200/70 bg-rose-50/55",
  teal: "border-[#18B7A0]/15 bg-[#18B7A0]/5",
  slate: "border-slate-200 bg-slate-50/70",
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysSince(value: string | null | undefined) {
  const date = parseDate(value)
  if (!date) return null
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function formatTimestamp(value: string) {
  const date = parseDate(value)
  if (!date) return "Time unavailable"

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)))
  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function sortNewestFirst<T extends { timestamp: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function templateTitle(record: WorksheetAssignmentRecord) {
  const template = record.worksheet_templates
  if (Array.isArray(template)) return template[0]?.title || "Worksheet"
  return template?.title || "Worksheet"
}

function EmptyState({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="relative flex min-h-[190px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-[#6D5EF5]/[0.035] px-6 py-10 text-center">
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#6D5EF5]/30 to-transparent" />
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  )
}

function InboxRow({ item }: { item: InboxItem }) {
  const Icon = item.icon

  return (
    <div className={`group flex flex-col gap-4 rounded-3xl border p-4 shadow-[0_14px_36px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6D5EF5]/25 hover:shadow-[0_20px_48px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center ${softToneBorders[item.tone]}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[item.tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.event && <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.event}</span>}
          {item.event && <span className="h-1 w-1 rounded-full bg-slate-300" />}
          <p className="truncate font-semibold text-slate-950">{item.clientName}</p>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className="text-xs font-medium text-slate-500">{formatTimestamp(item.timestamp)}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
      </div>
      <Button
        asChild
        variant="outline"
        className="h-10 shrink-0 rounded-2xl border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-[#6D5EF5]/30 hover:bg-[#6D5EF5]/5 hover:text-[#6D5EF5]"
      >
        <Link href={item.href}>
          {item.actionLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

function InboxSection({
  title,
  eyebrow,
  items,
  icon: Icon,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  eyebrow: string
  items: InboxItem[]
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-slate-200/75 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <InboxRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} icon={Icon} />
        )}
      </CardContent>
    </Card>
  )
}

function ActivityTimeline({
  items,
}: {
  items: InboxItem[]
}) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-slate-200/75 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Timeline</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Recent Activity</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
            <InboxIcon className="h-5 w-5" />
          </div>
        </div>
        {items.length > 0 ? (
          <div className="relative space-y-4 before:absolute before:left-[21px] before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-slate-200">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.id} className="relative flex gap-4">
                  <div className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-4 ring-white ${toneClasses[item.tone]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-3xl border border-slate-200/75 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-all hover:border-[#6D5EF5]/20 hover:shadow-[0_18px_46px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.event || item.filter}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span className="text-xs font-medium text-slate-500">{formatTimestamp(item.timestamp)}</span>
                        </div>
                        <p className="mt-1 font-semibold text-slate-950">{item.clientName}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        className="h-10 shrink-0 rounded-2xl border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-[#6D5EF5]/30 hover:bg-[#6D5EF5]/5 hover:text-[#6D5EF5]"
                      >
                        <Link href={item.href}>
                          {item.actionLabel}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="No recent activity"
            description="Homework completions, reflections, mood check-ins, invitations, and AI summaries will appear here chronologically."
            icon={InboxIcon}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default function TherapistInboxPage() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("all")
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignmentRecord[]>([])
  const [reflections, setReflections] = useState<ReflectionRecord[]>([])
  const [moodCheckIns, setMoodCheckIns] = useState<MoodCheckInRecord[]>([])
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummaryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInbox = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = getClient() as any
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] Inbox: auth email:", userEmail)
        console.log("[v0] Inbox: therapist id found:", therapistId ?? "none")

        if (!therapistId) {
          setError("No therapist account found for your email.")
          return
        }

        const [clientsResult, assignmentsResult, worksheetResult, reflectionsResult, moodResult, summaryResult] = await Promise.all([
          supabase
            .from("clients")
            .select("id, full_name, email, status, created_at, invite_sent_at, invite_accepted_at, user_id")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("assignments")
            .select("id, client_id, title, completed, status, reflection, created_at, assigned_at, started_at, completed_at")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("worksheet_assignments")
            .select("id, client_id, status, assigned_at, started_at, completed_at, worksheet_templates(title)")
            .eq("therapist_id", therapistId)
            .order("assigned_at", { ascending: false }),
          supabase
            .from("client_reflections")
            .select("id, client_id, title, reflection_text, mood_rating, created_at")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("client_mood_checkins")
            .select("id, client_id, mood_rating, anxiety_rating, stress_rating, note, created_at")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("session_summaries")
            .select("id, client_id, created_at")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false })
            .limit(20),
        ])

        if (clientsResult.error) throw clientsResult.error
        if (assignmentsResult.error) throw assignmentsResult.error
        if (worksheetResult.error) throw worksheetResult.error
        if (reflectionsResult.error) throw reflectionsResult.error
        if (moodResult.error) throw moodResult.error

        if (summaryResult.error) {
          console.log("[v0] Inbox: session summaries unavailable:", summaryResult.error.message)
        }

        setClients(clientsResult.data || [])
        setAssignments(assignmentsResult.data || [])
        setWorksheetAssignments(worksheetResult.data || [])
        setReflections(reflectionsResult.data || [])
        setMoodCheckIns(moodResult.data || [])
        setSessionSummaries(summaryResult.error ? [] : summaryResult.data || [])
      } catch (err) {
        console.error("[v0] Inbox: failed to load", err)
        setError(err instanceof Error ? err.message : "Failed to load inbox.")
      } finally {
        setIsLoading(false)
      }
    }

    loadInbox()
  }, [])

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])

  const inboxData = useMemo(() => {
    const clientName = (clientId: string) => clientsById.get(clientId)?.full_name || null
    const sessionPrepHref = (clientId: string) => `/dashboard/clients/${clientId}/session-prep`

    const completedAssignmentItems: InboxItem[] = assignments
      .filter((assignment) => assignment.completed || assignment.status === "completed" || Boolean(assignment.reflection))
      .map((assignment) => {
        const name = clientName(assignment.client_id)
        const timestamp = assignment.completed_at || assignment.started_at || assignment.assigned_at || assignment.created_at
        if (!name || !timestamp) return null

        return {
          id: `assignment-${assignment.id}`,
          filter: "homework" as const,
          clientId: assignment.client_id,
          clientName: name,
          timestamp,
          description: `${assignment.title || "Homework"} is ready for review.`,
          actionLabel: "Review",
          href: sessionPrepHref(assignment.client_id),
          icon: ClipboardCheck,
          tone: "green" as const,
          event: "Homework completed",
        }
      })
      .filter(Boolean) as InboxItem[]

    const completedWorksheetItems: InboxItem[] = worksheetAssignments
      .filter((assignment) => assignment.status === "completed" || Boolean(assignment.completed_at))
      .map((assignment) => {
        const name = clientName(assignment.client_id)
        const timestamp = assignment.completed_at || assignment.started_at || assignment.assigned_at
        if (!name || !timestamp) return null

        return {
          id: `worksheet-${assignment.id}`,
          filter: "homework" as const,
          clientId: assignment.client_id,
          clientName: name,
          timestamp,
          description: `${templateTitle(assignment)} was completed and is ready for review.`,
          actionLabel: "Review",
          href: sessionPrepHref(assignment.client_id),
          icon: ClipboardCheck,
          tone: "green" as const,
          event: "Homework completed",
        }
      })
      .filter(Boolean) as InboxItem[]

    const overdueAssignmentItems: InboxItem[] = assignments
      .filter((assignment) => {
        if (assignment.completed || assignment.status === "completed") return false
        const referenceDate = assignment.assigned_at || assignment.started_at || assignment.created_at
        const age = daysSince(referenceDate)
        return age !== null && age >= 7
      })
      .map((assignment) => {
        const name = clientName(assignment.client_id)
        const timestamp = assignment.assigned_at || assignment.started_at || assignment.created_at
        const age = daysSince(timestamp)
        if (!name || !timestamp || age === null) return null

        return {
          id: `overdue-assignment-${assignment.id}`,
          filter: "homework" as const,
          clientId: assignment.client_id,
          clientName: name,
          timestamp,
          description: `${assignment.title || "Homework"} has been open for ${age} days.`,
          actionLabel: "Review",
          href: sessionPrepHref(assignment.client_id),
          icon: Clock,
          tone: "amber" as const,
          event: "Homework overdue",
        }
      })
      .filter(Boolean) as InboxItem[]

    const overdueWorksheetItems: InboxItem[] = worksheetAssignments
      .filter((assignment) => {
        if (assignment.status === "completed" || assignment.completed_at) return false
        const referenceDate = assignment.assigned_at || assignment.started_at
        const age = daysSince(referenceDate)
        return age !== null && age >= 7
      })
      .map((assignment) => {
        const name = clientName(assignment.client_id)
        const timestamp = assignment.assigned_at || assignment.started_at
        const age = daysSince(timestamp)
        if (!name || !timestamp || age === null) return null

        return {
          id: `overdue-worksheet-${assignment.id}`,
          filter: "homework" as const,
          clientId: assignment.client_id,
          clientName: name,
          timestamp,
          description: `${templateTitle(assignment)} has been open for ${age} days.`,
          actionLabel: "Review",
          href: sessionPrepHref(assignment.client_id),
          icon: Clock,
          tone: "amber" as const,
          event: "Homework overdue",
        }
      })
      .filter(Boolean) as InboxItem[]

    const reflectionItems: InboxItem[] = reflections
      .map((reflection) => {
        const name = clientName(reflection.client_id)
        if (!name) return null

        return {
          id: `reflection-${reflection.id}`,
          filter: "reflections" as const,
          clientId: reflection.client_id,
          clientName: name,
          timestamp: reflection.created_at,
          description: reflection.title
            ? `Submitted reflection: ${reflection.title}.`
            : "Submitted a new reflection.",
          actionLabel: "Read",
          href: "/dashboard/reflections",
          icon: MessageSquare,
          tone: "green" as const,
          event: "Reflection ready",
        }
      })
      .filter(Boolean) as InboxItem[]

    const moodItemsByClient = new Map<string, MoodCheckInRecord[]>()
    moodCheckIns.forEach((checkIn) => {
      const list = moodItemsByClient.get(checkIn.client_id) || []
      list.push(checkIn)
      moodItemsByClient.set(checkIn.client_id, list)
    })

    const moodAlertItems: InboxItem[] = Array.from(moodItemsByClient.entries())
      .map(([clientId, checkIns]) => {
        const sorted = [...checkIns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const latest = sorted[0]
        const previous = sorted[1]
        const name = clientName(clientId)
        if (!latest || !name) return null

        const dropped = previous ? previous.mood_rating - latest.mood_rating : 0
        const alertReasons = [
          latest.mood_rating < 4 ? `mood is ${latest.mood_rating}/10` : null,
          latest.anxiety_rating && latest.anxiety_rating > 8 ? `anxiety is ${latest.anxiety_rating}/10` : null,
          latest.stress_rating && latest.stress_rating > 8 ? `stress is ${latest.stress_rating}/10` : null,
          dropped >= 3 ? `mood dropped ${dropped} points` : null,
        ].filter(Boolean)

        if (alertReasons.length === 0) return null

        return {
          id: `mood-alert-${latest.id}`,
          filter: "mood" as const,
          clientId,
          clientName: name,
          timestamp: latest.created_at,
          description: `Mood alert: ${alertReasons.join(", ")}.`,
          actionLabel: "View trend",
          href: sessionPrepHref(clientId),
          icon: AlertTriangle,
          tone: "red" as const,
          event: "Mood alert",
        }
      })
      .filter(Boolean) as InboxItem[]

    const invitationItems: InboxItem[] = clients
      .filter((client) => client.invite_sent_at || (!client.user_id && !client.invite_accepted_at))
      .map((client) => ({
        id: `invite-${client.id}`,
        filter: "team" as const,
        clientId: client.id,
        clientName: client.full_name,
        timestamp: client.invite_accepted_at || client.invite_sent_at || client.created_at,
        description: client.user_id || client.invite_accepted_at
          ? "Invitation accepted and client account is connected."
          : client.invite_sent_at
          ? "Client invitation email was sent."
          : "Client record is waiting for invitation follow-up.",
        actionLabel: "Open prep",
        href: sessionPrepHref(client.id),
        icon: Mail,
        tone: client.user_id || client.invite_accepted_at ? "teal" : "amber",
        event: client.user_id || client.invite_accepted_at ? "Invitation accepted" : "Invitation sent",
      }))

    const aiItems: InboxItem[] = sessionSummaries
      .map((summary) => {
        const name = clientName(summary.client_id)
        if (!name) return null

        return {
          id: `summary-${summary.id}`,
          filter: "ai" as const,
          clientId: summary.client_id,
          clientName: name,
          timestamp: summary.created_at,
          description: "AI session summary is available for review.",
          actionLabel: "Open prep",
          href: sessionPrepHref(summary.client_id),
          icon: Sparkles,
          tone: "purple" as const,
          event: "AI summary generated",
        }
      })
      .filter(Boolean) as InboxItem[]

    const recentActivityItems = sortNewestFirst([
      ...completedAssignmentItems,
      ...completedWorksheetItems,
      ...reflectionItems,
      ...moodCheckIns
        .map((checkIn) => {
          const name = clientName(checkIn.client_id)
          if (!name) return null

          return {
            id: `mood-${checkIn.id}`,
            filter: "mood" as const,
            clientId: checkIn.client_id,
            clientName: name,
            timestamp: checkIn.created_at,
            description: `Submitted mood check-in: ${checkIn.mood_rating}/10.`,
            actionLabel: "View",
            href: sessionPrepHref(checkIn.client_id),
            icon: BarChart3,
            tone: "teal" as const,
            event: "Mood check-in",
          }
        })
        .filter(Boolean) as InboxItem[],
      ...invitationItems,
      ...aiItems,
    ]).slice(0, 14)

    const latestActivityByClient = new Map<string, string>()
    const recordActivity = (clientId: string, value: string | null | undefined) => {
      if (!value) return
      const current = latestActivityByClient.get(clientId)
      if (!current || new Date(value).getTime() > new Date(current).getTime()) {
        latestActivityByClient.set(clientId, value)
      }
    }

    clients.forEach((client) => {
      recordActivity(client.id, client.invite_accepted_at || client.invite_sent_at || client.created_at)
    })
    assignments.forEach((assignment) => {
      recordActivity(assignment.client_id, assignment.completed_at || assignment.started_at || assignment.assigned_at || assignment.created_at)
    })
    worksheetAssignments.forEach((assignment) => {
      recordActivity(assignment.client_id, assignment.completed_at || assignment.started_at || assignment.assigned_at)
    })
    reflections.forEach((reflection) => recordActivity(reflection.client_id, reflection.created_at))
    moodCheckIns.forEach((checkIn) => recordActivity(checkIn.client_id, checkIn.created_at))

    const inactiveItems: InboxItem[] = clients
      .map((client) => {
        const lastActivity = latestActivityByClient.get(client.id)
        const inactiveDays = daysSince(lastActivity)
        if (inactiveDays === null || inactiveDays < 14) return null

        return {
          id: `inactive-${client.id}`,
          filter: "team" as const,
          clientId: client.id,
          clientName: client.full_name,
          timestamp: lastActivity,
          description: `No recorded activity in ${inactiveDays} days.`,
          actionLabel: "Open prep",
          href: sessionPrepHref(client.id),
          icon: Clock,
          tone: "orange" as const,
          event: "Inactive client",
        }
      })
      .filter(Boolean) as InboxItem[]

    const needsAttention = sortNewestFirst([
      ...moodAlertItems,
      ...overdueAssignmentItems,
      ...overdueWorksheetItems,
      ...completedAssignmentItems,
      ...completedWorksheetItems,
      ...inactiveItems,
    ]).slice(0, 8)

    return {
      recentActivityItems,
      needsAttention,
      homeworkItems: sortNewestFirst([...completedAssignmentItems, ...completedWorksheetItems]).slice(0, 8),
      reflectionItems: sortNewestFirst(reflectionItems).slice(0, 8),
      moodAlertItems: sortNewestFirst(moodAlertItems).slice(0, 8),
      invitationItems: sortNewestFirst(invitationItems).slice(0, 8),
      inactiveItems: sortNewestFirst(inactiveItems).slice(0, 8),
      overdueHomeworkItems: sortNewestFirst([...overdueAssignmentItems, ...overdueWorksheetItems]).slice(0, 8),
      totalItems: [
        ...recentActivityItems,
        ...needsAttention,
        ...completedAssignmentItems,
        ...completedWorksheetItems,
        ...reflectionItems,
        ...moodAlertItems,
        ...invitationItems,
        ...aiItems,
      ].length,
    }
  }, [assignments, clients, clientsById, moodCheckIns, reflections, sessionSummaries, worksheetAssignments])

  const filtered = (items: InboxItem[]) => {
    if (activeFilter === "all") return items
    return items.filter((item) => item.filter === activeFilter)
  }

  const summaryStats = [
    { label: "Homework ready", value: inboxData.homeworkItems.length, icon: ClipboardCheck, tone: "green", trend: inboxData.homeworkItems.length > 0 ? "Ready to review" : "Clear" },
    { label: "Reflections", value: inboxData.reflectionItems.length, icon: MessageSquare, tone: "green", trend: inboxData.reflectionItems.length > 0 ? "Waiting" : "None waiting" },
    { label: "Mood alerts", value: inboxData.moodAlertItems.length, icon: AlertTriangle, tone: "red", trend: inboxData.moodAlertItems.length > 0 ? "Needs review" : "Stable" },
    { label: "Inactive clients", value: inboxData.inactiveItems.length, icon: Clock, tone: "orange", trend: inboxData.inactiveItems.length > 0 ? "Follow up" : "No stale activity" },
  ] as const
  const estimatedReviewMinutes = Math.max(
    0,
    inboxData.homeworkItems.length * 2
      + inboxData.reflectionItems.length * 2
      + inboxData.moodAlertItems.length * 3
      + inboxData.inactiveItems.length * 2
  )

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[32px] border border-slate-200/75 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.07)]"
      >
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_20%_0%,rgba(99,91,255,0.18),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(24,183,160,0.16),transparent_30%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-4 rounded-full bg-[#6D5EF5]/10 px-3 py-1 text-[#6D5EF5] hover:bg-[#6D5EF5]/10">
                Therapist Inbox
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Your morning clinical workspace.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Review real homework, reflections, mood signals, invitations, and session-prep activity from your clients.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[620px]">
              {summaryStats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-[26px] border border-slate-200/75 bg-white/90 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)] backdrop-blur">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses[stat.tone]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">
                        <TrendingUp className="h-3 w-3" />
                        Live
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{stat.label}</p>
                    <p className="mt-2 text-xs font-medium text-slate-400">{stat.trend}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {!isLoading && !error && (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="overflow-hidden rounded-[30px] border-[#6D5EF5]/15 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
            <CardContent className="relative p-6">
              <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_10%_0%,rgba(109,94,245,0.16),transparent_36%),radial-gradient(circle_at_90%_8%,rgba(24,183,160,0.13),transparent_32%)]" />
              <div className="relative">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">AI Daily Brief</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Review queue at a glance</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6D5EF5]/10 text-[#6D5EF5]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Homework waiting", inboxData.homeworkItems.length],
                    ["Reflections waiting", inboxData.reflectionItems.length],
                    ["Mood alerts", inboxData.moodAlertItems.length],
                    ["Inactive clients", inboxData.inactiveItems.length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200/75 bg-white/80 p-4">
                      <p className="text-2xl font-bold text-slate-950">{value}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-slate-200/75 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Estimated review time</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {estimatedReviewMinutes > 0 ? `${estimatedReviewMinutes} minutes based on current items.` : "No review time estimated right now."}
                    </p>
                  </div>
                  <Button asChild className="h-11 rounded-2xl bg-[#6D5EF5] px-5 text-white shadow-[0_14px_30px_rgba(109,94,245,0.24)] hover:bg-[#5B4DEA]">
                    <Link href="/dashboard/ai-suggestions">
                      Open AI Brief
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <InboxSection
            eyebrow="Priority"
            title="Needs Attention"
            icon={AlertTriangle}
            items={filtered(inboxData.needsAttention)}
            emptyTitle="No clients need attention today"
            emptyDescription="Mood alerts, overdue homework, inactive clients, and reflections ready to review will appear here."
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200/75 bg-white p-2 shadow-[0_14px_44px_rgba(15,23,42,0.045)]">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
              activeFilter === filter.id
                ? "bg-[#6D5EF5] text-white shadow-[0_12px_24px_rgba(109,94,245,0.22)]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center rounded-[28px] border border-slate-200 bg-white py-20 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D5EF5]" />
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          <ActivityTimeline items={filtered(inboxData.recentActivityItems)} />

          <div className="grid gap-6 xl:grid-cols-2">
            <InboxSection
              eyebrow="Homework"
              title="Homework Ready for Review"
              icon={ClipboardCheck}
              items={filtered(inboxData.homeworkItems)}
              emptyTitle="No homework waiting"
              emptyDescription="Completed homework and worksheets will appear here when clients finish them."
            />
            <InboxSection
              eyebrow="Between Sessions"
              title="Reflections Submitted"
              icon={MessageSquare}
              items={filtered(inboxData.reflectionItems)}
              emptyTitle="No reflections submitted"
              emptyDescription="Client journal entries will appear here after they submit reflections in the portal."
            />
            <InboxSection
              eyebrow="Mood"
              title="Mood Alerts"
              icon={BarChart3}
              items={filtered(inboxData.moodAlertItems)}
              emptyTitle="No mood alerts"
              emptyDescription="Low mood, high anxiety or stress, and notable drops will appear here when real check-ins are submitted."
            />
            <InboxSection
              eyebrow="Invitations"
              title="Recent Invitations"
              icon={Users}
              items={filtered(inboxData.invitationItems)}
              emptyTitle="No recent invitations"
              emptyDescription="Client invitations and registration follow-ups will appear here."
            />
          </div>
        </div>
      )}

      {!isLoading && !error && inboxData.totalItems === 0 && (
        <div className="rounded-[28px] border border-slate-200/75 bg-white p-8 text-center shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D5EF5]/10 text-[#6D5EF5]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-950">Your inbox is clear</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            As clients complete homework, submit reflections, check in with mood data, or accept invitations, those real updates will collect here.
          </p>
        </div>
      )}
    </div>
  )
}
