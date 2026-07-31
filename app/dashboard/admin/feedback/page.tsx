"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, MessageSquare, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getClient } from "@/lib/supabase/client"
import { EmptyState, ErrorState } from "@/components/dashboard/page-state"

type Feedback = {
  id: string; category: string; message: string; page_path: string; status: string
  created_at: string; therapist_id: string
  screenshot_url?: string | null
  browser_metadata: { viewport?: string; platform?: string } | null
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await getClient().auth.getSession()
    if (!session) throw new Error("Sign in with an authorized admin account.")
    return fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${session.access_token}` } })
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const response = await authFetch("/api/admin/feedback")
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Feedback could not be loaded.")
      setItems(result.feedback)
    } catch (err) { setError(err instanceof Error ? err.message : "Feedback could not be loaded.") }
    finally { setLoading(false) }
  }, [authFetch])

  useEffect(() => { void load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item))
    const response = await authFetch("/api/admin/feedback", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }),
    })
    if (!response.ok) void load()
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
  if (error) return <ErrorState title="Feedback couldn’t load" description={error} retry={load} />

  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Internal · Beta</p><h1 className="mt-2 text-3xl font-bold">Submitted feedback</h1><p className="mt-2 text-sm text-muted-foreground">{items.length} submissions, newest first.</p></div>
        <Button variant="outline" className="rounded-xl" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>
      {items.length === 0 ? <EmptyState title="No feedback yet" description="New beta submissions will appear here." /> : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="rounded-2xl"><CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{item.category}</Badge><span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span></div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                  <p className="mt-3 truncate text-xs text-muted-foreground">{item.page_path} · {item.browser_metadata?.viewport || "unknown viewport"} · {item.browser_metadata?.platform || "unknown device"}</p>
                  {item.screenshot_url && <a href={item.screenshot_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">View private screenshot</a>}
                </div>
                <Select value={item.status} onValueChange={(value) => updateStatus(item.id, value)}>
                  <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="reviewing">Reviewing</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
                </Select>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><MessageSquare className="h-4 w-4" /> Screenshot links are private and expire after five minutes.</p>
    </div>
  )
}
