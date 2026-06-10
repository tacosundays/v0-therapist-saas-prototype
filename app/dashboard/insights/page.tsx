"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Target,
  Loader2,
  AlertCircle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { getClient } from "@/lib/supabase/client"
import { getTherapistId } from "@/lib/auth/check-user-role"

interface ClientRecord {
  id: string
  created_at: string | null
}

interface AssignmentRecord {
  id: string
  completed: boolean | null
  created_at: string | null
  completed_at: string | null
}

interface WorksheetAssignmentRecord {
  id: string
  status: string | null
  created_at: string | null
  completed_at: string | null
  worksheet_templates: {
    category: string | null
  } | null
}

interface CompletionTrendPoint {
  week: string
  rate: number | null
}

interface HomeworkTypePoint {
  name: string
  value: number
  color: string
}

interface EngagementPoint {
  day: string
  assignments: number
  completions: number
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  const day = next.getDay()
  next.setDate(next.getDate() - day)
  return next
}

function formatWeekLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatCategory(category: string | null | undefined) {
  if (!category) return "Uncategorized"
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getCompletionTrend(assignments: AssignmentRecord[], worksheetAssignments: WorksheetAssignmentRecord[]) {
  const currentWeek = startOfWeek(new Date())
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const weekStart = new Date(currentWeek)
    weekStart.setDate(currentWeek.getDate() - (5 - index) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    return { weekStart, weekEnd }
  })

  return weeks.map<CompletionTrendPoint>(({ weekStart, weekEnd }) => {
    const regularInWeek = assignments.filter((assignment) => {
      if (!assignment.created_at) return false
      const createdAt = new Date(assignment.created_at)
      return createdAt >= weekStart && createdAt < weekEnd
    })
    const worksheetsInWeek = worksheetAssignments.filter((assignment) => {
      if (!assignment.created_at) return false
      const createdAt = new Date(assignment.created_at)
      return createdAt >= weekStart && createdAt < weekEnd
    })

    const total = regularInWeek.length + worksheetsInWeek.length
    const completed = regularInWeek.filter((assignment) => assignment.completed).length
      + worksheetsInWeek.filter((assignment) => assignment.status === "completed").length

    return {
      week: formatWeekLabel(weekStart),
      rate: total > 0 ? Math.round((completed / total) * 100) : null,
    }
  })
}

function getHomeworkTypes(assignments: AssignmentRecord[], worksheetAssignments: WorksheetAssignmentRecord[]) {
  const counts = new Map<string, number>()

  if (assignments.length > 0) {
    counts.set("Homework", assignments.length)
  }

  worksheetAssignments.forEach((assignment) => {
    const category = formatCategory(assignment.worksheet_templates?.category)
    counts.set(category, (counts.get(category) || 0) + 1)
  })

  return Array.from(counts.entries()).map<HomeworkTypePoint>(([name, value], index) => ({
    name,
    value,
    color: chartColors[index % chartColors.length],
  }))
}

function getWeeklyEngagement(assignments: AssignmentRecord[], worksheetAssignments: WorksheetAssignmentRecord[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (6 - index))

    const regularAssigned = assignments.filter((assignment) => (
      assignment.created_at ? isSameDay(new Date(assignment.created_at), day) : false
    )).length
    const worksheetAssigned = worksheetAssignments.filter((assignment) => (
      assignment.created_at ? isSameDay(new Date(assignment.created_at), day) : false
    )).length
    const regularCompleted = assignments.filter((assignment) => (
      assignment.completed_at ? isSameDay(new Date(assignment.completed_at), day) : false
    )).length
    const worksheetCompleted = worksheetAssignments.filter((assignment) => (
      assignment.completed_at ? isSameDay(new Date(assignment.completed_at), day) : false
    )).length

    return {
      day: day.toLocaleDateString(undefined, { weekday: "short" }),
      assignments: regularAssigned + worksheetAssigned,
      completions: regularCompleted + worksheetCompleted,
    }
  })
}

