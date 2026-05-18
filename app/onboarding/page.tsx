"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Brain, ArrowRight, ArrowLeft, Check, Users, BookOpen, Target } from "lucide-react"

const steps = [
  {
    title: "Tell us about your practice",
    description: "Help us personalize your experience"
  },
  {
    title: "Your therapy approach",
    description: "Select the modalities you use most"
  },
  {
    title: "Set up your first client",
    description: "You can always add more later"
  }
]

const modalities = [
  "Cognitive Behavioral Therapy (CBT)",
  "Dialectical Behavior Therapy (DBT)",
  "Acceptance and Commitment Therapy (ACT)",
  "EMDR",
  "Psychodynamic",
  "Person-Centered",
  "Solution-Focused Brief Therapy",
  "Motivational Interviewing"
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedModalities, setSelectedModalities] = useState<string[]>([])
  const [practiceName, setPracticeName] = useState("")
  const [clientCount, setClientCount] = useState<string | null>(null)

  const toggleModality = (modality: string) => {
    setSelectedModalities((prev) =>
      prev.includes(modality)
        ? prev.filter((m) => m !== modality)
        : [...prev, modality]
    )
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push("/dashboard")
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">ShrinkAid</span>
          </div>
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-8 h-1.5 rounded-full transition-colors ${
                  index <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {steps[currentStep].title}
                </h1>
                <p className="text-muted-foreground">
                  {steps[currentStep].description}
                </p>
              </div>

              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="practiceName">Practice name</Label>
                    <Input
                      id="practiceName"
                      placeholder="e.g., Mindful Growth Therapy"
                      className="h-12 rounded-xl"
                      value={practiceName}
                      onChange={(e) => setPracticeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practiceSize">How many clients do you see weekly?</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {["1-10", "11-25", "26+"].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setClientCount(size)}
                          className={`p-4 rounded-xl border transition-all text-center ${
                            clientCount === size
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          <Users className={`w-6 h-6 mx-auto mb-2 ${
                            clientCount === size ? "text-primary" : "text-primary"
                          }`} />
                          <span className="text-sm font-medium text-foreground">{size}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Brief bio (optional)</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell your clients a bit about yourself..."
                      className="rounded-xl min-h-24"
                    />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    Select all that apply. This helps us recommend relevant homework content.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {modalities.map((modality) => (
                      <button
                        key={modality}
                        onClick={() => toggleModality(modality)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedModalities.includes(modality)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                              selectedModalities.includes(modality)
                                ? "bg-primary border-primary"
                                : "border-border"
                            }`}
                          >
                            {selectedModalities.includes(modality) && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground">{modality}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientFirstName">Client first name</Label>
                      <Input
                        id="clientFirstName"
                        placeholder="Jane"
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientLastName">Client last name</Label>
                      <Input
                        id="clientLastName"
                        placeholder="Doe"
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Client email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="client@example.com"
                      className="h-12 rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      {"We'll send them an invite to access their homework portal"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="treatmentGoal">Primary treatment goal</Label>
                    <Input
                      id="treatmentGoal"
                      placeholder="e.g., Anxiety management"
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Skip for now?</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You can add clients anytime from your dashboard
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={nextStep} 
              className="rounded-xl"
              disabled={currentStep === 0 && (!practiceName.trim() || !clientCount)}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Go to dashboard
                  <Target className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
