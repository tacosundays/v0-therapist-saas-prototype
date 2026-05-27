"use client"

import { useState, useEffect, useCallback } from "react"
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
  ExternalLink
} from "lucide-react"
import { PRODUCTS, type Product } from "@/lib/products"
import { getSubscriptionStatus, createCustomerPortalSession } from "@/app/actions/stripe"
import { Checkout } from "@/components/checkout"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SubscriptionData {
  status: string
  subscription: {
    plan: string | null
    endDate: string | null
    trialEndDate: string | null
    isInTrial: boolean
  } | null
}

export default function BillingPage() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isPortalLoading, setIsPortalLoading] = useState(false)

  const fetchSubscription = useCallback(async () => {
    try {
      const data = await getSubscriptionStatus()
      setSubscriptionData(data)
    } catch (error) {
      console.error("Error fetching subscription:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId)
    setIsCheckoutOpen(true)
  }

  const handleManageSubscription = async () => {
    setIsPortalLoading(true)
    try {
      const url = await createCustomerPortalSession()
      window.location.href = url
    } catch (error) {
      console.error("Error creating portal session:", error)
    } finally {
      setIsPortalLoading(false)
    }
  }

  const handleCheckoutComplete = () => {
    setIsCheckoutOpen(false)
    setSelectedPlan(null)
    fetchSubscription()
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
              onSelect={() => handleSelectPlan(product.id)}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Subscribe to {PRODUCTS.find(p => p.id === selectedPlan)?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <Checkout 
              productId={selectedPlan} 
              onComplete={handleCheckoutComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface PlanCardProps {
  product: Product
  isCurrentPlan: boolean
  onSelect: () => void
  delay: number
}

function PlanCard({ product, isCurrentPlan, onSelect, delay }: PlanCardProps) {
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
              >
                {isCurrentPlan ? "Current Plan" : "Get Started"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
