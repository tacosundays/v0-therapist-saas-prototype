"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"

interface ClientRecord {
  id: string
  therapist_id: string
  full_name: string
  email: string | null
  status: string | null
  created_at: string
  user_id?: string | null
  invite_sent_at?: string | null
  invite_accepted_at?: string | null
}

interface AssignmentRecord {
  id: string
  client_id: string
  title: string
  completed: boolean | null
  status: string | null
  reflection: string | null
  created_at: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
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

interface WorksheetResponseRecord {
  id: string
  assignment_id: string
  question_id: string
  answer_text: string | null
  answer_json: unknown
  created_at: string | null
  updated_at: string | null
}

interface SessionPrepNote {
  id: string
  note: string | null
}

interface ProgressNote {
  id: string
  note_type: "DAP" | "SOAP" | string | null
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  private_note: string | null
  created_at: string
  updated_at: string | null
}

interface ClientReflection {
  id: string
  title: string | null
  reflection_text: string
  mood_rating: number | null
  created_at: string
}

interface MoodCheckIn {
  id: string
  mood_rating: number
  anxiety_rating: number | null
  stress_rating: number | null
  note: string | null
  created_at: string
}

interface SessionSummarySections {
  clientOverview?: string | null
  progressSinceLastSession?: string | null
  moodTrends?: string | null
  reflectionThemes?: string | null
  homeworkProgress?: string | null
  suggestedDiscussionTopics?: string[] | null
}

interface SessionSummaryRecord {
  id: string
  therapist_id: string
  client_id: string
  summary_json: SessionSummarySections | null
  summary_text: string | null
  source_counts: Record<string, number> | null
  model: string | null
  created_at: string
}

interface TimelineItem {
  date: string
  label: string
  detail: string
}

type ProgressNoteType = "DAP" | "SOAP"

interface ProgressNoteForm {
  note_type: ProgressNoteType
  subjective: string
  objective: string
  assessment: string
  plan: string
  private_note: string
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Not available"
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(date: string | null | undefined) {
  if (!date) return "Not available"
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getRelativeDays(date: string | null | undefined) {
  if (!date) return null
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)))
}

function formatRelativeActivity(date: string | null | undefined) {
  const days = getRelativeDays(date)
  if (days === null) return "No activity yet"
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

function getClientStatus(client: ClientRecord | null) {
  if (!client) return "Unknown"
  if (client.status === "active") return "Active"
  if (client.user_id || client.invite_accepted_at) return "Registered"
  if (client.invite_sent_at) return "Email Sent"
  return "Invited"
}

function getStatusTone(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase()
  if (normalized === "completed") return "green"
  if (normalized === "in_progress" || normalized === "started") return "amber"
  return "slate"
}

function answerToText(response: WorksheetResponseRecord) {
  if (response.answer_text?.trim()) return response.answer_text.trim()
  if (Array.isArray(response.answer_json)) return response.answer_json.join(", ")
  if (typeof response.answer_json === "number") return String(response.answer_json)
  if (response.answer_json && typeof response.answer_json === "object") return JSON.stringify(response.answer_json)
  return ""
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object") {
    const errorObject = err as { message?: string; details?: string; hint?: string; code?: string }
    return [
      errorObject.message,
      errorObject.details ? `Details: ${errorObject.details}` : null,
      errorObject.hint ? `Hint: ${errorObject.hint}` : null,
      errorObject.code ? `Code: ${errorObject.code}` : null,
    ].filter(Boolean).join(" ")
  }
  return "Unknown error"
}

function throwQueryError(label: string, err: unknown): never {
  const message = `${label}: ${getErrorMessage(err)}`
  console.error(`[v0] Session Prep: ${message}`, err)
  throw new Error(message)
}

