import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(request: Request) {
  try {
    const { email, inviteToken, therapistId } = await request.json()
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : ""

    if (!normalizedEmail || !inviteToken || !therapistId) {
      return NextResponse.json({ error: "Missing team invitation data" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Team invitation acceptance is not configured" }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const tokenHash = hashInviteToken(String(inviteToken))

    const { data: invite, error: inviteError } = await adminClient
      .from("therapist_invites")
      .select("id, practice_id, email, role, accepted_at, revoked_at, expires_at")
      .eq("token_hash", tokenHash)
      .ilike("email", normalizedEmail)
      .maybeSingle()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    if (!invite || invite.accepted_at || invite.revoked_at || new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invalid or expired team invite" }, { status: 400 })
    }

    const { data: practice, error: practiceError } = await adminClient
      .from("practices")
      .select("id, max_seats")
      .eq("id", invite.practice_id)
      .single()

    if (practiceError) {
      return NextResponse.json({ error: practiceError.message }, { status: 500 })
    }

    const { count: activeMemberCount, error: countError } = await adminClient
      .from("practice_members")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practice.id)
      .eq("status", "active")

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    const maxSeats = practice.max_seats || 5
    if ((activeMemberCount || 0) >= maxSeats) {
      return NextResponse.json({ error: `Seat limit reached (${activeMemberCount}/${maxSeats})` }, { status: 403 })
    }

    const { error: memberError } = await adminClient
      .from("practice_members")
      .upsert(
        {
          practice_id: invite.practice_id,
          therapist_id: therapistId,
          role: invite.role || "therapist",
          status: "active",
          joined_at: new Date().toISOString(),
          removed_at: null,
        },
        { onConflict: "practice_id,therapist_id" },
      )

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    await adminClient
      .from("therapists")
      .update({ plan: "group-practice" })
      .eq("id", therapistId)
      .ilike("email", normalizedEmail)

    const { error: updateInviteError } = await adminClient
      .from("therapist_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)

    if (updateInviteError) {
      return NextResponse.json({ error: updateInviteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept team invite" },
      { status: 500 },
    )
  }
}
