import Link from "next/link"
import { SessionStepsLogo } from "@/components/brand/sessionsteps-logo"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contact"

export function Footer() {
  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="mb-4 inline-flex" aria-label="SessionSteps home">
              <SessionStepsLogo wordmarkClassName="text-lg" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Helping therapists assign homework, collect reflections, and review client progress between sessions.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View demo
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">For users</h4>
            <ul className="space-y-2">
              <li><Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Start free trial</Link></li>
              <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Therapist login</Link></li>
              <li><Link href="/client-portal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Client Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link href="/dashboard/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Help &amp; Getting Started</Link></li>
              <li><a href={SUPPORT_EMAIL_HREF} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Support</a></li>
              <li><a href={SUPPORT_EMAIL_HREF} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{SUPPORT_EMAIL}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Trust</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Security &amp; Trust Center
                </Link>
              </li>
              <li>
                <Link href="/subprocessors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Subprocessors
                </Link>
              </li>
              <li>
                <Link href="/data-retention" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Data retention
                </Link>
              </li>
              <li>
                <Link href="/ai-and-emergency-use" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  AI &amp; emergency use
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/baa" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Business Associate Agreement</Link></li>
              <li><Link href="/acceptable-use" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Acceptable Use</Link></li>
              <li><Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookie Notice</Link></li>
              <li><Link href="/accessibility" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Accessibility</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} SessionSteps LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
