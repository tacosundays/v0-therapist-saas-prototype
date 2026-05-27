"use client"

import { useEffect, useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = "/login"
        return
      }

      // Check user role from metadata
      const userRole = user.user_metadata?.role
      if (userRole === "client") {
        // Clients should not access the dashboard
        window.location.href = "/client-portal"
        return
      }

      // Verify user exists in therapists table
      const { data: therapist, error: therapistError } = await supabase
        .from("therapists")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      if (therapistError || !therapist) {
        // User is not a valid therapist, check if they're a client
        const { data: client } = await supabase
          .from("clients")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle()

        if (client) {
          window.location.href = "/client-portal"
          return
        }

        // Unknown user type, redirect to login
        window.location.href = "/login"
        return
      }

      setIsAuthorized(true)
      setIsChecking(false)
    }

    checkAuth()
  }, [])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
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
