import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { PracticeFit } from "@/components/landing/practice-fit"
import { Pricing } from "@/components/landing/pricing"
import { CTA } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <PracticeFit />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  )
}
