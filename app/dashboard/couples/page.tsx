"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Loader2,
  Plus,
  Send,
  StickyNote,
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"
import { logClientAuditEvent } from "@/lib/audit-client"

interface ClientRecord {
  id: string
  full_name: string
  email: string | null
}

interface CoupleRecord {
  id: string
  therapist_id: string
  partner_1_client_id: string
  partner_2_client_id: string
  relationship_name: string
  relationship_status: string | null
  created_at: string
}

interface CheckInRecord {
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
  created_at: string
  updated_at: string | null
}

interface AssignmentRecord {
  id: string
  couple_id: string | null
  client_id: string
  title: string
  completed: boolean | null
  status: string | null
  reflection: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

interface CoupleNoteRecord {
  id: string
  couple_id: string
  note: string
  created_at: string
}

type AssignmentTarget = "both" | "partner_1" | "partner_2"

function formatDate(date: string | null | undefined) {
  if (!date) return "Not available"
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function getClientName(clientsById: Map<string, ClientRecord>, clientId: string) {
  return clientsById.get(clientId)?.full_name || "Unknown client"
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
  console.error(`[v0] Couples: ${message}`, err)
  throw new Error(message)
}

function getLatestActivity(
  couple: CoupleRecord,
  checkIns: CheckInRecord[],
  assignments: AssignmentRecord[],
  notes: CoupleNoteRecord[],
) {
  const dates = [
    couple.created_at,
    ...checkIns.map((checkIn) => checkIn.updated_at || checkIn.created_at),
    ...assignments.flatMap((assignment) => [
      assignment.created_at,
      assignment.assigned_at,
      assignment.started_at,
      assignment.completed_at,
    ]),
    ...notes.map((note) => note.created_at),
  ].filter(Boolean) as string[]

  return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
}

export default function CouplesPage() {
  const [therapistId, setTherapistId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [couples, setCouples] = useState<CoupleRecord[]>([])
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [notes, setNotes] = useState<CoupleNoteRecord[]>([])
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [relationshipName, setRelationshipName] = useState("")
  const [partnerOneId, setPartnerOneId] = useState("")
  const [partnerTwoId, setPartnerTwoId] = useState("")
  const [assignmentTitle, setAssignmentTitle] = useState("")
  const [assignmentDescription, setAssignmentDescription] = useState("")
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget>("both")
  const [noteText, setNoteText] = useState("")

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])
  const selectedCouple = couples.find((couple) => couple.id === selectedCoupleId) || couples[0] || null

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getClient() as any
      const { therapistId: resolvedTherapistId, userEmail } = await getTherapistId()

      console.log("[v0] Couples: auth email:", userEmail)
      console.log("[v0] Couples: therapist id found:", resolvedTherapistId ?? "none")

      if (!resolvedTherapistId) {
        setError("No therapist account found for your email.")
        return
      }

      setTherapistId(resolvedTherapistId)

      const clientsResult = await supabase
        .from("clients")
        .select("id, full_name, email")
        .eq("therapist_id", resolvedTherapistId)
        .order("full_name", { ascending: true })

      if (clientsResult.error) throwQueryError("clients query failed", clientsResult.error)

      console.log("[v0] Couples: clients count:", clientsResult.data?.length ?? 0)
      setClients(clientsResult.data || [])

      const [couplesResult, checkInsResult, assignmentsResult, notesResult] = await Promise.all([
        supabase
          .from("couples")
          .select("*")
          .eq("therapist_id", resolvedTherapistId)
          .order("created_at", { ascending: false }),
        supabase
          .from("couple_check_ins")
          .select("*")
          .eq("therapist_id", resolvedTherapistId)
          .order("check_in_week", { ascending: false }),
        supabase
          .from("assignments")
          .select("id, couple_id, client_id, title, completed, status, reflection, assigned_at, started_at, completed_at, created_at")
          .eq("therapist_id", resolvedTherapistId)
          .not("couple_id", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("couple_notes")
          .select("id, couple_id, note, created_at")
          .eq("therapist_id", resolvedTherapistId)
          .order("created_at", { ascending: false }),
      ])

      if (couplesResult.error) throwQueryError("couples query failed", couplesResult.error)
      if (checkInsResult.error) throwQueryError("couple_check_ins query failed", checkInsResult.error)
      if (assignmentsResult.error) throwQueryError("assignments couple_id query failed", assignmentsResult.error)
      if (notesResult.error) throwQueryError("couple_notes query failed", notesResult.error)

      setCouples(couplesResult.data || [])
      setCheckIns(checkInsResult.data || [])
      setAssignments(assignmentsResult.data || [])
      setNotes(notesResult.data || [])

      if (!selectedCoupleId && couplesResult.data?.[0]?.id) {
        setSelectedCoupleId(couplesResult.data[0].id)
      }
    } catch (err) {
      console.error("[v0] Couples: failed to load data", err)
      setError(`Failed to load couples. ${getErrorMessage(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createCouple = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!therapistId) {
      setError("No therapist account found for your email.")
      return
    }

    if (partnerOneId === partnerTwoId) {
      setError("Choose two different clients.")
      return
    }

    setIsSaving(true)

    try {
      const supabase = getClient() as any
      const { data, error: insertError } = await supabase
        .from("couples")
        .insert({
          therapist_id: therapistId,
          partner_1_client_id: partnerOneId,
          partner_2_client_id: partnerTwoId,
          relationship_name: relationshipName.trim(),
          relationship_status: "active",
        })
        .select("id")
        .single()

      if (insertError) throw insertError

      setRelationshipName("")
      setPartnerOneId("")
      setPartnerTwoId("")
      setIsCreateOpen(false)
      setSelectedCoupleId(data.id)
      setSuccess("Couple created.")
      await fetchData()
    } catch (err) {
      console.error("[v0] Couples: failed to create couple", err)
      setError(err instanceof Error ? err.message : "Failed to create couple.")
    } finally {
      setIsSaving(false)
    }
  }

  const assignCouplesHomework = async () => {
    if (!therapistId || !selectedCouple || !assignmentTitle.trim()) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    const targetClientIds = assignmentTarget === "both"
      ? [selectedCouple.partner_1_client_id, selectedCouple.partner_2_client_id]
      : assignmentTarget === "partner_1"
        ? [selectedCouple.partner_1_client_id]
        : [selectedCouple.partner_2_client_id]

    try {
      const supabase = getClient() as any
      const assignedAt = new Date().toISOString()
      const payload = targetClientIds.map((clientId) => ({
        therapist_id: therapistId,
        client_id: clientId,
        couple_id: selectedCouple.id,
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim() || null,
        completed: false,
        status: "assigned",
        assigned_at: assignedAt,
      }))

      const { data: insertedAssignments, error: insertError } = await supabase
        .from("assignments")
        .insert(payload)
        .select("id, client_id")
      if (insertError) throw insertError

      await logClientAuditEvent({
        action: "assignment.create",
        resourceType: "assignment",
        resourceId: insertedAssignments?.[0]?.id || null,
        details: {
          assignmentType: "couples_homework",
          coupleId: selectedCouple.id,
          targetClientIds,
          assignmentIds: (insertedAssignments || []).map((assignment: { id: string }) => assignment.id),
          title: assignmentTitle.trim(),
        },
      })

      setAssignmentTitle("")
      setAssignmentDescription("")
      setAssignmentTarget("both")
      setSuccess("Couples homework assigned.")
      await fetchData()
    } catch (err) {
      console.error("[v0] Couples: failed to assign homework", err)
      setError(err instanceof Error ? err.message : "Failed to assign couples homework.")
    } finally {
      setIsSaving(false)
    }
  }

  const saveNote = async () => {
    if (!therapistId || !selectedCouple || !noteText.trim()) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = getClient() as any
      const { error: insertError } = await supabase.from("couple_notes").insert({
        therapist_id: therapistId,
        couple_id: selectedCouple.id,
        note: noteText.trim(),
      })

      if (insertError) throw insertError

      setNoteText("")
      setSuccess("Note saved.")
      await fetchData()
    } catch (err) {
      console.error("[v0] Couples: failed to save note", err)
      setError(err instanceof Error ? err.message : "Failed to save note.")
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCheckIns = selectedCouple ? checkIns.filter((checkIn) => checkIn.couple_id === selectedCouple.id) : []
  const selectedAssignments = selectedCouple ? assignments.filter((assignment) => assignment.couple_id === selectedCouple.id) : []
  const selectedNotes = selectedCouple ? notes.filter((note) => note.couple_id === selectedCouple.id) : []
  const latestWeek = selectedCheckIns[0]?.check_in_week || null
  const latestPartnerOne = selectedCouple && latestWeek
    ? selectedCheckIns.find((checkIn) => checkIn.check_in_week === latestWeek && checkIn.client_id === selectedCouple.partner_1_client_id)
    : null
  const latestPartnerTwo = selectedCouple && latestWeek
    ? selectedCheckIns.find((checkIn) => checkIn.check_in_week === latestWeek && checkIn.client_id === selectedCouple.partner_2_client_id)
    : null
  const satisfactionDifference = latestPartnerOne && latestPartnerTwo
    ? latestPartnerTwo.relationship_satisfaction - latestPartnerOne.relationship_satisfaction
    : null
  const majorDiscrepancy = satisfactionDifference !== null && Math.abs(satisfactionDifference) >= 3

  const trendData = useMemo(() => {
    if (!selectedCouple) return []

    const weeks = Array.from(new Set(selectedCheckIns.map((checkIn) => checkIn.check_in_week))).sort()

    return weeks.map((week) => {
      const weekCheckIns = selectedCheckIns.filter((checkIn) => checkIn.check_in_week === week)
      const average = (field: keyof Pick<CheckInRecord, "relationship_satisfaction" | "trust" | "communication" | "intimacy">) => {
        if (weekCheckIns.length === 0) return null
        return Number((weekCheckIns.reduce((sum, checkIn) => sum + checkIn[field], 0) / weekCheckIns.length).toFixed(1))
      }

      return {
        week: formatDate(week),
        satisfaction: average("relationship_satisfaction"),
        trust: average("trust"),
        communication: average("communication"),
        intimacy: average("intimacy"),
      }
    })
  }, [selectedCheckIns, selectedCouple])

  const timeline = useMemo(() => {
    if (!selectedCouple) return []

    return [
      { date: selectedCouple.created_at, label: "Couple created", detail: selectedCouple.relationship_name },
      ...selectedCheckIns.map((checkIn) => ({
        date: checkIn.updated_at || checkIn.created_at,
        label: "Check-in submitted",
        detail: `${getClientName(clientsById, checkIn.client_id)} for week of ${formatDate(checkIn.check_in_week)}`,
      })),
      ...selectedAssignments.flatMap((assignment) => [
        { date: assignment.assigned_at || assignment.created_at, label: "Homework assigned", detail: `${assignment.title} for ${getClientName(clientsById, assignment.client_id)}` },
        assignment.completed_at ? { date: assignment.completed_at, label: "Homework completed", detail: `${assignment.title} by ${getClientName(clientsById, assignment.client_id)}` } : null,
        assignment.reflection && assignment.completed_at ? { date: assignment.completed_at, label: "Reflection submitted", detail: assignment.title } : null,
      ].filter(Boolean) as { date: string; label: string; detail: string }[]),
      ...selectedNotes.map((note) => ({ date: note.created_at, label: "Note added", detail: note.note })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [clientsById, selectedAssignments, selectedCheckIns, selectedCouple, selectedNotes])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            Couples
          </motion.h1>
          <p className="text-muted-foreground mt-1">Manage relationship units, check-ins, and couples homework</p>
        </div>
        <Button className="rounded-xl" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Couple
        </Button>
      </div>

      {error && <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-primary/10 text-primary text-sm">{success}</div>}

      {couples.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center">
            <HeartHandshake className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-semibold text-foreground">No couples yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create a relationship unit by linking two existing clients.</p>
            <Button className="rounded-xl" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Couple
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid xl:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-4">
            {couples.map((couple) => {
              const coupleCheckIns = checkIns.filter((checkIn) => checkIn.couple_id === couple.id)
              const coupleAssignments = assignments.filter((assignment) => assignment.couple_id === couple.id)
              const coupleNotes = notes.filter((note) => note.couple_id === couple.id)
              const lastActivity = getLatestActivity(couple, coupleCheckIns, coupleAssignments, coupleNotes)

              return (
                <Card
                  key={couple.id}
                  className={`rounded-2xl cursor-pointer transition-shadow ${selectedCouple?.id === couple.id ? "border-primary shadow-md" : "hover:shadow-md"}`}
                  onClick={() => setSelectedCoupleId(couple.id)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-foreground">{couple.relationship_name}</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getClientName(clientsById, couple.partner_1_client_id)} and {getClientName(clientsById, couple.partner_2_client_id)}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">{couple.relationship_status || "active"}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div>
                        <p>Last activity</p>
                        <p className="text-foreground font-medium">{formatDate(lastActivity)}</p>
                      </div>
                      <div>
                        <p>Shared assignments</p>
                        <p className="text-foreground font-medium">{coupleAssignments.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {selectedCouple && (
            <div className="space-y-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-primary" />
                    {selectedCouple.relationship_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Partner A</p>
                    <p className="font-medium">{getClientName(clientsById, selectedCouple.partner_1_client_id)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Partner B</p>
                    <p className="font-medium">{getClientName(clientsById, selectedCouple.partner_2_client_id)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Relationship status</p>
                    <Badge variant="outline" className="mt-1 capitalize">{selectedCouple.relationship_status || "active"}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(selectedCouple.created_at)}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className={`rounded-2xl ${majorDiscrepancy ? "border-destructive/60" : ""}`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {majorDiscrepancy && <AlertTriangle className="w-5 h-5 text-destructive" />}
                      Therapist View
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!latestPartnerOne && !latestPartnerTwo ? (
                      <p className="text-sm text-muted-foreground">No relationship check-ins submitted yet.</p>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {[latestPartnerOne, latestPartnerTwo].map((checkIn, index) => (
                            <div key={index} className="p-4 rounded-xl bg-muted/30">
                              <p className="text-sm font-medium">
                                {index === 0
                                  ? getClientName(clientsById, selectedCouple.partner_1_client_id)
                                  : getClientName(clientsById, selectedCouple.partner_2_client_id)}
                              </p>
                              {checkIn ? (
                                <div className="mt-3 space-y-2 text-sm">
                                  <p>Satisfaction: <span className="font-semibold">{checkIn.relationship_satisfaction}</span></p>
                                  <p>Trust: <span className="font-semibold">{checkIn.trust}</span></p>
                                  <p>Communication: <span className="font-semibold">{checkIn.communication}</span></p>
                                  <p>Intimacy: <span className="font-semibold">{checkIn.intimacy}</span></p>
                                  <p>Conflict: <span className="font-semibold">{checkIn.conflict_level}</span></p>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground mt-3">No check-in for latest week.</p>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className={`p-4 rounded-xl ${majorDiscrepancy ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                          <p className="text-sm font-medium">
                            Difference: {satisfactionDifference !== null ? satisfactionDifference : "Not available"}
                          </p>
                          {majorDiscrepancy && (
                            <p className="text-xs mt-1">Major discrepancy highlighted because partner satisfaction differs by 3 or more.</p>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Trend Graphs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trendData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Trends will appear after check-ins are submitted.</p>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                            <YAxis domain={[1, 10]} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="satisfaction" stroke="hsl(var(--chart-1))" name="Satisfaction" strokeWidth={2} />
                            <Line type="monotone" dataKey="trust" stroke="hsl(var(--chart-2))" name="Trust" strokeWidth={2} />
                            <Line type="monotone" dataKey="communication" stroke="hsl(var(--chart-3))" name="Communication" strokeWidth={2} />
                            <Line type="monotone" dataKey="intimacy" stroke="hsl(var(--chart-4))" name="Intimacy" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Couples Homework</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assign to</Label>
                      <Select value={assignmentTarget} onValueChange={(value) => setAssignmentTarget(value as AssignmentTarget)}>
                        <SelectTrigger className="h-11 rounded-xl w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Both partners</SelectItem>
                          <SelectItem value="partner_1">{getClientName(clientsById, selectedCouple.partner_1_client_id)}</SelectItem>
                          <SelectItem value="partner_2">{getClientName(clientsById, selectedCouple.partner_2_client_id)}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Instructions</Label>
                      <Textarea value={assignmentDescription} onChange={(event) => setAssignmentDescription(event.target.value)} className="min-h-24 rounded-xl" />
                    </div>
                    <Button className="rounded-xl" onClick={assignCouplesHomework} disabled={isSaving || !assignmentTitle.trim()}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Assign Homework
                    </Button>
                    <div className="space-y-2 pt-2">
                      <p className="text-sm font-medium">Shared assignments</p>
                      {selectedAssignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No couples homework assigned yet.</p>
                      ) : (
                        selectedAssignments.slice(0, 6).map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 text-sm">
                            <div>
                              <p className="font-medium">{assignment.title}</p>
                              <p className="text-xs text-muted-foreground">{getClientName(clientsById, assignment.client_id)}</p>
                            </div>
                            <Badge variant="outline">{assignment.completed || assignment.status === "completed" ? "Completed" : assignment.status || "Assigned"}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Relationship Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timeline.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No relationship activity yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                        {timeline.map((item, index) => (
                          <div key={`${item.date}-${item.label}-${index}`} className="flex gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{item.detail}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-primary" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    className="min-h-24 rounded-xl"
                    placeholder="Private relationship note..."
                  />
                  <Button className="rounded-xl" onClick={saveNote} disabled={isSaving || !noteText.trim()}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Save Note
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create Couple</DialogTitle>
            <DialogDescription>Link two existing clients into one relationship unit.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createCouple}>
            <div className="space-y-2">
              <Label>Relationship name</Label>
              <Input
                value={relationshipName}
                onChange={(event) => setRelationshipName(event.target.value)}
                placeholder="John & Sarah"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Partner 1</Label>
                <Select value={partnerOneId} onValueChange={setPartnerOneId}>
                  <SelectTrigger className="h-11 rounded-xl w-full">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Partner 2</Label>
                <Select value={partnerTwoId} onValueChange={setPartnerTwoId}>
                  <SelectTrigger className="h-11 rounded-xl w-full">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full rounded-xl" disabled={isSaving || !relationshipName.trim() || !partnerOneId || !partnerTwoId}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Couple
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
