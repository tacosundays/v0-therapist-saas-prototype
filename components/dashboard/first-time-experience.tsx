"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  PartyPopper,
  PlayCircle,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react"

type Celebration = "client" | "homework" | null

type FirstTimeExperienceProps = {
  clientCount: number
  homeworkCount: number
  reviewCount: number
  isLoading: boolean
  celebration: Celebration
  onAddClient: () => void
  onAssignHomework: () => void
  onDismissCelebration: () => void
}

const storageKey = "shrinkaId:first-time-experience:v1"
const demoStorageKey = "shrinkaId:first-time-demo:v1"

const tourSteps = [
  {
    title: "Start with the Daily Brief",
    description: "Use the brief as the first stop each morning. It points to sessions, review work, mood alerts, and the next best action.",
  },
  {
    title: "Invite one client",
    description: "The fastest path to value is adding a real client, then sending one simple between-session assignment.",
  },
  {
    title: "Assign homework",
    description: "Use the existing homework flow to send a prompt or worksheet. This tour never creates homework by itself.",
  },
  {
    title: "Review before session",
    description: "As clients complete work, the dashboard, Inbox, and Session Prep views surface what needs therapist review.",
  },
]

const demoItems = [
  {
    label: "Demo client",
    value: "DEMO Maya Chen",
    detail: "A labeled sample client card for orientation only.",
  },
  {
    label: "Demo homework",
    value: "DEMO Values Check-In",
    detail: "Shows where the first assignment appears after you create a real one.",
  },
  {
    label: "Demo review",
    value: "DEMO Reflection ready",
    detail: "Illustrates how completed work would surface for therapist review.",
  },
]

