"use client"

import Link from "next/link"
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function SessionPrepError({ reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Button variant="ghost" className="rounded-xl" asChild>
        <Link href="/dashboard/clients">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to clients
        </Link>
      </Button>
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <div className="rounded-full bg-amber-500/10 p-3 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Session prep couldn’t load</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your client data is safe. Try loading the page again, or return to Clients and choose the client again.
            </p>
          </div>
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
