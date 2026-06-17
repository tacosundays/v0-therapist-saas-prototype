"use client"

import { motion } from "framer-motion"
import { 
  BookOpen, 
  Brain, 
  BarChart3, 
  Users, 
  Sparkles, 
  Shield,
  Clock,
  MessageSquare
} from "lucide-react"

const workflow = [
  {
    icon: BookOpen,
    title: "Assign homework",
    description: "Choose a worksheet, custom exercise, or reflection prompt and send it to a client from the therapist dashboard."
  },
  {
    icon: Users,
    title: "Client completes between sessions",
    description: "Clients open their portal, complete assigned work, add reflections, and submit responses before the next appointment."
  },
  {
    icon: BarChart3,
    title: "Review progress before next session",
    description: "See completion status, submitted reflections, mood check-ins, and recent activity in one place before session prep."
  }
]

const features = [
  {
    icon: BookOpen,
    title: "Homework library",
    description: "Assign structured worksheets, psychoeducation, and between-session exercises without rebuilding materials each week."
  },
  {
    icon: Sparkles,
    title: "Session summary support",
    description: "Use real client activity, reflections, and completed homework to prepare a focused review before the next session."
  },
  {
    icon: BarChart3,
    title: "Completion tracking",
    description: "Track assigned, started, and completed homework so follow-through is visible before clients arrive."
  },
  {
    icon: Users,
    title: "Client portal",
    description: "Give clients a simple place to complete worksheets, write reflections, and check in between appointments."
  },
  {
    icon: MessageSquare,
    title: "Reflections and mood check-ins",
    description: "Collect between-session notes and simple mood ratings that therapists can review without searching through messages."
  },
  {
    icon: Clock,
    title: "Session continuity",
    description: "Bring homework responses, recent activity, and therapist notes into session prep so care picks up where it left off."
  },
  {
    icon: Brain,
    title: "Solo and group practice fit",
    description: "Support solo therapists and group practices with up to 5 seats while keeping each therapist's client work private."
  },
  {
    icon: Shield,
    title: "HIPAA-conscious security",
    description: "Built with HIPAA-conscious security controls, including authenticated access patterns and protected client workspaces."
  }
]

export function Features() {
  return (
    <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30 sm:py-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            How ShrinkAid Homework works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            A simple loop for between-session care: assign work, collect responses, and review progress before the next appointment.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {workflow.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card p-6 rounded-2xl border border-border"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <step.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div id="features" className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Built for the homework workflow therapists actually use
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Assignments, reflections, mood check-ins, session prep, and team support stay connected around each therapist's own clients.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
