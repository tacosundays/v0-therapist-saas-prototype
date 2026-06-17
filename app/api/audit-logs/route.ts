import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/audit-log"

const allowedActions = new Set([
  "login",
  "logout",
  "client.create",
  "client.update",
  "client.delete",
  "assignment.create",
  "assignment.update",
  "assignment.delete",
  "reflection.submitted",
  "team.invite_sent",
  "team.member_removed",
  "subscription.changed",
])

function normalizeEmail(email: string | null | undefined) {
  return email ? email.trim().toLowerCase() : null
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

function getRequestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || null
}

export async function POST(request: Request) {
  try {
    const { action, resourceType, resourceId, details } = await request.json()

    if (!allowedActions.has(action) || !resourceType) {
      return NextResponse.json({ error: "Invalid audit event" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Audit logging is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in" }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const normalizedEmail = normalizeEmail(user.email) as string

    const { data: therapist } = await adminClient
      .from("therapists")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle()

    let client: { id: string; therapist_id: string; email: string | null; user_id: string | null } | null = null

    if (!therapist) {
      const { data: clientRecord } = await adminClient
          .from("clients")
          .select("id, therapist_id, email, user_id")
          .or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`)
          .limit(1)
          .maybeSingle()
      client = clientRecord
    }

    await writeAuditLog({
      therapistId: therapist?.id || client?.therapist_id || null,
      userId: user.id,
      userEmail: normalizedEmail,
      actorRole: therapist ? "therapist" : client ? "client" : "unknown",
      action,
      resourceType,
      resourceId: resourceId || null,
      details: details && typeof details === "object" ? details : {},
      ipAddress: getRequestIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.warn("[audit] Failed to handle audit event", error)
    return NextResponse.json({ error: "Failed to log audit event" }, { status: 500 })
  }
}
