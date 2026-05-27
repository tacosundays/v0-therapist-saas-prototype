"use client"

import { useEffect, useState, useRef } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner"
import { getClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const isRedirecting = useRef(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (isRedirecting.current) return
      
      const supabase = getClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        if (!isRedirecting.current) {
          isRedirecting.current = true
          window.location.href = "/login"
        }
        return
      }

      const user = session.user

      // Check user role from metadata
      const userRole = user.user_metadata?.role
      if (userRole === "client") {
        // Clients should not access the dashboard
        if (!isRedirecting.current) {
          isRedirecting.current = true
          window.location.href = "/portal"
        }
        return
      }

      // For therapists, check if they exist in the therapists table
      // If not found, they might be a new signup - allow access anyway
      // The therapist record may not exist yet due to race condition
      const { data: therapist } = await supabase
        .from("therapists")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      if (!therapist) {
        // Check if user is actually a client
        const { data: client } = await supabase
          .from("clients")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()

        if (client) {
          if (!isRedirecting.current) {
            isRedirecting.current = true
            window.location.href = "/portal"
          }
          return
        }

        // If role is therapist but no record exists yet, allow access
        // This handles the race condition after signup
        if (userRole === "therapist") {
          setIsAuthorized(true)
          setIsChecking(false)
          return
        }

        // Unknown user type, redirect to login
        if (!isRedirecting.current) {
          isRedirecting.current = true
          window.location.href = "/login"
        }
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
