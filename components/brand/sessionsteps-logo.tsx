import { cn } from "@/lib/utils"

type SessionStepsMarkProps = {
  className?: string
  title?: string
}

export function SessionStepsMark({ className, title }: SessionStepsMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <ellipse cx="15" cy="36" rx="11" ry="4.6" fill="#6537D7" />
      <ellipse cx="21.5" cy="27" rx="9" ry="3.9" fill="#6D47DF" />
      <ellipse cx="28" cy="19" rx="7" ry="3.2" fill="#785EE9" />
      <ellipse cx="34" cy="12" rx="5" ry="2.5" fill="#8B7AF4" />
    </svg>
  )
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <SessionStepsMark className={cn("h-9 w-9", markClassName)} />
      <span className="min-w-0">
        <span className={cn("block font-serif font-medium tracking-[-0.035em] text-[#11133D]", wordmarkClassName)}>
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
