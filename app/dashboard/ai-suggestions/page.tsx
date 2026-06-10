"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sparkles,
  Lightbulb,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { getClient } from "@/lib/supabase/client"
import { getTherapistId } from "@/lib/auth/check-user-role"

interface ClientRecord {
  id: string
  full_name: string
  email: string | null
}

interface AssignmentActivity {
  id: string
  client_id: string
  completed: boolean
  reflection: string | null
  completed_at: string | null
}

interface WorksheetActivity {
  id: string
  client_id: string
  status: string
  completed_at: string | null
}

export default function AISuggestionsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentActivity[]>([])
  const [worksheetAssignments, setWorksheetAssignments] = useState<WorksheetActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = getClient()
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] AI Suggestions: auth email:", userEmail)
        console.log("[v0] AI Suggestions: therapist id found:", therapistId ?? "none")

        if (!therapistId) {
          setError("No therapist account found for your email.")
          setIsLoading(false)
          return
        }

        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, full_name, email")
          .eq("therapist_id", therapistId)
          .order("created_at", { ascending: false })

        if (clientsError) {
          setError(clientsError.message)
          setIsLoading(false)
          return
        }

        console.log("[v0] AI Suggestions: clients count:", clientsData?.length ?? 0)
        setClients(clientsData || [])

        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("assignments")
          .select("id, client_id, completed, reflection, completed_at")
          .eq("therapist_id", therapistId)

        if (assignmentsError) {
          console.error("[v0] AI Suggestions: assignments fetch error:", assignmentsError)
        } else {
          setAssignments(assignmentsData || [])
        }

        const { data: worksheetData, error: worksheetError } = await supabase
          .from("worksheet_assignments")
          .select("id, client_id, status, completed_at")
          .eq("therapist_id", therapistId)

        if (worksheetError) {
          console.error("[v0] AI Suggestions: worksheet assignments fetch error:", worksheetError)
        } else {
          setWorksheetAssignments(worksheetData || [])
        }
      } catch (err) {
        console.error("[v0] AI Suggestions: unexpected error:", err)
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const completedAssignments = assignments.filter((assignment) => assignment.completed).length
  const reflections = assignments.filter((assignment) => assignment.reflection?.trim()).length
  const completedWorksheets = worksheetAssignments.filter((assignment) => assignment.status === "completed").length

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground flex items-center gap-2"
          >
            <Sparkles className="w-6 h-6 text-primary" />
            AI Suggestions
          </motion.h1>
          <p className="text-muted-foreground mt-1">Personalized homework recommendations based on client progress</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="rounded-2xl bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">AI Suggestions</h3>
                <p className="text-sm text-muted-foreground">
                  Recommendations will appear here only after ShrinkAid has a real recommendation record for one of your clients.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No AI recommendations available yet.</h3>
            <p className="text-sm text-muted-foreground">
              Real client data loaded: {clients.length} clients, {completedAssignments} completed assignments, {completedWorksheets} completed worksheets, {reflections} reflections.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
