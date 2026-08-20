"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, Loader2, MapPin, Shield, UserRoundCog } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getClient } from "@/lib/supabase/client"

type Location = { id: string; name: string; is_primary: boolean; status: string }
type Member = { therapist_id: string; role: "owner" | "admin" | "clinician"; therapists: { full_name?: string; email?: string } | null }
type Assignment = { location_id: string; therapist_id: string; is_primary: boolean }
type Invitation = { id: string; email: string; role: string; location_id: string }
type OrganizationData = {
  organization: { id: string; name: string; plan: string; subscription_plan: string; max_seats: number }
  locations: Location[]; members: Member[]; assignments: Assignment[]; invitations: Invitation[]
  currentRole: "owner" | "admin" | "clinician"; currentTherapistId: string
}

export default function OrganizationPage() {
  const [data, setData] = useState<OrganizationData | null>(null)
  const [name, setName] = useState("")
  const [locationName, setLocationName] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const request = useCallback(async (method: "GET" | "PATCH", body?: object) => {
    const { data: { session } } = await getClient().auth.getSession()
    if (!session?.access_token) throw new Error("You must be signed in.")
    const response = await fetch("/api/organization", {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.error || "Organization request failed.")
    return result
  }, [])

  const load = useCallback(async () => {
    try {
      setError(null)
      const result = await request("GET")
      setData(result)
      setName(result.organization.name)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load organization.")
    }
  }, [request])

  useEffect(() => { void load() }, [load])

  const mutate = async (key: string, body: object, success: string) => {
    try {
      setBusy(key); setError(null); setMessage(null)
      await request("PATCH", body)
      setMessage(success)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Change failed.")
    } finally { setBusy(null) }
  }

  if (!data && !error) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
  if (!data) return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">{error}</div>

  const canManage = data.currentRole === "owner" || data.currentRole === "admin"
  const ownerOnly = data.currentRole === "owner"

  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <div><h1 className="text-3xl font-semibold tracking-tight">Organization</h1><p className="mt-1 text-muted-foreground">Manage practice identity, locations, access, and seats.</p></div>
    {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {message && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">{message}</div>}

    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Practice details</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex gap-2"><Input value={name} disabled={!canManage} onChange={(e) => setName(e.target.value)} /><Button disabled={!canManage || busy === "rename" || name === data.organization.name} onClick={() => mutate("rename", { action: "rename", name }, "Organization name updated.")}>{busy === "rename" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button></div>
        <div className="flex flex-wrap gap-2"><Badge variant="secondary">{data.organization.subscription_plan || data.organization.plan}</Badge><Badge variant="outline">{data.members.length} / {data.organization.max_seats} seats used</Badge><Badge variant="outline">Your role: {data.currentRole}</Badge></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Access model</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Owners control billing and ownership. Admins manage locations and clinicians. Clinicians access only their organization and assigned clients.</CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Locations</CardTitle></CardHeader><CardContent className="space-y-4">
      {canManage && <div className="flex max-w-xl gap-2"><Input placeholder="New location name" value={locationName} onChange={(e) => setLocationName(e.target.value)} /><Button disabled={!locationName.trim() || busy === "location"} onClick={async () => { await mutate("location", { action: "createLocation", name: locationName }, "Location created."); setLocationName("") }}>Add location</Button></div>}
      <div className="grid gap-3 md:grid-cols-2">{data.locations.map((location) => <div key={location.id} className="rounded-lg border p-4"><div className="font-medium">{location.name}</div><div className="mt-1 flex gap-2"><Badge variant="outline">{location.status}</Badge>{location.is_primary && <Badge>Primary</Badge>}</div></div>)}</div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRoundCog className="h-5 w-5" />People and permissions</CardTitle></CardHeader><CardContent className="space-y-3">
      {data.members.map((member) => {
        const primary = data.assignments.find((item) => item.therapist_id === member.therapist_id && item.is_primary)
        const label = member.therapists?.full_name || member.therapists?.email || "Clinician"
        return <div key={member.therapist_id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_180px_180px_auto] md:items-center">
          <div><div className="font-medium">{label}</div><div className="text-sm text-muted-foreground">{member.therapists?.email}</div></div>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={member.role} disabled={!ownerOnly || member.role === "owner"} onChange={(e) => mutate(`role-${member.therapist_id}`, { action: "setRole", therapistId: member.therapist_id, role: e.target.value }, "Role updated.")}><option value="owner" disabled>Owner</option><option value="admin">Admin</option><option value="clinician">Clinician</option></select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={primary?.location_id || ""} disabled={!canManage} onChange={(e) => mutate(`location-${member.therapist_id}`, { action: "assignLocation", therapistId: member.therapist_id, locationId: e.target.value, makePrimary: true }, "Primary location updated.")}>{data.locations.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          {ownerOnly && member.role !== "owner" ? <Button variant="outline" disabled={busy === `owner-${member.therapist_id}`} onClick={() => mutate(`owner-${member.therapist_id}`, { action: "transferOwnership", therapistId: member.therapist_id }, "Ownership transferred.")}>Transfer ownership</Button> : <span />}
        </div>
      })}
      {data.invitations.map((invite) => <div key={invite.id} className="flex items-center justify-between rounded-lg border border-dashed p-4"><div><span className="font-medium">{invite.email}</span><span className="ml-2 text-sm text-muted-foreground">Pending {invite.role} invite</span></div>{canManage && <Button variant="ghost" size="sm" onClick={() => mutate(`invite-${invite.id}`, { action: "revokeInvitation", invitationId: invite.id }, "Invitation revoked.")}>Revoke</Button>}</div>)}
    </CardContent></Card>
  </div>
}
