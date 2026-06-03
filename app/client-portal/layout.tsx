"use client"

import { useEffect, useState } from "react"
import { getClient } from "@/lib/supabase/client"
import { Loader2, Brain, LogOut, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { checkUserRole } from "@/lib/auth/check-user-role"

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
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your portal...</p>
      </div>
    )
  }

  // Error state - show message instead of redirect loop
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Unable to Access Portal</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">ShrinkAid</span>
            </div>
            <div className="flex items-center gap-4">
              {clientName && (
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {clientName}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
