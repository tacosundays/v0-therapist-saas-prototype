"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  Library,
  Loader2,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { getClient } from "@/lib/supabase/client"

type SearchCategory =
  | "Clients"
  | "Couples"
  | "Worksheets"
  | "Reflections"
  | "Team"
  | "Content Library"
  | "Pages"

type SearchResult = {
  id: string
  category: SearchCategory
  title: string
  subtitle: string
  href: string
  keywords: string
  icon: LucideIcon
  tone: "purple" | "teal" | "amber" | "slate"
}

const categoryOrder: SearchCategory[] = [
  "Clients",
  "Couples",
  "Worksheets",
  "Reflections",
  "Team",
  "Content Library",
  "Pages",
]

const pageResults: SearchResult[] = [
  {
    id: "page-dashboard",
    category: "Pages",
    title: "Dashboard",
    subtitle: "Workspace overview",
    href: "/dashboard",
    keywords: "dashboard workspace overview home",
    icon: LayoutDashboard,
    tone: "purple",
  },
  {
    id: "page-inbox",
    category: "Pages",
    title: "Inbox",
    subtitle: "Activity feed and morning review",
    href: "/dashboard/inbox",
    keywords: "inbox activity feed review",
    icon: Inbox,
    tone: "purple",
  },
  {
    id: "page-calendar",
    category: "Pages",
    title: "Calendar",
    subtitle: "Daily schedule and session prep",
    href: "/dashboard/calendar",
    keywords: "calendar schedule sessions daily",
    icon: CalendarDays,
    tone: "purple",
  },
  {
    id: "page-clients",
    category: "Pages",
    title: "Clients",
    subtitle: "Client list, invitations, and assignments",
    href: "/dashboard/clients",
    keywords: "clients invitations assignments homework",
    icon: Users,
    tone: "purple",
  },
  {
    id: "page-couples",
    category: "Pages",
    title: "Couples",
    subtitle: "Couples dashboard and check-ins",
    href: "/dashboard/couples",
    keywords: "couples relationships check-ins",
    icon: HeartHandshake,
    tone: "teal",
  },
  {
    id: "page-library",
    category: "Pages",
    title: "Content Library",
    subtitle: "Worksheets and therapy homework content",
    href: "/dashboard/library",
    keywords: "content library worksheets homework",
    icon: Library,
    tone: "teal",
  },
  {
    id: "page-reflections",
    category: "Pages",
    title: "Reflections",
    subtitle: "Client reflections and mood check-ins",
    href: "/dashboard/reflections",
    keywords: "reflections journal mood check-ins",
    icon: MessageSquare,
    tone: "teal",
  },
  {
    id: "page-ai",
    category: "Pages",
    title: "AI Suggestions",
    subtitle: "Real client data summaries",
    href: "/dashboard/ai-suggestions",
    keywords: "ai suggestions session prep summary",
    icon: Sparkles,
    tone: "purple",
  },
  {
    id: "page-team",
    category: "Pages",
    title: "Team",
    subtitle: "Group practice team management",
    href: "/dashboard/team",
    keywords: "team members seats practice",
    icon: Users,
    tone: "slate",
  },
  {
    id: "page-organization",
    category: "Pages",
    title: "Organization",
    subtitle: "Locations, roles, ownership, and seats",
    href: "/dashboard/organization",
    keywords: "organization practice locations roles ownership seats",
    icon: Building2,
    tone: "slate",
  },
  {
    id: "page-billing",
    category: "Pages",
    title: "Billing",
    subtitle: "Plans, usage, and subscription",
    href: "/dashboard/billing",
    keywords: "billing subscription plans stripe",
    icon: CreditCard,
    tone: "slate",
  },
  {
    id: "page-security",
    category: "Pages",
    title: "Security",
    subtitle: "Audit logs and security activity",
    href: "/dashboard/security",
    keywords: "security audit logs",
    icon: ShieldCheck,
    tone: "slate",
  },
  {
    id: "page-settings",
    category: "Pages",
    title: "Settings",
    subtitle: "Profile and account settings",
    href: "/dashboard/settings",
    keywords: "settings profile account",
    icon: Settings,
    tone: "slate",
  },
]

const toneClasses = {
  purple: "bg-[#6D5EF5]/10 text-[#6D5EF5]",
  teal: "bg-[#18B7A0]/10 text-[#109986]",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-500",
}

function normalize(value: string | null | undefined) {
  return value?.trim() || ""
}

