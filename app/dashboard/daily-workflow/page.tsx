"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Inbox,
  Loader2,
  MessageSquare,
  PartyPopper,
  Sparkles,
  UserRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AssignHomeworkModal } from "@/components/dashboard/assign-homework-modal"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"

interface ClientRecord {
  id: string
  full_name: string
  email: string | null
  created_at: string
}

interface AssignmentRecord {
  id: string
  client_id: string
  title: string
  completed: boolean | null
  status: string | null
  reflection: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
}

interface WorksheetAssignmentRecord {
  id: string
  client_id: string
  status: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  worksheet_templates: {
    title: string | null
  } | null
}

interface ReflectionRecord {
  id: string
  client_id: string
  title: string | null
  reflection_text: string
  mood_rating: number | null
  created_at: string
}

interface MoodCheckInRecord {
  id: string
  client_id: string
  mood_rating: number
  anxiety_rating: number | null
  stress_rating: number | null
  note: string | null
  created_at: string
}

type WorkflowStepId = "client" | "homework" | "reflection" | "mood" | "prep" | "assign" | "complete"

interface ClientWorkflowItem {
  client: ClientRecord
  homeworkReady: number
  reflectionCount: number
  moodCount: number
  moodAlert: boolean
  latestActivityAt: string | null
  priorityScore: number
}

const clientSteps: Array<{
  id: WorkflowStepId
  title: string
  description: string
  icon: typeof UserRound
}> = [
  {
    id: "client",
    title: "Client",
    description: "Orient to this client before reviewing between-session work.",
    icon: UserRound,
  },
  {
    id: "homework",
    title: "Review Homework",
    description: "Open the existing review surfaces for completed homework and worksheet responses.",
    icon: ClipboardCheck,
  },
  {
    id: "reflection",
    title: "Review Reflection",
    description: "Review submitted reflections in the existing Reflections workspace.",
    icon: MessageSquare,
  },
  {
    id: "mood",
    title: "Review Mood",
    description: "Check recent mood data and any alerts in the existing prep context.",
    icon: BarChart3,
  },
  {
    id: "prep",
    title: "AI Session Prep",
    description: "Open the client Session Prep page and use the existing AI prep summary.",
    icon: Sparkles,
  },
  {
    id: "assign",
    title: "Assign Homework",
    description: "Use the existing assignment flow to send the next between-session task.",
    icon: BookOpenCheck,
  },
  {
    id: "complete",
    title: "Mark Session Complete",
    description: "Mark this workflow pass complete locally, then move to the next client.",
    icon: CheckCircle2,
  },
]

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function storageKey() {
  return `shrinkaId:daily-workflow:${todayKey()}`
}

function formatShortDate(date: string | null) {
  if (!date) return "No activity yet"

  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 14) return `${days} days ago`

  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function getLatestDate(dates: Array<string | null | undefined>) {
  const validDates = dates.filter(Boolean) as string[]
  return validDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
}

