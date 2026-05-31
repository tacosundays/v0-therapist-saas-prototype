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
import { Loader2 } from "lucide-react"
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
  const [success, setSuccess] = useState(false)
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
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsCheckingLimits(false)
        return
      }

      // Get therapist subscription info
      const { data: therapist } = await supabase
        .from("therapists")
        .select("subscription_plan")
        .eq("id", user.id)
        .single()

      // Get current client count
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("therapist_id", user.id)

      const currentPlan = therapist?.subscription_plan || null
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
    setSuccess(false)
    setIsLoading(true)

    try {
      const supabase = getClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError("You must be logged in to add a client")
        return
      }

      // Insert client - normalize email to lowercase for consistent lookups
      const normalizedEmail = email.trim().toLowerCase() || null
      
      // Generate a short invite code (6 alphanumeric characters)
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      
      const insertData = {
        therapist_id: user.id,
        full_name: name.trim(),
        email: normalizedEmail,
        invite_code: inviteCode,
      }
      console.log("[v0] Inserting client:", insertData)
      
      const { data: insertedData, error: insertError } = await supabase
        .from("clients")
        .insert(insertData)
        .select()

      if (insertError) {
        console.error("[v0] Error adding client:", insertError)
        setError(insertError.message)
        return
      }

      console.log("[v0] Client added successfully:", insertedData)
      setSuccess(true)
      
      // Reset form
      setName("")
      setEmail("")
      
      // Notify parent and close modal after brief delay
      setTimeout(() => {
        onClientAdded()
        onOpenChange(false)
        setSuccess(false)
      }, 1000)
      
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
      setSuccess(false)
      onOpenChange(false)
    }
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
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Add a new client to your practice. You can assign homework after creating them.
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
            <Label htmlFor="client-email">Email (optional)</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="client@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Used to send homework notifications if provided
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-primary/10 text-primary text-sm rounded-xl">
              Client added successfully!
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Client"
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
