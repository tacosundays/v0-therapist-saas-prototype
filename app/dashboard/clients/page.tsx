"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getClient } from "@/lib/supabase/client"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { AddClientModal } from "@/components/dashboard/add-client-modal"
import { AssignHomeworkModal } from "@/components/dashboard/assign-homework-modal"
import { AssignWorksheetModal } from "@/components/dashboard/assign-worksheet-modal"
import { ViewResponsesModal } from "@/components/dashboard/view-responses-modal"
import {
  demoAssignments,
  demoClients,
  demoReflections,
  demoWorksheetAssignments,
  enableDemoMode,
  useDemoMode,
} from "@/lib/demo-mode"

interface Client {
  id: string
  therapist_id: string
  full_name: string
  email: string | null
  status: string | null
  created_at: string
  user_id: string | null
  invite_sent_at: string | null
  invite_accepted_at: string | null
}

interface Assignment {
  id: string
  client_id: string
  title: string
  completed: boolean
  status: string | null
  due_date: string | null
  reflection: string | null
  completed_at: string | null
  assigned_at: string | null
  started_at: string | null
}

interface WorksheetAssignment {
  id: string
  client_id: string
  status: string
  completed_at: string | null
  assigned_at: string | null
  started_at: string | null
  worksheet_templates: {
    title: string
  }
}

interface ClientReflection {
  id: string
  client_id: string
}

type ClientDirectoryFilter = "all" | "needs_attention" | "homework_ready" | "inactive" | "recently_active"

