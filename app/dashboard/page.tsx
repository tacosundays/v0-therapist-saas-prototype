"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  CalendarClock,
  CheckCircle2, 
  ArrowRight,
  Loader2,
  AlertTriangle,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { getClient } from "@/lib/supabase/client"
import { getTherapistId } from "@/lib/auth/check-user-role"
import type { User } from "@supabase/supabase-js"

interface Client {
  id: string
  therapist_id: string
  full_name: string
  email: string | null
  created_at: string
}

interface Assignment {
  id: string
  client_id: string
  title: string
  completed: boolean
  status: string | null
  due_date: string | null
  reflection: string | null
  completed_at: string | null
  assigned_at: string | null
  started_at: string | null
}

interface WorksheetAssignment {
  id: string
  client_id: string
  status: string
  completed_at: string | null
  assigned_at: string | null
  started_at: string | null
  worksheet_template_id: string
  worksheet_templates: {
    title: string
  }
}

interface CoupleRecord {
  id: string
  relationship_name: string
  partner_1_client_id: string
  partner_2_client_id: string
}

interface CoupleCheckIn {
  id: string
  couple_id: string
  client_id: string
  check_in_week: string
  relationship_satisfaction: number
  trust: number
  communication: number
  intimacy: number
}

interface ClientReflection {
  id: string
  client_id: string
  title: string | null
  reflection_text: string
  mood_rating: number | null
  created_at: string
}

interface MoodCheckIn {
  id: string
  client_id: string
  mood_rating: number
  anxiety_rating: number | null
  created_at: string
}

