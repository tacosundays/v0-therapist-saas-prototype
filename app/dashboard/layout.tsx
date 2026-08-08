"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { GlobalSearch } from "@/components/dashboard/global-search"
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner"
import { DemoModeBanner } from "@/components/dashboard/demo-mode-banner"
import { Loader2, AlertCircle } from "lucide-react"
import { checkUserRole } from "@/lib/auth/check-user-role"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getClient } from "@/lib/supabase/client"
import { SessionTimeout } from "@/components/auth/session-timeout"
import { enableDemoMode, isDemoModeEnabled, useDemoMode } from "@/lib/demo-mode"
import { shouldShowOnboarding, type OnboardingRecord } from "@/lib/onboarding"
import { AnalyticsTracker } from "@/components/dashboard/analytics-tracker"

const AiCopilot = dynamic(() => import("@/components/dashboard/ai-copilot").then((module) => module.AiCopilot), {
  ssr: false,
})
const FeedbackDialog = dynamic(() => import("@/components/dashboard/feedback-dialog").then((module) => module.FeedbackDialog), {
  ssr: false,
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isDemoMode } = useDemoMode()

  useEffect(() => {
    const checkAuth = async () => {
      const params = new URLSearchParams(window.location.search)
      if (params.get("demo") === "1") {
        enableDemoMode()
        window.history.replaceState({}, "", window.location.pathname)
        setIsAuthorized(true)
        setIsChecking(false)
        return
      }

      if (isDemoModeEnabled()) {
        setIsAuthorized(true)
        setIsChecking(false)
        return
      }

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
        const isOnboardingExcursion = params.get("onboarding") === "1"
        if (!isOnboardingExcursion && result.therapistRecord?.id) {
          const supabase = getClient() as any
          const { data: onboarding, error: onboardingError } = await supabase
            .from("therapists")
            .select("onboarding_status, onboarding_step, onboarding_completed_at, onboarding_skipped_at")
            .eq("id", result.therapistRecord.id)
            .maybeSingle()

          // Missing columns mean the migration has not been applied yet. Keep the
          // dashboard usable, but route new accounts once persisted state exists.
          if (!onboardingError && shouldShowOnboarding(onboarding as OnboardingRecord | null)) {
            window.location.href = "/onboarding"
            return
          }
        }
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(109,94,245,0.10),transparent_34rem),linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)]">
      {!isDemoMode && <SessionTimeout />}
      <AnalyticsTracker />
      <DashboardSidebar />
      <AiCopilot />
      {!isDemoMode && <FeedbackDialog />}
      <div className="min-w-0 pl-0 transition-all duration-300 md:pl-64">
        {isDemoMode ? <DemoModeBanner /> : <SubscriptionBanner />}
        <div className="mx-auto w-full max-w-[1500px] px-4 pb-1 pt-4 sm:px-6 md:px-8 md:pt-6 xl:px-10">
          <div className="pl-14 md:pl-0">
            <GlobalSearch />
          </div>
        </div>
        <main className="mx-auto w-full min-w-0 max-w-[1500px] p-4 pt-4 sm:p-6 sm:pt-5 md:p-8 md:pt-6 xl:p-10 xl:pt-6">
          {children}
        </main>
      </div>
    </div>
  )
}
