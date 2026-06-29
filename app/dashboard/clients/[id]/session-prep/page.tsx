"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Clock, FileText, Loader2, Plus, Save, Sparkles, UserRound } from "lucide-react"
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

function getClientStatus(client: ClientRecord | null) {
  if (!client) return "Unknown"
  if (client.status === "active") return "Active"
  if (client.user_id || client.invite_accepted_at) return "Registered"
  if (client.invite_sent_at) return "Email Sent"
  return "Invited"
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
  const moodRatings = clientReflections
    .map((reflection) => reflection.mood_rating)
    .filter((rating): rating is number => typeof rating === "number")
  const averageMoodRating = moodRatings.length > 0
    ? Number((moodRatings.reduce((sum, rating) => sum + rating, 0) / moodRatings.length).toFixed(1))
    : null
  const mostRecentReflectionDate = clientReflections[0]?.created_at || null
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

  const lastLogin = null

  return (
    <div className="max-w-6xl space-y-8">
      <div className="saas-page-header flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button variant="ghost" className="mb-3" asChild>
            <Link href="/dashboard/clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to clients
            </Link>
          </Button>
          <p className="saas-eyebrow mb-2">Client intelligence</p>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight text-slate-950"
          >
            Session Prep
          </motion.h1>
          <p className="mt-2 text-sm text-slate-500">One-page pre-session summary from real client activity</p>
        </div>
        <Button onClick={openProgressNoteForm}>
          <Plus className="w-4 h-4 mr-2" />
          Write Progress Note
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-primary/10 text-primary text-sm">{success}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserRound className="w-5 h-5 text-primary" />
            Client Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium text-foreground">{clientRecord?.full_name}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className="mt-1">{getClientStatus(clientRecord)}</Badge>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-xs text-muted-foreground">Registered date</p>
              <p className="font-medium text-foreground">{formatDate(clientRecord?.invite_accepted_at)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-xs text-muted-foreground">Last login</p>
              <p className="font-medium text-foreground">{formatDate(lastLogin)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-xs text-muted-foreground">Total assignments</p>
              <p className="text-2xl font-bold text-foreground">{totalAssignments}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-xs text-muted-foreground">Completed assignments</p>
              <p className="text-2xl font-bold text-foreground">{completedAssignments}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-xs text-muted-foreground">Completion rate</p>
              <p className="text-2xl font-bold text-foreground">{totalAssignments > 0 ? `${completionRate}%` : "--"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <p className="text-xs text-muted-foreground">Current status</p>
              <p className="font-medium text-foreground">{assignedAssignments} assigned, {startedAssignments} started</p>
            </div>
          </div>
          {lastCompletedAssignment && (
            <div className="mt-5 p-4 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">Last completed assignment</p>
              <p className="font-medium text-foreground">{lastCompletedAssignment.title}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(lastCompletedAssignment.completedAt)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Session Summary
          </CardTitle>
          <Button className="rounded-xl" onClick={generateSessionSummary} disabled={isSummaryLoading}>
            {isSummaryLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {!latestSessionSummary ? (
            <div className="p-4 rounded-xl bg-muted/30">
              <p className="text-sm text-muted-foreground">
                No AI session summaries generated yet.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Generated {formatDateTime(latestSessionSummary.created_at)}</Badge>
                {latestSessionSummary.model && <Badge variant="outline">{latestSessionSummary.model}</Badge>}
              </div>

              <div className="grid gap-4">
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-medium text-foreground mb-1">Client Overview</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {latestSessionSummary.summary_json?.clientOverview || "No client overview available."}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-medium text-foreground mb-1">Progress Since Last Session</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {latestSessionSummary.summary_json?.progressSinceLastSession || "No progress summary available."}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-medium text-foreground mb-1">Mood Trends</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {latestSessionSummary.summary_json?.moodTrends || "No mood trend summary available."}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-medium text-foreground mb-1">Reflection Themes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {latestSessionSummary.summary_json?.reflectionThemes || "No reflection theme summary available."}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-medium text-foreground mb-1">Homework Progress</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {latestSessionSummary.summary_json?.homeworkProgress || "No homework progress summary available."}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-medium text-foreground mb-2">Suggested Discussion Topics</p>
                  {latestSessionSummary.summary_json?.suggestedDiscussionTopics?.length ? (
                    <div className="space-y-2">
                      {latestSessionSummary.summary_json.suggestedDiscussionTopics.map((topic, index) => (
                        <p key={`${topic}-${index}`} className="text-sm text-muted-foreground">
                          {index + 1}. {topic}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No discussion topics available.</p>
                  )}
                </div>
              </div>

              {latestSessionSummary.source_counts && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(latestSessionSummary.source_counts).map(([label, count]) => (
                    <Badge key={label} variant="secondary" className="capitalize">
                      {label.replace(/([A-Z])/g, " $1")}: {count}
                    </Badge>
                  ))}
                </div>
              )}

              {sessionSummaries.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Summary History</p>
                  <div className="space-y-2">
                    {sessionSummaries.slice(1).map((summary) => (
                      <div key={summary.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                        <p className="text-sm text-foreground">Generated summary</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(summary.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Mood Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {moodCheckIns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mood check-ins submitted yet.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">30-day average</p>
                  <p className="text-2xl font-bold text-foreground">{averageMood30 !== null ? `${averageMood30}/10` : "--"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">7-day average</p>
                  <p className="text-2xl font-bold text-foreground">{averageMood7 !== null ? `${averageMood7}/10` : "--"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">Most recent</p>
                  <p className="text-2xl font-bold text-foreground">{mostRecentMood ? `${mostRecentMood.mood_rating}/10` : "--"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                  <p className="text-2xl font-bold text-foreground">{moodCheckIns.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">Trend</p>
                  <p className="font-semibold text-foreground capitalize">{moodTrend}</p>
                </div>
              </div>
              {mostRecentMood?.note && (
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground">Most recent note</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{mostRecentMood.note}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDateTime(mostRecentMood.created_at)}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Reflection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              <div className="p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground">Reflection count</p>
                <p className="text-2xl font-bold text-foreground">{journalReflectionCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground">Average mood</p>
                <p className="text-2xl font-bold text-foreground">{averageMoodRating !== null ? `${averageMoodRating}/10` : "--"}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground">Most recent</p>
                <p className="font-medium text-foreground">{formatDate(mostRecentReflectionDate)}</p>
              </div>
            </div>

            {clientReflections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reflection journal submissions yet.</p>
            ) : (
              <div className="space-y-4">
                {clientReflections.slice(0, 10).map((reflection) => (
                  <div key={reflection.id} className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-foreground">{reflection.title || "Untitled reflection"}</p>
                      {reflection.mood_rating && (
                        <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary shrink-0">
                          Mood {reflection.mood_rating}/10
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground line-clamp-4 whitespace-pre-wrap">{reflection.reflection_text}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Reflection Journal</span>
                      <span>{formatDateTime(reflection.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client activity yet.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((item, index) => (
                  <div key={`${item.date}-${item.label}-${index}`} className="flex gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(item.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="progress-notes" className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Progress Notes
          </CardTitle>
          <Button className="rounded-xl" onClick={openProgressNoteForm}>
            <Plus className="w-4 h-4 mr-2" />
            Write Progress Note
          </Button>
        </CardHeader>
        <CardContent>
          {progressNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No progress notes saved yet.</p>
          ) : (
            <div className="space-y-4">
              {progressNotes.map((progressNote) => (
                <div key={progressNote.id} className="p-4 rounded-xl bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">{progressNote.note_type || "DAP"}</Badge>
                    <p className="text-xs text-muted-foreground">{formatDateTime(progressNote.created_at)}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    {progressNote.subjective && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {progressNote.note_type === "SOAP" ? "Subjective" : "Data"}
                        </p>
                        <p className="text-foreground whitespace-pre-wrap">{progressNote.subjective}</p>
                      </div>
                    )}
                    {progressNote.objective && progressNote.note_type === "SOAP" && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Objective</p>
                        <p className="text-foreground whitespace-pre-wrap">{progressNote.objective}</p>
                      </div>
                    )}
                    {progressNote.assessment && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Assessment</p>
                        <p className="text-foreground whitespace-pre-wrap">{progressNote.assessment}</p>
                      </div>
                    )}
                    {progressNote.plan && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Plan</p>
                        <p className="text-foreground whitespace-pre-wrap">{progressNote.plan}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Therapist Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-40 rounded-xl"
            placeholder="Private notes for session prep..."
          />
          <Button className="rounded-xl" onClick={saveNote} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Notes
              </>
            )}
          </Button>
          {noteSaveMessage && (
            <p className="text-sm text-primary">{noteSaveMessage}</p>
          )}
          {noteSaveError && (
            <p className="text-sm text-destructive">{noteSaveError}</p>
          )}
        </CardContent>
      </Card>

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
