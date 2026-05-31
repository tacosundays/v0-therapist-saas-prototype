"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowRight, Users, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLimit: number
  currentCount: number
}

export function UpgradeModal({ open, onOpenChange, currentLimit, currentCount }: UpgradeModalProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push('/dashboard/billing')
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
          <Button
            onClick={handleUpgrade}
            className="w-full rounded-xl"
          >
            Upgrade to Group Practice
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
