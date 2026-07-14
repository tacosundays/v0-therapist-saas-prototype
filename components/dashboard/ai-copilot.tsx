"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  StickyNote,
  TrendingUp,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { getClient } from "@/lib/supabase/client"

const disclaimer = "AI suggestions are for therapist review and do not replace clinical judgment."

type SourceSection = {
  summary: string
  citations: string[]
}

type StructuredAnswer = {
  summary: string
  keyFindings: string[]
  recommendedNextSteps: string[]
  supportingData: string[]
  clinicalReminder: string
}

type DailyBrief = {
  homeworkWaiting: number
  reflectionsSubmitted: number
  moodAlerts: number
  inactiveClients: number
  estimatedReviewTime: number
  highlights: string[]
}

type CopilotResult = {
  answer: string
  structuredAnswer?: StructuredAnswer
  suggestedFollowUps?: string[]
  recommendedHomework?: {
    clientId?: string | null
    clientName?: string | null
    title: string
    description: string
  } | null
  primaryClient?: {
    id: string
    name: string
  } | null
  dailyBrief?: DailyBrief
  sources: {
    homework: SourceSection
    reflections: SourceSection
    moodCheckIns: SourceSection
    sessionNotes: SourceSection
  }
  sourceCounts?: Record<string, number>
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  result?: CopilotResult
}

const starterPrompts = [
  "Who needs attention today?",
  "Prepare my next session",
  "Homework waiting for review",
]

const sourceSections = [
  { key: "homework", label: "Homework", icon: ClipboardCheck },
  { key: "reflections", label: "Reflections", icon: MessageSquare },
  { key: "moodCheckIns", label: "Mood check-ins", icon: TrendingUp },
  { key: "sessionNotes", label: "Session notes", icon: StickyNote },
] as const

function formatAnswerForClipboard(result: CopilotResult) {
  const structured = result.structuredAnswer
  if (!structured) return result.answer

  return [
    "Summary",
    structured.summary,
    "",
    "Key Findings",
    ...structured.keyFindings.slice(0, 3).map((item) => `- ${item}`),
    "",
    "Recommended Next Step",
    ...structured.recommendedNextSteps.slice(0, 1).map((item) => `- ${item}`),
    "",
    "Clinical Reminder",
    structured.clinicalReminder,
  ].join("\n")
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function StructuredResponse({ result }: { result: CopilotResult }) {
  const structured = result.structuredAnswer

  if (!structured) {
    return <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.answer}</p>
  }

  const sections = [
    { title: "Summary", content: structured.summary },
    { title: "Key Findings", items: structured.keyFindings.slice(0, 3) },
    { title: "Recommended Next Step", items: structured.recommendedNextSteps.slice(0, 1) },
    { title: "Clinical Reminder", content: structured.clinicalReminder || disclaimer },
  ]

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{section.title}</h4>
          {section.items ? (
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="rounded-[8px] bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-7 text-slate-700">{section.content}</p>
          )}
        </section>
      ))}
    </div>
  )
}

