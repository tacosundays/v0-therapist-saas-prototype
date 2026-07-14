"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"

interface AuditLog {
  id: string
  created_at: string
  user_email: string | null
  actor_role: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown> | null
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

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatAction(action: string) {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDetails(details: Record<string, unknown> | null) {
  if (!details || Object.keys(details).length === 0) return "No details"

  return Object.entries(details)
    .map(([key, value]) => {
      const displayValue = Array.isArray(value)
        ? value.join(", ")
        : value === null || value === undefined
          ? "None"
          : String(value)
      return `${key}: ${displayValue}`
    })
    .join(" | ")
}

export default function SecurityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null)
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
        console.error("[v0] Security: failed to load MFA factors", factorsError)
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
      console.error("[v0] Security: failed to load MFA status", err)
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

  useEffect(() => {
    const loadAuditLogs = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] Security: auth email:", userEmail)
        console.log("[v0] Security: therapist id found:", therapistId ?? "none")
        setUserEmail(userEmail || null)

        if (!therapistId) {
          setError("No therapist account found for your email.")
          return
        }

        const supabase = getClient() as any
        const { data: { user } } = await supabase.auth.getUser()
        setLastSignInAt(user?.last_sign_in_at || null)
        await loadMfaStatus()

        const { data, error: logsError } = await supabase
          .from("audit_logs")
          .select("id, created_at, user_email, actor_role, action, resource_type, resource_id, details")
          .eq("therapist_id", therapistId)
          .order("created_at", { ascending: false })
          .limit(200)

        if (logsError) {
          console.error("[v0] Security: failed to load audit logs", logsError)
          setError(logsError.message)
          return
        }

        setLogs(data || [])
      } catch (err) {
        console.error("[v0] Security: failed to load", err)
        setError(err instanceof Error ? err.message : "Failed to load audit logs.")
      } finally {
        setIsLoading(false)
      }
    }

    loadAuditLogs()
  }, [])

  const verifiedTotpFactor = mfaFactors.find((factor) => factor.factor_type === "totp" && factor.status === "verified")
  const isMfaEnabled = !!verifiedTotpFactor
  const qrCodeSrc = mfaEnrollment?.totp.qr_code?.startsWith("data:")
    ? mfaEnrollment.totp.qr_code
    : `data:image/svg+xml;utf-8,${encodeURIComponent(mfaEnrollment?.totp.qr_code || "")}`
  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    return [
      log.user_email,
      log.actor_role,
      log.action,
      log.resource_type,
      log.resource_id,
      formatDetails(log.details),
    ].filter(Boolean).join(" ").toLowerCase().includes(query)
  })

  return (
    <div className="space-y-6">
      <div className="saas-page-header">
        <p className="saas-eyebrow mb-2">Workspace security</p>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-slate-950 flex items-center gap-2"
        >
          <ShieldCheck className="w-6 h-6 text-primary" />
          Security
        </motion.h1>
        <p className="mt-2 text-sm text-slate-500">Manage account security and review security activity.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950">Security Overview</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-slate-200/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">MFA status</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{isMfaEnabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isMfaEnabled ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Session timeout</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">Active</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">Automatic inactivity timeout is handled by the dashboard session guard.</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/80">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-slate-500">Last sign-in</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{lastSignInAt ? formatDate(lastSignInAt) : "Not available"}</p>
              <p className="mt-2 truncate text-xs text-slate-500">{userEmail || "Current account"}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="rounded-2xl border-slate-200/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-primary" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Multi-factor authentication</p>
              <p className="mt-1 text-xs text-slate-500">Use Google Authenticator, Authy, or another TOTP app after password login.</p>
            </div>
            {isMfaEnabled ? (
              <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary">Enabled</Badge>
            ) : (
              <Button className="rounded-xl" onClick={beginMfaEnrollment} disabled={isManagingMfa}>
                {isManagingMfa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enable MFA
              </Button>
            )}
          </div>

          {mfaError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{mfaError}</span>
            </div>
          )}
          {mfaSuccess && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{mfaSuccess}</span>
            </div>
          )}

          {isMfaEnabled ? (
            <div className="space-y-4 rounded-xl border border-slate-200/80 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Recovery codes</p>
                  <p className="mt-1 text-xs text-slate-500">{mfaRecoveryCount} unused recovery codes available.</p>
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
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Recovery Codes
                  </Button>
                </div>
              )}

              <Separator />

              <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <div>
                  <p className="text-sm font-semibold text-destructive">Disable multi-factor authentication</p>
                  <p className="mt-1 text-xs text-destructive/75">Enter a current authenticator code to remove MFA from this account.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={mfaDisableCode}
                    onChange={(event) => setMfaDisableCode(event.target.value)}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="123456"
                    className="rounded-xl bg-white"
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl border-destructive/30 text-destructive hover:text-destructive"
                    onClick={disableMfa}
                    disabled={isManagingMfa || !mfaDisableCode.trim()}
                  >
                    Disable MFA
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              Enable MFA to unlock recovery-code management.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Audit Activity</CardTitle>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search activity"
                className="h-10 rounded-xl pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-200/70 p-4">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <p className="font-semibold text-slate-950">No audit events yet</p>
              <p className="mt-1 text-sm text-slate-500">Security activity will appear here after actions are recorded.</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <p className="font-semibold text-slate-950">No matching events</p>
              <p className="mt-1 text-sm text-slate-500">Try a different search term.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-3 pr-4 font-medium">Date</th>
                      <th className="py-3 pr-4 font-medium">User</th>
                      <th className="py-3 pr-4 font-medium">Action</th>
                      <th className="py-3 pr-4 font-medium">Resource</th>
                      <th className="py-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-200/70 align-top transition-colors hover:bg-slate-50/70">
                        <td className="whitespace-nowrap py-4 pr-4 text-muted-foreground">{formatDate(log.created_at)}</td>
                        <td className="py-4 pr-4">
                          <div className="font-medium text-foreground">{log.user_email || "System"}</div>
                          {log.actor_role && (
                            <div className="text-xs capitalize text-muted-foreground">{log.actor_role}</div>
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          <Badge variant="secondary" className="rounded-lg">
                            {formatAction(log.action)}
                          </Badge>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="font-medium text-foreground">{log.resource_type}</div>
                          {log.resource_id && (
                            <div className="max-w-44 truncate text-xs text-muted-foreground">{log.resource_id}</div>
                          )}
                        </td>
                        <td className="py-4 text-muted-foreground">
                          <div className="max-w-xl break-words">{formatDetails(log.details)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 lg:hidden">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-200/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{formatAction(log.action)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(log.created_at)}</p>
                      </div>
                      <Badge variant="secondary" className="rounded-lg">{log.actor_role || "system"}</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p>{log.user_email || "System"}</p>
                      <p>{log.resource_type}{log.resource_id ? ` · ${log.resource_id}` : ""}</p>
                      <p className="break-words text-xs text-slate-500">{formatDetails(log.details)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isMfaDialogOpen} onOpenChange={setIsMfaDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
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
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Manual setup key</p>
                  <code className="break-all text-sm text-foreground">{mfaEnrollment.totp.secret}</code>
                </div>
              </>
            )}

            {mfaError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}
            {mfaSuccess && (
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{mfaSuccess}</span>
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
                  <Copy className="mr-2 h-4 w-4" />
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
                  {isManagingMfa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
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
