import { PRODUCTS } from './products'

export interface PlanLimits {
  clientLimit: number | null // null = unlimited
  therapistLimit: number | null // null = unlimited
}

export const FREE_TRIAL_LIMITS: PlanLimits = {
  clientLimit: 20,
  therapistLimit: 1,
}

export function getPlanLimits(planId: string | null | undefined): PlanLimits {
  if (!planId) {
    return FREE_TRIAL_LIMITS
  }

  const product = PRODUCTS.find(p => p.id === planId)
  
  if (!product) {
    return FREE_TRIAL_LIMITS
  }

  // Enterprise = unlimited everything
  if (product.isEnterprise) {
    return {
      clientLimit: null,
      therapistLimit: null,
    }
  }

  // Group Practice = unlimited clients, limited therapists
  if (planId === 'group-practice') {
    return {
      clientLimit: null,
      therapistLimit: product.therapistLimit || 5,
    }
  }

  // Solo = limited clients
  return {
    clientLimit: product.clientLimit || 20,
    therapistLimit: 1,
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