export default function SessionPrepPage() {
  const params = useParams<{ id: string }>()
  const clientId = params.id

  const [therapistId, setTherapistId] = useState<string | null>(null)
  const [clientRecord, setClientRecord] = useState<ClientRecord | null>(null)
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignmentRecord[]>([])
  const [worksheetResponses, setWorksheetResponses] = useState<WorksheetResponseRecord[]>([])
  const [clientReflections, setClientReflections] = useState<ClientReflection[]>([])
  const [moodCheckIns, setMoodCheckIns] = useState<MoodCheckIn[]>([])
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([])
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummaryRecord[]>([])
  const [noteId, setNoteId] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [isProgressNoteOpen, setIsProgressNoteOpen] = useState(false)
  const [isProgressNoteSaving, setIsProgressNoteSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [noteSaveMessage, setNoteSaveMessage] = useState<string | null>(null)
  const [noteSaveError, setNoteSaveError] = useState<string | null>(null)
  const [progressNoteForm, setProgressNoteForm] = useState<ProgressNoteForm>({
    note_type: "DAP",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    private_note: "",
  })

  useEffect(() => {
    const loadSessionPrep = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = getClient() as any
        const { therapistId: resolvedTherapistId, userEmail } = await getTherapistId()

        console.log("[v0] Session Prep: auth email:", userEmail)
        console.log("[v0] Session Prep: therapist id found:", resolvedTherapistId ?? "none")

        if (!resolvedTherapistId) {
          setError("No therapist account found for your email.")
          return
        }

        setTherapistId(resolvedTherapistId)

        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .eq("therapist_id", resolvedTherapistId)
          .maybeSingle()

        if (clientError) throwQueryError("clients query failed", clientError)
        if (!clientData) {
          setError("Client not found.")
          return
        }

        const [
          assignmentsResult,
          worksheetsResult,
          notesResult,
          progressNotesResult,
          clientReflectionsResult,
          moodCheckInsResult,
          sessionSummariesResult,
        ] = await Promise.all([
          supabase
            .from("assignments")
            .select("id, client_id, title, completed, status, reflection, created_at, assigned_at, started_at, completed_at")
            .eq("client_id", clientId)
            .eq("therapist_id", resolvedTherapistId)
            .order("created_at", { ascending: false }),
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
            .eq("client_id", clientId)
            .eq("therapist_id", resolvedTherapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("session_prep_notes")
            .select("id, note")
            .eq("client_id", clientId)
            .eq("therapist_id", resolvedTherapistId)
            .order("updated_at", { ascending: false })
            .limit(1),
          supabase
            .from("progress_notes")
            .select("id, note_type, subjective, objective, assessment, plan, private_note, created_at, updated_at")
            .eq("client_id", clientId)
            .eq("therapist_id", resolvedTherapistId)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("client_reflections")
            .select("id, title, reflection_text, mood_rating, created_at")
            .eq("client_id", clientId)
            .eq("therapist_id", resolvedTherapistId)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("client_mood_checkins")
            .select("id, mood_rating, anxiety_rating, stress_rating, note, created_at")
            .eq("client_id", clientId)
            .eq("therapist_id", resolvedTherapistId)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("session_summaries")
            .select("id, therapist_id, client_id, summary_json, summary_text, source_counts, model, created_at")
            .eq("client_id", clientId)
            .eq("therapist_id", resolvedTherapistId)
            .order("created_at", { ascending: false })
            .limit(5),
        ])

        if (assignmentsResult.error) throwQueryError("assignments query failed", assignmentsResult.error)
        if (worksheetsResult.error) throwQueryError("worksheet_assignments query failed", worksheetsResult.error)
        if (notesResult.error) throwQueryError("session_prep_notes query failed", notesResult.error)
        if (progressNotesResult.error) throwQueryError("progress_notes query failed", progressNotesResult.error)
        if (clientReflectionsResult.error) throwQueryError("client_reflections query failed", clientReflectionsResult.error)
        if (moodCheckInsResult.error) throwQueryError("client_mood_checkins query failed", moodCheckInsResult.error)
        if (sessionSummariesResult.error) throwQueryError("session_summaries query failed", sessionSummariesResult.error)

        const worksheetData = (worksheetsResult.data || []) as WorksheetAssignmentRecord[]
        const worksheetAssignmentIds = worksheetData.map((assignment) => assignment.id)
        const responsesResult = worksheetAssignmentIds.length > 0
          ? await supabase
              .from("worksheet_responses")
              .select("id, assignment_id, question_id, answer_text, answer_json, created_at, updated_at")
              .eq("client_id", clientId)
              .in("assignment_id", worksheetAssignmentIds)
              .order("updated_at", { ascending: false })
              .limit(10)
          : { data: [], error: null }

        if (responsesResult.error) throwQueryError("worksheet_responses query failed", responsesResult.error)

        const latestNote = (notesResult.data?.[0] || null) as SessionPrepNote | null
        setClientRecord(clientData as ClientRecord)
        setAssignments((assignmentsResult.data || []) as AssignmentRecord[])
        setWorksheetAssignments(worksheetData)
        setWorksheetResponses((responsesResult.data || []) as WorksheetResponseRecord[])
        setClientReflections((clientReflectionsResult.data || []) as ClientReflection[])
        setMoodCheckIns((moodCheckInsResult.data || []) as MoodCheckIn[])
        setProgressNotes((progressNotesResult.data || []) as ProgressNote[])
        setSessionSummaries((sessionSummariesResult.data || []) as SessionSummaryRecord[])
        setNoteId(latestNote?.id || null)
        setNote(latestNote?.note || "")
      } catch (err) {
        console.error("[v0] Session Prep: failed to load", err)
        setError(`Failed to load session prep. ${getErrorMessage(err)}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadSessionPrep()
  }, [clientId])

  const worksheetTitleById = useMemo(() => {
    const map = new Map<string, string>()
    worksheetAssignments.forEach((assignment) => {
      map.set(assignment.id, assignment.worksheet_templates?.title || "Worksheet")
    })
    return map
  }, [worksheetAssignments])

  const journalReflectionCount = clientReflections.length
  const now = new Date()
  const moodLast30Days = moodCheckIns.filter((checkIn) => (
    now.getTime() - new Date(checkIn.created_at).getTime() <= 30 * 24 * 60 * 60 * 1000
  ))
  const moodLast7Days = moodCheckIns.filter((checkIn) => (
    now.getTime() - new Date(checkIn.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000
  ))
  const averageMood = (items: MoodCheckIn[]) => (
    items.length > 0 ? Number((items.reduce((sum, item) => sum + item.mood_rating, 0) / items.length).toFixed(1)) : null
  )
  const averageMood30 = averageMood(moodLast30Days)
  const averageMood7 = averageMood(moodLast7Days)
  const mostRecentMood = moodCheckIns[0] || null
  const oldestRecentMood = moodCheckIns.length > 1 ? moodCheckIns[Math.min(moodCheckIns.length - 1, 6)] : null
  const moodTrend = mostRecentMood && oldestRecentMood
    ? mostRecentMood.mood_rating - oldestRecentMood.mood_rating >= 2
      ? "improving"
      : oldestRecentMood.mood_rating - mostRecentMood.mood_rating >= 2
        ? "declining"
        : "stable"
    : "stable"
  const latestSessionSummary = sessionSummaries[0] || null

  const totalAssignments = assignments.length + worksheetAssignments.length
  const completedAssignments = assignments.filter((assignment) => assignment.completed || assignment.status === "completed").length
    + worksheetAssignments.filter((assignment) => assignment.status === "completed").length
  const startedAssignments = assignments.filter((assignment) => !assignment.completed && (assignment.status === "started" || assignment.started_at)).length
    + worksheetAssignments.filter((assignment) => assignment.status === "in_progress" || assignment.started_at).length
  const assignedAssignments = Math.max(totalAssignments - completedAssignments - startedAssignments, 0)
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0
  const lastCompletedAssignment = [
    ...assignments
      .filter((assignment) => (assignment.completed || assignment.status === "completed") && assignment.completed_at)
      .map((assignment) => ({ title: assignment.title, completedAt: assignment.completed_at! })),
    ...worksheetAssignments
      .filter((assignment) => assignment.status === "completed" && assignment.completed_at)
      .map((assignment) => ({ title: assignment.worksheet_templates?.title || "Worksheet", completedAt: assignment.completed_at! })),
  ].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]

  const timeline = useMemo(() => {
    const items: TimelineItem[] = []

    if (clientRecord?.created_at) {
      items.push({ date: clientRecord.created_at, label: "Invited", detail: "Client record created" })
    }
    if (clientRecord?.invite_sent_at) {
      items.push({ date: clientRecord.invite_sent_at, label: "Invite email sent", detail: clientRecord.email || "Client email" })
    }
    if (clientRecord?.invite_accepted_at) {
      items.push({ date: clientRecord.invite_accepted_at, label: "Registered", detail: "Client created their account" })
    }

    assignments.forEach((assignment) => {
      if (assignment.assigned_at || assignment.created_at) {
        items.push({ date: assignment.assigned_at || assignment.created_at!, label: "Assigned homework", detail: assignment.title })
      }
      if (assignment.started_at) {
        items.push({ date: assignment.started_at, label: "Started homework", detail: assignment.title })
      }
      if (assignment.completed_at) {
        items.push({ date: assignment.completed_at, label: "Completed homework", detail: assignment.title })
      }
      if (assignment.reflection && assignment.completed_at) {
        items.push({ date: assignment.completed_at, label: "Submitted reflection", detail: assignment.title })
      }
    })

    worksheetAssignments.forEach((assignment) => {
      const title = assignment.worksheet_templates?.title || "Worksheet"
      if (assignment.assigned_at) {
        items.push({ date: assignment.assigned_at, label: "Assigned worksheet", detail: title })
      }
      if (assignment.started_at) {
        items.push({ date: assignment.started_at, label: "Started worksheet", detail: title })
      }
      if (assignment.completed_at) {
        items.push({ date: assignment.completed_at, label: "Completed worksheet", detail: title })
      }
    })

    worksheetResponses.forEach((response) => {
      const responseText = answerToText(response)
      const responseDate = response.updated_at || response.created_at
      if (responseText && responseDate) {
        items.push({
          date: responseDate,
          label: "Submitted reflection",
          detail: worksheetTitleById.get(response.assignment_id) || "Worksheet response",
        })
      }
    })

    clientReflections.forEach((reflection) => {
      items.push({
        date: reflection.created_at,
        label: "Submitted reflection",
        detail: reflection.title || "Reflection journal entry",
      })
    })

    moodCheckIns.forEach((checkIn) => {
      items.push({
        date: checkIn.created_at,
        label: "Mood check-in",
        detail: `Mood ${checkIn.mood_rating}/10${checkIn.note ? `: ${checkIn.note}` : ""}`,
      })
    })

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20)
  }, [assignments, clientRecord, clientReflections, moodCheckIns, worksheetAssignments, worksheetResponses, worksheetTitleById])

  const buildProgressNoteContext = () => {
    const recentCompletedAssignments = [
      ...assignments
        .filter((assignment) => (assignment.completed || assignment.status === "completed") && assignment.completed_at)
        .map((assignment) => ({
          title: assignment.title,
          completedAt: assignment.completed_at!,
        })),
      ...worksheetAssignments
        .filter((assignment) => assignment.status === "completed" && assignment.completed_at)
        .map((assignment) => ({
          title: assignment.worksheet_templates?.title || "Worksheet",
          completedAt: assignment.completed_at!,
        })),
    ]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5)

    const contextLines = [
      `Client: ${clientRecord?.full_name || "Client"}`,
      `Completion rate: ${totalAssignments > 0 ? `${completionRate}% (${completedAssignments}/${totalAssignments})` : "No assignments yet"}`,
      "Recent completed assignments:",
      ...(recentCompletedAssignments.length > 0
        ? recentCompletedAssignments.map((assignment) => `- ${assignment.title} (${formatDate(assignment.completedAt)})`)
        : ["- None"]),
      "Recent reflections:",
      ...(clientReflections.length > 0
        ? clientReflections.slice(0, 3).map((reflection) => `- ${reflection.title || "Untitled"}: ${reflection.reflection_text}`)
        : ["- None"]),
      "Recent activity:",
      ...(timeline.length > 0
        ? timeline.slice(0, 5).map((item) => `- ${item.label}: ${item.detail} (${formatDateTime(item.date)})`)
        : ["- None"]),
    ]

    return contextLines.join("\n")
  }

  const openProgressNoteForm = () => {
    setProgressNoteForm({
      note_type: "DAP",
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      private_note: buildProgressNoteContext(),
    })
    setError(null)
    setSuccess(null)
    setIsProgressNoteOpen(true)
  }

  const updateProgressNoteField = (field: keyof ProgressNoteForm, value: string) => {
    setProgressNoteForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const saveProgressNote = async () => {
    if (!therapistId || !clientRecord) return

    setIsProgressNoteSaving(true)
    setSuccess(null)
    setError(null)

    try {
      const supabase = getClient() as any
      const { data, error: insertError } = await supabase
        .from("progress_notes")
        .insert({
          therapist_id: therapistId,
          client_id: clientRecord.id,
          note_type: progressNoteForm.note_type,
          subjective: progressNoteForm.subjective.trim() || null,
          objective: progressNoteForm.objective.trim() || null,
          assessment: progressNoteForm.assessment.trim() || null,
          plan: progressNoteForm.plan.trim() || null,
          private_note: progressNoteForm.private_note.trim() || null,
        })
        .select("id, note_type, subjective, objective, assessment, plan, private_note, created_at, updated_at")
        .single()

      if (insertError) throwQueryError("progress_notes insert failed", insertError)

      setProgressNotes((current) => [data as ProgressNote, ...current].slice(0, 5))
      setSuccess("Progress note saved.")
      setIsProgressNoteOpen(false)
    } catch (err) {
      console.error("[v0] Session Prep: failed to save progress note", err)
      setError(`Failed to save progress note. ${getErrorMessage(err)}`)
    } finally {
      setIsProgressNoteSaving(false)
    }
  }

  const generateSessionSummary = async () => {
    if (!clientRecord) return

    setIsSummaryLoading(true)
    setSuccess(null)
    setError(null)

    try {
      const supabase = getClient() as any
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throwQueryError("auth session query failed", sessionError)

      const accessToken = sessionData?.session?.access_token

      if (!accessToken) {
        setError("You must be logged in to generate a session summary.")
        return
      }

      const response = await fetch("/api/session-summary", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientId: clientRecord.id }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Failed to generate session summary.")
      }

      if (!result?.summary) {
        throw new Error("Session summary was not returned.")
      }

      setSessionSummaries((current) => [result.summary as SessionSummaryRecord, ...current].slice(0, 5))
      setSuccess("Session summary generated.")
    } catch (err) {
      console.error("[v0] Session Prep: failed to generate session summary", err)
      setError(`Failed to generate session summary. ${getErrorMessage(err)}`)
    } finally {
      setIsSummaryLoading(false)
    }
  }

  const saveNote = async () => {
    if (!therapistId || !clientRecord) return

    setIsSaving(true)
    setSuccess(null)
    setError(null)
    setNoteSaveMessage(null)
    setNoteSaveError(null)

    try {
      const supabase = getClient() as any
      const notePayload = {
        therapist_id: therapistId,
        client_id: clientRecord.id,
        note,
      }

      const { data: latestNote, error: latestNoteError } = await supabase
        .from("session_prep_notes")
        .select("id")
        .eq("client_id", clientRecord.id)
        .eq("therapist_id", therapistId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestNoteError) {
        console.error("[v0] Session Prep: session_prep_notes latest note query failed", latestNoteError)
        throwQueryError("session_prep_notes latest note query failed", latestNoteError)
      }

      const existingNoteId = latestNote?.id || noteId

      if (existingNoteId) {
        const { data: updatedNote, error: updateError } = await supabase
          .from("session_prep_notes")
          .update({ note })
          .eq("id", existingNoteId)
          .eq("therapist_id", therapistId)
          .select("id, note")
          .maybeSingle()

        if (updateError) {
          console.error("[v0] Session Prep: session_prep_notes update failed", updateError)
          throwQueryError("session_prep_notes update failed", updateError)
        }

        if (!updatedNote) {
          console.error("[v0] Session Prep: session_prep_notes update returned no row", { existingNoteId, therapistId })
          throw new Error("session_prep_notes update returned no row. Check RLS policy and note ownership.")
        }

        setNoteId(updatedNote.id)
        setNote(updatedNote.note || "")
      } else {
        const { data, error: insertError } = await supabase
          .from("session_prep_notes")
          .insert(notePayload)
          .select("id, note")
          .single()

        if (insertError) {
          console.error("[v0] Session Prep: session_prep_notes insert failed", insertError)
          throwQueryError("session_prep_notes insert failed", insertError)
        }

        setNoteId(data.id)
        setNote(data.note || "")
      }

      setSuccess("Session notes saved.")
      setNoteSaveMessage("Notes saved.")
    } catch (err) {
      console.error("[v0] Session Prep: failed to save note", err)
      const message = `Failed to save note. ${getErrorMessage(err)}`
      setError(message)
      setNoteSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !clientRecord) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Button variant="ghost" className="rounded-xl" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to clients
          </Link>
        </Button>
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-destructive">{error}</CardContent>
        </Card>
      </div>
    )
  }

  const activityDates = [
    clientRecord?.created_at,
    clientRecord?.invite_accepted_at,
    ...assignments.flatMap((assignment) => [assignment.assigned_at, assignment.started_at, assignment.completed_at]),
    ...worksheetAssignments.flatMap((assignment) => [assignment.assigned_at, assignment.started_at, assignment.completed_at]),
    ...clientReflections.map((reflection) => reflection.created_at),
    ...moodCheckIns.map((checkIn) => checkIn.created_at),
    ...progressNotes.map((progressNote) => progressNote.created_at),
    ...sessionSummaries.map((summary) => summary.created_at),
  ].filter(Boolean) as string[]
  const lastActivityAt = activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
  const daysSinceLastActivity = getRelativeDays(lastActivityAt)
  const reflectionRate = totalAssignments > 0 ? Math.round((journalReflectionCount / totalAssignments) * 100) : null
  const engagementScore = Math.min(
    100,
    Math.round(
      (completionRate * 0.45)
      + ((journalReflectionCount > 0 ? Math.min(journalReflectionCount, 5) / 5 : 0) * 25)
      + ((moodCheckIns.length > 0 ? Math.min(moodCheckIns.length, 5) / 5 : 0) * 20)
      + ((daysSinceLastActivity !== null && daysSinceLastActivity <= 7 ? 1 : 0) * 10)
    )
  )
  const homeworkAvailable = totalAssignments > 0
  const reflectionAvailable = clientReflections.length > 0 || assignments.some((assignment) => assignment.reflection)
  const moodTrendAvailable = moodCheckIns.length > 0
  const previousNotesAvailable = progressNotes.length > 0 || Boolean(note.trim())
  const homeworkNeedsReview = assignments.some((assignment) => assignment.reflection && (assignment.completed || assignment.status === "completed"))
    || worksheetResponses.length > 0
    || worksheetAssignments.some((assignment) => assignment.status === "completed")
  const attentionItems = [
    homeworkNeedsReview ? "Homework needs review" : null,
    moodTrend === "declining" ? "Mood declining" : null,
    totalAssignments > 0 && journalReflectionCount === 0 ? "Reflection missing" : null,
    daysSinceLastActivity !== null && daysSinceLastActivity >= 14 ? `Inactive ${daysSinceLastActivity} days` : null,
    assignedAssignments > 0 && startedAssignments === 0 && completedAssignments === 0 ? "Homework not started" : null,
  ].filter(Boolean) as string[]
  const homeworkProgressItems = [
    ...assignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      title: assignment.title,
      status: assignment.completed || assignment.status === "completed"
        ? "Completed"
        : assignment.status === "started" || assignment.started_at
          ? "In Progress"
          : "Assigned",
      date: assignment.completed_at || assignment.started_at || assignment.assigned_at || assignment.created_at,
      detail: assignment.reflection ? "Reflection submitted" : "Homework assignment",
    })),
    ...worksheetAssignments.map((assignment) => ({
      id: `worksheet-${assignment.id}`,
      title: assignment.worksheet_templates?.title || "Worksheet",
      status: assignment.status === "completed"
        ? "Completed"
        : assignment.status === "in_progress" || assignment.started_at
          ? "In Progress"
          : "Assigned",
      date: assignment.completed_at || assignment.started_at || assignment.assigned_at,
      detail: worksheetResponses.some((response) => response.assignment_id === assignment.id) ? "Needs Review" : "Online worksheet",
    })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  const latestReflection = clientReflections[0] || null

  return (
    <div className="max-w-[1500px] space-y-6">
      <Button variant="ghost" className="rounded-xl text-slate-500" asChild>
        <Link href="/dashboard/clients">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to clients
        </Link>
      </Button>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">{success}</div>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[#18B7A0] to-primary/30" />
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/20">
              <span className="text-xl font-bold text-primary">
                {(clientRecord?.full_name || "Client").split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="saas-eyebrow mb-2">Client command center</p>
              <h1 className="truncate text-3xl font-bold tracking-tight text-slate-950">{clientRecord?.full_name}</h1>
              <p className="mt-1 text-sm text-slate-500">{clientRecord?.email || "No email on file"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-[#18B7A0]/10 text-[#0F8D7E] hover:bg-[#18B7A0]/10">{getClientStatus(clientRecord)}</Badge>
                <Badge variant="outline" className="rounded-full">Last session: {progressNotes[0] ? formatDate(progressNotes[0].created_at) : "Not available"}</Badge>
                <Badge variant="outline" className="rounded-full">Next session: Not scheduled</Badge>
                <Badge variant="outline" className="rounded-full">Engagement {engagementScore}/100</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/dashboard/clients">
                <FileText className="w-4 h-4 mr-2" />
                Assign Homework
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={openProgressNoteForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
            <Button className="rounded-xl" onClick={generateSessionSummary} disabled={isSummaryLoading}>
              {isSummaryLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate AI Session Prep
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Homework Completion" value={totalAssignments > 0 ? `${completionRate}%` : "--"} detail={`${completedAssignments}/${totalAssignments} completed`} icon={CheckCircle2} tone="green" progress={completionRate} />
        <MetricCard title="Reflection Rate" value={reflectionRate !== null ? `${reflectionRate}%` : "--"} detail={`${journalReflectionCount} reflections submitted`} icon={MessageSquare} tone="purple" progress={reflectionRate || 0} />
        <MetricCard title="Mood Trend" value={moodTrend} detail={mostRecentMood ? `Latest ${mostRecentMood.mood_rating}/10` : "No check-ins yet"} icon={moodTrend === "declining" ? TrendingDown : TrendingUp} tone={moodTrend === "declining" ? "red" : moodTrend === "improving" ? "green" : "amber"} />
        <MetricCard title="Days Since Activity" value={daysSinceLastActivity !== null ? String(daysSinceLastActivity) : "--"} detail={formatRelativeActivity(lastActivityAt)} icon={Clock} tone={daysSinceLastActivity !== null && daysSinceLastActivity >= 14 ? "red" : "slate"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.25fr_0.85fr]">
        <div className="space-y-6">
          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="w-5 h-5 text-primary" />
                Session Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <EmptyPanel icon={Clock} title="No client activity yet." description="Sessions, homework, reflections, mood check-ins, and summaries will appear here." />
              ) : (
                <div className="space-y-0">
                  {timeline.slice(0, 12).map((item, index) => (
                    <TimelineRow key={`${item.date}-${item.label}-${index}`} item={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.75rem]">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Homework Progress
              </CardTitle>
              <Badge variant="outline" className="rounded-full">{assignedAssignments} assigned · {startedAssignments} in progress</Badge>
            </CardHeader>
            <CardContent>
              {homeworkProgressItems.length === 0 ? (
                <EmptyPanel icon={FileText} title="No homework assigned yet." description="Assigned homework and worksheet progress will appear here." />
              ) : (
                <div className="space-y-3">
                  {homeworkProgressItems.slice(0, 7).map((item) => (
                    <HomeworkCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-[1.75rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Reflection Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!latestReflection ? (
                  <EmptyPanel icon={MessageSquare} title="No reflections yet." description="Client journal entries will appear here." compact />
                ) : (
                  <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{latestReflection.title || "Untitled reflection"}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(latestReflection.created_at)}</p>
                      </div>
                      {latestReflection.mood_rating && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Mood {latestReflection.mood_rating}/10</Badge>}
                    </div>
                    <p className="line-clamp-5 text-sm leading-6 text-slate-600">{latestReflection.reflection_text}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Latest Mood Check-In
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!mostRecentMood ? (
                  <EmptyPanel icon={BarChart3} title="No mood check-ins yet." description="Client mood tracking will appear here." compact />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-bold text-slate-950">{mostRecentMood.mood_rating}/10</p>
                        <p className="text-xs text-slate-500">{formatDateTime(mostRecentMood.created_at)}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{moodTrend}</Badge>
                    </div>
                    <MoodBars items={moodCheckIns.slice(0, 8).reverse()} />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-slate-400">7-day avg</p>
                        <p className="font-semibold text-slate-700">{averageMood7 !== null ? `${averageMood7}/10` : "--"}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-slate-400">30-day avg</p>
                        <p className="font-semibold text-slate-700">{averageMood30 !== null ? `${averageMood30}/10` : "--"}</p>
                      </div>
                    </div>
                    {mostRecentMood.note && <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{mostRecentMood.note}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {latestSessionSummary && (
            <Card className="rounded-[1.75rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Latest AI Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge variant="outline" className="rounded-full">Generated {formatDateTime(latestSessionSummary.created_at)}</Badge>
                <SummaryBlock title="Client Overview" text={latestSessionSummary.summary_json?.clientOverview || "No client overview available."} />
                <SummaryBlock title="Homework Progress" text={latestSessionSummary.summary_json?.homeworkProgress || "No homework progress summary available."} />
                <SummaryBlock title="Suggested Discussion Topics" text={latestSessionSummary.summary_json?.suggestedDiscussionTopics?.join("\n") || "No discussion topics available."} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.75rem] border-amber-200/80 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attentionItems.length === 0 ? (
                <EmptyPanel icon={CheckCircle2} title="No concerns detected" description="Nothing needs immediate review based on available client activity." compact />
              ) : (
                <div className="space-y-2">
                  {attentionItems.map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-2xl bg-white/80 p-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200/70">
                      <Circle className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] bg-[#0F172A] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Sparkles className="w-5 h-5 text-[#18B7A0]" />
                AI Session Prep
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-white/65">Generate a focused pre-session brief from real homework, reflections, mood trends, and prior notes.</p>
              <div className="mt-5 space-y-2">
                <AvailabilityRow label="Homework available" available={homeworkAvailable} />
                <AvailabilityRow label="Reflection available" available={reflectionAvailable} />
                <AvailabilityRow label="Mood trend available" available={moodTrendAvailable} />
                <AvailabilityRow label="Previous notes available" available={previousNotesAvailable} />
              </div>
              <p className="mt-4 text-xs font-semibold text-[#18B7A0]">Estimated time: ~30 seconds</p>
              <Button className="mt-5 w-full rounded-xl bg-white text-slate-950 hover:bg-white/90" onClick={generateSessionSummary} disabled={isSummaryLoading}>
                {isSummaryLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Summary
              </Button>
            </CardContent>
          </Card>

          <Card id="progress-notes" className="rounded-[1.75rem]">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">Progress Notes</CardTitle>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={openProgressNoteForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </CardHeader>
            <CardContent>
              {progressNotes.length === 0 ? (
                <p className="text-sm text-slate-500">No progress notes saved yet.</p>
              ) : (
                <div className="space-y-3">
                  {progressNotes.slice(0, 3).map((progressNote) => (
                    <div key={progressNote.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Badge variant="outline">{progressNote.note_type || "DAP"}</Badge>
                        <p className="text-xs text-slate-500">{formatDate(progressNote.created_at)}</p>
                      </div>
                      <p className="line-clamp-3 text-sm text-slate-600">{progressNote.subjective || progressNote.private_note || progressNote.plan || "Progress note saved."}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle className="text-lg">Therapist Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-36 rounded-xl"
                placeholder="Private notes for session prep..."
              />
              <Button className="w-full rounded-xl" onClick={saveNote} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Notes
              </Button>
              {noteSaveMessage && <p className="text-sm text-primary">{noteSaveMessage}</p>}
              {noteSaveError && <p className="text-sm text-destructive">{noteSaveError}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isProgressNoteOpen} onOpenChange={setIsProgressNoteOpen}>
        <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write Progress Note</DialogTitle>
            <DialogDescription>
              Use real session context from this page. Do not add diagnoses unless clinically established outside ShrinkAid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {(["DAP", "SOAP"] as ProgressNoteType[]).map((noteType) => (
                <Button
                  key={noteType}
                  type="button"
                  variant={progressNoteForm.note_type === noteType ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => {
                    setProgressNoteForm((current) => ({
                      ...current,
                      note_type: noteType,
                      objective: noteType === "DAP" ? "" : current.objective,
                    }))
                  }}
                >
                  {noteType} note
                </Button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-2">Session context</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{buildProgressNoteContext()}</pre>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {progressNoteForm.note_type === "SOAP" ? "Subjective" : "Data"}
              </label>
              <Textarea
                value={progressNoteForm.subjective}
                onChange={(event) => updateProgressNoteField("subjective", event.target.value)}
                className="min-h-28 rounded-xl"
                placeholder={progressNoteForm.note_type === "SOAP" ? "Client-reported information..." : "Session data and client-reported information..."}
              />
            </div>

            {progressNoteForm.note_type === "SOAP" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Objective</label>
                <Textarea
                  value={progressNoteForm.objective}
                  onChange={(event) => updateProgressNoteField("objective", event.target.value)}
                  className="min-h-28 rounded-xl"
                  placeholder="Observable session information..."
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assessment</label>
              <Textarea
                value={progressNoteForm.assessment}
                onChange={(event) => updateProgressNoteField("assessment", event.target.value)}
                className="min-h-28 rounded-xl"
                placeholder="Therapist assessment without unsupported diagnoses..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Plan</label>
              <Textarea
                value={progressNoteForm.plan}
                onChange={(event) => updateProgressNoteField("plan", event.target.value)}
                className="min-h-28 rounded-xl"
                placeholder="Next steps, homework, follow-up plan..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Private note</label>
              <Textarea
                value={progressNoteForm.private_note}
                onChange={(event) => updateProgressNoteField("private_note", event.target.value)}
                className="min-h-36 rounded-xl"
                placeholder="Private therapist-only context..."
              />
            </div>

            <Button className="w-full rounded-xl" onClick={saveProgressNote} disabled={isProgressNoteSaving}>
              {isProgressNoteSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Progress Note
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  progress,
}: {
  title: string
  value: string
  detail: string
  icon: typeof CheckCircle2
  tone: "green" | "amber" | "red" | "purple" | "slate"
  progress?: number
}) {
  const toneClass = {
    green: "bg-[#18B7A0]/10 text-[#0F8D7E]",
    amber: "bg-amber-500/10 text-amber-700",
    red: "bg-red-500/10 text-red-700",
    purple: "bg-primary/10 text-primary",
    slate: "bg-slate-100 text-slate-600",
  }[tone]

  return (
    <Card className="rounded-[1.5rem]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 capitalize">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {typeof progress === "number" && (
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${tone === "green" ? "bg-[#18B7A0]" : "bg-primary"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  icon: typeof CheckCircle2
  title: string
  description: string
  compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 text-center ${compact ? "p-5" : "p-8"}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function TimelineRow({ item }: { item: TimelineItem }) {
  return (
    <div className="group relative flex gap-3 pb-5 last:pb-0">
      <div className="absolute left-5 top-10 h-[calc(100%-2.5rem)] w-px bg-slate-200 group-last:hidden" />
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-primary shadow-sm">
        {item.label.toLowerCase().includes("mood") ? <BarChart3 className="h-4 w-4" /> : item.label.toLowerCase().includes("summary") ? <Sparkles className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-slate-950">{item.label}</p>
          <p className="shrink-0 text-xs text-slate-400">{formatDate(item.date)}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.detail}</p>
      </div>
    </div>
  )
}

function HomeworkCard({
  item,
}: {
  item: {
    id: string
    title: string
    status: string
    date: string | null
    detail: string
  }
}) {
  const tone = getStatusTone(item.status)

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 transition-colors hover:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
          <p className="mt-1 text-xs text-slate-500">{item.detail} · {formatDate(item.date)}</p>
        </div>
        <StatusBadge status={item.status} tone={tone} />
      </div>
    </div>
  )
}

function StatusBadge({ status, tone }: { status: string; tone: string }) {
  const className = tone === "green"
    ? "bg-[#18B7A0]/10 text-[#0F8D7E]"
    : tone === "amber"
      ? "bg-amber-500/10 text-amber-700"
      : "bg-slate-100 text-slate-600"

  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{status}</span>
}

function MoodBars({ items }: { items: MoodCheckIn[] }) {
  if (items.length === 0) return null

  return (
    <div className="flex h-16 items-end gap-1.5 rounded-2xl bg-slate-50 p-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="min-w-0 flex-1 rounded-t-lg bg-primary/70"
          style={{ height: `${Math.max(12, item.mood_rating * 10)}%` }}
          title={`${item.mood_rating}/10`}
        />
      ))}
    </div>
  )
}

function SummaryBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="mb-1 text-sm font-semibold text-slate-950">{title}</p>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{text}</p>
    </div>
  )
}

function AvailabilityRow({ label, available }: { label: string; available: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3 py-2 text-sm">
      <span className="text-white/65">{label}</span>
      <span className={available ? "font-semibold text-[#18B7A0]" : "font-semibold text-white/40"}>
        {available ? "Available" : "Not yet"}
      </span>
    </div>
  )
}
