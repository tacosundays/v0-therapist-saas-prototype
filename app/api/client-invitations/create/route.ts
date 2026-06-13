import { createHash, randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPlanLimits } from "@/lib/plan-limits"
import { normalizeProductId } from "@/lib/products"

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
    const { fullName, email } = await request.json()
    const normalizedClientEmail = typeof email === "string" ? normalizeEmail(email) : ""
    const clientName = typeof fullName === "string" ? fullName.trim() : ""

    if (!clientName || !normalizedClientEmail) {
      return NextResponse.json({ error: "Client name and email are required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Client invitation service is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in to invite clients" }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const normalizedTherapistEmail = normalizeEmail(user.email)

    const { data: therapist, error: therapistError } = await adminClient
      .from("therapists")
      .select("id, email, plan, subscription_plan")
      .ilike("email", normalizedTherapistEmail)
      .maybeSingle()

    if (therapistError) {
      return NextResponse.json({ error: therapistError.message }, { status: 500 })
    }

    if (!therapist) {
      return NextResponse.json({ error: "No therapist account found for your email" }, { status: 403 })
    }

    const { data: existingClient, error: lookupError } = await adminClient
      .from("clients")
      .select("id")
      .eq("therapist_id", therapist.id)
      .eq("email", normalizedClientEmail)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }

    if (!existingClient) {
      const { count, error: countError } = await adminClient
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("therapist_id", therapist.id)

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 })
      }

      const planId = normalizeProductId(therapist.plan || therapist.subscription_plan) || "free"
      const limits = getPlanLimits(planId)
      const currentClientCount = count || 0

      if (limits.clientLimit !== null && currentClientCount >= limits.clientLimit) {
        return NextResponse.json(
          {
            error: `Client limit reached for your current plan (${currentClientCount}/${limits.clientLimit}). Upgrade to invite more clients.`,
            code: "client_limit_reached",
            currentClientCount,
            clientLimit: limits.clientLimit,
            plan: planId,
          },
          { status: 403 },
        )
      }
    }

    const inviteToken = createInviteToken()
    const inviteTokenHash = hashInviteToken(inviteToken)

    const clientPayload = {
      therapist_id: therapist.id,
      full_name: clientName,
      email: normalizedClientEmail,
      status: "invited",
      invite_token_hash: inviteTokenHash,
      invite_sent_at: null,
      invite_accepted_at: null,
    }

    const saveResult = existingClient
      ? await adminClient
          .from("clients")
          .update(clientPayload)
          .eq("id", existingClient.id)
          .eq("therapist_id", therapist.id)
          .select("id")
          .single()
      : await adminClient
          .from("clients")
          .insert(clientPayload)
          .select("id")
          .single()

    if (saveResult.error) {
      return NextResponse.json({ error: saveResult.error.message }, { status: 500 })
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const inviteLink = buildClientInviteLink(origin, normalizedClientEmail, inviteToken)

    return NextResponse.json({
      success: true,
      clientId: saveResult.data.id,
      inviteLink,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create client invitation" },
      { status: 500 },
    )
  }
}
