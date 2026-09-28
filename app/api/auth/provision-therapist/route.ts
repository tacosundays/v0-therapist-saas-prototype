import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function bearer(request: Request) {
  const value = request.headers.get("authorization") || ""
  return value.startsWith("Bearer ") ? value.slice(7) : null
}

function cleanMetadataValue(value: unknown, maxLength = 120) {
  if (typeof value !== "string") return null
  const cleaned = value.trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

function logDatabaseError(stage: string, error: { code?: string; message?: string; details?: string; hint?: string }) {
  console.error("[provision-therapist]", {
    stage,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  })
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = bearer(request)

  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Account setup is temporarily unavailable." }, { status: 503 })
  }
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const auth = createClient(url, anonKey)
  const { data: { user }, error: userError } = await auth.auth.getUser(token)
  if (userError || !user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (user.user_metadata?.role !== "therapist") {
    return NextResponse.json({ error: "Therapist access required" }, { status: 403 })
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const email = user.email.trim().toLowerCase()

  const { data: identityMatch, error: identityError } = await admin
    .from("therapists")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  if (identityError) {
    logDatabaseError("identity_lookup", identityError)
    return NextResponse.json({ error: "Account setup failed." }, { status: 500 })
  }
  if (identityMatch) return NextResponse.json({ therapistId: identityMatch.id })

  const { data: emailMatches, error: emailError } = await admin
    .from("therapists")
    .select("id, auth_user_id")
    .ilike("email", email)
    .limit(2)
  if (emailError) {
    logDatabaseError("email_lookup", emailError)
    return NextResponse.json({ error: "Account setup failed." }, { status: 500 })
  }

  if (emailMatches?.length === 1 && !emailMatches[0].auth_user_id) {
    const { data: linked, error: linkError } = await admin
      .from("therapists")
      .update({ auth_user_id: user.id })
      .eq("id", emailMatches[0].id)
      .is("auth_user_id", null)
      .select("id")
      .single()
    if (linkError) {
      logDatabaseError("identity_link", linkError)
      return NextResponse.json({ error: "Account setup failed." }, { status: 500 })
    }
    return NextResponse.json({ therapistId: linked.id })
  }
  if (emailMatches?.length) {
    return NextResponse.json({ error: "This email is already linked to another account." }, { status: 409 })
  }

  const firstName = cleanMetadataValue(user.user_metadata?.first_name)
  const lastName = cleanMetadataValue(user.user_metadata?.last_name)
  const metadataFullName = cleanMetadataValue(user.user_metadata?.full_name)
  const fullName = metadataFullName || [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0]
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: created, error: createError } = await admin
    .from("therapists")
    .insert({
      id: user.id,
      auth_user_id: user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      credentials: cleanMetadataValue(user.user_metadata?.credentials),
      practice_name: cleanMetadataValue(user.user_metadata?.practice_name),
      plan: "free",
      trial_end_date: trialEnd,
      trial_ends_at: trialEnd,
      subscription_status: "trialing",
    })
    .select("id")
    .single()

  if (createError) {
    logDatabaseError("profile_insert", createError)
    const { data: recovered } = await admin
      .from("therapists")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle()
    if (recovered) return NextResponse.json({ therapistId: recovered.id })
    return NextResponse.json({ error: "Account setup failed." }, { status: 500 })
  }

  return NextResponse.json({ therapistId: created.id }, { status: 201 })
}
