import { getClient } from "@/lib/supabase/client"

export type UserRole = "therapist" | "client" | "unknown"

export interface UserRoleResult {
  isAuthenticated: boolean
  user: { id: string; email: string | null } | null
  userId: string | null
  userEmail: string | null
  role: UserRole
  therapistRecord: { id: string; email: string | null } | null
  clientRecord: { id: string; therapist_id: string; full_name: string; email: string | null } | null
  error: string | null
}

type AuthUser = {
  id: string
  email: string | null
}

type TherapistRecord = {
  id: string
  email: string | null
}

type ClientRecord = {
  id: string
  therapist_id: string
  full_name: string
  email: string | null
  user_id?: string | null
}

function normalizeEmail(email: string | null | undefined) {
  return email ? email.toLowerCase().trim() : null
}

function publicClientRecord(clientRecord: ClientRecord) {
  return {
    id: clientRecord.id,
    therapist_id: clientRecord.therapist_id,
    full_name: clientRecord.full_name,
    email: clientRecord.email,
  }
}

async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const supabase = getClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return {
    id: user.id,
    email: user.email || null,
  }
}

async function findTherapistByEmail(email: string): Promise<TherapistRecord | null> {
  const supabase = getClient() as any
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) return null

  console.log("[v0] Therapist lookup auth email:", normalizedEmail)

  const { data: therapistRecord, error } = await supabase
    .from("therapists")
    .select("id, email")
    .ilike("email", normalizedEmail)
    .maybeSingle()

  if (error) {
    console.log("[v0] Therapist lookup error:", error.message)
    return null
  }

  console.log("[v0] Therapist id found:", therapistRecord?.id ?? "none")
  return therapistRecord
}

async function findClientByEmailOrUserId(userId: string, email: string): Promise<ClientRecord | null> {
  const supabase = getClient() as any
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) return null

  console.log("[v0] Client lookup auth email:", normalizedEmail)

  const { data: clientMatches, error: clientLookupError } = await supabase
    .from("clients")
    .select("id, therapist_id, full_name, email, user_id")
    .or(`user_id.eq.${userId},email.ilike.${normalizedEmail}`)
    .limit(1)

  if (!clientLookupError && clientMatches && clientMatches.length > 0) {
    const clientRecord = clientMatches[0] as ClientRecord
    console.log("[v0] Client id found:", clientRecord.id)

    if (!clientRecord.user_id) {
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          user_id: userId,
          invite_accepted_at: new Date().toISOString(),
          invite_token_hash: null,
        })
        .eq("id", clientRecord.id)

      if (updateError) {
        console.log("[v0] Failed to link user_id to client:", updateError.message)
      } else {
        console.log("[v0] Successfully linked user_id to client record")
      }
    }

    return clientRecord
  }

  if (clientLookupError) {
    console.log("[v0] Client lookup by user_id/email error:", clientLookupError.message)
    console.log("[v0] Falling back to client lookup by email only")
  }

  const { data: emailClientRecord, error: emailLookupError } = await supabase
    .from("clients")
    .select("id, therapist_id, full_name, email")
    .ilike("email", normalizedEmail)
    .maybeSingle()

  if (emailLookupError) {
    console.log("[v0] Client lookup by email error:", emailLookupError.message)
    return null
  }

  console.log("[v0] Client id found:", emailClientRecord?.id ?? "none")
  return emailClientRecord as ClientRecord | null
}

/**
 * Checks the authenticated user's role by matching their auth email against the
 * therapists and clients tables (case-insensitive). This is the single source of
 * truth for determining if a user is a therapist or client.
 *
 * Known schema:
 *   therapists: id, email, full_name, subscription_status, subscription_plan
 *   clients:    id, therapist_id, full_name, email, status, created_at, invite_code, [user_id?]
 */
