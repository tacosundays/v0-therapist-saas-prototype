"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react"
import Link from "next/link"

const featureStrip = [
  { label: "Online Worksheets", icon: ClipboardList },
  { label: "Client Portal", icon: Users },
  { label: "Mood Tracking", icon: HeartPulse },
  { label: "Session Prep", icon: CalendarClock },
  { label: "Reflections", icon: MessageSquare },
  { label: "Group Practice", icon: ShieldCheck },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(99,91,255,0.14),transparent_34rem),radial-gradient(circle_at_82%_28%,rgba(24,183,160,0.12),transparent_30rem),linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_72%,#EEF2FF_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#635BFF]/30 to-transparent" />
      
      <div className="max-w-7xl mx-auto relative">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#635BFF]/15 bg-white/80 px-4 py-2 text-sm font-semibold text-[#635BFF] shadow-sm backdrop-blur"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#18B7A0]" />
              Therapy homework that fits real practice
            </motion.div>

            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
              Keep therapy homework moving{" "}
              <span className="text-[#635BFF]">between sessions.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-8 text-slate-600 lg:mx-0">
              ShrinkAid Homework helps therapists assign worksheets, collect client reflections, and review progress before the next appointment.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Button size="lg" className="h-12 bg-[#635BFF] px-8 text-base shadow-[0_16px_36px_rgba(99,91,255,0.28)] hover:bg-[#574CFF]" asChild>
                <Link href="/signup">
                  Start free trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>

            <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600 lg:justify-start">
              {[
                "Solo therapists and group practices with up to 5 seats",
                "14-day free trial",
                "Built with HIPAA-conscious security controls",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#18B7A0]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <DashboardPreview />
          </motion.div>
        </div>

        <FeatureStrip />
      </div>
    </section>
  )
}

function FeatureStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35 }}
      className="mt-14 rounded-3xl border border-white/80 bg-white/75 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {featureStrip.map((feature) => (
          <div
            key={feature.label}
            className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-[#635BFF]/5 hover:text-[#635BFF]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#635BFF]/10 text-[#635BFF]">
              <feature.icon className="h-4 w-4" />
            </div>
            <span>{feature.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-xl">
      <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-[#635BFF]/24 via-[#18B7A0]/16 to-[#635BFF]/16 blur-3xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.18)]">
        <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-rose-300" />
            <div className="h-3 w-3 rounded-full bg-amber-300" />
            <div className="h-3 w-3 rounded-full bg-emerald-300" />
          </div>
          <div className="flex-1 text-center">
            <div className="text-xs font-medium text-slate-500">ShrinkAid Therapist Workspace</div>
          </div>
        </div>
        
        <div className="grid gap-4 p-4 sm:p-5">
          <div className="rounded-3xl bg-[#0F172A] p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Today&apos;s Session Prep</div>
                <div className="mt-2 text-2xl font-bold tracking-tight">Client A</div>
                <p className="mt-1 text-sm text-white/65">Review homework, mood trend, and reflection before 2:30 PM.</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                <div className="text-xl font-bold">82%</div>
                <div className="text-[11px] text-white/55">completion</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PreviewMetric label="Homework ready to review" value="5" icon={BookOpen} tone="purple" />
            <PreviewMetric label="Upcoming session" value="2:30" icon={CalendarClock} tone="teal" />
          </div>

          <div className="space-y-3">
            <PreviewEvent
              icon={FileText}
              title="Homework ready to review"
              detail="Values worksheet completed"
              meta="Client A"
              color="bg-[#635BFF]"
            />
            <PreviewEvent
              icon={MessageSquare}
              title="Reflection submitted"
              detail="Client noted wins and barriers from the week"
              meta="18 min ago"
              color="bg-[#18B7A0]"
            />
            <PreviewEvent
              icon={HeartPulse}
              title="Mood check-in"
              detail="Mood 6/10, stress 7/10"
              meta="Today"
              color="bg-amber-500"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Session readiness</div>
              <div className="text-xs font-medium text-[#635BFF]">Live summary</div>
            </div>
            <div className="space-y-2">
              {[
                { label: "Worksheet completed", width: "100%" },
                { label: "Reflection submitted", width: "74%" },
                { label: "Mood check-in", width: "58%" },
              ].map((item) => (
                <div key={item.label} className="grid grid-cols-[8rem_1fr] items-center gap-3">
                  <span className="truncate text-xs text-slate-500">{item.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#635BFF]" style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof BookOpen
  tone: "purple" | "teal"
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className={tone === "purple" ? "text-[#635BFF]" : "text-[#18B7A0]"}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-950">{value}</div>
      </div>
      <div className="mt-3 text-xs font-medium leading-5 text-slate-500">{label}</div>
    </div>
  )
}

function PreviewEvent({
  icon: Icon,
  title,
  detail,
  meta,
  color,
}: {
  icon: typeof FileText
  title: string
  detail: string
  meta: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${color} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
          <span className="shrink-0 text-xs text-slate-400">{meta}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  )
}
