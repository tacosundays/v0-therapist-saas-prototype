import { getClient } from "@/lib/supabase/client"

export type UserRole = "therapist" | "client" | "unknown"

export interface UserRoleResult {
  isAuthenticated: boolean
  user: { id: string; email: string | null } | null
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
      user: { id: userId, email: userEmail },
      userId,
      userEmail,
      role: "therapist",
      therapistRecord,
      clientRecord: null,
      error: null,
    }
  }
  
  // Check if user is a client
  // Strategy: 
  // 1. First check by user_id (for clients who have logged in before)
  // 2. Then check by email (for clients created by therapist before first login)
  // 3. If found by email, link the auth user_id to the client record
  let clientRecord = null
  
  // Try lookup by user_id first (for clients who have logged in before)
  const { data: clientByUserId, error: clientByUserIdError } = await supabase
    .from("clients")
    .select("id, therapist_id, full_name, email, user_id")
    .eq("user_id", userId)
    .maybeSingle()
  
  if (clientByUserIdError) {
    console.log("[v0] Client lookup by user_id error:", clientByUserIdError.message)
  } else {
    console.log("[v0] Client record found by user_id:", !!clientByUserId)
  }
  
  if (clientByUserId) {
    clientRecord = clientByUserId
  } else if (userEmail) {
    // Try lookup by email (for clients created by therapist before first login)
    // This finds clients who haven't linked their auth account yet
    const normalizedEmail = userEmail.toLowerCase().trim()
    console.log("[v0] Looking up client by email:", normalizedEmail)
    
    const { data: clientByEmail, error: clientByEmailError } = await supabase
      .from("clients")
      .select("id, therapist_id, full_name, email, user_id")
      .ilike("email", normalizedEmail)
      .is("user_id", null)
      .maybeSingle()
    
    if (clientByEmailError) {
      console.log("[v0] Client lookup by email error:", clientByEmailError.message)
    } else {
      console.log("[v0] Client record found by email:", !!clientByEmail)
    }
    
    if (clientByEmail) {
      // Link the auth user to this client record (first login)
      console.log("[v0] Linking auth user to client record (first login)")
      const { error: updateError } = await supabase
        .from("clients")
        .update({ user_id: userId })
        .eq("id", clientByEmail.id)
      
      if (updateError) {
        console.log("[v0] Failed to link user_id to client:", updateError.message)
        // Still allow access even if link fails
      } else {
        console.log("[v0] Successfully linked user_id to client record")
      }
      
      clientRecord = clientByEmail
    }
  }
  
  if (clientRecord) {
    console.log("[v0] Final redirect destination: /client-portal (client)")
    return {
      isAuthenticated: true,
      user: { id: userId, email: userEmail },
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
      user: { id: userId, email: userEmail },
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
    user: { id: userId, email: userEmail },
    userId,
    userEmail,
    role: "unknown",
    therapistRecord: null,
    clientRecord: null,
    error: "No client portal found for this email. Ask your therapist to invite you.",
  }
}