export async function checkUserRole(): Promise<UserRoleResult> {
  const supabase = getClient()

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    console.log("[v0] Auth session error:", sessionError.message)
    return {
      isAuthenticated: false,
      user: null,
      userId: null,
      userEmail: null,
      role: "unknown",
      therapistRecord: null,
      clientRecord: null,
      error: sessionError.message,
    }
  }

  if (!session) {
    console.log("[v0] No session found")
    return {
      isAuthenticated: false,
      user: null,
      userId: null,
      userEmail: null,
      role: "unknown",
      therapistRecord: null,
      clientRecord: null,
      error: null,
    }
  }

  const userId = session.user.id
  const userEmail = session.user.email || null
  const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : null

  console.log("[v0] ========== ACCOUNT TYPE DEBUG ==========")
  console.log("[v0] Authenticated user id:", userId)
  console.log("[v0] auth.user.email:", userEmail)
  console.log("[v0] Normalized email used for matching:", normalizedEmail)

  if (!normalizedEmail) {
    console.log("[v0] No email on auth user - cannot match account")
    console.log("[v0] ========================================")
    return {
      isAuthenticated: true,
      user: { id: userId, email: userEmail },
      userId,
      userEmail,
      role: "unknown",
      therapistRecord: null,
      clientRecord: null,
      error: "No email found on your account. Please contact support.",
    }
  }

  // 1. Check therapists by email (case-insensitive)
  const therapistRecord = await findTherapistByEmail(normalizedEmail)
  console.log("[v0] Therapist record found:", !!therapistRecord)

  if (therapistRecord) {
    console.log("[v0] Final redirect destination: /dashboard (therapist)")
    console.log("[v0] ========================================")
    return {
      isAuthenticated: true,
      user: { id: userId, email: userEmail },
      userId,
      userEmail,
      role: "therapist",
      therapistRecord,
      clientRecord: null,
      error: null,
    }
  }

  // 2. Check clients by user_id OR email (case-insensitive)
  const clientRecord = await findClientByEmailOrUserId(userId, normalizedEmail)
  console.log("[v0] Client record found:", !!clientRecord)

  if (clientRecord) {
    console.log("[v0] Final redirect destination: /client-portal (client)")
    console.log("[v0] ========================================")
    return {
      isAuthenticated: true,
      user: { id: userId, email: userEmail },
      userId,
      userEmail,
      role: "client",
      therapistRecord: null,
      clientRecord: publicClientRecord(clientRecord),
      error: null,
    }
  }

  // 4. No match in either table - report the exact email searched.
  console.log("[v0] No therapist record found: true")
  console.log("[v0] No client record found: true")
  console.log("[v0] No matching record found for email:", normalizedEmail)
  console.log("[v0] Final redirect destination: none (unknown role)")
  console.log("[v0] ========================================")
  return {
    isAuthenticated: true,
    user: { id: userId, email: userEmail },
    userId,
    userEmail,
    role: "unknown",
    therapistRecord: null,
    clientRecord: null,
    error: `No matching client record found for email: ${normalizedEmail}. Ask your therapist to invite you.`,
  }
}

/**
 * Resolves the therapist's database id for the currently authenticated user.
 *
 * IMPORTANT: therapists are matched by EMAIL, so therapists.id is NOT guaranteed
 * to equal auth.user.id. Always use the returned id to filter clients/assignments
 * by therapist_id.
 *
 * Returns null if the user is not authenticated or has no matching therapist row.
 */
export async function getTherapistId(): Promise<{
  therapistId: string | null
  userId: string | null
  userEmail: string | null
}> {
  const user = await getAuthenticatedUser()

  if (!user) {
    console.log("[v0] getTherapistId: no authenticated user")
    return { therapistId: null, userId: null, userEmail: null }
  }

  const userId = user.id
  const userEmail = user.email || null
  const normalizedEmail = normalizeEmail(userEmail)

  console.log("[v0] getTherapistId: auth.user.id:", userId)
  console.log("[v0] getTherapistId: auth.user.email:", userEmail)

  if (!normalizedEmail) {
    console.log("[v0] getTherapistId: no email on auth user")
    return { therapistId: null, userId, userEmail }
  }

  const therapistRecord = await findTherapistByEmail(normalizedEmail)

  console.log("[v0] getTherapistId: therapist.id found:", therapistRecord?.id ?? "none")
  return { therapistId: therapistRecord?.id ?? null, userId, userEmail }
}

export async function getClientRecord(): Promise<{
  clientRecord: UserRoleResult["clientRecord"]
  userId: string | null
  userEmail: string | null
}> {
  const user = await getAuthenticatedUser()

  if (!user) {
    console.log("[v0] getClientRecord: no authenticated user")
    return { clientRecord: null, userId: null, userEmail: null }
  }

  const normalizedEmail = normalizeEmail(user.email)
  console.log("[v0] getClientRecord: auth.user.email:", user.email)

  if (!normalizedEmail) {
    return { clientRecord: null, userId: user.id, userEmail: user.email }
  }

  const clientRecord = await findClientByEmailOrUserId(user.id, normalizedEmail)
  return {
    clientRecord: clientRecord ? publicClientRecord(clientRecord) : null,
    userId: user.id,
    userEmail: user.email,
  }
}
