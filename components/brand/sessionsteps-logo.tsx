import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/brand-mark"

type SessionStepsMarkProps = {
  className?: string
  title?: string
}

export function SessionStepsMark({ className, title }: SessionStepsMarkProps) {
  return <BrandMark className={cn("shrink-0", className)} />
}

type SessionStepsLogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  showTagline?: boolean
}

export function SessionStepsLogo({
  className,
  markClassName,
  wordmarkClassName,
  showTagline = false,
}: SessionStepsLogoProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <SessionStepsMark className={cn("h-10 w-10", markClassName)} title="SessionSteps logo" />
      <span className="min-w-0">
        <span className={cn("block text-xl font-bold tracking-tight text-slate-950", wordmarkClassName)}>
          SessionSteps
        </span>
        {showTagline ? (
          <span className="block whitespace-nowrap text-[10px] font-medium text-[#7357E9]">
            Better progress starts between sessions.
          </span>
        ) : null}
      </span>
    </span>
  )
}
