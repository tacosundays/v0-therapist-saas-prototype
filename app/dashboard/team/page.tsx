"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getClient } from "@/lib/supabase/client"
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  MoreHorizontal,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TeamMember {
  id: string
  therapist_id: string
  role: "owner" | "therapist"
  status: "active" | "removed"
  joined_at: string
  therapists?: {
    full_name?: string | null
    email?: string | null
    credentials?: string | null
  } | null
}

interface TeamInvite {
  id: string
  email: string
  role: "therapist"
  expires_at: string
  created_at: string
}

interface TeamData {
  practice: {
    id: string
    name: string
    max_seats: number
  }
  currentTherapistId: string
  currentRole: "owner" | "therapist"
  plan: string
  canManageTeam: boolean
  maxSeats: number
  seatsUsed: number
  members: TeamMember[]
  invites: TeamInvite[]
}

type PeopleFilter = "all" | "active" | "pending"

type PeopleRow = {
  id: string
  type: "member" | "invite"
  name: string
  email: string
  role: string
  status: "Owner" | "Active" | "Invite Pending" | "Invite Expired"
  dateLabel: string
  dateValue: string
  member?: TeamMember
  invite?: TeamInvite
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available"
  return new Date(value).toLocaleDateString()
}

function getInitials(value: string) {
  return value
    .split(/[ @._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "--"
}

function getStatusClassName(status: PeopleRow["status"]) {
  if (status === "Owner") return "border-primary/20 bg-primary/10 text-primary"
  if (status === "Active") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
  if (status === "Invite Expired") return "border-destructive/20 bg-destructive/10 text-destructive"
  return "border-amber-500/20 bg-amber-500/10 text-amber-700"
}

export default function TeamPage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [manualInviteLink, setManualInviteLink] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all")

  const loadTeam = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("You must be logged in to view your team.")
        return
      }

      const response = await fetch("/api/team", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setError(result?.error || "Failed to load team.")
        return
      }

      setTeamData(result)
    } catch (err) {
      console.error("[v0] Team: failed to load team", err)
      setError(err instanceof Error ? err.message : "Failed to load team.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTeam()
  }, [])

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsInviting(true)
    setError(null)
    setMessage(null)
    setManualInviteLink(null)

    try {
      const supabase = getClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("You must be logged in to invite therapists.")
        return
      }

      const response = await fetch("/api/team/invites/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok && !result?.success) {
        setError(result?.error || "Failed to invite therapist.")
        return
      }

      setMessage(result?.message || "Invitation email sent successfully.")
      setManualInviteLink(result?.emailSent ? null : result?.inviteLink || null)
      setInviteEmail("")
      await loadTeam()
    } catch (err) {
      console.error("[v0] Team: failed to invite therapist", err)
      setError(err instanceof Error ? err.message : "Failed to invite therapist.")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    setRemovingMemberId(memberId)
    setError(null)
    setMessage(null)

    try {
      const supabase = getClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("You must be logged in to remove team members.")
        return
      }

      const response = await fetch("/api/team/members/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ memberId }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setError(result?.error || "Failed to remove team member.")
        return
      }

      setMessage("Team member removed.")
      await loadTeam()
    } catch (err) {
      console.error("[v0] Team: failed to remove member", err)
      setError(err instanceof Error ? err.message : "Failed to remove team member.")
    } finally {
      setRemovingMemberId(null)
    }
  }

  const activeMembers = (teamData?.members || []).filter((member) => member.status === "active")
  const canInvite = !!teamData?.canManageTeam && teamData.seatsUsed < teamData.maxSeats
  const remainingSeats = teamData ? Math.max(teamData.maxSeats - teamData.seatsUsed, 0) : 0
  const seatPercent = teamData ? Math.min((teamData.seatsUsed / teamData.maxSeats) * 100, 100) : 0
  const isFullPractice = !!teamData && teamData.seatsUsed >= teamData.maxSeats
  const now = new Date()
  const peopleRows: PeopleRow[] = [
    ...activeMembers.map((member): PeopleRow => {
      const displayName = member.therapists?.full_name || member.therapists?.email || "Therapist"
      return {
        id: `member-${member.id}`,
        type: "member",
        name: displayName,
        email: member.therapists?.email || "No email",
        role: member.role === "owner" ? "Owner" : "Therapist",
        status: member.role === "owner" ? "Owner" : "Active",
        dateLabel: "Joined",
        dateValue: member.joined_at,
        member,
      }
    }),
    ...(teamData?.invites || []).map((invite): PeopleRow => {
      const isExpired = new Date(invite.expires_at) < now
      return {
        id: `invite-${invite.id}`,
        type: "invite",
        name: invite.email,
        email: invite.email,
        role: "Therapist",
        status: isExpired ? "Invite Expired" : "Invite Pending",
        dateLabel: "Invited",
        dateValue: invite.created_at,
        invite,
      }
    }),
  ]
  const filteredPeopleRows = peopleRows.filter((row) => {
    if (peopleFilter === "active") return row.type === "member"
    if (peopleFilter === "pending") return row.type === "invite"
    return true
  })
  const additionalActiveMembers = activeMembers.filter((member) => member.role !== "owner")
  const pendingInvites = teamData?.invites || []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="saas-page-header">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-36 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-2xl border-slate-200/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="saas-page-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="saas-eyebrow mb-2">Group practice</p>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight text-slate-950"
          >
            Team
          </motion.h1>
          <p className="mt-2 text-sm text-slate-500">Manage therapist seats for your Group Practice account</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {teamData && teamData.plan !== "group-practice" && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50">
          <CardContent className="p-5 text-sm text-amber-800">
            Team invitations require the Group Practice plan. Your team workspace is ready, but inviting therapists is disabled until the practice is on Group Practice.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Seat Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Seats used</span>
                  <span className="text-2xl font-bold text-slate-950">{teamData?.seatsUsed || 0} / {teamData?.maxSeats || 5}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${isFullPractice ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${seatPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {remainingSeats > 0 ? `${remainingSeats} seat${remainingSeats === 1 ? "" : "s"} remaining` : "No seats available"}
                </p>
              </div>
              {isFullPractice && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  All seats are used or pending. Remove a member or wait for an invitation to expire before inviting another therapist.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-primary" />
                Invite Therapist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Therapist email</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="therapist@example.com"
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                    disabled={!canInvite || isInviting}
                    required
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={!canInvite || isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </Button>
                {!teamData?.canManageTeam && (
                  <p className="text-xs text-muted-foreground">Only the Group Practice owner can invite therapists.</p>
                )}
                {teamData?.canManageTeam && isFullPractice && (
                  <p className="text-xs text-destructive">All {teamData.maxSeats} therapist seats are currently used or pending.</p>
                )}
              </form>

              {manualInviteLink && (
                <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Manual invite link</p>
                  <div className="flex gap-2">
                    <Input value={manualInviteLink} readOnly className="h-10 rounded-xl text-xs" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => navigator.clipboard.writeText(manualInviteLink)}
                      aria-label="Copy manual invite link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-slate-200/80">
          <CardHeader className="gap-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                People
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Practice members and pending therapist invitations.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ["all", "All"],
                ["active", "Active"],
                ["pending", "Pending"],
              ] as const).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={peopleFilter === key ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setPeopleFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {filteredPeopleRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                <p className="font-semibold text-slate-950">
                  {peopleFilter === "pending"
                    ? "No pending invitations"
                    : peopleFilter === "active"
                      ? "No additional active members"
                      : "No team people yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {peopleFilter === "pending"
                    ? "Pending therapist invitations will appear here."
                    : peopleFilter === "active"
                      ? "Invited therapists will appear here after they join."
                      : "Invite therapists when seats are available."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80">
                <div className="hidden grid-cols-[minmax(220px,1.2fr)_120px_140px_140px_64px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                  <span>Person</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span>Date</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-slate-200/80">
                  {filteredPeopleRows.map((row) => (
                    <div key={row.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(220px,1.2fr)_120px_140px_140px_64px] lg:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/15">
                          {getInitials(row.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{row.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{row.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-xs font-medium text-muted-foreground lg:hidden">Role</span>
                        <span className="text-sm text-slate-700">{row.role}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-xs font-medium text-muted-foreground lg:hidden">Status</span>
                        <Badge variant="outline" className={`rounded-full px-2.5 py-1 ${getStatusClassName(row.status)}`}>
                          {row.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground lg:block">
                        <span className="text-xs font-medium text-muted-foreground lg:hidden">{row.dateLabel}</span>
                        <span>{row.dateLabel} {formatDate(row.dateValue)}</span>
                      </div>
                      <div className="flex justify-end border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            {row.type === "invite" && (
                              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.email)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Email
                              </DropdownMenuItem>
                            )}
                            {row.type === "member" && teamData?.canManageTeam && row.member?.role !== "owner" && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setMemberToRemove(row.member || null)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Therapist
                              </DropdownMenuItem>
                            )}
                            {row.type === "member" && (!teamData?.canManageTeam || row.member?.role === "owner") && (
                              <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {additionalActiveMembers.length === 0 && pendingInvites.length === 0 && peopleFilter === "all" && (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">
                No additional members or pending invitations yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove therapist?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {memberToRemove?.therapists?.full_name || memberToRemove?.therapists?.email || "this therapist"} from the practice team. Their own clinical workspace data is not shown on this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (memberToRemove) {
                  void handleRemove(memberToRemove.id)
                  setMemberToRemove(null)
                }
              }}
              disabled={!!removingMemberId}
            >
              {removingMemberId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove Therapist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
