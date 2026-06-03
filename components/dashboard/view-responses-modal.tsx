"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getClient } from "@/lib/supabase/client"
import { 
  Loader2, 
  FileText, 
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Printer
} from "lucide-react"

interface ViewResponsesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignmentId: string | null
}

interface Question {
  id: string
  question_text: string
  question_type: string
  options: string[] | null
  order_index: number
}

interface Response {
  id: string
  question_id: string
  answer_text: string | null
  answer_json: string[] | number | null
}

interface Assignment {
  id: string
  status: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  clients: {
    full_name: string
    email: string | null
  }
  worksheet_templates: {
    title: string
    description: string | null
  }
}

export function ViewResponsesModal({ open, onOpenChange, assignmentId }: ViewResponsesModalProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (open && assignmentId) {
      fetchData()
    }
  }, [open, assignmentId])

  const fetchData = async () => {
    if (!assignmentId) return

    setIsLoading(true)

    try {
      const supabase = getClient()

      // Fetch assignment with client and template info
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("worksheet_assignments")
        .select(`
          *,
          clients (
            full_name,
            email
          ),
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

      // Fetch responses
      const { data: responsesData } = await supabase
        .from("worksheet_responses")
        .select("*")
        .eq("assignment_id", assignmentId)

      setResponses(responsesData || [])
    } catch (err) {
      console.error("Error fetching responses:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getResponseForQuestion = (questionId: string) => {
    return responses.find(r => r.question_id === questionId)
  }

  const formatAnswer = (question: Question, response: Response | undefined) => {
    if (!response) return <span className="text-muted-foreground italic">No answer provided</span>

    if (response.answer_text) {
      return <span className="whitespace-pre-wrap">{response.answer_text}</span>
    }

    if (response.answer_json) {
      if (Array.isArray(response.answer_json)) {
        return (
          <ul className="list-disc list-inside space-y-1">
            {response.answer_json.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )
      }
      if (typeof response.answer_json === "number") {
        return (
          <div className="flex items-center gap-2">
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full" 
                style={{ width: `${(response.answer_json / 10) * 100}%` }}
              />
            </div>
            <span className="font-medium">{response.answer_json}/10</span>
          </div>
        )
      }
    }

    return <span className="text-muted-foreground italic">No answer provided</span>
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl print:max-w-none print:h-auto print:overflow-visible">
        <DialogHeader className="print:mb-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Worksheet Responses
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !assignment ? (
          <div className="py-8 text-center text-muted-foreground">
            Assignment not found
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            <Card className="rounded-xl print:shadow-none print:border">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{assignment.worksheet_templates?.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {assignment.clients?.full_name}
                      </span>
                      {assignment.completed_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Completed {new Date(assignment.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={assignment.status === "completed" ? "default" : "secondary"}
                      className="rounded-lg"
                    >
                      {assignment.status === "completed" ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</>
                      ) : (
                        <><Clock className="w-3 h-3 mr-1" /> {assignment.status}</>
                      )}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrint}
                      className="rounded-lg print:hidden"
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions and Responses */}
            <div className="space-y-4">
              {questions.map((question, index) => {
                const response = getResponseForQuestion(question.id)
                return (
                  <Card key={question.id} className="rounded-xl print:shadow-none print:border print:break-inside-avoid">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-muted-foreground mt-0.5">
                          {index + 1}.
                        </span>
                        <div className="flex-1 space-y-2">
                          <p className="font-medium text-foreground">{question.question_text}</p>
                          <div className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                            {formatAnswer(question, response)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {questions.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No questions in this worksheet
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
