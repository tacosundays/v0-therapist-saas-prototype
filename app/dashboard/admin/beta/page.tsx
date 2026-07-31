"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useState } from "react"
import { Activity, Brain, CheckCircle2, ClipboardList, Loader2, MessageSquare, RefreshCw, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, ErrorState } from "@/components/dashboard/page-state"
import { getClient } from "@/lib/supabase/client"
import type { BetaDashboardSummary, BetaDateRange } from "@/lib/analytics/beta-dashboard"

const BetaTrendChart = dynamic(
  () => import("@/components/dashboard/beta-trend-chart").then((module) => module.BetaTrendChart),
  { ssr: false, loading: () => <div className="h-44 animate-pulse rounded-xl bg-muted" /> },
)

const ranges: Array<{ value: BetaDateRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
]

function RankedList({ items, empty }: { items: Array<{ label: string; value: number }>; empty: string }) {
  if (items.length === 0) return <EmptyState title={empty} description="Results will appear as beta feedback is submitted." />
  const max = Math.max(...items.map((item) => item.value), 1)
  return <div className="space-y-4">{items.map((item, index) => (
    <div key={item.label}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="truncate"><span className="mr-2 text-muted-foreground">{index + 1}</span>{item.label}</span>
        <span className="font-semibold">{item.value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / max) * 100}%` }} /></div>
    </div>
  ))}</div>
}

export default function BetaDashboardPage() {
  const [range, setRange] = useState<BetaDateRange>("30d")
  const [summary, setSummary] = useState<BetaDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await getClient().auth.getSession()
      if (!session?.access_token) throw new Error("Sign in with an authorized admin account.")
      const response = await fetch(`/api/admin/beta?range=${range}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Beta metrics could not be loaded.")
      setSummary(result as BetaDashboardSummary)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Beta metrics could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { void load() }, [load])

  const cards = summary ? [
    ["Total therapists", summary.kpis.totalTherapists, Users],
    ["Active · 7 days", summary.kpis.active7d, Activity],
    ["Active · 30 days", summary.kpis.active30d, Activity],
    ["Clients created", summary.kpis.clientsCreated, Users],
    ["Assignments", summary.kpis.assignmentsCreated, ClipboardList],
    ["Completion rate", `${summary.kpis.assignmentCompletionRate}%`, CheckCircle2],
    ["Session Prep uses", summary.kpis.sessionPrepUses, Brain],
    ["Feedback", summary.kpis.feedbackSubmitted, MessageSquare],
  ] as const : []

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Internal · Admin only</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Beta dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Aggregate adoption, workflow, and feedback signals without client-identifying or clinical data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border bg-background p-1" aria-label="Date range">
            {ranges.map((item) => <Button key={item.value} size="sm" variant={range === item.value ? "default" : "ghost"} className="rounded-lg" onClick={() => setRange(item.value)}>{item.label}</Button>)}
          </div>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={load} aria-label="Refresh beta metrics"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        : error ? <ErrorState title="Beta dashboard couldn’t load" description={error} retry={load} />
        : summary ? <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value, Icon]) => <Card key={label} className="rounded-2xl"><CardContent className="flex items-center gap-4 p-5"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>)}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {[
              ["New therapists", summary.trends.therapistSignups, "#6d5ef5"],
              ["Clients created", summary.trends.clientCreation, "#0ea5e9"],
              ["Assignments created", summary.trends.assignmentCreation, "#10b981"],
              ["AI Session Prep usage", summary.trends.sessionPrepUsage, "#8b5cf6"],
            ].map(([title, data, color]) => <Card key={title as string} className="rounded-2xl"><CardHeader><CardTitle>{title as string}</CardTitle></CardHeader><CardContent><BetaTrendChart data={data as Array<{ date: string; value: number }>} color={color as string} /></CardContent></Card>)}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-2xl"><CardHeader><CardTitle>Top reported issues</CardTitle></CardHeader><CardContent><RankedList items={summary.feedback.topIssues} empty="No reported issues" /></CardContent></Card>
            <Card className="rounded-2xl"><CardHeader><CardTitle>Feature requests by product area</CardTitle></CardHeader><CardContent><RankedList items={summary.feedback.featureRequests} empty="No feature requests" /></CardContent></Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="rounded-2xl"><CardHeader><CardTitle>Feedback mix</CardTitle></CardHeader><CardContent className="space-y-6"><div><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p><div className="flex flex-wrap gap-2">{summary.feedback.byCategory.map((item) => <Badge key={item.label} variant="secondary">{item.label} · {item.value}</Badge>)}</div></div><div><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p><div className="flex flex-wrap gap-2">{summary.feedback.byStatus.map((item) => <Badge key={item.label} variant="outline">{item.label} · {item.value}</Badge>)}</div></div></CardContent></Card>
            <Card className="rounded-2xl"><CardHeader><CardTitle>Recent feedback summary</CardTitle></CardHeader><CardContent>{summary.feedback.recent.length === 0 ? <p className="text-sm text-muted-foreground">No feedback in this period.</p> : <div className="divide-y">{summary.feedback.recent.map((item, index) => <div key={`${item.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="flex items-center gap-2"><Badge variant="secondary">{item.category}</Badge><span className="text-sm font-medium">{item.area}</span></div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{item.status}</span><span>{new Date(item.createdAt).toLocaleDateString()}</span></div></div>)}</div>}</CardContent></Card>
          </div>

          <Card className="rounded-2xl border-primary/20 bg-primary/5"><CardContent className="flex gap-3 p-5 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><p>Privacy guardrail: this view returns aggregate counts and product areas only. It never returns client names, email addresses, worksheet content, reflections, notes, clinical text, or raw feedback messages.</p></CardContent></Card>
        </> : null}
    </div>
  )
}
