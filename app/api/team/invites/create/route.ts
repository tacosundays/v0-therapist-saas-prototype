import { createHash, randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { renderTherapistInviteEmail } from "@/components/emails/therapist-invite-email"
import { normalizeProductId } from "@/lib/products"

const resendApiUrl = "https://api.resend.com/emails"
const defaultFromEmail = "ShrinkAid <onboarding@resend.dev>"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

function createInviteToken() {
  return randomBytes(32).toString("hex")
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function buildTherapistInviteLink(origin: string, email: string, token: string) {
  const url = new URL("/signup", origin)
  url.searchParams.set("role", "therapist")
  url.searchParams.set("email", normalizeEmail(email))
  url.searchParams.set("invite", token)
  return url.toString()
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalizedInviteEmail = typeof email === "string" ? normalizeEmail(email) : ""

    if (!normalizedInviteEmail) {
      return NextResponse.json({ error: "Therapist email is required" }, { status: 400 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Team invitation service is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in to invite therapists" }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: owner, error: ownerError } = await adminClient
      .from("therapists")
      .select("id, email, full_name, plan, subscription_plan")
      .ilike("email", normalizeEmail(user.email))
      .maybeSingle()

    if (ownerError) {
      return NextResponse.json({ error: ownerError.message }, { status: 500 })
    }

    if (!owner) {
      return NextResponse.json({ error: "No therapist account found for your email" }, { status: 403 })
    }

    const planId = normalizeProductId(owner.plan || owner.subscription_plan) || "free"
    if (planId !== "group-practice") {
      return NextResponse.json({ error: "Team invitations require the Group Practice plan" }, { status: 403 })
    }

    const { data: membership, error: membershipError } = await adminClient
      .from("practice_members")
      .select("practice_id, role, status")
      .eq("therapist_id", owner.id)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle()

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    if (!membership?.practice_id) {
      return NextResponse.json({ error: "Open the Team page before inviting therapists" }, { status: 400 })
    }

    const { data: practice, error: practiceError } = await adminClient
      .from("practices")
      .select("id, name, max_seats")
      .eq("id", membership.practice_id)
      .eq("owner_therapist_id", owner.id)
      .single()

    if (practiceError) {
      return NextResponse.json({ error: practiceError.message }, { status: 500 })
    }

    const { count: activeMemberCount, error: memberCountError } = await adminClient
      .from("practice_members")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practice.id)
      .eq("status", "active")

    if (memberCountError) {
      return NextResponse.json({ error: memberCountError.message }, { status: 500 })
    }

    const { count: pendingInviteCount, error: inviteCountError } = await adminClient
      .from("therapist_invites")
      .select("*", { count: "exact", head: true })
      .eq("practice_id", practice.id)
      .is("accepted_at", null)
      .is("revoked_at", null)

    if (inviteCountError) {
      return NextResponse.json({ error: inviteCountError.message }, { status: 500 })
    }

    const maxSeats = practice.max_seats || 5
    const seatsUsed = (activeMemberCount || 0) + (pendingInviteCount || 0)

    if (seatsUsed >= maxSeats) {
      return NextResponse.json({ error: `Seat limit reached (${seatsUsed}/${maxSeats})` }, { status: 403 })
    }

    const { data: existingMember, error: existingMemberError } = await adminClient
      .from("therapists")
      .select("id, email")
      .ilike("email", normalizedInviteEmail)
      .maybeSingle()

    if (existingMemberError) {
      return NextResponse.json({ error: existingMemberError.message }, { status: 500 })
    }

    if (existingMember) {
      const { data: existingMembership, error: existingMembershipError } = await adminClient
        .from("practice_members")
        .select("id, status")
        .eq("practice_id", practice.id)
        .eq("therapist_id", existingMember.id)
        .maybeSingle()

      if (existingMembershipError) {
        return NextResponse.json({ error: existingMembershipError.message }, { status: 500 })
      }

      if (existingMembership?.status === "active") {
        return NextResponse.json({ error: "This therapist is already on the team" }, { status: 400 })
      }
    }

    const inviteToken = createInviteToken()
    const tokenHash = hashInviteToken(inviteToken)
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const inviteLink = buildTherapistInviteLink(origin, normalizedInviteEmail, inviteToken)

    const { data: invite, error: inviteError } = await adminClient
      .from("therapist_invites")
      .insert({
        practice_id: practice.id,
        invited_by_therapist_id: owner.id,
        email: normalizedInviteEmail,
        role: "therapist",
        token_hash: tokenHash,
      })
      .select("id, email, created_at")
      .single()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    if (!resendApiKey) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        inviteLink,
        invite,
        message: "Invite created. Email delivery is not configured. Copy invite link manually.",
      })
    }

    const emailContent = renderTherapistInviteEmail({
      inviterName: owner.full_name || owner.email || "A practice owner",
      practiceName: practice.name,
      inviteLink,
    })

    const resendResponse = await fetch(resendApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || defaultFromEmail,
        to: [normalizedInviteEmail],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    })

    const resendResult = await resendResponse.json().catch(() => null)

    if (!resendResponse.ok) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        inviteLink,
        invite,
        message: resendResult?.message || resendResult?.error || "Invite created. Email delivery failed. Copy invite link manually.",
      })
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      inviteLink,
      invite,
      message: "Invitation email sent successfully.",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create therapist invitation" },
      { status: 500 },
    )
  }
}
