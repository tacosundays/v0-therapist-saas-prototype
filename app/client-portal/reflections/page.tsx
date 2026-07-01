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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#6D5EF5]/10 text-[#6D5EF5] shadow-[0_18px_44px_rgba(109,94,245,0.16)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <main>
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[32px] border border-slate-200/75 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.07)]">
            <div className="relative p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_18%_0%,rgba(109,94,245,0.18),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(24,183,160,0.15),transparent_32%)]" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Link href="/client-portal">
                    <Button variant="ghost" className="mb-5 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-950">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Portal
                    </Button>
                  </Link>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Reflection Journal</h1>
                  <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">Write down what has been on your mind between sessions.</p>
                </div>
                <div className="rounded-3xl border border-slate-200/75 bg-white/85 px-4 py-3 text-sm font-medium text-slate-500 shadow-sm">
                  {clientRecord?.full_name}
                </div>
              </div>
            </div>
          </motion.div>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>}
          {success && <div className="rounded-2xl border border-[#18B7A0]/20 bg-[#18B7A0]/10 p-4 text-sm font-medium text-[#109986]">{success}</div>}

          <Card className="rounded-[28px] border-slate-200/75 bg-white shadow-[0_18px_56px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg text-slate-950">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6D5EF5]/10 text-[#6D5EF5]">
                  <Heart className="h-5 w-5" />
                </span>
                New Reflection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title (optional)"
                className="h-12 rounded-2xl border-slate-200"
              />
              <Textarea
                value={reflectionText}
                onChange={(event) => setReflectionText(event.target.value)}
                placeholder="Write what has been on your mind..."
                className="min-h-56 rounded-2xl border-slate-200 text-base leading-7"
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Mood rating</p>
                  <p className="rounded-full bg-[#6D5EF5]/10 px-2.5 py-1 text-sm font-bold text-[#6D5EF5]">{moodRating}/10</p>
                </div>
                <Slider
                  value={[moodRating]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setMoodRating(value[0] || 5)}
                />
              </div>
              <Button className="h-12 w-full rounded-2xl bg-[#6D5EF5] text-white shadow-[0_14px_30px_rgba(109,94,245,0.22)] hover:bg-[#5B4DEA]" onClick={saveReflection} disabled={isSaving || !reflectionText.trim()}>
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

          <Card className="rounded-[28px] border-slate-200/75 bg-white shadow-[0_18px_56px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle className="text-lg text-slate-950">Previous Reflections</CardTitle>
            </CardHeader>
            <CardContent>
              {reflections.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/75 p-8 text-center">
                  <Heart className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="font-semibold text-slate-950">No reflections yet</p>
                  <p className="mt-1 text-sm text-slate-500">When you save one, it will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reflections.map((reflection) => (
                    <div key={reflection.id} className="rounded-3xl border border-slate-200/70 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{reflection.title || "Untitled reflection"}</p>
                          <p className="text-xs font-medium text-slate-400">{formatDate(reflection.created_at)}</p>
                        </div>
                        {reflection.mood_rating && (
                          <span className="rounded-full bg-[#6D5EF5]/10 px-2.5 py-1 text-xs font-bold text-[#6D5EF5]">
                            Mood {reflection.mood_rating}/10
                          </span>
                        )}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reflection.reflection_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {success && (
            <div className="flex items-center gap-2 rounded-2xl bg-[#18B7A0]/10 p-4 text-sm font-medium text-[#109986]">
              <CheckCircle2 className="w-4 h-4" />
              Saved to your journal.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
