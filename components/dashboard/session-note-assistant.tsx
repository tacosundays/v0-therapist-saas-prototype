"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clipboard,
  Copy,
  FileText,
  Loader2,
  Lock,
  Pencil,
  Printer,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type NoteFormat = "SOAP" | "DAP" | "BIRP" | "GIRP" | "Narrative"
type NoteStatus = "Draft" | "Finalized" | "Amended" | "Locked"
type SectionKey = "subjective" | "objective" | "assessment" | "plan"

interface SessionNoteClient {
  id: string
  full_name: string
}

interface SessionDefaults {
  date?: string | null
  start?: string | null
  end?: string | null
  sessionType?: string | null
  location?: string | null
  participants?: string | null
}

interface SessionNoteContext {
  carePlanGoals: string[]
  objectives: string[]
  interventions: string[]
  homework: string[]
  reflections: string[]
  moodCheckIns: string[]
  previousSessionSummary: string | null
}

interface SessionNoteAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: SessionNoteClient | null
  defaults?: SessionDefaults
  context: SessionNoteContext
}

interface SessionFields {
  sessionDate: string
  startTime: string
  endTime: string
  sessionType: string
  location: string
  participants: string
  format: NoteFormat
  summary: string
  observations: string
  interventionsUsed: string
  clientResponse: string
  progressTowardGoals: string
  riskSafety: string
  planFollowUp: string
}

interface DraftSections {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

const noteFormats: NoteFormat[] = ["SOAP", "DAP", "BIRP", "GIRP", "Narrative"]
const defaultSources = {
  carePlanGoals: true,
  homework: true,
  reflections: true,
  moodCheckIns: true,
  previousSessionSummary: true,
  sessionDetails: true,
}

export function SessionNoteAssistant({
  open,
  onOpenChange,
  client,
  defaults,
  context,
}: SessionNoteAssistantProps) {
  const [fields, setFields] = useState<SessionFields>(() => initialFields(defaults))
  const [sources, setSources] = useState(defaultSources)
  const [draft, setDraft] = useState<DraftSections | null>(null)
  const [status, setStatus] = useState<NoteStatus>("Draft")
  const [message, setMessage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasUserEditedDraft, setHasUserEditedDraft] = useState(false)
  const [hasExplicitSave, setHasExplicitSave] = useState(false)
  const [saveState, setSaveState] = useState<"Idle" | "Saving" | "Saved" | "Failed">("Idle")
  const [pendingSuggestion, setPendingSuggestion] = useState<{ key: SectionKey; text: string } | null>(null)
  const [showContext, setShowContext] = useState(false)
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null)
  const [amendmentReason, setAmendmentReason] = useState("")

  useEffect(() => {
    if (!open) return
    setFields(initialFields(defaults))
    setMessage(null)
    setPendingSuggestion(null)
  }, [defaults, open])

