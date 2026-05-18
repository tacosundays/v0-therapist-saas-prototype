"use client"

import Link from "next/link"
import { Brain, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
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
                <p className="text-sm font-medium text-foreground">Sarah Mitchell</p>
                <p className="text-xs text-muted-foreground">Client Portal</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl" asChild>
                <Link href="/">
                  <LogOut className="w-5 h-5" />
                </Link>
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