function DailyBriefCard({
  brief,
}: {
  brief: DailyBrief
}) {
  const stats = [
    { label: "Homework waiting", value: brief.homeworkWaiting, icon: ClipboardCheck },
    { label: "Reflections submitted", value: brief.reflectionsSubmitted, icon: MessageSquare },
    { label: "Mood alerts", value: brief.moodAlerts, icon: TrendingUp },
    { label: "Inactive 14+ days", value: brief.inactiveClients, icon: Clock },
  ]

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Daily Brief</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">Today&apos;s review queue</h3>
        </div>
        <span className="rounded-full bg-[#18B7A0]/10 px-3 py-1 text-xs font-bold text-[#08796B]">
          ~{brief.estimatedReviewTime} min
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-semibold">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-950">{stat.value}</p>
            </div>
          )
        })}
      </div>
      {brief.highlights.length ? (
        <div className="mt-4 space-y-2">
          {brief.highlights.slice(0, 3).map((highlight) => (
            <p key={highlight} className="rounded-[8px] bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
              {highlight}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[8px] bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          No review items were found in the retrieved therapist-owned data.
        </p>
      )}
      <Button asChild type="button" className="mt-4 h-10 w-full rounded-[8px] bg-[#6D5EF5] text-white hover:bg-[#5B4DEA]">
        <Link href="/dashboard/daily-workflow">
          <ArrowRight className="mr-2 h-4 w-4" />
          Start Daily Review
        </Link>
      </Button>
    </div>
  )
}

function SourceSummary({
  result,
  expanded,
  onToggle,
}: {
  result: CopilotResult
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
      <Button type="button" variant="ghost" className="h-9 w-full justify-between rounded-[8px] px-2 text-slate-600" onClick={onToggle}>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Show Sources</span>
        <span className="text-xs font-semibold">{expanded ? "Hide" : "Show"}</span>
      </Button>
      {expanded && (
        <div className="mt-3 grid gap-2">
          {sourceSections.map((section) => {
            const Icon = section.icon
            const source = result.sources?.[section.key]
            const count = result.sourceCounts?.[section.key === "homework" ? "assignments" : section.key]
            return (
              <div key={section.key} className="rounded-[8px] border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#6D5EF5]" />
                    <p className="text-sm font-semibold text-slate-950">{section.label}</p>
                  </div>
                  {typeof count === "number" && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                      {count}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-slate-600">
                  {source?.summary || "No matching source details returned."}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AiCopilot() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({})
  const [hasLoadedBrief, setHasLoadedBrief] = useState(false)

  useEffect(() => {
    if (open && !hasLoadedBrief && messages.length === 0) {
      setHasLoadedBrief(true)
      askCopilot("Daily Brief", { silentUserMessage: true })
    }
  }, [open, hasLoadedBrief, messages.length])

  const askCopilot = async (
    nextQuestion?: string,
    options?: { silentUserMessage?: boolean },
  ) => {
    const prompt = (nextQuestion ?? question).trim()
    if (!prompt) return

    const visibleUserMessage: ChatMessage | null = options?.silentUserMessage
      ? null
      : { id: createId(), role: "user", content: prompt }
    const historyForRequest = [...messages, ...(visibleUserMessage ? [visibleUserMessage] : [])]

    if (visibleUserMessage) setMessages((current) => [...current, visibleUserMessage])
    setIsLoading(true)
    setLoadingPrompt(prompt)
    setError(null)
    if (!options?.silentUserMessage) setQuestion(prompt)

    try {
      const supabase = getClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("You must be logged in to use AI Copilot.")
        return
      }

      const response = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: prompt,
          history: historyForRequest.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || "AI Copilot failed to respond.")
        return
      }

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: payload.answer,
        result: payload,
      }
      setDailyBrief(payload.dailyBrief || null)
      if (!options?.silentUserMessage) {
        setMessages((current) => [...current, assistantMessage])
      }
    } catch (err) {
      console.error("[v0] AI Copilot: request failed", err)
      setError(err instanceof Error ? err.message : "AI Copilot failed to respond.")
    } finally {
      setIsLoading(false)
      setLoadingPrompt(null)
    }
  }

  const copySummary = async (message: ChatMessage) => {
    if (!message.result) return
    await navigator.clipboard.writeText(formatAnswerForClipboard(message.result))
    setCopiedMessageId(message.id)
    window.setTimeout(() => setCopiedMessageId(null), 1600)
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 rounded-full bg-[#6D5EF5] px-5 text-white shadow-[0_20px_48px_rgba(109,94,245,0.34)] transition-all hover:-translate-y-0.5 hover:bg-[#5B4DEA] hover:shadow-[0_24px_58px_rgba(109,94,245,0.42)]"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        AI Copilot
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex h-dvh w-full flex-col gap-0 border-slate-200 bg-[#F8FAFC] p-0 sm:max-w-[620px]"
        >
          <SheetHeader className="border-b border-slate-200/70 bg-white px-4 py-3 sm:px-5">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#6D5EF5]/10 text-[#6D5EF5]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold tracking-tight text-slate-950">AI Copilot</SheetTitle>
                <SheetDescription className="mt-0.5 text-sm leading-5 text-slate-500">
                  Therapist workflow support grounded in your existing client activity.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="border-b border-amber-200/70 bg-amber-50/70 px-4 py-2 text-xs font-medium leading-5 text-amber-800 sm:px-5">
            {disclaimer}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4 pb-5 sm:p-5">
              {messages.length === 0 && (
                <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
                  <p className="text-sm font-bold text-slate-950">Good morning. What needs your attention first?</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Start with today&apos;s brief or ask a focused question about homework, mood, reflections, or session prep.
                  </p>
                </div>
              )}

              {dailyBrief && <DailyBriefCard brief={dailyBrief} />}

              {messages.length === 0 && (
                <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick prompts</p>
                  <div className="flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => askCopilot(prompt)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-600 transition-all hover:border-[#6D5EF5]/25 hover:bg-[#6D5EF5]/5 hover:text-[#6D5EF5]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === "user" ? "flex justify-end" : "space-y-4"}>
                    {message.role === "user" ? (
                      <div className="max-w-[88%] rounded-[8px] bg-[#6D5EF5] px-4 py-3 text-sm font-medium leading-6 text-white">
                        {message.content}
                      </div>
                    ) : message.result ? (
                      <>
                        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                            <CheckCircle2 className="h-4 w-4 text-[#18B7A0]" />
                            Copilot response
                          </div>
                          <StructuredResponse result={message.result} />
                        </div>

                        <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
                          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Actions</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {message.result.primaryClient && (
                              <Button asChild variant="outline" className="h-10 justify-start rounded-[8px]">
                                <Link href={`/dashboard/clients#client-${message.result.primaryClient.id}`}>
                                  <UserRound className="mr-2 h-4 w-4" />
                                  Open Client
                                </Link>
                              </Button>
                            )}
                            {message.result.primaryClient && (
                              <Button asChild variant="outline" className="h-10 justify-start rounded-[8px]">
                                <Link href={`/dashboard/clients/${message.result.primaryClient.id}/session-prep`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Open Session Prep
                                </Link>
                              </Button>
                            )}
                            <Button type="button" variant="outline" className="h-10 justify-start rounded-[8px]" onClick={() => copySummary(message)}>
                              {copiedMessageId === message.id ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                              {copiedMessageId === message.id ? "Copied" : "Copy Summary"}
                            </Button>
                            <Button asChild variant="outline" className="h-10 justify-start rounded-[8px]">
                              <Link href="/dashboard/daily-workflow">
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Start Daily Review
                              </Link>
                            </Button>
                          </div>
                        </div>

                        <SourceSummary
                          result={message.result}
                          expanded={!!expandedSources[message.id]}
                          onToggle={() => setExpandedSources((current) => ({ ...current, [message.id]: !current[message.id] }))}
                        />

                        {message.result.suggestedFollowUps?.length ? (
                          <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Suggested follow-ups</p>
                            <div className="flex flex-wrap gap-2">
                              {message.result.suggestedFollowUps.slice(0, 3).map((followUp) => (
                                <button
                                  key={followUp}
                                  type="button"
                                  onClick={() => askCopilot(followUp)}
                                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-600 transition-all hover:border-[#6D5EF5]/25 hover:bg-[#6D5EF5]/5 hover:text-[#6D5EF5]"
                                >
                                  {followUp}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ))}
              </div>

              {isLoading && (
                <div className="rounded-[8px] border border-[#6D5EF5]/15 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#6D5EF5]/10">
                      <Loader2 className="h-5 w-5 animate-spin text-[#6D5EF5]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-950">Reviewing therapist-owned data...</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Checking homework, reflections, mood check-ins, and notes for “{loadingPrompt}”.
                      </p>
                      <div className="mt-4 space-y-2">
                        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-[8px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-bold">Copilot could not finish that request.</p>
                      <p className="mt-1 leading-6">
                        Your last prompt is still in the box. You can retry when the connection or service is ready.
                      </p>
                      <p className="mt-1 text-xs leading-5 text-rose-700">{error}</p>
                      <Button type="button" variant="outline" className="mt-3 h-9 rounded-[8px] border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={() => askCopilot(question)}>
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="sticky bottom-0 border-t border-slate-200/70 bg-white p-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                askCopilot()
              }}
            >
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask about follow-ups, homework, reflections, mood, notes, or session prep..."
                className="min-h-20 resize-none rounded-[8px] border-slate-200 bg-slate-50/60 text-sm leading-6 sm:min-h-24"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  className="h-11 flex-1 rounded-[8px] bg-[#6D5EF5] text-white shadow-[0_14px_30px_rgba(109,94,245,0.22)] hover:bg-[#5B4DEA]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Ask Copilot
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
