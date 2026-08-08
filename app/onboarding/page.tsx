"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Mail,
  PartyPopper,
  Sparkles,
  UserPlus,
  UserRound,
} from "lucide-react"
import { AddClientModal } from "@/components/dashboard/add-client-modal"
import { AssignHomeworkModal } from "@/components/dashboard/assign-homework-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"
import { getOnboardingResumeStep, ONBOARDING_STEP_COUNT, type OnboardingStatus } from "@/lib/onboarding"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

type Therapist = {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  credentials: string | null
  onboarding_status: OnboardingStatus
  onboarding_step: number
}

type Client = {
  id: string
  full_name: string
  email: string | null
  invite_sent_at: string | null
  invite_accepted_at: string | null
}

const steps = [
  { title: "Welcome to ShrinkAid", short: "Welcome", icon: Brain },
  { title: "Complete your profile", short: "Profile", icon: UserRound },
  { title: "Add your first client", short: "Client", icon: UserPlus },
  { title: "Assign meaningful work", short: "Worksheet", icon: BookOpenCheck },
  { title: "Invite your client", short: "Invite", icon: Mail },
  { title: "Prepare for the session", short: "Session Prep", icon: Sparkles },
  { title: "You’re ready", short: "Done", icon: PartyPopper },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [therapist, setTherapist] = useState<Therapist | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [assignmentCount, setAssignmentCount] = useState(0)
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [credentials, setCredentials] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  const loadWorkspace = useCallback(async () => {
    setError(null)
    try {
      const supabase = getClient() as any
      const { therapistId } = await getTherapistId()
      if (!therapistId) throw new Error("We could not find your therapist account.")

      const [{ data: therapistData, error: therapistError }, { data: clientData, error: clientError }] = await Promise.all([
        supabase
          .from("therapists")
          .select("id, first_name, last_name, full_name, credentials, onboarding_status, onboarding_step")
          .eq("id", therapistId)
          .single(),
        supabase
          .from("clients")
          .select("id, full_name, email, invite_sent_at, invite_accepted_at")
          .eq("therapist_id", therapistId)
          .order("created_at", { ascending: true }),
      ])
      if (therapistError) throw therapistError
      if (clientError) throw clientError

      const nextTherapist = therapistData as Therapist
      const nextClients = (clientData || []) as Client[]
      const clientIds = nextClients.map((client) => client.id)
      let nextAssignmentCount = 0
      if (clientIds.length) {
        const { count, error: assignmentError } = await supabase
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .eq("therapist_id", therapistId)
        if (assignmentError) throw assignmentError
        nextAssignmentCount = count || 0
      }

      setTherapist(nextTherapist)
      setClients(nextClients)
      setAssignmentCount(nextAssignmentCount)
      const requestedStep = new URLSearchParams(window.location.search).get("step")
      setStep(requestedStep === "start" ? 0 : getOnboardingResumeStep(nextTherapist))

      if (nextTherapist.first_name || nextTherapist.last_name) {
        setFirstName(nextTherapist.first_name || "")
        setLastName(nextTherapist.last_name || "")
      } else {
        const names = (nextTherapist.full_name || "").trim().split(/\s+/)
        setFirstName(names.shift() || "")
        setLastName(names.join(" "))
      }
      setCredentials(nextTherapist.credentials || "")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Onboarding could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWorkspace()
    void trackAnalyticsEvent({
      name: "onboarding_started",
      eventKey: "first",
      properties: { source: "onboarding", onboarding_step: 0 },
    })
  }, [loadWorkspace])

  const persist = async (nextStep: number, status: OnboardingStatus = "in_progress") => {
    if (!therapist) return false
    setIsSaving(true)
    setError(null)
    try {
      const supabase = getClient() as any
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from("therapists")
        .update({
          onboarding_step: nextStep,
          onboarding_status: status,
          onboarding_completed_at: status === "completed" ? now : null,
          onboarding_skipped_at: status === "skipped" ? now : null,
        })
        .eq("id", therapist.id)
      if (updateError) throw updateError
      setTherapist({ ...therapist, onboarding_step: nextStep, onboarding_status: status })
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Progress could not be saved. Please try again.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const goToStep = async (nextStep: number) => {
    if (await persist(nextStep)) setStep(nextStep)
  }

  const saveProfile = async () => {
    if (!therapist || !firstName.trim() || !lastName.trim()) {
      setError("Enter your first and last name to continue.")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const supabase = getClient() as any
      const { error: updateError } = await supabase
        .from("therapists")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          credentials: credentials.trim() || null,
          onboarding_step: 2,
          onboarding_status: "in_progress",
        })
        .eq("id", therapist.id)
      if (updateError) throw updateError
      setStep(2)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your profile could not be saved.")
    } finally {
      setIsSaving(false)
    }
  }

  const skip = async () => {
    if (await persist(step, "skipped")) {
      void trackAnalyticsEvent({
        name: "onboarding_skipped",
        eventKey: "first",
        properties: { source: "onboarding", onboarding_step: step },
      })
      router.replace("/dashboard")
    }
  }

  const finish = async () => {
    if (await persist(ONBOARDING_STEP_COUNT - 1, "completed")) {
      void trackAnalyticsEvent({
        name: "onboarding_completed",
        eventKey: "first",
        properties: { source: "onboarding", onboarding_step: ONBOARDING_STEP_COUNT - 1 },
      })
      router.replace("/dashboard")
    }
  }

  const firstClient = clients[0]
  const progress = Math.round(((step + 1) / ONBOARDING_STEP_COUNT) * 100)
  const StepIcon = steps[step].icon
  const stepComplete = useMemo(() => ({
    profile: Boolean(firstName.trim() && lastName.trim()),
    client: clients.length > 0,
    assignment: assignmentCount > 0,
    invite: Boolean(firstClient?.invite_sent_at || firstClient?.invite_accepted_at),
  }), [assignmentCount, clients.length, firstClient, firstName, lastName])

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(109,94,245,0.12),transparent_32rem),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] text-foreground">
      <header className="border-b border-border/70 bg-background/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary"><Brain className="h-5 w-5 text-primary-foreground" /></span>
            <span className="text-lg font-semibold">ShrinkAid</span>
          </Link>
          <Button variant="ghost" onClick={skip} disabled={isSaving}>Skip for now</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-12">
        <aside className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm">
          <div className="mb-6">
            <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground"><span>SETUP PROGRESS</span><span>{progress}%</span></div>
            <Progress value={progress} className="h-2" />
          </div>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {steps.map((item, index) => {
              const Icon = item.icon
              return (
                <li key={item.short} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${index === step ? "bg-primary/10 font-semibold text-primary" : index < step ? "text-foreground" : "text-muted-foreground"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index <= step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {index < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="hidden sm:inline">{item.short}</span>
                </li>
              )
            })}
          </ol>
        </aside>

        <Card className="min-h-[570px] overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-xl shadow-primary/5">
          <CardContent className="flex min-h-[570px] flex-col p-6 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.section key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex flex-1 flex-col">
                <div className="mb-8">
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><StepIcon className="h-6 w-6" /></span>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step {step + 1} of {ONBOARDING_STEP_COUNT}</p>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{steps[step].title}</h1>
                </div>

                {step === 0 && <Welcome />}
                {step === 1 && (
                  <div className="max-w-xl space-y-5">
                    <p className="text-muted-foreground">This is how your name appears throughout the therapist workspace.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="first-name">First name</Label><Input id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor="last-name">Last name</Label><Input id="last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="credentials">Credentials <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="credentials" placeholder="LCSW, LMFT, PsyD…" value={credentials} onChange={(event) => setCredentials(event.target.value)} /></div>
                  </div>
                )}
                {step === 2 && <ActionStep complete={stepComplete.client} title={stepComplete.client ? `${clients.length} client${clients.length === 1 ? "" : "s"} ready` : "Start with one client"} body="Add a client through the same secure flow you’ll use every day. Their portal invitation is created automatically." tip="Tip: The Clients page is your home for assignments, activity, and Session Prep." actionLabel={stepComplete.client ? "Add another client" : "Add client"} onAction={() => setAddClientOpen(true)} />}
                {step === 3 && <ActionStep complete={stepComplete.assignment} title={stepComplete.assignment ? "First assignment created" : "Give your client a useful next step"} body="Assign a simple homework prompt now, or visit the Content Library to choose a worksheet or generate one with AI." tip="Tip: “Generate with AI” lives in the Content Library and saves the result for reuse." actionLabel="Assign homework" onAction={() => setAssignOpen(true)} secondary={{ label: "Open Content Library", href: "/dashboard/library?onboarding=1" }} disabled={!stepComplete.client} />}
                {step === 4 && <ActionStep complete={stepComplete.invite} title={stepComplete.invite ? "Invitation is ready" : "Connect your client portal"} body={firstClient ? `${firstClient.full_name} can use the secure invitation created when you added them. You can resend or copy it from Clients.` : "Add a client first, then ShrinkAid will create their secure portal invitation."} tip="Tip: Invitation status appears beside each client in the Clients list." actionLabel="View invitation" href={firstClient ? `/dashboard/clients?onboarding=invite#client-${firstClient.id}` : undefined} disabled={!firstClient} />}
                {step === 5 && <ActionStep complete={false} title="Walk into the session prepared" body="AI Session Prep combines recent homework, reflections, mood trends, and therapist notes into a concise briefing grounded in client activity." tip="Tip: “Prepare for Session” appears on every client card and opens the same page." actionLabel="Preview Session Prep" href={firstClient ? `/dashboard/clients/${firstClient.id}/session-prep?onboarding=1` : undefined} disabled={!firstClient} />}
                {step === 6 && (
                  <div className="flex flex-1 flex-col justify-center text-center">
                    <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-10 w-10" /></span>
                    <h2 className="text-2xl font-bold">Your workspace is ready</h2>
                    <p className="mx-auto mt-3 max-w-lg text-muted-foreground">You can revisit this guide from Settings anytime. Your dashboard will now help you see who needs attention and prepare for the next session.</p>
                  </div>
                )}

                {error && <Alert variant="destructive" className="mt-6"><AlertDescription>{error}</AlertDescription></Alert>}

                <div className="mt-auto flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="ghost" onClick={() => step > 0 && goToStep(step - 1)} disabled={step === 0 || isSaving}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  {step === 6 ? (
                    <Button size="lg" onClick={finish} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Go to Dashboard<ArrowRight className="ml-2 h-4 w-4" /></Button>
                  ) : (
                    <Button size="lg" onClick={() => step === 1 ? saveProfile() : goToStep(step + 1)} disabled={isSaving || (step === 1 && !stepComplete.profile)}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{step === 0 ? "Get started" : "Continue"}<ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.section>
            </AnimatePresence>
          </CardContent>
        </Card>
      </main>

      <AddClientModal open={addClientOpen} onOpenChange={setAddClientOpen} onClientAdded={() => void loadWorkspace()} />
      <AssignHomeworkModal open={assignOpen} onOpenChange={setAssignOpen} onAssignmentCreated={() => void loadWorkspace()} preselectedClientId={firstClient?.id} />
    </div>
  )
}

