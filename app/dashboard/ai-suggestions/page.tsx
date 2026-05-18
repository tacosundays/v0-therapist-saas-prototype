"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  Brain,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Target,
  Clock
} from "lucide-react"

const suggestions = [
  {
    id: 1,
    client: "James Rodriguez",
    clientInitials: "JR",
    suggestion: "Based on James's recent anxiety scores and session notes, consider adding a relaxation exercise focused on physiological calming techniques.",
    recommendedContent: "Progressive Muscle Relaxation",
    contentType: "Mindfulness",
    confidence: 92,
    reasoning: "Anxiety scores increased 15% over the last 2 weeks. Session notes mention physical tension.",
    priority: "high"
  },
  {
    id: 2,
    client: "Emily Chen",
    clientInitials: "EC",
    suggestion: "Emily has shown strong progress with values work. Consider building on this momentum with behavioral activation targeting value-aligned activities.",
    recommendedContent: "Values-Based Activity Scheduling",
    contentType: "ACT",
    confidence: 88,
    reasoning: "Completed values clarification with high engagement. Ready for next step in ACT protocol.",
    priority: "medium"
  },
  {
    id: 3,
    client: "Michael Brown",
    clientInitials: "MB",
    suggestion: "Michael's homework completion has dropped. Consider simpler, shorter exercises to rebuild engagement and momentum.",
    recommendedContent: "5-Minute Gratitude Practice",
    contentType: "Positive Psychology",
    confidence: 85,
    reasoning: "Completion rate dropped from 80% to 45%. May benefit from lower-barrier assignments.",
    priority: "high"
  },
  {
    id: 4,
    client: "Lisa Thompson",
    clientInitials: "LT",
    suggestion: "Lisa's thought records show recurring themes around perfectionism. A core beliefs worksheet could help address underlying schemas.",
    recommendedContent: "Core Beliefs Exploration",
    contentType: "CBT",
    confidence: 79,
    reasoning: "Analysis of 8 thought records reveals perfectionism patterns in 6 entries.",
    priority: "medium"
  },
  {
    id: 5,
    client: "Sarah Mitchell",
    clientInitials: "SM",
    suggestion: "Sarah has mastered basic mindfulness. Ready to advance to more challenging exercises like urge surfing for emotional regulation.",
    recommendedContent: "Urge Surfing Meditation",
    contentType: "DBT",
    confidence: 91,
    reasoning: "High completion rate on mindfulness exercises. Journal reflections show strong awareness skills.",
    priority: "low"
  },
]

const priorityConfig = {
  high: { label: "High Priority", className: "bg-destructive/10 text-destructive" },
  medium: { label: "Medium", className: "bg-chart-4/10 text-chart-4" },
  low: { label: "Suggested", className: "bg-primary/10 text-primary" },
}

export default function AISuggestionsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground flex items-center gap-2"
          >
            <Sparkles className="w-6 h-6 text-primary" />
            AI Suggestions
          </motion.h1>
          <p className="text-muted-foreground mt-1">Personalized homework recommendations based on client progress</p>
        </div>
      </div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">How AI Suggestions Work</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI analyzes client homework completions, reflections, and progress patterns to recommend
                  the most effective next assignments. Suggestions are updated after each session and homework submission.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Suggestions List */}
      <div className="space-y-6">
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Client Avatar */}
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">{suggestion.clientInitials}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{suggestion.client}</h3>
                          <Badge className={`rounded-lg border-0 text-xs ${priorityConfig[suggestion.priority as keyof typeof priorityConfig].className}`}>
                            {priorityConfig[suggestion.priority as keyof typeof priorityConfig].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">{suggestion.suggestion}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-sm text-primary font-medium">
                          <Brain className="w-4 h-4" />
                          {suggestion.confidence}% match
                        </div>
                      </div>
                    </div>

                    {/* Recommended Content */}
                    <div className="p-4 bg-muted/30 rounded-xl mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Recommended Assignment</p>
                          <p className="font-medium text-foreground">{suggestion.recommendedContent}</p>
                          <Badge variant="secondary" className="mt-2 rounded-lg text-xs">
                            {suggestion.contentType}
                          </Badge>
                        </div>
                        <Target className="w-8 h-8 text-primary/30" />
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
                      <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{suggestion.reasoning}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <Button className="rounded-xl">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Assign to Client
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        View Content
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button variant="ghost" className="rounded-xl text-muted-foreground">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State Note */}
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Suggestions refresh automatically as clients complete homework and submit reflections.</p>
      </div>
    </div>
  )
}
