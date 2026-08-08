"use client"

import { useEffect, useState } from "react"
import { Activity, BarChart3, Brain, CheckCircle2, Loader2, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getClient } from "@/lib/supabase/client"
import type { AnalyticsSummary } from "@/lib/analytics/metrics"

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await getClient().auth.getSession()
      if (!session?.access_token) {
        setError("Sign in with an authorized internal account.")
        return
      }
      const response = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError(result?.error || "Analytics could not be loaded.")
        return
      }
      setSummary(result as AnalyticsSummary)
    }
    void load()
  }, [])

  if (error) return <Card><CardContent className="p-8 text-sm text-destructive">{error}</CardContent></Card>
  if (!summary) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>

  const metrics = [
    ["DAU", summary.totals.dau, Activity],
    ["WAU", summary.totals.wau, Users],
    ["MAU", summary.totals.mau, BarChart3],
    ["Onboarding", `${summary.onboarding.completionRate}%`, CheckCircle2],
  ] as const

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Internal · Aggregate only</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Product analytics</h1>
        <p className="mt-2 text-sm text-slate-500">Therapist workflow adoption without client PHI or clinical content.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></span>
              <div><p className="text-xs font-medium text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-950">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Activation funnel</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {summary.activationFunnel.map((step) => (
              <div key={step.event}>
                <div className="mb-2 flex justify-between text-sm"><span>{step.label}</span><span className="font-semibold">{step.therapists} · {step.rate}%</span></div>
                <Progress value={Math.min(100, step.rate)} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Workflow adoption</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              ["Assignment creators", summary.adoption.assignmentCreators],
              ["Worksheet generators", summary.adoption.worksheetGenerators],
              ["Session Prep users", summary.adoption.sessionPrepUsers],
              ["Session Prep completed", summary.adoption.sessionPrepCompletions],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Weekly retention cohorts</CardTitle></CardHeader>
        <CardContent>
          {summary.retention.length === 0 ? <p className="text-sm text-slate-500">Retention appears after the first signup cohort.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500"><tr><th className="pb-3">Cohort week</th><th>Therapists</th><th>Week 1</th><th>Week 4</th></tr></thead>
                <tbody>{summary.retention.map((row) => <tr key={row.cohortWeek} className="border-t"><td className="py-3">{row.cohortWeek}</td><td>{row.activated}</td><td>{row.week1Rate}%</td><td>{row.week4Rate}%</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-5 text-sm text-slate-600"><Brain className="h-5 w-5 shrink-0 text-primary" /><p>This dashboard never displays client names, emails, notes, reflections, worksheet responses, or session content.</p></CardContent>
      </Card>
    </div>
  )
}
