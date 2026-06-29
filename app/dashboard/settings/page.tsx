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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  AlertCircle,
  Upload,
  Copy
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

type MfaFactor = {
  id: string
  factor_type: string
  status: string
  friendly_name?: string | null
}

type MfaEnrollment = {
  id: string
  totp: {
    qr_code: string
    secret: string
    uri: string
  }
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
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([])
  const [mfaRecoveryCount, setMfaRecoveryCount] = useState(0)
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaDisableCode, setMfaDisableCode] = useState("")
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([])
  const [isMfaDialogOpen, setIsMfaDialogOpen] = useState(false)
  const [isManagingMfa, setIsManagingMfa] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null)
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
        await loadMfaStatus()
      } catch (err) {
        console.error("[v0] Settings: failed to load therapist", err)
        setError(err instanceof Error ? err.message : "Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    loadTherapist()
  }, [])

  const getAuthHeader = async () => {
    const supabase = getClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : null
  }

  const loadMfaStatus = async () => {
    try {
      const supabase = getClient() as any
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors()

      if (factorsError) {
        console.error("[v0] Settings: failed to load MFA factors", factorsError)
        return
      }

      const factors = [
        ...(data?.totp || []),
        ...(data?.phone || []),
        ...(data?.webauthn || []),
      ] as MfaFactor[]
      setMfaFactors(factors)

      const authHeader = await getAuthHeader()
      if (!authHeader) return

      const response = await fetch("/api/mfa/recovery-codes", {
        headers: authHeader,
      })
      const result = await response.json().catch(() => null)

      if (response.ok) {
        setMfaRecoveryCount(result?.unusedCount || 0)
      }
    } catch (err) {
      console.error("[v0] Settings: failed to load MFA status", err)
    }
  }

  const generateRecoveryCodes = async () => {
    const authHeader = await getAuthHeader()
    if (!authHeader) throw new Error("You must be logged in to generate recovery codes.")

    const response = await fetch("/api/mfa/recovery-codes", {
      method: "POST",
      headers: authHeader,
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(result?.error || "Failed to generate recovery codes.")
    }

    setMfaRecoveryCodes(result.codes || [])
    setMfaRecoveryCount(result.codes?.length || 0)
  }

  const beginMfaEnrollment = async () => {
    setIsManagingMfa(true)
    setMfaError(null)
    setMfaSuccess(null)
    setMfaRecoveryCodes([])
    setMfaCode("")

    try {
      const supabase = getClient() as any
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "ShrinkAid",
        issuer: "ShrinkAid Homework",
      })

      if (enrollError) {
        setMfaError(enrollError.message)
        return
      }

      setMfaEnrollment(data as MfaEnrollment)
      setIsMfaDialogOpen(true)
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to start MFA setup.")
    } finally {
      setIsManagingMfa(false)
    }
  }

  const verifyMfaEnrollment = async () => {
    if (!mfaEnrollment || !mfaCode.trim()) return

    setIsManagingMfa(true)
    setMfaError(null)
    setMfaSuccess(null)

    try {
      const supabase = getClient() as any
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaEnrollment.id,
      })

      if (challengeError) {
        setMfaError(challengeError.message)
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaEnrollment.id,
        challengeId: challenge.id,
        code: mfaCode.trim(),
      })

      if (verifyError) {
        setMfaError(verifyError.message)
        return
      }

      await generateRecoveryCodes()
      await loadMfaStatus()
      setMfaEnrollment(null)
      setMfaCode("")
      setMfaSuccess("Two-factor authentication is enabled. Save these recovery codes now; they will not be shown again.")
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to verify MFA code.")
    } finally {
      setIsManagingMfa(false)
    }
  }

  const regenerateRecoveryCodes = async () => {
    setIsManagingMfa(true)
    setMfaError(null)
    setMfaSuccess(null)

    try {
      await generateRecoveryCodes()
      setMfaSuccess("New recovery codes generated. Save them now; old recovery codes no longer work.")
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to regenerate recovery codes.")
    } finally {
      setIsManagingMfa(false)
    }
  }

  const disableMfa = async () => {
    const verifiedTotp = mfaFactors.find((factor) => factor.factor_type === "totp" && factor.status === "verified")
    if (!verifiedTotp || !mfaDisableCode.trim()) return

    setIsManagingMfa(true)
    setMfaError(null)
    setMfaSuccess(null)

    try {
      const supabase = getClient() as any
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: verifiedTotp.id,
        code: mfaDisableCode.trim(),
      })

      if (verifyError) {
        setMfaError(verifyError.message)
        return
      }

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: verifiedTotp.id,
      })

      if (unenrollError) {
        setMfaError(unenrollError.message)
        return
      }

      const authHeader = await getAuthHeader()
      if (authHeader) {
        await fetch("/api/mfa/recovery-codes", {
          method: "DELETE",
          headers: authHeader,
        })
      }

      setMfaDisableCode("")
      setMfaRecoveryCodes([])
      setMfaRecoveryCount(0)
      await loadMfaStatus()
      setMfaSuccess("Two-factor authentication is disabled.")
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to disable MFA.")
    } finally {
      setIsManagingMfa(false)
    }
  }

  const copyRecoveryCodes = async () => {
    if (mfaRecoveryCodes.length === 0) return
    await navigator.clipboard.writeText(mfaRecoveryCodes.join("\n"))
    setMfaSuccess("Recovery codes copied.")
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
  const verifiedTotpFactor = mfaFactors.find((factor) => factor.factor_type === "totp" && factor.status === "verified")
  const isMfaEnabled = !!verifiedTotpFactor
  const qrCodeSrc = mfaEnrollment?.totp.qr_code?.startsWith("data:")
    ? mfaEnrollment.totp.qr_code
    : `data:image/svg+xml;utf-8,${encodeURIComponent(mfaEnrollment?.totp.qr_code || "")}`

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
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Use Google Authenticator, Authy, or another TOTP app after password login.
                  </p>
                </div>
                {isMfaEnabled ? (
                  <div className="text-sm font-medium text-primary">Enabled</div>
                ) : (
                  <Button variant="outline" className="rounded-xl" onClick={beginMfaEnrollment} disabled={isManagingMfa}>
                    {isManagingMfa ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Enable
                  </Button>
                )}
              </div>

              {mfaError && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {mfaError}
                </div>
              )}
              {mfaSuccess && (
                <div className="p-3 bg-primary/10 text-primary text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {mfaSuccess}
                </div>
              )}

              {isMfaEnabled && (
                <div className="space-y-4 rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Recovery codes</p>
                      <p className="text-xs text-muted-foreground">{mfaRecoveryCount} unused recovery codes available.</p>
                    </div>
                    <Button variant="outline" className="rounded-xl" onClick={regenerateRecoveryCodes} disabled={isManagingMfa}>
                      Regenerate Codes
                    </Button>
                  </div>

                  {mfaRecoveryCodes.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
                        {mfaRecoveryCodes.map((code) => (
                          <code key={code} className="rounded-lg bg-background px-3 py-2 text-sm">
                            {code}
                          </code>
                        ))}
                      </div>
                      <Button variant="outline" className="rounded-xl" onClick={copyRecoveryCodes}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Recovery Codes
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Disable two-factor authentication</p>
                      <p className="text-xs text-muted-foreground">Enter a current authenticator code to remove MFA from this account.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={mfaDisableCode}
                        onChange={(event) => setMfaDisableCode(event.target.value)}
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="123456"
                        className="rounded-xl"
                      />
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={disableMfa}
                        disabled={isManagingMfa || !mfaDisableCode.trim()}
                      >
                        Disable
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                Group Practice owners will be able to enforce MFA for team members from team policy controls in a later release.
              </div>
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

      <Dialog open={isMfaDialogOpen} onOpenChange={setIsMfaDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with Google Authenticator, Authy, or another TOTP app, then enter the 6-digit code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {mfaEnrollment && (
              <>
                <div className="flex justify-center rounded-xl border border-border bg-white p-4">
                  <img src={qrCodeSrc} alt="Authenticator QR code" className="h-48 w-48" />
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Manual setup key</p>
                  <code className="break-all text-sm text-foreground">{mfaEnrollment.totp.secret}</code>
                </div>
              </>
            )}

            {mfaError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {mfaError}
              </div>
            )}
            {mfaSuccess && (
              <div className="p-3 bg-primary/10 text-primary text-sm rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {mfaSuccess}
              </div>
            )}

            {mfaRecoveryCodes.length > 0 ? (
              <div className="space-y-3">
                <div className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
                  {mfaRecoveryCodes.map((code) => (
                    <code key={code} className="rounded-lg bg-background px-3 py-2 text-sm">
                      {code}
                    </code>
                  ))}
                </div>
                <Button variant="outline" className="w-full rounded-xl" onClick={copyRecoveryCodes}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Recovery Codes
                </Button>
                <Button className="w-full rounded-xl" onClick={() => setIsMfaDialogOpen(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Label htmlFor="mfaCode">Authenticator code</Label>
                <Input
                  id="mfaCode"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="123456"
                  className="h-11 rounded-xl"
                  disabled={isManagingMfa}
                />
                <Button className="w-full rounded-xl" onClick={verifyMfaEnrollment} disabled={isManagingMfa || !mfaCode.trim()}>
                  {isManagingMfa ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Verify and Enable
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
