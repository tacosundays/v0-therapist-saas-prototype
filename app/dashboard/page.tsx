"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Mail,
  MessageSquareText,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { AddClientModal } from "@/components/dashboard/add-client-modal"
import { AssignHomeworkModal } from "@/components/dashboard/assign-homework-modal"
import { GenerateWorksheetModal } from "@/components/dashboard/generate-worksheet-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { daysBetween, scoreClientAttention } from "@/lib/dashboard-attention"
import {
  demoAssignments,
  demoCalendarPayload,
  demoClients,
  demoMoodCheckIns,
  demoReflections,
  demoWorksheetAssignments,
  enableDemoMode,
  useDemoMode,
} from "@/lib/demo-mode"
import { getClient } from "@/lib/supabase/client"

type ClientRecord = {
  id: string
  full_name: string
  email: string | null
  status: string | null
  created_at: string
  invite_accepted_at: string | null
}

type AssignmentRecord = {
  id: string
  client_id: string
  title: string
  completed: boolean
  status: string | null
  due_date: string | null
  assigned_at: string | null
  completed_at: string | null
}

type WorksheetAssignmentRecord = {
  id: string
  client_id: string
  status: string | null
  assigned_at: string | null
  completed_at: string | null
  worksheet_templates: { title: string | null } | { title: string | null }[] | null
}

type ReflectionRecord = {
  id: string
  client_id: string
  title: string | null
  created_at: string
}

type MoodRecord = {
  id: string
  client_id: string
  mood_rating: number
  anxiety_rating: number | null
  stress_rating: number | null
  created_at: string
}

type SessionSummaryRecord = {
  id: string
  client_id: string
  created_at: string
}

type CalendarSession = {
  id: string
  title: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  matchedClient: { id: string; name: string } | null
  prep: {
    homeworkStatus: string
    reflectionStatus: string
    moodStatus: string
    lastActivityAt: string | null
  } | null
}

type CalendarPayload = {
  connected: boolean
  sections: {
    today: CalendarSession[]
    tomorrow: CalendarSession[]
    upcomingWeek: CalendarSession[]
  }
}

type AttentionClient = {
  client: ClientRecord
  score: number
  reasons: string[]
  significantMoodAlert: boolean
  lastActivityAt: string | null
}

type ActivityItem = {
  id: string
  clientId: string
  clientName: string
  label: string
  detail: string
  at: string
  icon: LucideIcon
  tone: string
}

const emptyCalendar: CalendarPayload = {
  connected: false,
  sections: { today: [], tomorrow: [], upcomingWeek: [] },
}

function calendarDate(session: CalendarSession) {
  const value = session.start.dateTime || session.start.date
  return value ? new Date(value) : null
}

function worksheetTitle(record: WorksheetAssignmentRecord) {
  if (Array.isArray(record.worksheet_templates)) return record.worksheet_templates[0]?.title || "Worksheet"
  return record.worksheet_templates?.title || "Worksheet"
}

function isCompleted(record: AssignmentRecord) {
  return record.completed || record.status === "completed"
}

function formatTime(value: Date | null) {
  return value?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) || "All day"
}

