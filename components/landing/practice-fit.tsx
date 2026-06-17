"use client"

import { motion } from "framer-motion"
import { Building2, LockKeyhole, UserRoundCheck } from "lucide-react"

const practiceFitItems = [
  {
    icon: UserRoundCheck,
    title: "For solo therapists",
    description: "Keep homework assignments, client reflections, mood check-ins, and session prep organized around your own caseload."
  },
  {
    icon: Building2,
    title: "For group practices",
    description: "Support up to 5 therapist seats on Group Practice while each therapist keeps their own client work private."
  },
  {
    icon: LockKeyhole,
    title: "Designed for sensitive work",
    description: "Built with HIPAA-conscious security controls and authenticated client portals for between-session care."
  }
]

export function PracticeFit() {
  return (
    <section id="practice-fit" className="py-16 px-4 sm:px-6 lg:px-8 sm:py-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Fits the way therapy practices actually run
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            ShrinkAid Homework is built for solo therapists and group practices with up to 5 seats, without blending therapist caseloads together.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {practiceFitItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card p-6 sm:p-8 rounded-2xl border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground text-pretty">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
