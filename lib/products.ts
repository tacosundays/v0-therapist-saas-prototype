export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  interval: "month" | "year"
  features: string[]
  clientLimit: number | null
  therapistLimit?: number
  isPopular?: boolean
  priceEnvVar: string
  contactSalesIfMissingPrice?: boolean
}

export const PRODUCTS: Product[] = [
  {
    id: "solo-practice",
    name: "Solo Practice",
    description: "Perfect for individual therapists just getting started",
    priceInCents: 2900,
    interval: "month",
    clientLimit: 25,
    priceEnvVar: "STRIPE_SOLO_PRICE_ID",
    features: [
      "Up to 25 active clients",
      "Full content library (200+ exercises)",
      "Client portal access",
      "Progress tracking",
      "Email support",
      "Basic analytics",
    ],
  },
  {
    id: "growing-practice",
    name: "Growing Practice",
    description: "For therapists scaling their impact",
    priceInCents: 7900,
    interval: "month",
    clientLimit: 75,
    priceEnvVar: "STRIPE_GROWING_PRICE_ID",
    isPopular: true,
    features: [
      "Up to 75 active clients",
      "Everything in Solo, plus:",
      "AI homework suggestions",
      "Custom worksheet builder",
      "Priority support",
      "Advanced analytics",
      "Client satisfaction tracking",
    ],
  },
  {
    id: "group-practice",
    name: "Group Practice",
    description: "For multi-therapist practices",
    priceInCents: 19900,
    interval: "month",
    clientLimit: null,
    therapistLimit: 5,
    priceEnvVar: "STRIPE_GROUP_PRICE_ID",
    contactSalesIfMissingPrice: true,
    features: [
      "Unlimited clients",
      "Everything in Growing, plus:",
      "Up to 5 therapist seats",
      "Practice-wide analytics",
      "Custom branding",
      "Dedicated success manager",
      "HIPAA BAA included",
    ],
  },
]

export function normalizeProductId(id: string | null | undefined): string | null {
  if (!id) return null

  const normalized = id.trim().toLowerCase()

  if (normalized === "solo") return "solo-practice"
  if (normalized === "growing") return "growing-practice"
  if (normalized === "group" || normalized === "enterprise") return "group-practice"

  return normalized
}

export function getProductById(id: string): Product | undefined {
  const normalizedId = normalizeProductId(id)
  return PRODUCTS.find((product) => product.id === normalizedId)
}

export function getStripePriceId(productId: string): string | null {
  const product = getProductById(productId)
  if (!product) return null

  return process.env[product.priceEnvVar] || null
}
