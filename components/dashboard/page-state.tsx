import Link from "next/link"
import { AlertTriangle, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({ title, description, actionLabel, actionHref }: { title: string; description: string; actionLabel?: string; actionHref?: string }) {
  return (
    <Card className="rounded-3xl border-dashed">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="rounded-2xl bg-primary/10 p-4 text-primary"><Inbox className="h-6 w-6" /></span>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        {actionLabel && actionHref && <Button asChild className="mt-5 rounded-xl"><Link href={actionHref}>{actionLabel}</Link></Button>}
      </CardContent>
    </Card>
  )
}

export function ErrorState({ title = "This page couldn’t load", description = "Your data is safe. Try again, or return to the dashboard.", retry }: { title?: string; description?: string; retry?: () => void }) {
  return (
    <Card className="mx-auto max-w-xl rounded-3xl">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="rounded-2xl bg-destructive/10 p-4 text-destructive"><AlertTriangle className="h-6 w-6" /></span>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-5 flex gap-3">
          {retry && <Button className="rounded-xl" onClick={retry}>Try again</Button>}
          <Button asChild variant="outline" className="rounded-xl"><Link href="/dashboard">Dashboard</Link></Button>
        </div>
      </CardContent>
    </Card>
  )
}
