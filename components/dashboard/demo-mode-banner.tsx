"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { demoPractice, useDemoMode } from "@/lib/demo-mode"

export function DemoModeBanner() {
  const { isDemoMode, disableDemoMode } = useDemoMode()

  if (!isDemoMode) return null

  return (
    <div className="border-b border-amber-200/70 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-amber-900">
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">DEMO</Badge>
          <span className="font-semibold">You are viewing a demonstration workspace.</span>
          <span className="text-amber-700">{demoPractice.name} · {demoPractice.therapist}</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
            onClick={() => {
              disableDemoMode()
              window.location.href = "/"
            }}
          >
            Exit Demo
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup" onClick={() => disableDemoMode()}>Create My Practice</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
