import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return <svg className={cn("h-10 w-10", className)} viewBox="0 0 48 48" role="img" aria-label="SessionSteps logo">
    <defs><linearGradient id="sessionsteps-mark" x1="7" y1="5" x2="41" y2="43" gradientUnits="userSpaceOnUse"><stop stopColor="#7C6CFF"/><stop offset="1" stopColor="#5547EE"/></linearGradient></defs>
    <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#sessionsteps-mark)"/>
    <path d="M12 33h8v-7h8v-7h8v-7" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="13" cy="33" r="2.4" fill="#83E1D3"/><circle cx="36" cy="12" r="2.4" fill="#83E1D3"/>
  </svg>
}
