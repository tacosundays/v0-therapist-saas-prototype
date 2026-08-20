import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/audit-log"
import { resolveTenantContext } from "@/lib/tenant-context"

function bearer(request: Request) {
  const value = request.headers.get("authorization") || ""
  return value.startsWith("Bearer ") ? value.slice(7) : null
}

async function context(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = bearer(request)
  if (!url || !anon || !service || !token) return null
  const auth = createClient(url, anon)
  const { data: { user } } = await auth.auth.getUser(token)
  if (!user) return null
  const admin = createClient(url, service)
  const tenant = await resolveTenantContext(admin, user)
  return tenant ? { admin, tenant, user } : null
}

export async function GET(request: Request) {
  const resolved = await context(request)
  if (!resolved) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { admin, tenant } = resolved
  const [{ data: organization, error }, { data: locations }, { data: members }, { data: assignments }, { data: invitations }] = await Promise.all([
    admin.from("organizations").select("id,name,plan,subscription_plan,max_seats,owner_therapist_id").eq("id", tenant.organizationId).single(),
    admin.from("locations").select("id,name,is_primary,status,created_at").eq("organization_id", tenant.organizationId).order("is_primary", { ascending: false }).order("name"),
    admin.from("organization_members").select("id,therapist_id,role,status,joined_at,therapists(id,full_name,email,credentials)").eq("organization_id", tenant.organizationId).eq("status", "active").order("joined_at"),
    admin.from("location_memberships").select("location_id,therapist_id,is_primary").eq("organization_id", tenant.organizationId),
    admin.from("organization_invitations").select("id,email,role,location_id,expires_at,created_at").eq("organization_id", tenant.organizationId).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ organization, locations: locations || [], members: members || [], assignments: assignments || [], invitations: invitations || [], currentRole: tenant.role, currentTherapistId: tenant.therapistId })
}

export async function PATCH(request: Request) {
  const resolved = await context(request)
  if (!resolved) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { admin, tenant, user } = resolved
  if (!["owner", "admin"].includes(tenant.role)) return NextResponse.json({ error: "Organization administrator access required" }, { status: 403 })
  const body = await request.json()
  const action = String(body.action || "")
  let resourceId: string | null = tenant.organizationId

  if (action === "rename") {
    const name = String(body.name || "").trim()
    if (!name || name.length > 120) return NextResponse.json({ error: "Organization name must be 1-120 characters" }, { status: 400 })
    const { error } = await admin.from("organizations").update({ name }).eq("id", tenant.organizationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (action === "createLocation") {
    const name = String(body.name || "").trim()
    if (!name || name.length > 120) return NextResponse.json({ error: "Location name must be 1-120 characters" }, { status: 400 })
    const { data, error } = await admin.from("locations").insert({ organization_id: tenant.organizationId, name }).select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    resourceId = data.id
  } else if (action === "setRole") {
    if (tenant.role !== "owner") return NextResponse.json({ error: "Only the owner can change roles" }, { status: 403 })
    const { error } = await admin.rpc("set_organization_member_role", { target_organization_id: tenant.organizationId, target_therapist_id: body.therapistId, target_role: body.role })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    resourceId = body.therapistId
  } else if (action === "transferOwnership") {
    if (tenant.role !== "owner") return NextResponse.json({ error: "Only the owner can transfer ownership" }, { status: 403 })
    const { error } = await admin.rpc("transfer_organization_ownership", { target_organization_id: tenant.organizationId, target_new_owner_id: body.therapistId })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    resourceId = body.therapistId
  } else if (action === "assignLocation") {
    const { error } = await admin.rpc("assign_clinician_location", { target_organization_id: tenant.organizationId, target_location_id: body.locationId, target_therapist_id: body.therapistId, make_primary: body.makePrimary === true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    resourceId = body.locationId
  } else if (action === "revokeInvitation") {
    const { data, error } = await admin.from("organization_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", body.invitationId).eq("organization_id", tenant.organizationId).is("accepted_at", null).select("id").maybeSingle()
    if (error || !data) return NextResponse.json({ error: error?.message || "Invitation was not found" }, { status: 404 })
    resourceId = data.id
  } else {
    return NextResponse.json({ error: "Unsupported organization action" }, { status: 400 })
  }

  await writeAuditLog({ therapistId: tenant.therapistId, userId: user.id, userEmail: user.email || null, actorRole: "therapist", action: `organization.${action}`, resourceType: "organization", resourceId, details: { organizationId: tenant.organizationId } })
  return NextResponse.json({ success: true })
}
