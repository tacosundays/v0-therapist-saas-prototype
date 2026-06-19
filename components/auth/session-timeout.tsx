"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export const IDLE_WARNING_MINUTES = 28
export const IDLE_LOGOUT_MINUTES = 30

const minute = 60 * 1000
const warningMs = IDLE_WARNING_MINUTES * minute
const logoutMs = IDLE_LOGOUT_MINUTES * minute
const activityEvents = ["mousemove", "click", "keydown", "touchstart"] as const

export function SessionTimeout() {
  const [isWarningOpen, setIsWarningOpen] = useState(false)
  const lastActivityAt = useRef(Date.now())
  const isSigningOut = useRef(false)

  const signOut = useCallback(async () => {
    if (isSigningOut.current) return
    isSigningOut.current = true
    setIsWarningOpen(false)

    const supabase = getClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }, [])

  const resetTimer = useCallback(() => {
    if (isSigningOut.current) return
    lastActivityAt.current = Date.now()
    setIsWarningOpen(false)
  }, [])

  useEffect(() => {
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true })
    })

    const timer = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityAt.current

      if (idleFor >= logoutMs) {
        void signOut()
        return
      }

      if (idleFor >= warningMs) {
        setIsWarningOpen(true)
      }
    }, 1000)

    return () => {
      window.clearInterval(timer)
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer)
      })
    }
  }, [resetTimer, signOut])

  return (
    <AlertDialog open={isWarningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session expiring soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in 2 minutes due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
          <Button onClick={resetTimer}>
            Stay Signed In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
