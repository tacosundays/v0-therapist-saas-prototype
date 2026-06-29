"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Brain, 
  LayoutDashboard, 
  Users, 
  UserPlus,
  HeartHandshake,
  BookOpen, 
  Sparkles, 
  BarChart3, 
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { getClient } from "@/lib/supabase/client"
import { logClientAuditEvent } from "@/lib/audit-client"
import type { User } from "@supabase/supabase-js"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/team", label: "Team", icon: UserPlus },
  { href: "/dashboard/couples", label: "Couples", icon: HeartHandshake },
  { href: "/dashboard/reflections", label: "Reflections", icon: MessageSquare },
  { href: "/dashboard/library", label: "Content Library", icon: BookOpen },
  { href: "/dashboard/ai-suggestions", label: "AI Suggestions", icon: Sparkles },
  { href: "/dashboard/insights", label: "Insights", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const isRedirecting = useRef(false)

  useEffect(() => {
    const supabase = getClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !isRedirecting.current) {
        isRedirecting.current = true
        window.location.href = "/login"
        return
      }
      setUser(session?.user ?? null)
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
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
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
  const displayName = user?.user_metadata?.first_name 
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'User'
  
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-slate-200/80 bg-white/90 shadow-[12px_0_40px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="border-b border-slate-200/80 p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-[0_12px_28px_rgba(109,94,245,0.30)]">
            <Brain className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="block text-lg font-bold tracking-tight text-slate-950">ShrinkAid</span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Homework</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all",
                isActive
                  ? "bg-primary text-white shadow-[0_12px_28px_rgba(109,94,245,0.25)]"
                  : "text-slate-500 hover:bg-slate-100/90 hover:text-slate-950"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
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
      <div className="border-t border-slate-200/80 p-4">
        <div className={cn("flex items-center gap-3 rounded-2xl bg-slate-50 p-2", collapsed && "justify-center bg-transparent p-0")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email || ''}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={cn(
            "mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-950",
            collapsed && "justify-center px-0"
          )}
        >
          {isSigningOut ? (
            <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5 shrink-0" />
          )}
          {!collapsed && <span className="text-sm">{isSigningOut ? "Signing out..." : "Sign out"}</span>}
        </button>
      </div>
    </aside>
  )
}
