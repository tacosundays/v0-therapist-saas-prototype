"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, CheckCircle2, ClipboardCheck, Heart, MessageSquareText, RotateCcw, ShieldCheck, Sparkles } from "lucide-react"

import { SessionStepsLogo } from "@/components/brand/sessionsteps-logo"

export default function ClientDemoPage() {
  const [assignmentComplete, setAssignmentComplete] = useState(false)
  const [mood, setMood] = useState(6)
  const [checkInSaved, setCheckInSaved] = useState(false)
  const [topic, setTopic] = useState("")
  const [topicSaved, setTopicSaved] = useState(false)

  const progress = [assignmentComplete, checkInSaved, topicSaved].filter(Boolean).length

  function resetDemo() {
    setAssignmentComplete(false)
    setMood(6)
    setCheckInSaved(false)
    setTopic("")
    setTopicSaved(false)
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <SessionStepsLogo />
          <div className="flex items-center gap-2">
            <Link className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:inline-flex" href="/demo">Demo choices</Link>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={resetDemo} type="button">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900">
        Fictional client demo — changes reset when this page is refreshed.
      </div>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-7 sm:py-12">
        <Link className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900 sm:hidden" href="/demo"><ArrowLeft className="h-4 w-4" /> Demo choices</Link>

        <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[linear-gradient(120deg,#eeecff_0%,#ffffff_52%,#e8fbf7_100%)] p-7 shadow-sm sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-700"><Heart className="h-3.5 w-3.5" /> Client portal demo</span>
              <h1 className="mt-5 font-serif text-4xl font-semibold text-[#11133f] sm:text-5xl">Hi Jordan, welcome back.</h1>
              <p className="mt-3 max-w-xl leading-7 text-slate-600">Here is your simple plan for staying connected between sessions.</p>
            </div>
            <div className="rounded-2xl bg-white/90 px-5 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Today’s progress</p>
              <p className="mt-1 font-serif text-3xl font-semibold text-[#11133f]">{progress} of 3</p>
            </div>
          </div>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${(progress / 3) * 100}%` }} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><ClipboardCheck className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Today’s assignment</p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold text-[#11133f]">Values in Action</h2>
                </div>
              </div>
              {assignmentComplete && <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />}
            </div>
            <p className="mt-5 leading-7 text-slate-600">Choose one personal value and write down a small action that would honor it this week.</p>
            <button className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition ${assignmentComplete ? "bg-emerald-50 text-emerald-700" : "bg-violet-600 text-white hover:bg-violet-700"}`} onClick={() => setAssignmentComplete((value) => !value)} type="button">
              {assignmentComplete ? <><Check className="h-4 w-4" /> Completed — undo</> : "Mark assignment complete"}
            </button>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Heart className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Quick check-in</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-[#11133f]">How are you feeling?</h2>
              </div>
            </div>
            <div className="mt-7 flex items-center justify-between"><span className="text-sm font-semibold text-slate-700">Mood today</span><span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">{mood}/10</span></div>
            <input aria-label="Mood today" className="mt-4 w-full accent-violet-600" max="10" min="1" onChange={(event) => { setMood(Number(event.target.value)); setCheckInSaved(false) }} type="range" value={mood} />
            <button className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition ${checkInSaved ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500 text-white hover:bg-emerald-600"}`} onClick={() => setCheckInSaved(true)} type="button">
              {checkInSaved ? <><Check className="h-4 w-4" /> Check-in saved</> : "Save check-in"}
            </button>
          </article>
        </div>

        <article className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><MessageSquareText className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Bring to your next session</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-[#11133f]">What would you like to talk about?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Add a reminder so an important thought does not get lost before your appointment.</p>
            </div>
          </div>
          <textarea className="mt-6 min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" maxLength={400} onChange={(event) => { setTopic(event.target.value); setTopicSaved(false) }} placeholder="For example: I want to talk about setting boundaries at work…" value={topic} />
          <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Demo only. This note is not sent or stored.</p>
            <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${topicSaved ? "bg-emerald-50 text-emerald-700" : "bg-violet-600 text-white hover:bg-violet-700"}`} disabled={!topic.trim()} onClick={() => setTopicSaved(true)} type="button">
              {topicSaved ? <><Check className="h-4 w-4" /> Added for next session</> : "Add for next session"}
            </button>
          </div>
        </article>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 sm:flex-row">
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> This fictional demo is not monitored and should not be used for urgent support.</span>
              <Link className="inline-flex shrink-0 items-center gap-2 font-semibold text-violet-700 hover:text-violet-900" href="/demo/therapist"><Sparkles className="h-4 w-4" /> View therapist demo</Link>
        </div>
      </section>
    </main>
  )
}
