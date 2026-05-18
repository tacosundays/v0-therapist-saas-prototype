"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Calendar,
  ChevronRight,
  Heart,
  Sparkles
} from "lucide-react"

const assignments = [
  {
    id: 1,
    title: "Thought Record Worksheet",
    description: "Identify and challenge negative thought patterns using the CBT thought record format.",
    type: "CBT",
    dueDate: "Today",
    status: "new",
    estimatedTime: "15-20 min"
  },
  {
    id: 2,
    title: "Mindfulness Breathing Exercise",
    description: "Practice the 4-7-8 breathing technique for 5 minutes and record your experience.",
    type: "Mindfulness",
    dueDate: "Tomorrow",
    status: "in-progress",
    estimatedTime: "10 min"
  },
  {
    id: 3,
    title: "Values Clarification Exercise",
    description: "Reflect on your core values and identify actions that align with them.",
    type: "ACT",
    dueDate: "In 3 days",
    status: "new",
    estimatedTime: "20-30 min"
  },
]

const completedAssignments = [
  {
    id: 4,
    title: "Weekly Mood Journal",
    completedDate: "Yesterday",
    type: "Journaling"
  },
  {
    id: 5,
    title: "Gratitude Practice",
    completedDate: "3 days ago",
    type: "Positive Psychology"
  },
]

export default function PortalPage() {
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null)
  const [reflection, setReflection] = useState("")

  const currentAssignment = assignments.find(a => a.id === selectedAssignment)

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-foreground">Welcome back, Sarah</h1>
        <p className="text-muted-foreground mt-1">{"You have 3 assignments waiting for you"}</p>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your progress this week</p>
                <p className="text-3xl font-bold text-foreground mt-1">4 of 6</p>
                <p className="text-sm text-muted-foreground mt-1">assignments completed</p>
              </div>
              <div className="w-20 h-20 rounded-full border-4 border-primary/30 flex items-center justify-center relative">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    strokeDasharray={`${(4/6) * 226} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-lg font-bold text-primary">67%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {selectedAssignment ? (
        /* Assignment Detail View */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <Button
            variant="ghost"
            onClick={() => setSelectedAssignment(null)}
            className="rounded-xl"
          >
            Back to assignments
          </Button>

          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                  {currentAssignment?.type}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {currentAssignment?.estimatedTime}
                </span>
              </div>
              <CardTitle className="text-xl">{currentAssignment?.title}</CardTitle>
              <p className="text-muted-foreground">{currentAssignment?.description}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-muted/30 rounded-xl">
                <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Instructions
                </h3>
                <ol className="space-y-3 text-sm text-foreground">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-medium text-primary">1</span>
                    <span>Find a quiet space where you can focus for 15-20 minutes.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-medium text-primary">2</span>
                    <span>Think of a recent situation that triggered a negative emotion.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-medium text-primary">3</span>
                    <span>Write down your automatic thoughts and identify any cognitive distortions.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-medium text-primary">4</span>
                    <span>Challenge these thoughts with evidence and create a balanced perspective.</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Your Reflection
                </h3>
                <Textarea
                  placeholder="Share your thoughts, feelings, and insights from this exercise..."
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  className="min-h-32 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Your therapist will review your reflection before your next session.
                </p>
              </div>

              <Button className="w-full h-12 rounded-xl text-base">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Complete
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* Assignment List View */
        <>
          {/* Active Assignments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Your Assignments
            </h2>
            <div className="space-y-4">
              {assignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card
                    className="rounded-2xl cursor-pointer hover:shadow-lg transition-all hover:border-primary/30"
                    onClick={() => setSelectedAssignment(assignment.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          assignment.status === "in-progress" 
                            ? "bg-chart-4/20" 
                            : "bg-primary/20"
                        }`}>
                          {assignment.status === "in-progress" ? (
                            <Clock className="w-6 h-6 text-chart-4" />
                          ) : (
                            <BookOpen className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">{assignment.title}</h3>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-lg text-xs shrink-0">
                              {assignment.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{assignment.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due {assignment.dueDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {assignment.estimatedTime}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Completed Assignments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Completed
            </h2>
            <div className="space-y-3">
              {completedAssignments.map((assignment) => (
                <Card key={assignment.id} className="rounded-2xl bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Completed {assignment.completedDate} - {assignment.type}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
