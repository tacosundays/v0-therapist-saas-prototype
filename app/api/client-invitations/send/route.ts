import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { renderClientInviteEmail } from "@/components/emails/client-invite-email"
import { isPauboxConfigured, sendPauboxEmail } from "@/lib/email/paubox"
import { resolveTenantContext } from "@/lib/tenant-context"

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!isPauboxConfigured()) {
      return NextResponse.json({ error: "PAUBOX_API_KEY is not configured" }, { status: 500 })
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
    const tenant = await resolveTenantContext(adminClient, user)
    if (!tenant) {
      return NextResponse.json({ error: "No active clinician organization was found" }, { status: 403 })
    }

    const { data: therapist, error: therapistError } = await adminClient
      .from("therapists")
      .select("id, full_name, email")
      .eq("id", tenant.therapistId)
      .eq("organization_id", tenant.organizationId)
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
      .eq("organization_id", tenant.organizationId)
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

    const delivery = await sendPauboxEmail({
      to: client.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    const { error: updateError } = await adminClient
      .from("clients")
      .update({
        invite_sent_at: new Date().toISOString(),
        status: "email_sent",
      })
      .eq("id", client.id)
      .eq("therapist_id", therapist.id)
      .eq("organization_id", tenant.organizationId)
      .is("user_id", null)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: delivery.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invitation email" },
      { status: 500 },
    )
  }
}
