import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resolveTenantContext } from "@/lib/tenant-context"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

export async function POST(request: Request) {
  try {
    const { email, inviteToken } = await request.json()
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : ""

    if (!normalizedEmail || !inviteToken) {
      return NextResponse.json({ error: "Missing team invitation data" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Team invitation acceptance is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in to accept this team invite" }, { status: 401 })
    }

    if (normalizeEmail(user.email) !== normalizedEmail) {
      return NextResponse.json({ error: "Authenticated email does not match this team invite" }, { status: 403 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const tokenHash = hashInviteToken(String(inviteToken))
    const currentTenant = await resolveTenantContext(adminClient, user)
    if (!currentTenant) {
      return NextResponse.json({ error: "No active clinician organization was found" }, { status: 403 })
    }

    const { data: therapist, error: therapistError } = await adminClient
      .from("therapists")
      .select("id, email")
      .eq("id", currentTenant.therapistId)
      .eq("organization_id", currentTenant.organizationId)
      .maybeSingle()

    if (therapistError) {
      return NextResponse.json({ error: therapistError.message }, { status: 500 })
    }

    if (!therapist) {
      return NextResponse.json({ error: "No therapist account found for your email" }, { status: 403 })
    }

    const { data: invite, error: inviteError } = await adminClient
      .from("organization_invitations")
      .select("id, organization_id, email, role, accepted_at, revoked_at, expires_at")
      .eq("token_hash", tokenHash)
      .ilike("email", normalizedEmail)
      .maybeSingle()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    if (!invite || invite.accepted_at || invite.revoked_at || new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invalid or expired team invite" }, { status: 400 })
    }

    const { error: tenantJoinError } = await adminClient.rpc("accept_organization_invitation", {
      target_invitation_id: invite.id,
      target_therapist_id: therapist.id,
    })

    if (tenantJoinError) {
      return NextResponse.json({ error: tenantJoinError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept team invite" },
      { status: 500 },
    )
  }
}
