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
  CheckCircle2
} from "lucide-react"
import { PRODUCTS, type Product } from "@/lib/products"
import { getSubscriptionStatus, createCustomerPortalSession, startSubscriptionCheckout, verifyAndActivateSubscription } from "@/app/actions/stripe"
import { getClient } from "@/lib/supabase/client"

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
  const hasVerified = useRef(false)

  // Get current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.id && user?.email) {
        setUserData({ 
          id: user.id, 
          email: user.email,
          fullName: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || undefined,
          practiceName: user.user_metadata?.practice_name || undefined
        })
      }
    }
    fetchUser()
  }, [])

  // Verify subscription after returning from Stripe checkout
  useEffect(() => {
    const verifyCheckout = async () => {
      const success = searchParams.get('success')
      const sessionId = searchParams.get('session_id')
      
      if (success === 'true' && sessionId && userData && !hasVerified.current) {
        hasVerified.current = true
        
        const result = await verifyAndActivateSubscription(sessionId, userData)
        
        if (result.success) {
          setSuccessMessage("Your subscription has been activated successfully!")
          // Refresh subscription data
          const data = await getSubscriptionStatus(userData)
          setSubscriptionData(data)
          setIsLoading(false)
        } else {
          // Even if verification fails, the webhook should handle it
          // Just show a message and refresh
          setSuccessMessage("Payment successful! Your subscription will be activated shortly.")
          const data = await getSubscriptionStatus(userData)
          setSubscriptionData(data)
          setIsLoading(false)
        }
        
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
  const isTrialing = subscriptionData?.subscription?.isInTrial
  const currentPlan = subscriptionData?.subscription?.plan

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and billing</p>
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

      {/* Current Subscription Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    {currentPlan 
                      ? PRODUCTS.find(p => p.id === currentPlan)?.name || "Unknown Plan"
                      : isTrialing 
                        ? "Free Trial"
                        : "No Active Plan"
                    }
                  </span>
                  {isActive && (
                    <Badge className="bg-primary/10 text-primary">Active</Badge>
                  )}
                  {isTrialing && (
                    <Badge variant="secondary">Trial</Badge>
                  )}
                  {!isActive && !isTrialing && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
                
                {subscriptionData?.subscription?.endDate && isActive && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Renews on {new Date(subscriptionData.subscription.endDate).toLocaleDateString()}
                  </p>
                )}
                
                {isTrialing && subscriptionData?.subscription?.trialEndDate && (
                  <p className="text-sm text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Trial ends {new Date(subscriptionData.subscription.trialEndDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {isActive && (
                <Button 
                  variant="outline" 
                  className="rounded-xl"
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {isActive ? "Change Plan" : "Choose a Plan"}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PRODUCTS.map((product, index) => (
            <PlanCard
              key={product.id}
              product={product}
              isCurrentPlan={currentPlan === product.id}
              isLoading={checkoutLoading === product.id}
              onSelect={() => handleSelectPlan(product.id)}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface PlanCardProps {
  product: Product
  isCurrentPlan: boolean
  isLoading: boolean
  onSelect: () => void
  delay: number
}

function PlanCard({ product, isCurrentPlan, isLoading, onSelect, delay }: PlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={`rounded-2xl relative h-full flex flex-col ${product.isPopular ? "border-primary shadow-lg" : ""}`}>
        {product.isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
          </div>
        )}
        <CardHeader className="pb-4">
          <CardTitle>{product.name}</CardTitle>
          <CardDescription>{product.description}</CardDescription>
          <div className="pt-2">
            {product.isEnterprise ? (
              <span className="text-3xl font-bold">Custom</span>
            ) : (
              <>
                <span className="text-3xl font-bold">${(product.priceInCents / 100).toFixed(0)}</span>
                <span className="text-muted-foreground">/{product.interval}</span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ul className="space-y-3 flex-1">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {isCurrentPlan ? (
              <Button disabled className="w-full rounded-xl">
                Current Plan
              </Button>
            ) : product.isEnterprise ? (
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <a href="mailto:sales@example.com">Contact Sales</a>
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
