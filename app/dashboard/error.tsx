"use client"

import { ErrorState } from "@/components/dashboard/page-state"

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState retry={reset} />
}
