"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

  useEffect(() => {
    const loadAuditLogs = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] Security: auth email:", userEmail)
        console.log("[v0] Security: therapist id found:", therapistId ?? "none")

        if (!therapistId) {
          setError("No therapist account found for your email.")
          return
        }

        const supabase = getClient() as any
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

  return (
    <div className="space-y-8">
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
        <p className="mt-2 text-sm text-slate-500">Review audit events for your therapist workspace.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
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
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-200/70 align-top transition-colors hover:bg-slate-50/70">
                      <td className="py-4 pr-4 whitespace-nowrap text-muted-foreground">{formatDate(log.created_at)}</td>
                      <td className="py-4 pr-4">
                        <div className="font-medium text-foreground">{log.user_email || "System"}</div>
                        {log.actor_role && (
                          <div className="text-xs text-muted-foreground capitalize">{log.actor_role}</div>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
