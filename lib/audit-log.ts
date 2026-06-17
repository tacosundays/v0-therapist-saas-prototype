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

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function writeAuditLog(input: AuditLogInput) {
  const adminClient = createAdminClient()

  if (!adminClient) {
    console.warn("[audit] Audit log service is not configured")
    return
  }

  const { error } = await adminClient
    .from("audit_logs")
    .insert({
      therapist_id: input.therapistId || null,
      user_id: input.userId || null,
      user_email: input.userEmail || null,
      actor_role: input.actorRole || "unknown",
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId || null,
      details: input.details || {},
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
    })

  if (error) {
    console.warn("[audit] Failed to write audit log", {
      action: input.action,
      resourceType: input.resourceType,
      error: error.message,
    })
  }
}
