import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Footer } from "@/components/landing/footer"
import { SessionStepsLogo } from "@/components/brand/sessionsteps-logo"

type PublicPolicyPageProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  lastUpdated?: string
}

export function PublicPolicyPage({ eyebrow, title, description, children, lastUpdated = "October 5, 2026" }: PublicPolicyPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Return to SessionSteps home">
            <SessionStepsLogo wordmarkClassName="text-lg" />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{description}</p>
        <p className="mt-4 text-sm text-muted-foreground">Last updated {lastUpdated}</p>
        <article className="mt-12 space-y-9 text-base leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ol]:space-y-2 [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:space-y-2">
          {children}
        </article>
      </main>

      <Footer />
    </div>
  )
}
