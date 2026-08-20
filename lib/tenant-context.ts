type AdminClient = any

export interface TenantContext {
  organizationId: string
  therapistId: string
  role: "owner" | "admin" | "clinician"
}

/**
 * Resolves the authenticated clinician's immutable tenant boundary. Service-role
 * routes must call this before accessing tenant data and include organization_id
 * and therapist_id in subsequent queries.
 */
export async function resolveTenantContext(
  admin: AdminClient,
  user: { id: string; email?: string | null },
): Promise<TenantContext | null> {
  let therapistQuery = admin
    .from("therapists")
    .select("id, organization_id, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  let { data: therapist, error } = await therapistQuery

  // Transitional fallback for legacy rows that could not be safely backfilled.
  if (!therapist && !error && user.email) {
    const fallback = await admin
      .from("therapists")
      .select("id, organization_id, auth_user_id")
      .is("auth_user_id", null)
      .ilike("email", user.email.trim().toLowerCase())
      .maybeSingle()
    therapist = fallback.data
    error = fallback.error
  }

  if (error || !therapist?.id || !therapist.organization_id) return null

  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("organization_id, therapist_id, role, status")
    .eq("organization_id", therapist.organization_id)
    .eq("therapist_id", therapist.id)
    .eq("status", "active")
    .maybeSingle()

  if (membershipError || !membership) return null

  return {
    organizationId: membership.organization_id,
    therapistId: membership.therapist_id,
    role: membership.role,
  }
}
