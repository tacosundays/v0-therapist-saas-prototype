"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Brain, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { SessionTimeout } from "@/components/auth/session-timeout"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const isRedirecting = useRef(false)

  useEffect(() => {
    const supabase = getClient()

    // Get initial session once
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !isRedirecting.current) {
        isRedirecting.current = true
        window.location.href = "/login"
        return
      }
      setUser(session?.user ?? null)
      setIsCheckingSession(false)
    })

    // Listen for sign out events only (not for redirects)
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
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  // Get user display name from metadata or email
  const displayName = user?.user_metadata?.first_name 
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'User'

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SessionTimeout />
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/portal" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg text-foreground">ShrinkAid</span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">Client Portal</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl" 
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
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
