import { createClient } from "@supabase/supabase-js"

export interface AuditLogInput {
  therapistId?: string | null
  userId?: string | null
  userEmail?: string | null
  actorRole?: "therapist" | "client" | "system" | "unknown"
  action: string
  resourceType: string
  resourceId?: string | null
  details?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

const sensitiveDetailKey = /(email|name|note|text|answer|reflection|token|secret|body|content)/i

export function sanitizeAuditDetails(details: Record<string, unknown> | undefined) {
  if (!details) return {}
  return Object.fromEntries(Object.entries(details).flatMap(([key, value]) => {
    if (sensitiveDetailKey.test(key)) return []
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      return [[key, typeof value === "string" ? value.slice(0, 200) : value]]
    }
    if (Array.isArray(value)) return [[key, { count: value.length }]]
    if (typeof value === "object") return [[key, "[redacted]"]]
    return []
  }))
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const adminClient = createAdminClient()

  if (!adminClient) {
    throw new Error("AUDIT_LOG_UNAVAILABLE")
  }

  const { error } = await adminClient
    .from("audit_logs")
    .insert({
      therapist_id: input.therapistId || null,
      user_id: input.userId || null,
      user_email: null,
      actor_role: input.actorRole || "unknown",
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId || null,
      details: sanitizeAuditDetails(input.details),
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
    })

  if (error) {
    throw new Error("AUDIT_LOG_WRITE_FAILED")
  }

}
