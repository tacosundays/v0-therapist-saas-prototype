"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { dailyEventKey } from "@/lib/analytics/events"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { useDemoMode } from "@/lib/demo-mode"

export function AnalyticsTracker() {
  const pathname = usePathname()
  const { isDemoMode } = useDemoMode()

  useEffect(() => {
    if (isDemoMode) return
    const dateKey = dailyEventKey()
    void trackAnalyticsEvent({
      name: "daily_active_therapist_session",
      eventKey: dateKey,
      properties: { source: "dashboard" },
    })
    if (pathname === "/dashboard") {
      void trackAnalyticsEvent({ name: "dashboard_opened", properties: { source: "dashboard" } })
    }
  }, [isDemoMode, pathname])

  return null
}
