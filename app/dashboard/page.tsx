"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Plus,
  ArrowRight,
  Loader2,
  FileText,
  MessageSquare
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AddClientModal } from "@/components/dashboard/add-client-modal"
import { AssignHomeworkModal } from "@/components/dashboard/assign-homework-modal"
import type { User } from "@supabase/supabase-js"

interface Client {
  id: string
  therapist_id: string
  full_name: string
  email: string | null
  created_at: string
}

interface Assignment {
  id: string
  client_id: string
  title: string
  completed: boolean
  due_date: string | null
  reflection: string | null
  completed_at: string | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  const fetchData = useCallback(async (userId: string) => {
    try {
      const supabase = createClient()
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("therapist_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (clientsError) {
        console.error("Error fetching clients:", clientsError)
      } else {
        setClients(clientsData || [])
      }

      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, client_id, title, completed, due_date, reflection, completed_at")
        .eq("therapist_id", userId)

      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError)
      } else {
        setAssignments(assignmentsData || [])
      }
    } catch (err) {
      console.error("Exception fetching data:", err)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        fetchData(user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })
  }, [fetchData])

  const handleClientAdded = () => {
    if (user) {
      fetchData(user.id)
    }
  }

  const handleAssignmentCreated = () => {
    if (user) {
      fetchData(user.id)
    }
  }

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

  // Calculate stats from real data
  const totalAssignments = assignments.length
  const completedAssignments = assignments.filter(a => a.completed).length
  const pendingAssignments = totalAssignments - completedAssignments
  const completionRate = totalAssignments > 0 
    ? Math.round((completedAssignments / totalAssignments) * 100) 
    : null

  // Count assignments due soon (within 7 days)
  const assignmentsDueSoon = assignments.filter(a => {
    if (!a.due_date || a.completed) return false
    const dueDate = new Date(a.due_date)
    const now = new Date()
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7
  }).length

  // Count overdue assignments
  const overdueAssignments = assignments.filter(a => {
    if (!a.due_date || a.completed) return false
    return new Date(a.due_date) < new Date()
  }).length

  // Get latest reflections
  const latestReflections = assignments
    .filter(a => a.reflection && a.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 3)

  const stats = [
    { label: "Active Clients", value: clients.length.toString(), icon: Users, change: "Total clients" },
    { label: "Completion Rate", value: completionRate !== null ? `${completionRate}%` : "--", icon: CheckCircle2, change: totalAssignments > 0 ? `${completedAssignments}/${totalAssignments} completed` : "No assignments yet" },
    { label: "Due This Week", value: assignmentsDueSoon.toString(), icon: Clock, change: overdueAssignments > 0 ? `${overdueAssignments} overdue` : "All on track" },
    { label: "Pending", value: pendingAssignments.toString(), icon: TrendingUp, change: pendingAssignments > 0 ? "awaiting completion" : "All caught up" },
  ]

  // Calculate days since created
  const getDaysSinceCreated = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

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
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setIsAssignModalOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Assign Homework
          </Button>
          <Button className="rounded-xl" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
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
              <CardTitle className="text-lg">Recent Clients</CardTitle>
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link href="/dashboard/clients">
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">No clients yet</p>
                  <Button 
                    size="sm" 
                    className="rounded-xl"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Client
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clients.map((client) => {
                    const clientAssignments = assignments.filter(a => a.client_id === client.id)
                    const activeCount = clientAssignments.filter(a => !a.completed).length
                    return (
                      <div
                        key={client.id}
                        className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {client.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{client.full_name}</p>
                            {activeCount > 0 && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                                {activeCount} active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {client.email || "No email provided"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Added {getDaysSinceCreated(client.created_at)}</p>
                          <Button variant="outline" size="sm" className="mt-2 rounded-lg text-xs" asChild>
                            <Link href="/dashboard/clients">
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
                <MessageSquare className="w-5 h-5 text-primary" />
                Latest Reflections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestReflections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No reflections yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Reflections will appear when clients complete assignments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {latestReflections.map((assignment) => {
                    const client = clients.find(c => c.id === assignment.client_id)
                    return (
                      <div
                        key={assignment.id}
                        className="p-4 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {client?.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{client?.full_name || "Unknown"}</span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-3 mb-2">{assignment.reflection}</p>
                        <p className="text-xs text-muted-foreground">
                          on &quot;{assignment.title}&quot; · {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onClientAdded={handleClientAdded}
      />

      {/* Assign Homework Modal */}
      <AssignHomeworkModal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        onAssignmentCreated={handleAssignmentCreated}
      />
    </div>
  )
}
