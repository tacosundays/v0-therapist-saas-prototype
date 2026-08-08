"use client"

import { getClient } from "@/lib/supabase/client"
import type { AnalyticsEventInput } from "@/lib/analytics/events"

const sessionStorageKey = "shrinkaid.analytics.session"

function getAnonymousSessionId() {
  if (typeof window === "undefined") return null
  const existing = window.sessionStorage.getItem(sessionStorageKey)
  if (existing) return existing
  const next = crypto.randomUUID()
  window.sessionStorage.setItem(sessionStorageKey, next)
  return next
}

export async function trackAnalyticsEvent(event: AnalyticsEventInput) {
  try {
    const supabase = getClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return false

    const response = await fetch("/api/analytics/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...event,
        sessionId: getAnonymousSessionId(),
      }),
      keepalive: true,
    })

    return response.ok
  } catch {
    // Analytics must never interrupt the clinical workflow.
    return false
  }
}
