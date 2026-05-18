"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search,
  BookOpen,
  Brain,
  Heart,
  Target,
  MessageSquare,
  Zap,
  Filter,
  Plus,
  Clock,
  Users
} from "lucide-react"

const categories = [
  { id: "all", label: "All", icon: BookOpen },
  { id: "cbt", label: "CBT", icon: Brain },
  { id: "dbt", label: "DBT", icon: Heart },
  { id: "act", label: "ACT", icon: Target },
  { id: "mindfulness", label: "Mindfulness", icon: Zap },
  { id: "journaling", label: "Journaling", icon: MessageSquare },
]

const contentItems = [
  {
    id: 1,
    title: "Thought Record Worksheet",
    description: "Help clients identify and challenge negative automatic thoughts using the classic CBT format.",
    category: "cbt",
    duration: "15-20 min",
    popularity: 156,
    isNew: false
  },
  {
    id: 2,
    title: "TIPP Skills for Distress Tolerance",
    description: "Temperature, Intense exercise, Paced breathing, Progressive relaxation techniques.",
    category: "dbt",
    duration: "10-15 min",
    popularity: 134,
    isNew: true
  },
  {
    id: 3,
    title: "Values Clarification Exercise",
    description: "Guide clients to identify their core values and assess alignment with current behaviors.",
    category: "act",
    duration: "20-30 min",
    popularity: 98,
    isNew: false
  },
  {
    id: 4,
    title: "Body Scan Meditation",
    description: "A guided progressive relaxation exercise focusing on body awareness and tension release.",
    category: "mindfulness",
    duration: "15 min",
    popularity: 201,
    isNew: false
  },
  {
    id: 5,
    title: "Emotion Regulation Worksheet",
    description: "Track emotions, identify triggers, and develop healthy coping strategies.",
    category: "dbt",
    duration: "10-15 min",
    popularity: 145,
    isNew: false
  },
  {
    id: 6,
    title: "Gratitude Journal Prompts",
    description: "Daily prompts to cultivate gratitude and positive thinking patterns.",
    category: "journaling",
    duration: "5-10 min",
    popularity: 178,
    isNew: false
  },
  {
    id: 7,
    title: "Cognitive Defusion Techniques",
    description: "Exercises to help clients create distance from unhelpful thoughts.",
    category: "act",
    duration: "15-20 min",
    popularity: 89,
    isNew: true
  },
  {
    id: 8,
    title: "Behavioral Activation Planner",
    description: "Schedule meaningful activities to combat depression and increase engagement.",
    category: "cbt",
    duration: "15 min",
    popularity: 167,
    isNew: false
  },
  {
    id: 9,
    title: "5-4-3-2-1 Grounding Exercise",
    description: "A sensory awareness technique for managing anxiety and panic.",
    category: "mindfulness",
    duration: "5 min",
    popularity: 223,
    isNew: false
  },
  {
    id: 10,
    title: "Interpersonal Effectiveness DEAR MAN",
    description: "Skills for assertive communication and getting needs met in relationships.",
    category: "dbt",
    duration: "20 min",
    popularity: 112,
    isNew: false
  },
  {
    id: 11,
    title: "Self-Compassion Letter",
    description: "Write a compassionate letter to yourself about a difficult situation.",
    category: "journaling",
    duration: "15-20 min",
    popularity: 94,
    isNew: true
  },
  {
    id: 12,
    title: "Core Beliefs Worksheet",
    description: "Identify and challenge deep-seated negative beliefs about self, others, and the world.",
    category: "cbt",
    duration: "25-30 min",
    popularity: 143,
    isNew: false
  },
]

const categoryColors: Record<string, string> = {
  cbt: "bg-chart-1/10 text-chart-1",
  dbt: "bg-chart-2/10 text-chart-2",
  act: "bg-chart-3/10 text-chart-3",
  mindfulness: "bg-chart-4/10 text-chart-4",
  journaling: "bg-chart-5/10 text-chart-5",
}

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredContent = contentItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            Content Library
          </motion.h1>
          <p className="text-muted-foreground mt-1">200+ evidence-based worksheets and exercises</p>
        </div>
        <Button className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search worksheets, exercises, and more..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="rounded-xl"
            >
              <category.icon className="w-4 h-4 mr-2" />
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="rounded-2xl h-full hover:shadow-lg transition-shadow group">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <Badge className={`rounded-lg ${categoryColors[item.category]} border-0`}>
                    {item.category.toUpperCase()}
                  </Badge>
                  {item.isNew && (
                    <Badge variant="secondary" className="rounded-lg bg-primary/10 text-primary border-0">
                      New
                    </Badge>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground flex-1">
                  {item.description}
                </p>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {item.popularity} uses
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-lg">
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredContent.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No content found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  )
}