function Welcome() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-lg leading-8 text-muted-foreground">ShrinkAid helps you extend care between sessions, see what needs attention, and prepare for each client in less time.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Assign with purpose", "Send interactive worksheets and focused homework.", ClipboardCheck],
          ["Stay connected", "See check-ins, reflections, and progress as they happen.", UserPlus],
          ["Prepare faster", "Turn client activity into a grounded AI session briefing.", Sparkles],
        ].map(([title, body, Icon]) => (
          <div key={title as string} className="rounded-2xl border border-border/70 bg-muted/35 p-5">
            <Icon className="mb-4 h-5 w-5 text-primary" />
            <h2 className="font-semibold">{title as string}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{body as string}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActionStep({ complete, title, body, tip, actionLabel, onAction, href, secondary, disabled }: {
  complete: boolean
  title: string
  body: string
  tip: string
  actionLabel: string
  onAction?: () => void
  href?: string
  secondary?: { label: string; href: string }
  disabled?: boolean
}) {
  return (
    <div className="max-w-2xl">
      <div className={`rounded-2xl border p-6 ${complete ? "border-emerald-500/25 bg-emerald-500/5" : "border-border bg-muted/30"}`}>
        <div className="flex items-start gap-4">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"}`}>{complete ? <Check className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}</span>
          <div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 leading-7 text-muted-foreground">{body}</p></div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {href ? <Button asChild disabled={disabled}><Link href={href}>{actionLabel}</Link></Button> : <Button onClick={onAction} disabled={disabled}>{actionLabel}</Button>}
          {secondary && <Button variant="outline" asChild><Link href={secondary.href}>{secondary.label}</Link></Button>}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">{tip}</div>
    </div>
  )
}
