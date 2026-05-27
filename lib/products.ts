export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  interval: "month" | "year"
  features: string[]
  clientLimit?: number
  therapistLimit?: number
  isPopular?: boolean
  isEnterprise?: boolean
}

export const PRODUCTS: Product[] = [
  {
    id: "solo",
    name: "Solo",
    description: "Perfect for individual therapists",
    priceInCents: 4900, // $49/month
    interval: "month",
    clientLimit: 20,
    features: [
      "Up to 20 clients",
      "Unlimited homework assignments",
      "Client portal access",
      "Content library",
      "Progress tracking",
      "Email support",
    ],
  },
  {
    id: "group-practice",
    name: "Group Practice",
    description: "For growing practices with multiple therapists",
    priceInCents: 14900, // $149/month
    interval: "month",
    therapistLimit: 5,
    isPopular: true,
    features: [
      "Up to 5 therapists",
      "Unlimited clients",
      "All Solo features",
      "Team collaboration",
      "Shared content library",
      "Priority support",
      "Analytics dashboard",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    priceInCents: 0, // Custom pricing
    interval: "month",
    isEnterprise: true,
    features: [
      "Unlimited therapists",
      "Unlimited clients",
      "All Group Practice features",
      "Custom integrations",
      "Dedicated account manager",
      "HIPAA compliance support",
      "SSO & advanced security",
      "Custom training",
    ],
  },
]

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id)
}
