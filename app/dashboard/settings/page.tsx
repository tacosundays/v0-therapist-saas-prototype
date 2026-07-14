"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { getClient } from "@/lib/supabase/client"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { 
  User,
  Bell,
  CalendarDays,
  Shield,
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Unplug
} from "lucide-react"

type TherapistRecord = Record<string, unknown> & {
  id: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  credentials?: string | null
  profile_photo_url?: string | null
  avatar_url?: string | null
  photo_url?: string | null
}

type CalendarConnection = {
  id: string
  provider: string
  provider_account_email: string | null
  calendar_id: string
  scopes: string[] | null
  generate_ai_prep_overnight: boolean
  connected_at: string
  updated_at: string
}

function splitFullName(fullName: string | null | undefined) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  }
}

function getPhotoUrl(therapist: TherapistRecord | null) {
  return therapist?.profile_photo_url || therapist?.avatar_url || therapist?.photo_url || ""
}

export default function SettingsPage() {
  const [therapistId, setTherapistId] = useState<string | null>(null)
  const [therapist, setTherapist] = useState<TherapistRecord | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [credentials, setCredentials] = useState("")
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null)
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)
  const [isCalendarManaging, setIsCalendarManaging] = useState(false)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadTherapist = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = getClient()
        const { therapistId: resolvedTherapistId, userEmail } = await getTherapistId()

        console.log("[v0] Settings: auth email:", userEmail)
        console.log("[v0] Settings: therapist id found:", resolvedTherapistId ?? "none")

        if (!resolvedTherapistId) {
          setError("No therapist account found for your email.")
          return
        }

        const { data, error: therapistError } = await supabase
          .from("therapists")
          .select("*")
          .eq("id", resolvedTherapistId)
          .maybeSingle()

        if (therapistError) {
          setError(therapistError.message)
          return
        }

        const record = data as TherapistRecord | null
        setTherapistId(resolvedTherapistId)
        setTherapist(record)

        const splitName = splitFullName(record?.full_name)
        setFirstName(record?.first_name || splitName.firstName)
        setLastName(record?.last_name || splitName.lastName)
        setEmail(record?.email || userEmail || "")
        setCredentials(record?.credentials || "")
        setProfilePhotoUrl(getPhotoUrl(record))
        await loadCalendarConnection()
      } catch (err) {
        console.error("[v0] Settings: failed to load therapist", err)
        setError(err instanceof Error ? err.message : "Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    loadTherapist()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const calendarStatus = params.get("calendar")
    const message = params.get("message")

    if (calendarStatus === "connected") {
      setSuccess("Google Calendar connected.")
      window.history.replaceState({}, "", "/dashboard/settings")
    } else if (calendarStatus === "error") {
      setCalendarError(message || "Google Calendar connection failed.")
      window.history.replaceState({}, "", "/dashboard/settings")
    }
  }, [])

  const getAuthHeader = async () => {
    const supabase = getClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : null
  }

  const loadCalendarConnection = async () => {
    setIsCalendarLoading(true)
    setCalendarError(null)

    try {
      const authHeader = await getAuthHeader()
      if (!authHeader) return

      const response = await fetch("/api/calendar/connection", {
        headers: authHeader,
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setCalendarError(result?.error || "Failed to load calendar connection.")
        return
      }

      setCalendarConnection(result?.connection || null)
    } catch (err) {
      setCalendarError(err instanceof Error ? err.message : "Failed to load calendar connection.")
    } finally {
      setIsCalendarLoading(false)
    }
  }

  const connectGoogleCalendar = async () => {
    setIsCalendarManaging(true)
    setCalendarError(null)
    setSuccess(null)

    try {
      const authHeader = await getAuthHeader()
      if (!authHeader) {
        setCalendarError("You must be logged in to connect Google Calendar.")
        return
      }

      const response = await fetch("/api/calendar/google/start", {
        method: "POST",
        headers: authHeader,
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.authUrl) {
        setCalendarError(result?.error || "Failed to start Google Calendar connection.")
        return
      }

      window.location.href = result.authUrl
    } catch (err) {
      setCalendarError(err instanceof Error ? err.message : "Failed to connect Google Calendar.")
    } finally {
      setIsCalendarManaging(false)
    }
  }

  const disconnectGoogleCalendar = async () => {
    setIsCalendarManaging(true)
    setCalendarError(null)
    setSuccess(null)

    try {
      const authHeader = await getAuthHeader()
      if (!authHeader) {
        setCalendarError("You must be logged in to disconnect Google Calendar.")
        return
      }

      const response = await fetch("/api/calendar/connection", {
        method: "DELETE",
        headers: authHeader,
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setCalendarError(result?.error || "Failed to disconnect Google Calendar.")
        return
      }

      setCalendarConnection(null)
      setSuccess("Google Calendar disconnected.")
    } catch (err) {
      setCalendarError(err instanceof Error ? err.message : "Failed to disconnect Google Calendar.")
    } finally {
      setIsCalendarManaging(false)
    }
  }

  const updateOvernightPrep = async (enabled: boolean) => {
    if (!calendarConnection) return

    setIsCalendarManaging(true)
    setCalendarError(null)

    try {
      const authHeader = await getAuthHeader()
      if (!authHeader) {
        setCalendarError("You must be logged in to update calendar settings.")
        return
      }

      const response = await fetch("/api/calendar/connection", {
        method: "PATCH",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ generateAiPrepOvernight: enabled }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setCalendarError(result?.error || "Failed to update calendar setting.")
        return
      }

      setCalendarConnection(result?.connection || null)
    } catch (err) {
      setCalendarError(err instanceof Error ? err.message : "Failed to update calendar setting.")
    } finally {
      setIsCalendarManaging(false)
    }
  }

  const handleSave = async () => {
    if (!therapistId || !therapist) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = getClient() as any
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const updates: Record<string, string | null> = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        full_name: fullName || null,
        email: email.trim().toLowerCase() || null,
        credentials: credentials.trim() || null,
        profile_photo_url: profilePhotoUrl.trim() || null,
      }

      const { data, error: updateError } = await supabase
        .from("therapists")
        .update(updates)
        .eq("id", therapistId)
        .select("*")
        .single()

      if (updateError) {
        setError(updateError.message)
        return
      }

      const updatedRecord = data as TherapistRecord
      setTherapist(updatedRecord)
      setSuccess("Settings saved.")
    } catch (err) {
      console.error("[v0] Settings: failed to save therapist", err)
      setError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !therapistId) return

    setIsUploadingPhoto(true)
    setError(null)
    setSuccess(null)

    try {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file.")
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Profile photo must be smaller than 5 MB.")
        return
      }

      const supabase = getClient() as any
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError("You must be logged in to upload a profile photo.")
        return
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const filePath = `${user.id}/${therapistId}-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from("therapist-avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from("therapist-avatars")
        .getPublicUrl(filePath)

      const publicUrl = publicUrlData.publicUrl
      setProfilePhotoUrl(publicUrl)

      const { data, error: updateError } = await supabase
        .from("therapists")
        .update({ profile_photo_url: publicUrl })
        .eq("id", therapistId)
        .select("*")
        .single()

      if (updateError) {
        setError(updateError.message)
        return
      }

      setTherapist(data as TherapistRecord)
      setSuccess("Profile photo uploaded.")
    } catch (err) {
      console.error("[v0] Settings: failed to upload profile photo", err)
      setError(err instanceof Error ? err.message : "Failed to upload profile photo")
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "--"

  return (
    <div className="max-w-4xl space-y-8">
      <div className="saas-page-header">
        <p className="saas-eyebrow mb-2">Workspace preferences</p>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-950"
        >
          Settings
        </motion.h1>
        <p className="mt-2 text-sm text-slate-500">Manage your account and preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 ring-1 ring-primary/15">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">{initials}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      ref={fileInputRef}
                      id="profilePhotoUpload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={isUploadingPhoto || !therapistId}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credentials">Credentials</Label>
                  <Input id="credentials" value={credentials} onChange={(event) => setCredentials(event.target.value)} className="rounded-xl" />
                </div>
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-primary/10 text-primary text-sm rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {success}
                  </div>
                )}
                <Button className="rounded-xl" onClick={handleSave} disabled={isSaving || isUploadingPhoto || !therapistId}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Email notifications</p>
                <p className="text-xs text-muted-foreground">Receive emails about client activity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Homework completions</p>
                <p className="text-xs text-muted-foreground">Get notified when clients complete assignments</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Weekly summary</p>
                <p className="text-xs text-muted-foreground">Receive a weekly digest of practice activity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">AI suggestions</p>
                <p className="text-xs text-muted-foreground">Get notified about new AI homework recommendations</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Connected Calendars
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCalendarLoading ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading calendar connection...
              </div>
            ) : calendarConnection ? (
              <>
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Google Calendar connected</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {calendarConnection.provider_account_email || "Google account"} · read-only upcoming events
                      </p>
                    </div>
                    <Button variant="outline" className="rounded-xl" asChild>
                      <Link href="/dashboard/calendar">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Calendar
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Generate AI Prep Overnight</p>
                    <p className="text-xs text-muted-foreground">
                      Queue prep generation for matched upcoming sessions. Automation wiring can run from this saved preference.
                    </p>
                  </div>
                  <Switch
                    checked={calendarConnection.generate_ai_prep_overnight}
                    onCheckedChange={updateOvernightPrep}
                    disabled={isCalendarManaging}
                  />
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="rounded-xl text-destructive hover:text-destructive"
                  onClick={disconnectGoogleCalendar}
                  disabled={isCalendarManaging}
                >
                  {isCalendarManaging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
                  Disconnect Google Calendar
                </Button>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
                <p className="text-sm font-semibold text-foreground">No calendar connected</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Connect Google Calendar to show today&apos;s sessions, tomorrow&apos;s sessions, and the upcoming week inside ShrinkAid.
                </p>
                <Button className="mt-4 rounded-xl" onClick={connectGoogleCalendar} disabled={isCalendarManaging}>
                  {isCalendarManaging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
                  Connect Google Calendar
                </Button>
              </div>
            )}

            {calendarError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {calendarError}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Account Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Security</p>
                <p className="text-xs text-muted-foreground">Manage MFA, recovery codes, session status, and audit activity.</p>
              </div>
              <Button variant="outline" className="rounded-xl" asChild>
                <Link href="/dashboard/security">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Security
                </Link>
              </Button>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Billing</p>
                <p className="text-xs text-muted-foreground">Manage plan and billing details from the dedicated billing page.</p>
              </div>
              <Button variant="outline" className="rounded-xl" asChild>
                <Link href="/dashboard/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Billing
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
