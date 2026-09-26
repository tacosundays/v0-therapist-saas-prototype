export function formatSubscriptionPlanLabel(
  plan: string | null | undefined,
  status?: string | null,
) {
  const normalizedStatus = status?.trim().toLowerCase()
  if (normalizedStatus === "trial" || normalizedStatus === "trialing") return "Trial"

  if (!plan) return null

  const normalizedPlan = plan.toLowerCase()
  if (normalizedPlan.includes("solo")) return "Solo"
  if (normalizedPlan.includes("growing")) return "Growing"
  if (normalizedPlan.includes("group")) return "Group Practice"

  return plan
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
