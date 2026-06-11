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

export async function POST(request: Request) {
  try {
    const { clientId, inviteLink } = await request.json()

    if (!clientId || !inviteLink) {
      return NextResponse.json({ error: "Missing invitation email data" }, { status: 400 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!resendApiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 })
    }

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Invitation email service is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in to send invitations" }, { status: 401 })
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
      .select("id, therapist_id, full_name, email")
      .eq("id", clientId)
      .eq("therapist_id", therapist.id)
      .maybeSingle()

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    if (!client?.email) {
      return NextResponse.json({ error: "Client record was not found for this therapist" }, { status: 404 })
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
        { error: resendResult?.message || resendResult?.error || "Email delivery failed" },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, id: resendResult?.id || null })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invitation email" },
      { status: 500 },
    )
  }
}
