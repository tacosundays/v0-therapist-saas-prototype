"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden sm:pt-32 sm:pb-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Therapy homework that fits real practice
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
              Keep therapy homework moving{" "}
              <span className="text-primary">between sessions.</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 text-pretty">
              ShrinkAid Homework helps therapists assign worksheets, collect client reflections, and review progress before the next appointment.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="text-base h-12 px-8" asChild>
                <Link href="/signup">
                  Start free trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-muted-foreground">
              {[
                "Solo therapists and group practices with up to 5 seats",
                "14-day free trial",
                "Built with HIPAA-conscious security controls",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function DashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-chart-4/60" />
            <div className="w-3 h-3 rounded-full bg-primary/60" />
          </div>
          <div className="flex-1 text-center">
            <div className="text-xs text-muted-foreground">Therapist Dashboard</div>
          </div>
        </div>
        
        <div className="p-4 space-y-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Homework assigned</div>
              <div className="text-2xl font-bold text-foreground">12</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Ready to review</div>
              <div className="text-2xl font-bold text-primary">5</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {[
              { name: "Client A", status: "Worksheet completed", progress: 100 },
              { name: "Client B", status: "Reflection submitted", progress: 70 },
              { name: "Client C", status: "Assigned", progress: 0 },
            ].map((client) => (
              <div key={client.name} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">{client.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{client.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${client.progress}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      client.status === "Worksheet completed" ? "text-primary" :
                      client.status === "Reflection submitted" ? "text-chart-4" : "text-muted-foreground"
                    }`}>
                      {client.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
