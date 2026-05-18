"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

const testimonials = [
  {
    quote: "ShrinkAid has transformed how I engage clients between sessions. The AI suggestions are spot-on and save me hours of preparation time.",
    author: "Dr. Amanda Chen",
    role: "Clinical Psychologist",
    rating: 5
  },
  {
    quote: "My clients love the clean portal. They actually complete their homework now! The reflection feature gives me invaluable insights before each session.",
    author: "Michael Torres, LMFT",
    role: "Marriage & Family Therapist",
    rating: 5
  },
  {
    quote: "Finally, a tool that understands what therapists need. The evidence-based library is comprehensive and the progress tracking helps demonstrate outcomes to clients.",
    author: "Dr. Sarah Williams",
    role: "Cognitive Behavioral Therapist",
    rating: 5
  }
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Trusted by therapists everywhere
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of mental health professionals who have elevated their practice.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card p-8 rounded-2xl border border-border"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-chart-4 text-chart-4" />
                ))}
              </div>
              <p className="text-foreground mb-6 text-pretty">{`"${testimonial.quote}"`}</p>
              <div>
                <div className="font-semibold text-foreground">{testimonial.author}</div>
                <div className="text-sm text-muted-foreground">{testimonial.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
