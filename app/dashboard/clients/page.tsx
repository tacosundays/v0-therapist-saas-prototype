"use client"

import { useState } from "react"
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
  AlertCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const clients = [
  { id: 1, name: "Sarah Mitchell", email: "sarah.m@email.com", status: "active", lastSession: "2 days ago", completionRate: 92, assignedHomework: 3, pendingReview: 1 },
  { id: 2, name: "James Rodriguez", email: "james.r@email.com", status: "active", lastSession: "5 days ago", completionRate: 78, assignedHomework: 2, pendingReview: 0 },
  { id: 3, name: "Emily Chen", email: "emily.c@email.com", status: "active", lastSession: "1 day ago", completionRate: 95, assignedHomework: 4, pendingReview: 2 },
  { id: 4, name: "Michael Brown", email: "michael.b@email.com", status: "inactive", lastSession: "2 weeks ago", completionRate: 45, assignedHomework: 1, pendingReview: 0 },
  { id: 5, name: "Lisa Thompson", email: "lisa.t@email.com", status: "active", lastSession: "3 days ago", completionRate: 88, assignedHomework: 2, pendingReview: 1 },
  { id: 6, name: "David Wilson", email: "david.w@email.com", status: "active", lastSession: "Today", completionRate: 100, assignedHomework: 3, pendingReview: 0 },
]

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          client.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === "all" || client.status === filterStatus
    return matchesSearch && matchesFilter
  })

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
        <Button className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
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

      {/* Clients Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client, index) => (
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
                        {client.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{client.name}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </p>
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
                      <DropdownMenuItem>Assign Homework</DropdownMenuItem>
                      <DropdownMenuItem>Send Message</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Archive Client</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Last session
                    </span>
                    <span className="text-foreground">{client.lastSession}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Completion rate
                    </span>
                    <span className={`font-medium ${
                      client.completionRate >= 80 ? "text-primary" :
                      client.completionRate >= 50 ? "text-chart-4" : "text-destructive"
                    }`}>
                      {client.completionRate}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Active homework
                    </span>
                    <span className="text-foreground">{client.assignedHomework}</span>
                  </div>

                  {client.pendingReview > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      <span className="text-xs text-primary font-medium">
                        {client.pendingReview} submission{client.pendingReview > 1 ? "s" : ""} to review
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl">
                    View
                  </Button>
                  <Button size="sm" className="flex-1 rounded-xl">
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
