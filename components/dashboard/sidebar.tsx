"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Inbox,
  CalendarDays,
  Users, 
  UserPlus,
  HeartHandshake,
  ClipboardCheck,
  BookOpen, 
  Sparkles, 
  BarChart3, 
  MessageSquare,
  Settings,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  ShieldCheck,
  FileCheck2,
  CircleHelp,
  Menu,
  X,
} from "lucide-react"
import { SessionStepsLogo, SessionStepsMark } from "@/components/brand/sessionsteps-logo"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { getClient } from "@/lib/supabase/client"
import { logClientAuditEvent } from "@/lib/audit-client"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { User } from "@supabase/supabase-js"
import { demoPractice, isDemoModeEnabled, useDemoMode } from "@/lib/demo-mode"

const navSections = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/dashboard/clients", label: "Clients", icon: Users },
      { href: "/dashboard/couples", label: "Couples", icon: HeartHandshake },
      { href: "/dashboard/library", label: "Content Library", icon: BookOpen },
    ],
  },
  {
    label: "Between Sessions",
    items: [
      { href: "/dashboard/clients", label: "Assignments", icon: ClipboardCheck, neverActive: true },
      { href: "/dashboard/reflections", label: "Check-ins", icon: MessageSquare },
      { href: "/dashboard/ai-suggestions", label: "AI", icon: Sparkles },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/dashboard/team", label: "Team", icon: UserPlus },
      { href: "/dashboard/organization", label: "Organization", icon: Building2 },
      { href: "/dashboard/insights", label: "Insights", icon: BarChart3 },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
      { href: "/dashboard/trust-center", label: "Trust Center", icon: FileCheck2 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/help", label: "Help & Getting Started", icon: CircleHelp },
    ],
  },
]

type TherapistProfile = {
  full_name: string | null
  email: string | null
  plan?: string | null
  subscription_plan?: string | null
  subscription_status?: string | null
}

