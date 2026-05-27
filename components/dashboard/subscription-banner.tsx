"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getSubscriptionStatus } from "@/app/actions/stripe"
import { AlertTriangle, Clock, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SubscriptionData {
  status: string
  subscription: {
    plan: string | null
    endDate: string | null
    trialEndDate: string | null
    isInTrial: boolean
  } | null
}

export function SubscriptionBanner() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const data = await getSubscriptionStatus()
        setSubscriptionData(data)
      } catch (error) {
        console.error("Error fetching subscription:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscription()
  }, [])

  if (isLoading || !subscriptionData) {
    return null
  }

  const { status, subscription } = subscriptionData

  // Don't show banner for active subscriptions
  if (status === "active") {
    return null
  }

  // Trial banner
  if (subscription?.isInTrial && subscription.trialEndDate) {
    const daysLeft = Math.ceil(
      (new Date(subscription.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    if (daysLeft <= 0) {
      // Trial expired
      return (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Your free trial has expired</span>
            </div>
            <Button size="sm" className="rounded-xl" asChild>
              <Link href="/dashboard/billing">
                <CreditCard className="w-4 h-4 mr-1" />
                Choose a Plan
              </Link>
            </Button>
          </div>
        </div>
      )
    }

    if (daysLeft <= 3) {
      // Trial ending soon
      return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                {daysLeft === 1 ? "1 day" : `${daysLeft} days`} left in your free trial
              </span>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl border-amber-500/50 text-amber-600 hover:bg-amber-500/10" asChild>
              <Link href="/dashboard/billing">
                Upgrade Now
              </Link>
            </Button>
          </div>
        </div>
      )
    }

    // Normal trial (more than 3 days left) - don't show banner
    return null
  }

  // Inactive/canceled subscription
  if (status === "inactive" || status === "canceled") {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Your subscription is inactive</span>
          </div>
          <Button size="sm" className="rounded-xl" asChild>
            <Link href="/dashboard/billing">
              <CreditCard className="w-4 h-4 mr-1" />
              Reactivate
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Past due payment
  if (status === "past_due") {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Payment failed - please update your billing info</span>
          </div>
          <Button size="sm" variant="outline" className="rounded-xl border-amber-500/50 text-amber-600 hover:bg-amber-500/10" asChild>
            <Link href="/dashboard/billing">
              Update Payment
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return null
}
