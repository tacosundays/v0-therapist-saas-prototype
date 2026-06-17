import { getClient } from "@/lib/supabase/client"

interface ClientAuditInput {
  action: string
  resourceType: string
  resourceId?: string | null
  details?: Record<string, unknown>
}

export async function logClientAuditEvent(input: ClientAuditInput) {
  try {
    const supabase = getClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) return

    await fetch("/api/audit-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(input),
    })
  } catch (error) {
    console.warn("[audit] Failed to send client audit event", error)
  }
}