function resultValue(result: SearchResult) {
  return [result.category, result.title, result.subtitle, result.keywords].join(" ")
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [results, setResults] = useState<SearchResult[]>(pageResults)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open || hasLoaded) return

    const loadSearchData = async () => {
      setIsLoading(true)

      try {
        const supabase = getClient() as any
        const { therapistId, userEmail } = await getTherapistId()

        console.log("[v0] Global search: auth email:", userEmail)
        console.log("[v0] Global search: therapist id found:", therapistId ?? "none")

        if (!therapistId) {
          setResults(pageResults)
          setHasLoaded(true)
          return
        }

        const [
          clientsResult,
          couplesResult,
          templatesResult,
          customWorksheetsResult,
          contentResult,
          reflectionsResult,
        ] = await Promise.all([
          supabase
            .from("clients")
            .select("id, full_name, email")
            .eq("therapist_id", therapistId)
            .order("full_name", { ascending: true }),
          supabase
            .from("couples")
            .select("id, relationship_name, relationship_status")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("worksheet_templates")
            .select("id, title, description, category")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("custom_worksheets")
            .select("id, title, description, category")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false }),
          supabase
            .from("content_library")
            .select("id, title, description, category, type")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("client_reflections")
            .select("id, client_id, title, reflection_text, created_at")
            .eq("therapist_id", therapistId)
            .order("created_at", { ascending: false })
            .limit(30),
        ])

        const loadedResults: SearchResult[] = [...pageResults]
        const clientsById = new Map<string, { full_name?: string | null; email?: string | null }>()

        if (!clientsResult.error) {
          ;(clientsResult.data || []).forEach((client: any) => {
            clientsById.set(client.id, client)
            loadedResults.push({
              id: `client-${client.id}`,
              category: "Clients",
              title: normalize(client.full_name) || "Unnamed client",
              subtitle: normalize(client.email) || "Open session prep",
              href: `/dashboard/clients/${client.id}/session-prep`,
              keywords: `${normalize(client.full_name)} ${normalize(client.email)} session prep`,
              icon: Users,
              tone: "purple",
            })
          })
        } else {
          console.log("[v0] Global search: clients unavailable:", clientsResult.error.message)
        }

        if (!couplesResult.error) {
          ;(couplesResult.data || []).forEach((couple: any) => {
            loadedResults.push({
              id: `couple-${couple.id}`,
              category: "Couples",
              title: normalize(couple.relationship_name) || "Unnamed couple",
              subtitle: normalize(couple.relationship_status) || "Open couples dashboard",
              href: "/dashboard/couples",
              keywords: `${normalize(couple.relationship_name)} ${normalize(couple.relationship_status)} couple relationship`,
              icon: HeartHandshake,
              tone: "teal",
            })
          })
        } else {
          console.log("[v0] Global search: couples unavailable:", couplesResult.error.message)
        }

        if (!templatesResult.error) {
          ;(templatesResult.data || []).forEach((template: any) => {
            loadedResults.push({
              id: `worksheet-template-${template.id}`,
              category: "Worksheets",
              title: normalize(template.title) || "Untitled worksheet",
              subtitle: normalize(template.description) || normalize(template.category) || "Interactive worksheet",
              href: "/dashboard/library",
              keywords: `${normalize(template.title)} ${normalize(template.description)} ${normalize(template.category)} worksheet template`,
              icon: FileText,
              tone: "teal",
            })
          })
        } else {
          console.log("[v0] Global search: worksheet templates unavailable:", templatesResult.error.message)
        }

        if (!customWorksheetsResult.error) {
          ;(customWorksheetsResult.data || []).forEach((worksheet: any) => {
            loadedResults.push({
              id: `custom-worksheet-${worksheet.id}`,
              category: "Worksheets",
              title: normalize(worksheet.title) || "Untitled worksheet",
              subtitle: normalize(worksheet.description) || normalize(worksheet.category) || "Custom worksheet",
              href: "/dashboard/library",
              keywords: `${normalize(worksheet.title)} ${normalize(worksheet.description)} ${normalize(worksheet.category)} worksheet custom`,
              icon: FileText,
              tone: "teal",
            })
          })
        } else {
          console.log("[v0] Global search: custom worksheets unavailable:", customWorksheetsResult.error.message)
        }

        if (!contentResult.error) {
          ;(contentResult.data || []).forEach((item: any) => {
            loadedResults.push({
              id: `content-${item.id}`,
              category: "Content Library",
              title: normalize(item.title) || "Untitled content",
              subtitle: normalize(item.description) || normalize(item.category) || normalize(item.type) || "Library item",
              href: "/dashboard/library",
              keywords: `${normalize(item.title)} ${normalize(item.description)} ${normalize(item.category)} ${normalize(item.type)} content library`,
              icon: BookOpen,
              tone: "amber",
            })
          })
        } else {
          console.log("[v0] Global search: content library unavailable:", contentResult.error.message)
        }

        if (!reflectionsResult.error) {
          ;(reflectionsResult.data || []).forEach((reflection: any) => {
            const client = clientsById.get(reflection.client_id)
            loadedResults.push({
              id: `reflection-${reflection.id}`,
              category: "Reflections",
              title: normalize(reflection.title) || "Untitled reflection",
              subtitle: client?.full_name ? `From ${client.full_name}` : "Client reflection",
              href: "/dashboard/reflections",
              keywords: `${normalize(reflection.title)} ${normalize(reflection.reflection_text)} ${normalize(client?.full_name)} reflection journal`,
              icon: MessageSquare,
              tone: "teal",
            })
          })
        } else {
          console.log("[v0] Global search: reflections unavailable:", reflectionsResult.error.message)
        }

        try {
          const { data: membership, error: membershipError } = await supabase
            .from("practice_members")
            .select("practice_id")
            .eq("therapist_id", therapistId)
            .eq("status", "active")
            .limit(1)
            .maybeSingle()

          if (!membershipError && membership?.practice_id) {
            const { data: members, error: membersError } = await supabase
              .from("practice_members")
              .select("id, role, status, therapists(full_name, email)")
              .eq("practice_id", membership.practice_id)
              .eq("status", "active")
              .order("joined_at", { ascending: true })

            if (!membersError) {
              ;(members || []).forEach((member: any) => {
                loadedResults.push({
                  id: `team-member-${member.id}`,
                  category: "Team",
                  title: normalize(member.therapists?.full_name) || normalize(member.therapists?.email) || "Team member",
                  subtitle: `${normalize(member.role) || "therapist"}${member.therapists?.email ? ` • ${member.therapists.email}` : ""}`,
                  href: "/dashboard/team",
                  keywords: `${normalize(member.therapists?.full_name)} ${normalize(member.therapists?.email)} ${normalize(member.role)} team member`,
                  icon: Users,
                  tone: "slate",
                })
              })
            } else {
              console.log("[v0] Global search: team members unavailable:", membersError.message)
            }
          } else if (membershipError) {
            console.log("[v0] Global search: team membership unavailable:", membershipError.message)
          }
        } catch (teamError) {
          console.log("[v0] Global search: team unavailable:", teamError)
        }

        setResults(loadedResults)
        setHasLoaded(true)
      } catch (error) {
        console.error("[v0] Global search: failed to load", error)
        setResults(pageResults)
        setHasLoaded(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadSearchData()
  }, [hasLoaded, open])

  const groupedResults = useMemo(() => {
    return categoryOrder
      .map((category) => ({
        category,
        results: results.filter((result) => result.category === category),
      }))
      .filter((group) => group.results.length > 0)
  }, [results])

  const navigateToResult = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="group h-11 w-full justify-between rounded-2xl border-slate-200/75 bg-white/85 px-4 text-slate-500 shadow-[0_14px_34px_rgba(15,23,42,0.045)] backdrop-blur transition-all hover:border-[#6D5EF5]/25 hover:bg-white hover:text-slate-950 sm:w-[430px]"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400 group-hover:text-[#6D5EF5]" />
            Search workspace
          </span>
          <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-400 sm:flex">
            <span>⌘</span>K
          </span>
        </Button>
      </div>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search workspace"
        description="Search clients, worksheets, reflections, team, and pages."
        className="overflow-hidden rounded-[28px] border-slate-200 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.22)] sm:max-w-2xl"
      >
        <CommandInput
          placeholder="Search clients, worksheets, pages..."
          className="h-14 text-base"
        />
        <CommandList className="max-h-[62vh] px-2 py-3">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-medium text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#6D5EF5]" />
              Loading workspace...
            </div>
          )}

          <CommandEmpty>
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <p className="font-semibold text-slate-950">No results found.</p>
              <p className="mt-1 text-sm text-slate-500">Try searching for a client, worksheet, page, or reflection.</p>
            </div>
          </CommandEmpty>

          {!isLoading && groupedResults.map((group) => (
            <CommandGroup
              key={group.category}
              heading={group.category}
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-slate-400"
            >
              {group.results.map((result) => {
                const Icon = result.icon
                return (
                  <CommandItem
                    key={result.id}
                    value={resultValue(result)}
                    onSelect={() => navigateToResult(result.href)}
                    className="mb-1 rounded-2xl px-3 py-3 data-[selected=true]:bg-[#6D5EF5]/10 data-[selected=true]:text-slate-950"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneClasses[result.tone]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-950">{result.title}</p>
                      <p className="truncate text-xs text-slate-500">{result.subtitle}</p>
                    </div>
                    <CommandShortcut className="text-slate-300">
                      Enter
                    </CommandShortcut>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
