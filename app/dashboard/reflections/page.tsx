"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Loader2, MessageSquare, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"

interface ClientRecord {
  id: string
  full_name: string
  email: string | null
}

interface ClientReflection {
  id: string
  client_id: string
  title: string | null
  reflection_text: string
  mood_rating: number | null
  created_at: string
}

interface MoodCheckIn {
  id: string
  client_id: string
  mood_rating: number
  anxiety_rating: number | null
  stress_rating: number | null
  note: string | null
  created_at: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function ReflectionsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [reflections, setReflections] = useState<ClientReflection[]>([])
  const [moodCheckIns, setMoodCheckIns] = useState<MoodCheckIn[]>([])
  const [selectedClientId, setSelectedClientId] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReflections = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = getClient() as any
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] Reflections: auth email:", userEmail)
        console.log("[v0] Reflections: therapist id found:", therapistId ?? "none")

        if (!therapistId) {
          setError("No therapist account found for your email.")
          return
        }

        const [clientsResult, reflectionsResult, moodResult] = await Promise.all([
          supabase
            .from("clients")
            .select("id, full_name, email")
            .eq("therapist_id", therapistId)
            .order("full_name", { ascending: true }),
          supabase
            .from("client_reflections")
            .select("id, client_id, title, reflection_text, mood_rating, created_at")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("client_mood_checkins")
            .select("id, client_id, mood_rating, anxiety_rating, stress_rating, note, created_at")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
        ])

        if (clientsResult.error) throw clientsResult.error
        if (reflectionsResult.error) throw reflectionsResult.error
        if (moodResult.error) throw moodResult.error

        setClients(clientsResult.data || [])
        setReflections(reflectionsResult.data || [])
        setMoodCheckIns(moodResult.data || [])
      } catch (err) {
        console.error("[v0] Reflections: failed to load", err)
        setError(err instanceof Error ? err.message : "Failed to load reflections.")
      } finally {
        setIsLoading(false)
      }
    }

    loadReflections()
  }, [])

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])
  const reflectionFeed = [
    ...reflections.map((reflection) => ({
      type: "reflection" as const,
      id: reflection.id,
      client_id: reflection.client_id,
      title: reflection.title || "Untitled reflection",
      body: reflection.reflection_text,
      mood_rating: reflection.mood_rating,
      anxiety_rating: null,
      stress_rating: null,
      created_at: reflection.created_at,
    })),
    ...moodCheckIns.map((checkIn) => ({
      type: "mood" as const,
      id: checkIn.id,
      client_id: checkIn.client_id,
      title: "Mood check-in",
      body: checkIn.note || "",
      mood_rating: checkIn.mood_rating,
      anxiety_rating: checkIn.anxiety_rating,
      stress_rating: checkIn.stress_rating,
      created_at: checkIn.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filteredFeed = reflectionFeed.filter((item) => {
    const client = clientsById.get(item.client_id)
    const label = item.type === "mood" ? "mood check-in" : "reflection"
    const matchesClient = selectedClientId === "all" || item.client_id === selectedClientId
    const searchTarget = [
      label,
      item.title,
      item.body,
      client?.full_name,
      client?.email,
    ].filter(Boolean).join(" ").toLowerCase()
    return matchesClient && searchTarget.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          Reflections
        </motion.h1>
        <p className="text-muted-foreground mt-1">Review client journal entries submitted between sessions</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search reflections..."
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="h-11 rounded-xl md:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {!isLoading && !error && filteredFeed.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-foreground">No entries found</p>
            <p className="text-sm text-muted-foreground mt-1">Client reflections and mood check-ins will appear here after submission.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredFeed.length > 0 && (
        <div className="space-y-4">
          {filteredFeed.map((item) => {
            const client = clientsById.get(item.client_id)
            return (
              <Card key={`${item.type}-${item.id}`} className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {client?.full_name || "Unknown client"} · {item.type === "mood" ? "Mood check-in" : "Reflection"} · {formatDate(item.created_at)}
                      </p>
                    </div>
                    {item.mood_rating && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary shrink-0">
                        Mood {item.mood_rating}/10
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {item.type === "mood" && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.anxiety_rating && <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">Anxiety {item.anxiety_rating}/10</span>}
                      {item.stress_rating && <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">Stress {item.stress_rating}/10</span>}
                    </div>
                  )}
                  {item.body ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{item.body}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No note provided.</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
