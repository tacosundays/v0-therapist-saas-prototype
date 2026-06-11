import { createHash, randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { renderClientInviteEmail } from "@/components/emails/client-invite-email"

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

function buildClientInviteLink(origin: string, email: string, token: string) {
  const url = new URL("/signup", origin)
  url.searchParams.set("role", "client")
  url.searchParams.set("email", normalizeEmail(email))
  url.searchParams.set("invite", token)
  return url.toString()
}

export async function POST(request: Request) {
  try {
    const { clientId } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: "Missing client id" }, { status: 400 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!resendApiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 })
    }

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Invitation resend service is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in to resend invitations" }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const normalizedTherapistEmail = normalizeEmail(user.email)

    const { data: therapist, error: therapistError } = await adminClient
      .from("therapists")
      .select("id, full_name, email")
      .ilike("email", normalizedTherapistEmail)
      .maybeSingle()

    if (therapistError) {
      return NextResponse.json({ error: therapistError.message }, { status: 500 })
    }

    if (!therapist) {
      return NextResponse.json({ error: "No therapist account found for your email" }, { status: 403 })
    }

    const { data: client, error: clientError } = await adminClient
      .from("clients")
      .select("id, therapist_id, full_name, email, user_id, invite_accepted_at")
      .eq("id", clientId)
      .eq("therapist_id", therapist.id)
      .maybeSingle()

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    if (!client?.email) {
      return NextResponse.json({ error: "Client record was not found for this therapist" }, { status: 404 })
    }

    if (client.user_id || client.invite_accepted_at) {
      return NextResponse.json({ error: "Client is already registered" }, { status: 400 })
    }

    const inviteToken = createInviteToken()
    const inviteTokenHash = hashInviteToken(inviteToken)
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const inviteLink = buildClientInviteLink(origin, client.email, inviteToken)

    const { error: tokenUpdateError } = await adminClient
      .from("clients")
      .update({
        invite_token_hash: inviteTokenHash,
        invite_sent_at: null,
        invite_accepted_at: null,
        status: "invited",
      })
      .eq("id", client.id)
      .eq("therapist_id", therapist.id)

    if (tokenUpdateError) {
      return NextResponse.json({ error: tokenUpdateError.message }, { status: 500 })
    }

    const therapistName = therapist.full_name || therapist.email || "Your therapist"
    const email = renderClientInviteEmail({
      clientName: client.full_name || "",
      therapistName,
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
        to: [client.email],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    })

    const resendResult = await resendResponse.json().catch(() => null)

    if (!resendResponse.ok) {
      return NextResponse.json(
        {
          error: resendResult?.message || resendResult?.error || "Email delivery failed",
          inviteLink,
        },
        { status: 502 },
      )
    }

    const { error: sentUpdateError } = await adminClient
      .from("clients")
      .update({
        invite_sent_at: new Date().toISOString(),
        status: "email_sent",
      })
      .eq("id", client.id)
      .eq("therapist_id", therapist.id)
      .is("user_id", null)

    if (sentUpdateError) {
      return NextResponse.json({ error: sentUpdateError.message, inviteLink }, { status: 500 })
    }

    return NextResponse.json({ success: true, inviteLink, id: resendResult?.id || null })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resend invitation" },
      { status: 500 },
    )
  }
}
