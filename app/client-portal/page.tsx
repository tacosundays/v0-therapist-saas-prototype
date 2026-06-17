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
  PlayCircle
} from "lucide-react"
import { getClient } from "@/lib/supabase/client"
import Link from "next/link"
import { WorksheetForm } from "@/components/client-portal/worksheet-form"
import { checkUserRole } from "@/lib/auth/check-user-role"
import { logClientAuditEvent } from "@/lib/audit-client"

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="rounded-2xl max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load portal</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/">
              <Button variant="outline" className="rounded-xl">
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">ShrinkAid</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {clientRecord?.full_name}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold text-foreground">Welcome, {displayName}</h1>
            <p className="text-muted-foreground mt-1">
              {totalPending === 0 
                ? "You're all caught up!" 
                : `You have ${totalPending} assignment${totalPending === 1 ? '' : 's'} waiting for you`}
            </p>
          </motion.div>

          {/* Overdue Alert */}
          {totalOverdue > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="rounded-2xl border-destructive/50 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-destructive">
                        {totalOverdue} overdue assignment{totalOverdue === 1 ? '' : 's'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please complete these as soon as possible
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Card className="rounded-2xl">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Reflection Journal</p>
                  <p className="text-sm text-muted-foreground mt-1">Write a between-session reflection for your therapist.</p>
                </div>
                <Button className="rounded-xl shrink-0" asChild>
                  <Link href="/client-portal/reflections">
                    Open Journal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Mood Check-In
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Mood today</p>
                    <p className="text-sm font-semibold text-primary">{moodRating}/10</p>
                  </div>
                  <Slider value={[moodRating]} min={1} max={10} step={1} onValueChange={(value) => setMoodRating(value[0] || 5)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Anxiety</p>
                      <p className="text-sm text-muted-foreground">{anxietyRating ? `${anxietyRating}/10` : "Optional"}</p>
                    </div>
                    <Slider value={[anxietyRating || 1]} min={1} max={10} step={1} onValueChange={(value) => setAnxietyRating(value[0] || null)} />
                    <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setAnxietyRating(null)}>Clear anxiety</Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Stress</p>
                      <p className="text-sm text-muted-foreground">{stressRating ? `${stressRating}/10` : "Optional"}</p>
                    </div>
                    <Slider value={[stressRating || 1]} min={1} max={10} step={1} onValueChange={(value) => setStressRating(value[0] || null)} />
                    <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setStressRating(null)}>Clear stress</Button>
                  </div>
                </div>
                <Textarea
                  value={moodNote}
                  onChange={(event) => setMoodNote(event.target.value)}
                  placeholder="Optional note..."
                  className="min-h-24 rounded-xl"
                />
                <Button className="w-full rounded-xl" onClick={saveMoodCheckIn} disabled={isMoodSaving}>
                  {isMoodSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : moodSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    "Save Check-In"
                  )}
                </Button>
                {moodCheckIns.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Most recent mood: {moodCheckIns[0].mood_rating}/10 on {new Date(moodCheckIns[0].created_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your progress</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{completedCount} of {totalAssignments}</p>
                    <p className="text-sm text-muted-foreground mt-1">assignments completed</p>
                  </div>
                  <div className="w-20 h-20 rounded-full border-4 border-primary/30 flex items-center justify-center relative">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
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
                    <span className="text-lg font-bold text-primary">{progressPercent}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {selectedWorksheetAssignment ? (
            /* Interactive Worksheet Form View */
            <WorksheetForm
              assignmentId={selectedWorksheetAssignment}
              onComplete={() => {
                setSelectedWorksheetAssignment(null)
                // Refresh assignments
                window.location.reload()
              }}
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
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to assignments
              </Button>

              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    {currentAssignment.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {formatDueDate(currentAssignment.due_date)}
                      </span>
                    )}
                    {currentAssignment.completed && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                        Completed
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl">{currentAssignment.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentAssignment.description && (
                    <div className="p-6 bg-muted/30 rounded-xl">
                      <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Instructions
                      </h3>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {currentAssignment.description}
                      </p>
                    </div>
                  )}

                  {currentAssignment.completed && currentAssignment.reflection ? (
                    <div className="space-y-3">
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        <Heart className="w-4 h-4 text-primary" />
                        Your Reflection
                      </h3>
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {currentAssignment.reflection}
                        </p>
                      </div>
                    </div>
                  ) : !currentAssignment.completed && (
                    <>
                      <div className="space-y-3">
                        <h3 className="font-medium text-foreground flex items-center gap-2">
                          <Heart className="w-4 h-4 text-primary" />
                          Your Reflection
                        </h3>
                        <Textarea
                          placeholder="Share your thoughts, feelings, and insights from this exercise..."
                          value={reflection}
                          onChange={(e) => setReflection(e.target.value)}
                          className="min-h-32 rounded-xl"
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Your therapist will review your reflection before your next session.
                        </p>
                      </div>

                      <Button 
                        className="w-full h-12 rounded-xl text-base"
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
              {/* Active Assignments */}
              {couples.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    Relationship Check-In
                  </h2>
                  <div className="space-y-4">
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
                        <Card key={couple.id} className="rounded-2xl">
                          <CardHeader>
                            <CardTitle className="text-base">{couple.relationship_name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {[
                              ["relationship_satisfaction", "Relationship satisfaction"],
                              ["trust", "Trust"],
                              ["communication", "Communication"],
                              ["intimacy", "Intimacy"],
                              ["conflict_level", "Conflict level"],
                            ].map(([field, label]) => (
                              <div key={field} className="grid grid-cols-[1fr_72px] gap-3 items-center">
                                <label className="text-sm text-foreground">{label}</label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={form[field as keyof typeof form] as number}
                                  onChange={(event) => updateCheckInForm(couple.id, field, event.target.value)}
                                  className="h-10 rounded-xl"
                                />
                              </div>
                            ))}
                            <Textarea
                              value={form.reflection}
                              onChange={(event) => updateCheckInForm(couple.id, "reflection", event.target.value)}
                              placeholder="Optional reflection for your therapist..."
                              className="min-h-24 rounded-xl"
                            />
                            <Button
                              className="w-full rounded-xl"
                              onClick={() => submitCoupleCheckIn(couple)}
                              disabled={checkInSubmittingId === couple.id}
                            >
                              {checkInSubmittingId === couple.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : checkInSuccessId === couple.id ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Saved
                                </>
                              ) : (
                                "Submit Weekly Check-In"
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Your Assignments
                </h2>
                {pendingAssignments.length === 0 && pendingWorksheetAssignments.length === 0 && inProgressWorksheetAssignments.length === 0 ? (
                  <Card className="rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                      <p className="text-foreground font-medium">All caught up!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        No pending assignments right now.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* In Progress Worksheet Assignments */}
                    {inProgressWorksheetAssignments.map((assignment, index) => {
                      const isOverdue = assignment.due_date && new Date(assignment.due_date) < now
                      return (
                        <motion.div
                          key={assignment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          <Card
                            className={`rounded-2xl cursor-pointer hover:shadow-lg transition-all ${isOverdue ? "border-destructive/50 hover:border-destructive" : "border-primary/30 hover:border-primary"}`}
                            onClick={() => setSelectedWorksheetAssignment(assignment.id)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? "bg-destructive/20" : "bg-primary/20"}`}>
                                  <PlayCircle className={`w-6 h-6 ${isOverdue ? "text-destructive" : "text-primary"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-medium text-foreground truncate">{assignment.worksheet_templates?.title}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                      In Progress
                                    </span>
                                    {isOverdue && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive shrink-0">
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                  {assignment.worksheet_templates?.description && (
                                    <p className="text-sm text-muted-foreground truncate">{assignment.worksheet_templates.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Due {formatDueDate(assignment.due_date)}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}

                    {/* Not Started Interactive Worksheet Assignments */}
                    {pendingWorksheetAssignments.map((assignment, index) => {
                      const isOverdue = assignment.due_date && new Date(assignment.due_date) < now
                      return (
                        <motion.div
                          key={assignment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + (inProgressWorksheetAssignments.length + index) * 0.1 }}
                        >
                          <Card
                            className={`rounded-2xl cursor-pointer hover:shadow-lg transition-all ${isOverdue ? "border-destructive/50 hover:border-destructive" : "border-chart-3/30 hover:border-primary/30"}`}
                            onClick={() => setSelectedWorksheetAssignment(assignment.id)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? "bg-destructive/20" : "bg-chart-3/20"}`}>
                                  <FileText className={`w-6 h-6 ${isOverdue ? "text-destructive" : "text-chart-3"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-medium text-foreground truncate">{assignment.worksheet_templates?.title}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-chart-3/10 text-chart-3 shrink-0">
                                      Interactive
                                    </span>
                                    {isOverdue && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive shrink-0">
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                  {assignment.worksheet_templates?.description && (
                                    <p className="text-sm text-muted-foreground truncate">{assignment.worksheet_templates.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Due {formatDueDate(assignment.due_date)}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}

                    {/* Regular Assignments */}
                    {pendingAssignments.map((assignment, index) => {
                      const isOverdue = assignment.due_date && new Date(assignment.due_date) < now
                      return (
                      <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        <Card
                          className="rounded-2xl cursor-pointer hover:shadow-lg transition-all hover:border-primary/30"
                          onClick={() => openRegularAssignment(assignment)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                                <BookOpen className="w-6 h-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-medium text-foreground truncate">{assignment.title}</h3>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                    {assignment.status === "started" || assignment.started_at ? "Started" : "Assigned"}
                                  </span>
                                </div>
                                {assignment.description && (
                                  <p className="text-sm text-muted-foreground truncate">{assignment.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Due {formatDueDate(assignment.due_date)}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.div>

              {/* Completed Assignments */}
              {(completedAssignments.length > 0 || completedWorksheetAssignments.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Completed
                  </h2>
                  <div className="space-y-3">
                    {/* Completed Interactive Worksheets */}
                    {completedWorksheetAssignments.map((assignment) => (
                      <Card 
                        key={assignment.id} 
                        className="rounded-2xl bg-muted/30"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-chart-3/20 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-chart-3" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{assignment.worksheet_templates?.title}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-chart-3/10 text-chart-3">
                                  Interactive
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Completed {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : ""}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Completed Regular Assignments */}
                    {completedAssignments.map((assignment) => (
                      <Card 
                        key={assignment.id} 
                        className="rounded-2xl bg-muted/30 cursor-pointer hover:shadow-md transition-all"
                        onClick={() => {
                          setSelectedAssignment(assignment.id)
                          setReflection(assignment.reflection || "")
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{assignment.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Completed {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : ""}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function ClientPortalLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