function formatPlanLabel(plan: string | null) {
  if (!plan) return null

  const normalized = plan.toLowerCase()
  if (normalized.includes("solo")) return "Solo"
  if (normalized.includes("growing")) return "Growing"
  if (normalized.includes("group")) return "Group Practice"

  return plan
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null)
  const isRedirecting = useRef(false)
  const { isDemoMode, disableDemoMode } = useDemoMode()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previousOverflow }
  }, [mobileOpen])

  useEffect(() => {
    if (isDemoMode || isDemoModeEnabled()) {
      setUser(null)
      setTherapistProfile({
        full_name: demoPractice.therapist,
        email: demoPractice.therapistEmail,
        plan: "group-practice",
        subscription_plan: "group-practice",
        subscription_status: "demo",
      })
      return
    }

    const supabase = getClient()

    const loadTherapistProfile = async (sessionUser: User | null | undefined) => {
      if (!sessionUser?.email) {
        setTherapistProfile(null)
        return
      }

      const { data, error } = await (supabase as any)
        .from("therapists")
        .select("*")
        .ilike("email", sessionUser.email)
        .maybeSingle()

      if (error) {
        console.log("[v0] Sidebar: therapist profile lookup skipped", error.message)
        setTherapistProfile(null)
        return
      }

      setTherapistProfile(data || null)
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !isRedirecting.current) {
        isRedirecting.current = true
        window.location.href = "/login"
        return
      }
      setUser(session?.user ?? null)
      void loadTherapistProfile(session?.user)
    })

    // Listen for sign out events only
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && !isRedirecting.current) {
        isRedirecting.current = true
        window.location.href = "/login"
        return
      }
      // Only update user state, no redirects
      setUser(session?.user ?? null)
      void loadTherapistProfile(session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isDemoMode])

  const handleSignOut = async () => {
    if (isDemoMode) {
      disableDemoMode()
      window.location.href = "/"
      return
    }

    setIsSigningOut(true)
    const supabase = getClient()
    await logClientAuditEvent({
      action: "logout",
      resourceType: "auth",
      details: {
        area: "dashboard",
      },
    })
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  // Get user display name from metadata or email
  const displayName = therapistProfile?.full_name
    || (user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'User')
  const accountEmail = therapistProfile?.email || user?.email || ""
  const planValue = therapistProfile?.plan || therapistProfile?.subscription_plan || null
  const planLabel = formatPlanLabel(planValue)
  const roleValue = (therapistProfile as any)?.practice_role || (therapistProfile as any)?.role || user?.user_metadata?.practice_role || user?.user_metadata?.role
  const statusLabel = typeof roleValue === "string" && roleValue.toLowerCase() === "owner"
    ? "Owner"
    : "Therapist"
  
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        aria-controls="mobile-dashboard-navigation"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 text-slate-700 shadow-lg backdrop-blur md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-dashboard-navigation"
            aria-label="Mobile navigation"
            className="absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col border-r border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
              <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
                <span className="min-w-0">
                  <SessionStepsLogo />
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Therapist workspace</span>
                </span>
              </Link>
              <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-6">
                {navSections.map((section, sectionIndex) => (
                  <div key={section.label} className={cn("space-y-2", sectionIndex > 0 && "border-t border-slate-200/70 pt-5")}>
                    <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{section.label}</p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = "neverActive" in item && item.neverActive
                          ? false
                          : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                        return (
                          <Link
                            key={`${section.label}-${item.label}`}
                            href={item.href}
                            className={cn(
                              "flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-medium transition-colors",
                              isActive ? "bg-primary text-white shadow-[0_10px_24px_rgba(109,94,245,0.2)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                            )}
                          >
                            <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            <div className="border-t border-slate-200/70 p-4">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{initials}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-950">{displayName}</span><span className="block truncate text-xs text-slate-500">{accountEmail}</span></span>
              </div>
              <button type="button" onClick={handleSignOut} disabled={isSigningOut} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                {isSigningOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </aside>
        </div>
      )}

    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-slate-200/70 bg-white/95 shadow-[10px_0_36px_rgba(15,23,42,0.035)] backdrop-blur-xl transition-all duration-300 md:flex",
        collapsed ? "w-[76px]" : "w-[272px]"
      )}
    >
      {/* Logo */}
      <div className="border-b border-slate-200/70 px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          {collapsed && <SessionStepsMark className="h-10 w-10" />}
          {!collapsed && (
            <div>
              <SessionStepsLogo />
              <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                {isDemoMode ? "Demo Workspace" : "Homework"}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {navSections.map((section, sectionIndex) => (
            <div
              key={section.label}
              className={cn(
                "space-y-2.5",
                sectionIndex > 0 && "border-t border-slate-200/60 pt-6"
              )}
            >
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = "neverActive" in item && item.neverActive
                    ? false
                    : "exact" in item && item.exact
                    ? pathname === item.href
                    : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  const navLink = (
                    <Link
                      key={`${section.label}-${item.label}`}
                      href={item.href}
                      className={cn(
                        "group flex h-[42px] items-center gap-3 rounded-2xl px-3.5 text-sm transition-all duration-200 ease-out hover:translate-x-0.5",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-primary text-white shadow-[0_12px_28px_rgba(109,94,245,0.22)]"
                          : "text-[#64748B] hover:bg-slate-100/75 hover:text-slate-950"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                      {!collapsed && <span className="truncate font-medium">{item.label}</span>}
                    </Link>
                  )

                  if (!collapsed) return navLink

                  return (
                    <Tooltip key={`${section.label}-${item.label}`}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-primary"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* User Section */}
      <div className="border-t border-slate-200/70 p-4">
        {!collapsed && (
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Account
          </p>
        )}
        <div className={cn("rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm", collapsed && "border-0 bg-transparent p-0 shadow-none")}>
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
              <span className="text-sm font-bold text-primary">{initials}</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#18B7A0]" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
                <p className="truncate text-xs text-[#64748B]">{accountEmail}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {isDemoMode && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      Demo
                    </span>
                  )}
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {statusLabel}
                  </span>
                  {planLabel && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                      {planLabel}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="mt-4 flex h-10 w-full items-center justify-center rounded-2xl text-[#64748B] transition-all duration-200 hover:bg-slate-100/75 hover:text-slate-950"
              >
                {isSigningOut ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5 shrink-0" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={cn(
            "mt-4 flex h-10 w-full items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-3 text-sm font-medium text-[#64748B] transition-all duration-200 hover:bg-slate-100/75 hover:text-slate-950"
          )}
        >
          {isSigningOut ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span className="text-sm">{isSigningOut ? "Signing out..." : "Sign out"}</span>}
        </button>
        )}
      </div>
    </aside>
    </>
  )
}
