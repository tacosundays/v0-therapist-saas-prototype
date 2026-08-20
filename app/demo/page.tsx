import Link from "next/link"
import { ArrowLeft, ArrowRight, ClipboardCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand-mark"

export default function DemoChooserPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(99,91,255,.16),transparent_32rem),radial-gradient(circle_at_85%_25%,rgba(24,183,160,.12),transparent_30rem),#f8fafc] px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to SessionSteps</Link></Button>
      <div className="mx-auto mt-12 max-w-2xl text-center">
        <BrandMark className="mx-auto h-14 w-14 shadow-lg shadow-[#635BFF]/25" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Choose your demo</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">Explore both sides of SessionSteps with safe, synthetic sample data.</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Link href="/dashboard?demo=therapist" className="group rounded-[2rem] border border-white bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,.09)] transition hover:-translate-y-1 hover:border-[#635BFF]/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#635BFF]/10 text-[#635BFF]"><UserRound className="h-6 w-6" /></div>
          <h2 className="mt-6 text-2xl font-bold text-slate-950">Therapist workspace</h2>
          <p className="mt-3 leading-7 text-slate-600">Review a populated caseload, session prep, homework, insights, and practice activity.</p>
          <span className="mt-8 inline-flex items-center font-semibold text-[#635BFF]">Open therapist demo <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>
        <Link href="/client-portal?demo=client" className="group rounded-[2rem] border border-white bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,.09)] transition hover:-translate-y-1 hover:border-[#18B7A0]/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#18B7A0]/10 text-[#18B7A0]"><ClipboardCheck className="h-6 w-6" /></div>
          <h2 className="mt-6 text-2xl font-bold text-slate-950">Client portal</h2>
          <p className="mt-3 leading-7 text-slate-600">See assigned homework, worksheets, reflections, mood check-ins, and progress from a client’s view.</p>
          <span className="mt-8 inline-flex items-center font-semibold text-[#0F9F8C]">Open client demo <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>
      </div>
    </div>
  </main>
}
