"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Check, 
  Brain, 
  ArrowLeft,
  HelpCircle,
  Sparkles
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { PRODUCTS } from "@/lib/products"

function getMonthlyPrice(productPriceInCents: number) {
  return productPriceInCents / 100
}

function getAnnualMonthlyPrice(productPriceInCents: number) {
  return Math.round((getMonthlyPrice(productPriceInCents) * 10) / 12)
}

function getPlanLimitations(productId: string) {
  if (productId === "solo-practice") {
    return ["No AI suggestions", "No custom worksheets"]
  }

  return []
}

const faqs = [
  {
    question: "How does the 14-day free trial work?",
    answer: "You get full access to all features in your chosen plan for 14 days. No credit card required to start. At the end of the trial, you can choose to subscribe or your account will be paused (your data is saved for 30 days)."
  },
  {
    question: "Can I change plans later?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be prorated for the remainder of your billing cycle. When downgrading, the change takes effect at your next billing date."
  },
  {
    question: "What counts as an 'active client'?",
    answer: "An active client is anyone with at least one homework assignment in the last 90 days. Archived clients don't count toward your limit, and you can reactivate them anytime."
  },
  {
    question: "Is ShrinkAid HIPAA compliant?",
    answer: "Yes! We take security seriously. All data is encrypted at rest and in transit. We sign Business Associate Agreements (BAAs) with all paid plans, and we undergo regular security audits."
  },
  {
    question: "Can clients use the portal on mobile?",
    answer: "Absolutely. The client portal is fully responsive and works beautifully on phones, tablets, and desktops. Clients can complete homework and submit reflections from any device."
  },
  {
    question: "How do AI suggestions work?",
    answer: "Our AI analyzes client progress, homework completion patterns, and reflection content to recommend the most effective next assignments. It learns from your client's specific patterns and adapts over time. You always have final control over what gets assigned."
  }
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg text-foreground">ShrinkAid</span>
            </Link>
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground text-balance">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your practice. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "annual"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
                <span className="ml-2 text-xs text-primary">Save 17%</span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {PRODUCTS.map((plan, index) => {
              const monthlyPrice = getMonthlyPrice(plan.priceInCents)
              const annualMonthlyPrice = getAnnualMonthlyPrice(plan.priceInCents)
              const displayedPrice = billingCycle === "monthly" ? monthlyPrice : annualMonthlyPrice
              const limitations = getPlanLimitations(plan.id)

              return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <Card className={`rounded-2xl h-full ${
                  plan.isPopular ? "border-primary shadow-lg" : "border-border"
                }`}>
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    </div>

                    <div className="mb-6">
                      <span className="text-5xl font-bold text-foreground">
                        ${displayedPrice}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                      {billingCycle === "annual" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Billed annually (${annualMonthlyPrice * 12}/year)
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                      {limitations.map((limitation) => (
                        <li key={limitation} className="flex items-start gap-3 opacity-50">
                          <span className="w-5 h-5 flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                          </span>
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full rounded-xl"
                      variant={plan.isPopular ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/signup">{plan.contactSalesIfMissingPrice ? "Contact sales" : "Start free trial"}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )})}
          </div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                Frequently Asked Questions
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card rounded-2xl border border-border px-6"
                >
                  <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <p className="text-muted-foreground mb-4">
              Still have questions? We are here to help.
            </p>
            <Button variant="outline" className="rounded-xl">
              Contact Sales
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
