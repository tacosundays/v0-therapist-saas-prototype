"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Pencil,
  Printer,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type CarePlanStatus = "Active" | "Completed" | "Paused" | "Archived"
type GoalStatus = "Active" | "Needs Review" | "Completed" | "Paused"
type ObjectiveStatus = "In Progress" | "Needs Revision" | "Completed"

interface CarePlanClient {
  id: string
  full_name: string
  status: string | null
  created_at: string
  therapy_start_date?: string | null
  treatment_goals?: string[] | null
  focus?: string | string[] | null
  age?: number | null
  pronouns?: string | null
}

interface CarePlanAssignment {
  id: string
  title: string
  completed?: boolean | null
  status: string | null
  reflection?: string | null
  created_at?: string | null
  assigned_at?: string | null
  started_at?: string | null
  completed_at?: string | null
}

interface CarePlanWorksheetAssignment {
  id: string
  status: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  worksheet_templates: {
    title: string | null
  } | null
}

interface CarePlanReflection {
  id: string
  title: string | null
  reflection_text: string
  mood_rating: number | null
  created_at: string
}

interface CarePlanMoodCheckIn {
  id: string
  mood_rating: number
  anxiety_rating: number | null
  stress_rating: number | null
  note: string | null
  created_at: string
}

interface CarePlanProgressNote {
  id: string
  note_type: string | null
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  private_note: string | null
  created_at: string
}

interface CarePlanSessionSummary {
  id: string
  summary_json: {
    clientOverview?: string | null
    progressSinceLastSession?: string | null
    moodTrends?: string | null
    reflectionThemes?: string | null
    homeworkProgress?: string | null
    suggestedDiscussionTopics?: string[] | null
  } | null
  summary_text: string | null
  created_at: string
}

interface CarePlanTimelineItem {
  id: string
  date: string
  label: string
  detail: string
  type: string
  actionLabel?: string
  actionHref?: string
}

interface CarePlanGoal {
  id: string
  title: string
  description: string
  targetDate: string
  progress: number
  status: GoalStatus
  objectives: CarePlanObjective[]
}

interface CarePlanObjective {
  id: string
  description: string
  status: ObjectiveStatus
  progress: number
  dueDate: string
  completionDate: string
}

interface CarePlanActivity {
  id: string
  date: string
  title: string
  description: string
  icon: LucideIcon
}

interface CarePlanTabProps {
  client: CarePlanClient | null
  assignments: CarePlanAssignment[]
  worksheetAssignments: CarePlanWorksheetAssignment[]
  reflections: CarePlanReflection[]
  moodCheckIns: CarePlanMoodCheckIn[]
  progressNotes: CarePlanProgressNote[]
  sessionSummaries: CarePlanSessionSummary[]
  timeline: CarePlanTimelineItem[]
  primaryTherapist: string
  isDemoMode?: boolean
  onCreateSessionNote?: () => void
}

const interventionOptions = [
  "CBT",
  "ACT",
  "DBT",
  "EMDR",
  "EFT",
  "Solution Focused",
  "Motivational Interviewing",
  "Custom",
]

