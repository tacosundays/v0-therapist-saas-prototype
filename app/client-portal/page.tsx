"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Calendar,
  ChevronRight,
  Heart,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  AlertTriangle,
  PenLine
} from "lucide-react"
import { getClient } from "@/lib/supabase/client"
import Link from "next/link"
import { WorksheetForm } from "@/components/client-portal/worksheet-form"
import { checkUserRole } from "@/lib/auth/check-user-role"
import { logClientAuditEvent } from "@/lib/audit-client"
import { demoAssignments, demoClients, demoMoodCheckIns, demoWorksheetAssignments, isDemoModeEnabled } from "@/lib/demo-mode"

interface Assignment {
  id: string
  therapist_id: string
  client_id: string
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  status: string | null
  reflection: string | null
  completed_at: string | null
  created_at: string
  assigned_at: string | null
  started_at: string | null
}

interface WorksheetAssignment {
  id: string
  therapist_id: string
  client_id: string
  worksheet_template_id: string
  status: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  assigned_at: string | null
  started_at: string | null
  worksheet_templates: {
    title: string
    description: string | null
  }
}

interface ClientRecord {
  id: string
  therapist_id: string
  full_name: string
  email: string | null
}

interface CoupleRecord {
  id: string
  therapist_id: string
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
  conflict_level: number
  reflection: string | null
}

interface MoodCheckIn {
  id: string
  mood_rating: number
  anxiety_rating: number | null
  stress_rating: number | null
  note: string | null
  created_at: string
}

type PortalTask = {
  id: string
  type: "worksheet" | "assignment"
  title: string
  description: string | null
  dueDate: string | null
  status: string
  sortDate: string
  isOverdue: boolean
  actionLabel: string
  worksheet?: WorksheetAssignment
  assignment?: Assignment
}

