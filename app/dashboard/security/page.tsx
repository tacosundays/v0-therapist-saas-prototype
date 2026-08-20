"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Globe2,
  KeyRound,
  Loader2,
  MonitorSmartphone,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

type TeamMember = {
  id: string
  therapist_id: string
  role: "owner" | "therapist"
  status: "active" | "removed"
  joined_at: string
  therapists?: {
    full_name?: string | null
    email?: string | null
    credentials?: string | null
  } | null
}

type TeamData = {
  members: TeamMember[]
  seatsUsed: number
}

type ActiveSessionRow = {
  id: string
  browser: string
  os: string
  device: string
  location: string
  lastActivity: string | null
  current: boolean
}

type LoginHistoryRow = {
  id: string
  timestamp: string
  browser: string
  os: string
  location: string
  ip: string
  status: "Success" | "Failed"
  unusual: boolean
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

function maskIp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Not available"
  if (value.includes(":")) return `${value.slice(0, 4)}:****`
  const parts = value.split(".")
  if (parts.length !== 4) return "Masked"
  return `${parts[0]}.${parts[1]}.***.***`
}

function browserFromUserAgent(userAgent: string | null | undefined) {
  const value = userAgent || ""
  if (value.includes("Edg/")) return "Edge"
  if (value.includes("Chrome/")) return "Chrome"
  if (value.includes("Safari/") && !value.includes("Chrome/")) return "Safari"
  if (value.includes("Firefox/")) return "Firefox"
  return "Unknown browser"
}

function osFromUserAgent(userAgent: string | null | undefined) {
  const value = userAgent || ""
  if (value.includes("Mac OS X")) return "macOS"
  if (value.includes("Windows")) return "Windows"
  if (value.includes("iPhone") || value.includes("iPad")) return "iOS"
  if (value.includes("Android")) return "Android"
  if (value.includes("Linux")) return "Linux"
  return "Unknown OS"
}

function deviceFromUserAgent(userAgent: string | null | undefined) {
  const value = userAgent || ""
  if (value.includes("Mobile") || value.includes("iPhone") || value.includes("Android")) return "Mobile"
  if (value.includes("iPad") || value.includes("Tablet")) return "Tablet"
  return "Desktop"
}

function locationFromDetails(details: Record<string, unknown> | null) {
  const city = details?.city || details?.location || details?.approximateLocation
  const region = details?.region || details?.country
  return [city, region].filter(Boolean).join(", ") || "Approximate location unavailable"
}

function daysSince(value: string | null | undefined) {
  if (!value) return null
  return Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24))
}

function categoryForAction(action: string) {
  if (action.startsWith("auth") || action.includes("login") || action.includes("logout") || action.includes("mfa")) return "Authentication"
  if (action.startsWith("team")) return "Team"
  if (action.includes("billing") || action.includes("subscription")) return "Billing"
  if (action.includes("client") || action.includes("assignment") || action.includes("note")) return "Clinical Workspace"
  return "System"
}

