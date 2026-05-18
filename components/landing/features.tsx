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

const features = [
  {
    icon: BookOpen,
    title: "Evidence-Based Library",
    description: "Access 200+ curated worksheets and exercises based on CBT, DBT, ACT, and more therapeutic modalities."
  },
  {
    icon: Sparkles,
    title: "AI Homework Suggestions",
    description: "Get personalized homework recommendations based on client notes, treatment goals, and progress patterns."
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Visual insights into client engagement, completion rates, and therapeutic progress over time."
  },
  {
    icon: Users,
    title: "Client Portal",
    description: "Clean, distraction-free interface for clients to access assignments and submit reflections."
  },
  {
    icon: MessageSquare,
    title: "Reflection Prompts",
    description: "Capture meaningful insights with guided reflection questions attached to every assignment."
  },
  {
    icon: Clock,
    title: "Session Continuity",
    description: "Pick up where you left off with homework summaries and client progress ready for each session."
  },
  {
    icon: Brain,
    title: "Treatment Integration",
    description: "Align homework with treatment plans and therapeutic goals for cohesive care delivery."
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Enterprise-grade security with encrypted data storage and compliant data handling practices."
  }
]

export function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Everything you need to extend therapy
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Powerful tools designed to make homework assignment effortless and client engagement seamless.
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
