"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  MessageSquare,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"

type ClientRecord = {
  id: string
  full_name: string
  email: string | null
  status: string | null
  created_at: string
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

type PrepClient = {
  client: ClientRecord
  homeworkStatus: string
  homeworkTone: "green" | "amber" | "slate"
  reflectionStatus: string
  reflectionTone: "green" | "slate"
  moodStatus: string
  moodTone: "red" | "teal" | "slate"
  prepScore: number
  lastActivityAt: string | null
  readyReasons: string[]
}

type CalendarSessionEvent = {
  id: string
  title: string
  description: string | null
  location: string | null
  htmlLink: string | null
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  matchedClient: { id: string; name: string } | null
  prep: {
    homeworkStatus: string
    reflectionStatus: string
    moodStatus: string
    lastActivityAt: string | null
  } | null
}

type CalendarEventsPayload = {
  connected: boolean
  connection?: {
    providerAccountEmail: string | null
    generateAiPrepOvernight: boolean
    connectedAt: string
  }
  sections: {
    today: CalendarSessionEvent[]
    tomorrow: CalendarSessionEvent[]
    upcomingWeek: CalendarSessionEvent[]
  }
}

const toneClasses = {
  green: "bg-emerald-50 text-emerald-600 border-emerald-200/70",
  amber: "bg-amber-50 text-amber-700 border-amber-200/70",
  red: "bg-rose-50 text-rose-600 border-rose-200/70",
  teal: "bg-[#18B7A0]/10 text-[#109986] border-[#18B7A0]/20",
  purple: "bg-[#6D5EF5]/10 text-[#6D5EF5] border-[#6D5EF5]/20",
  slate: "bg-slate-50 text-slate-500 border-slate-200",
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatEventTime(event: CalendarSessionEvent) {
  const value = event.start.dateTime || event.start.date
  if (!value) return "Time unavailable"
  const date = new Date(value)
  if (event.start.date && !event.start.dateTime) return "All day"
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatEventDate(event: CalendarSessionEvent) {
  const value = event.start.dateTime || event.start.date
  if (!value) return "Date unavailable"
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function newestDate(values: Array<string | null | undefined>) {
  const dates = values
    .map(parseDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())

  return dates[0]?.toISOString() || null
}

function StatusPill({ label, tone }: { label: string; tone: keyof typeof toneClasses }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${toneClasses[tone]}`}>
      {label}
    </span>
  )
}

function getHomeworkTone(label: string | undefined): keyof typeof toneClasses {
  if (label?.includes("ready")) return "green"
  if (label?.includes("pending")) return "amber"
  return "slate"
}

function getReflectionTone(label: string | undefined): keyof typeof toneClasses {
  return label === "Submitted" ? "green" : "slate"
}

function getMoodTone(label: string | undefined): keyof typeof toneClasses {
  if (label === "Needs review") return "red"
  if (label?.startsWith("Mood")) return "teal"
  return "slate"
}

function getPrepReadiness(event: CalendarSessionEvent) {
  if (!event.matchedClient) return "Not available"
  if (!event.prep) return "No prep signals"
  const hasPrepSignal = [
    event.prep.homeworkStatus,
    event.prep.reflectionStatus,
    event.prep.moodStatus,
  ].some((status) => status && !["No homework", "None yet", "No check-in"].includes(status))

  return hasPrepSignal ? "Signals ready" : "No prep signals"
}

function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-[#6D5EF5]/[0.035] px-6 py-10 text-center">
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#6D5EF5]/30 to-transparent" />
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-slate-200/75 bg-white p-4 shadow-sm">
            <div className="mb-3 h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-8 w-14 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-5 w-56 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="grid gap-2 sm:grid-cols-4 lg:w-[520px]">
              {Array.from({ length: 4 }).map((__, pillIndex) => (
                <div key={pillIndex} className="h-9 animate-pulse rounded-full bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionCard({
  eyebrow,
  title,
  icon: Icon,
  children,
}: {
  eyebrow: string
  title: string
  icon: LucideIcon
  children: React.ReactNode
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
        {children}
      </CardContent>
    </Card>
  )
}

function AdditionalPrepRow({ prepClient }: { prepClient: PrepClient }) {
  const { client } = prepClient

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200/75 bg-white p-4 shadow-sm lg:grid-cols-[minmax(180px,1fr)_minmax(320px,1.4fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#6D5EF5]/10 text-xs font-bold text-[#6D5EF5]">
          {client.full_name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-950">{client.full_name}</p>
          <p className="text-sm text-slate-500">No matched calendar event</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusPill label={prepClient.homeworkStatus} tone={prepClient.homeworkTone} />
        <StatusPill label={prepClient.reflectionStatus} tone={prepClient.reflectionTone} />
        <StatusPill label={prepClient.moodStatus} tone={prepClient.moodTone} />
        {prepClient.readyReasons.map((reason) => (
          <span key={reason} className="rounded-full bg-[#18B7A0]/10 px-2.5 py-1 text-xs font-bold text-[#109986]">
            {reason}
          </span>
        ))}
      </div>
      <Button
        asChild
        className="h-11 rounded-2xl bg-[#6D5EF5] px-5 text-white shadow-[0_14px_30px_rgba(109,94,245,0.18)] hover:bg-[#5B4DEA]"
      >
        <Link href={`/dashboard/clients/${client.id}/session-prep`}>
          Open Session Prep
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

function CalendarEventCard({ event }: { event: CalendarSessionEvent }) {
  const prep = event.prep
  const prepReadiness = getPrepReadiness(event)

  return (
    <div className="rounded-[24px] border border-slate-200/75 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.045)]">
      <div className="grid gap-4 lg:grid-cols-[120px_minmax(220px,1fr)_minmax(360px,1.3fr)_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 lg:block">
            <Clock className="h-3.5 w-3.5 lg:mb-1" />
            <span>{formatEventTime(event)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{formatEventDate(event)}</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-bold text-slate-950">
              {event.matchedClient?.name || "Not matched to a client"}
            </p>
            {!event.matchedClient && <StatusPill label="Not matched to a client" tone="slate" />}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{event.title}</p>
          {event.location && <p className="mt-1 truncate text-xs text-slate-400">{event.location}</p>}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Homework
            </div>
            <StatusPill label={prep?.homeworkStatus || "No homework"} tone={getHomeworkTone(prep?.homeworkStatus)} />
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              <MessageSquare className="h-3.5 w-3.5" />
              Reflection
            </div>
            <StatusPill label={prep?.reflectionStatus || "None yet"} tone={getReflectionTone(prep?.reflectionStatus)} />
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              <BarChart3 className="h-3.5 w-3.5" />
              Mood
            </div>
            <StatusPill label={prep?.moodStatus || "No check-in"} tone={getMoodTone(prep?.moodStatus)} />
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              AI Prep
            </div>
            <StatusPill label={prepReadiness} tone={prepReadiness === "Signals ready" ? "purple" : "slate"} />
          </div>
        </div>

        {event.matchedClient ? (
          <Button
            asChild
            className="h-11 rounded-2xl bg-[#6D5EF5] px-4 text-white shadow-[0_14px_30px_rgba(109,94,245,0.18)] hover:bg-[#5B4DEA]"
          >
            <Link href={`/dashboard/clients/${event.matchedClient.id}/session-prep`}>
              Open Session Prep
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : event.htmlLink ? (
          <Button asChild variant="outline" className="h-10 shrink-0 rounded-2xl">
            <a href={event.htmlLink} target="_blank" rel="noreferrer">View</a>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function CalendarSessionSection({
  eyebrow,
  title,
  icon,
  events,
  emptyTitle,
  emptyDescription,
}: {
  eyebrow: string
  title: string
  icon: LucideIcon
  events: CalendarSessionEvent[]
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <SectionCard eyebrow={eyebrow} title={title} icon={icon}>
      {events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <CalendarEventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} icon={icon} />
      )}
    </SectionCard>
  )
}

export default function CalendarPage() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignmentRecord[]>([])
  const [reflections, setReflections] = useState<ReflectionRecord[]>([])
  const [moodCheckIns, setMoodCheckIns] = useState<MoodCheckInRecord[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCalendar = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = getClient() as any
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] Calendar: auth email:", userEmail)
        console.log("[v0] Calendar: therapist id found:", therapistId ?? "none")

        if (!therapistId) {
          setError("No therapist account found for your email.")
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        const calendarEventsPromise = session?.access_token
          ? fetch("/api/calendar/events", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }).then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
          : Promise.resolve({ ok: true, payload: null })

        const [clientsResult, assignmentsResult, worksheetResult, reflectionsResult, moodResult] = await Promise.all([
          supabase
            .from("clients")
            .select("id, full_name, email, status, created_at")
            .eq("therapist_id", therapistId)
            .order("full_name", { ascending: true }),
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
        ])

        if (clientsResult.error) throw clientsResult.error
        if (assignmentsResult.error) throw assignmentsResult.error
        if (worksheetResult.error) throw worksheetResult.error
        if (reflectionsResult.error) throw reflectionsResult.error
        if (moodResult.error) throw moodResult.error

        const calendarResult = await calendarEventsPromise
        if (!calendarResult.ok) throw new Error(calendarResult.payload?.error || "Failed to load Google Calendar events.")

        setClients(clientsResult.data || [])
        setAssignments(assignmentsResult.data || [])
        setWorksheetAssignments(worksheetResult.data || [])
        setReflections(reflectionsResult.data || [])
        setMoodCheckIns(moodResult.data || [])
        setCalendarEvents(calendarResult.payload || null)
      } catch (err) {
        console.error("[v0] Calendar: failed to load", err)
        setError(err instanceof Error ? err.message : "Failed to load calendar.")
      } finally {
        setIsLoading(false)
      }
    }

    loadCalendar()
  }, [])

  const connectGoogleCalendar = async () => {
    setIsConnectingCalendar(true)
    setError(null)

    try {
      const supabase = getClient() as any
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("You must be logged in to connect Google Calendar.")
        return
      }

      const response = await fetch("/api/calendar/google/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.authUrl) {
        setError(result?.error || "Failed to start Google Calendar connection.")
        return
      }

      window.location.href = result.authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Google Calendar.")
    } finally {
      setIsConnectingCalendar(false)
    }
  }

  const prepClients = useMemo(() => {
    return clients
      .map((client): PrepClient => {
        const clientAssignments = assignments.filter((assignment) => assignment.client_id === client.id)
        const clientWorksheets = worksheetAssignments.filter((assignment) => assignment.client_id === client.id)
        const clientReflections = reflections.filter((reflection) => reflection.client_id === client.id)
        const clientMoods = moodCheckIns.filter((checkIn) => checkIn.client_id === client.id)

        const completedHomework = [
          ...clientAssignments.filter((assignment) => assignment.completed || assignment.status === "completed" || Boolean(assignment.reflection)),
          ...clientWorksheets.filter((assignment) => assignment.status === "completed" || Boolean(assignment.completed_at)),
        ]
        const pendingHomework = [
          ...clientAssignments.filter((assignment) => !assignment.completed && assignment.status !== "completed"),
          ...clientWorksheets.filter((assignment) => assignment.status !== "completed" && !assignment.completed_at),
        ]
        const latestReflection = clientReflections[0] || null
        const latestMood = clientMoods[0] || null
        const moodAlert = Boolean(
          latestMood
          && (
            latestMood.mood_rating < 4
            || (latestMood.anxiety_rating !== null && latestMood.anxiety_rating > 8)
            || (latestMood.stress_rating !== null && latestMood.stress_rating > 8)
          )
        )

        const readyReasons = [
          completedHomework.length > 0 ? "Homework ready" : null,
          latestReflection ? "Reflection submitted" : null,
          moodAlert ? "Mood alert" : null,
        ].filter(Boolean) as string[]

        const lastActivityAt = newestDate([
          client.created_at,
          ...clientAssignments.map((assignment) => assignment.completed_at || assignment.started_at || assignment.assigned_at || assignment.created_at),
          ...clientWorksheets.map((assignment) => assignment.completed_at || assignment.started_at || assignment.assigned_at),
          ...clientReflections.map((reflection) => reflection.created_at),
          ...clientMoods.map((checkIn) => checkIn.created_at),
        ])

        return {
          client,
          homeworkStatus: completedHomework.length > 0
            ? `${completedHomework.length} ready`
            : pendingHomework.length > 0
            ? `${pendingHomework.length} pending`
            : "No homework",
          homeworkTone: completedHomework.length > 0 ? "green" : pendingHomework.length > 0 ? "amber" : "slate",
          reflectionStatus: latestReflection ? "Submitted" : "None yet",
          reflectionTone: latestReflection ? "green" : "slate",
          moodStatus: moodAlert
            ? "Needs review"
            : latestMood
            ? `Mood ${latestMood.mood_rating}/10`
            : "No check-in",
          moodTone: moodAlert ? "red" : latestMood ? "teal" : "slate",
          prepScore: completedHomework.length * 3 + clientReflections.length * 2 + (moodAlert ? 3 : latestMood ? 1 : 0) + pendingHomework.length,
          lastActivityAt,
          readyReasons,
        }
      })
      .sort((a, b) => {
        if (b.prepScore !== a.prepScore) return b.prepScore - a.prepScore
        return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime()
      })
  }, [assignments, clients, moodCheckIns, reflections, worksheetAssignments])

  const prepReadyClients = prepClients.filter((client) => client.prepScore > 0)
  const connectedCalendarEvents = calendarEvents?.connected ? calendarEvents : null
  const todaySessions = connectedCalendarEvents?.sections.today || []
  const tomorrowSessions = connectedCalendarEvents?.sections.tomorrow || []
  const upcomingWeekSessions = connectedCalendarEvents?.sections.upcomingWeek || []
  const allCalendarSessions = [...todaySessions, ...tomorrowSessions, ...upcomingWeekSessions]
  const matchedCalendarClientIds = new Set(
    allCalendarSessions
      .map((event) => event.matchedClient?.id)
      .filter((id): id is string => Boolean(id))
  )
  const additionalPrepClients = prepReadyClients.filter((prepClient) => !matchedCalendarClientIds.has(prepClient.client.id))
  const prepNeededCount = additionalPrepClients.length

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[28px] border border-slate-200/75 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-3 rounded-full bg-[#6D5EF5]/10 px-3 py-1 text-[#6D5EF5] hover:bg-[#6D5EF5]/10">
                Calendar
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Session readiness.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                See who is on the calendar and whether each matched session has homework, reflection, mood, and prep signals ready.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:w-[480px]">
              {[
                { label: "Sessions Today", value: todaySessions.length, icon: CalendarClock, tone: "purple" as const },
                { label: "Sessions Tomorrow", value: tomorrowSessions.length, icon: CalendarDays, tone: "teal" as const },
                { label: "Prep Needed", value: prepNeededCount, icon: AlertTriangle, tone: prepNeededCount > 0 ? "amber" as const : "green" as const },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-2xl border border-slate-200/75 bg-slate-50/70 p-4">
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses[stat.tone]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-bold text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {isLoading && (
        <LoadingRows />
      )}

      {error && !isLoading && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {!connectedCalendarEvents && (
            <div className="rounded-[28px] border border-[#6D5EF5]/20 bg-[#6D5EF5]/10 p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#5B4DEA]">Calendar disconnected</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">Connect Google Calendar to show session readiness.</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    Once connected, Today, Tomorrow, and Upcoming Week will show matched sessions and prep statuses in one list.
                  </p>
                </div>
                <Button
                  className="h-11 rounded-2xl bg-[#6D5EF5] px-5 text-white hover:bg-[#5B4DEA]"
                  onClick={connectGoogleCalendar}
                  disabled={isConnectingCalendar}
                >
                  {isConnectingCalendar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
                  Connect Google Calendar
                </Button>
              </div>
            </div>
          )}

          {connectedCalendarEvents ? (
            <>
              <CalendarSessionSection
                eyebrow="Today"
                title="Today"
                icon={CalendarClock}
                events={todaySessions}
                emptyTitle="No sessions today"
                emptyDescription="No matched or unmatched Google Calendar events were found for today."
              />
              <CalendarSessionSection
                eyebrow="Tomorrow"
                title="Tomorrow"
                icon={CalendarDays}
                events={tomorrowSessions}
                emptyTitle="No sessions tomorrow"
                emptyDescription="No matched or unmatched Google Calendar events were found for tomorrow."
              />
              <CalendarSessionSection
                eyebrow="Week"
                title="Upcoming Week"
                icon={Clock}
                events={upcomingWeekSessions}
                emptyTitle="No upcoming sessions"
                emptyDescription="No additional Google Calendar events were found in the upcoming week."
              />
            </>
          ) : (
            <SectionCard eyebrow="Schedule" title="Upcoming Sessions" icon={CalendarDays}>
              <EmptyState
                title="Calendar disconnected"
                description="Connect Google Calendar to show upcoming sessions here."
                icon={CalendarDays}
              />
            </SectionCard>
          )}

          <SectionCard eyebrow="Prep" title="Additional Prep Needed" icon={Sparkles}>
            {additionalPrepClients.length > 0 ? (
              <div className="space-y-3">
                {additionalPrepClients.map((prepClient) => (
                  <AdditionalPrepRow key={prepClient.client.id} prepClient={prepClient} />
                ))}
              </div>
            ) : clients.length > 0 ? (
              <EmptyState
                title="All sessions are prepared"
                description="Clients with prep signals and no matched calendar event will appear here."
                icon={CheckCircle2}
              />
            ) : (
              <EmptyState
                title="No clients to prepare for yet"
                description="When clients are added, prep signals will appear here without duplicating the calendar schedule."
                icon={Users}
              />
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
