import { getProductById, normalizeProductId } from './products'

export interface PlanLimits {
  clientLimit: number | null // null = unlimited
  therapistLimit: number | null // null = unlimited
}

export const FREE_TRIAL_LIMITS: PlanLimits = {
  clientLimit: 3,
  therapistLimit: 1,
}

export function getPlanLimits(planId: string | null | undefined): PlanLimits {
  const normalizedPlanId = normalizeProductId(planId)

  if (!normalizedPlanId || normalizedPlanId === "free") {
    return FREE_TRIAL_LIMITS
  }

  const product = getProductById(normalizedPlanId)
  
  if (!product) {
    return FREE_TRIAL_LIMITS
  }

  return {
    clientLimit: product.clientLimit,
    therapistLimit: product.therapistLimit || 1,
  }
}

export function canAddClient(planId: string | null | undefined, currentClientCount: number): boolean {
  const limits = getPlanLimits(planId)
  
  // Unlimited
  if (limits.clientLimit === null) {
    return true
  }
  
  return currentClientCount < limits.clientLimit
}

export function getClientLimitDisplay(planId: string | null | undefined): string {
  const limits = getPlanLimits(planId)
  
  if (limits.clientLimit === null) {
    return 'Unlimited'
  }
  
  return limits.clientLimit.toString()
}