function ClientPortalContent() {
  const searchParams = useSearchParams()
  
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [selectedWorksheetAssignment, setSelectedWorksheetAssignment] = useState<string | null>(null)
  const [reflection, setReflection] = useState("")
  const [clientRecord, setClientRecord] = useState<ClientRecord | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignment[]>([])
  const [couples, setCouples] = useState<CoupleRecord[]>([])
  const [coupleCheckIns, setCoupleCheckIns] = useState<CoupleCheckIn[]>([])
  const [moodCheckIns, setMoodCheckIns] = useState<MoodCheckIn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [checkInSubmittingId, setCheckInSubmittingId] = useState<string | null>(null)
  const [checkInSuccessId, setCheckInSuccessId] = useState<string | null>(null)
  const [moodRating, setMoodRating] = useState(5)
  const [anxietyRating, setAnxietyRating] = useState<number | null>(null)
  const [stressRating, setStressRating] = useState<number | null>(null)
  const [moodNote, setMoodNote] = useState("")
  const [isMoodSaving, setIsMoodSaving] = useState(false)
  const [moodSuccess, setMoodSuccess] = useState(false)
  const [completedWorksheetTitle, setCompletedWorksheetTitle] = useState<string | null>(null)
  const [checkInForms, setCheckInForms] = useState<Record<string, {
    relationship_satisfaction: number
    trust: number
    communication: number
    intimacy: number
    conflict_level: number
    reflection: string
  }>>({})

  useEffect(() => {
    const fetchData = async () => {
      if (isDemoModeEnabled()) {
        const client = demoClients[0]
        setClientRecord({ id: client.id, therapist_id: client.therapist_id, full_name: client.full_name, email: client.email })
        setAssignments(demoAssignments.filter((item) => item.client_id === client.id).map((item) => ({ ...item, description: "A practice activity selected by your therapist.", due_date: item.due_date, completed_at: item.completed_at })))
        setWorksheetAssignments(demoWorksheetAssignments.filter((item) => item.client_id === client.id).map((item) => ({ ...item, due_date: null, worksheet_templates: { ...item.worksheet_templates, description: "Complete this guided worksheet and share it with your therapist." } })))
        setMoodCheckIns(demoMoodCheckIns.filter((item) => item.client_id === client.id))
        setIsLoading(false)
        return
      }
      const supabase = getClient()
      
      // Use the auth utility to get the client record
      const roleResult = await checkUserRole()
      
      if (!roleResult.isAuthenticated) {
        // Layout should handle redirect
        setError("Please log in to access your portal.")
        setIsLoading(false)
        return
      }
      
      if (roleResult.role !== "client" || !roleResult.clientRecord) {
        // Layout should handle redirect for therapists
        setError("Unable to find your client record.")
        setIsLoading(false)
        return
      }

      const client = roleResult.clientRecord
      setClientRecord(client)

      // Fetch assignments for this client
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })

      if (assignmentsError) {
        console.error("[v0] Error fetching assignments:", assignmentsError)
      }

      setAssignments(assignmentsData || [])

      // Fetch worksheet assignments (interactive forms)
      const { data: worksheetAssignmentsData, error: worksheetError } = await supabase
        .from("worksheet_assignments")
        .select(`
          *,
          worksheet_templates (
            title,
            description
          )
        `)
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })

      if (worksheetError) {
        console.error("[v0] Error fetching worksheet assignments:", worksheetError)
      }

      setWorksheetAssignments(worksheetAssignmentsData || [])

      const { data: couplesData, error: couplesError } = await (supabase as any)
        .from("couples")
        .select("id, therapist_id, relationship_name, partner_1_client_id, partner_2_client_id")
        .or(`partner_1_client_id.eq.${client.id},partner_2_client_id.eq.${client.id}`)
        .order("created_at", { ascending: false })

      if (couplesError) {
        console.error("[v0] Error fetching couples:", couplesError)
      }

      const relationshipUnits = (couplesData || []) as CoupleRecord[]
      setCouples(relationshipUnits)

      if (relationshipUnits.length > 0) {
        const coupleIds = relationshipUnits.map((couple) => couple.id)
        const { data: checkInsData, error: checkInsError } = await (supabase as any)
          .from("couple_check_ins")
          .select("*")
          .eq("client_id", client.id)
          .in("couple_id", coupleIds)
          .order("check_in_week", { ascending: false })

        if (checkInsError) {
          console.error("[v0] Error fetching couple check-ins:", checkInsError)
        } else {
          setCoupleCheckIns(checkInsData || [])
        }
      }

      const { data: moodData, error: moodError } = await (supabase as any)
        .from("client_mood_checkins")
        .select("id, mood_rating, anxiety_rating, stress_rating, note, created_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (moodError) {
        console.error("[v0] Error fetching mood check-ins:", moodError)
      } else {
        setMoodCheckIns(moodData || [])
      }

      setIsLoading(false)
    }

    fetchData()
  }, [])

  const handleMarkComplete = async () => {
    if (!selectedAssignment) return

    setIsSubmitting(true)
    setSubmitSuccess(false)

    const supabase = getClient() as any
    const completedAt = new Date().toISOString()

    if (isDemoModeEnabled()) {
      setAssignments(prev => prev.map(a => a.id === selectedAssignment ? { ...a, completed: true, status: "completed", reflection: reflection.trim() || null, started_at: a.started_at || completedAt, completed_at: completedAt } : a))
      setSubmitSuccess(true)
      setIsSubmitting(false)
      setTimeout(() => { setSelectedAssignment(null); setReflection(""); setSubmitSuccess(false) }, 700)
      return
    }

    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        completed: true,
        status: "completed",
        reflection: reflection.trim() || null,
        started_at: currentAssignment?.started_at || completedAt,
        completed_at: completedAt,
      })
      .eq("id", selectedAssignment)

    if (updateError) {
      console.error("Error updating assignment:", updateError)
      setIsSubmitting(false)
      return
    }

    await logClientAuditEvent({
      action: "assignment.update",
      resourceType: "assignment",
      resourceId: selectedAssignment,
      details: {
        status: "completed",
        clientId: currentAssignment?.client_id || null,
        hasReflection: !!reflection.trim(),
      },
    })

    // Update local state
    setAssignments(prev => prev.map(a => 
      a.id === selectedAssignment 
        ? { ...a, completed: true, status: "completed", reflection: reflection.trim() || null, started_at: a.started_at || completedAt, completed_at: completedAt }
        : a
    ))

    setSubmitSuccess(true)
    setIsSubmitting(false)

    // Reset and go back after short delay
    setTimeout(() => {
      setSelectedAssignment(null)
      setReflection("")
      setSubmitSuccess(false)
    }, 1500)
  }

  const currentAssignment = assignments.find(a => a.id === selectedAssignment)
  const pendingAssignments = assignments.filter(a => !a.completed)
  const completedAssignments = assignments.filter(a => a.completed)

  const openRegularAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment.id)

    if (assignment.completed || assignment.status === "started" || assignment.started_at) return

    const startedAt = new Date().toISOString()
    if (isDemoModeEnabled()) {
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, status: "started", started_at: startedAt } : a))
      return
    }
    const supabase = getClient() as any

    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        status: "started",
        started_at: startedAt,
      })
      .eq("id", assignment.id)
      .eq("client_id", assignment.client_id)

    if (updateError) {
      console.error("Error marking assignment started:", updateError)
      return
    }

    await logClientAuditEvent({
      action: "assignment.update",
      resourceType: "assignment",
      resourceId: assignment.id,
      details: {
        status: "started",
        clientId: assignment.client_id,
      },
    })

    setAssignments(prev => prev.map(a => (
      a.id === assignment.id ? { ...a, status: "started", started_at: startedAt } : a
    )))
  }

  // Worksheet assignments - categorize by status
  const inProgressWorksheetAssignments = worksheetAssignments.filter(a => a.status === "in_progress")
  const pendingWorksheetAssignments = worksheetAssignments.filter(a => a.status === "assigned" || a.status === "overdue")
  const completedWorksheetAssignments = worksheetAssignments.filter(a => a.status === "completed")

  // Check for overdue items
  const now = new Date()
  const overdueRegularAssignments = pendingAssignments.filter(a => {
    if (!a.due_date) return false
    return new Date(a.due_date) < now
  })
  const overdueWorksheetAssignments = [...inProgressWorksheetAssignments, ...pendingWorksheetAssignments].filter(a => {
    if (!a.due_date) return false
    return new Date(a.due_date) < now
  })
  const totalOverdue = overdueRegularAssignments.length + overdueWorksheetAssignments.length

  // Combined counts for progress
  const totalPending = pendingAssignments.length + pendingWorksheetAssignments.length + inProgressWorksheetAssignments.length
  const totalCompleted = completedAssignments.length + completedWorksheetAssignments.length
  const totalAll = totalPending + totalCompleted

  // Get client display name
  const displayName = clientRecord?.full_name?.split(" ")[0] || "there"

  const buildTaskSortDate = (dueDate: string | null, fallback: string) => dueDate || fallback

  const activeTasks: PortalTask[] = [
    ...inProgressWorksheetAssignments.map((assignment): PortalTask => ({
      id: assignment.id,
      type: "worksheet",
      title: assignment.worksheet_templates?.title || "Worksheet",
      description: assignment.worksheet_templates?.description || null,
      dueDate: assignment.due_date,
      status: "In Progress",
      sortDate: buildTaskSortDate(assignment.due_date, assignment.started_at || assignment.assigned_at || assignment.created_at),
      isOverdue: Boolean(assignment.due_date && new Date(assignment.due_date) < now),
      actionLabel: "Continue",
      worksheet: assignment,
    })),
    ...pendingWorksheetAssignments.map((assignment): PortalTask => ({
      id: assignment.id,
      type: "worksheet",
      title: assignment.worksheet_templates?.title || "Worksheet",
      description: assignment.worksheet_templates?.description || null,
      dueDate: assignment.due_date,
      status: assignment.status === "overdue" ? "Overdue" : "Assigned",
      sortDate: buildTaskSortDate(assignment.due_date, assignment.assigned_at || assignment.created_at),
      isOverdue: Boolean(assignment.due_date && new Date(assignment.due_date) < now),
      actionLabel: "Start",
      worksheet: assignment,
    })),
    ...pendingAssignments.map((assignment): PortalTask => ({
      id: assignment.id,
      type: "assignment",
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.due_date,
      status: assignment.status === "started" || assignment.started_at ? "Started" : "Assigned",
      sortDate: buildTaskSortDate(assignment.due_date, assignment.started_at || assignment.assigned_at || assignment.created_at),
      isOverdue: Boolean(assignment.due_date && new Date(assignment.due_date) < now),
      actionLabel: assignment.status === "started" || assignment.started_at ? "Continue" : "Start",
      assignment,
    })),
  ].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    if (a.status === "In Progress" && b.status !== "In Progress") return -1
    if (b.status === "In Progress" && a.status !== "In Progress") return 1
    return new Date(a.sortDate).getTime() - new Date(b.sortDate).getTime()
  })

  const nextTask = activeTasks[0] || null
  const remainingTasks = activeTasks.slice(1)

  const openTask = (task: PortalTask) => {
    if (task.type === "worksheet" && task.worksheet) {
      setSelectedWorksheetAssignment(task.worksheet.id)
      return
    }

    if (task.assignment) {
      openRegularAssignment(task.assignment)
    }
  }

  const handleWorksheetComplete = () => {
    const completedAt = new Date().toISOString()
    const completedWorksheet = worksheetAssignments.find(assignment => assignment.id === selectedWorksheetAssignment)

    setWorksheetAssignments(prev => prev.map(assignment => (
      assignment.id === selectedWorksheetAssignment
        ? { ...assignment, status: "completed", started_at: assignment.started_at || completedAt, completed_at: completedAt }
        : assignment
    )))
    setCompletedWorksheetTitle(completedWorksheet?.worksheet_templates?.title || "Worksheet")
    setSelectedWorksheetAssignment(null)
    setTimeout(() => setCompletedWorksheetTitle(null), 4000)
  }

  const currentCheckInWeek = (() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - date.getDay())
    return date.toISOString().split("T")[0]
  })()

  const updateCheckInForm = (coupleId: string, field: string, value: string) => {
    setCheckInForms(prev => ({
      ...prev,
      [coupleId]: {
        ...(prev[coupleId] || {
          relationship_satisfaction: 5,
          trust: 5,
          communication: 5,
          intimacy: 5,
          conflict_level: 5,
          reflection: "",
        }),
        [field]: field === "reflection" ? value : Number(value),
      },
    }))
  }

  const submitCoupleCheckIn = async (couple: CoupleRecord) => {
    if (!clientRecord) return

    setCheckInSubmittingId(couple.id)
    setCheckInSuccessId(null)

    const supabase = getClient() as any
    const existingCheckIn = coupleCheckIns.find((checkIn) => (
      checkIn.couple_id === couple.id && checkIn.check_in_week === currentCheckInWeek
    ))
    const form = checkInForms[couple.id] || {
      relationship_satisfaction: existingCheckIn?.relationship_satisfaction || 5,
      trust: existingCheckIn?.trust || 5,
      communication: existingCheckIn?.communication || 5,
      intimacy: existingCheckIn?.intimacy || 5,
      conflict_level: existingCheckIn?.conflict_level || 5,
      reflection: existingCheckIn?.reflection || "",
    }

    const payload = {
      couple_id: couple.id,
      therapist_id: couple.therapist_id,
      client_id: clientRecord.id,
      check_in_week: currentCheckInWeek,
      relationship_satisfaction: form.relationship_satisfaction,
      trust: form.trust,
      communication: form.communication,
      intimacy: form.intimacy,
      conflict_level: form.conflict_level,
      reflection: form.reflection.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error: upsertError } = await supabase
      .from("couple_check_ins")
      .upsert(payload, { onConflict: "couple_id,client_id,check_in_week" })
      .select("*")
      .single()

    if (upsertError) {
      console.error("[v0] Error saving couple check-in:", upsertError)
      setCheckInSubmittingId(null)
      return
    }

    setCoupleCheckIns(prev => [
      data,
      ...prev.filter((checkIn) => checkIn.id !== data.id),
    ])
    setCheckInSuccessId(couple.id)
    setCheckInSubmittingId(null)
    setTimeout(() => setCheckInSuccessId(null), 2000)
  }

  const saveMoodCheckIn = async () => {
    if (!clientRecord) return

    setIsMoodSaving(true)
    setMoodSuccess(false)

    const supabase = getClient() as any
    const { data, error: insertError } = await supabase
      .from("client_mood_checkins")
      .insert({
        therapist_id: clientRecord.therapist_id,
        client_id: clientRecord.id,
        mood_rating: moodRating,
        anxiety_rating: anxietyRating,
        stress_rating: stressRating,
        note: moodNote.trim() || null,
      })
      .select("id, mood_rating, anxiety_rating, stress_rating, note, created_at")
      .single()

    if (insertError) {
      console.error("[v0] Error saving mood check-in:", insertError)
      setIsMoodSaving(false)
      return
    }

    setMoodCheckIns(prev => [data, ...prev])
    setMoodRating(5)
    setAnxietyRating(null)
    setStressRating(null)
    setMoodNote("")
    setMoodSuccess(true)
    setIsMoodSaving(false)
    setTimeout(() => setMoodSuccess(false), 2000)
  }

  // Format due date
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date"
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
    
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays <= 7) return `In ${diffDays} days`
    
    return date.toLocaleDateString()
  }

  // Calculate progress
  const totalAssignments = totalAll
  const completedCount = totalCompleted
  const progressPercent = totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0

  const renderTaskCard = (task: PortalTask, featured = false) => (
    <Card
      key={`${task.type}-${task.id}`}
      className={`rounded-[24px] border-slate-200/75 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.045)] ${featured ? "border-[#6D5EF5]/25 shadow-[0_22px_64px_rgba(109,94,245,0.12)]" : ""}`}
    >
      <CardContent className={featured ? "p-5 sm:p-6" : "p-4"}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${task.type === "worksheet" ? "bg-[#18B7A0]/10 text-[#109986]" : "bg-[#6D5EF5]/10 text-[#6D5EF5]"}`}>
            {task.type === "worksheet" ? <FileText className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`${featured ? "text-lg" : "text-base"} font-semibold text-slate-950`}>{task.title}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${task.isOverdue ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {task.isOverdue ? "Overdue" : task.status}
              </span>
            </div>
            {task.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{task.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due {formatDueDate(task.dueDate)}
                </span>
              )}
              <span>{task.type === "worksheet" ? "Worksheet" : "Assignment"}</span>
            </div>
          </div>
          <Button
            className={`h-12 rounded-2xl px-5 ${featured ? "w-full sm:w-auto" : "w-full sm:w-auto"} bg-[#6D5EF5] text-white shadow-[0_14px_30px_rgba(109,94,245,0.18)] hover:bg-[#5B4DEA]`}
            onClick={() => openTask(task)}
          >
            {task.actionLabel}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="min-h-[60vh] space-y-4 p-4 sm:p-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-[28px] border-slate-200/75 bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-[28px] border-rose-200/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <CardContent className="flex flex-col items-center justify-center px-8 py-12 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-50">
              <AlertCircle className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-950">Unable to load portal</h2>
            <p className="mb-6 text-sm leading-6 text-slate-500">{error}</p>
            <Link href="/">
              <Button variant="outline" className="h-11 rounded-2xl border-slate-200">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <main>
        <div className="space-y-7 sm:space-y-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[32px] border border-slate-200/75 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.07)]"
          >
            <div className="relative p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_16%_0%,rgba(109,94,245,0.18),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(24,183,160,0.15),transparent_32%)]" />
              <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#6D5EF5]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#6D5EF5]">
                    <Heart className="h-3.5 w-3.5" />
                    Your portal
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Hi {displayName}, welcome back.</h1>
                  <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
                    {totalPending === 0
                      ? "You're all caught up. You can still check in or write a reflection when something comes up."
                      : `You have ${totalPending} next step${totalPending === 1 ? "" : "s"} waiting between sessions.`}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Overdue Alert */}
          {totalOverdue > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="rounded-[26px] border-amber-200/70 bg-amber-50/70 shadow-[0_16px_44px_rgba(245,158,11,0.08)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-900">
                        {totalOverdue} overdue assignment{totalOverdue === 1 ? '' : 's'}
                      </p>
                      <p className="text-sm text-amber-800/75">
                        Start with the oldest item when you have a quiet moment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {selectedWorksheetAssignment ? (
            /* Interactive Worksheet Form View */
            <WorksheetForm
              assignmentId={selectedWorksheetAssignment}
              onComplete={handleWorksheetComplete}
              onBack={() => setSelectedWorksheetAssignment(null)}
            />
          ) : selectedAssignment && currentAssignment ? (
            /* Assignment Detail View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedAssignment(null)
                  setReflection("")
                }}
                className="rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to assignments
              </Button>

              <Card className="rounded-[28px] border-slate-200/75 bg-white shadow-[0_18px_56px_rgba(15,23,42,0.06)]">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                    {currentAssignment.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {formatDueDate(currentAssignment.due_date)}
                      </span>
                    )}
                    {currentAssignment.completed && (
                      <span className="rounded-full bg-[#18B7A0]/10 px-2.5 py-1 text-xs font-bold text-[#109986]">
                        Completed
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-2xl text-slate-950">{currentAssignment.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentAssignment.description && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/75 p-6">
                      <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
                        <Sparkles className="h-4 w-4 text-[#6D5EF5]" />
                        Instructions
                      </h3>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {currentAssignment.description}
                      </p>
                    </div>
                  )}

                  {currentAssignment.completed && currentAssignment.reflection ? (
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 font-semibold text-slate-950">
                        <Heart className="h-4 w-4 text-[#6D5EF5]" />
                        Your Reflection
                      </h3>
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {currentAssignment.reflection}
                        </p>
                      </div>
                    </div>
                  ) : !currentAssignment.completed && (
                    <>
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-semibold text-slate-950">
                          <Heart className="h-4 w-4 text-[#6D5EF5]" />
                          Your Reflection
                        </h3>
                        <Textarea
                          placeholder="Share your thoughts, feelings, and insights from this exercise..."
                          value={reflection}
                          onChange={(e) => setReflection(e.target.value)}
                          className="min-h-36 rounded-2xl border-slate-200"
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-slate-500">
                          Your therapist will review your reflection before your next session.
                        </p>
                      </div>

                      <Button 
                        className="h-12 w-full rounded-2xl bg-[#6D5EF5] text-base text-white shadow-[0_14px_30px_rgba(109,94,245,0.22)] hover:bg-[#5B4DEA]"
                        onClick={handleMarkComplete}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : submitSuccess ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Completed!
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark as Complete
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* Assignment List View */
            <>
              {completedWorksheetTitle && (
                <Card className="rounded-[24px] border-[#18B7A0]/25 bg-[#18B7A0]/10">
                  <CardContent className="flex items-start gap-3 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#109986]" />
                    <div>
                      <p className="font-semibold text-slate-950">Worksheet submitted</p>
                      <p className="text-sm text-slate-600">{completedWorksheetTitle} was marked complete. Your therapist can review it now.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <BookOpen className="h-5 w-5 text-[#6D5EF5]" />
                  Next Assignment
                </h2>
                {nextTask ? (
                  renderTaskCard(nextTask, true)
                ) : (
                  <Card className="rounded-[28px] border-dashed border-slate-200 bg-white shadow-[0_18px_56px_rgba(15,23,42,0.05)]">
                    <CardContent className="p-8 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#18B7A0]/10 text-[#109986]">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                      <p className="font-semibold text-slate-950">All work is complete</p>
                      <p className="mt-1 text-sm text-slate-500">There are no assignments waiting right now.</p>
                    </CardContent>
                  </Card>
                )}
              </motion.section>

              {remainingTasks.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-950">Remaining Assignments</h2>
                  <div className="space-y-3">
                    {remainingTasks.map(task => renderTaskCard(task))}
                  </div>
                </motion.section>
              )}

              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <Heart className="h-5 w-5 text-[#6D5EF5]" />
                  Between-Session Check-In
                </h2>
                <Card className="rounded-[28px] border-slate-200/75 bg-white shadow-[0_18px_56px_rgba(15,23,42,0.06)]">
                  <CardContent className="space-y-5 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">Reflection Journal</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">Write a note for your therapist between sessions.</p>
                      </div>
                      <Button className="h-11 rounded-2xl bg-[#6D5EF5] px-5 text-white hover:bg-[#5B4DEA]" asChild>
                        <Link href="/client-portal/reflections">
                          <PenLine className="mr-2 h-4 w-4" />
                          Open Journal
                        </Link>
                      </Button>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">Mood today</p>
                          <p className="rounded-full bg-[#6D5EF5]/10 px-2.5 py-1 text-sm font-bold text-[#6D5EF5]">{moodRating}/10</p>
                        </div>
                        <Slider value={[moodRating]} min={1} max={10} step={1} onValueChange={(value) => setMoodRating(value[0] || 5)} />
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Anxiety</p>
                            <p className="text-sm text-slate-500">{anxietyRating ? `${anxietyRating}/10` : "Optional"}</p>
                          </div>
                          <Slider value={[anxietyRating || 1]} min={1} max={10} step={1} onValueChange={(value) => setAnxietyRating(value[0] || null)} />
                          <Button variant="ghost" size="sm" className="rounded-xl text-slate-500" onClick={() => setAnxietyRating(null)}>Clear anxiety</Button>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Stress</p>
                            <p className="text-sm text-slate-500">{stressRating ? `${stressRating}/10` : "Optional"}</p>
                          </div>
                          <Slider value={[stressRating || 1]} min={1} max={10} step={1} onValueChange={(value) => setStressRating(value[0] || null)} />
                          <Button variant="ghost" size="sm" className="rounded-xl text-slate-500" onClick={() => setStressRating(null)}>Clear stress</Button>
                        </div>
                      </div>
                      <Textarea
                        value={moodNote}
                        onChange={(event) => setMoodNote(event.target.value)}
                        placeholder="Optional note..."
                        className="mt-4 min-h-24 rounded-2xl border-slate-200"
                      />
                      <Button className="mt-4 h-12 w-full rounded-2xl bg-[#18B7A0] text-white shadow-[0_14px_30px_rgba(24,183,160,0.18)] hover:bg-[#109986]" onClick={saveMoodCheckIn} disabled={isMoodSaving}>
                        {isMoodSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : moodSuccess ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Saved
                          </>
                        ) : (
                          "Save Check-In"
                        )}
                      </Button>
                      {moodCheckIns.length > 0 ? (
                        <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-500">
                          Most recent mood: {moodCheckIns[0].mood_rating}/10 on {new Date(moodCheckIns[0].created_at).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-3 text-xs font-medium text-slate-500">
                          Your first check-in will appear here after you save it.
                        </p>
                      )}
                    </div>

                    {couples.length > 0 && (
                      <div className="space-y-4 border-t border-slate-100 pt-5">
                        <p className="font-semibold text-slate-950">Relationship Check-In</p>
                        {couples.map((couple) => {
                          const existingCheckIn = coupleCheckIns.find((checkIn) => (
                            checkIn.couple_id === couple.id && checkIn.check_in_week === currentCheckInWeek
                          ))
                          const form = checkInForms[couple.id] || {
                            relationship_satisfaction: existingCheckIn?.relationship_satisfaction || 5,
                            trust: existingCheckIn?.trust || 5,
                            communication: existingCheckIn?.communication || 5,
                            intimacy: existingCheckIn?.intimacy || 5,
                            conflict_level: existingCheckIn?.conflict_level || 5,
                            reflection: existingCheckIn?.reflection || "",
                          }

                          return (
                            <div key={couple.id} className="space-y-4 rounded-[24px] border border-slate-200/75 p-4">
                              <p className="font-medium text-slate-950">{couple.relationship_name}</p>
                              {[
                                ["relationship_satisfaction", "Relationship satisfaction"],
                                ["trust", "Trust"],
                                ["communication", "Communication"],
                                ["intimacy", "Intimacy"],
                                ["conflict_level", "Conflict level"],
                              ].map(([field, label]) => (
                                <div key={field} className="grid grid-cols-[1fr_72px] items-center gap-3">
                                  <label className="text-sm font-medium text-slate-700">{label}</label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={form[field as keyof typeof form] as number}
                                    onChange={(event) => updateCheckInForm(couple.id, field, event.target.value)}
                                    className="h-11 rounded-2xl border-slate-200 text-base"
                                  />
                                </div>
                              ))}
                              <Textarea
                                value={form.reflection}
                                onChange={(event) => updateCheckInForm(couple.id, "reflection", event.target.value)}
                                placeholder="Optional reflection for your therapist..."
                                className="min-h-24 rounded-2xl border-slate-200"
                              />
                              <Button
                                className="h-12 w-full rounded-2xl bg-[#6D5EF5] text-white hover:bg-[#5B4DEA]"
                                onClick={() => submitCoupleCheckIn(couple)}
                                disabled={checkInSubmittingId === couple.id}
                              >
                                {checkInSubmittingId === couple.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : checkInSuccessId === couple.id ? (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Saved
                                  </>
                                ) : (
                                  "Submit Weekly Check-In"
                                )}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="rounded-[28px] border-[#6D5EF5]/15 bg-gradient-to-br from-[#6D5EF5]/10 via-white to-[#18B7A0]/10 shadow-[0_18px_56px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">Progress</p>
                        <p className="mt-1 text-3xl font-bold text-slate-950">{completedCount} of {totalAssignments}</p>
                        <p className="mt-1 text-sm text-slate-500">assignments completed</p>
                      </div>
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-[#6D5EF5]/20 bg-white shadow-sm">
                        <svg className="absolute inset-0 h-full w-full -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="4"
                            strokeDasharray={`${(progressPercent / 100) * 226} 226`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-lg font-bold text-[#6D5EF5]">{progressPercent}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                  <CheckCircle2 className="h-5 w-5 text-[#18B7A0]" />
                  Completed Work
                </h2>
                {completedAssignments.length === 0 && completedWorksheetAssignments.length === 0 ? (
                  <Card className="rounded-[24px] border-dashed border-slate-200 bg-white">
                    <CardContent className="p-6 text-center">
                      <p className="font-semibold text-slate-950">No completed work yet</p>
                      <p className="mt-1 text-sm text-slate-500">Finished assignments will collect here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {completedWorksheetAssignments.map((assignment) => (
                      <Card key={assignment.id} className="rounded-[24px] border-slate-200/70 bg-white/70">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#18B7A0]/10 text-[#109986]">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-950">{assignment.worksheet_templates?.title}</p>
                              <p className="text-xs font-medium text-slate-400">
                                Completed {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : ""}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {completedAssignments.map((assignment) => (
                      <Card
                        key={assignment.id}
                        className="cursor-pointer rounded-[24px] border-slate-200/70 bg-white/70 transition-all hover:border-[#6D5EF5]/25 hover:shadow-md"
                        onClick={() => {
                          setSelectedAssignment(assignment.id)
                          setReflection(assignment.reflection || "")
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#6D5EF5]/10 text-[#6D5EF5]">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-950">{assignment.title}</p>
                              <p className="text-xs font-medium text-slate-400">
                                Completed {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : ""}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function ClientPortalLoading() {
  return (
    <div className="min-h-screen space-y-4 bg-background p-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="rounded-[28px] border-slate-200/75 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={<ClientPortalLoading />}>
      <ClientPortalContent />
    </Suspense>
  )
}
