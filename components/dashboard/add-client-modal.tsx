"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getClient } from "@/lib/supabase/client"
import { getTherapistId } from "@/lib/auth/check-user-role"
import { normalizeInviteEmail } from "@/lib/invitations"
import { CheckCircle2, Copy, Loader2, Mail } from "lucide-react"
import { UpgradeModal } from "./upgrade-modal"
import { canAddClient, getPlanLimits } from "@/lib/plan-limits"

interface AddClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientAdded: () => void
}

export function AddClientModal({ open, onOpenChange, onClientAdded }: AddClientModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [clientCount, setClientCount] = useState(0)
  const [planId, setPlanId] = useState<string | null>(null)
  const [isCheckingLimits, setIsCheckingLimits] = useState(true)

  // Check plan limits when modal opens
  useEffect(() => {
    if (open) {
      checkPlanLimits()
    }
  }, [open])

  const checkPlanLimits = async () => {
    setIsCheckingLimits(true)
    try {
      const supabase = getClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsCheckingLimits(false)
        return
      }

      // Resolve therapist id by email (therapists.id may != auth.user.id)
      const { therapistId } = await getTherapistId()

      if (!therapistId) {
        setIsCheckingLimits(false)
        return
      }

      // Get therapist subscription info
      const { data: therapist } = await supabase
        .from("therapists")
        .select("plan, subscription_plan")
        .eq("id", therapistId)
        .single()

      // Get current client count
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("therapist_id", therapistId)

      const currentPlan = therapist?.plan || therapist?.subscription_plan || null
      const currentCount = count || 0
      
      setPlanId(currentPlan)
      setClientCount(currentCount)

      // Check if at limit
      if (!canAddClient(currentPlan, currentCount)) {
        onOpenChange(false)
        setShowUpgradeModal(true)
      }
    } catch (err) {
      console.error("Error checking plan limits:", err)
    } finally {
      setIsCheckingLimits(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setInviteLink(null)
    setEmailDeliveryFailed(false)
    setCopied(false)
    setIsLoading(true)

    try {
      const supabase = getClient() as any
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError("You must be logged in to add a client")
        return
      }

      const normalizedEmail = normalizeInviteEmail(email)

      if (!normalizedEmail) {
        setError("Client email is required for an invitation.")
        return
      }

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("You must be logged in to create an invite.")
        return
      }

      const createResponse = await fetch("/api/client-invitations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: name.trim(),
          email: normalizedEmail,
        }),
      })

      const createResult = await createResponse.json().catch(() => null)

      if (!createResponse.ok) {
        if (createResult?.code === "client_limit_reached") {
          setPlanId(createResult.plan || planId)
          setClientCount(createResult.currentClientCount || clientCount)
          onOpenChange(false)
          setShowUpgradeModal(true)
        }
        setError(createResult?.error || "Unable to create client invite.")
        return
      }

      const generatedInviteLink = createResult.inviteLink
      setInviteLink(generatedInviteLink)

      const emailResponse = await fetch("/api/client-invitations/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          clientId: createResult.clientId,
          inviteLink: generatedInviteLink,
        }),
      })

      if (!emailResponse.ok) {
        const emailResult = await emailResponse.json().catch(() => null)
        console.error("Invitation email failed:", emailResult)
        setEmailDeliveryFailed(true)
        setSuccessMessage("Client created. Email delivery failed. Copy invite link manually.")
      } else {
        setEmailDeliveryFailed(false)
        setSuccessMessage("Invitation email sent successfully.")
      }

      onClientAdded()
      
    } catch (err) {
      console.error("Exception adding client:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setName("")
      setEmail("")
      setError(null)
      setSuccessMessage(null)
      setInviteLink(null)
      setEmailDeliveryFailed(false)
      setCopied(false)
      onOpenChange(false)
    }
  }

  const handleCopyInvite = async () => {
    if (!inviteLink) return

    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const limits = getPlanLimits(planId)

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          {isCheckingLimits ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Invite Client</DialogTitle>
                <DialogDescription>
                  Create a client record and share a secure signup link.
                </DialogDescription>
              </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Name *</Label>
            <Input
              id="client-name"
              placeholder="Client's full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="client-email">Email *</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="client@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              The client must sign up with this email address.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-primary/10 text-primary text-sm rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          {inviteLink && (
            <div className="space-y-3 p-3 bg-primary/10 text-primary text-sm rounded-xl">
              {emailDeliveryFailed && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    The invite link is ready. Copy it and send it to the client manually.
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-background/80 border border-primary/20 p-2 text-xs text-foreground break-all">
                {inviteLink}
              </div>
              <Button type="button" size="sm" className="rounded-xl" onClick={handleCopyInvite}>
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Invite Link
                  </>
                )}
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-xl"
            >
              {inviteLink ? "Done" : "Cancel"}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim()}
              className="rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating invite...
                </>
              ) : (
                "Create Invite"
              )}
            </Button>
          </DialogFooter>
        </form>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentLimit={limits.clientLimit || 20}
        currentCount={clientCount}
      />
    </>
  )
}