  useEffect(() => {
    if (!open || !client || !draft || (!hasUserEditedDraft && !hasExplicitSave) || status !== "Draft") return

    setSaveState("Saving")
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          `shrinkaid:session-note-draft:${client.id}`,
          JSON.stringify({ fields, draft, savedAt: new Date().toISOString() }),
        )
        setSaveState("Saved")
      } catch {
        setSaveState("Failed")
      }
    }, 650)

    return () => window.clearTimeout(timeout)
  }, [client, draft, fields, hasExplicitSave, hasUserEditedDraft, open, status])

  const fullNote = useMemo(() => {
    if (!draft) return ""
    if (fields.format === "Narrative") {
      return [
        "Narrative Progress Note",
        "",
        draft.subjective,
        "",
        draft.objective,
        "",
        draft.assessment,
        "",
        draft.plan,
      ].join("\n")
    }

    return [
      `${fields.format} Progress Note`,
      "",
      `${sectionLabels(fields.format).subjective}:`,
      draft.subjective,
      "",
      `${sectionLabels(fields.format).objective}:`,
      draft.objective,
      "",
      `${sectionLabels(fields.format).assessment}:`,
      draft.assessment,
      "",
      `${sectionLabels(fields.format).plan}:`,
      draft.plan,
    ].join("\n")
  }, [draft, fields.format])

  const sourceGroups = [
    { key: "carePlanGoals", label: "Care Plan goals", items: context.carePlanGoals },
    { key: "homework", label: "Homework reviewed", items: context.homework },
    { key: "reflections", label: "Reflections reviewed", items: context.reflections },
    { key: "moodCheckIns", label: "Mood check-ins reviewed", items: context.moodCheckIns },
    { key: "previousSessionSummary", label: "Prior session summary", items: context.previousSessionSummary ? [context.previousSessionSummary] : [] },
    { key: "sessionDetails", label: "Therapist-entered session details", items: sessionDetailItems(fields) },
  ] as const

  const updateField = (key: keyof SessionFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }))
  }

  const updateDraft = (key: SectionKey, value: string) => {
    setDraft((current) => current ? { ...current, [key]: value } : current)
    setHasUserEditedDraft(true)
  }

  const generateDraft = () => {
    setIsGenerating(true)
    setMessage(null)
    window.setTimeout(() => {
      setDraft(buildDraft(fields, context, sources))
      setStatus("Draft")
      setHasUserEditedDraft(false)
      setHasExplicitSave(false)
      setSaveState("Idle")
      setIsGenerating(false)
      setMessage("Draft generated for therapist review. It has not been saved.")
    }, 450)
  }

  const saveDraft = () => {
    if (!client || !draft) return
    try {
      window.localStorage.setItem(
        `shrinkaid:session-note-draft:${client.id}`,
        JSON.stringify({ fields, draft, savedAt: new Date().toISOString() }),
      )
      setHasExplicitSave(true)
      setSaveState("Saved")
      setMessage("Draft saved locally in this browser. Permanent saving requires the documentation database workflow.")
    } catch {
      setSaveState("Failed")
      setMessage("We couldn't save your changes. Your text has not been cleared.")
    }
  }

  const finalizeNote = () => {
    if (!draft) return
    setStatus("Finalized")
    setFinalizedAt(new Date().toISOString())
    setMessage("Marked finalized locally for review. Immutable finalization requires the protected database and audit workflow.")
  }

  const amendNote = () => {
    if (!draft || !amendmentReason.trim()) {
      setMessage("Add an amendment reason before changing a finalized note.")
      return
    }
    setStatus("Amended")
    setMessage("Amendment started locally. Version history requires the protected documentation tables.")
  }

  const lockNote = () => {
    setStatus("Locked")
    setMessage("Note locked locally. Authorized amendment controls require the protected documentation workflow.")
  }

  const copyNote = async () => {
    if (!fullNote) return
    try {
      await navigator.clipboard.writeText(fullNote)
      setMessage("Note copied.")
    } catch {
      setMessage("Copy failed. Your text remains available.")
    }
  }

  const saveDefaultFormat = () => {
    try {
      window.localStorage.setItem("shrinkaid:session-note-default-format", fields.format)
      setMessage(`${fields.format} set as your default note format in this browser.`)
    } catch {
      setMessage("Default format could not be saved in this browser.")
    }
  }

  const suggestSection = (key: SectionKey) => {
    if (!draft) return
    setPendingSuggestion({
      key,
      text: refineSection(draft[key], key, fields, context),
    })
  }

  const sectionCopy = sectionLabels(fields.format)
  const isReadOnly = status === "Locked"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-6xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-5 w-5 text-primary" />
                Session Note Assistant
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl">
                Draft structured progress notes from therapist-entered information and selected client context.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full">{status}</Badge>
              {finalizedAt && <Badge variant="outline" className="rounded-full">Finalized {formatDateTime(finalizedAt)}</Badge>}
              {saveState !== "Idle" && <Badge variant="outline" className="rounded-full">{saveLabel(saveState)}</Badge>}
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          AI-generated documentation requires therapist review and may contain omissions or inaccuracies.
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <Panel title="Session Details" icon={CalendarClock}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Client">
                  <Input value={client?.full_name || "Client not selected"} readOnly className="rounded-xl bg-slate-50" />
                </Field>
                <Field label="Session date">
                  <Input type="date" value={fields.sessionDate} onChange={(event) => updateField("sessionDate", event.target.value)} className="rounded-xl" />
                </Field>
                <Field label="Start time">
                  <Input type="time" value={fields.startTime} onChange={(event) => updateField("startTime", event.target.value)} className="rounded-xl" />
                </Field>
                <Field label="End time">
                  <Input type="time" value={fields.endTime} onChange={(event) => updateField("endTime", event.target.value)} className="rounded-xl" />
                </Field>
                <Field label="Session type">
                  <Input value={fields.sessionType} onChange={(event) => updateField("sessionType", event.target.value)} placeholder="Individual, couple, family..." className="rounded-xl" />
                </Field>
                <Field label="Location or telehealth">
                  <Input value={fields.location} onChange={(event) => updateField("location", event.target.value)} placeholder="Telehealth, office..." className="rounded-xl" />
                </Field>
              </div>
              <Field label="Participants">
                <Input value={fields.participants} onChange={(event) => updateField("participants", event.target.value)} placeholder="Client, caregiver, partner..." className="rounded-xl" />
              </Field>
              <Field label="Note format">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={fields.format} onValueChange={(value) => updateField("format", value as NoteFormat)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {noteFormats.map((format) => <SelectItem key={format} value={format}>{format}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={saveDefaultFormat}>
                    Set Default
                  </Button>
                </div>
              </Field>
            </Panel>

            <Panel title="Therapist-Entered Content" icon={Pencil}>
              <TextAreaField label="Session summary" value={fields.summary} onChange={(value) => updateField("summary", value)} placeholder="What happened in session?" />
              <TextAreaField label="Clinical observations" value={fields.observations} onChange={(value) => updateField("observations", value)} placeholder="Observable presentation, affect, participation, themes..." />
              <TextAreaField label="Interventions used" value={fields.interventionsUsed} onChange={(value) => updateField("interventionsUsed", value)} placeholder="Only include interventions actually used." />
              <TextAreaField label="Client response" value={fields.clientResponse} onChange={(value) => updateField("clientResponse", value)} placeholder="How did the client respond?" />
              <TextAreaField label="Progress toward goals" value={fields.progressTowardGoals} onChange={(value) => updateField("progressTowardGoals", value)} placeholder="Therapist-entered progress observations." />
              <TextAreaField label="Risk and safety observations" value={fields.riskSafety} onChange={(value) => updateField("riskSafety", value)} placeholder="Enter only what was assessed or observed. Leave blank if not addressed." />
              <TextAreaField label="Plan and follow-up" value={fields.planFollowUp} onChange={(value) => updateField("planFollowUp", value)} placeholder="Next steps, homework, scheduling, follow-up." />
              <Button className="w-full rounded-xl" onClick={generateDraft} disabled={isGenerating || !client}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Note Draft
              </Button>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Editable Draft" icon={Clipboard}>
              {!draft ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                  Enter the session details you know, select context sources, then generate a draft. Missing information will be marked for therapist completion.
                </div>
              ) : (
                <div className="space-y-4">
                  {(Object.keys(draft) as SectionKey[]).map((key) => (
                    <div key={key} className="rounded-2xl border border-slate-200/80 bg-white p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <Label className="font-semibold">{sectionCopy[key]}</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => suggestSection(key)} disabled={isReadOnly}>
                            <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                            Suggest Revision
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => updateDraft(key, shortenText(draft[key]))} disabled={isReadOnly}>
                            Shorten
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => updateDraft(key, objectiveText(draft[key]))} disabled={isReadOnly}>
                            More Objective
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => updateDraft(key, removeUnsupportedText(draft[key]))} disabled={isReadOnly}>
                            Remove Unsupported
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={draft[key]}
                        onChange={(event) => updateDraft(key, event.target.value)}
                        readOnly={isReadOnly}
                        className="min-h-28 rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              )}

              {pendingSuggestion && (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Suggested revision for {sectionCopy[pendingSuggestion.key]}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{pendingSuggestion.text}</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      disabled={isReadOnly}
                      onClick={() => {
                        updateDraft(pendingSuggestion.key, pendingSuggestion.text)
                        setPendingSuggestion(null)
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" onClick={copyNote} disabled={!draft}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Note
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => window.print()} disabled={!draft}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={saveDraft} disabled={!draft || isReadOnly}>
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button className="rounded-xl" onClick={finalizeNote} disabled={!draft || isReadOnly}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Finalize
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={lockNote} disabled={!draft || status !== "Finalized"}>
                  <Lock className="mr-2 h-4 w-4" />
                  Lock
                </Button>
              </div>

              {status === "Finalized" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <Label htmlFor="amendment-reason">Amendment reason</Label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Input id="amendment-reason" value={amendmentReason} onChange={(event) => setAmendmentReason(event.target.value)} className="rounded-xl" />
                    <Button variant="outline" className="rounded-xl" onClick={amendNote}>Start Amendment</Button>
                  </div>
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {message}
                </div>
              )}
            </Panel>

            <Panel title="Context Used" icon={ShieldCheck}>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowContext((current) => !current)}>
                {showContext ? "Hide Context" : "Show Context"}
              </Button>
              {showContext && (
                <div className="space-y-3">
                  {sourceGroups.map((group) => (
                    <div key={group.key} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-semibold text-slate-900">{group.label}</Label>
                        <Checkbox
                          checked={sources[group.key]}
                          onCheckedChange={(checked) => setSources((current) => ({ ...current, [group.key]: checked === true }))}
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        {group.items.length > 0 ? (
                          group.items.slice(0, 4).map((item) => <p key={item} className="line-clamp-2 text-sm leading-6 text-slate-600">{item}</p>)
                        ) : (
                          <p className="text-sm text-slate-400">No source selected or available.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {status === "Finalized" || status === "Amended" ? (
              <Panel title="Optional Next Steps" icon={CheckCircle2}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" className="rounded-xl">Assign Homework</Button>
                  <Button variant="outline" className="rounded-xl">Review Care Plan</Button>
                  <Button variant="outline" className="rounded-xl">Schedule Next Session</Button>
                  <Button variant="outline" className="rounded-xl">Open Client Journey</Button>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  These are optional navigation prompts only. The note does not update the Care Plan automatically.
                </p>
              </Panel>
            ) : null}

            <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Do not finalize until the therapist verifies attendance, risk/safety language, interventions, and plan details.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <Field label={label}>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-20 rounded-xl" />
    </Field>
  )
}

function initialFields(defaults?: SessionDefaults): SessionFields {
  const start = parseDate(defaults?.start)
  const end = parseDate(defaults?.end)
  const date = parseDate(defaults?.date || defaults?.start)
  const defaultFormat = readDefaultFormat()

  return {
    sessionDate: date ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    startTime: start ? toTimeInput(start) : "",
    endTime: end ? toTimeInput(end) : "",
    sessionType: defaults?.sessionType || "Individual therapy",
    location: defaults?.location || "",
    participants: defaults?.participants || "Client",
    format: defaultFormat,
    summary: "",
    observations: "",
    interventionsUsed: "",
    clientResponse: "",
    progressTowardGoals: "",
    riskSafety: "",
    planFollowUp: "",
  }
}

function readDefaultFormat(): NoteFormat {
  if (typeof window === "undefined") return "SOAP"
  const saved = window.localStorage.getItem("shrinkaid:session-note-default-format")
  return noteFormats.includes(saved as NoteFormat) ? (saved as NoteFormat) : "SOAP"
}

function buildDraft(fields: SessionFields, context: SessionNoteContext, sources: typeof defaultSources): DraftSections {
  const goals = sources.carePlanGoals && context.carePlanGoals.length > 0
    ? context.carePlanGoals.slice(0, 2).join("; ")
    : "Therapist review needed: care plan goals were not selected."
  const homework = sources.homework && context.homework.length > 0
    ? context.homework.slice(0, 2).join("; ")
    : "Therapist review needed: homework reviewed was not provided."
  const reflections = sources.reflections && context.reflections.length > 0
    ? context.reflections.slice(0, 2).join(" ")
    : "Therapist review needed: reflection context was not provided."
  const mood = sources.moodCheckIns && context.moodCheckIns.length > 0
    ? context.moodCheckIns.slice(0, 2).join("; ")
    : "Therapist review needed: mood/check-in context was not provided."
  const priorSummary = sources.previousSessionSummary && context.previousSessionSummary
    ? context.previousSessionSummary
    : "Therapist review needed: prior session summary was not selected."

  return {
    subjective: [
      withReview(fields.summary, "therapist-entered session summary was not provided."),
      fields.clientResponse ? `Client response: ${fields.clientResponse}` : "Therapist review needed: client response was not provided.",
      sources.reflections ? `Relevant reflection context: ${reflections}` : "Reflection context excluded by therapist.",
    ].join("\n"),
    objective: [
      fields.observations ? `Clinical observations: ${fields.observations}` : "Therapist review needed: clinical observations were not provided.",
      `Session details: ${fields.sessionType || "Therapist review needed: session type not provided."}; ${fields.location || "location not provided"}; participants: ${fields.participants || "not provided"}.`,
      sources.moodCheckIns ? `Mood/check-in context for review: ${mood}` : "Mood/check-in context excluded by therapist.",
    ].join("\n"),
    assessment: [
      fields.progressTowardGoals ? `Progress toward goals: ${fields.progressTowardGoals}` : `Progress toward goals: ${goals}`,
      `Homework context: ${homework}`,
      `Prior session context: ${priorSummary}`,
      "No diagnosis or unsupported clinical conclusion has been added.",
    ].join("\n"),
    plan: [
      fields.interventionsUsed ? `Interventions used: ${fields.interventionsUsed}` : "Therapist review needed: interventions used were not provided.",
      fields.planFollowUp ? `Plan/follow-up: ${fields.planFollowUp}` : "Therapist review needed: plan and follow-up were not provided.",
      fields.riskSafety ? `Risk/safety observations entered by therapist: ${fields.riskSafety}` : "Therapist review needed: risk and safety observations were not provided.",
    ].join("\n"),
  }
}

function refineSection(text: string, key: SectionKey, fields: SessionFields, context: SessionNoteContext) {
  const label = sectionLabels(fields.format)[key]
  const goalContext = context.carePlanGoals[0] ? ` Care plan focus: ${context.carePlanGoals[0]}.` : ""
  return `${label} revised suggestion: ${objectiveText(shortenText(text))}${goalContext} Therapist should verify this section before saving.`
}

function sectionLabels(format: NoteFormat): Record<SectionKey, string> {
  if (format === "DAP") return { subjective: "Data", objective: "Additional Observations", assessment: "Assessment", plan: "Plan" }
  if (format === "BIRP") return { subjective: "Behavior", objective: "Intervention", assessment: "Response", plan: "Plan" }
  if (format === "GIRP") return { subjective: "Goal", objective: "Intervention", assessment: "Response", plan: "Plan" }
  if (format === "Narrative") return { subjective: "Session Narrative", objective: "Clinical Observations", assessment: "Progress Review", plan: "Plan" }
  return { subjective: "Subjective", objective: "Objective", assessment: "Assessment", plan: "Plan" }
}

function withReview(value: string, missing: string) {
  return value.trim() || `Therapist review needed: ${missing}`
}

function shortenText(value: string) {
  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean)
  return sentences.slice(0, 3).join(" ") || value
}

function objectiveText(value: string) {
  return value
    .replace(/\bclearly\b/gi, "")
    .replace(/\bobviously\b/gi, "")
    .replace(/\bseems to prove\b/gi, "may suggest")
    .replace(/\bis safe\b/gi, "requires therapist review for safety status")
    .replace(/\bdenied suicidal ideation\b/gi, "Therapist review needed: SI/HI assessment language must be therapist-entered")
}

function removeUnsupportedText(value: string) {
  return value
    .split("\n")
    .filter((line) => {
      const normalized = line.toLowerCase()
      return !normalized.includes("denied suicidal ideation")
        && !normalized.includes("is safe")
        && !normalized.includes("diagnosis:")
        && !normalized.includes("diagnosed with")
        && !normalized.includes("emergency action is required")
    })
    .join("\n")
    .trim() || "Therapist review needed: unsupported statement removed."
}

function sessionDetailItems(fields: SessionFields) {
  return [
    `Date: ${fields.sessionDate || "not provided"}`,
    `Time: ${fields.startTime || "--"} to ${fields.endTime || "--"}`,
    `Type: ${fields.sessionType || "not provided"}`,
    `Participants: ${fields.participants || "not provided"}`,
  ]
}

function saveLabel(state: "Idle" | "Saving" | "Saved" | "Failed") {
  if (state === "Saving") return "Saving..."
  if (state === "Saved") return "Saved"
  if (state === "Failed") return "Save failed - your text remains available"
  return ""
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toTimeInput(date: Date) {
  return date.toTimeString().slice(0, 5)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}
