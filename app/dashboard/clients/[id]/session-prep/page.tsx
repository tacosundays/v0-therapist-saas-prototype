"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Clock, FileText, Loader2, Plus, Save, UserRound } from "lucide-react"
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
  last_login?: string | null
  last_login_at?: string | null
  last_seen_at?: string | null
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
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([])
  const [noteId, setNoteId] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isProgressNoteOpen, setIsProgressNoteOpen] = useState(false)
  const [isProgressNoteSaving, setIsProgressNoteSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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

        const [assignmentsResult, worksheetsResult, notesResult, progressNotesResult] = await Promise.all([
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
        ])

        if (assignmentsResult.error) throwQueryError("assignments query failed", assignmentsResult.error)
        if (worksheetsResult.error) throwQueryError("worksheet_assignments query failed", worksheetsResult.error)
        if (notesResult.error) throwQueryError("session_prep_notes query failed", notesResult.error)
        if (progressNotesResult.error) throwQueryError("progress_notes query failed", progressNotesResult.error)

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
        setProgressNotes((progressNotesResult.data || []) as ProgressNote[])
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

  const regularReflections = assignments
    .filter((assignment) => assignment.reflection?.trim())
    .map((assignment) => ({
      id: assignment.id,
      text: assignment.reflection || "",
      date: assignment.completed_at || assignment.created_at,
      assignmentTitle: assignment.title,
    }))

  const worksheetReflections = worksheetResponses
    .map((response) => ({
      id: response.id,
      text: answerToText(response),
      date: response.updated_at || response.created_at,
      assignmentTitle: worksheetTitleById.get(response.assignment_id) || "Worksheet response",
    }))
    .filter((response) => response.text)

  const reflections = [...regularReflections, ...worksheetReflections]
    .filter((reflection) => reflection.date)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
    .slice(0, 5)

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

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20)
  }, [assignments, clientRecord, worksheetAssignments, worksheetResponses, worksheetTitleById])

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
      ...(reflections.length > 0
        ? reflections.slice(0, 3).map((reflection) => `- ${reflection.assignmentTitle}: ${reflection.text}`)
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

  const saveNote = async () => {
    if (!therapistId || !clientRecord) return

    setIsSaving(true)
    setSuccess(null)
    setError(null)

    try {
      const supabase = getClient() as any

      if (noteId) {
        const { error: updateError } = await supabase
          .from("session_prep_notes")
          .update({ note })
          .eq("id", noteId)
          .eq("therapist_id", therapistId)

        if (updateError) throwQueryError("session_prep_notes update failed", updateError)
      } else {
        const { data, error: insertError } = await supabase
          .from("session_prep_notes")
          .insert({
            therapist_id: therapistId,
            client_id: clientRecord.id,
            note,
          })
          .select("id")
          .single()

        if (insertError) throwQueryError("session_prep_notes insert failed", insertError)
        setNoteId(data.id)
      }

      setSuccess("Session notes saved.")
    } catch (err) {
      console.error("[v0] Session Prep: failed to save note", err)
      setError(`Failed to save note. ${getErrorMessage(err)}`)
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

  const lastLogin = clientRecord?.last_login_at || clientRecord?.last_login || clientRecord?.last_seen_at || null

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="ghost" className="rounded-xl mb-3" asChild>
            <Link href="/dashboard/clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to clients
            </Link>
          </Button>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            Session Prep
          </motion.h1>
          <p className="text-muted-foreground mt-1">One-page pre-session summary from real client activity</p>
        </div>
        <Button className="rounded-xl" onClick={openProgressNoteForm}>
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

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserRound className="w-5 h-5 text-primary" />
            Client Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium text-foreground">{clientRecord?.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className="mt-1">{getClientStatus(clientRecord)}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registered date</p>
              <p className="font-medium text-foreground">{formatDate(clientRecord?.invite_accepted_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last login</p>
              <p className="font-medium text-foreground">{formatDate(lastLogin)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total assignments</p>
              <p className="text-2xl font-bold text-foreground">{totalAssignments}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed assignments</p>
              <p className="text-2xl font-bold text-foreground">{completedAssignments}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completion rate</p>
              <p className="text-2xl font-bold text-foreground">{totalAssignments > 0 ? `${completionRate}%` : "--"}</p>
            </div>
            <div>
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Reflection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reflections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reflection submissions yet.</p>
            ) : (
              <div className="space-y-4">
                {reflections.map((reflection) => (
                  <div key={reflection.id} className="p-4 rounded-xl bg-muted/30">
                    <p className="text-sm text-foreground line-clamp-4">{reflection.text}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{reflection.assignmentTitle}</span>
                      <span>{formatDateTime(reflection.date)}</span>
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
