"use client"

import { useRef, useState } from "react"
import { MessageSquarePlus, Paperclip, Loader2, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getClient } from "@/lib/supabase/client"

export function FeedbackDialog() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState("bug")
  const [message, setMessage] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setMessage("")
    setFile(null)
    setError(null)
    setSent(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  const submit = async () => {
    if (message.trim().length < 3) {
      setError("Please add a little more detail.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const supabase = getClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Please sign in again.")
      let screenshotPath: string | null = null
      if (file) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "png"
        screenshotPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from("feedback-screenshots").upload(screenshotPath, file)
        if (uploadError) throw new Error("The screenshot could not be attached. You can remove it and submit the message.")
      }
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          category,
          message,
          screenshotPath,
          pagePath: `${window.location.pathname}${window.location.search}`,
          metadata: {
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
          },
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Feedback could not be submitted.")
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback could not be submitted.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-5 left-5 z-50 rounded-full shadow-lg sm:left-auto sm:right-24" variant="secondary">
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Send Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl">
        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <DialogTitle className="mt-4">Thank you</DialogTitle>
            <DialogDescription className="mt-2">Your feedback was sent to the beta team.</DialogDescription>
            <Button className="mt-6 rounded-xl" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send feedback</DialogTitle>
              <DialogDescription>Report a problem, share an idea, or tell us what felt confusing. Please don&apos;t include client names or clinical information.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Report a bug</SelectItem>
                    <SelectItem value="idea">Suggest an idea</SelectItem>
                    <SelectItem value="confusing">Something was confusing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-message">What happened?</Label>
                <Textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={6} className="rounded-xl" placeholder="Tell us what you expected and what happened…" />
                <p className="text-right text-xs text-muted-foreground">{message.length}/4,000</p>
              </div>
              <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              {file ? (
                <div className="flex items-center justify-between rounded-xl bg-muted p-3 text-sm">
                  <span className="truncate">{file.name}</span>
                  <Button size="icon" variant="ghost" aria-label="Remove screenshot" onClick={() => setFile(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <Button variant="outline" className="rounded-xl" onClick={() => inputRef.current?.click()}><Paperclip className="mr-2 h-4 w-4" /> Attach screenshot (optional)</Button>
              )}
              {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <Button className="w-full rounded-xl" disabled={submitting} onClick={submit}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Feedback
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