export default function DailyWorkflowPage() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignmentRecord[]>([])
  const [reflections, setReflections] = useState<ReflectionRecord[]>([])
  const [moodCheckIns, setMoodCheckIns] = useState<MoodCheckInRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [briefComplete, setBriefComplete] = useState(false)
  const [currentClientIndex, setCurrentClientIndex] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedClientIds, setCompletedClientIds] = useState<string[]>([])
  const [completedStepKeys, setCompletedStepKeys] = useState<string[]>([])
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  const loadDailyWorkflow = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getClient() as any
      const { therapistId, userEmail } = await getTherapistId()

      console.log("[v0] Daily Workflow: auth email:", userEmail)
      console.log("[v0] Daily Workflow: therapist id found:", therapistId ?? "none")

      if (!therapistId) {
        setError("No therapist account found for your email.")
        return
      }

      const [clientsResult, assignmentsResult, worksheetResult, reflectionsResult, moodResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id, full_name, email, created_at")
          .eq("therapist_id", therapistId)
          .order("created_at", { ascending: false }),
        supabase
          .from("assignments")
          .select("id, client_id, title, completed, status, reflection, assigned_at, started_at, completed_at, created_at")
          .eq("therapist_id", therapistId),
        supabase
          .from("worksheet_assignments")
          .select(`
            id,
            client_id,
            status,
            assigned_at,
            started_at,
            completed_at,
            worksheet_templates (
              title
            )
          `)
          .eq("therapist_id", therapistId),
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

      setClients(clientsResult.data || [])
      setAssignments(assignmentsResult.data || [])
      setWorksheetAssignments(worksheetResult.data || [])
      setReflections(reflectionsResult.data || [])
      setMoodCheckIns(moodResult.data || [])
    } catch (err) {
      console.error("[v0] Daily Workflow: failed to load", err)
      setError(err instanceof Error ? err.message : "Failed to load daily workflow.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDailyWorkflow()
  }, [loadDailyWorkflow])

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey())
    if (!saved) return

    try {
      const parsed = JSON.parse(saved) as {
        briefComplete?: boolean
        currentClientIndex?: number
        currentStepIndex?: number
        completedClientIds?: string[]
        completedStepKeys?: string[]
      }
      setBriefComplete(Boolean(parsed.briefComplete))
      setCurrentClientIndex(parsed.currentClientIndex || 0)
      setCurrentStepIndex(parsed.currentStepIndex || 0)
      setCompletedClientIds(parsed.completedClientIds || [])
      setCompletedStepKeys(parsed.completedStepKeys || [])
    } catch {
      window.sessionStorage.removeItem(storageKey())
    }
  }, [])

  useEffect(() => {
    window.sessionStorage.setItem(storageKey(), JSON.stringify({
      briefComplete,
      currentClientIndex,
      currentStepIndex,
      completedClientIds,
      completedStepKeys,
    }))
  }, [briefComplete, completedClientIds, completedStepKeys, currentClientIndex, currentStepIndex])

  const workflowQueue = useMemo<ClientWorkflowItem[]>(() => {
    return clients
      .map((client) => {
        const clientAssignments = assignments.filter((assignment) => assignment.client_id === client.id)
        const clientWorksheets = worksheetAssignments.filter((assignment) => assignment.client_id === client.id)
        const clientReflections = reflections.filter((reflection) => reflection.client_id === client.id)
        const clientMoodCheckIns = moodCheckIns.filter((checkIn) => checkIn.client_id === client.id)
        const homeworkReady = clientAssignments.filter((assignment) => (
          assignment.completed || assignment.status === "completed" || Boolean(assignment.reflection)
        )).length + clientWorksheets.filter((assignment) => (
          assignment.status === "completed" || Boolean(assignment.completed_at)
        )).length
        const moodAlert = clientMoodCheckIns.some((checkIn) => (
          checkIn.mood_rating < 4 || (checkIn.anxiety_rating || 0) > 8 || (checkIn.stress_rating || 0) > 8
        ))
        const latestActivityAt = getLatestDate([
          client.created_at,
          ...clientAssignments.flatMap((assignment) => [
            assignment.completed_at,
            assignment.started_at,
            assignment.assigned_at,
            assignment.created_at,
          ]),
          ...clientWorksheets.flatMap((assignment) => [
            assignment.completed_at,
            assignment.started_at,
            assignment.assigned_at,
          ]),
          ...clientReflections.map((reflection) => reflection.created_at),
          ...clientMoodCheckIns.map((checkIn) => checkIn.created_at),
        ])

        return {
          client,
          homeworkReady,
          reflectionCount: clientReflections.length,
          moodCount: clientMoodCheckIns.length,
          moodAlert,
          latestActivityAt,
          priorityScore: (homeworkReady * 4) + (clientReflections.length * 3) + (moodAlert ? 6 : 0) + (clientMoodCheckIns.length > 0 ? 1 : 0),
        }
      })
      .filter((item) => item.priorityScore > 0)
      .sort((a, b) => {
        if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore
        return new Date(b.latestActivityAt || b.client.created_at).getTime() - new Date(a.latestActivityAt || a.client.created_at).getTime()
      })
  }, [assignments, clients, moodCheckIns, reflections, worksheetAssignments])

  const currentClient = workflowQueue[currentClientIndex] || null
  const currentStep = clientSteps[currentStepIndex]
  const queuedClientIds = new Set(workflowQueue.map((item) => item.client.id))
  const completedCount = completedClientIds.filter((id) => queuedClientIds.has(id)).length
  const queueCount = workflowQueue.length
  const isDone = !isLoading && queueCount > 0 && completedCount >= queueCount
  const totalWorkflowUnits = 1 + (queueCount * clientSteps.length)
  const completedWorkflowUnits = (briefComplete ? 1 : 0) + completedCount * clientSteps.length + (briefComplete && currentClient ? currentStepIndex : 0)
  const progress = totalWorkflowUnits > 0 ? Math.min(100, Math.round((completedWorkflowUnits / totalWorkflowUnits) * 100)) : 100
  const homeworkWaiting = workflowQueue.reduce((sum, item) => sum + item.homeworkReady, 0)
  const reflectionsWaiting = workflowQueue.reduce((sum, item) => sum + item.reflectionCount, 0)
  const moodAlerts = workflowQueue.filter((item) => item.moodAlert).length
  const estimatedMinutes = Math.max(5, homeworkWaiting * 2 + reflectionsWaiting * 2 + moodAlerts * 3 + queueCount * 4)

  const stepKey = currentClient ? `${currentClient.client.id}:${currentStep.id}` : ""
  const isCurrentStepComplete = completedStepKeys.includes(stepKey)

  const markStepReviewed = () => {
    if (!currentClient) return

    setCompletedStepKeys((current) => current.includes(stepKey) ? current : [...current, stepKey])
    if (currentStepIndex < clientSteps.length - 1) {
      setCurrentStepIndex((current) => current + 1)
      return
    }

    setCompletedClientIds((current) => current.includes(currentClient.client.id) ? current : [...current, currentClient.client.id])
    setCurrentStepIndex(0)
    setCurrentClientIndex((current) => current + 1)
  }

  const handleAssignmentCreated = async () => {
    await loadDailyWorkflow()
    markStepReviewed()
  }

  const resetToday = () => {
    window.sessionStorage.removeItem(storageKey())
    setBriefComplete(false)
    setCurrentClientIndex(0)
    setCurrentStepIndex(0)
    setCompletedClientIds([])
    setCompletedStepKeys([])
  }

  const getLaunchHref = (stepId: WorkflowStepId) => {
    if (!currentClient) return "/dashboard"
    if (stepId === "client") return `/dashboard/clients#client-${currentClient.client.id}`
    if (stepId === "reflection") return "/dashboard/reflections"
    if (stepId === "homework") return `/dashboard/clients/${currentClient.client.id}/session-prep`
    if (stepId === "mood") return `/dashboard/clients/${currentClient.client.id}/session-prep`
    if (stepId === "prep") return `/dashboard/clients/${currentClient.client.id}/session-prep#ai-summary`
    return "/dashboard/clients"
  }

  const getPrimaryAction = () => {
    if (!currentStep) return null
    if (currentStep.id === "assign") {
      return (
        <Button onClick={() => setIsAssignModalOpen(true)}>
          Assign Homework
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )
    }
    if (currentStep.id === "complete") {
      return (
        <Button onClick={markStepReviewed}>
          Mark Session Complete
          <CheckCircle2 className="ml-2 h-4 w-4" />
        </Button>
      )
    }

    return (
      <Button asChild>
        <Link href={getLaunchHref(currentStep.id)}>
          Open Existing Page
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">
            Guided Daily Workflow
          </Badge>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight text-slate-950"
          >
            Start My Day
          </motion.h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            One morning workflow that connects the existing Daily Brief, Inbox, Reflections, Session Prep, and Homework assignment flows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={resetToday}>Reset today</Button>
          <Button asChild>
            <Link href="/dashboard">
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/15 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.06)]">
        <CardContent className="p-6">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Today&apos;s progress</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{progress}%</p>
              <Progress value={progress} className="mt-3 bg-slate-200" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <BriefTile label="Clients queued" value={queueCount} />
              <BriefTile label="Homework" value={homeworkWaiting} />
              <BriefTile label="Reflections" value={reflectionsWaiting} />
              <BriefTile label="Mood alerts" value={moodAlerts} />
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-slate-950">{estimatedMinutes}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">est. minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!isLoading && !error && !briefComplete && (
        <Card className="overflow-hidden bg-[#0F172A] text-white">
          <CardContent className="p-6">
            <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-[#18B7A0]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">AI Daily Brief</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">Begin with the brief</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                  Start with the existing morning review context, then this workflow will walk client by client through homework, reflections, mood, AI prep, and assignment.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Button className="bg-white text-slate-950 hover:bg-white/90" asChild>
                  <Link href="/dashboard/inbox">
                    Open Daily Brief
                    <Inbox className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => setBriefComplete(true)}>
                  Start Client Queue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && isDone && (
        <Card className="overflow-hidden border-emerald-200 bg-emerald-50">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-white">
              <PartyPopper className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">You&apos;re done for today.</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-800">
              The guided queue is clear. New homework, reflections, mood check-ins, and session-prep items will still live in the existing Inbox and client pages.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && briefComplete && currentClient && !isDone && (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-primary" />
                Today&apos;s Client Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflowQueue.map((item, index) => {
                const isActive = item.client.id === currentClient.client.id
                const complete = completedClientIds.includes(item.client.id)
                return (
                  <button
                    key={item.client.id}
                    type="button"
                    onClick={() => {
                      setCurrentClientIndex(index)
                      setCurrentStepIndex(0)
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : complete
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.client.full_name}</p>
                        <p className="mt-1 text-xs text-slate-500">Last activity: {formatShortDate(item.latestActivityAt)}</p>
                      </div>
                      {complete ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <MiniBadge label={`${item.homeworkReady} homework`} />
                      <MiniBadge label={`${item.reflectionCount} reflections`} />
                      <MiniBadge label={item.moodAlert ? "Mood alert" : `${item.moodCount} mood`} />
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden border-primary/15">
              <CardContent className="p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Client {currentClientIndex + 1} of {queueCount}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                      {currentClient.client.full_name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Work through each step, using the existing pages for review and assignment.
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/clients/${currentClient.client.id}/session-prep`}>
                      Open Session Prep
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-5 grid gap-2 sm:grid-cols-7">
                  {clientSteps.map((step, index) => {
                    const Icon = step.icon
                    const active = index === currentStepIndex
                    const complete = completedStepKeys.includes(`${currentClient.client.id}:${step.id}`)
                    return (
                      <div
                        key={step.id}
                        className={`rounded-2xl border p-3 text-center ${
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : complete
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <Icon className="mx-auto h-4 w-4" />
                        <p className="mt-1 hidden text-[11px] font-semibold lg:block">{step.title}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                        <currentStep.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Current step</p>
                        <h3 className="mt-1 text-xl font-bold text-slate-950">{currentStep.title}</h3>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{currentStep.description}</p>
                        {isCurrentStepComplete && (
                          <p className="mt-2 text-sm font-semibold text-emerald-700">Step reviewed.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      {getPrimaryAction()}
                      {currentStep.id !== "assign" && currentStep.id !== "complete" && (
                        <Button variant="outline" onClick={markStepReviewed}>
                          Mark Reviewed
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!isLoading && !error && briefComplete && queueCount === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-950">No client work queued today</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Homework, reflections, mood alerts, and session-prep activity will appear here when existing client data needs review.
            </p>
          </CardContent>
        </Card>
      )}

      <AssignHomeworkModal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        onAssignmentCreated={handleAssignmentCreated}
        preselectedClientId={currentClient?.client.id}
      />
    </div>
  )
}

function BriefTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    </div>
  )
}

function MiniBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
      {label}
    </span>
  )
}
