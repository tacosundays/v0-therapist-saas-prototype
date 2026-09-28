import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

export async function POST(request: Request) {
  try {
    const { clientId, email, fullName, inviteToken } = await request.json()
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : ""

    if (!clientId || !normalizedEmail || !fullName || !inviteToken) {
      return NextResponse.json({ error: "Missing invitation acceptance data" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Invitation acceptance is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.id || !user.email) {
      return NextResponse.json({ error: "You must be logged in to accept this invite" }, { status: 401 })
    }

    if (normalizeEmail(user.email) !== normalizedEmail) {
      return NextResponse.json({ error: "Authenticated email does not match this invite" }, { status: 403 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const inviteTokenHash = hashInviteToken(String(inviteToken))

    const { data: client, error: lookupError } = await supabase
      .from("clients")
      .select("id, user_id")
      .eq("id", clientId)
      .eq("email", normalizedEmail)
      .eq("invite_token_hash", inviteTokenHash)
      .maybeSingle()

    if (lookupError) {
      console.error("Invitation lookup failed:", lookupError)
      return NextResponse.json({ error: "Invitation could not be verified. Please try again." }, { status: 500 })
    }

    if (!client) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 })
    }

    if (client.user_id && client.user_id !== user.id) {
      return NextResponse.json({ error: "This invite has already been accepted by another account" }, { status: 409 })
    }

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        user_id: user.id,
        full_name: fullName,
        invite_accepted_at: new Date().toISOString(),
        invite_token_hash: null,
        status: "active",
      })
      .eq("id", clientId)

    if (updateError) {
      console.error("Invitation acceptance failed:", updateError)
      return NextResponse.json({ error: "Invitation could not be accepted. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Invitation acceptance failed:", error)
    return NextResponse.json(
      { error: "Invitation could not be accepted. Please try again." },
      { status: 500 }
    )
  }
}
