"use client"

import { useState } from "react"
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  StickyNote,
  TrendingUp,
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

type SourceSection = {
  summary: string
  citations: string[]
}

type CopilotResult = {
  answer: string
  sources: {
    homework: SourceSection
    reflections: SourceSection
    moodCheckIns: SourceSection
    sessionNotes: SourceSection
  }
  sourceCounts?: Record<string, number>
}

const starterPrompts = [
  "Who needs follow-up this week?",
  "Which clients have overdue homework?",
  "Summarize recent client progress",
  "Suggest homework for anxiety",
]

const sourceSections = [
  { key: "homework", label: "Homework", icon: ClipboardCheck },
  { key: "reflections", label: "Reflections", icon: MessageSquare },
  { key: "moodCheckIns", label: "Mood check-ins", icon: TrendingUp },
  { key: "sessionNotes", label: "Session notes", icon: StickyNote },
] as const

export function AiCopilot() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState<CopilotResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const askCopilot = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? question).trim()
    if (!prompt) return

    setIsLoading(true)
    setError(null)
    setResult(null)
    setQuestion(prompt)

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
        body: JSON.stringify({ question: prompt }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || "AI Copilot failed to respond.")
        return
      }

      setResult(payload)
    } catch (err) {
      console.error("[v0] AI Copilot: request failed", err)
      setError(err instanceof Error ? err.message : "AI Copilot failed to respond.")
    } finally {
      setIsLoading(false)
    }
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
          className="w-full gap-0 border-slate-200 bg-[#F8FAFC] p-0 sm:max-w-[520px]"
        >
          <SheetHeader className="border-b border-slate-200/70 bg-white px-6 py-5">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#6D5EF5]/10 text-[#6D5EF5]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold tracking-tight text-slate-950">AI Copilot</SheetTitle>
                <SheetDescription className="mt-1 leading-6 text-slate-500">
                  Ask grounded questions across your therapist-owned ShrinkAid data.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="border-b border-amber-200/70 bg-amber-50/80 px-6 py-3 text-sm font-medium leading-6 text-amber-800">
            AI suggestions are for therapist review and do not replace clinical judgment.
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-5 p-6">
              <div className="rounded-[24px] border border-slate-200/75 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Try asking</p>
                <div className="flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => askCopilot(prompt)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-600 transition-all hover:border-[#6D5EF5]/25 hover:bg-[#6D5EF5]/5 hover:text-[#6D5EF5]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading && (
                <div className="rounded-[24px] border border-[#6D5EF5]/15 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin text-[#6D5EF5]" />
                    Reviewing therapist-owned homework, reflections, mood check-ins, and notes...
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-slate-200/75 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                    <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      <CheckCircle2 className="h-4 w-4 text-[#18B7A0]" />
                      Copilot answer
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.answer}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Sources reviewed</p>
                    {sourceSections.map((section) => {
                      const Icon = section.icon
                      const source = result.sources?.[section.key]
                      return (
                        <div key={section.key} className="rounded-[22px] border border-slate-200/75 bg-white p-4 shadow-sm">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6D5EF5]/10 text-[#6D5EF5]">
                              <Icon className="h-4 w-4" />
                            </div>
                            <p className="font-semibold text-slate-950">{section.label}</p>
                          </div>
                          <p className="text-sm leading-6 text-slate-600">
                            {source?.summary || "No matching source details returned."}
                          </p>
                          {source?.citations?.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {source.citations.map((citation) => (
                                <span key={citation} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                  {citation}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200/70 bg-white p-4">
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
                placeholder="Ask about follow-ups, homework, reflections, mood, or notes..."
                className="min-h-24 rounded-2xl border-slate-200 bg-slate-50/60 text-sm leading-6"
              />
              <Button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="h-11 w-full rounded-2xl bg-[#6D5EF5] text-white shadow-[0_14px_30px_rgba(109,94,245,0.22)] hover:bg-[#5B4DEA]"
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
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
