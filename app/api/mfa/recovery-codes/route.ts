import { createHash, randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function normalizeEmail(email: string | null | undefined) {
  return email ? email.trim().toLowerCase() : null
}

function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "").replace(/-/g, "")
}

function hashRecoveryCode(code: string) {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex")
}

function createRecoveryCode() {
  const raw = randomBytes(6).toString("hex").toUpperCase()
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

async function getTherapistForRequest(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: "MFA service is not configured" }, { status: 500 }) }
  }

  const bearerToken = getBearerToken(request)

  if (!bearerToken) {
    return { error: NextResponse.json({ error: "Missing authentication token" }, { status: 401 }) }
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

  if (userError || !user?.email) {
    return { error: NextResponse.json({ error: "You must be logged in" }, { status: 401 }) }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const normalizedEmail = normalizeEmail(user.email) as string
  const { data: therapist, error: therapistError } = await adminClient
    .from("therapists")
    .select("id, email")
    .ilike("email", normalizedEmail)
    .maybeSingle()

  if (therapistError) {
    return { error: NextResponse.json({ error: therapistError.message }, { status: 500 }) }
  }

  if (!therapist) {
    return { error: NextResponse.json({ error: "No therapist account found for your email" }, { status: 403 }) }
  }

  return { adminClient, therapist, user }
}

export async function GET(request: Request) {
  try {
    const result = await getTherapistForRequest(request)
    if (result.error) return result.error

    const { adminClient, therapist } = result
    const { count, error } = await adminClient
      .from("therapist_mfa_recovery_codes")
      .select("*", { count: "exact", head: true })
      .eq("therapist_id", therapist.id)
      .is("used_at", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ unusedCount: count || 0 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load recovery code status" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const result = await getTherapistForRequest(request)
    if (result.error) return result.error

    const { adminClient, therapist } = result
    const codes = Array.from({ length: 10 }, () => createRecoveryCode())

    const { error: deleteError } = await adminClient
      .from("therapist_mfa_recovery_codes")
      .delete()
      .eq("therapist_id", therapist.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    const { error: insertError } = await adminClient
      .from("therapist_mfa_recovery_codes")
      .insert(codes.map((code) => ({
        therapist_id: therapist.id,
        code_hash: hashRecoveryCode(code),
      })))

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ codes })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate recovery codes" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Recovery code is required" }, { status: 400 })
    }

    const result = await getTherapistForRequest(request)
    if (result.error) return result.error

    const { adminClient, therapist } = result
    const codeHash = hashRecoveryCode(String(code))

    const { data: matchingCode, error: lookupError } = await adminClient
      .from("therapist_mfa_recovery_codes")
      .select("id")
      .eq("therapist_id", therapist.id)
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }

    if (!matchingCode) {
      return NextResponse.json({ error: "Invalid or already used recovery code" }, { status: 400 })
    }

    const { error: updateError } = await adminClient
      .from("therapist_mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", matchingCode.id)
      .eq("therapist_id", therapist.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify recovery code" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const result = await getTherapistForRequest(request)
    if (result.error) return result.error

    const { adminClient, therapist } = result
    const { error } = await adminClient
      .from("therapist_mfa_recovery_codes")
      .delete()
      .eq("therapist_id", therapist.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear recovery codes" },
      { status: 500 },
    )
  }
}
