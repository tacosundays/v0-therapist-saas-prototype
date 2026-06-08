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
  console.log("[v0] Searching therapists table by email:", normalizedEmail)
  const { data: therapistRecord, error: therapistError } = await supabase
    .from("therapists")
    .select("id, email")
    .ilike("email", normalizedEmail)
    .maybeSingle()

  if (therapistError) {
    console.log("[v0] Therapist lookup error:", therapistError.message)
  }
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

  // 2. Check clients by email (case-insensitive)
  // Select "*" so the query works whether or not the user_id column exists.
  console.log("[v0] Searching clients table by email:", normalizedEmail)
  const { data: clientRecord, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle()

  if (clientError) {
    console.log("[v0] Client lookup by email error:", clientError.message)
  }
  console.log("[v0] Client record found:", !!clientRecord)

  if (clientRecord) {
    // 3. If the user_id column exists and is currently null, link it to this auth user.
    const hasUserIdColumn = Object.prototype.hasOwnProperty.call(clientRecord, "user_id")
    console.log("[v0] clients.user_id column present:", hasUserIdColumn)

    if (hasUserIdColumn && !clientRecord.user_id) {
      console.log("[v0] Linking auth user id into clients.user_id (first login)")
      const { error: updateError } = await supabase
        .from("clients")
        .update({ user_id: userId })
        .eq("id", clientRecord.id)

      if (updateError) {
        console.log("[v0] Failed to link user_id to client:", updateError.message)
      } else {
        console.log("[v0] Successfully linked user_id to client record")
      }
    }

    console.log("[v0] Final redirect destination: /client-portal (client)")
    console.log("[v0] ========================================")
    return {
      isAuthenticated: true,
      user: { id: userId, email: userEmail },
      userId,
      userEmail,
      role: "client",
      therapistRecord: null,
      clientRecord: {
        id: clientRecord.id,
        therapist_id: clientRecord.therapist_id,
        full_name: clientRecord.full_name,
        email: clientRecord.email,
      },
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
