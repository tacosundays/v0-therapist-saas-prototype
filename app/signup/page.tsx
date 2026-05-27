"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Eye, EyeOff, ArrowLeft, Check, Loader2, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState<"therapist" | "client">("therapist")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [practiceName, setPracticeName] = useState("")
  const [credentials, setCredentials] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    
    // For clients, validate invite code first before creating account
    let therapistId: string | null = null
    let existingClientId: string | null = null
    if (userType === "client") {
      if (!inviteCode.trim()) {
        setError("Invite code is required for client signup")
        setIsLoading(false)
        return
      }

      // Look up invite code in clients table to get therapist_id and client_id
      const { data: clientData, error: clientLookupError } = await supabase
        .from("clients")
        .select("id, therapist_id, email")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .maybeSingle()

      if (clientLookupError) {
        console.error("Error validating invite code:", clientLookupError)
        setError("Error validating invite code. Please try again.")
        setIsLoading(false)
        return
      }

      if (!clientData) {
        setError("Invalid invite code. Please check with your therapist.")
        setIsLoading(false)
        return
      }

      therapistId = clientData.therapist_id
      existingClientId = clientData.id
    }
    
    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
          `${window.location.origin}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          role: userType,
          credentials: userType === "therapist" ? credentials : null,
          invite_code: userType === "client" ? inviteCode : null,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsLoading(false)
      return
    }

    // If therapist, insert into therapists table with 14-day free trial
    if (userType === "therapist" && authData.user) {
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 14) // 14-day trial
      
      const { error: insertError } = await supabase
        .from("therapists")
        .insert({
          id: authData.user.id,
          full_name: `${firstName} ${lastName}`,
          practice_name: practiceName || null,
          email: email,
          trial_end_date: trialEndDate.toISOString(),
          subscription_status: 'trialing',
        })

      if (insertError) {
        console.error("Error inserting therapist:", insertError)
      }
    }

    // If client, delete old client record and insert new one with id = auth.uid()
    if (userType === "client" && authData.user && existingClientId && therapistId) {
      const normalizedEmail = email.trim().toLowerCase()
      
      // First, delete the old client record (created by therapist with invite code)
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", existingClientId)

      if (deleteError) {
        console.error("Error deleting old client record:", deleteError)
      }

      // Insert new client record with id = auth.uid()
      const { error: clientInsertError } = await supabase
        .from("clients")
        .insert({
          id: authData.user.id,
          therapist_id: therapistId,
          full_name: `${firstName} ${lastName}`,
          email: normalizedEmail,
        })

      if (clientInsertError) {
        console.error("Error inserting client:", clientInsertError)
      }
    }

    setIsLoading(false)

    // If session exists (email confirmation disabled), redirect to appropriate page
    if (authData.session) {
      if (userType === "therapist") {
        router.push("/onboarding")
      } else {
        // Redirect client to their authenticated portal
        window.location.href = "/portal"
      }
      return
    }

    // No session means email confirmation is required - show verification message
    setShowVerificationMessage(true)
  }

  if (showVerificationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-muted-foreground mb-6">
            We sent a verification link to <span className="font-medium text-foreground">{email}</span>. 
            Click the link to verify your account and get started.
          </p>
          <div className="p-4 rounded-xl bg-muted/50 border border-border mb-6">
            <p className="text-sm text-muted-foreground">
              {"Didn't receive the email? Check your spam folder or "}
              <button 
                onClick={() => setShowVerificationMessage(false)}
                className="text-primary hover:underline"
              >
                try again
              </button>
              .
            </p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="rounded-xl">
              Back to login
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

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
              type="button"
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
              type="button"
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

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  className="h-12 rounded-xl"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  className="h-12 rounded-xl"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={isLoading}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {userType === "therapist" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="practiceName">Practice name (optional)</Label>
                  <Input
                    id="practiceName"
                    type="text"
                    placeholder="e.g., Mindful Therapy Associates"
                    className="h-12 rounded-xl"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credentials">Credentials / License (optional)</Label>
                  <Input
                    id="credentials"
                    type="text"
                    placeholder="e.g., LMFT, PhD, PsyD"
                    className="h-12 rounded-xl"
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {userType === "client" && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite code (from your therapist)</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Enter your invite code"
                  className="h-12 rounded-xl"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={isLoading}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
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
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
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
