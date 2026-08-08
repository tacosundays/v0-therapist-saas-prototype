"use client"

import type { LucideIcon } from "lucide-react"
import { CheckCircle2, Clock, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function TrustSection({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="saas-eyebrow mb-2">{eyebrow}</p>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Icon className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function TrustStatusCard({
  title,
  description,
  status = "Available",
}: {
  title: string
  description: string
  status?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
          {status}
        </Badge>
      </div>
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

export function ReadinessBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}

export function TrustTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: Array<Array<React.ReactNode>>
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="align-top transition-colors hover:bg-slate-50/70">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-4 text-slate-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-200/80 lg:hidden">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="space-y-3 bg-white p-4">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{columns[cellIndex]}</p>
                <div className="mt-1 text-sm text-slate-700">{cell}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DocumentPlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-[var(--saas-shadow-control)]">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" disabled>
        <Clock className="mr-2 h-4 w-4" />
        Planned
      </Button>
    </div>
  )
}
