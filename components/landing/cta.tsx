"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function CTA() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 text-center sm:p-12"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent" />
          
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground text-balance">
              Ready to extend therapy beyond the office?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/90 max-w-2xl mx-auto text-pretty">
              Give clients a clear place to complete homework, then walk into the next session with progress already organized.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="text-base h-12 px-8" asChild>
                <Link href="/signup">
                  Start free trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="#pricing">View pricing</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
