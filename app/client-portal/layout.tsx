"use client"

import { useEffect, useState } from "react"
import { getClient } from "@/lib/supabase/client"
import { Loader2, Brain, LogOut, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { checkUserRole } from "@/lib/auth/check-user-role"
import { logClientAuditEvent } from "@/lib/audit-client"
import { SessionTimeout } from "@/components/auth/session-timeout"

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      console.log("[v0] Client portal layout: Starting auth check")
      
      const result = await checkUserRole()
      
      console.log("[v0] Client portal layout: Auth result:", {
        isAuthenticated: result.isAuthenticated,
        role: result.role,
        hasClientRecord: !!result.clientRecord
      })
      
      // Not authenticated - redirect to login
      if (!result.isAuthenticated) {
        console.log("[v0] Client portal layout: Not authenticated, redirecting to /login")
        window.location.href = "/login"
        return
      }
      
      // User is a therapist - redirect to dashboard
      if (result.role === "therapist") {
        console.log("[v0] Client portal layout: User is therapist, redirecting to /dashboard")
        window.location.href = "/dashboard"
        return
      }
      
      // User is a client - allow access
      if (result.role === "client" && result.clientRecord) {
        console.log("[v0] Client portal layout: User is client, allowing access")
        setClientName(result.clientRecord.full_name)
        setIsAuthorized(true)
        setIsChecking(false)
        return
      }
      
      // Unknown role - show error instead of redirecting
      console.log("[v0] Client portal layout: Unknown role, showing error")
      setError(result.error || "Unable to determine your account type. Please contact your therapist.")
      setIsChecking(false)
    }

    checkAuth()
  }, [])

  const handleSignOut = async () => {
    const supabase = getClient()
    await logClientAuditEvent({
      action: "logout",
      resourceType: "auth",
      details: {
        area: "client_portal",
      },
    })
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  // Loading state
  if (isChecking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#6D5EF5]/10 text-[#6D5EF5] shadow-[0_18px_44px_rgba(109,94,245,0.16)]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-500">Loading your portal...</p>
      </div>
    )
  }

  // Error state - show message instead of redirect loop
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-8">
        <div className="w-full max-w-md rounded-[28px] border border-rose-200/70 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50">
            <AlertCircle className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-950">Unable to Access Portal</h1>
          <p className="mb-6 text-sm leading-6 text-slate-500">{error}</p>
          <div className="space-y-3">
            <Button onClick={handleSignOut} className="h-11 w-full rounded-2xl bg-[#6D5EF5] hover:bg-[#5B4DEA]">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <SessionTimeout />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 shadow-[0_10px_36px_rgba(15,23,42,0.035)] backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6D5EF5] shadow-[0_14px_30px_rgba(109,94,245,0.24)]">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="block font-bold tracking-tight text-slate-950">ShrinkAid</span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Client Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {clientName && (
                <span className="hidden text-sm font-medium text-slate-500 sm:block">
                  {clientName}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-950">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  )
}
