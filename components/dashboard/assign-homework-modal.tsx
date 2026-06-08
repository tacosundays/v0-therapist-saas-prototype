"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getClient } from "@/lib/supabase/client"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { Loader2, Calendar } from "lucide-react"

interface Client {
  id: string
  full_name: string
}

interface AssignHomeworkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignmentCreated: () => void
  preselectedClientId?: string
  prefilledTitle?: string
  prefilledDescription?: string
}

export function AssignHomeworkModal({ 
  open, 
  onOpenChange, 
  onAssignmentCreated,
  preselectedClientId,
  prefilledTitle,
  prefilledDescription
}: AssignHomeworkModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || "")
  const [title, setTitle] = useState(prefilledTitle || "")
  const [description, setDescription] = useState(prefilledDescription || "")
  const [dueDate, setDueDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch clients when modal opens
  useEffect(() => {
    if (open) {
      fetchClients()
      if (preselectedClientId) {
        setSelectedClientId(preselectedClientId)
      }
      if (prefilledTitle) {
        setTitle(prefilledTitle)
      }
      if (prefilledDescription) {
        setDescription(prefilledDescription)
      }
    }
  }, [open, preselectedClientId, prefilledTitle, prefilledDescription])

  const fetchClients = async () => {
    setIsLoadingClients(true)
    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { therapistId, userEmail } = await getTherapistId()

      console.log("[v0] Assign homework: auth email:", userEmail)
      console.log("[v0] Assign homework: therapist id found:", therapistId ?? "none")

      if (!therapistId) return

      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name")
        .eq("therapist_id", therapistId)
        .order("full_name", { ascending: true })

      if (error) {
        console.error("Error fetching clients:", error)
        return
      }

      console.log("[v0] Assign homework: clients count:", data?.length ?? 0)
      setClients(data || [])
    } catch (err) {
      console.error("Exception fetching clients:", err)
    } finally {
      setIsLoadingClients(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const supabase = getClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError("You must be logged in to assign homework")
        return
      }

      const { therapistId, userEmail } = await getTherapistId()

      console.log("[v0] Assign homework submit: auth email:", userEmail)
      console.log("[v0] Assign homework submit: therapist id found:", therapistId ?? "none")

      if (!therapistId) {
        setError("No therapist account found for your email.")
        return
      }

      // Insert assignment
      const { error: insertError } = await supabase
        .from("assignments")
        .insert({
          therapist_id: therapistId,
          client_id: selectedClientId,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          completed: false,
        })

      if (insertError) {
        console.error("Error creating assignment:", insertError)
        setError(insertError.message)
        return
      }

      console.log("Assignment created successfully")
      setSuccess(true)
      
      // Reset form
      setSelectedClientId(preselectedClientId || "")
      setTitle(prefilledTitle || "")
      setDescription(prefilledDescription || "")
      setDueDate("")
      
      // Notify parent and close modal after brief delay
      setTimeout(() => {
        onAssignmentCreated()
        onOpenChange(false)
        setSuccess(false)
      }, 1000)
      
    } catch (err) {
      console.error("Exception creating assignment:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSelectedClientId(preselectedClientId || "")
      setTitle(prefilledTitle || "")
      setDescription(prefilledDescription || "")
      setDueDate("")
      setError(null)
      setSuccess(false)
      onOpenChange(false)
    }
  }

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Assign Homework</DialogTitle>
          <DialogDescription>
            Create a new homework assignment for your client.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            {isLoadingClients ? (
              <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-input">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading clients...</span>
              </div>
            ) : clients.length === 0 ? (
              <div className="p-3 bg-muted/50 text-muted-foreground text-sm rounded-xl">
                No clients found. Add a client first before assigning homework.
              </div>
            ) : (
              <Select 
                value={selectedClientId} 
                onValueChange={setSelectedClientId}
                disabled={isLoading}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Homework Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Daily Thought Journal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Instructions or notes for the client..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl min-h-[100px] resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date (optional)</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 rounded-xl pl-10"
                min={getMinDate()}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-primary/10 text-primary text-sm rounded-xl">
              Homework assigned successfully!
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedClientId || !title.trim() || clients.length === 0}
              className="rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Homework"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
