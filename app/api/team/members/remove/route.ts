import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/audit-log"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
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
    const { memberId } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: "Missing member id" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Team member service is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in to remove team members" }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: owner, error: ownerError } = await adminClient
      .from("therapists")
      .select("id, email")
      .ilike("email", normalizeEmail(user.email))
      .maybeSingle()

    if (ownerError) {
      return NextResponse.json({ error: ownerError.message }, { status: 500 })
    }

    if (!owner) {
      return NextResponse.json({ error: "No therapist account found for your email" }, { status: 403 })
    }

    const { data: ownerMembership, error: ownerMembershipError } = await adminClient
      .from("practice_members")
      .select("practice_id, role, status")
      .eq("therapist_id", owner.id)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle()

    if (ownerMembershipError) {
      return NextResponse.json({ error: ownerMembershipError.message }, { status: 500 })
    }

    if (!ownerMembership?.practice_id) {
      return NextResponse.json({ error: "Only practice owners can remove team members" }, { status: 403 })
    }

    const { data: member, error: memberError } = await adminClient
      .from("practice_members")
      .select("id, practice_id, therapist_id, role, status")
      .eq("id", memberId)
      .eq("practice_id", ownerMembership.practice_id)
      .maybeSingle()

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    if (!member) {
      return NextResponse.json({ error: "Team member was not found" }, { status: 404 })
    }

    if (member.role === "owner" || member.therapist_id === owner.id) {
      return NextResponse.json({ error: "The practice owner cannot be removed" }, { status: 400 })
    }

    const { error: removeError } = await adminClient
      .from("practice_members")
      .update({
        status: "removed",
        removed_at: new Date().toISOString(),
      })
      .eq("id", member.id)
      .eq("practice_id", ownerMembership.practice_id)

    if (removeError) {
      return NextResponse.json({ error: removeError.message }, { status: 500 })
    }

    await writeAuditLog({
      therapistId: owner.id,
      userId: user.id,
      userEmail: normalizeEmail(user.email),
      actorRole: "therapist",
      action: "team.member_removed",
      resourceType: "practice_member",
      resourceId: member.id,
      details: {
        practiceId: ownerMembership.practice_id,
        removedTherapistId: member.therapist_id,
      },
      ipAddress: getRequestIp(request),
      userAgent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove team member" },
      { status: 500 },
    )
  }
}
