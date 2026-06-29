"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Plus,
  ArrowRight,
  Loader2,
  FileText,
  MessageSquare,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { getClient } from "@/lib/supabase/client"
import { AddClientModal } from "@/components/dashboard/add-client-modal"
import { AssignHomeworkModal } from "@/components/dashboard/assign-homework-modal"
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

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

  const handleClientAdded = () => {
    getTherapistId().then(({ therapistId }) => {
      if (therapistId) fetchData(therapistId)
    })
  }

  const handleAssignmentCreated = () => {
    getTherapistId().then(({ therapistId }) => {
      if (therapistId) fetchData(therapistId)
    })
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Get user display name
  const displayName = user?.user_metadata?.first_name 
    ? `${user.user_metadata.first_name}`
    : user?.email?.split('@')[0] || 'there'

  // Calculate stats from real data (including worksheet assignments)
  const totalAssignments = assignments.length + worksheetAssignments.length
  const completedAssignments = assignments.filter(a => a.completed || a.status === "completed").length + worksheetAssignments.filter(a => a.status === "completed").length
  const pendingAssignments = totalAssignments - completedAssignments
  const completionRate = totalAssignments > 0 
    ? Math.round((completedAssignments / totalAssignments) * 100) 
    : null

  // Count assignments due soon (within 7 days) - only regular assignments have due dates currently
  const assignmentsDueSoon = assignments.filter(a => {
    if (!a.due_date || a.completed) return false
    const dueDate = new Date(a.due_date)
    const now = new Date()
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7
  }).length

  // Count overdue assignments
  const overdueAssignments = assignments.filter(a => {
    if (!a.due_date || a.completed) return false
    return new Date(a.due_date) < new Date()
  }).length

  // Count in-progress worksheets
  const startedAssignments = assignments.filter(a => !a.completed && (a.status === "started" || a.started_at)).length
  const inProgressWorksheets = worksheetAssignments.filter(a => a.status === "in_progress" || a.started_at).length

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

  const stats = [
    { label: "Total Assignments", value: totalAssignments.toString(), icon: FileText, change: pendingAssignments > 0 ? `${pendingAssignments} not completed` : "All caught up" },
    { label: "Completed Assignments", value: completedAssignments.toString(), icon: CheckCircle2, change: totalAssignments > 0 ? `${completedAssignments}/${totalAssignments} completed` : "No assignments yet" },
    { label: "Completion Rate", value: completionRate !== null ? `${completionRate}%` : "--", icon: TrendingUp, change: totalAssignments > 0 ? "Across all homework" : "No assignments yet" },
    { label: "Started", value: (startedAssignments + inProgressWorksheets).toString(), icon: Clock, change: overdueAssignments > 0 ? `${overdueAssignments} overdue` : `${assignmentsDueSoon} due this week` },
  ]

  // Calculate days since created
  const getDaysSinceCreated = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="saas-page-header flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="saas-eyebrow mb-2">Therapist workspace</p>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight text-slate-950"
          >
            {getGreeting()}, {displayName}
          </motion.h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">{"Here's what's happening with your clients today"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsAssignModalOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Assign Homework
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Invite Client
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="group overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{stat.value}</p>
                    <p className="mt-2 text-xs text-slate-500">{stat.change}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-white">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Client Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg tracking-tight">Recent Clients</CardTitle>
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link href="/dashboard/clients">
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">No clients yet</p>
                  <Button 
                    size="sm" 
                    className="rounded-xl"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Client
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clients.slice(0, 5).map((client) => {
                    const clientAssignments = assignments.filter(a => a.client_id === client.id)
                    const clientWorksheetAssignments = worksheetAssignments.filter(a => a.client_id === client.id)
                    const clientTotal = clientAssignments.length + clientWorksheetAssignments.length
                    const clientCompleted = clientAssignments.filter(a => a.completed || a.status === "completed").length + clientWorksheetAssignments.filter(a => a.status === "completed").length
                    const clientStarted = clientAssignments.filter(a => !a.completed && (a.status === "started" || a.started_at)).length + clientWorksheetAssignments.filter(a => a.status === "in_progress" || a.started_at).length
                    const clientCompletionRate = clientTotal > 0 ? Math.round((clientCompleted / clientTotal) * 100) : null
                    const latestCompletedAt = [
                      ...clientAssignments.map(a => a.completed_at).filter(Boolean),
                      ...clientWorksheetAssignments.map(a => a.completed_at).filter(Boolean),
                    ].sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]
                    return (
                      <div
                        key={client.id}
                        className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 transition-colors hover:bg-white"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
                          <span className="text-sm font-bold text-primary">
                            {client.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{client.full_name}</p>
                            {clientStarted > 0 && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                                {clientStarted} started
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {client.email || "No email provided"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {clientCompletionRate !== null ? `${clientCompletionRate}% complete` : "No assignments"}
                          </p>
                          {latestCompletedAt && (
                            <p className="text-xs text-muted-foreground">
                              Completed {new Date(latestCompletedAt).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">Added {getDaysSinceCreated(client.created_at)}</p>
                          <Button variant="outline" size="sm" className="mt-2 rounded-lg text-xs" asChild>
                            <Link href={`/dashboard/clients/${client.id}/session-prep`}>
                              Session Prep
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestReflections.length === 0 && recentlyCompletedWorksheets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Activity will appear when clients complete assignments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Recently completed worksheets */}
                  {recentlyCompletedWorksheets.map((assignment) => {
                    const client = clients.find(c => c.id === assignment.client_id)
                    return (
                      <div
                        key={assignment.id}
                        className="rounded-2xl border border-primary/15 bg-primary/5 p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{client?.full_name || "Unknown"}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Worksheet</span>
                        </div>
                        <p className="text-sm text-foreground mb-1">Completed: {assignment.worksheet_templates?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                    )
                  })}

                  {/* Latest reflections */}
                  {latestReflections.map((assignment) => {
                    const client = clients.find(c => c.id === assignment.client_id)
                    return (
                      <div
                        key={assignment.id}
                        className="p-4 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {client?.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{client?.full_name || "Unknown"}</span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-3 mb-2">{assignment.reflection}</p>
                        <p className="text-xs text-muted-foreground">
                          on &quot;{assignment.title}&quot; · {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Clients Needing Attention
            </CardTitle>
            <Button variant="ghost" size="sm" className="rounded-xl" asChild>
              <Link href="/dashboard/clients">
                View clients
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {clientsNeedingAttention.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No clients need attention right now.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {clientsNeedingAttention.map((item) => (
                  <div key={item.client.id} className="p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.client.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.client.email || "No email provided"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {item.completionRate !== null ? `${item.completionRate}%` : "--"}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.reasons.map((reason) => (
                        <span key={reason} className="text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700">
                          {reason}
                        </span>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 rounded-lg text-xs" asChild>
                      <Link href={`/dashboard/clients/${item.client.id}/session-prep`}>
                        Session Prep
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Recent Client Reflections
            </CardTitle>
            <Button variant="ghost" size="sm" className="rounded-xl" asChild>
              <Link href="/dashboard/reflections">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {clientReflections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No client reflections yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {clientReflections.map((reflection) => {
                  const client = clients.find(c => c.id === reflection.client_id)
                  return (
                    <div key={reflection.id} className="p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{reflection.title || "Untitled reflection"}</p>
                          <p className="text-xs text-muted-foreground truncate">{client?.full_name || "Unknown client"}</p>
                        </div>
                        {reflection.mood_rating && (
                          <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary shrink-0">
                            {reflection.mood_rating}/10
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground line-clamp-3 mt-3">{reflection.reflection_text}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(reflection.created_at).toLocaleDateString()}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Couples Needing Attention
            </CardTitle>
            <Button variant="ghost" size="sm" className="rounded-xl" asChild>
              <Link href="/dashboard/couples">
                View couples
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {couplesNeedingAttention.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No couples need attention right now.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {couplesNeedingAttention.map((item) => (
                  <div key={item.couple.id} className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-sm font-medium text-foreground">{item.couple.relationship_name}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.reasons.map((reason) => (
                        <span key={reason} className="text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700">
                          {reason}
                        </span>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 rounded-lg text-xs" asChild>
                      <Link href="/dashboard/couples">
                        Open Couples
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Invite Client Modal */}
      <AddClientModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onClientAdded={handleClientAdded}
      />

      {/* Assign Homework Modal */}
      <AssignHomeworkModal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        onAssignmentCreated={handleAssignmentCreated}
      />
    </div>
  )
}
