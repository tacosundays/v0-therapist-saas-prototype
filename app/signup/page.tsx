"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Eye, EyeOff, ArrowLeft, Check } from "lucide-react"

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState<"therapist" | "client">("therapist")

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl text-foreground">ShrinkAid</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-muted-foreground mb-8">Start your 14-day free trial. No credit card required.</p>

          {/* Role Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl mb-6">
            <button
              onClick={() => setUserType("therapist")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                userType === "therapist"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Therapist
            </button>
            <button
              onClick={() => setUserType("client")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                userType === "client"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Client
            </button>
          </div>

          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl"
              />
            </div>

            {userType === "therapist" && (
              <div className="space-y-2">
                <Label htmlFor="credentials">Credentials / License</Label>
                <Input
                  id="credentials"
                  type="text"
                  placeholder="e.g., LMFT, PhD, PsyD"
                  className="h-12 rounded-xl"
                />
              </div>
            )}

            {userType === "client" && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite code (from your therapist)</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Enter your invite code"
                  className="h-12 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  className="h-12 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base"
              asChild
            >
              <Link href={userType === "therapist" ? "/onboarding" : "/portal"}>
                Create account
              </Link>
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Benefits */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md"
        >
          <h2 className="text-2xl font-bold text-foreground mb-8">
            Why therapists love ShrinkAid
          </h2>
          <ul className="space-y-4">
            {[
              "200+ evidence-based worksheets and exercises",
              "AI-powered homework recommendations",
              "Real-time client progress tracking",
              "Clean, distraction-free client portal",
              "HIPAA compliant and secure"
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <span className="text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
