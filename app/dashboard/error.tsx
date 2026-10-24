"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/dashboard/page-state"
import { reportClientError } from "@/lib/client-error-monitoring"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError("dashboard", error) }, [error])
  return <ErrorState retry={reset} />
}
