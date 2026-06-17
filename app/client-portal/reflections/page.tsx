"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2, Heart, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { checkUserRole } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"
import { logClientAuditEvent } from "@/lib/audit-client"

interface ClientRecord {
  id: string
  therapist_id: string
  full_name: string
  email: string | null
}

interface ClientReflection {
  id: string
  title: string | null
  reflection_text: string
  mood_rating: number | null
  created_at: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ReflectionJournalPage() {
  const [clientRecord, setClientRecord] = useState<ClientRecord | null>(null)
  const [reflections, setReflections] = useState<ClientReflection[]>([])
  const [title, setTitle] = useState("")
  const [reflectionText, setReflectionText] = useState("")
  const [moodRating, setMoodRating] = useState(5)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadJournal = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const roleResult = await checkUserRole()

        if (!roleResult.isAuthenticated) {
          setError("Please log in to access your journal.")
          return
        }

        if (roleResult.role !== "client" || !roleResult.clientRecord) {
          setError("Unable to find your client record.")
          return
        }

        const client = roleResult.clientRecord
        setClientRecord(client)

        const supabase = getClient() as any
        const { data, error: reflectionsError } = await supabase
          .from("client_reflections")
          .select("id, title, reflection_text, mood_rating, created_at")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false })
          .limit(20)

        if (reflectionsError) {
          console.error("[v0] Reflection Journal: failed to load reflections", reflectionsError)
          setError(reflectionsError.message)
          return
        }

        setReflections(data || [])
      } catch (err) {
        console.error("[v0] Reflection Journal: failed to load", err)
        setError(err instanceof Error ? err.message : "Failed to load reflection journal.")
      } finally {
        setIsLoading(false)
      }
    }

    loadJournal()
  }, [])

  const saveReflection = async () => {
    if (!clientRecord || !reflectionText.trim()) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = getClient() as any
      const { data, error: insertError } = await supabase
        .from("client_reflections")
        .insert({
          therapist_id: clientRecord.therapist_id,
          client_id: clientRecord.id,
          title: title.trim() || null,
          reflection_text: reflectionText.trim(),
          mood_rating: moodRating,
        })
        .select("id, title, reflection_text, mood_rating, created_at")
        .single()

      if (insertError) {
        console.error("[v0] Reflection Journal: failed to save reflection", insertError)
        setError(insertError.message)
        return
      }

      setReflections((current) => [data, ...current])
      setTitle("")
      setReflectionText("")
      setMoodRating(5)
      await logClientAuditEvent({
        action: "reflection.submitted",
        resourceType: "client_reflection",
        resourceId: data.id,
        details: {
          clientId: clientRecord.id,
          moodRating,
          hasTitle: !!title.trim(),
        },
      })
      setSuccess("Reflection saved.")
    } catch (err) {
      console.error("[v0] Reflection Journal: failed to save", err)
      setError(err instanceof Error ? err.message : "Failed to save reflection.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <Link href="/client-portal">
              <Button variant="ghost" className="rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Portal
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground">{clientRecord?.full_name}</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Reflection Journal</h1>
            <p className="text-muted-foreground mt-1">Write a between-session reflection for your therapist.</p>
          </motion.div>

          {error && <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
          {success && <div className="p-4 rounded-xl bg-primary/10 text-primary text-sm">{success}</div>}

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                New Reflection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title (optional)"
                className="h-11 rounded-xl"
              />
              <Textarea
                value={reflectionText}
                onChange={(event) => setReflectionText(event.target.value)}
                placeholder="Write what has been on your mind..."
                className="min-h-48 rounded-xl"
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Mood rating</p>
                  <p className="text-sm font-semibold text-primary">{moodRating}/10</p>
                </div>
                <Slider
                  value={[moodRating]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setMoodRating(value[0] || 5)}
                />
              </div>
              <Button className="w-full rounded-xl" onClick={saveReflection} disabled={isSaving || !reflectionText.trim()}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Reflection
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Previous Reflections</CardTitle>
            </CardHeader>
            <CardContent>
              {reflections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reflections yet.</p>
              ) : (
                <div className="space-y-4">
                  {reflections.map((reflection) => (
                    <div key={reflection.id} className="p-4 rounded-xl bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{reflection.title || "Untitled reflection"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(reflection.created_at)}</p>
                        </div>
                        {reflection.mood_rating && (
                          <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">
                            Mood {reflection.mood_rating}/10
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{reflection.reflection_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {success && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="w-4 h-4" />
              Saved to your journal.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
