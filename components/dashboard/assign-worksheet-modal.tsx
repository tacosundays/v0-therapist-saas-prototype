"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import { Loader2, FileText, Calendar } from "lucide-react"

interface AssignWorksheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
  preselectedClientId?: string
  preselectedTemplateId?: string
}

interface Client {
  id: string
  full_name: string
  email: string | null
}

interface WorksheetTemplate {
  id: string
  title: string
  description: string | null
  category: string
}

export function AssignWorksheetModal({ 
  open, 
  onOpenChange, 
  onAssigned,
  preselectedClientId,
  preselectedTemplateId 
}: AssignWorksheetModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<WorksheetTemplate[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [dueDate, setDueDate] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchData()
      if (preselectedClientId) {
        setSelectedClient(preselectedClientId)
      }
      if (preselectedTemplateId) {
        setSelectedTemplate(preselectedTemplateId)
      }
    }
  }, [open, preselectedClientId, preselectedTemplateId])

  const fetchData = async () => {
    setIsFetching(true)
    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { therapistId, userEmail } = await getTherapistId()

      console.log("[v0] Assign worksheet: auth email:", userEmail)
      console.log("[v0] Assign worksheet: therapist id found:", therapistId ?? "none")

      if (!therapistId) return

      // Fetch clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, full_name, email")
        .eq("therapist_id", therapistId)
        .order("full_name")

      console.log("[v0] Assign worksheet: clients count:", clientsData?.length ?? 0)
      setClients(clientsData || [])

      // Fetch worksheet templates
      const { data: templatesData } = await supabase
        .from("worksheet_templates")
        .select("id, title, description, category")
        .eq("therapist_id", therapistId)
        .order("created_at", { ascending: false })

      setTemplates(templatesData || [])
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedClient || !selectedTemplate) {
      setError("Please select a client and worksheet")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("Please log in")
        setIsLoading(false)
        return
      }

      const { therapistId, userEmail } = await getTherapistId()

      console.log("[v0] Assign worksheet submit: auth email:", userEmail)
      console.log("[v0] Assign worksheet submit: therapist id found:", therapistId ?? "none")

      if (!therapistId) {
        setError("No therapist account found for your email.")
        setIsLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from("worksheet_assignments")
        .insert({
          therapist_id: therapistId,
          client_id: selectedClient,
          worksheet_template_id: selectedTemplate,
          due_date: dueDate || null,
          status: "assigned",
        })

      if (insertError) throw insertError

      // Reset form
      setSelectedClient(preselectedClientId || "")
      setSelectedTemplate(preselectedTemplateId || "")
      setDueDate("")
      onAssigned()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign worksheet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSelectedClient(preselectedClientId || "")
      setSelectedTemplate(preselectedTemplateId || "")
      setDueDate("")
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Assign Online Worksheet</DialogTitle>
          <DialogDescription>
            Assign an interactive worksheet for a client to complete online.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">No worksheets yet</p>
            <p className="text-sm text-muted-foreground">
              Create an online worksheet first before assigning.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Worksheet</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a worksheet" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {template.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date (optional)
              </Label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || templates.length === 0}
            className="rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Worksheet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
