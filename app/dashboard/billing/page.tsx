"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Check, 
  Loader2, 
  CreditCard,
  Calendar,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Users,
  ChevronDown,
  ChevronUp,
  LifeBuoy
} from "lucide-react"
import { PRODUCTS, type Product } from "@/lib/products"
import { getCheckoutAvailability, getSubscriptionStatus, createCustomerPortalSession, startSubscriptionCheckout, verifyAndActivateSubscription } from "@/app/actions/stripe"
import { getClient } from "@/lib/supabase/client"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClientLimitDisplay, getPlanLimits } from "@/lib/plan-limits"

interface SubscriptionData {
  status: string
  subscription: {
    plan: string | null
    endDate: string | null
    trialEndDate: string | null
    isInTrial: boolean
  } | null
}

interface UserData {
  id: string
  email: string
  fullName?: string
  practiceName?: string
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isPortalLoading, setIsPortalLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [clientCount, setClientCount] = useState<number>(0)
  const [checkoutAvailability, setCheckoutAvailability] = useState<Record<string, boolean>>({})
  const [showAllPlans, setShowAllPlans] = useState(false)
  const [showChangePlans, setShowChangePlans] = useState(false)
  const hasVerified = useRef(false)

  // Get current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.id && user?.email) {
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] Billing: auth email:", userEmail)
        console.log("[v0] Billing: therapist id found:", therapistId ?? "none")

        setUserData({ 
          id: therapistId || user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || undefined,
          practiceName: user.user_metadata?.practice_name || undefined
        })

        // Fetch client count
        if (therapistId) {
          const { count } = await supabase
            .from("clients")
            .select("*", { count: "exact", head: true })
            .eq("therapist_id", therapistId)
        
          console.log("[v0] Billing: clients count:", count || 0)
          setClientCount(count || 0)
        }
      }

      const availability = await getCheckoutAvailability()
      setCheckoutAvailability(availability)
    }
    fetchUser()
  }, [])

  // Verify subscription after returning from Stripe checkout
  useEffect(() => {
    const verifyCheckout = async () => {
      const success = searchParams.get('success')
      const sessionId = searchParams.get('session_id')
      
      console.log('[v0] Billing: Checking checkout params', { success, sessionId, hasUserData: !!userData })
      
      if (success === 'true' && sessionId && userData && !hasVerified.current) {
        hasVerified.current = true
        
        console.log('[v0] Billing: Verifying subscription with session', sessionId)
        const result = await verifyAndActivateSubscription(sessionId, userData)
        console.log('[v0] Billing: Verification result', result)
        
        if (result.success) {
          setSuccessMessage("Your subscription has been activated successfully!")
        } else {
          // Show the actual error for debugging
          console.error('[v0] Billing: Verification failed', result.error)
          setSuccessMessage(`Payment received! ${result.error || 'Processing subscription...'}`)
        }
        
        // Refresh subscription data regardless of result
        const data = await getSubscriptionStatus(userData)
        console.log('[v0] Billing: Subscription status after verify', data)
        setSubscriptionData(data)
        setIsLoading(false)
        
        // Clear URL params after processing
        window.history.replaceState({}, '', '/dashboard/billing')
      }
    }
    
    if (userData) {
      verifyCheckout()
    }
  }, [searchParams, userData])

  const fetchSubscription = useCallback(async () => {
    if (!userData) return
    
    // Skip if we just verified from checkout (already fetched)
    if (hasVerified.current) return
    
    try {
      const data = await getSubscriptionStatus(userData)
      setSubscriptionData(data)
    } catch (error) {
      console.error("Error fetching subscription:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userData])

  useEffect(() => {
    if (userData) {
      fetchSubscription()
    }
  }, [userData, fetchSubscription])

  const handleSelectPlan = async (planId: string) => {
    if (!userData) {
      setCheckoutError("You must be logged in to subscribe")
      return
    }
    
    setCheckoutLoading(planId)
    setCheckoutError(null)
    
    try {
      const result = await startSubscriptionCheckout(planId, userData)
      
      if (result.error) {
        setCheckoutError(result.error)
        setCheckoutLoading(null)
        return
      }
      
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      console.error("Checkout error:", error)
      setCheckoutError(error instanceof Error ? error.message : "Failed to start checkout")
      setCheckoutLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!userData) return
    
    setIsPortalLoading(true)
    try {
      const url = await createCustomerPortalSession(userData)
      window.location.href = url
    } catch (error) {
      console.error("Error creating portal session:", error)
    } finally {
      setIsPortalLoading(false)
    }
  }

  const isActive = subscriptionData?.status === "active"
  const isTrialing = subscriptionData?.status === "trialing" || subscriptionData?.subscription?.isInTrial
  const currentPlan = subscriptionData?.subscription?.plan
  const currentPlanName = currentPlan ? PRODUCTS.find(p => p.id === currentPlan)?.name : null
  const hasSubscription = isActive || (isTrialing && currentPlan)
  const planLimits = getPlanLimits(currentPlan)
  const clientLimitDisplay = getClientLimitDisplay(currentPlan)
  const recommendedPlan = PRODUCTS.find((product) => product.isPopular) || PRODUCTS[0]
  const therapistSeatLimit = planLimits.therapistLimit === null ? "Unlimited" : planLimits.therapistLimit.toString()
  const therapistSeatsUsed = currentPlan === "group-practice" ? 1 : 1
  const periodEndLabel = subscriptionData?.subscription?.endDate
    ? new Date(subscriptionData.subscription.endDate).toLocaleDateString()
    : null
  const trialEndLabel = subscriptionData?.subscription?.trialEndDate
    ? new Date(subscriptionData.subscription.trialEndDate).toLocaleDateString()
    : null

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="saas-page-header">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-8 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="saas-page-header">
        <p className="saas-eyebrow mb-2">Subscription</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Billing</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your plan, usage, and Stripe billing portal.</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-primary">Success</p>
            <p className="text-sm text-primary/80">{successMessage}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto"
            onClick={() => setSuccessMessage(null)}
          >
            Dismiss
          </Button>
        </motion.div>
      )}

      {/* Checkout Error Alert */}
      {checkoutError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Checkout Error</p>
            <p className="text-sm text-destructive/80">{checkoutError}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto"
            onClick={() => setCheckoutError(null)}
          >
            Dismiss
          </Button>
        </motion.div>
      )}

      {hasSubscription ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <Card className="rounded-2xl border-slate-200/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-950">
                    {currentPlanName || "Current Plan"}
                  </span>
                  {isActive && <Badge className="rounded-full bg-primary/10 text-primary">Active</Badge>}
                  {isTrialing && <Badge variant="secondary" className="rounded-full">Trial</Badge>}
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Subscription status</p>
                    <p className="mt-1 font-semibold capitalize text-slate-950">{subscriptionData?.status || "Active"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {isTrialing ? "Trial ends" : "Renews"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 font-semibold text-slate-950">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {isTrialing ? trialEndLabel || "Not available" : periodEndLabel || "Not available"}
                    </p>
                  </div>
                </div>
                {isTrialing && (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                    Trial is active{trialEndLabel ? ` until ${trialEndLabel}` : ""}.
                  </p>
                )}
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-primary" />
                  Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <UsageMeter label="Clients" used={clientCount} limitLabel={clientLimitDisplay} limit={planLimits.clientLimit} />
                <UsageMeter label="Therapist seats" used={therapistSeatsUsed} limitLabel={therapistSeatLimit} limit={planLimits.therapistLimit} />
                {planLimits.clientLimit !== null && clientCount >= planLimits.clientLimit * 0.8 && (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                    {clientCount >= planLimits.clientLimit
                      ? "You've reached your client limit. Change plans for more capacity."
                      : "You're approaching your client limit."
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl border-slate-200/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Plan Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-xl"
                  onClick={() => setShowChangePlans((value) => !value)}
                >
                  Change Plan
                  {showChangePlans ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showChangePlans && (
                  <div className="space-y-2 rounded-xl border border-slate-200/80 p-3">
                    {PRODUCTS.map((product) => (
                      <CompactPlanAction
                        key={product.id}
                        product={product}
                        isCurrentPlan={currentPlan === product.id}
                        isLoading={checkoutLoading === product.id}
                        canCheckout={checkoutAvailability[product.id] ?? false}
                        onSelect={() => handleSelectPlan(product.id)}
                      />
                    ))}
                  </div>
                )}
                <Button
                  className="w-full rounded-xl"
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                  Cancel or Manage in Stripe
                </Button>
              </CardContent>
            </Card>

            <BillingHelpCard />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-2xl border-primary/30 shadow-[0_22px_60px_rgba(109,94,245,0.10)]">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">Recommended Plan</CardTitle>
                  <Badge className="rounded-full bg-primary text-primary-foreground">Recommended</Badge>
                </div>
                <CardDescription>{recommendedPlan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <span className="text-4xl font-bold tracking-tight text-slate-950">${(recommendedPlan.priceInCents / 100).toFixed(0)}</span>
                  <span className="text-muted-foreground">/{recommendedPlan.interval}</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  {recommendedPlan.clientLimit === null ? "Unlimited clients" : `Up to ${recommendedPlan.clientLimit} active clients`}
                </div>
                <Button
                  className="w-full rounded-xl"
                  onClick={() => handleSelectPlan(recommendedPlan.id)}
                  disabled={checkoutLoading === recommendedPlan.id}
                >
                  {checkoutLoading === recommendedPlan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Start {recommendedPlan.name}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80">
              <CardHeader>
                <CardTitle className="text-base">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <span className="text-sm text-slate-500">Subscription</span>
                  <Badge variant="destructive" className="rounded-full">Inactive</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <span className="text-sm text-slate-500">Clients</span>
                  <span className="text-sm font-semibold">{clientCount} / {clientLimitDisplay}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-xl"
                  onClick={() => setShowAllPlans((value) => !value)}
                >
                  View all plans
                  {showAllPlans ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          </div>

          {showAllPlans && (
            <div>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-slate-950">All Plans</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {PRODUCTS.map((product, index) => (
                  <PlanCard
                    key={product.id}
                    product={product}
                    isCurrentPlan={currentPlan === product.id}
                    isLoading={checkoutLoading === product.id}
                    canCheckout={checkoutAvailability[product.id] ?? false}
                    onSelect={() => handleSelectPlan(product.id)}
                    delay={index * 0.06}
                  />
                ))}
              </div>
            </div>
          )}

          <BillingHelpCard />
        </>
      )}
    </div>
  )
}

interface PlanCardProps {
  product: Product
  isCurrentPlan: boolean
  isLoading: boolean
  canCheckout: boolean
  onSelect: () => void
  delay: number
}

function UsageMeter({ label, used, limitLabel, limit }: { label: string; used: number; limitLabel: string; limit: number | null }) {
  const percent = limit === null ? 25 : Math.min((used / limit) * 100, 100)
  const isNearLimit = limit !== null && used >= limit * 0.8
  const isAtLimit = limit !== null && used >= limit

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-slate-950">{used} / {limitLabel}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${isAtLimit ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function CompactPlanAction({
  product,
  isCurrentPlan,
  isLoading,
  canCheckout,
  onSelect,
}: {
  product: Product
  isCurrentPlan: boolean
  isLoading: boolean
  canCheckout: boolean
  onSelect: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-950">{product.name}</p>
        <p className="text-sm text-slate-500">${(product.priceInCents / 100).toFixed(0)}/{product.interval}</p>
      </div>
      {isCurrentPlan ? (
        <Badge className="w-fit rounded-full bg-primary/10 text-primary">Current</Badge>
      ) : product.contactSalesIfMissingPrice && !canCheckout ? (
        <Button variant="outline" className="rounded-xl" disabled>
          Contact Sales
        </Button>
      ) : (
        <Button variant="outline" className="rounded-xl" onClick={onSelect} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Select
        </Button>
      )}
    </div>
  )
}

function BillingHelpCard() {
  return (
    <Card className="rounded-2xl border-slate-200/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LifeBuoy className="h-5 w-5 text-primary" />
          Billing Help
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-500">
          For invoices, plan changes, cancellation questions, or Stripe portal issues, contact SessionSteps support.
        </p>
      </CardContent>
    </Card>
  )
}

function PlanCard({ product, isCurrentPlan, isLoading, canCheckout, onSelect, delay }: PlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={`relative flex h-full flex-col overflow-hidden ${product.isPopular ? "border-primary/50 shadow-[0_24px_65px_rgba(109,94,245,0.16)]" : ""}`}>
        {product.isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="rounded-full bg-primary px-3 py-1 text-primary-foreground">Most Popular</Badge>
          </div>
        )}
        <CardHeader className="pb-4">
          <CardTitle className="text-xl tracking-tight text-slate-950">{product.name}</CardTitle>
          <CardDescription>{product.description}</CardDescription>
          <div className="pt-2">
            <span className="text-4xl font-bold tracking-tight text-slate-950">${(product.priceInCents / 100).toFixed(0)}</span>
            <span className="text-muted-foreground">/{product.interval}</span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ul className="space-y-3 flex-1">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-[#18B7A0] mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {isCurrentPlan ? (
              <Button disabled className="w-full rounded-xl">
                Current Plan
              </Button>
            ) : product.contactSalesIfMissingPrice && !canCheckout ? (
              <Button variant="outline" className="w-full rounded-xl" disabled>
                Contact Sales
              </Button>
            ) : (
              <Button 
                className="w-full rounded-xl" 
                variant={product.isPopular ? "default" : "outline"}
                onClick={onSelect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
