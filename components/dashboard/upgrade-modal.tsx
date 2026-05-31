"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowRight, Users, Sparkles, Loader2 } from "lucide-react"
import { startSubscriptionCheckout } from "@/app/actions/stripe"
import { getClient } from "@/lib/supabase/client"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLimit: number
  currentCount: number
}

interface UserData {
  id: string
  email: string
  fullName?: string
  practiceName?: string
}

export function UpgradeModal({ open, onOpenChange, currentLimit, currentCount }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)

  // Fetch user data when modal opens
  useEffect(() => {
    if (open && !userData) {
      const fetchUser = async () => {
        const supabase = getClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.id && user?.email) {
          setUserData({
            id: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name || undefined,
            practiceName: user.user_metadata?.practice_name || undefined,
          })
        }
      }
      fetchUser()
    }
  }, [open, userData])

  const handleUpgrade = async () => {
    if (!userData) {
      setError("Please log in to upgrade")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await startSubscriptionCheckout("group-practice", userData)
      
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      if (result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Client Limit Reached</DialogTitle>
          <DialogDescription className="text-center">
            You&apos;ve reached your plan&apos;s limit of {currentLimit} clients ({currentCount}/{currentLimit} used).
            Upgrade to Group Practice for unlimited clients.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Unlimited clients</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Up to 5 therapists</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Team collaboration</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Priority support</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button
            onClick={handleUpgrade}
            className="w-full rounded-xl"
            disabled={isLoading || !userData}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting checkout...
              </>
            ) : (
              <>
                Upgrade to Group Practice
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl"
            disabled={isLoading}
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
