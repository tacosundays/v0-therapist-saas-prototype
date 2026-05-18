"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
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
          <p className="text-muted-foreground mb-8">
            {"We've sent a password reset link to your email address. Please check your inbox."}
          </p>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xl text-foreground">ShrinkAid</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Reset your password</h1>
        <p className="text-muted-foreground mb-8">
          {"Enter your email address and we'll send you a link to reset your password."}
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setSubmitted(true)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="h-12 rounded-xl"
            />
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl text-base">
            Send reset link
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