function calculateSecurityScore({
  isMfaEnabled,
  recoveryCount,
  auditEvents24h,
  teamMembers,
  inactiveTeamMembers,
  failedLogins,
}: {
  isMfaEnabled: boolean
  recoveryCount: number
  auditEvents24h: number
  teamMembers: number
  inactiveTeamMembers: number
  failedLogins: number
}) {
  let score = 55
  if (isMfaEnabled) score += 20
  if (recoveryCount >= 4) score += 8
  if (auditEvents24h > 0) score += 7
  if (teamMembers > 0) score += 5
  if (inactiveTeamMembers === 0) score += 5
  score -= Math.min(15, failedLogins * 5)
  score -= Math.min(10, inactiveTeamMembers * 5)
  return Math.max(0, Math.min(100, score))
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
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [activeSessions, setActiveSessions] = useState<ActiveSessionRow[]>([])
  const [dateFilter, setDateFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [completedRecommendations, setCompletedRecommendations] = useState<string[]>([])

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
        friendlyName: "SessionSteps",
        issuer: "SessionSteps",
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

  const signOutAllOtherSessions = async () => {
    setMfaError(null)
    setMfaSuccess(null)

    try {
      const supabase = getClient() as any
      const { error: signOutError } = await supabase.auth.signOut({ scope: "others" })

      if (signOutError) {
        setMfaError(signOutError.message)
        return
      }

      setMfaSuccess("All other sessions were signed out where supported by the auth provider.")
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Failed to sign out other sessions.")
    }
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
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        setLastSignInAt(user?.last_sign_in_at || null)
        setActiveSessions([{
          id: session?.access_token?.slice(-12) || "current-session",
          browser: browserFromUserAgent(window.navigator.userAgent),
          os: osFromUserAgent(window.navigator.userAgent),
          device: deviceFromUserAgent(window.navigator.userAgent),
          location: "Current browser",
          lastActivity: user?.last_sign_in_at || new Date().toISOString(),
          current: true,
        }])
        await loadMfaStatus()

        if (session?.access_token) {
          const teamResponse = await fetch("/api/team", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          const teamResult = await teamResponse.json().catch(() => null)
          if (teamResponse.ok && teamResult?.members) {
            setTeamData({ members: teamResult.members || [], seatsUsed: teamResult.seatsUsed || 0 })
          }
        }

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
  const userOptions = Array.from(new Set(logs.map((log) => log.user_email).filter(Boolean))) as string[]
  const actionOptions = Array.from(new Set(logs.map((log) => log.action))).sort()
  const categoryOptions = Array.from(new Set(logs.map((log) => categoryForAction(log.action)))).sort()
  const logs24h = logs.filter((log) => Date.now() - new Date(log.created_at).getTime() <= 24 * 60 * 60 * 1000)
  const loginRows: LoginHistoryRow[] = logs
    .filter((log) => {
      const action = log.action.toLowerCase()
      return action.includes("login") || action.includes("sign_in") || action.includes("auth")
    })
    .map((log) => {
      const details = log.details || {}
      const userAgent = String(details.userAgent || details.user_agent || "")
      const status = log.action.toLowerCase().includes("fail") || details.success === false ? "Failed" : "Success"
      return {
        id: log.id,
        timestamp: log.created_at,
        browser: browserFromUserAgent(userAgent),
        os: osFromUserAgent(userAgent),
        location: locationFromDetails(details),
        ip: maskIp(details.ip || details.ip_address),
        status,
        unusual: status === "Failed" || Boolean(details.unusual),
      }
    })

  const loginHistoryRows = loginRows.length > 0
    ? loginRows
    : lastSignInAt
      ? [{
          id: "current-last-sign-in",
          timestamp: lastSignInAt,
          browser: browserFromUserAgent(typeof window !== "undefined" ? window.navigator.userAgent : ""),
          os: osFromUserAgent(typeof window !== "undefined" ? window.navigator.userAgent : ""),
          location: "Current browser",
          ip: "Not available",
          status: "Success" as const,
          unusual: false,
        }]
      : []

  const teamMembers = teamData?.members || []
  const inactiveTeamMembers = teamMembers.filter((member) => {
    const lastLogin = logs.find((log) => log.user_email === member.therapists?.email && categoryForAction(log.action) === "Authentication")?.created_at
    const inactiveDays = daysSince(lastLogin || member.joined_at)
    return inactiveDays !== null && inactiveDays > 30
  })
  const failedLogins = loginHistoryRows.filter((row) => row.status === "Failed").length
  const securityScore = calculateSecurityScore({
    isMfaEnabled,
    recoveryCount: mfaRecoveryCount,
    auditEvents24h: logs24h.length,
    teamMembers: teamMembers.length,
    inactiveTeamMembers: inactiveTeamMembers.length,
    failedLogins,
  })
  const passwordLastChanged = logs.find((log) => log.action.toLowerCase().includes("password"))?.created_at || null
  const recommendations = [
    { id: "enable-mfa", title: "Enable MFA for all users", complete: isMfaEnabled && teamMembers.length > 0 },
    { id: "inactive-staff", title: "Review inactive staff", complete: inactiveTeamMembers.length === 0 },
    { id: "audit-logs", title: "Review audit logs", complete: logs24h.length > 0 },
    { id: "rotate-passwords", title: "Rotate passwords", complete: Boolean(passwordLastChanged) },
    { id: "active-sessions", title: "Review active sessions", complete: activeSessions.length > 0 },
  ]

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.trim().toLowerCase()
    const createdAt = new Date(log.created_at).getTime()
    const now = Date.now()
    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "24h" && now - createdAt <= 24 * 60 * 60 * 1000) ||
      (dateFilter === "7d" && now - createdAt <= 7 * 24 * 60 * 60 * 1000) ||
      (dateFilter === "30d" && now - createdAt <= 30 * 24 * 60 * 60 * 1000)
    const matchesUser = userFilter === "all" || log.user_email === userFilter
    const matchesAction = actionFilter === "all" || log.action === actionFilter
    const matchesCategory = categoryFilter === "all" || categoryForAction(log.action) === categoryFilter
    const matchesSearch = !query || [
      categoryForAction(log.action),
      log.user_email,
      log.actor_role,
      log.action,
      log.resource_type,
      log.resource_id,
      formatDetails(log.details),
    ].filter(Boolean).join(" ").toLowerCase().includes(query)

    return matchesDate && matchesUser && matchesAction && matchesCategory && matchesSearch
  })

  const exportAuditCsv = () => {
    const rows = [
      ["Timestamp", "User", "Role", "Action", "Category", "Resource", "Resource ID", "Details"],
      ...filteredLogs.map((log) => [
        log.created_at,
        log.user_email || "System",
        log.actor_role || "",
        log.action,
        categoryForAction(log.action),
        log.resource_type,
        log.resource_id || "",
        formatDetails(log.details),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `security-audit-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

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

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-950">Security Overview</h2>
          <Badge variant="outline" className="rounded-full px-3 py-1">Informational score</Badge>
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="overflow-hidden rounded-2xl border-slate-200/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Security Score</p>
                  <p className="mt-2 text-5xl font-bold tracking-tight text-slate-950">{securityScore}</p>
                  <p className="mt-2 text-sm text-slate-500">Calculated from current account and audit signals. This is not a compliance certification.</p>
                </div>
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <OverviewTile label="MFA Status" value={isMfaEnabled ? "Enabled" : "Disabled"} icon={ShieldCheck} tone={isMfaEnabled ? "green" : "amber"} />
            <OverviewTile label="Active Sessions" value={String(activeSessions.length)} icon={MonitorSmartphone} tone="slate" />
            <OverviewTile label="Recent Logins" value={String(loginHistoryRows.length)} icon={Globe2} tone={failedLogins > 0 ? "amber" : "green"} />
            <OverviewTile label="Audit Events (24h)" value={String(logs24h.length)} icon={CalendarDays} tone="slate" />
            <OverviewTile label="Team Members" value={String(teamMembers.length || 1)} icon={Users} tone={inactiveTeamMembers.length > 0 ? "amber" : "green"} />
            <OverviewTile label="Password Last Changed" value={passwordLastChanged ? formatDate(passwordLastChanged) : "Not available"} icon={KeyRound} tone="slate" compact />
          </div>
        </div>
      </section>

      <Card className="rounded-2xl border-slate-200/80">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MonitorSmartphone className="h-5 w-5 text-primary" />
            Active Sessions
          </CardTitle>
          <Button variant="outline" size="sm" onClick={signOutAllOtherSessions}>
            Sign Out All Other Sessions
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeSessions.map((session) => (
            <div key={session.id} className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-center">
              <SessionField label="Browser" value={session.browser} />
              <SessionField label="Operating System" value={session.os} />
              <SessionField label="Device" value={session.device} />
              <SessionField label="Approx. Location" value={session.location} detail={session.lastActivity ? `Last activity ${formatDate(session.lastActivity)}` : undefined} />
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {session.current && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Current Device</Badge>}
                <Button variant="outline" size="sm" disabled={session.current}>
                  Sign Out Session
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs leading-5 text-slate-500">
            The current auth client exposes this browser session. Additional device-level session inventory will appear here when provided by the auth service.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe2 className="h-5 w-5 text-primary" />
            Login History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loginHistoryRows.length === 0 ? (
            <EmptySecurityState title="No login history available" description="Recent authentication events will appear here when audit data includes login activity." />
          ) : (
            <div className="space-y-3">
              {loginHistoryRows.slice(0, 8).map((row) => (
                <div key={row.id} className={`grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] lg:items-center ${row.unusual ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
                  <SessionField label="Timestamp" value={formatDate(row.timestamp)} />
                  <SessionField label="Browser" value={row.browser} />
                  <SessionField label="OS" value={row.os} />
                  <SessionField label="Location" value={row.location} />
                  <SessionField label="IP" value={row.ip} />
                  <Badge className={row.status === "Success" ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10" : "bg-destructive/10 text-destructive hover:bg-destructive/10"}>
                    {row.unusual && <AlertTriangle className="mr-1 h-3 w-3" />}
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Team Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <EmptySecurityState title="No team members loaded" description="Team security details appear here for group practices when team data is available." />
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const email = member.therapists?.email || "No email"
                const lastLogin = logs.find((log) => log.user_email === email && categoryForAction(log.action) === "Authentication")?.created_at || null
                const inactiveDays = daysSince(lastLogin || member.joined_at)
                const neverLoggedIn = !lastLogin
                const needsReview = neverLoggedIn || (inactiveDays !== null && inactiveDays > 30)

                return (
                  <div key={member.id} className={`grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-center ${needsReview ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
                    <div>
                      <p className="font-semibold text-slate-950">{member.therapists?.full_name || email}</p>
                      <p className="mt-1 text-xs text-slate-500">{email}</p>
                    </div>
                    <SessionField label="MFA Enabled" value={isMfaEnabled && email === userEmail ? "Enabled" : "Unknown"} />
                    <SessionField label="Last Login" value={lastLogin ? formatDate(lastLogin) : "Never logged in"} />
                    <SessionField label="Inactive Days" value={inactiveDays !== null ? String(inactiveDays) : "Unknown"} />
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Badge variant="outline" className="capitalize">{member.status}</Badge>
                      {member.role === "owner" && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Owner</Badge>}
                      {neverLoggedIn && <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Never logged in</Badge>}
                      {inactiveDays !== null && inactiveDays > 30 && <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Inactive 30d+</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Practice Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {recommendations.map((recommendation) => {
            const isComplete = recommendation.complete || completedRecommendations.includes(recommendation.id)
            return (
              <button
                key={recommendation.id}
                type="button"
                onClick={() => {
                  setCompletedRecommendations((current) => (
                    current.includes(recommendation.id)
                      ? current.filter((id) => id !== recommendation.id)
                      : [...current, recommendation.id]
                  ))
                }}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors ${isComplete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <span className="font-semibold text-slate-950">{recommendation.title}</span>
                {isComplete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-slate-300" />}
              </button>
            )
          })}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Security Settings</h2>
          <p className="mt-1 text-sm text-slate-500">Session timeout, password policy, MFA, email notifications, and future integrations are grouped here.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SettingTile title="Session timeout" description="Dashboard inactivity timeout is active." />
          <SettingTile title="Password policy" description="Managed by the authentication provider." />
          <SettingTile title="Email notifications" description="Security email preferences live in Settings." />
          <SettingTile title="Future integrations" description="SSO and device policy controls can be added here later." />
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Audit Activity</CardTitle>
              <Button variant="outline" size="sm" onClick={exportAuditCsv} disabled={filteredLogs.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.4fr]">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger><SelectValue placeholder="User" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {userOptions.map((email) => (
                    <SelectItem key={email} value={email}>{email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionOptions.map((action) => (
                    <SelectItem key={action} value={action}>{formatAction(action)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search activity"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
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
                      <th className="py-3 pr-4 font-medium">Category</th>
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
                        <td className="py-4 pr-4 text-muted-foreground">{categoryForAction(log.action)}</td>
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

function OverviewTile({
  label,
  value,
  icon: Icon,
  tone,
  compact,
}: {
  label: string
  value: string
  icon: typeof ShieldCheck
  tone: "green" | "amber" | "slate"
  compact?: boolean
}) {
  const toneClass = tone === "green"
    ? "bg-emerald-500/10 text-emerald-700"
    : tone === "amber"
      ? "bg-amber-500/10 text-amber-700"
      : "bg-slate-100 text-slate-600"

  return (
    <Card className="rounded-2xl border-slate-200/80">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className={`mt-2 font-bold text-slate-950 ${compact ? "line-clamp-2 text-sm leading-5" : "text-2xl"}`}>{value}</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SessionField({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  )
}

function EmptySecurityState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function SettingTile({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Settings className="h-5 w-5" />
      </div>
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}
