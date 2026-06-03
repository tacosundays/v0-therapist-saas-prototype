"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search,
  BookOpen,
  Brain,
  Heart,
  Target,
  MessageSquare,
  Zap,
  Plus,
  Loader2,
  FileText,
  Sparkles,
  ChevronDown,
  Upload,
  User
} from "lucide-react"
import { getClient } from "@/lib/supabase/client"
import { AssignHomeworkModal } from "@/components/dashboard/assign-homework-modal"
import { GenerateWorksheetModal } from "@/components/dashboard/generate-worksheet-modal"
import { CreateWorksheetModal } from "@/components/dashboard/create-worksheet-modal"
import { AssignWorksheetModal } from "@/components/dashboard/assign-worksheet-modal"
import { ViewWorksheetModal } from "@/components/dashboard/view-worksheet-modal"

interface ContentItem {
  id: string
  title: string
  category: string
  type: string | null
  description: string | null
  content: string | null
  created_at: string
  isCustom?: boolean
  isInteractive?: boolean
}

const categories = [
  { id: "all", label: "All", icon: BookOpen },
  { id: "cbt", label: "CBT", icon: Brain },
  { id: "dbt", label: "DBT", icon: Heart },
  { id: "act", label: "ACT", icon: Target },
  { id: "mindfulness", label: "Mindfulness", icon: Zap },
  { id: "journaling", label: "Journaling", icon: MessageSquare },
]

const categoryColors: Record<string, string> = {
  cbt: "bg-chart-1/10 text-chart-1",
  dbt: "bg-chart-2/10 text-chart-2",
  act: "bg-chart-3/10 text-chart-3",
  mindfulness: "bg-chart-4/10 text-chart-4",
  journaling: "bg-chart-5/10 text-chart-5",
}

const typeIcons: Record<string, typeof FileText> = {
  worksheet: FileText,
  exercise: Zap,
  meditation: Heart,
  journal: MessageSquare,
}

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isCreateWorksheetOpen, setIsCreateWorksheetOpen] = useState(false)
  const [isAssignWorksheetOpen, setIsAssignWorksheetOpen] = useState(false)
  const [isViewWorksheetOpen, setIsViewWorksheetOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Fetch built-in content
      const { data: builtInContent, error: fetchError } = await supabase
        .from("content_library")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      // Fetch custom worksheets if user is logged in
      let customContent: ContentItem[] = []
      if (user) {
        const { data: customData } = await supabase
          .from("custom_worksheets")
          .select("*")
          .eq("therapist_id", user.id)
          .order("created_at", { ascending: false })

        if (customData) {
          customContent = customData.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category || "custom",
            type: "worksheet",
            description: item.description,
            content: item.content,
            created_at: item.created_at,
            isCustom: true,
          }))
        }

        // Fetch interactive worksheet templates
        const { data: templatesData } = await supabase
          .from("worksheet_templates")
          .select("*")
          .eq("therapist_id", user.id)
          .order("created_at", { ascending: false })

        if (templatesData) {
          const templateItems: ContentItem[] = templatesData.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category || "custom",
            type: "interactive",
            description: item.description,
            content: null,
            created_at: item.created_at,
            isCustom: true,
            isInteractive: true,
          }))
          customContent = [...templateItems, ...customContent]
        }
      }

      setContentItems([...customContent, ...(builtInContent || [])])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignClick = (item: ContentItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (item.isInteractive) {
      setSelectedTemplateId(item.id)
      setIsAssignWorksheetOpen(true)
    } else {
      setSelectedContent(item)
      setIsAssignModalOpen(true)
    }
  }

  const handleCardClick = (item: ContentItem) => {
    if (item.isInteractive) {
      setSelectedTemplateId(item.id)
      setIsViewWorksheetOpen(true)
    }
    // For non-interactive items, clicking does nothing (could add a detail view later)
  }

  const filteredContent = contentItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesCategory = selectedCategory === "all" || item.category.toLowerCase() === selectedCategory
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
          <p className="text-muted-foreground mt-1">
            {contentItems.length > 0 
              ? `${contentItems.length} evidence-based worksheets and exercises`
              : "Evidence-based worksheets and exercises"
            }
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Create
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setIsCreateWorksheetOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Create Online Worksheet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsGenerateModalOpen(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Error loading content</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchContent} variant="outline" className="rounded-xl">
            Try Again
          </Button>
        </div>
      )}

      {/* Content Grid */}
      {!isLoading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item, index) => {
            const TypeIcon = typeIcons[item.type?.toLowerCase() || ""] || FileText
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`rounded-2xl h-full hover:shadow-lg transition-shadow group ${item.isInteractive ? "cursor-pointer" : ""}`}
                  onClick={() => handleCardClick(item)}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={`rounded-lg ${categoryColors[item.category.toLowerCase()] || "bg-muted text-muted-foreground"} border-0`}>
                        {item.category.toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {item.isInteractive && (
                          <Badge variant="outline" className="rounded-lg border-0 bg-chart-3/10 text-chart-3">
                            <FileText className="w-3 h-3 mr-1" />
                            Interactive
                          </Badge>
                        )}
                        {item.isCustom && !item.isInteractive && (
                          <Badge variant="outline" className="rounded-lg border-0 bg-primary/10 text-primary">
                            <User className="w-3 h-3 mr-1" />
                            Custom
                          </Badge>
                        )}
                        {item.type && !item.isCustom && (
                          <Badge variant="secondary" className="rounded-lg border-0">
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {item.type}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3 
                      className={`text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors ${item.isInteractive ? "cursor-pointer" : ""}`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex-1 line-clamp-3">
                      {item.description || "No description available"}
                    </p>

                    <div className="flex items-center justify-end mt-4 pt-4 border-t border-border">
                      <Button 
                        size="sm" 
                        className="rounded-lg"
                        onClick={(e) => handleAssignClick(item, e)}
                      >
                        Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredContent.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {contentItems.length === 0 ? "No content yet" : "No content found"}
          </h3>
          <p className="text-muted-foreground">
            {contentItems.length === 0 
              ? "Add content to your library to get started"
              : "Try adjusting your search or filter criteria"
            }
          </p>
        </div>
      )}

      {/* Assign Homework Modal */}
      <AssignHomeworkModal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        onAssignmentCreated={fetchContent}
        prefilledTitle={selectedContent?.title}
        prefilledDescription={selectedContent?.description || undefined}
      />

      {/* Generate Worksheet Modal */}
      <GenerateWorksheetModal
        open={isGenerateModalOpen}
        onOpenChange={setIsGenerateModalOpen}
        onWorksheetSaved={fetchContent}
      />

      {/* Create Online Worksheet Modal */}
      <CreateWorksheetModal
        open={isCreateWorksheetOpen}
        onOpenChange={setIsCreateWorksheetOpen}
        onWorksheetCreated={fetchContent}
      />

      {/* Assign Interactive Worksheet Modal */}
      <AssignWorksheetModal
        open={isAssignWorksheetOpen}
        onOpenChange={setIsAssignWorksheetOpen}
        onAssigned={fetchContent}
        preselectedTemplateId={selectedTemplateId || undefined}
      />

      {/* View Worksheet Modal */}
      <ViewWorksheetModal
        open={isViewWorksheetOpen}
        onOpenChange={setIsViewWorksheetOpen}
        worksheetId={selectedTemplateId}
        onAssign={() => {
          setIsViewWorksheetOpen(false)
          setIsAssignWorksheetOpen(true)
        }}
        onDeleted={fetchContent}
      />
    </div>
  )
}