export function CarePlanTab({
  client,
  assignments,
  worksheetAssignments,
  reflections,
  moodCheckIns,
  progressNotes,
  sessionSummaries,
  timeline,
  primaryTherapist,
  isDemoMode = false,
  onCreateSessionNote,
}: CarePlanTabProps) {
  const generatedConcerns = useMemo(() => buildPresentingConcerns(client, reflections, moodCheckIns), [client, reflections, moodCheckIns])
  const generatedStrengths = useMemo(() => buildStrengths(client, assignments, reflections), [client, assignments, reflections])
  const generatedGoals = useMemo(
    () => buildGoals(client, assignments, worksheetAssignments, reflections, moodCheckIns),
    [client, assignments, worksheetAssignments, reflections, moodCheckIns],
  )

  const [carePlanStatus, setCarePlanStatus] = useState<CarePlanStatus>("Active")
  const [presentingConcerns, setPresentingConcerns] = useState(generatedConcerns)
  const [strengthsText, setStrengthsText] = useState(generatedStrengths.join("\n"))
  const [goals, setGoals] = useState<CarePlanGoal[]>(generatedGoals)
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>(["CBT", "ACT"])
  const [reviewState, setReviewState] = useState<"Ready for review" | "Reviewed today" | "Needs revision" | "Completed">("Ready for review")
  const [nextReviewDate, setNextReviewDate] = useState(defaultFutureDate(30))
  const [localActivity, setLocalActivity] = useState<CarePlanActivity[]>([])
  const [insightVersion, setInsightVersion] = useState(1)

  const homeworkItems = useMemo(() => {
    const worksheetItems = worksheetAssignments.map((assignment) => ({
      id: `worksheet-${assignment.id}`,
      title: assignment.worksheet_templates?.title || "Worksheet",
      status: formatStatus(assignment.status || "assigned"),
      date: assignment.completed_at || assignment.started_at || assignment.assigned_at,
    }))
    const assignmentItems = assignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      title: assignment.title,
      status: assignment.completed || assignment.status === "completed" ? "Completed" : formatStatus(assignment.status || "Assigned"),
      date: assignment.completed_at || assignment.started_at || assignment.assigned_at || assignment.created_at,
    }))

    return [...assignmentItems, ...worksheetItems]
      .sort((a, b) => getTime(b.date) - getTime(a.date))
      .slice(0, 6)
  }, [assignments, worksheetAssignments])

  const completionRate = useMemo(() => {
    const total = assignments.length + worksheetAssignments.length
    if (!total) return 0
    const completed = assignments.filter((assignment) => assignment.completed || assignment.status === "completed").length
      + worksheetAssignments.filter((assignment) => assignment.status === "completed").length
    return Math.round((completed / total) * 100)
  }, [assignments, worksheetAssignments])

  const overallProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
    : completionRate

  const statusTone = carePlanStatus === "Active"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : carePlanStatus === "Completed"
      ? "bg-primary/10 text-primary ring-primary/20"
      : carePlanStatus === "Paused"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200"

  const latestUpdate = [
    ...timeline.map((item) => item.date),
    ...localActivity.map((item) => item.date),
    client?.created_at,
  ].filter(Boolean).sort((a, b) => getTime(b) - getTime(a))[0]

  const insights = useMemo(
    () => buildInsights(goals, generatedStrengths, homeworkItems, reflections, moodCheckIns, sessionSummaries, insightVersion),
    [goals, generatedStrengths, homeworkItems, reflections, moodCheckIns, sessionSummaries, insightVersion],
  )

  const carePlanActivity = useMemo(() => {
    const goalEvents = goals.map((goal) => ({
      id: `goal-created-${goal.id}`,
      date: client?.therapy_start_date || client?.created_at || new Date().toISOString(),
      title: "Goal created",
      description: goal.title,
      icon: Target,
    }))

    const connectedEvents = timeline
      .filter((item) => ["Homework assigned", "Homework completed", "Assignment completed", "Session note", "AI session summary generated"].includes(item.label))
      .slice(-8)
      .map((item) => ({
        id: item.id,
        date: item.date,
        title: item.label,
        description: item.detail,
        icon: iconForActivity(item.label),
      }))

    return [...goalEvents, ...connectedEvents, ...localActivity]
      .sort((a, b) => getTime(b.date) - getTime(a.date))
      .slice(0, 12)
  }, [client, goals, localActivity, timeline])

  const markReview = (state: "Reviewed today" | "Needs revision" | "Completed") => {
    setReviewState(state)
    if (state === "Completed") setCarePlanStatus("Completed")
    setLocalActivity((current) => [
      {
        id: `review-${Date.now()}`,
        date: new Date().toISOString(),
        title: state === "Reviewed today" ? "Progress reviewed" : state,
        description: `${client?.full_name || "Client"} care plan marked ${state.toLowerCase()}.`,
        icon: ClipboardCheck,
      },
      ...current,
    ])
  }

  const updateGoalProgress = (goalId: string, progress: number) => {
    setGoals((current) => current.map((goal) => (
      goal.id === goalId ? { ...goal, progress } : goal
    )))
  }

  const updateObjectiveStatus = (goalId: string, objectiveId: string, status: ObjectiveStatus) => {
    setGoals((current) => current.map((goal) => {
      if (goal.id !== goalId) return goal
      return {
        ...goal,
        objectives: goal.objectives.map((objective) => (
          objective.id === objectiveId
            ? {
                ...objective,
                status,
                progress: status === "Completed" ? 100 : objective.progress,
                completionDate: status === "Completed" ? new Date().toISOString().slice(0, 10) : objective.completionDate,
              }
            : objective
        )),
      }
    }))
  }

  const refreshInsights = () => {
    setInsightVersion((current) => current + 1)
    setLocalActivity((current) => [
      {
        id: `ai-recommendation-${Date.now()}`,
        date: new Date().toISOString(),
        title: "AI recommendation generated",
        description: "Care plan suggestions refreshed for therapist review only.",
        icon: Sparkles,
      },
      ...current,
    ])
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.75rem] print:shadow-none">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Care Plan
                </CardTitle>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  A working view that connects goals, activity, session context, and progress from existing client data.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                {onCreateSessionNote && (
                  <Button variant="outline" className="rounded-xl" onClick={onCreateSessionNote}>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Session Note
                  </Button>
                )}
                <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button className="rounded-xl" onClick={() => markReview("Reviewed today")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Reviewed Today
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewCell label="Care Plan Status" value={reviewState} />
              <OverviewCell label="Start Date" value={formatDate(client?.therapy_start_date || client?.created_at)} />
              <OverviewCell label="Last Updated" value={formatDate(latestUpdate)} />
              <OverviewCell label="Primary Therapist" value={primaryTherapist} />
              <OverviewCell label="Review Date" value={formatDate(nextReviewDate)} />
              <OverviewCell label="Progress" value={`${overallProgress}%`} progress={overallProgress} />
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status Badge</p>
                <Badge className={`mt-2 rounded-full ring-1 hover:bg-transparent ${statusTone}`}>{carePlanStatus}</Badge>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Source</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{isDemoMode ? "Demo workspace" : "Therapist-owned data"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-primary/15 bg-primary/[0.03] print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Suggestions only. Nothing is applied to the care plan automatically.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <InsightBlock title="Progress summary" items={[insights.progressSummary]} />
            <InsightBlock title="Stalled goals" items={insights.stalledGoals} />
            <InsightBlock title="Emerging strengths" items={insights.emergingStrengths} />
            <InsightBlock title="Recommended discussion topics" items={insights.discussionTopics} />
            <InsightBlock title="Suggested homework" items={insights.suggestedHomework} />
            <InsightBlock title="Suggested objective updates" items={insights.objectiveUpdates} />
            <Button variant="outline" className="w-full rounded-xl print:hidden" onClick={refreshInsights}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh Suggestions
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <Card className="rounded-[1.75rem] print:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HeartPulse className="h-5 w-5 text-primary" />
                Presenting Concerns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={presentingConcerns}
                onChange={(event) => setPresentingConcerns(event.target.value)}
                className="min-h-36 rounded-xl print:border-0 print:p-0"
                placeholder="Document concerns being addressed in treatment."
              />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] print:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={strengthsText}
                onChange={(event) => setStrengthsText(event.target.value)}
                className="min-h-32 rounded-xl print:border-0 print:p-0"
                placeholder="Add client strengths, supports, and protective factors."
              />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] print:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                Interventions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {interventionOptions.map((intervention) => {
                  const isSelected = selectedInterventions.includes(intervention)
                  return (
                    <Button
                      key={intervention}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="rounded-full print:border-slate-300"
                      onClick={() => {
                        setSelectedInterventions((current) => (
                          current.includes(intervention)
                            ? current.filter((item) => item !== intervention)
                            : [...current, intervention]
                        ))
                      }}
                    >
                      {intervention}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] print:hidden">
            <CardHeader>
              <CardTitle className="text-lg">Review Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="care-plan-status">Care plan status</Label>
                <Select value={carePlanStatus} onValueChange={(value) => setCarePlanStatus(value as CarePlanStatus)}>
                  <SelectTrigger id="care-plan-status" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next-review-date">Next review date</Label>
                <Input
                  id="next-review-date"
                  type="date"
                  className="rounded-xl"
                  value={nextReviewDate}
                  onChange={(event) => setNextReviewDate(event.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button variant="outline" className="rounded-xl" onClick={() => markReview("Reviewed today")}>Reviewed Today</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => markReview("Needs revision")}>Needs Revision</Button>
                <Button className="rounded-xl" onClick={() => markReview("Completed")}>Completed</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.75rem] print:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Long-Term Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm print:shadow-none">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">{goal.title}</h3>
                        <Badge variant="outline" className="rounded-full">{goal.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{goal.description}</p>
                    </div>
                    <div className="min-w-36">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Target</p>
                      <p className="text-sm font-semibold text-slate-700">{formatDate(goal.targetDate)}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">Progress</span>
                      <span className="font-semibold text-slate-950">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                    <input
                      aria-label={`${goal.title} progress`}
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={goal.progress}
                      onChange={(event) => updateGoalProgress(goal.id, Number(event.target.value))}
                      className="w-full accent-primary print:hidden"
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-900">Short-Term Objectives</p>
                    {goal.objectives.map((objective) => (
                      <div key={objective.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{objective.description}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Due {formatDate(objective.dueDate)}
                              {objective.completionDate ? ` - completed ${formatDate(objective.completionDate)}` : ""}
                            </p>
                          </div>
                          <Select value={objective.status} onValueChange={(value) => updateObjectiveStatus(goal.id, objective.id, value as ObjectiveStatus)}>
                            <SelectTrigger className="h-9 rounded-xl lg:w-40 print:hidden">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Needs Revision">Needs Revision</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <Progress value={objective.progress} className="h-2" />
                          <span className="w-10 text-right text-xs font-semibold text-slate-500">{objective.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <ConnectionCard
              title="Homework Connections"
              icon={FileText}
              emptyTitle="No homework connected yet"
              emptyDescription="Assigned homework can be associated with care plan goals during review."
            >
              {homeworkItems.map((item, index) => (
                <ConnectedRow
                  key={item.id}
                  title={item.title}
                  detail={`${item.status}${item.date ? ` - ${formatDate(item.date)}` : ""}`}
                  badge={goals[index % Math.max(goals.length, 1)]?.title || "Goal"}
                />
              ))}
            </ConnectionCard>

            <ConnectionCard
              title="Reflection Connections"
              icon={Pencil}
              emptyTitle="No reflections submitted yet"
              emptyDescription="Related reflections will appear here after client submissions."
            >
              {reflections.slice(0, 4).map((reflection, index) => (
                <ConnectedRow
                  key={reflection.id}
                  title={reflection.title || "Reflection"}
                  detail={reflection.reflection_text}
                  badge={goals[index % Math.max(goals.length, 1)]?.title || "Goal"}
                />
              ))}
            </ConnectionCard>

            <ConnectionCard
              title="Mood Trend"
              icon={HeartPulse}
              emptyTitle="No mood check-ins yet"
              emptyDescription="Mood trends will appear here when the client submits check-ins."
            >
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-slate-950">{moodCheckIns[0] ? `${moodCheckIns[0].mood_rating}/10` : "--"}</p>
                    <p className="text-xs text-slate-500">Latest check-in</p>
                  </div>
                  <Badge variant="outline" className="rounded-full">{moodLabel(moodCheckIns)}</Badge>
                </div>
                <div className="flex h-20 items-end gap-2 rounded-2xl bg-slate-50 p-3">
                  {moodCheckIns.slice(0, 8).reverse().map((checkIn) => (
                    <div key={checkIn.id} className="flex flex-1 items-end">
                      <div className="w-full rounded-t-lg bg-primary/70" style={{ height: `${Math.max(checkIn.mood_rating * 8, 8)}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </ConnectionCard>

            <ConnectionCard
              title="Session Notes"
              icon={ClipboardCheck}
              emptyTitle="No session notes yet"
              emptyDescription="Progress notes and AI summaries will connect here when available."
            >
              {[...progressNotes.slice(0, 2), ...sessionSummaries.slice(0, 2)].slice(0, 4).map((item) => (
                <ConnectedRow
                  key={item.id}
                  title={"note_type" in item ? `${item.note_type || "Progress"} note` : "AI session summary"}
                  detail={"note_type" in item
                    ? item.subjective || item.plan || item.private_note || "Session note saved."
                    : item.summary_json?.progressSinceLastSession || item.summary_text || "AI summary generated."}
                  badge={formatDate(item.created_at)}
                />
              ))}
            </ConnectionCard>
          </div>

          <Card className="rounded-[1.75rem] print:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-primary" />
                Care Plan Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {carePlanActivity.length === 0 ? (
                <p className="text-sm text-slate-500">Care plan activity will appear here as goals, homework, reviews, and suggestions are connected.</p>
              ) : (
                <div className="space-y-0">
                  {carePlanActivity.map((item) => (
                    <div key={item.id} className="flex gap-3 border-l border-slate-200 pb-5 pl-4 last:pb-0">
                      <div className="-ml-[25px] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                          <p className="text-xs text-slate-400">{formatDateTime(item.date)}</p>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function OverviewCell({ label, value, progress }: { label: string; value: string; progress?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value || "--"}</p>
      {typeof progress === "number" && <Progress value={progress} className="mt-2 h-2" />}
    </div>
  )
}

function InsightBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/80">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-2 space-y-1">
        {items.slice(0, 3).map((item) => (
          <p key={item} className="text-sm leading-6 text-slate-600">{item}</p>
        ))}
      </div>
    </div>
  )
}

function ConnectionCard({
  title,
  icon: Icon,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  children: ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <Card className="rounded-[1.75rem] print:shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasChildren ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">{emptyTitle}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{emptyDescription}</p>
          </div>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}

function ConnectedRow({ title, detail, badge }: { title: string; detail: string; badge: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
        <Badge variant="outline" className="max-w-36 shrink-0 truncate rounded-full">{badge}</Badge>
      </div>
    </div>
  )
}

function buildPresentingConcerns(client: CarePlanClient | null, reflections: CarePlanReflection[], moodCheckIns: CarePlanMoodCheckIn[]) {
  const concerns = new Set<string>()
  const focus = Array.isArray(client?.focus) ? client?.focus.join("\n") : client?.focus || ""

  if (focus) concerns.add(formatStatus(focus))
  reflections.slice(0, 3).forEach((reflection) => {
    const text = `${reflection.title || ""} ${reflection.reflection_text}`.toLowerCase()
    if (text.includes("anx")) concerns.add("Anxiety")
    if (text.includes("depress") || text.includes("low mood")) concerns.add("Depression")
    if (text.includes("relationship") || text.includes("communication")) concerns.add("Relationship conflict")
    if (text.includes("stress") || text.includes("work")) concerns.add("Stress")
    if (text.includes("trauma")) concerns.add("Trauma")
  })
  if (moodCheckIns.some((checkIn) => (checkIn.anxiety_rating || 0) >= 7)) concerns.add("Elevated anxiety")
  if (moodCheckIns.some((checkIn) => (checkIn.stress_rating || 0) >= 7)) concerns.add("Elevated stress")

  if (concerns.size === 0) {
    concerns.add("Presenting concerns to be documented by the therapist.")
  }

  return Array.from(concerns).join("\n")
}

function buildStrengths(client: CarePlanClient | null, assignments: CarePlanAssignment[], reflections: CarePlanReflection[]) {
  const strengths = new Set<string>()
  const completed = assignments.filter((assignment) => assignment.completed || assignment.status === "completed").length

  if (client?.treatment_goals && client.treatment_goals.length > 0) strengths.add("Motivated to work toward stated goals")
  if (completed > 0) strengths.add("Follows through with between-session practice")
  if (reflections.length > 0) strengths.add("Reflective and willing to share observations")
  if (reflections.some((reflection) => reflection.reflection_text.toLowerCase().includes("tried"))) strengths.add("Experiments with new skills")
  if (strengths.size === 0) {
    strengths.add("Strengths to be added by the therapist")
  }

  return Array.from(strengths)
}

function buildGoals(
  client: CarePlanClient | null,
  assignments: CarePlanAssignment[],
  worksheetAssignments: CarePlanWorksheetAssignment[],
  reflections: CarePlanReflection[],
  moodCheckIns: CarePlanMoodCheckIn[],
) {
  const treatmentGoals = client?.treatment_goals?.filter(Boolean) || []
  const focusLabel = Array.isArray(client?.focus) ? client?.focus.join(", ") : client?.focus
  const firstGoal = treatmentGoals[0] || `Improve functioning related to ${focusLabel || "current treatment concerns"}`
  const secondGoal = treatmentGoals[1] || "Build sustainable between-session coping and reflection routines"
  const completionRate = homeworkCompletionRate(assignments, worksheetAssignments)
  const reflectionProgress = Math.min(reflections.length * 18, 90)
  const moodProgress = moodCheckIns.length > 0 ? Math.min(Math.round(averageMood(moodCheckIns) * 10), 90) : 20

  return [
    {
      id: "goal-1",
      title: firstGoal,
      description: "Support measurable progress on the client's primary treatment focus using session work and between-session practice.",
      targetDate: defaultFutureDate(90),
      progress: Math.max(20, Math.round((completionRate + moodProgress) / 2)),
      status: completionRate >= 80 ? "Active" : "Needs Review",
      objectives: [
        {
          id: "goal-1-objective-1",
          description: "Identify current triggers, patterns, and protective factors connected to this goal.",
          status: reflections.length > 0 ? "Completed" : "In Progress",
          progress: reflections.length > 0 ? 100 : 35,
          dueDate: defaultFutureDate(14),
          completionDate: reflections.length > 0 ? reflections[0].created_at.slice(0, 10) : "",
        },
        {
          id: "goal-1-objective-2",
          description: "Practice one agreed skill between sessions and review impact during session prep.",
          status: completionRate >= 60 ? "Completed" : "In Progress",
          progress: Math.max(25, completionRate),
          dueDate: defaultFutureDate(30),
          completionDate: completionRate >= 60 ? new Date().toISOString().slice(0, 10) : "",
        },
      ],
    },
    {
      id: "goal-2",
      title: secondGoal,
      description: "Increase consistency with homework, reflections, and mood check-ins so therapy decisions have clearer context.",
      targetDate: defaultFutureDate(120),
      progress: Math.max(15, Math.round((completionRate + reflectionProgress) / 2)),
      status: reflectionProgress >= 60 ? "Active" : "Needs Review",
      objectives: [
        {
          id: "goal-2-objective-1",
          description: "Complete assigned homework or worksheets before the next scheduled review.",
          status: completionRate >= 75 ? "Completed" : "In Progress",
          progress: Math.max(20, completionRate),
          dueDate: defaultFutureDate(21),
          completionDate: completionRate >= 75 ? new Date().toISOString().slice(0, 10) : "",
        },
        {
          id: "goal-2-objective-2",
          description: "Submit short reflections or mood check-ins often enough to reveal trends over time.",
          status: reflections.length + moodCheckIns.length >= 4 ? "Completed" : "Needs Revision",
          progress: Math.min((reflections.length + moodCheckIns.length) * 15, 100),
          dueDate: defaultFutureDate(45),
          completionDate: reflections.length + moodCheckIns.length >= 4 ? new Date().toISOString().slice(0, 10) : "",
        },
      ],
    },
  ] as CarePlanGoal[]
}

function buildInsights(
  goals: CarePlanGoal[],
  strengths: string[],
  homeworkItems: { title: string; status: string; date: string | null | undefined }[],
  reflections: CarePlanReflection[],
  moodCheckIns: CarePlanMoodCheckIn[],
  sessionSummaries: CarePlanSessionSummary[],
  insightVersion: number,
) {
  const stalled = goals.filter((goal) => goal.progress < 45 || goal.status === "Needs Review")
  const latestSummary = sessionSummaries[0]?.summary_json
  const recentReflection = reflections[0]
  const latestMood = moodCheckIns[0]
  const completedHomework = homeworkItems.filter((item) => item.status === "Completed").length

  return {
    progressSummary: latestSummary?.progressSinceLastSession
      || (completedHomework > 0
        ? `${completedHomework} recent homework item${completedHomework === 1 ? "" : "s"} can inform the next care plan review.`
        : "Progress should be reviewed against recent homework, reflections, mood check-ins, and session notes."),
    stalledGoals: stalled.length > 0
      ? stalled.map((goal) => `${goal.title} may need review because progress is currently ${goal.progress}%.`)
      : ["No stalled goals are suggested by the currently available activity."],
    emergingStrengths: strengths.slice(0, 3),
    discussionTopics: latestSummary?.suggestedDiscussionTopics?.slice(0, 3)
      || [
        recentReflection ? `Review recent reflection: ${recentReflection.title || "Untitled reflection"}` : "Ask what felt most useful since the last session.",
        latestMood ? `Explore latest mood rating of ${latestMood.mood_rating}/10 in context.` : "Invite a brief check-in on symptoms and functioning.",
        insightVersion > 1 ? "Confirm whether objective targets still fit the current phase of care." : "Discuss whether current goals still feel clinically useful.",
      ],
    suggestedHomework: [
      "Choose homework that directly supports the highest-priority objective.",
      homeworkItems[0] ? `Consider reviewing or repeating: ${homeworkItems[0].title}.` : "Consider a brief values, thought record, or communication worksheet if clinically appropriate.",
    ],
    objectiveUpdates: stalled.length > 0
      ? stalled.slice(0, 2).map((goal) => `Break "${goal.title}" into a smaller objective for the next review period.`)
      : ["Consider increasing objective difficulty only after therapist review confirms sustained progress."],
  }
}

function homeworkCompletionRate(assignments: CarePlanAssignment[], worksheetAssignments: CarePlanWorksheetAssignment[]) {
  const total = assignments.length + worksheetAssignments.length
  if (!total) return 0
  const completed = assignments.filter((assignment) => assignment.completed || assignment.status === "completed").length
    + worksheetAssignments.filter((assignment) => assignment.status === "completed").length
  return Math.round((completed / total) * 100)
}

function averageMood(items: CarePlanMoodCheckIn[]) {
  if (!items.length) return 0
  return items.reduce((sum, item) => sum + item.mood_rating, 0) / items.length
}

function moodLabel(items: CarePlanMoodCheckIn[]) {
  if (items.length < 2) return "Building trend"
  const newest = items[0].mood_rating
  const oldest = items[Math.min(items.length - 1, 6)].mood_rating
  if (newest - oldest >= 2) return "Improving"
  if (oldest - newest >= 2) return "Declining"
  return "Stable"
}

function iconForActivity(label: string) {
  if (label.includes("Homework") || label.includes("Assignment")) return FileText
  if (label.includes("AI")) return Sparkles
  if (label.includes("Session")) return ClipboardCheck
  return CalendarClock
}

function formatStatus(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return "--"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function formatDateTime(value?: string | null) {
  if (!value) return "--"
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function defaultFutureDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getTime(value?: string | null) {
  return value ? new Date(value).getTime() : 0
}
