"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
  Link as LinkIcon,
  Copy,
  Key,
  AlertTriangle,
  MessageSquare
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { AddClientModal } from "@/components/dashboard/add-client-modal"
import { AssignHomeworkModal } from "@/components/dashboard/assign-homework-modal"

interface Client {
  id: string
  therapist_id: string
  full_name: string
  email: string | null
  invite_code: string | null
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

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined)
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null)
  const [copiedType, setCopiedType] = useState<"link" | "code" | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError("You must be logged in to view clients")
        setIsLoading(false)
        return
      }

      // Fetch clients for this therapist
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false })

      if (clientsError) {
        setError(clientsError.message)
        return
      }

      // Fetch assignments for this therapist
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, client_id, title, completed, due_date, reflection, completed_at")
        .eq("therapist_id", user.id)

      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError)
        // Don't fail completely, just log it
      }

      setClients(clientsData || [])
      setAssignments(assignmentsData || [])
    } catch (err) {
      console.error("Exception fetching data:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

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

  const copyPortalLink = (clientEmail: string, clientId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const portalUrl = `${baseUrl}/client-portal?email=${encodeURIComponent(clientEmail)}`
    navigator.clipboard.writeText(portalUrl)
    setCopiedClientId(clientId)
    setCopiedType("link")
    setTimeout(() => {
      setCopiedClientId(null)
      setCopiedType(null)
    }, 2000)
  }

  const copyInviteCode = (inviteCode: string, clientId: string) => {
    navigator.clipboard.writeText(inviteCode)
    setCopiedClientId(clientId)
    setCopiedType("code")
    setTimeout(() => {
      setCopiedClientId(null)
      setCopiedType(null)
    }, 2000)
  }

  // Get assignment stats for a client
  const getClientStats = (clientId: string) => {
    const clientAssignments = assignments.filter(a => a.client_id === clientId)
    const total = clientAssignments.length
    const completed = clientAssignments.filter(a => a.completed).length
    const active = total - completed
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : null
    
    // Check for overdue assignments
    const now = new Date()
    const overdue = clientAssignments.filter(a => {
      if (a.completed || !a.due_date) return false
      return new Date(a.due_date) < now
    }).length
    
    // Get latest reflection
    const assignmentsWithReflections = clientAssignments
      .filter(a => a.reflection && a.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    const latestReflection = assignmentsWithReflections[0] || null
    
    return { total, completed, active, completionRate, overdue, latestReflection }
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    // For now, treat all clients as active since we don't have status field yet
    const matchesFilter = filterStatus === "all" || filterStatus === "active"
    return matchesSearch && matchesFilter
  })

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
            Clients
          </motion.h1>
          <p className="text-muted-foreground mt-1">Manage your client list and assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => openAssignModal()}>
            <FileText className="w-4 h-4 mr-2" />
            Assign Homework
          </Button>
          <Button className="rounded-xl" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              className="rounded-xl capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && clients.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No clients yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by adding your first client
            </p>
            <Button className="rounded-xl" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Client
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Clients Grid */}
      {!isLoading && !error && filteredClients.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client, index) => {
            const stats = getClientStats(client.id)
            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="rounded-2xl hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-lg font-medium text-primary">
                            {client.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-base">{client.full_name}</CardTitle>
                          {client.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAssignModal(client.id)}>
                            Assign Homework
                          </DropdownMenuItem>
                          {client.invite_code && (
                            <DropdownMenuItem onClick={() => copyInviteCode(client.invite_code!, client.id)}>
                              <Key className="w-4 h-4 mr-2" />
                              {copiedClientId === client.id && copiedType === "code" ? "Copied!" : `Copy Invite Code (${client.invite_code})`}
                            </DropdownMenuItem>
                          )}
                          {client.email && (
                            <DropdownMenuItem onClick={() => copyPortalLink(client.email!, client.id)}>
                              <LinkIcon className="w-4 h-4 mr-2" />
                              {copiedClientId === client.id && copiedType === "link" ? "Copied!" : "Copy Portal Link"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>Send Message</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Archive Client</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Progress Bar */}
                      {stats.total > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">{stats.completed}/{stats.total}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${stats.completionRate || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        {stats.completed > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">
                            <CheckCircle2 className="w-3 h-3" />
                            {stats.completed} completed
                          </span>
                        )}
                        {stats.active > 0 && stats.overdue === 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600">
                            <Clock className="w-3 h-3" />
                            {stats.active} pending
                          </span>
                        )}
                        {stats.overdue > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-destructive/10 text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            {stats.overdue} overdue
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Added
                        </span>
                        <span className="text-foreground">{getDaysSinceCreated(client.created_at)}</span>
                      </div>

                      {/* Latest Reflection */}
                      {stats.latestReflection && (
                        <div className="p-3 bg-muted/30 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MessageSquare className="w-3 h-3" />
                            Latest reflection
                          </div>
                          <p className="text-xs text-foreground line-clamp-2">
                            {stats.latestReflection.reflection}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            on {stats.latestReflection.title}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      {client.email && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl"
                          onClick={() => copyPortalLink(client.email!, client.id)}
                        >
                          {copiedClientId === client.id && copiedType === "link" ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Portal link copied
                            </>
                          ) : (
                            <>
                              <LinkIcon className="w-4 h-4 mr-1" />
                              Copy Portal Link
                            </>
                          )}
                        </Button>
                      )}
                      <Button size="sm" className="flex-1 rounded-xl" onClick={() => openAssignModal(client.id)}>
                        Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

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
        preselectedClientId={selectedClientId}
      />
    </div>
  )
}
