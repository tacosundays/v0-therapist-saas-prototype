"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getClient } from "@/lib/supabase/client"
import { 
  Loader2, 
  CheckCircle2,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Save,
  Cloud,
  CloudOff
} from "lucide-react"
import { motion } from "framer-motion"

interface WorksheetFormProps {
  assignmentId: string
  onComplete: () => void
  onBack: () => void
}

interface Question {
  id: string
  question_text: string
  question_type: string
  options: string[] | { min: number; max: number; labels?: Record<string, string> } | null
  required: boolean
  order_index: number
}

interface Assignment {
  id: string
  worksheet_template_id: string
  status: string
  due_date: string | null
  worksheet_templates: {
    title: string
    description: string | null
  }
}

export function WorksheetForm({ assignmentId, onComplete, onBack }: WorksheetFormProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasUnsavedChanges = useRef(false)

  useEffect(() => {
    fetchWorksheetData()
  }, [assignmentId])

  // Auto-save function
  const saveProgress = useCallback(async (answersToSave: Record<string, string | string[] | number>) => {
    if (Object.keys(answersToSave).length === 0) return

    setIsSaving(true)
    setSaveError(false)

    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setSaveError(true)
        return
      }

      // Upsert responses (delete existing and insert new)
      const responses = Object.entries(answersToSave).map(([questionId, answer]) => {
        const isComplex = Array.isArray(answer) || typeof answer === "number"
        return {
          assignment_id: assignmentId,
          client_id: user.id,
          question_id: questionId,
          answer_text: isComplex ? null : String(answer),
          answer_json: isComplex ? answer : null,
        }
      })

      // Delete existing responses for questions we're updating
      const questionIds = Object.keys(answersToSave)
      await supabase
        .from("worksheet_responses")
        .delete()
        .eq("assignment_id", assignmentId)
        .in("question_id", questionIds)

      // Insert new responses
      const { error: insertError } = await supabase
        .from("worksheet_responses")
        .insert(responses)

      if (insertError) throw insertError

      // Update assignment status to in_progress if not already
      await supabase
        .from("worksheet_assignments")
        .update({ status: "in_progress" })
        .eq("id", assignmentId)
        .eq("status", "assigned")

      setLastSaved(new Date())
      hasUnsavedChanges.current = false
    } catch (err) {
      console.error("Auto-save error:", err)
      setSaveError(true)
    } finally {
      setIsSaving(false)
    }
  }, [assignmentId])

  // Debounced auto-save
  useEffect(() => {
    if (hasUnsavedChanges.current && Object.keys(answers).length > 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(answers)
      }, 2000) // Save after 2 seconds of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [answers, saveProgress])

  const fetchWorksheetData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getClient()

      // Fetch assignment with template
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("worksheet_assignments")
        .select(`
          *,
          worksheet_templates (
            title,
            description
          )
        `)
        .eq("id", assignmentId)
        .single()

      if (assignmentError) throw assignmentError
      setAssignment(assignmentData)

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("worksheet_questions")
        .select("*")
        .eq("worksheet_template_id", assignmentData.worksheet_template_id)
        .order("order_index", { ascending: true })

      if (questionsError) throw questionsError
      setQuestions(questionsData || [])

      // Fetch existing responses
      const { data: responsesData } = await supabase
        .from("worksheet_responses")
        .select("*")
        .eq("assignment_id", assignmentId)

      if (responsesData && responsesData.length > 0) {
        const existingAnswers: Record<string, string | string[] | number> = {}
        responsesData.forEach(response => {
          if (response.answer_json) {
            existingAnswers[response.question_id] = response.answer_json
          } else if (response.answer_text) {
            existingAnswers[response.question_id] = response.answer_text
          }
        })
        setAnswers(existingAnswers)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load worksheet")
    } finally {
      setIsLoading(false)
    }
  }

  const updateAnswer = (questionId: string, value: string | string[] | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    hasUnsavedChanges.current = true
  }

  // Calculate progress percentage
  const answeredCount = questions.filter(q => {
    const answer = answers[q.id]
    if (answer === undefined || answer === null || answer === "") return false
    if (Array.isArray(answer) && answer.length === 0) return false
    return true
  }).length
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0

  const handleSubmit = async () => {
    // Validate required questions
    const missingRequired = questions.filter(q => {
      if (!q.required) return false
      const answer = answers[q.id]
      if (answer === undefined || answer === null || answer === "") return true
      if (Array.isArray(answer) && answer.length === 0) return true
      return false
    })

    if (missingRequired.length > 0) {
      setError(`Please answer all required questions (${missingRequired.length} remaining)`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("Please log in")
        setIsSubmitting(false)
        return
      }

      // Delete existing responses for this assignment
      await supabase
        .from("worksheet_responses")
        .delete()
        .eq("assignment_id", assignmentId)

      // Insert new responses
      const responses = Object.entries(answers).map(([questionId, answer]) => {
        const isComplex = Array.isArray(answer) || typeof answer === "number"
        return {
          assignment_id: assignmentId,
          client_id: user.id,
          question_id: questionId,
          answer_text: isComplex ? null : String(answer),
          answer_json: isComplex ? answer : null,
        }
      })

      if (responses.length > 0) {
        const { error: responsesError } = await supabase
          .from("worksheet_responses")
          .insert(responses)

        if (responsesError) throw responsesError
      }

      // Update assignment status
      const { error: updateError } = await supabase
        .from("worksheet_assignments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)

      if (updateError) throw updateError

      setSubmitSuccess(true)
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit worksheet")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestion = (question: Question, index: number) => {
    const value = answers[question.id]

    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="rounded-xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-muted-foreground mt-0.5">
                {index + 1}.
              </span>
              <div className="flex-1">
                <Label className="text-base font-medium">
                  {question.question_text}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </Label>
              </div>
            </div>

            <div className="pl-6">
              {question.question_type === "short_text" && (
                <Input
                  value={(value as string) || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  placeholder="Your answer..."
                  className="rounded-lg"
                />
              )}

              {question.question_type === "long_text" && (
                <Textarea
                  value={(value as string) || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  placeholder="Your answer..."
                  className="rounded-lg min-h-24"
                />
              )}

              {question.question_type === "scale" && (
                <div className="space-y-3">
                  <Slider
                    value={[(value as number) || 5]}
                    onValueChange={([v]) => updateAnswer(question.id, v)}
                    min={1}
                    max={10}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 - Not at all</span>
                    <span className="font-medium text-foreground">
                      {value !== undefined ? value : 5}
                    </span>
                    <span>10 - Extremely</span>
                  </div>
                </div>
              )}

              {question.question_type === "multiple_choice" && Array.isArray(question.options) && (
                <RadioGroup
                  value={(value as string) || ""}
                  onValueChange={(v) => updateAnswer(question.id, v)}
                  className="space-y-2"
                >
                  {question.options.map((option, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                      <Label htmlFor={`${question.id}-${i}`} className="font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {question.question_type === "checkbox" && Array.isArray(question.options) && (
                <div className="space-y-2">
                  {question.options.map((option, i) => {
                    const checked = Array.isArray(value) && value.includes(option)
                    return (
                      <div key={i} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${question.id}-${i}`}
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            const currentValues = (value as string[]) || []
                            if (isChecked) {
                              updateAnswer(question.id, [...currentValues, option])
                            } else {
                              updateAnswer(question.id, currentValues.filter(v => v !== option))
                            }
                          }}
                        />
                        <Label htmlFor={`${question.id}-${i}`} className="font-normal cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              )}

              {question.question_type === "date" && (
                <Input
                  type="date"
                  value={(value as string) || ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  className="rounded-lg w-auto"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !assignment) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Error loading worksheet</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={onBack} variant="outline" className="mt-4 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (submitSuccess) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          </motion.div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Worksheet Submitted!</h3>
          <p className="text-muted-foreground">Your therapist will review your responses.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="ghost" className="rounded-xl">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to assignments
      </Button>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              {assignment?.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due {new Date(assignment.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
            {/* Auto-save status */}
            <div className="flex items-center gap-1.5 text-xs">
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveError ? (
                <>
                  <CloudOff className="w-3 h-3 text-destructive" />
                  <span className="text-destructive">Save failed</span>
                </>
              ) : lastSaved ? (
                <>
                  <Cloud className="w-3 h-3 text-primary" />
                  <span>Saved</span>
                </>
              ) : null}
            </div>
          </div>
          <CardTitle className="text-xl">{assignment?.worksheet_templates?.title}</CardTitle>
          {assignment?.worksheet_templates?.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {assignment.worksheet_templates.description}
            </p>
          )}
          {/* Progress bar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{answeredCount} of {questions.length} questions</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => renderQuestion(question, index))}
      </div>

      {error && (
        <Card className="rounded-xl border-destructive bg-destructive/10">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full h-12 rounded-xl text-base"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Submit Worksheet
          </>
        )}
      </Button>
    </div>
  )
}
