import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { AppRole, getRouteAccessDecision, RedirectDestination } from "./route-access.ts"
import { hasAal2 } from "../security/aal.ts"

async function resolveRole(userId: string, email: string | null | undefined): Promise<AppRole> {
  const normalizedEmail = email?.trim().toLowerCase()
  if (!normalizedEmail) return "unknown"

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return "unknown"

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const [{ data: therapist }, { data: clients }] = await Promise.all([
    adminClient
      .from("therapists")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle(),
    adminClient
      .from("clients")
      .select("id")
      .or(`user_id.eq.${userId},email.ilike.${normalizedEmail}`)
      .limit(1),
  ])

  if (therapist) return "therapist"
  if (Array.isArray(clients) && clients.length > 0) return "client"
  return "unknown"
}

function redirectTo(request: NextRequest, destination: RedirectDestination) {
  const url = request.nextUrl.clone()
  url.pathname = destination
  url.search = ""
  return NextResponse.redirect(url)
}

function redirectExpiredSessionToLogin(request: NextRequest) {
  const response = redirectTo(request, "/login")

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")) {
      response.cookies.delete(cookie.name)
    }
  }

  return response
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  let user = null
  let isAal2 = false
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
    if (user) {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      isAal2 = assurance.data?.currentLevel === "aal2"
    }
  } catch {
    return redirectExpiredSessionToLogin(request)
  }
  const role = user ? await resolveRole(user.id, user.email) : null
  const aal1AllowedApiPaths = new Set([
    "/api/mfa/recovery-codes",
    "/api/client-invitations/accept",
    "/api/team/invites/accept",
    "/api/webhooks/stripe",
  ])
  const bearerToken = request.headers.get("authorization")?.startsWith("Bearer ")
    ? request.headers.get("authorization")!.slice(7)
    : null
  const sensitiveApiRequest = request.nextUrl.pathname.startsWith("/api/") && !aal1AllowedApiPaths.has(request.nextUrl.pathname)
  if (sensitiveApiRequest && ((bearerToken && !hasAal2(bearerToken)) || (role === "therapist" && !isAal2))) {
    return NextResponse.json({ error: "Multi-factor authentication is required" }, { status: 403 })
  }
  const decision = getRouteAccessDecision(request.nextUrl.pathname, role, Boolean(user), isAal2)

  if (decision.action === "redirect") return redirectTo(request, decision.destination)
  return response
}