export function FirstTimeExperience({
  clientCount,
  homeworkCount,
  reviewCount,
  isLoading,
  celebration,
  onAddClient,
  onAssignHomework,
  onDismissCelebration,
}: FirstTimeExperienceProps) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [demoMode, setDemoMode] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const checklist = useMemo(() => [
    {
      id: "client",
      label: "Invite your first client",
      description: "Create the client record and send the portal invite.",
      complete: clientCount > 0,
      actionLabel: "Invite client",
      action: onAddClient,
    },
    {
      id: "homework",
      label: "Assign first homework",
      description: "Send one simple assignment through the existing homework flow.",
      complete: homeworkCount > 0,
      actionLabel: "Assign homework",
      action: onAssignHomework,
    },
    {
      id: "review",
      label: "Know where review work lands",
      description: "Inbox and Session Prep collect completed homework and reflections.",
      complete: reviewCount > 0,
      actionLabel: "Take product tour",
      action: () => setTourOpen(true),
    },
  ], [clientCount, homeworkCount, reviewCount, onAddClient, onAssignHomework])

  const completedCount = checklist.filter((item) => item.complete).length
  const progress = Math.round((completedCount / checklist.length) * 100)
  const shouldShow = !isLoading && !dismissed && completedCount < checklist.length
  const nextIncomplete = checklist.find((item) => !item.complete)

  useEffect(() => {
    const hasDismissed = window.localStorage.getItem(storageKey) === "dismissed"
    const hasDemo = window.localStorage.getItem(demoStorageKey) === "enabled"
    setDismissed(hasDismissed)
    setDemoMode(hasDemo)
  }, [])

  useEffect(() => {
    if (!isLoading && !dismissed && clientCount === 0 && homeworkCount === 0) {
      setWizardOpen(true)
    }
  }, [clientCount, dismissed, homeworkCount, isLoading])

  const dismiss = () => {
    window.localStorage.setItem(storageKey, "dismissed")
    setDismissed(true)
    setWizardOpen(false)
  }

  const startDemo = () => {
    window.localStorage.setItem(demoStorageKey, "enabled")
    setDemoMode(true)
    setWizardOpen(false)
    setTourOpen(true)
  }

  const startWithClient = () => {
    setWizardOpen(false)
    onAddClient()
  }

  const stopDemo = () => {
    window.localStorage.removeItem(demoStorageKey)
    setDemoMode(false)
  }

  const nextTourStep = () => {
    if (tourStep < tourSteps.length - 1) {
      setTourStep((current) => current + 1)
      return
    }
    setTourOpen(false)
    setTourStep(0)
  }

  const celebrationCopy = celebration === "client"
    ? {
        title: "First client added",
        detail: "Nice. The next activation step is assigning one simple homework item.",
        action: "Assign homework",
        onAction: onAssignHomework,
      }
    : celebration === "homework"
      ? {
          title: "First homework assigned",
          detail: "The core workflow is live. Completed work will flow back into review and prep surfaces.",
          action: "View tour",
          onAction: () => setTourOpen(true),
        }
      : null

  return (
    <>
      <AnimatePresence>
        {celebrationCopy && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <PartyPopper className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950">{celebrationCopy.title}</p>
                  <p className="mt-1 text-sm text-emerald-800">{celebrationCopy.detail}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-white" onClick={celebrationCopy.onAction}>
                  {celebrationCopy.action}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onDismissCelebration}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Dismiss celebration</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {shouldShow && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-white via-primary/5 to-white">
          <CardContent className="p-0">
            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-primary/10 p-6 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between gap-3">
                  <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                    First-Time Experience
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={dismiss}>
                    Dismiss
                  </Button>
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">
                  Assign your first homework in under 5 minutes
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  A short setup path for new therapists: invite one client, assign one homework item, and know where completed work returns.
                </p>
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Activation progress</span>
                    <span className="text-slate-500">{completedCount} of {checklist.length}</span>
                  </div>
                  <Progress value={progress} className="bg-slate-200" />
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={nextIncomplete?.action}>
                    {nextIncomplete?.actionLabel || "Continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setTourOpen(true)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Product tour
                  </Button>
                  <Button variant="ghost" onClick={startDemo}>
                    Use demo walkthrough
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.complete ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}>
                        {item.complete ? <CheckCircle2 className="h-4 w-4" /> : item.id === "client" ? <UserPlus className="h-4 w-4" /> : item.id === "homework" ? <BookOpenCheck className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                      {!item.complete && (
                        <Button variant="ghost" size="sm" onClick={item.action}>
                          {item.actionLabel}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {demoMode && (
                  <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Demo walkthrough</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">Sample data is visual only</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={stopDemo}>Hide demo</Button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {demoItems.map((item) => (
                        <div key={item.label} className="rounded-xl bg-white p-3 ring-1 ring-primary/10">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{item.value}</p>
                          <p className="mt-1 text-xs leading-4 text-slate-500">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl">Welcome to ShrinkAid</DialogTitle>
            <DialogDescription className="leading-6">
              The fastest first run is simple: invite a client, assign one homework item, then use review surfaces before session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <WizardStep number="1" title="Invite" description="Add one client and send the portal invitation." />
            <WizardStep number="2" title="Assign" description="Use the existing homework flow for the first task." />
            <WizardStep number="3" title="Review" description="Completed work returns to Inbox and Session Prep." />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={startDemo}>
              Use demo walkthrough
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={dismiss}>Skip for now</Button>
              <Button onClick={startWithClient}>
                Invite first client
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tourOpen} onOpenChange={setTourOpen}>
        <DialogContent className="rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{tourSteps[tourStep].title}</DialogTitle>
            <DialogDescription className="leading-6">
              {tourSteps[tourStep].description}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span>Product tour</span>
              <span>{tourStep + 1} of {tourSteps.length}</span>
            </div>
            <Progress value={((tourStep + 1) / tourSteps.length) * 100} className="mt-3 bg-slate-200" />
            {demoMode && (
              <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-white p-3">
                <p className="text-xs font-semibold text-primary">Demo mode is on</p>
                <p className="mt-1 text-xs text-slate-500">All sample names and tasks shown in the walkthrough are labeled demo data and are not saved.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTourOpen(false)}>Close</Button>
            <Button onClick={nextTourStep}>
              {tourStep === tourSteps.length - 1 ? "Finish tour" : "Next"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function WizardStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
        {number}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}
