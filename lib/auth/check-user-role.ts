import { getClient } from "@/lib/supabase/client"

export type UserRole = "therapist" | "client" | "unknown"

export interface UserRoleResult {
  isAuthenticated: boolean
  userId: string | null
  userEmail: string | null
  role: UserRole
  therapistRecord: { id: string } | null
  clientRecord: { id: string; therapist_id: string; full_name: string; email: string | null } | null
  error: string | null
}

/**
 * Checks the authenticated user's role by looking up their records in the database.
 * This is the single source of truth for determining if a user is a therapist or client.
 */
export async function checkUserRole(): Promise<UserRoleResult> {
  const supabase = getClient()
  
  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError) {
    console.log("[v0] Auth session error:", sessionError.message)
    return {
      isAuthenticated: false,
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
  
  console.log("[v0] Authenticated user id:", userId)
  console.log("[v0] User email:", userEmail)
  
  // First check user_metadata for role hint
  const metadataRole = session.user.user_metadata?.role
  console.log("[v0] Metadata role:", metadataRole)
  
  // Check if user is a therapist (therapist_id = auth.uid())
  const { data: therapistRecord, error: therapistError } = await supabase
    .from("therapists")
    .select("id")
    .eq("id", userId)
    .maybeSingle()
  
  if (therapistError) {
    console.log("[v0] Therapist lookup error:", therapistError.message)
  } else {
    console.log("[v0] Therapist record found:", !!therapistRecord)
  }
  
  if (therapistRecord) {
    console.log("[v0] Final redirect destination: /dashboard (therapist)")
    return {
      isAuthenticated: true,
      userId,
      userEmail,
      role: "therapist",
      therapistRecord,
      clientRecord: null,
      error: null,
    }
  }
  
  // Check if user is a client - first by id, then by email
  // Client id may equal auth.uid() if they signed up, or may be different if created by therapist
  let clientRecord = null
  
  // Try lookup by id first (for clients who signed up themselves)
  const { data: clientById, error: clientByIdError } = await supabase
    .from("clients")
    .select("id, therapist_id, full_name, email")
    .eq("id", userId)
    .maybeSingle()
  
  if (clientByIdError) {
    console.log("[v0] Client lookup by id error:", clientByIdError.message)
  } else {
    console.log("[v0] Client record found by id:", !!clientById)
  }
  
  if (clientById) {
    clientRecord = clientById
  } else if (userEmail) {
    // Try lookup by email (for clients created by therapist before signup)
    const { data: clientByEmail, error: clientByEmailError } = await supabase
      .from("clients")
      .select("id, therapist_id, full_name, email")
      .eq("email", userEmail.toLowerCase())
      .maybeSingle()
    
    if (clientByEmailError) {
      console.log("[v0] Client lookup by email error:", clientByEmailError.message)
    } else {
      console.log("[v0] Client record found by email:", !!clientByEmail)
    }
    
    if (clientByEmail) {
      clientRecord = clientByEmail
    }
  }
  
  if (clientRecord) {
    console.log("[v0] Final redirect destination: /client-portal (client)")
    return {
      isAuthenticated: true,
      userId,
      userEmail,
      role: "client",
      therapistRecord: null,
      clientRecord,
      error: null,
    }
  }
  
  // No record found - check metadata role as fallback for new signups
  if (metadataRole === "therapist") {
    console.log("[v0] No therapist record but metadata says therapist - allowing access")
    console.log("[v0] Final redirect destination: /dashboard (new therapist)")
    return {
      isAuthenticated: true,
      userId,
      userEmail,
      role: "therapist",
      therapistRecord: null,
      clientRecord: null,
      error: null,
    }
  }
  
  console.log("[v0] No therapist or client record found")
  console.log("[v0] Final redirect destination: none (unknown role)")
  return {
    isAuthenticated: true,
    userId,
    userEmail,
    role: "unknown",
    therapistRecord: null,
    clientRecord: null,
    error: "No therapist or client record found for this account.",
  }
}
