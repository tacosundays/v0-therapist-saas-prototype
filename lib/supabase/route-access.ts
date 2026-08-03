export type AppRole = "therapist" | "client" | "unknown"

export type RedirectDestination = "/login" | "/dashboard" | "/dashboard/security" | "/client-portal"

export type RouteAccessDecision =
  | { action: "allow" }
  | { action: "redirect"; destination: RedirectDestination }

const publicPathPrefixes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/pricing",
  "/auth/callback",
  "/api",
]

function isPublicPath(pathname: string) {
  return publicPathPrefixes.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))
}

export function getRouteAccessDecision(pathname: string, role: AppRole | null, isAuthenticated: boolean, isAal2 = false): RouteAccessDecision {
  if (isPublicPath(pathname)) return { action: "allow" }

  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) return { action: "redirect", destination: "/login" }
    if (role === "client") return { action: "redirect", destination: "/client-portal" }
    if (role === "therapist" && !isAal2 && pathname !== "/dashboard/security") {
      return { action: "redirect", destination: "/dashboard/security" }
    }
    if (role === "therapist") return { action: "allow" }
    return { action: "redirect", destination: "/login" }
  }

  if (pathname.startsWith("/client-portal") || pathname.startsWith("/portal")) {
    if (!isAuthenticated) return { action: "redirect", destination: "/login" }
    if (role === "therapist") return { action: "redirect", destination: "/dashboard" }
    if (role === "client") return { action: "allow" }
    return { action: "redirect", destination: "/login" }
  }

  return { action: "allow" }
}
