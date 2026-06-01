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
import { 
  Loader2, 
  Sparkles, 
  Save, 
  Edit3, 
  UserPlus,
  ChevronLeft,
  FileText
} from "lucide-react"

interface GeneratedWorksheet {
  title: string
  educationalContent: string
  reflectionQuestions: string[]
  exercises: { title: string; instructions: string }[]
  journalPrompts: string[]
}

interface Client {
  id: string
  full_name: string
}

interface GenerateWorksheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorksheetSaved: () => void
}

type Step = "input" | "generating" | "preview" | "edit" | "assign"

export function GenerateWorksheetModal({ 
  open, 
  onOpenChange, 
  onWorksheetSaved 
}: GenerateWorksheetModalProps) {
  const [step, setStep] = useState<Step>("input")
  const [topic, setTopic] = useState("")
  const [goal, setGoal] = useState("")
  const [clientIssue, setClientIssue] = useState("")
  const [category, setCategory] = useState("cbt")
  const [worksheet, setWorksheet] = useState<GeneratedWorksheet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // For assigning
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [isLoadingClients, setIsLoadingClients] = useState(false)

  // Editable fields
  const [editedTitle, setEditedTitle] = useState("")
  const [editedContent, setEditedContent] = useState("")

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setStep("input")
      setTopic("")
      setGoal("")
      setClientIssue("")
      setCategory("cbt")
      setWorksheet(null)
      setError(null)
      setEditedTitle("")
      setEditedContent("")
      setSelectedClientId("")
    }
  }, [open])

  const handleGenerate = async () => {
    if (!topic.trim() || !goal.trim()) {
      setError("Please enter both topic and goal")
      return
    }

    setStep("generating")
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/generate-worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, goal, clientIssue }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate worksheet")
      }

      const data = await response.json()
      setWorksheet(data.worksheet)
      setEditedTitle(data.worksheet.title)
      setEditedContent(formatWorksheetContent(data.worksheet))
      setStep("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate worksheet")
      setStep("input")
    } finally {
      setIsLoading(false)
    }
  }

  const formatWorksheetContent = (ws: GeneratedWorksheet): string => {
    let content = `${ws.educationalContent}\n\n`
    content += "## Reflection Questions\n\n"
    ws.reflectionQuestions.forEach((q, i) => {
      content += `${i + 1}. ${q}\n`
    })
    content += "\n## Exercises\n\n"
    ws.exercises.forEach((ex) => {
      content += `### ${ex.title}\n${ex.instructions}\n\n`
    })
    content += "## Journal Prompts\n\n"
    ws.journalPrompts.forEach((p, i) => {
      content += `${i + 1}. ${p}\n`
    })
    return content
  }

  const handleSaveToLibrary = async () => {
    if (!worksheet) return

    setIsSaving(true)
    setError(null)

    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in")
        return
      }

      const { error: insertError } = await supabase
        .from("custom_worksheets")
        .insert({
          therapist_id: user.id,
          title: editedTitle || worksheet.title,
          description: `AI-generated worksheet: ${topic}`,
          content: editedContent,
          category: category,
          worksheet_type: "ai_generated",
        })

      if (insertError) {
        setError(insertError.message)
        return
      }

      onWorksheetSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save worksheet")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAssignClick = async () => {
    setStep("assign")
    setIsLoadingClients(true)

    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from("clients")
        .select("id, full_name")
        .eq("therapist_id", user.id)
        .order("full_name")

      setClients(data || [])
    } catch (err) {
      console.error("Error fetching clients:", err)
    } finally {
      setIsLoadingClients(false)
    }
  }

  const handleAssignAndSave = async () => {
    if (!worksheet || !selectedClientId) return

    setIsSaving(true)
    setError(null)

    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in")
        return
      }

      // Save to custom worksheets
      const { data: savedWorksheet, error: insertError } = await supabase
        .from("custom_worksheets")
        .insert({
          therapist_id: user.id,
          title: editedTitle || worksheet.title,
          description: `AI-generated worksheet: ${topic}`,
          content: editedContent,
          category: category,
          worksheet_type: "ai_generated",
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Create assignment
      const { error: assignError } = await supabase
        .from("assignments")
        .insert({
          therapist_id: user.id,
          client_id: selectedClientId,
          title: editedTitle || worksheet.title,
          description: editedContent.substring(0, 500) + "...",
        })

      if (assignError) {
        setError(assignError.message)
        return
      }

      onWorksheetSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save and assign")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        {/* Input Step */}
        {step === "input" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate Worksheet with AI
              </DialogTitle>
              <DialogDescription>
                Describe the topic and therapeutic goal, and AI will create a complete worksheet.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Managing Anxiety, Building Self-Compassion"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Therapeutic Goal *</Label>
                <Input
                  id="goal"
                  placeholder="e.g., Help clients identify anxiety triggers"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientIssue">Client Issue (optional)</Label>
                <Textarea
                  id="clientIssue"
                  placeholder="Describe specific client challenges or context..."
                  value={clientIssue}
                  onChange={(e) => setClientIssue(e.target.value)}
                  className="rounded-xl min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="cbt">CBT</SelectItem>
                    <SelectItem value="dbt">DBT</SelectItem>
                    <SelectItem value="act">ACT</SelectItem>
                    <SelectItem value="mindfulness">Mindfulness</SelectItem>
                    <SelectItem value="journaling">Journaling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={!topic.trim() || !goal.trim()}
                className="rounded-xl"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Worksheet
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Generating Step */}
        {step === "generating" && (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Generating your worksheet...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && worksheet && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep("input")}
                  className="rounded-xl -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </div>
              <DialogTitle className="flex items-center gap-2 mt-2">
                <FileText className="w-5 h-5" />
                {worksheet.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <h4 className="text-base font-semibold">Educational Content</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{worksheet.educationalContent}</p>

                <h4 className="text-base font-semibold mt-4">Reflection Questions</h4>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  {worksheet.reflectionQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>

                <h4 className="text-base font-semibold mt-4">Exercises</h4>
                {worksheet.exercises.map((ex, i) => (
                  <div key={i} className="mb-3">
                    <p className="font-medium">{ex.title}</p>
                    <p className="text-muted-foreground text-sm">{ex.instructions}</p>
                  </div>
                ))}

                <h4 className="text-base font-semibold mt-4">Journal Prompts</h4>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  {worksheet.journalPrompts.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep("edit")} className="rounded-xl">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={handleAssignClick} className="rounded-xl">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to Client
              </Button>
              <Button onClick={handleSaveToLibrary} disabled={isSaving} className="rounded-xl">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save to Library
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Edit Step */}
        {step === "edit" && worksheet && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep("preview")}
                  className="rounded-xl -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </div>
              <DialogTitle>Edit Worksheet</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editTitle">Title</Label>
                <Input
                  id="editTitle"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editContent">Content</Label>
                <Textarea
                  id="editContent"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="rounded-xl min-h-[300px] font-mono text-sm"
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("preview")} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSaveToLibrary} disabled={isSaving} className="rounded-xl">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Assign Step */}
        {step === "assign" && worksheet && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep("preview")}
                  className="rounded-xl -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </div>
              <DialogTitle>Assign to Client</DialogTitle>
              <DialogDescription>
                Save this worksheet to your library and assign it to a client.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                {isLoadingClients ? (
                  <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-input">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading clients...</span>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="p-3 bg-muted/50 text-muted-foreground text-sm rounded-xl">
                    No clients found. Add a client first.
                  </div>
                ) : (
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("preview")} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={handleAssignAndSave} 
                disabled={isSaving || !selectedClientId || clients.length === 0}
                className="rounded-xl"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Save & Assign
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
