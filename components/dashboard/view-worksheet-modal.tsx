"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Loader2, 
  FileText, 
  Pencil, 
  Trash2,
  Users,
  TextCursorInput,
  AlignLeft,
  SlidersHorizontal,
  CheckSquare,
  List,
  Calendar
} from "lucide-react"
import { getClient } from "@/lib/supabase/client"

interface WorksheetQuestion {
  id: string
  question_text: string
  question_type: string
  options: { choices?: string[] } | null
  required: boolean
  order_index: number
}

interface WorksheetTemplate {
  id: string
  title: string
  description: string | null
  category: string
  source_type: string
  created_at: string
}

interface ViewWorksheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  worksheetId: string | null
  onAssign: () => void
  onEdit?: () => void
  onDeleted: () => void
}

const questionTypeIcons: Record<string, typeof TextCursorInput> = {
  short_text: TextCursorInput,
  long_text: AlignLeft,
  scale: SlidersHorizontal,
  checkbox: CheckSquare,
  multiple_choice: List,
  date: Calendar,
}

const questionTypeLabels: Record<string, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  scale: "Scale (1-10)",
  checkbox: "Checkbox",
  multiple_choice: "Multiple Choice",
  date: "Date",
}

export function ViewWorksheetModal({
  open,
  onOpenChange,
  worksheetId,
  onAssign,
  onEdit,
  onDeleted,
}: ViewWorksheetModalProps) {
  const [worksheet, setWorksheet] = useState<WorksheetTemplate | null>(null)
  const [questions, setQuestions] = useState<WorksheetQuestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (open && worksheetId) {
      fetchWorksheet()
    }
  }, [open, worksheetId])

  const fetchWorksheet = async () => {
    if (!worksheetId) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = getClient()

      // Fetch template
      const { data: templateData, error: templateError } = await supabase
        .from("worksheet_templates")
        .select("*")
        .eq("id", worksheetId)
        .single()

      if (templateError) {
        setError(templateError.message)
        return
      }

      setWorksheet(templateData)

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("worksheet_questions")
        .select("*")
        .eq("worksheet_template_id", worksheetId)
        .order("order_index", { ascending: true })

      if (questionsError) {
        setError(questionsError.message)
        return
      }

      setQuestions(questionsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load worksheet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!worksheetId) return

    setIsDeleting(true)

    try {
      const supabase = getClient()

      // Delete questions first (cascade should handle this, but being explicit)
      await supabase
        .from("worksheet_questions")
        .delete()
        .eq("worksheet_template_id", worksheetId)

      // Delete template
      const { error } = await supabase
        .from("worksheet_templates")
        .delete()
        .eq("id", worksheetId)

      if (error) {
        setError(error.message)
        return
      }

      setShowDeleteConfirm(false)
      onOpenChange(false)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete worksheet")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAssign = () => {
    onOpenChange(false)
    onAssign()
  }

  const categoryColors: Record<string, string> = {
    cbt: "bg-chart-1/10 text-chart-1",
    dbt: "bg-chart-2/10 text-chart-2",
    act: "bg-chart-3/10 text-chart-3",
    mindfulness: "bg-chart-4/10 text-chart-4",
    journaling: "bg-chart-5/10 text-chart-5",
    custom: "bg-primary/10 text-primary",
  }

  const sourceTypeLabels: Record<string, string> = {
    ai: "AI Generated",
    custom: "Custom",
    premade: "Premade",
    uploaded: "Uploaded",
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isLoading ? "Loading..." : worksheet?.title || "Worksheet"}
            </DialogTitle>
            <DialogDescription>
              Preview worksheet details and questions
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchWorksheet} 
                className="mt-4 rounded-xl"
              >
                Try Again
              </Button>
            </div>
          ) : worksheet ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`rounded-lg ${categoryColors[worksheet.category.toLowerCase()] || categoryColors.custom} border-0`}>
                  {worksheet.category.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="rounded-lg">
                  <FileText className="w-3 h-3 mr-1" />
                  {sourceTypeLabels[worksheet.source_type] || "Custom"}
                </Badge>
                <Badge variant="secondary" className="rounded-lg">
                  {questions.length} question{questions.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {worksheet.description && (
                <p className="text-muted-foreground text-sm">
                  {worksheet.description}
                </p>
              )}

              <ScrollArea className="flex-1 max-h-[400px] pr-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Questions
                  </h3>
                  {questions.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      No questions added to this worksheet yet.
                    </p>
                  ) : (
                    questions.map((question, index) => {
                      const TypeIcon = questionTypeIcons[question.question_type] || TextCursorInput
                      return (
                        <div
                          key={question.id}
                          className="p-4 bg-muted/30 rounded-xl space-y-2"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1 space-y-2">
                              <p className="font-medium text-foreground">
                                {question.question_text}
                                {question.required && (
                                  <span className="text-destructive ml-1">*</span>
                                )}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="rounded-lg text-xs">
                                  <TypeIcon className="w-3 h-3 mr-1" />
                                  {questionTypeLabels[question.question_type] || question.question_type}
                                </Badge>
                              </div>
                              {question.options?.choices && question.options.choices.length > 0 && (
                                <div className="pl-4 border-l-2 border-border mt-2">
                                  <p className="text-xs text-muted-foreground mb-1">Options:</p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {question.options.choices.map((opt, i) => (
                                      <li key={i} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                                        {opt}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={onEdit}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={handleAssign}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Assign to Client
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worksheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{worksheet?.title}&quot; and all its questions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