export default function ClientsPage() {
  const { isDemoMode } = useDemoMode()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<ClientDirectoryFilter>("all")
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isAssignWorksheetOpen, setIsAssignWorksheetOpen] = useState(false)
  const [isViewResponsesOpen, setIsViewResponsesOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null)
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetAssignment[]>([])
  const [clientReflections, setClientReflections] = useState<ClientReflection[]>([])
  const [resendingClientId, setResendingClientId] = useState<string | null>(null)
  const [clientActionMessage, setClientActionMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isDemoMode) {
        setClients(demoClients)
        setAssignments(demoAssignments)
        setWorksheetAssignments(demoWorksheetAssignments)
        setClientReflections(demoReflections)
        return
      }

      const supabase = getClient() as any
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError("You must be logged in to view clients")
        setIsLoading(false)
        return
      }

      // Resolve therapist id by email (therapists.id may != auth.user.id)
      const { therapistId, userEmail } = await getTherapistId()

      console.log("[v0] Clients page: auth email:", userEmail)
      console.log("[v0] Clients page: therapist id found:", therapistId ?? "none")

      if (!therapistId) {
        console.log("[v0] Clients page: no therapist record resolved for this account")
        setError("No therapist account found for your email.")
        setIsLoading(false)
        return
      }

      console.log("[v0] Clients page: loading clients for therapist.id:", therapistId)

      // Fetch clients for this therapist
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("therapist_id", therapistId)
        .order("created_at", { ascending: false })

      if (clientsError) {
        setError(clientsError.message)
        return
      }

      console.log("[v0] Clients page: clients count:", clientsData?.length ?? 0)
      console.log("[v0] Clients page: client emails:", ((clientsData || []) as Client[]).map(c => c.email))

      // Fetch assignments for this therapist
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, client_id, title, completed, status, due_date, reflection, completed_at, assigned_at, started_at")
        .eq("therapist_id", therapistId)

      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError)
        // Don't fail completely, just log it
      }

      // Fetch worksheet assignments
      const { data: worksheetAssignmentsData } = await supabase
        .from("worksheet_assignments")
        .select(`
          id,
          client_id,
          status,
          completed_at,
          assigned_at,
          started_at,
          worksheet_templates (
            title
          )
        `)
        .eq("therapist_id", therapistId)

      const { data: clientReflectionsData, error: clientReflectionsError } = await supabase
        .from("client_reflections")
        .select("id, client_id")
        .eq("therapist_id", therapistId)

      if (clientReflectionsError) {
        console.error("Error fetching client reflections:", clientReflectionsError)
      }

      setClients(clientsData || [])
      setAssignments(assignmentsData || [])
      setWorksheetAssignments(worksheetAssignmentsData || [])
      setClientReflections(clientReflectionsData || [])
    } catch (err) {
      console.error("Exception fetching data:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [isDemoMode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleClientAdded = () => {
    fetchData()
  }

  const handleAssignmentCreated = () => {
    fetchData()
  }

  const openAssignModal = (clientId?: string) => {
    setSelectedClientId(clientId)
    setIsAssignModalOpen(true)
  }

  const openAssignWorksheetModal = (clientId?: string) => {
    setSelectedClientId(clientId)
    setIsAssignWorksheetOpen(true)
  }

  const viewWorksheetResponses = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId)
    setIsViewResponsesOpen(true)
  }

  const copyPortalLink = (clientEmail: string, clientId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const portalUrl = `${baseUrl}/client-portal?email=${encodeURIComponent(clientEmail)}`
    navigator.clipboard.writeText(portalUrl)
    setCopiedClientId(clientId)
    setTimeout(() => {
      setCopiedClientId(null)
    }, 2000)
  }

  const handleResendInvite = async (client: Client) => {
    if (!client.email || client.user_id || client.invite_accepted_at) return

    setResendingClientId(client.id)
    setClientActionMessage(null)
    setError(null)

    try {
      const supabase = getClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("You must be logged in to resend an invite.")
        return
      }

      const response = await fetch("/api/client-invitations/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clientId: client.id }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        if (result?.inviteLink) {
          await navigator.clipboard.writeText(result.inviteLink)
          setCopiedClientId(client.id)
          setClientActionMessage("Email delivery failed. Invite link copied so you can send it manually.")
          setTimeout(() => setCopiedClientId(null), 2000)
          await fetchData()
          return
        }

        setError(result?.error || "Unable to resend invite.")
        return
      }

      setClientActionMessage("Invitation email sent successfully.")
      await fetchData()
    } catch (err) {
      console.error("Exception resending invite:", err)
      setError(err instanceof Error ? err.message : "Unable to resend invite.")
    } finally {
      setResendingClientId(null)
    }
  }

  // Get assignment stats for a client
  const getClientStats = (clientId: string) => {
    const clientAssignments = assignments.filter(a => a.client_id === clientId)
    const clientWorksheetAssignments = worksheetAssignments.filter(a => a.client_id === clientId)
    
    const total = clientAssignments.length + clientWorksheetAssignments.length
    const completed = clientAssignments.filter(a => a.completed || a.status === "completed").length +
                      clientWorksheetAssignments.filter(a => a.status === "completed").length
    const active = total - completed
    const started = clientAssignments.filter(a => !a.completed && (a.status === "started" || a.started_at)).length +
                    clientWorksheetAssignments.filter(a => a.status === "in_progress" || a.started_at).length
    const assigned = active - started
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : null
    
    // Check for overdue assignments
    const now = new Date()
    const overdue = clientAssignments.filter(a => {
      if (a.completed || !a.due_date) return false
      return new Date(a.due_date) < now
    }).length
    
    // Get completed worksheet assignments for this client
    const completedWorksheets = clientWorksheetAssignments.filter(a => a.status === "completed")
    const readyForReview = clientAssignments.filter(a => a.completed || a.status === "completed" || a.reflection).length + completedWorksheets.length
    const reflectionCount = clientReflections.filter(reflection => reflection.client_id === clientId).length
    
    return { total, completed, active, started, assigned, completionRate, overdue, completedWorksheets, readyForReview, reflectionCount }
  }

  const getDaysSince = (date: string | null) => {
    if (!date) return null
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatRelativeDate = (date: string | null) => {
    if (!date) return "No activity yet"
    const days = getDaysSince(date)
    if (days === null) return "No activity yet"
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  const getLatestActivityAt = (client: Client) => {
    const clientAssignments = assignments.filter(a => a.client_id === client.id)
    const clientWorksheetAssignments = worksheetAssignments.filter(a => a.client_id === client.id)
    const dates = [
      client.created_at,
      client.invite_sent_at,
      client.invite_accepted_at,
      ...clientAssignments.flatMap(a => [a.assigned_at, a.started_at, a.completed_at]),
      ...clientWorksheetAssignments.flatMap(a => [a.assigned_at, a.started_at, a.completed_at]),
    ].filter(Boolean) as string[]

    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
  }

  function isClientRegistered(client: Client) {
    return Boolean(client.user_id || client.invite_accepted_at || client.status === "active")
  }

  function getClientInviteStatus(client: Client) {
    const isRegistered = isClientRegistered(client)

    if (isRegistered && client.status === "active") {
      return {
        key: "active" as const,
        label: "Active",
        className: "bg-primary/10 text-primary border-primary/20",
      }
    }

    if (isRegistered) {
      return {
        key: "registered" as const,
        label: "Registered",
        className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      }
    }

    if (client.invite_sent_at && !isRegistered) {
      return {
        key: "email_sent" as const,
        label: "Email Sent",
        className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      }
    }

    return {
      key: "invited" as const,
      label: "Invited",
      className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    }
  }

  const activeClientCount = clients.filter(isClientRegistered).length

  const directoryRows = clients
    .map((client) => {
      const stats = getClientStats(client.id)
      const inviteStatus = getClientInviteStatus(client)
      const lastActivityAt = getLatestActivityAt(client)
      const inactiveDays = getDaysSince(lastActivityAt)
      const isInactive = inactiveDays !== null && inactiveDays >= 14
      const hasHomeworkReady = stats.readyForReview > 0
      const needsAttention = stats.overdue > 0 || hasHomeworkReady || isInactive
      const attentionLabel = stats.overdue > 0
        ? `${stats.overdue} overdue`
        : hasHomeworkReady
          ? "Homework Ready"
          : isInactive
            ? `Inactive ${inactiveDays}d`
            : "Clear"

      return {
        client,
        stats,
        inviteStatus,
        isRegistered: isClientRegistered(client),
        lastActivityAt,
        lastActivityLabel: formatRelativeDate(lastActivityAt),
        inactiveDays,
        isInactive,
        hasHomeworkReady,
        isRecentlyActive: inactiveDays !== null && inactiveDays <= 7,
        needsAttention,
        attentionLabel,
      }
    })
    .sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1
      return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime()
    })

  const filteredRows = directoryRows.filter((row) => {
    const matchesSearch = row.client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (row.client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "needs_attention" && row.needsAttention) ||
      (filterStatus === "homework_ready" && row.hasHomeworkReady) ||
      (filterStatus === "inactive" && row.isInactive) ||
      (filterStatus === "recently_active" && row.isRecentlyActive)

    return matchesSearch && matchesFilter
  })

  const filterOptions: { key: ClientDirectoryFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "needs_attention", label: "Needs Attention" },
    { key: "homework_ready", label: "Homework Ready" },
    { key: "inactive", label: "Inactive" },
    { key: "recently_active", label: "Recently Active" },
  ]

  const getInitials = (name: string) => (
    name
      .split(" ")
      .filter(Boolean)
      .map(part => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  )

  return (
    <div className="space-y-6">
      <div className="saas-page-header space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="saas-eyebrow mb-2">Client directory</p>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold tracking-tight text-slate-950"
            >
              Clients
            </motion.h1>
            <p className="mt-2 text-sm text-slate-500">{activeClientCount} active clients</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white pl-10"
              />
            </div>
            <Button
              onClick={() => {
                if (isDemoMode) {
                  setClientActionMessage("Demo workspace is read-only. Create your practice to invite real clients.")
                  return
                }
                setIsAddModalOpen(true)
              }}
              className="h-10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Invite Client
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => (
            <Button
              key={filter.key}
              variant={filterStatus === filter.key ? "default" : "outline"}
              onClick={() => setFilterStatus(filter.key)}
              size="sm"
              className="h-9 rounded-full"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <Card className="overflow-hidden border-slate-200/80">
          <CardContent className="p-0">
            <div className="hidden grid-cols-[minmax(220px,1.3fr)_120px_120px_140px_120px_140px_120px] gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 lg:grid">
              <span>Client</span>
              <span>Status</span>
              <span>Activity</span>
              <span>Homework</span>
              <span>Mood</span>
              <span>Attention</span>
              <span className="text-right">Action</span>
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-0 lg:grid-cols-[minmax(220px,1.3fr)_120px_120px_140px_120px_140px_120px] lg:items-center">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-44 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
                {Array.from({ length: 6 }).map((__, cellIndex) => (
                  <div key={cellIndex} className="h-7 w-full animate-pulse rounded-full bg-slate-100" />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {error && !isLoading && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Clients could not load</h3>
              <p className="mt-1 text-sm text-destructive/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {clientActionMessage && !isLoading && (
        <div className="rounded-xl bg-primary/10 p-4 text-primary">
          {clientActionMessage}
        </div>
      )}

      {!isLoading && !error && clients.length === 0 && (
        <Card className="border-dashed border-slate-300 bg-white">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Plus className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-950">Start your client directory</h3>
            <p className="mb-5 max-w-sm text-sm text-muted-foreground">
              Invite your first client to begin tracking homework, reflections, and session prep from one place.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Your First Client
            </Button>
            {!isDemoMode && (
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => {
                  enableDemoMode()
                  window.location.href = "/dashboard?demo=1"
                }}
              >
                View Demo Workspace
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && clients.length > 0 && filteredRows.length === 0 && (
        <Card className="border-slate-200/80">
          <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Search className="mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="text-base font-semibold text-slate-950">No clients match this view</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a different filter or search term.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredRows.length > 0 && (
        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <CardContent className="p-0">
            <div className="hidden grid-cols-[minmax(220px,1.3fr)_120px_120px_140px_120px_140px_120px] gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 lg:grid">
              <span>Client</span>
              <span>Status</span>
              <span>Activity</span>
              <span>Homework</span>
              <span>Mood</span>
              <span>Attention</span>
              <span className="text-right">Action</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredRows.map((row, index) => {
                const { client, stats, inviteStatus, isRegistered } = row
                const homeworkLabel = stats.total === 0
                  ? "No Assignment"
                  : row.hasHomeworkReady
                    ? "Homework Ready"
                    : `${stats.completed}/${stats.total} done`

                const homeworkClassName = row.hasHomeworkReady
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : stats.total === 0
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"

                const attentionClassName = row.needsAttention
                  ? row.isInactive
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                    : "border-destructive/20 bg-destructive/10 text-destructive"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"

                return (
                  <motion.div
                    key={client.id}
                    id={`client-${client.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025 }}
                    className="grid gap-4 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5 lg:grid-cols-[minmax(220px,1.3fr)_120px_120px_140px_120px_140px_120px] lg:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {(client as any).avatar ? (
                        <img src={(client as any).avatar} alt="" className="h-10 w-10 shrink-0 rounded-full ring-1 ring-primary/15" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
                          <span className="text-sm font-bold text-primary">{getInitials(client.full_name)}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/clients/${client.id}/session-prep`}
                          className="block truncate text-sm font-semibold text-slate-950 hover:text-primary"
                        >
                          {client.full_name}
                        </Link>
                        {client.email && (
                          <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </p>
                        )}
                        {isDemoMode && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {(client as any).age} · {(client as any).pronouns} · {(client as any).clientType}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-xs font-medium text-muted-foreground lg:hidden">Status</span>
                      <Badge variant="outline" className={`rounded-full px-2.5 py-1 ${inviteStatus.className}`}>
                        {inviteStatus.label}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm lg:block">
                      <span className="text-xs font-medium text-muted-foreground lg:hidden">Last activity</span>
                      <span className="text-slate-700">{row.lastActivityLabel}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-xs font-medium text-muted-foreground lg:hidden">Homework</span>
                      <div>
                        <Badge variant="outline" className={`rounded-full px-2.5 py-1 ${homeworkClassName}`}>
                          {homeworkLabel}
                        </Badge>
                        {stats.total > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">{stats.completionRate ?? 0}% completion</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-xs font-medium text-muted-foreground lg:hidden">Mood</span>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                        In Session Prep
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-xs font-medium text-muted-foreground lg:hidden">Attention</span>
                      <Badge variant="outline" className={`rounded-full px-2.5 py-1 ${attentionClassName}`}>
                        {row.needsAttention && !row.isInactive && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {row.attentionLabel}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                      <Button asChild size="sm" className="h-9 flex-1 lg:flex-none">
                        <Link href={`/dashboard/clients/${client.id}/session-prep`}>Prepare for Session</Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              if (isDemoMode) {
                                setClientActionMessage("Demo homework is read-only. Create your practice to assign real homework.")
                                return
                              }
                              openAssignModal(client.id)
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Assign Homework
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (isDemoMode) {
                                setClientActionMessage("Demo worksheets are read-only. Create your practice to assign real worksheets.")
                                return
                              }
                              openAssignWorksheetModal(client.id)
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Assign Online Worksheet
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/clients/${client.id}/session-prep#progress-notes`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Notes
                            </Link>
                          </DropdownMenuItem>
                          {!isDemoMode && stats.completedWorksheets.slice(0, 2).map(ws => (
                            <DropdownMenuItem key={ws.id} onClick={() => viewWorksheetResponses(ws.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              View {ws.worksheet_templates?.title}
                            </DropdownMenuItem>
                          ))}
                          {client.email && (
                            <DropdownMenuItem onClick={() => copyPortalLink(client.email!, client.id)}>
                              <LinkIcon className="mr-2 h-4 w-4" />
                              {copiedClientId === client.id ? "Copied!" : "Copy Portal Link"}
                            </DropdownMenuItem>
                          )}
                          {!isRegistered && client.email && (
                            <DropdownMenuItem onClick={() => handleResendInvite(client)}>
                              <Mail className="mr-2 h-4 w-4" />
                              {resendingClientId === client.id ? "Sending..." : "Resend Invite"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Client Modal */}
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
        preselectedClientId={selectedClientId}
      />

      {/* Assign Online Worksheet Modal */}
      <AssignWorksheetModal
        open={isAssignWorksheetOpen}
        onOpenChange={setIsAssignWorksheetOpen}
        onAssigned={handleAssignmentCreated}
        preselectedClientId={selectedClientId}
      />

      {/* View Worksheet Responses Modal */}
      <ViewResponsesModal
        open={isViewResponsesOpen}
        onOpenChange={setIsViewResponsesOpen}
        assignmentId={selectedAssignmentId}
      />
    </div>
  )
}
