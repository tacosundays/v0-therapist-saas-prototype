import { generateText, Output } from "ai"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { writeAuditLog } from "../../../lib/audit-log.ts"
import { checkRateLimit } from "../../../lib/security/rate-limit.ts"
import { genericError, getBearerToken, getRequestIp } from "../../../lib/security/request.ts"

const worksheetSchema = z.object({
  title: z.string().describe("A clear, engaging title for the worksheet"),
  educationalContent: z.string().describe("2-3 paragraphs of psychoeducational content explaining the topic"),
  reflectionQuestions: z.array(z.string()).describe("Thought-provoking reflection questions"),
  exercises: z.array(z.object({
    title: z.string(),
    instructions: z.string(),
  })).describe("Practical exercises with clear instructions"),
  journalPrompts: z.array(z.string()).describe("Journal prompts for deeper self-exploration"),
  interactiveQuestions: z.array(z.object({
    questionText: z.string().describe("The question to ask the client"),
    questionType: z.enum(["short_text", "long_text", "scale", "multiple_choice"]).describe("Type of input field"),
    options: z.array(z.string()).nullable().describe("Options for multiple_choice type, null for others"),
  })).describe("5-8 interactive questions for the client to complete online"),
})

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  goal: z.string().trim().min(2).max(240),
  clientIssue: z.string().trim().max(750).optional().nullable(),
}).strict()

const maxPayloadBytes = 4096
const ipWindowMs = 60_000
const userWindowMs = 10 * 60_000
const ipLimit = 20
const userLimit = 10

type AuthUser = {
  id: string
  email?: string | null
}

type TherapistRecord = {
  id: string
  email?: string | null
  subscription_status?: string | null
  status?: string | null
}

type SupabaseQueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type AuthClient = {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: AuthUser | null }; error: { message?: string } | null }>
  }
}

type AdminClient = {
  from: (table: string) => {
    select: (columns: string) => {
      ilike: (column: string, value: string) => {
        maybeSingle: () => Promise<SupabaseQueryResult<TherapistRecord>>
      }
    }
  }
}

type GenerateWorksheetDeps = {
  createAuthClient: () => AuthClient
  createAdminClient: () => AdminClient
  generateWorksheet: (input: z.infer<typeof requestSchema>) => Promise<unknown>
  audit: typeof writeAuditLog
  rateLimit: typeof checkRateLimit
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isActiveTherapist(therapist: TherapistRecord) {
  const status = (therapist.status || therapist.subscription_status || "active").toLowerCase()
  return !["inactive", "disabled", "suspended", "removed", "archived"].includes(status)
}

function createDefaultAuthClient(): AuthClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Worksheet generation auth is not configured")
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

function createDefaultAdminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Worksheet generation service is not configured")
  }

  return createClient(supabaseUrl, serviceRoleKey) as unknown as AdminClient
}

async function defaultGenerateWorksheet(input: z.infer<typeof requestSchema>) {
  const prompt = [
    "You are creating a therapist-reviewed, evidence-informed worksheet template.",
    "Use only the supplied worksheet topic, therapeutic goal, and optional client context.",
    "Do not add diagnoses, client names, or invented clinical facts.",
    "",
    `Topic: ${input.topic}`,
    `Therapeutic Goal: ${input.goal}`,
    input.clientIssue ? `Optional therapist-provided context: ${input.clientIssue}` : "",
    "",
    "Generate a complete worksheet including educational content, reflection questions, exercises, journal prompts, and online form questions.",
  ].filter(Boolean).join("\n")

  const result = await generateText({
    model: "openai/gpt-4o-mini",
    output: Output.object({
      schema: worksheetSchema,
    }),
    prompt,
  })

  return result.output
}

export function createGenerateWorksheetDeps(): GenerateWorksheetDeps {
  return {
    createAuthClient: createDefaultAuthClient,
    createAdminClient: createDefaultAdminClient,
    generateWorksheet: defaultGenerateWorksheet,
    audit: writeAuditLog,
    rateLimit: checkRateLimit,
  }
}

async function auditWorksheetEvent(
  deps: GenerateWorksheetDeps,
  action: string,
  therapist: TherapistRecord | null,
  user: AuthUser | null,
  ipAddress: string,
  userAgent: string | null,
  details: Record<string, unknown> = {},
) {
  await deps.audit({
    therapistId: therapist?.id || null,
    userId: user?.id || null,
    actorRole: therapist ? "therapist" : user ? "unknown" : "system",
    action,
    resourceType: "worksheet_generation",
    details,
    ipAddress,
    userAgent,
  })
}

export async function handleGenerateWorksheetRequest(req: Request, deps = createGenerateWorksheetDeps()) {
  const ipAddress = getRequestIp(req)
  const userAgent = req.headers.get("user-agent")
  let user: AuthUser | null = null
  let therapist: TherapistRecord | null = null

  try {
    const ipLimitResult = deps.rateLimit(`generate-worksheet:ip:${ipAddress}`, ipLimit, ipWindowMs)
    if (!ipLimitResult.allowed) {
      return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    const bearerToken = getBearerToken(req)
    if (!bearerToken) {
      return genericError(401)
    }

    const authClient = deps.createAuthClient()
    const { data: { user: authUser }, error: userError } = await authClient.auth.getUser(bearerToken)
    if (userError || !authUser?.email) {
      return genericError(401)
    }
    user = authUser

    const userLimitResult = deps.rateLimit(`generate-worksheet:user:${user.id}:ip:${ipAddress}`, userLimit, userWindowMs)
    if (!userLimitResult.allowed) {
      return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    const adminClient = deps.createAdminClient()
    const { data: therapistRecord, error: therapistError } = await adminClient
      .from("therapists")
      .select("id, email, subscription_status")
      .ilike("email", normalizeEmail(authUser.email))
      .maybeSingle()

    if (therapistError || !therapistRecord || !isActiveTherapist(therapistRecord)) {
      return genericError(403)
    }
    therapist = therapistRecord

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > maxPayloadBytes) {
      await auditWorksheetEvent(deps, "worksheet.generate_failed", therapist, user, ipAddress, userAgent, { reason: "payload_too_large" })
      return genericError(413)
    }

    const parsedJson = JSON.parse(rawBody) as unknown
    const parsedInput = requestSchema.safeParse(parsedJson)
    if (!parsedInput.success) {
      await auditWorksheetEvent(deps, "worksheet.generate_failed", therapist, user, ipAddress, userAgent, { reason: "invalid_input" })
      return genericError(400)
    }

    await auditWorksheetEvent(deps, "worksheet.generate_requested", therapist, user, ipAddress, userAgent)
    const worksheet = await deps.generateWorksheet(parsedInput.data)
    await auditWorksheetEvent(deps, "worksheet.generate_succeeded", therapist, user, ipAddress, userAgent)

    return Response.json({ worksheet })
  } catch (error) {
    console.warn("[security] Worksheet generation failed", {
      hasUser: Boolean(user),
      hasTherapist: Boolean(therapist),
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    await auditWorksheetEvent(deps, "worksheet.generate_failed", therapist, user, ipAddress, userAgent, { reason: "internal_error" })
    return genericError(500)
  }
}
