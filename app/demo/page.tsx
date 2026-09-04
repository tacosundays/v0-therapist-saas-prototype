import Link from "next/link"
import { ArrowLeft, ArrowRight, ClipboardCheck, LayoutDashboard, MessageSquareHeart, ShieldCheck, Sparkles, Users } from "lucide-react"

import { SessionStepsLogo } from "@/components/brand/sessionsteps-logo"

const demoOptions = [
  {
    title: "Therapist workspace",
    description: "See how therapists organize client activity and prepare for upcoming sessions.",
    href: "/demo/therapist",
    cta: "Open therapist demo",
    icon: LayoutDashboard,
    features: [
      { icon: Users, label: "Needs-attention dashboard" },
      { icon: Sparkles, label: "AI session preparation" },
      { icon: ClipboardCheck, label: "Assignments and progress" },
    ],
  },
  {
    title: "Client portal",
    description: "Experience the simple between-session space clients use from their phone or computer.",
    href: "/demo/client",
    cta: "Explore client demo",
    icon: MessageSquareHeart,
    features: [
      { icon: ClipboardCheck, label: "Today’s assignment" },
      { icon: MessageSquareHeart, label: "Mood check-in" },
      { icon: Sparkles, label: "Bring to next session" },
    ],
  },
]

export default function DemoChooserPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eeecff_0,_transparent_42%),radial-gradient(circle_at_top_right,_#e7faf5_0,_transparent_38%),#fbfcff] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <SessionStepsLogo />
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700" href="/">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
            <Sparkles className="h-4 w-4" /> Interactive product tour
          </span>
          <h1 className="mt-6 font-serif text-4xl font-semibold tracking-tight text-[#11133f] sm:text-6xl">Choose your demo experience</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Explore SessionSteps from either side of the care relationship. No account or setup is required.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {demoOptions.map((option) => {
            const OptionIcon = option.icon
            return (
              <article key={option.title} className="group flex flex-col rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(30,41,59,0.10)] transition hover:-translate-y-1 hover:border-violet-200 sm:p-9">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <OptionIcon className="h-7 w-7" />
                </div>
                <h2 className="mt-7 font-serif text-3xl font-semibold text-[#11133f]">{option.title}</h2>
                <p className="mt-3 min-h-14 leading-7 text-slate-600">{option.description}</p>
                <ul className="mt-7 space-y-4">
                  {option.features.map(({ icon: FeatureIcon, label }) => (
                    <li className="flex items-center gap-3 text-sm font-medium text-slate-700" key={label}>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><FeatureIcon className="h-4 w-4" /></span>
                      {label}
                    </li>
                  ))}
                </ul>
                <Link className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700" href={option.href}>
                  {option.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </article>
            )
          })}
        </div>

        <div className="mx-auto mt-9 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-center text-sm text-emerald-900">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span><strong>No account needed.</strong> All information is fictional, and nothing you do in either demo is saved.</span>
        </div>
      </section>
    </main>
  )
}
