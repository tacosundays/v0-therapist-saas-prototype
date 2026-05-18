"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

const stats = [
  { label: "Active Clients", value: "24", icon: Users, change: "+2 this week" },
  { label: "Completion Rate", value: "87%", icon: CheckCircle2, change: "+5% vs last month" },
  { label: "Pending Reviews", value: "8", icon: Clock, change: "3 urgent" },
  { label: "Avg. Engagement", value: "4.2", icon: TrendingUp, change: "days between sessions" },
]

const recentClients = [
  { name: "Sarah Mitchell", status: "completed", homework: "Thought Record Worksheet", dueDate: "Today", progress: 100 },
  { name: "James Rodriguez", status: "in-progress", homework: "Values Clarification Exercise", dueDate: "Tomorrow", progress: 60 },
  { name: "Emily Chen", status: "assigned", homework: "Mindfulness Journal", dueDate: "In 3 days", progress: 0 },
  { name: "Michael Brown", status: "overdue", homework: "Behavioral Activation Log", dueDate: "2 days ago", progress: 25 },
  { name: "Lisa Thompson", status: "completed", homework: "Cognitive Restructuring", dueDate: "Yesterday", progress: 100 },
]

const aiSuggestions = [
  { client: "James R.", suggestion: "Try adding a relaxation exercise based on recent anxiety scores", type: "Anxiety" },
  { client: "Emily C.", suggestion: "Values-based activity scheduling might reinforce recent progress", type: "Depression" },
]

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Get user display name
  const displayName = user?.user_metadata?.first_name 
    ? `${user.user_metadata.first_name}`
    : user?.email?.split('@')[0] || 'there'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            {getGreeting()}, {displayName}
          </motion.h1>
          <p className="text-muted-foreground mt-1">{"Here's what's happening with your clients today"}</p>
        </div>
        <Button className="rounded-xl" asChild>
          <Link href="/dashboard/clients">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Client Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Client Activity</CardTitle>
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link href="/dashboard/clients">
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentClients.map((client) => (
                  <div
                    key={client.name}
                    className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {client.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                        <StatusBadge status={client.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{client.homework}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{client.dueDate}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              client.status === "overdue" ? "bg-destructive" : "bg-primary"
                            }`}
                            style={{ width: `${client.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{client.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-foreground">{suggestion.client}</span>
                      <Badge variant="secondary" className="text-xs rounded-lg">
                        {suggestion.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                    <Button variant="outline" size="sm" className="mt-3 w-full rounded-xl">
                      View Recommendation
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" className="w-full rounded-xl" asChild>
                  <Link href="/dashboard/ai-suggestions">
                    See all suggestions
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: "Completed", className: "bg-primary/10 text-primary" },
    "in-progress": { label: "In Progress", className: "bg-chart-4/10 text-chart-4" },
    assigned: { label: "Assigned", className: "bg-muted text-muted-foreground" },
    overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  }

  const { label, className } = config[status] || config.assigned

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${className}`}>
      {label}
    </span>
  )
}
