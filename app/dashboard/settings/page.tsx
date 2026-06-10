"use client"

import { useEffect, useState } from "react"
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
  Shield,
  CreditCard,
  HelpCircle,
  Loader2,
  CheckCircle2,
  AlertCircle
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      } catch (err) {
        console.error("[v0] Settings: failed to load therapist", err)
        setError(err instanceof Error ? err.message : "Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    loadTherapist()
  }, [])

  const handleSave = async () => {
    if (!therapistId || !therapist) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = getClient()
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const updates: Record<string, string | null> = {
        full_name: fullName || null,
        email: email.trim().toLowerCase() || null,
      }

      if (Object.prototype.hasOwnProperty.call(therapist, "first_name")) {
        updates.first_name = firstName.trim() || null
      }

      if (Object.prototype.hasOwnProperty.call(therapist, "last_name")) {
        updates.last_name = lastName.trim() || null
      }

      if (Object.prototype.hasOwnProperty.call(therapist, "credentials")) {
        updates.credentials = credentials.trim() || null
      }

      if (Object.prototype.hasOwnProperty.call(therapist, "profile_photo_url")) {
        updates.profile_photo_url = profilePhotoUrl.trim() || null
      } else if (Object.prototype.hasOwnProperty.call(therapist, "avatar_url")) {
        updates.avatar_url = profilePhotoUrl.trim() || null
      } else if (Object.prototype.hasOwnProperty.call(therapist, "photo_url")) {
        updates.photo_url = profilePhotoUrl.trim() || null
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

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "--"

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          Settings
        </motion.h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="rounded-2xl">
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
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-medium text-primary">{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="profilePhotoUrl">Profile photo URL</Label>
                    <Input
                      id="profilePhotoUrl"
                      value={profilePhotoUrl}
                      onChange={(event) => setProfilePhotoUrl(event.target.value)}
                      className="rounded-xl"
                      placeholder=""
                    />
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
                <Button className="rounded-xl" onClick={handleSave} disabled={isSaving || !therapistId}>
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
        <Card className="rounded-2xl">
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
        transition={{ delay: 0.3 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline" className="rounded-xl">Enable</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Session timeout</p>
                <p className="text-xs text-muted-foreground">Automatically log out after inactivity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div>
              <Button variant="outline" className="rounded-xl">Change Password</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Manage your plan and billing details from the billing page.</p>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/dashboard/billing">Manage Billing</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Documentation
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Contact Support
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Request a Feature
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
