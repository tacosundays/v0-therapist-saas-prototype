"use client"

import { useState } from "react"
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
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { getClient } from "@/lib/supabase/client"
import { 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical,
  Type,
  AlignLeft,
  ListChecks,
  CircleDot,
  Calendar,
  Gauge
} from "lucide-react"

interface CreateWorksheetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorksheetCreated: () => void
}

interface Question {
  id: string
  question_text: string
  question_type: "short_text" | "long_text" | "scale" | "checkbox" | "multiple_choice" | "date"
  options: string[] | null
  required: boolean
  order_index: number
}

const questionTypes = [
  { value: "short_text", label: "Short Text", icon: Type, description: "Single line answer" },
  { value: "long_text", label: "Long Text", icon: AlignLeft, description: "Multi-line answer" },
  { value: "scale", label: "Scale (1-10)", icon: Gauge, description: "Rating scale" },
  { value: "multiple_choice", label: "Multiple Choice", icon: CircleDot, description: "Select one option" },
  { value: "checkbox", label: "Checkboxes", icon: ListChecks, description: "Select multiple options" },
  { value: "date", label: "Date", icon: Calendar, description: "Date picker" },
]

const categories = [
  { value: "cbt", label: "CBT" },
  { value: "dbt", label: "DBT" },
  { value: "act", label: "ACT" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "journaling", label: "Journaling" },
  { value: "custom", label: "Custom" },
]

export function CreateWorksheetModal({ open, onOpenChange, onWorksheetCreated }: CreateWorksheetModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("custom")
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      question_text: "",
      question_type: "short_text",
      options: null,
      required: false,
      order_index: questions.length,
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id).map((q, i) => ({ ...q, order_index: i })))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required")
      return
    }

    if (questions.length === 0) {
      setError("Add at least one question")
      return
    }

    const emptyQuestions = questions.filter(q => !q.question_text.trim())
    if (emptyQuestions.length > 0) {
      setError("All questions must have text")
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

      // Create worksheet template
      const { data: template, error: templateError } = await supabase
        .from("worksheet_templates")
        .insert({
          therapist_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category,
          source_type: "custom",
        })
        .select()
        .single()

      if (templateError) throw templateError

      // Create questions
      const questionsToInsert = questions.map(q => ({
        worksheet_template_id: template.id,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options: q.options && q.options.length > 0 ? q.options : null,
        required: q.required,
        order_index: q.order_index,
      }))

      const { error: questionsError } = await supabase
        .from("worksheet_questions")
        .insert(questionsToInsert)

      if (questionsError) throw questionsError

      // Reset form
      setTitle("")
      setDescription("")
      setCategory("custom")
      setQuestions([])
      onWorksheetCreated()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create worksheet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setTitle("")
      setDescription("")
      setCategory("custom")
      setQuestions([])
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create Online Worksheet</DialogTitle>
          <DialogDescription>
            Build an interactive worksheet that clients can fill out online.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Worksheet Title</Label>
              <Input
                id="title"
                placeholder="e.g., Anxiety Thought Record"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this worksheet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
                className="rounded-xl"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <Card className="rounded-xl border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>No questions yet. Click "Add Question" to start building your worksheet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <Card key={question.id} className="rounded-xl">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-2 text-muted-foreground cursor-grab">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Q{index + 1}
                            </span>
                            <Input
                              placeholder="Enter your question..."
                              value={question.question_text}
                              onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                              className="flex-1 rounded-lg"
                            />
                          </div>

                          <div className="flex items-center gap-4 flex-wrap">
                            <Select
                              value={question.question_type}
                              onValueChange={(value) => updateQuestion(question.id, { 
                                question_type: value as Question["question_type"],
                                options: (value === "multiple_choice" || value === "checkbox") ? ["Option 1", "Option 2"] : null
                              })}
                            >
                              <SelectTrigger className="w-44 rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {questionTypes.map(type => {
                                  const Icon = type.icon
                                  return (
                                    <SelectItem key={type.value} value={type.value}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        {type.label}
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2">
                              <Switch
                                id={`required-${question.id}`}
                                checked={question.required}
                                onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                              />
                              <Label htmlFor={`required-${question.id}`} className="text-sm">
                                Required
                              </Label>
                            </div>
                          </div>

                          {/* Options for multiple choice / checkbox */}
                          {(question.question_type === "multiple_choice" || question.question_type === "checkbox") && (
                            <div className="space-y-2 pl-4 border-l-2 border-muted">
                              <Label className="text-xs text-muted-foreground">Options</Label>
                              {(question.options || []).map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...(question.options || [])]
                                      newOptions[optIndex] = e.target.value
                                      updateQuestion(question.id, { options: newOptions })
                                    }}
                                    className="flex-1 h-8 rounded-lg text-sm"
                                    placeholder={`Option ${optIndex + 1}`}
                                  />
                                  {(question.options || []).length > 2 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newOptions = (question.options || []).filter((_, i) => i !== optIndex)
                                        updateQuestion(question.id, { options: newOptions })
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newOptions = [...(question.options || []), `Option ${(question.options || []).length + 1}`]
                                  updateQuestion(question.id, { options: newOptions })
                                }}
                                className="h-8 text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

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
            disabled={isLoading}
            className="rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Worksheet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
