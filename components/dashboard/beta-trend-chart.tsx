"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function BetaTrendChart({ data, color = "#6d5ef5" }: {
  data: Array<{ date: string; value: number }>
  color?: string
}) {
  if (data.length === 0) {
    return <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No activity in this period.</div>
  }

  return (
    <div className="h-44 w-full" aria-label="Activity trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
          <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
          <Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString()} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
