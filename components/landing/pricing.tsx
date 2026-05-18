"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    name: "Solo Practice",
    price: 29,
    description: "Perfect for individual therapists",
    features: [
      "Up to 25 active clients",
      "Full content library access",
      "Client portal",
      "Progress tracking",
      "Email support"
    ],
    cta: "Start free trial",
    popular: false
  },
  {
    name: "Growing Practice",
    price: 79,
    description: "For therapists scaling their practice",
    features: [
      "Up to 75 active clients",
      "Everything in Solo, plus:",
      "AI homework suggestions",
      "Custom worksheets",
      "Priority support",
      "Analytics dashboard"
    ],
    cta: "Start free trial",
    popular: true
  },
  {
    name: "Group Practice",
    price: 199,
    description: "For multi-therapist practices",
    features: [
      "Unlimited clients",
      "Everything in Growing, plus:",
      "Multiple therapist seats",
      "Practice-wide analytics",
      "Custom branding",
      "Dedicated success manager"
    ],
    cta: "Contact sales",
    popular: false
  }
]

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your practice. All plans include a 14-day free trial.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative bg-card p-8 rounded-2xl border ${
                plan.popular ? "border-primary shadow-lg" : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