type ClientWorkspaceSummary = {
  client: Client
  homeworkStatus: string
  reflectionStatus: string
  moodStatus: string
  lastActivity: string
  lastActivityAt: string | null
  attentionReasons: string[]
  completionRate: number | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignment[]>([])
  const [couples, setCouples] = useState<CoupleRecord[]>([])
  const [coupleCheckIns, setCoupleCheckIns] = useState<CoupleCheckIn[]>([])
  const [clientReflections, setClientReflections] = useState<ClientReflection[]>([])
  const [moodCheckIns, setMoodCheckIns] = useState<MoodCheckIn[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async (therapistId: string) => {
    try {
      const supabase = getClient() as any

      console.log("[v0] Dashboard: loading data for therapist.id:", therapistId)

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("therapist_id", therapistId)
        .order("created_at", { ascending: false })

      if (clientsError) {
        console.error("[v0] Error fetching clients:", clientsError)
      } else {
        console.log("[v0] Dashboard: clients count:", clientsData?.length ?? 0)
        console.log("[v0] Dashboard: client emails:", ((clientsData || []) as Client[]).map(c => c.email))
        setClients(clientsData || [])
      }

      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, client_id, title, completed, status, due_date, reflection, completed_at, assigned_at, started_at")
        .eq("therapist_id", therapistId)

      if (assignmentsError) {
        console.error("[v0] Error fetching assignments:", assignmentsError)
      } else {
        setAssignments(assignmentsData || [])
      }

      // Fetch worksheet assignments
      const { data: worksheetData, error: worksheetError } = await supabase
        .from("worksheet_assignments")
        .select(`
          id,
          client_id,
          status,
          completed_at,
          assigned_at,
          started_at,
          worksheet_template_id,
          worksheet_templates (
            title
          )
        `)
        .eq("therapist_id", therapistId)

      if (worksheetError) {
        console.error("[v0] Error fetching worksheet assignments:", worksheetError)
      } else {
        setWorksheetAssignments(worksheetData || [])
      }

      const { data: couplesData, error: couplesError } = await supabase
        .from("couples")
        .select("id, relationship_name, partner_1_client_id, partner_2_client_id")
        .eq("therapist_id", therapistId)

      if (couplesError) {
        console.error("[v0] Error fetching couples:", couplesError)
      } else {
        setCouples(couplesData || [])
      }

      const { data: checkInsData, error: checkInsError } = await supabase
        .from("couple_check_ins")
        .select("id, couple_id, client_id, check_in_week, relationship_satisfaction, trust, communication, intimacy")
        .eq("therapist_id", therapistId)
        .order("check_in_week", { ascending: false })

      if (checkInsError) {
        console.error("[v0] Error fetching couple check-ins:", checkInsError)
      } else {
        setCoupleCheckIns(checkInsData || [])
      }

      const { data: reflectionsData, error: reflectionsError } = await supabase
        .from("client_reflections")
        .select("id, client_id, title, reflection_text, mood_rating, created_at")
        .eq("therapist_id", therapistId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (reflectionsError) {
        console.error("[v0] Error fetching client reflections:", reflectionsError)
      } else {
        setClientReflections(reflectionsData || [])
      }

      const { data: moodData, error: moodError } = await supabase
        .from("client_mood_checkins")
        .select("id, client_id, mood_rating, anxiety_rating, created_at")
        .eq("therapist_id", therapistId)
        .order("created_at", { ascending: false })

      if (moodError) {
        console.error("[v0] Error fetching client mood check-ins:", moodError)
      } else {
        setMoodCheckIns(moodData || [])
      }
    } catch (err) {
      console.error("[v0] Exception fetching data:", err)
    }
  }, [])

  useEffect(() => {
    const loadDashboard = async () => {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        setIsLoading(false)
        return
      }

      // Resolve therapist id by email (therapists.id may != auth.user.id)
      const { therapistId, userEmail } = await getTherapistId()

      console.log("[v0] Dashboard: auth email:", userEmail)
      console.log("[v0] Dashboard: therapist id found:", therapistId ?? "none")

      if (!therapistId) {
        console.log("[v0] Dashboard: no therapist record resolved, no clients to load")
        setIsLoading(false)
        return
      }

      await fetchData(therapistId)
      setIsLoading(false)
    }

    loadDashboard()
  }, [fetchData])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const displayName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(" ")?.[0]
    || user?.email?.split("@")[0]
    || "there"

  // Get latest reflections
  const latestReflections = assignments
    .filter(a => a.reflection && a.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 3)

  // Get recently completed worksheet assignments
  const recentlyCompletedWorksheets = worksheetAssignments
    .filter(a => a.status === "completed" && a.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 3)

  const homeworkWaitingCount = recentlyCompletedWorksheets.length + latestReflections.length

  const getLatestActivityAt = (client: Client, clientAssignments: Assignment[], clientWorksheetAssignments: WorksheetAssignment[]) => {
    const activityDates = [
      client.created_at,
      ...clientAssignments.flatMap((assignment) => [
        assignment.assigned_at,
        assignment.started_at,
        assignment.completed_at,
      ]),
      ...clientWorksheetAssignments.flatMap((assignment) => [
        assignment.assigned_at,
        assignment.started_at,
        assignment.completed_at,
      ]),
    ].filter(Boolean) as string[]

    return activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
  }

  const formatShortDate = (date: string | null) => {
    if (!date) return "No activity yet"

    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 14) return `${days} days ago`
    return new Date(date).toLocaleDateString()
  }

  const clientsNeedingAttention = clients
    .map((client) => {
      const clientAssignments = assignments.filter(a => a.client_id === client.id)
      const clientWorksheetAssignments = worksheetAssignments.filter(a => a.client_id === client.id)
      const clientTotal = clientAssignments.length + clientWorksheetAssignments.length
      const clientCompleted = clientAssignments.filter(a => a.completed || a.status === "completed").length
        + clientWorksheetAssignments.filter(a => a.status === "completed").length
      const pending = clientTotal - clientCompleted
      const clientCompletionRate = clientTotal > 0 ? Math.round((clientCompleted / clientTotal) * 100) : null
      const latestActivityAt = getLatestActivityAt(client, clientAssignments, clientWorksheetAssignments)
      const inactiveDays = latestActivityAt
        ? Math.floor((Date.now() - new Date(latestActivityAt).getTime()) / (1000 * 60 * 60 * 24))
        : null
      const clientMoodCheckIns = moodCheckIns.filter((checkIn) => checkIn.client_id === client.id)
      const recentMoodCheckIns = clientMoodCheckIns.slice(0, 5)
      const averageMood = recentMoodCheckIns.length > 0
        ? recentMoodCheckIns.reduce((sum, checkIn) => sum + checkIn.mood_rating, 0) / recentMoodCheckIns.length
        : null
      const latestMoodCheckIn = clientMoodCheckIns[0] || null
      const daysSinceMoodCheckIn = latestMoodCheckIn
        ? Math.floor((Date.now() - new Date(latestMoodCheckIn.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null
      const daysSinceClientCreated = Math.floor((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const oldestRecentMood = clientMoodCheckIns.length > 1 ? clientMoodCheckIns[Math.min(clientMoodCheckIns.length - 1, 4)] : null
      const moodDropped = latestMoodCheckIn && oldestRecentMood
        ? oldestRecentMood.mood_rating - latestMoodCheckIn.mood_rating >= 3
        : false
      const reasons = [
        clientCompletionRate !== null && clientCompletionRate < 25 ? "Completion under 25%" : null,
        inactiveDays !== null && inactiveDays >= 14 ? `No activity in ${inactiveDays} days` : null,
        pending > 0 ? `${pending} pending assignment${pending === 1 ? "" : "s"}` : null,
        averageMood !== null && averageMood < 4 ? "Average mood under 4" : null,
        clientMoodCheckIns.some((checkIn) => (checkIn.anxiety_rating || 0) > 8) ? "Anxiety over 8" : null,
        daysSinceMoodCheckIn !== null && daysSinceMoodCheckIn >= 14 ? `No mood check-in in ${daysSinceMoodCheckIn} days` : null,
        daysSinceMoodCheckIn === null && daysSinceClientCreated >= 14 ? "No mood check-in" : null,
        moodDropped ? "Mood dropped 3+ points" : null,
      ].filter(Boolean) as string[]

      return {
        client,
        completionRate: clientCompletionRate,
        reasons,
      }
    })
    .filter((item) => item.reasons.length > 0)
    .slice(0, 5)

  const couplesNeedingAttention = couples
    .map((couple) => {
      const checkInsForCouple = coupleCheckIns.filter((checkIn) => checkIn.couple_id === couple.id)
      const latestWeek = checkInsForCouple[0]?.check_in_week || null
      const latestPartnerOne = latestWeek
        ? checkInsForCouple.find((checkIn) => checkIn.check_in_week === latestWeek && checkIn.client_id === couple.partner_1_client_id)
        : null
      const latestPartnerTwo = latestWeek
        ? checkInsForCouple.find((checkIn) => checkIn.check_in_week === latestWeek && checkIn.client_id === couple.partner_2_client_id)
        : null
      const scores = [latestPartnerOne, latestPartnerTwo].filter(Boolean) as CoupleCheckIn[]
      const satisfactionScores = scores.map((score) => score.relationship_satisfaction)
      const trustScores = scores.map((score) => score.trust)
      const discrepancies = latestPartnerOne && latestPartnerTwo
        ? [
            Math.abs(latestPartnerOne.relationship_satisfaction - latestPartnerTwo.relationship_satisfaction),
            Math.abs(latestPartnerOne.trust - latestPartnerTwo.trust),
            Math.abs(latestPartnerOne.communication - latestPartnerTwo.communication),
            Math.abs(latestPartnerOne.intimacy - latestPartnerTwo.intimacy),
          ]
        : []
      const largestDiscrepancy = Math.max(0, ...discrepancies)
      const reasons = [
        satisfactionScores.some((score) => score < 5) ? "Satisfaction below 5" : null,
        trustScores.some((score) => score < 5) ? "Trust below 5" : null,
        largestDiscrepancy >= 3 ? `Partner discrepancy ${largestDiscrepancy}` : null,
      ].filter(Boolean) as string[]

      return { couple, reasons }
    })
    .filter((item) => item.reasons.length > 0)
    .slice(0, 5)

  const homeworkWaitingForReview = [
    ...recentlyCompletedWorksheets.map((assignment) => ({
      id: assignment.id,
      clientId: assignment.client_id,
      clientName: clients.find(c => c.id === assignment.client_id)?.full_name || "Client unavailable",
      title: assignment.worksheet_templates?.title || "Worksheet",
      type: "Online worksheet",
      date: assignment.completed_at,
    })),
    ...latestReflections.map((assignment) => ({
      id: assignment.id,
      clientId: assignment.client_id,
      clientName: clients.find(c => c.id === assignment.client_id)?.full_name || "Client unavailable",
      title: assignment.title,
      type: "Homework reflection",
      date: assignment.completed_at,
    })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 5)

  const clientWorkspaceSummaries: ClientWorkspaceSummary[] = clients
    .map((client) => {
      const clientAssignments = assignments.filter(a => a.client_id === client.id)
      const clientWorksheetAssignments = worksheetAssignments.filter(a => a.client_id === client.id)
      const clientReflectionsForClient = clientReflections.filter((reflection) => reflection.client_id === client.id)
      const clientMoodCheckIns = moodCheckIns.filter((checkIn) => checkIn.client_id === client.id)
      const latestMoodCheckIn = clientMoodCheckIns[0] || null
      const clientTotal = clientAssignments.length + clientWorksheetAssignments.length
      const clientCompleted = clientAssignments.filter(a => a.completed || a.status === "completed").length
        + clientWorksheetAssignments.filter(a => a.status === "completed").length
      const pendingHomework = clientTotal - clientCompleted
      const completedHomework = clientCompleted
      const latestActivityAt = getLatestActivityAt(client, clientAssignments, clientWorksheetAssignments)
      const attention = clientsNeedingAttention.find((item) => item.client.id === client.id)

      return {
        client,
        homeworkStatus: pendingHomework > 0
          ? `${pendingHomework} assigned`
          : completedHomework > 0
            ? "Ready to review"
            : "No homework assigned",
        reflectionStatus: clientReflectionsForClient.length > 0
          ? `${clientReflectionsForClient.length} submitted`
          : "No reflections yet",
        moodStatus: latestMoodCheckIn
          ? `Mood ${latestMoodCheckIn.mood_rating}/10`
          : "No mood check-in",
        lastActivity: formatShortDate(latestActivityAt),
        lastActivityAt: latestActivityAt,
        attentionReasons: attention?.reasons || [],
        completionRate: attention?.completionRate ?? (clientTotal > 0 ? Math.round((clientCompleted / clientTotal) * 100) : null),
      }
    })
    .sort((a, b) => {
      const aAttention = a.attentionReasons.length > 0 ? 1 : 0
      const bAttention = b.attentionReasons.length > 0 ? 1 : 0
      if (aAttention !== bAttention) return bAttention - aAttention
      return new Date(b.lastActivityAt || b.client.created_at).getTime() - new Date(a.lastActivityAt || a.client.created_at).getTime()
    })

  const sessionPrepQueue = clientWorkspaceSummaries
    .filter((item) => item.attentionReasons.length > 0 || item.reflectionStatus !== "No reflections yet" || item.homeworkStatus === "Ready to review")
    .slice(0, 4)

  const attentionItems = [
    ...clientWorkspaceSummaries
      .filter((item) => item.attentionReasons.length > 0)
      .map((item) => ({
        id: item.client.id,
        title: item.client.full_name,
        detail: item.attentionReasons.slice(0, 2).join(" · "),
        href: `/dashboard/clients/${item.client.id}/session-prep`,
      })),
    ...couplesNeedingAttention.map((item) => ({
      id: item.couple.id,
      title: item.couple.relationship_name,
      detail: item.reasons.slice(0, 2).join(" · "),
      href: "/dashboard/couples",
    })),
  ].slice(0, 3)

  const moodAlertClientIds = new Set<string>()
  moodCheckIns.forEach((checkIn) => {
    if (moodAlertClientIds.has(checkIn.client_id)) return
    if (checkIn.mood_rating < 4 || (checkIn.anxiety_rating || 0) > 8) {
      moodAlertClientIds.add(checkIn.client_id)
    }
  })
  const moodAlertCount = moodAlertClientIds.size
  const estimatedReviewTime = Math.max(
    5,
    (sessionPrepQueue.length * 3)
    + (homeworkWaitingCount * 2)
    + (moodAlertCount * 3)
    + (attentionItems.length * 2),
  )
  const reflectionCount = clientReflections.length + latestReflections.length

  const nextBestAction = homeworkWaitingForReview.length > 0
    ? "Review completed homework"
    : sessionPrepQueue.length > 0
      ? "Open session prep"
      : clients.length === 0
        ? "Invite your first client"
        : "Assign homework"
  const topPriorities = [
    ...attentionItems.map((item) => item.detail ? `${item.title}: ${item.detail}` : item.title),
    homeworkWaitingCount > 0 ? `${homeworkWaitingCount} homework item${homeworkWaitingCount === 1 ? "" : "s"} waiting for review` : null,
    moodAlertCount > 0 ? `${moodAlertCount} mood alert${moodAlertCount === 1 ? "" : "s"} to review` : null,
    sessionPrepQueue.length > 0 ? `${sessionPrepQueue.length} client${sessionPrepQueue.length === 1 ? "" : "s"} ready for session prep` : null,
  ].filter(Boolean).slice(0, 3) as string[]

  return (
    <div className="space-y-8">
      <div>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight text-slate-950"
          >
            {getGreeting()}, {displayName}
          </motion.h1>
          <p className="mt-1 text-sm text-slate-500">What should I work on first today?</p>
        </div>
      </div>

      <Card className="overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Needs Attention
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/inbox">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {attentionItems.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No clients need attention today." description="Inactivity, mood alerts, and review-ready work will appear here." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {attentionItems.map((item) => (
                <AttentionRow key={item.id} clientName={item.title} detail={item.detail} href={item.href} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-[#0F172A] text-white">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-[#18B7A0]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">AI Daily Brief</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">{nextBestAction}</h2>
                <p className="mt-2 text-sm text-white/60">Estimated review time: {estimatedReviewTime} min</p>
              </div>
              <Button className="bg-white text-slate-950 hover:bg-white/90" asChild>
                <Link href="/dashboard/daily-workflow">
                  Start My Day
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <BriefCount label="Homework waiting" value={homeworkWaitingCount} />
              <BriefCount label="Reflections" value={reflectionCount} />
              <BriefCount label="Mood alerts" value={moodAlertCount} />
            </div>
            <div className="mt-5 space-y-2">
              {(topPriorities.length > 0 ? topPriorities : ["No priority items found in current client activity."]).map((priority, index) => (
                <div key={priority} className="flex gap-3 rounded-2xl bg-white/10 px-3 py-2 text-sm leading-5 text-white/80">
                  <span className="font-bold text-[#18B7A0]">{index + 1}</span>
                  <span>{priority}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
              <CalendarClock className="h-5 w-5 text-primary" />
              Today&apos;s Session Prep
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/calendar">
                Calendar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : sessionPrepQueue.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No next sessions queued." description="Calendar-backed sessions and full schedule details live on the Calendar page." />
            ) : (
              <div className="divide-y divide-slate-200/80">
                {sessionPrepQueue.slice(0, 3).map((item) => (
                  <CompactPrepRow key={item.client.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  )
}

function BriefCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p>
    </div>
  )
}

function CompactPrepRow({ item }: { item: ClientWorkspaceSummary }) {
  return (
    <div className="grid gap-3 py-3 first:pt-0 last:pb-0 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <ClientAvatar name={item.client.full_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">{item.client.full_name}</p>
          <p className="mt-1 text-xs text-slate-500">Time not scheduled · Last activity: {item.lastActivity}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusPill label={item.homeworkStatus} />
            <StatusPill label={item.reflectionStatus} />
            <StatusPill label={item.moodStatus} />
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" className="shrink-0 bg-white/80" asChild>
        <Link href={`/dashboard/clients/${item.client.id}/session-prep`}>
          Open Session Prep
        </Link>
      </Button>
    </div>
  )
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
      {label}
    </span>
  )
}

function ClientAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
      <span className="text-sm font-bold text-primary">
        {name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
      </span>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function AttentionRow({
  clientName,
  detail,
  href,
}: {
  clientName: string
  detail: string
  href: string
}) {
  return (
    <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{clientName}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-amber-700">{detail}</p>
        </div>
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
      </div>
      <Button variant="outline" size="sm" className="mt-4 w-full bg-white/80" asChild>
        <Link href={href}>Open</Link>
      </Button>
    </div>
  )
}
