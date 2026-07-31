"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/dashboard/page-state"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Dashboard route error", error) }, [error])
  return <ErrorState retry={reset} />
}
