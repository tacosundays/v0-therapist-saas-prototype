"use client"

import { useEffect, useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner"
import { Loader2, AlertCircle } from "lucide-react"
import { checkUserRole } from "@/lib/auth/check-user-role"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getClient } from "@/lib/supabase/client"
import { SessionTimeout } from "@/components/auth/session-timeout"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      console.log("[v0] Dashboard layout: Starting auth check")
      
      const result = await checkUserRole()
      
      console.log("[v0] Dashboard layout: Auth result:", {
        isAuthenticated: result.isAuthenticated,
        role: result.role,
        hasTherapistRecord: !!result.therapistRecord,
        hasClientRecord: !!result.clientRecord
      })

      if (!result.isAuthenticated) {
        console.log("[v0] Dashboard layout: Not authenticated, redirecting to /login")
        window.location.href = "/login"
        return
      }

      if (result.role === "client") {
        console.log("[v0] Dashboard layout: User is client, redirecting to /client-portal")
        window.location.href = "/client-portal"
        return
      }

      if (result.role === "therapist" || result.therapistRecord) {
        console.log("[v0] Dashboard layout: User is therapist, authorizing")
        setIsAuthorized(true)
        setIsChecking(false)
        return
      }

      // Unknown role - show error
      console.log("[v0] Dashboard layout: Unknown role, showing error")
      setError("Unable to determine your account type. Please contact support.")
      setIsChecking(false)
    }

    checkAuth()
  }, [])

  const handleSignOut = async () => {
    const supabase = getClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking your account...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Account Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={handleSignOut} className="rounded-xl">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <SessionTimeout />
      <DashboardSidebar />
      <div className="pl-64 transition-all duration-300">
        <SubscriptionBanner />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
