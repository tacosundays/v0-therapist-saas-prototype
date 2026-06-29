"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react"
import { getClient, getSupabaseBrowserConfigStatus } from "@/lib/supabase/client"
import { checkUserRole } from "@/lib/auth/check-user-role"
import { logClientAuditEvent } from "@/lib/audit-client"

const AUTH_TIMEOUT_MS = 15000

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Please check your connection and try again.`))
    }, AUTH_TIMEOUT_MS)

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer))
  })
}

function getSupabaseEnvError() {
  const config = getSupabaseBrowserConfigStatus()

  if (!config.hasUrl || !config.hasAnonKey) {
    return "Supabase is not configured for this deployment. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel."
  }

  if (!config.urlValid) {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL in this deployment."
  }

  return null
}

function getAuthErrorMessage(err: unknown, stage: string) {
  const message = err instanceof Error ? err.message : String(err || "Unknown error")

  if (message.toLowerCase().includes("failed to fetch")) {
    return `${stage} could not reach Supabase Auth. Check the Supabase project URL, anon key, browser network access, and allowed site URL/CORS settings.`
  }

  return `${stage} failed: ${message}`
}

function logLoginStage(stage: string, details?: Record<string, unknown>) {
  console.info(`[v0] Login debug: ${stage}`, {
    ...details,
    timestamp: new Date().toISOString(),
  })
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState<"therapist" | "client">("therapist")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mfaCode, setMfaCode] = useState("")
  const [mfaRecoveryCode, setMfaRecoveryCode] = useState("")
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [isMfaStep, setIsMfaStep] = useState(false)
  const [mfaMode, setMfaMode] = useState<"totp" | "recovery">("totp")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // Check session once on mount - if already logged in, redirect based on role
  useEffect(() => {
    let isMounted = true
    
    const checkSession = async () => {
      console.log("[v0] Login page: Checking existing session")

      try {
        logLoginStage("session-check:start", {
          supabaseConfig: getSupabaseBrowserConfigStatus(),
        })
        const result = await withTimeout(checkUserRole(), "Session check")

        if (!isMounted) return

        logLoginStage("session-check:result", {
          isAuthenticated: result.isAuthenticated,
          role: result.role,
          hasTherapistRecord: Boolean(result.therapistRecord),
          hasClientRecord: Boolean(result.clientRecord),
          error: result.error,
        })
        console.log("[v0] Login page: Session check result:", {
          isAuthenticated: result.isAuthenticated,
          role: result.role,
          userId: result.user?.id,
          email: result.user?.email
        })

        if (result.isAuthenticated) {
          if (result.role === "client") {
            console.log("[v0] Login page: Already logged in as client, redirecting to /client-portal")
            window.location.href = "/client-portal"
          } else if (result.role === "therapist") {
            console.log("[v0] Login page: Already logged in as therapist, redirecting to /dashboard")
            window.location.href = "/dashboard"
          } else {
            setError(result.error || "Unable to determine your account type. Please sign out and try again.")
            setIsCheckingSession(false)
          }
          return
        }

        console.log("[v0] Login page: No existing session, showing login form")
        setIsCheckingSession(false)
      } catch (err) {
        if (!isMounted) return
        console.error("[v0] Login page: Session check failed:", err)
        setError(getAuthErrorMessage(err, "Session check"))
        setIsCheckingSession(false)
      }
    }
    
    checkSession()
    
    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    let authStage = "Login"

    try {
      logLoginStage("env-check:start")
      const envError = getSupabaseEnvError()
      const supabaseConfig = getSupabaseBrowserConfigStatus()
      logLoginStage("env-check:result", {
        ...supabaseConfig,
        hasError: Boolean(envError),
      })

      if (envError) {
        setError(envError)
        setIsLoading(false)
        return
      }

      authStage = "Supabase client creation"
      logLoginStage("supabase-client:start")
      const supabase = getClient()
      logLoginStage("supabase-client:result", {
        created: Boolean(supabase),
        supabaseConfig: getSupabaseBrowserConfigStatus(),
      })

      authStage = "Sign in"
      logLoginStage("signInWithPassword:start", {
        email,
      })
      const { data, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        "Sign in"
      )

      if (signInError) {
        console.error("[v0] Login: Sign in error:", signInError.message)
        logLoginStage("signInWithPassword:result", {
          success: false,
          errorName: signInError.name,
          errorMessage: signInError.message,
          status: "status" in signInError ? signInError.status : undefined,
        })
        setError(getAuthErrorMessage(signInError, authStage))
        setIsLoading(false)
        return
      }

      logLoginStage("signInWithPassword:result", {
        success: true,
        hasUser: Boolean(data.user),
        hasSession: Boolean(data.session),
        userId: data.user?.id,
        email: data.user?.email,
      })
      console.log("[v0] Login: Sign in success, user id:", data.user?.id)
      console.log("[v0] Login: User email:", data.user?.email)
      console.log("[v0] Login: User role from metadata:", data.user?.user_metadata?.role)

      // Resolve account type first. This keeps client login away from therapist-only
      // MFA checks and gives Supabase Auth a settled session before listing factors.
      authStage = "Account lookup"
      logLoginStage("account-lookup:start")
      const result = await withTimeout(checkUserRole(), "Account lookup")

      logLoginStage("account-lookup:result", {
        role: result.role,
        isAuthenticated: result.isAuthenticated,
        therapistId: result.therapistRecord?.id ?? null,
        clientId: result.clientRecord?.id ?? null,
        clientTherapistId: result.clientRecord?.therapist_id ?? null,
        hasTherapistRecord: Boolean(result.therapistRecord),
        hasClientRecord: Boolean(result.clientRecord),
        error: result.error,
      })
      logLoginStage("therapist-lookup:result", {
        found: Boolean(result.therapistRecord),
        therapistId: result.therapistRecord?.id ?? null,
      })
      logLoginStage("client-lookup:result", {
        found: Boolean(result.clientRecord),
        clientId: result.clientRecord?.id ?? null,
        therapistId: result.clientRecord?.therapist_id ?? null,
      })
      console.log("[v0] Login: Role check result:", {
        role: result.role,
        hasTherapistRecord: !!result.therapistRecord,
        hasClientRecord: !!result.clientRecord
      })

      if (!result.isAuthenticated || result.role === "unknown") {
        setError(result.error || "Unable to determine your account type. Please contact support.")
        setIsLoading(false)
        return
      }

      if (result.role === "therapist" && result.therapistRecord) {
        const supabaseAny = supabase as any
        authStage = "MFA check"
        logLoginStage("mfa-check:start", {
          therapistId: result.therapistRecord.id,
        })
        const { data: factorsData, error: factorsError } = await withTimeout<any>(
          supabaseAny.auth.mfa.listFactors(),
          "MFA check"
        )

        if (factorsError) {
          console.error("[v0] Login: MFA factors error:", factorsError.message)
          logLoginStage("mfa-check:result", {
            success: false,
            errorMessage: factorsError.message,
          })
          setError(getAuthErrorMessage(factorsError, authStage))
          setIsLoading(false)
          return
        }

        const verifiedTotp = (factorsData?.totp || []).find((factor: { id: string; status: string }) => factor.status === "verified")
        logLoginStage("mfa-check:result", {
          success: true,
          totpCount: factorsData?.totp?.length ?? 0,
          hasVerifiedTotp: Boolean(verifiedTotp),
        })

        if (verifiedTotp) {
          authStage = "MFA assurance check"
          logLoginStage("mfa-assurance:start")
          const { data: aalData, error: aalError } = await withTimeout<any>(
            supabaseAny.auth.mfa.getAuthenticatorAssuranceLevel(),
            "MFA assurance check"
          )

          if (aalError) {
            console.error("[v0] Login: MFA AAL error:", aalError.message)
            logLoginStage("mfa-assurance:result", {
              success: false,
              errorMessage: aalError.message,
            })
            setError(getAuthErrorMessage(aalError, authStage))
            setIsLoading(false)
            return
          }

          logLoginStage("mfa-assurance:result", {
            success: true,
            currentLevel: aalData?.currentLevel,
            nextLevel: aalData?.nextLevel,
          })

          if (aalData?.currentLevel !== "aal2" && aalData?.nextLevel === "aal2") {
            setMfaFactorId(verifiedTotp.id)
            setIsMfaStep(true)
            setIsLoading(false)
            return
          }
        }
      }

      authStage = "Audit logging"
      logLoginStage("audit-log:start", {
        role: result.role,
      })
      await logClientAuditEvent({
        action: "login",
        resourceType: "auth",
        details: {
          role: result.role,
        },
      })

      if (result.role === "client") {
        logLoginStage("redirect:target", {
          target: "/client-portal",
        })
        console.log("[v0] Login: Redirecting to /client-portal")
        window.location.href = "/client-portal"
      } else {
        logLoginStage("redirect:target", {
          target: "/dashboard",
        })
        console.log("[v0] Login: Redirecting to /dashboard")
        window.location.href = "/dashboard"
      }
    } catch (err) {
      console.error("[v0] Login: Unexpected error:", err)
      setError(getAuthErrorMessage(err, authStage))
      setIsLoading(false)
    }
  }

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    let authStage = "MFA verification"

    try {
      logLoginStage("mfa-env-check:start")
      const envError = getSupabaseEnvError()
      logLoginStage("mfa-env-check:result", {
        ...getSupabaseBrowserConfigStatus(),
        hasError: Boolean(envError),
      })

      if (envError) {
        setError(envError)
        setIsLoading(false)
        return
      }

      authStage = "Supabase client creation"
      logLoginStage("mfa-supabase-client:start")
      const supabase = getClient() as any
      logLoginStage("mfa-supabase-client:result", {
        created: Boolean(supabase),
      })

      if (mfaMode === "recovery") {
        authStage = "MFA recovery session check"
        logLoginStage("mfa-recovery-session:start")
        const { data: { session } } = await withTimeout<any>(
          supabase.auth.getSession(),
          "MFA recovery session check"
        )

        if (!session?.access_token) {
          setError("Your login session expired. Please sign in again.")
          setIsLoading(false)
          return
        }

        authStage = "Recovery code verification"
        logLoginStage("mfa-recovery-code:start")
        const response = await fetch("/api/mfa/recovery-codes", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code: mfaRecoveryCode }),
        })
        const result = await response.json().catch(() => null)

        if (!response.ok) {
          logLoginStage("mfa-recovery-code:result", {
            success: false,
            status: response.status,
            error: result?.error,
          })
          setError(result?.error || "Invalid recovery code")
          setIsLoading(false)
          return
        }

        logLoginStage("mfa-recovery-code:result", {
          success: true,
        })
        logLoginStage("redirect:target", {
          target: "/dashboard",
        })
        window.location.href = "/dashboard"
        return
      }

      if (!mfaFactorId) {
        setError("No MFA factor found. Please sign in again.")
        setIsLoading(false)
        return
      }

      authStage = "MFA verification"
      logLoginStage("mfa-verification:start")
      const { error: verifyError } = await withTimeout<any>(
        supabase.auth.mfa.challengeAndVerify({
          factorId: mfaFactorId,
          code: mfaCode.trim(),
        }),
        "MFA verification"
      )

      if (verifyError) {
        logLoginStage("mfa-verification:result", {
          success: false,
          errorMessage: verifyError.message,
        })
        setError(verifyError.message)
        setIsLoading(false)
        return
      }

      logLoginStage("mfa-verification:result", {
        success: true,
      })
      authStage = "Account lookup"
      logLoginStage("post-mfa-account-lookup:start")
      const result = await withTimeout(checkUserRole(), "Account lookup")
      logLoginStage("post-mfa-account-lookup:result", {
        role: result.role,
        therapistId: result.therapistRecord?.id ?? null,
        clientId: result.clientRecord?.id ?? null,
        error: result.error,
      })

      if (result.role === "client") {
        logLoginStage("redirect:target", {
          target: "/client-portal",
        })
        window.location.href = "/client-portal"
      } else if (result.role === "therapist") {
        logLoginStage("redirect:target", {
          target: "/dashboard",
        })
        window.location.href = "/dashboard"
      } else {
        setError(result.error || "Unable to determine your account type. Please contact support.")
        setIsLoading(false)
      }
    } catch (err) {
      console.error("[v0] Login: MFA verification error:", err)
      setError(getAuthErrorMessage(err, authStage))
      setIsLoading(false)
    }
  }

  // Show loading screen while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
          <p className="mt-2 text-xs text-muted-foreground">Checking your session</p>
        </div>
      </div>
    )
  }

  if (isMfaStep) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl text-foreground">ShrinkAid</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Verify your login</h1>
          <p className="text-muted-foreground mb-6">Enter the code from your authenticator app to continue.</p>

          <div className="flex gap-2 p-1 bg-muted rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMfaMode("totp")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                mfaMode === "totp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Authenticator
            </button>
            <button
              type="button"
              onClick={() => setMfaMode("recovery")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                mfaMode === "recovery" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Recovery code
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyMfa} className="space-y-4">
            {mfaMode === "totp" ? (
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Authenticator code</Label>
                <Input
                  id="mfaCode"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="123456"
                  className="h-12 rounded-xl"
                  required
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="mfaRecoveryCode">Recovery code</Label>
                <Input
                  id="mfaRecoveryCode"
                  value={mfaRecoveryCode}
                  onChange={(event) => setMfaRecoveryCode(event.target.value)}
                  placeholder="ABCD-1234-EFGH"
                  className="h-12 rounded-xl uppercase"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base"
              disabled={isLoading || (mfaMode === "totp" ? !mfaCode.trim() : !mfaRecoveryCode.trim())}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify and continue"
              )}
            </Button>
          </form>
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

          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>

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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Therapy that works between sessions
          </h2>
          <p className="text-muted-foreground">
            Assign meaningful homework, track progress, and help your clients grow - all from one calm dashboard.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