export default function InsightsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignmentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = getClient()
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] Insights: auth email:", userEmail)
        console.log("[v0] Insights: therapist id found:", therapistId ?? "none")

        if (!therapistId) {
          setError("No therapist account found for your email.")
          return
        }

        const [clientsResult, assignmentsResult, worksheetAssignmentsResult] = await Promise.all([
          supabase
            .from("clients")
            .select("id, created_at")
            .eq("therapist_id", therapistId),
          supabase
            .from("assignments")
            .select("id, completed, created_at, completed_at")
            .eq("therapist_id", therapistId),
          supabase
            .from("worksheet_assignments")
            .select(`
              id,
              status,
              created_at,
              completed_at,
              worksheet_templates (
                category
              )
            `)
            .eq("therapist_id", therapistId),
        ])

        if (clientsResult.error) throw clientsResult.error
        if (assignmentsResult.error) throw assignmentsResult.error
        if (worksheetAssignmentsResult.error) throw worksheetAssignmentsResult.error

        setClients(clientsResult.data || [])
        setAssignments(assignmentsResult.data || [])
        setWorksheetAssignments(worksheetAssignmentsResult.data || [])

        console.log("[v0] Insights: clients count:", clientsResult.data?.length ?? 0)
        console.log("[v0] Insights: assignments count:", assignmentsResult.data?.length ?? 0)
        console.log("[v0] Insights: worksheet assignments count:", worksheetAssignmentsResult.data?.length ?? 0)
      } catch (err) {
        console.error("[v0] Insights: failed to load data", err)
        setError(err instanceof Error ? err.message : "Failed to load insights")
      } finally {
        setIsLoading(false)
      }
    }

    loadInsights()
  }, [])

  const totalAssignments = assignments.length + worksheetAssignments.length
  const completedAssignments = assignments.filter((assignment) => assignment.completed).length
    + worksheetAssignments.filter((assignment) => assignment.status === "completed").length
  const activeAssignments = totalAssignments - completedAssignments
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : null
  const completedWithDates = [
    ...assignments.filter((assignment) => assignment.completed_at),
    ...worksheetAssignments.filter((assignment) => assignment.completed_at),
  ].length

  const completionData = useMemo(
    () => getCompletionTrend(assignments, worksheetAssignments),
    [assignments, worksheetAssignments],
  )
  const homeworkTypeData = useMemo(
    () => getHomeworkTypes(assignments, worksheetAssignments),
    [assignments, worksheetAssignments],
  )
  const engagementData = useMemo(
    () => getWeeklyEngagement(assignments, worksheetAssignments),
    [assignments, worksheetAssignments],
  )

  const hasCompletionTrendData = completionData.some((point) => point.rate !== null)
  const hasHomeworkTypeData = homeworkTypeData.length > 0
  const hasEngagementData = engagementData.some((point) => point.assignments > 0 || point.completions > 0)

  const insightStats = [
    { label: "Total Assignments", value: totalAssignments.toString(), icon: Target, change: totalAssignments > 0 ? `${activeAssignments} active` : "No assignments yet" },
    { label: "Completion Rate", value: completionRate !== null ? `${completionRate}%` : "--", icon: CheckCircle2, change: totalAssignments > 0 ? `${completedAssignments}/${totalAssignments} completed` : "No completion data yet" },
    { label: "Active Clients", value: clients.length.toString(), icon: Users, change: clients.length > 0 ? "Real client records" : "No clients yet" },
    { label: "Completed With Dates", value: completedWithDates.toString(), icon: Clock, change: completedWithDates > 0 ? "Tracked from completed_at" : "No completed activity yet" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          Insights
        </motion.h1>
        <p className="text-muted-foreground mt-1">Track engagement and measure outcomes across your practice</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {insightStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Completion Rate Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasCompletionTrendData ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={completionData.map((point) => ({ ...point, rate: point.rate ?? 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="rate"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground text-center">
                      No completion trend available yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Homework by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasHomeworkTypeData ? (
                    <div className="flex items-center gap-8">
                      <ResponsiveContainer width={150} height={150}>
                        <PieChart>
                          <Pie
                            data={homeworkTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {homeworkTypeData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {homeworkTypeData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm text-foreground">{item.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground text-center">
                      No homework type data available yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Weekly Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasEngagementData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                        }}
                      />
                      <Bar dataKey="assignments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Assignments" />
                      <Bar dataKey="completions" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Completions" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground text-center">
                    No weekly engagement data available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  )
}
