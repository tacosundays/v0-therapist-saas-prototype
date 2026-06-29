"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getClient } from "@/lib/supabase/client"
import { AlertCircle, CheckCircle2, Copy, Loader2, Mail, Shield, Trash2, Users } from "lucide-react"

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

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available"
  return new Date(value).toLocaleDateString()
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
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
        {teamData && (
          <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary">
            {teamData.seatsUsed} / {teamData.maxSeats} seats used
          </Badge>
        )}
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

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Practice Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active team members yet.</p>
            ) : (
              activeMembers.map((member) => (
                <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {member.therapists?.full_name || member.therapists?.email || "Therapist"}
                      </p>
                      <Badge variant={member.role === "owner" ? "default" : "secondary"} className="rounded-full capitalize">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.therapists?.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground">Joined {formatDate(member.joined_at)}</p>
                  </div>
                  {teamData?.canManageTeam && member.role !== "owner" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl sm:w-auto"
                      onClick={() => handleRemove(member.id)}
                      disabled={removingMemberId === member.id}
                    >
                      {removingMemberId === member.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Remove
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-primary" />
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
                {teamData?.canManageTeam && teamData.seatsUsed >= teamData.maxSeats && (
                  <p className="text-xs text-muted-foreground">All 5 therapist seats are currently used or pending.</p>
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
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Pending Invites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(teamData?.invites || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending therapist invites.</p>
              ) : (
                teamData?.invites.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                    <p className="text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">Invited {formatDate(invite.created_at)}</p>
                    <p className="text-xs text-muted-foreground">Expires {formatDate(invite.expires_at)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