function formatActivityTime(value: string) {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function mostRecentDate(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
}

export default function DashboardPage() {
  const { isDemoMode } = useDemoMode()
  const [user, setUser] = useState<User | null>(null)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignmentRecord[]>([])
  const [reflections, setReflections] = useState<ReflectionRecord[]>([])
  const [moods, setMoods] = useState<MoodRecord[]>([])
  const [summaries, setSummaries] = useState<SessionSummaryRecord[]>([])
  const [calendar, setCalendar] = useState<CalendarPayload>(emptyCalendar)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    if (isDemoMode) {
      setUser(null)
      setClients(demoClients)
      setAssignments(demoAssignments)
      setWorksheetAssignments(demoWorksheetAssignments)
      setReflections(demoReflections)
      setMoods(demoMoodCheckIns)
      setSummaries([])
      setCalendar(demoCalendarPayload)
      setIsLoading(false)
      return
    }

    try {
      const supabase = getClient()
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      setUser(authData.user)

      const { therapistId } = await getTherapistId()
      if (!therapistId) throw new Error("We could not find your therapist workspace.")

      const { data: sessionData } = await supabase.auth.getSession()
      const calendarPromise = sessionData.session?.access_token
        ? fetch("/api/calendar/events", {
            headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
          }).then(async (response) => response.ok ? response.json() as Promise<CalendarPayload> : emptyCalendar)
        : Promise.resolve(emptyCalendar)

      const [clientsResult, assignmentsResult, worksheetsResult, reflectionsResult, moodsResult, summariesResult, calendarResult] = await Promise.all([
        supabase.from("clients")
          .select("id, full_name, email, status, created_at, invite_accepted_at")
          .eq("therapist_id", therapistId)
          .order("created_at", { ascending: false }),
        supabase.from("assignments")
          .select("id, client_id, title, completed, status, due_date, assigned_at, completed_at")
          .eq("therapist_id", therapistId),
        supabase.from("worksheet_assignments")
          .select("id, client_id, status, assigned_at, completed_at, worksheet_templates(title)")
          .eq("therapist_id", therapistId),
        supabase.from("client_reflections")
          .select("id, client_id, title, created_at")
          .eq("therapist_id", therapistId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("client_mood_checkins")
          .select("id, client_id, mood_rating, anxiety_rating, stress_rating, created_at")
          .eq("therapist_id", therapistId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("session_summaries")
          .select("id, client_id, created_at")
          .eq("therapist_id", therapistId)
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        calendarPromise,
      ])

      const firstError = [
        clientsResult.error,
        assignmentsResult.error,
        worksheetsResult.error,
        reflectionsResult.error,
        moodsResult.error,
        summariesResult.error,
      ].find(Boolean)
      if (firstError) throw firstError

      setClients((clientsResult.data || []) as ClientRecord[])
      setAssignments((assignmentsResult.data || []) as AssignmentRecord[])
      setWorksheetAssignments((worksheetsResult.data || []) as WorksheetAssignmentRecord[])
      setReflections((reflectionsResult.data || []) as ReflectionRecord[])
      setMoods((moodsResult.data || []) as MoodRecord[])
      setSummaries((summariesResult.data || []) as SessionSummaryRecord[])
      setCalendar(calendarResult)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The dashboard could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }, [isDemoMode])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const todaySessions = useMemo(() => (
    [...calendar.sections.today].sort((a, b) => (calendarDate(a)?.getTime() || 0) - (calendarDate(b)?.getTime() || 0))
  ), [calendar.sections.today])

  const nextSession = todaySessions.find((session) => {
    const start = calendarDate(session)
    return session.matchedClient && start && start.getTime() >= Date.now()
  }) || todaySessions.find((session) => session.matchedClient) || null

  const attentionClients = useMemo<AttentionClient[]>(() => {
    const now = new Date()
    return clients.map((client) => {
      const clientAssignments = assignments.filter((item) => item.client_id === client.id)
      const overdueHomeworkCount = clientAssignments.filter((item) => (
        !isCompleted(item) && item.due_date && new Date(item.due_date).getTime() < now.getTime()
      )).length

      const clientMoods = moods.filter((item) => item.client_id === client.id)
      const latest = clientMoods[0] || null
      const comparison = clientMoods[Math.min(3, clientMoods.length - 1)] || null
      const session = [...calendar.sections.today, ...calendar.sections.tomorrow, ...calendar.sections.upcomingWeek]
        .find((item) => item.matchedClient?.id === client.id)
      const sessionAt = session ? calendarDate(session) : null
      const daysUntilSession = sessionAt
        ? Math.max(0, Math.floor((sessionAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        : null

      const result = scoreClientAttention({
        overdueHomeworkCount,
        moodChange: latest && comparison ? latest.mood_rating - comparison.mood_rating : null,
        latestMood: latest?.mood_rating ?? null,
        latestAnxiety: latest?.anxiety_rating ?? null,
        latestStress: latest?.stress_rating ?? null,
        daysSinceCheckIn: daysBetween(now, latest?.created_at),
        daysUntilSession,
      })

      const lastActivityAt = mostRecentDate([
        ...clientAssignments.flatMap((item) => [item.completed_at, item.assigned_at]),
        ...worksheetAssignments
          .filter((item) => item.client_id === client.id)
          .flatMap((item) => [item.completed_at, item.assigned_at]),
        ...clientMoods.map((item) => item.created_at),
        ...reflections.filter((item) => item.client_id === client.id).map((item) => item.created_at),
      ])

      return { client, ...result, lastActivityAt }
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)
  }, [assignments, calendar, clients, moods, reflections, worksheetAssignments])

  const overdueCount = assignments.filter((item) => (
    !isCompleted(item) && item.due_date && new Date(item.due_date).getTime() < Date.now()
  )).length
  const moodAlertCount = attentionClients.filter((item) => item.significantMoodAlert).length
  const activeClients = clients.filter((client) => client.status !== "inactive").length
  const totalHomework = assignments.length + worksheetAssignments.length
  const completedHomework = assignments.filter(isCompleted).length
    + worksheetAssignments.filter((item) => item.status === "completed" || Boolean(item.completed_at)).length
  const homeworkCompletion = totalHomework ? Math.round((completedHomework / totalHomework) * 100) : 0
  const engagedClients = clients.filter((client) => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
    return reflections.some((item) => item.client_id === client.id && new Date(item.created_at).getTime() >= cutoff)
      || moods.some((item) => item.client_id === client.id && new Date(item.created_at).getTime() >= cutoff)
      || assignments.some((item) => item.client_id === client.id && item.completed_at && new Date(item.completed_at).getTime() >= cutoff)
  }).length
  const engagementScore = clients.length ? Math.round((engagedClients / clients.length) * 100) : 0
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const preparedToday = summaries.filter((summary) => new Date(summary.created_at).getTime() >= todayStart.getTime()).length

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const clientName = (clientId: string) => clients.find((client) => client.id === clientId)?.full_name || "Client"
    return [
      ...assignments.filter((item) => item.completed_at).map((item) => ({
        id: `assignment-${item.id}`,
        clientId: item.client_id,
        clientName: clientName(item.client_id),
        label: "Homework completed",
        detail: item.title,
        at: item.completed_at!,
        icon: CheckCircle2,
        tone: "bg-emerald-500/10 text-emerald-600",
      })),
      ...worksheetAssignments.filter((item) => item.completed_at).map((item) => ({
        id: `worksheet-${item.id}`,
        clientId: item.client_id,
        clientName: clientName(item.client_id),
        label: "Worksheet completed",
        detail: worksheetTitle(item),
        at: item.completed_at!,
        icon: ClipboardCheck,
        tone: "bg-blue-500/10 text-blue-600",
      })),
      ...moods.map((item) => ({
        id: `mood-${item.id}`,
        clientId: item.client_id,
        clientName: clientName(item.client_id),
        label: "Mood check-in",
        detail: `Mood ${item.mood_rating}/10`,
        at: item.created_at,
        icon: Activity,
        tone: "bg-rose-500/10 text-rose-600",
      })),
      ...reflections.map((item) => ({
        id: `reflection-${item.id}`,
        clientId: item.client_id,
        clientName: clientName(item.client_id),
        label: "Reflection submitted",
        detail: item.title || "Between-session reflection",
        at: item.created_at,
        icon: MessageSquareText,
        tone: "bg-violet-500/10 text-violet-600",
      })),
      ...clients.filter((item) => item.invite_accepted_at).map((item) => ({
        id: `invite-${item.id}`,
        clientId: item.id,
        clientName: item.full_name,
        label: "Invitation accepted",
        detail: "Client portal is active",
        at: item.invite_accepted_at!,
        icon: Mail,
        tone: "bg-amber-500/10 text-amber-600",
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8)
  }, [assignments, clients, moods, reflections, worksheetAssignments])

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"
  const firstName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(" ")[0]
    || (isDemoMode ? "Emily" : "there")
  const nextSessionHref = nextSession?.matchedClient
    ? `/dashboard/clients/${nextSession.matchedClient.id}/session-prep`
    : "/dashboard/calendar"
  const nextSessionDate = nextSession ? calendarDate(nextSession) : null
  const minutesUntilNextSession = nextSessionDate
    ? Math.max(0, Math.round((nextSessionDate.getTime() - Date.now()) / (60 * 1000)))
    : null
  const dynamicGreeting = minutesUntilNextSession !== null && minutesUntilNextSession <= 180
    ? `Your next session begins ${minutesUntilNextSession === 0 ? "now" : `in ${minutesUntilNextSession} minute${minutesUntilNextSession === 1 ? "" : "s"}`}.`
    : todaySessions.length > 0
      ? `You have prepared ${Math.min(preparedToday, todaySessions.length)} of ${todaySessions.length} sessions today.`
      : "Your schedule is clear today."
  const dailyBrief = attentionClients.length === 0
    ? todaySessions.length > 0
      ? `Your clients look steady today. You have ${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"} scheduled, with no urgent follow-up signals detected.`
      : "Your clients look steady and there are no sessions on today’s calendar. This is a good time to review recent activity or plan ahead."
    : [
        `${attentionClients.length} client${attentionClients.length === 1 ? "" : "s"} ${attentionClients.length === 1 ? "needs" : "need"} attention today.`,
        attentionClients.slice(0, 3).map((item) => `${item.client.full_name}: ${item.reasons[0]?.toLowerCase() || "follow-up recommended"}.`).join(" "),
        nextSession?.matchedClient ? `${nextSession.matchedClient.name} is next on your schedule.` : "",
      ].filter(Boolean).join(" ")

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm">
        <div className="grid gap-8 bg-[radial-gradient(circle_at_top_right,rgba(109,94,245,0.18),transparent_28rem)] p-6 sm:p-8 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">{greeting}, {firstName}</p>
            <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {dynamicGreeting}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {todaySessions.length} session{todaySessions.length === 1 ? "" : "s"} today · {attentionClients.length} need attention · {overdueCount} overdue assignment{overdueCount === 1 ? "" : "s"} · {moodAlertCount} mood alert{moodAlertCount === 1 ? "" : "s"}
            </p>
          </div>
          <Button size="lg" className="h-12 w-full rounded-xl px-6 shadow-lg shadow-primary/20 sm:w-auto" asChild>
            <Link href={nextSessionHref}>
              <Sparkles className="mr-2 h-5 w-5" />
              Prepare Next Session
            </Link>
          </Button>
        </div>
        <div className="grid border-t border-border/70 sm:grid-cols-2 xl:grid-cols-4">
          <HeroMetric icon={CalendarDays} label="Sessions today" value={todaySessions.length} />
          <HeroMetric icon={AlertTriangle} label="Need attention" value={attentionClients.length} tone="text-amber-600" />
          <HeroMetric icon={Clock3} label="Overdue assignments" value={overdueCount} tone="text-rose-600" />
          <HeroMetric icon={TrendingUp} label="Mood alerts" value={moodAlertCount} tone="text-violet-600" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Practice key performance indicators">
        <KpiCard icon={Users} label="Active Clients" value={String(activeClients)} detail="Current caseload" compact />
        <KpiCard icon={ClipboardCheck} label="Homework Completion" value={`${homeworkCompletion}%`} detail={`${completedHomework} of ${totalHomework || 0} completed`} compact />
        <KpiCard icon={TrendingUp} label="Engagement Score" value={`${engagementScore}%`} detail="Active in the last 14 days" compact />
        <KpiCard icon={CalendarDays} label="Today's Sessions" value={String(todaySessions.length)} detail={`${Math.min(preparedToday, todaySessions.length)} prepared`} compact />
      </section>

      <Card className="overflow-hidden border-primary/20 bg-slate-950 text-white shadow-lg shadow-slate-950/10">
        <CardContent className="flex gap-4 p-5 sm:items-start sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">AI Daily Brief</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200 sm:text-base">{dailyBrief}</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">Some dashboard data could not be loaded.</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => void loadDashboard()}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {!isDemoMode && clients.length === 0 && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">Start with your first client—or explore a populated workspace.</p>
              <p className="mt-1 text-sm text-muted-foreground">The dashboard becomes more useful as homework, check-ins, and sessions arrive.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setAddClientOpen(true)}>Add Client</Button>
              <Button variant="outline" onClick={() => { enableDemoMode(); window.location.href = "/dashboard?demo=1" }}>View Demo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col items-start gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Priority inbox</p>
              <CardTitle className="mt-1 text-xl">Needs Attention</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="-ml-3 sm:ml-0" asChild><Link href="/dashboard/inbox">View all<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {attentionClients.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Everything looks steady" description="Overdue work, missed check-ins, mood changes, and upcoming sessions will be prioritized here." />
            ) : (
              <div className="divide-y divide-border/70">
                {attentionClients.map((item, index) => (
                  <div key={item.client.id} className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-sm font-bold text-amber-700">{index + 1}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{item.client.full_name}</p>
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700">Score {item.score}</span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Last activity: {item.lastActivityAt ? formatActivityTime(item.lastActivityAt) : "No activity yet"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.reasons.slice(0, 3).join(" · ")}</p>
                    </div>
                    <Button size="sm" className="w-full shadow-md shadow-primary/15 sm:w-auto" asChild>
                      <Link href={`/dashboard/clients/${item.client.id}/session-prep`}>Prepare Session<ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col items-start gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Calendar</p>
              <CardTitle className="mt-1 text-xl">Today&apos;s Sessions</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="-ml-3 sm:ml-0" asChild><Link href="/dashboard/calendar">Calendar<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {todaySessions.length === 0 ? (
              <EmptyState icon={CalendarDays} title={calendar.connected ? "No sessions today" : "Connect your calendar"} description={calendar.connected ? "Enjoy the open space. Upcoming sessions will appear here automatically." : "Connect Google Calendar to match appointments with client readiness."} compact />
            ) : (
              <div className="space-y-3">
                {todaySessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-primary">{formatTime(calendarDate(session))}</p>
                        <p className="mt-1 font-semibold text-foreground">{session.matchedClient?.name || session.title}</p>
                      </div>
                      {session.matchedClient && (
                        <Button size="sm" className="w-full sm:w-auto" asChild><Link href={`/dashboard/clients/${session.matchedClient.id}/session-prep`}>Prepare</Link></Button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill text={session.prep?.homeworkStatus || "No homework data"} />
                      <StatusPill text={session.prep?.reflectionStatus || "No reflection data"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Live feed</p>
            <CardTitle className="mt-1 text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState icon={Activity} title="No recent activity yet" description="Homework completions, mood check-ins, reflections, and accepted invitations will appear here." compact />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {recentActivity.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link key={item.id} href={`/dashboard/clients/${item.clientId}/session-prep`} className="flex gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-foreground">{item.clientName}</span><span className="shrink-0 text-xs text-muted-foreground">{formatActivityTime(item.at)}</span></span>
                        <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{item.label}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{item.detail}</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Shortcuts</p>
            <CardTitle className="mt-1 text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <QuickAction icon={Plus} label="Add Client" description="Create a client record" onClick={() => setAddClientOpen(true)} />
            <QuickAction icon={UserPlus} label="Invite Client" description="Send secure portal access" onClick={() => setAddClientOpen(true)} />
            <QuickAction icon={ClipboardCheck} label="Assign Homework" description="Create the next step" onClick={() => setAssignOpen(true)} />
            <QuickAction icon={Brain} label="Generate AI Worksheet" description="Build tailored content" onClick={() => setGenerateOpen(true)} />
          </CardContent>
        </Card>
      </section>

      <AddClientModal open={addClientOpen} onOpenChange={setAddClientOpen} onClientAdded={() => void loadDashboard()} />
      <AssignHomeworkModal open={assignOpen} onOpenChange={setAssignOpen} onAssignmentCreated={() => void loadDashboard()} />
      <GenerateWorksheetModal open={generateOpen} onOpenChange={setGenerateOpen} onWorksheetSaved={() => void loadDashboard()} />
    </div>
  )
}

function HeroMetric({ icon: Icon, label, value, tone = "text-primary" }: { icon: LucideIcon; label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center gap-3 border-border/70 p-4 sm:p-5 sm:[&:nth-child(even)]:border-l xl:border-l">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${tone}`}><Icon className="h-5 w-5" /></span>
      <span><span className="block text-2xl font-bold text-foreground">{value}</span><span className="block text-xs font-medium text-muted-foreground">{label}</span></span>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, detail, compact = false }: { icon: LucideIcon; label: string; value: string; detail: string; compact?: boolean }) {
  return (
    <Card className="border-border/70">
      <CardContent className={compact ? "p-4" : "p-5"}>
        <div className="flex items-start justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary" /></div>
        <p className={`${compact ? "mt-2 text-2xl" : "mt-4 text-3xl"} font-bold tracking-tight text-foreground`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function StatusPill({ text }: { text: string }) {
  return <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">{text}</span>
}

function QuickAction({ icon: Icon, label, description, onClick }: { icon: LucideIcon; label: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex items-center gap-3 rounded-2xl border border-border/70 p-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{label}</span><span className="block text-xs text-muted-foreground">{description}</span></span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  )
}

function EmptyState({ icon: Icon, title, description, compact = false }: { icon: LucideIcon; title: string; description: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center px-5 text-center ${compact ? "py-8" : "py-12"}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="h-72 animate-pulse rounded-[2rem] bg-muted" />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    </div>
  )
}
