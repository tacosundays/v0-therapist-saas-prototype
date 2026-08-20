import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizeProductId } from "@/lib/products"
import { resolveTenantContext } from "@/lib/tenant-context"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Team management service is not configured")
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

async function getAuthenticatedTherapist(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const bearerToken = getBearerToken(request)

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Authentication service is not configured")
  }

  if (!bearerToken) {
    return { error: NextResponse.json({ error: "Missing authentication token" }, { status: 401 }) }
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

  if (userError || !user?.email) {
    return { error: NextResponse.json({ error: "You must be logged in" }, { status: 401 }) }
  }

  const adminClient = getAdminClient()
  const tenant = await resolveTenantContext(adminClient, user)
  if (!tenant) {
    return { error: NextResponse.json({ error: "No active clinician organization was found" }, { status: 403 }) }
  }
  const { data: therapist, error: therapistError } = await adminClient
    .from("therapists")
    .select("id, email, full_name, practice_name, plan, subscription_plan")
    .eq("id", tenant.therapistId)
    .eq("organization_id", tenant.organizationId)
    .maybeSingle()

  if (therapistError) {
    return { error: NextResponse.json({ error: therapistError.message }, { status: 500 }) }
  }

  if (!therapist) {
    return { error: NextResponse.json({ error: "No therapist account found for your email" }, { status: 403 }) }
  }

  return { adminClient, tenant, therapist }
}

export async function GET(request: Request) {
  try {
    const result = await getAuthenticatedTherapist(request)
    if (result.error) return result.error

    const { adminClient, tenant, therapist } = result
    const { data: organization, error: organizationError } = await adminClient
      .from("organizations")
      .select("id, owner_therapist_id, name, plan, subscription_plan, max_seats, legacy_practice_id, created_at")
      .eq("id", tenant.organizationId)
      .single()

    if (organizationError) throw organizationError

    const planId = normalizeProductId(
      organization.subscription_plan || organization.plan || therapist.plan || therapist.subscription_plan,
    ) || "free"
    const canManageTeam = ["owner", "admin"].includes(tenant.role) && planId === "group-practice"

    const { data: members, error: membersError } = await adminClient
      .from("organization_members")
      .select("id, therapist_id, role, status, joined_at, removed_at, therapists(id, full_name, email, credentials)")
      .eq("organization_id", tenant.organizationId)
      .order("joined_at", { ascending: true })

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    let invites: any[] = []
    if (organization.legacy_practice_id) {
      const { data, error: invitesError } = await adminClient
        .from("therapist_invites")
        .select("id, email, role, accepted_at, revoked_at, expires_at, created_at")
        .eq("practice_id", organization.legacy_practice_id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })

      if (invitesError) {
        return NextResponse.json({ error: invitesError.message }, { status: 500 })
      }
      invites = data || []
    }

    const activeMembers = (members || []).filter((member: any) => member.status === "active")
    const pendingInvites = invites
    const practice = {
      id: organization.legacy_practice_id,
      owner_therapist_id: organization.owner_therapist_id,
      name: organization.name,
      plan: planId,
      max_seats: organization.max_seats,
      created_at: organization.created_at,
    }

    return NextResponse.json({
      practice,
      currentTherapistId: therapist.id,
      currentRole: tenant.role,
      plan: planId,
      canManageTeam,
      maxSeats: organization.max_seats,
      seatsUsed: activeMembers.length + pendingInvites.length,
      members: members || [],
      invites: pendingInvites,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load team" },
      { status: 500 },
    )
  }
}
