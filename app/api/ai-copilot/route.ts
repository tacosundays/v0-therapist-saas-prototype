import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resolveTenantContext } from "@/lib/tenant-context"

const defaultModel = "gpt-4o-mini"
const disclaimer = "AI suggestions are for therapist review and do not replace clinical judgment."

type CopilotSection = {
  summary: string
  citations: string[]
}

type StructuredAnswer = {
  summary: string
  keyFindings: string[]
  recommendedNextSteps: string[]
  supportingData: string[]
  clinicalReminder: string
}

type CopilotResponse = {
  answer: string
  structuredAnswer: StructuredAnswer
  suggestedFollowUps: string[]
  recommendedHomework: {
    clientId?: string | null
    clientName?: string | null
    title: string
    description: string
  } | null
  primaryClient: {
    id: string
    name: string
  } | null
  sources: {
    homework: CopilotSection
    reflections: CopilotSection
    moodCheckIns: CopilotSection
    sessionNotes: CopilotSection
  }
}

type ClientRecord = {
  id: string
  full_name: string
  status: string | null
  created_at: string | null
  user_id: string | null
  invite_sent_at: string | null
  invite_accepted_at: string | null
}

type DatedClientRecord = {
  client_id: string
  created_at?: string | null
  assigned_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  status?: string | null
  completed?: boolean | null
  reflection?: string | null
  mood_rating?: number | null
  anxiety_rating?: number | null
  stress_rating?: number | null
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const errorObject = error as { message?: string; details?: string; hint?: string; code?: string }
    return [
      errorObject.message,
      errorObject.details ? `Details: ${errorObject.details}` : null,
      errorObject.hint ? `Hint: ${errorObject.hint}` : null,
      errorObject.code ? `Code: ${errorObject.code}` : null,
    ].filter(Boolean).join(" ")
  }
  return "Unknown error"
}

function getDefaultSection(label: string): CopilotSection {
  return {
    summary: `No ${label} data was found in the retrieved therapist-owned records.`,
    citations: [],
  }
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const items = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 6)
  return items.length ? items : fallback
}

function normalizeStructuredAnswer(value: Partial<StructuredAnswer> | undefined, fallbackAnswer: string): StructuredAnswer {
  return {
    summary: typeof value?.summary === "string" && value.summary.trim()
      ? value.summary.trim()
      : fallbackAnswer,
    keyFindings: asStringArray(value?.keyFindings, ["No grounded key findings were returned from the available records."]),
    recommendedNextSteps: asStringArray(value?.recommendedNextSteps, ["Review the available client data and decide what belongs in the care plan."]),
    supportingData: asStringArray(value?.supportingData, ["The response was limited to the retrieved therapist-owned records."]),
    clinicalReminder: typeof value?.clinicalReminder === "string" && value.clinicalReminder.trim()
      ? value.clinicalReminder.trim()
      : disclaimer,
  }
}

function formatStructuredAnswer(answer: StructuredAnswer) {
  return [
    "Summary",
    answer.summary,
    "",
    "Key Findings",
    ...answer.keyFindings.map((item) => `- ${item}`),
    "",
    "Recommended Next Steps",
    ...answer.recommendedNextSteps.map((item) => `- ${item}`),
    "",
    "Supporting Data",
    ...answer.supportingData.map((item) => `- ${item}`),
    "",
    "Clinical Reminder",
    answer.clinicalReminder,
  ].join("\n")
}

function normalizeCopilotResponse(rawResponse: unknown, fallbackPrimaryClient: CopilotResponse["primaryClient"]): CopilotResponse {
  const value = rawResponse && typeof rawResponse === "object" ? rawResponse as Partial<CopilotResponse> : {}
  const rawSources = value.sources && typeof value.sources === "object" ? value.sources as Partial<CopilotResponse["sources"]> : {}

  const normalizeSection = (section: unknown, label: string): CopilotSection => {
    const sectionValue = section && typeof section === "object" ? section as Partial<CopilotSection> : {}
    return {
      summary: typeof sectionValue.summary === "string" && sectionValue.summary.trim()
        ? sectionValue.summary.trim()
        : getDefaultSection(label).summary,
      citations: Array.isArray(sectionValue.citations)
        ? sectionValue.citations.filter((citation): citation is string => typeof citation === "string" && citation.trim().length > 0).slice(0, 8)
        : [],
    }
  }

  const rawAnswer = typeof value.answer === "string" && value.answer.trim()
    ? value.answer.trim()
    : "I could not generate a grounded answer from the available therapist-owned data."
  const structuredAnswer = normalizeStructuredAnswer(value.structuredAnswer, rawAnswer)
  const recommendedHomework = value.recommendedHomework
    && typeof value.recommendedHomework === "object"
    && typeof value.recommendedHomework.title === "string"
    && typeof value.recommendedHomework.description === "string"
    ? {
        clientId: typeof value.recommendedHomework.clientId === "string" ? value.recommendedHomework.clientId : fallbackPrimaryClient?.id ?? null,
        clientName: typeof value.recommendedHomework.clientName === "string" ? value.recommendedHomework.clientName : fallbackPrimaryClient?.name ?? null,
        title: value.recommendedHomework.title.trim(),
        description: value.recommendedHomework.description.trim(),
      }
    : null

  return {
    answer: formatStructuredAnswer(structuredAnswer),
    structuredAnswer,
    suggestedFollowUps: asStringArray(value.suggestedFollowUps, [
      "Which client should I review first?",
      "What data supports that recommendation?",
      "What should I prepare before the next session?",
    ]),
    recommendedHomework,
    primaryClient: fallbackPrimaryClient,
    sources: {
      homework: normalizeSection(rawSources.homework, "homework"),
      reflections: normalizeSection(rawSources.reflections, "reflection"),
      moodCheckIns: normalizeSection(rawSources.moodCheckIns, "mood check-in"),
      sessionNotes: normalizeSection(rawSources.sessionNotes, "session note"),
    },
  }
}

async function fetchOptionalData<T>(
  label: string,
  query: PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
) {
  const result = await query
  if (result.error) {
    console.warn(`[v0] AI Copilot: ${label} unavailable`, result.error)
    return fallback
  }
  return result.data ?? fallback
}

function toTime(value?: string | null) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatDate(value?: string | null) {
  if (!value) return "No date"
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getClientName(clientById: Map<string, ClientRecord>, clientId: string | null | undefined) {
  return clientId ? clientById.get(clientId)?.full_name || "Client" : "Client"
}

function latestActivityAt(client: ClientRecord, records: DatedClientRecord[]) {
  return Math.max(
    toTime(client.created_at),
    toTime(client.invite_sent_at),
    toTime(client.invite_accepted_at),
    ...records
      .filter((record) => record.client_id === client.id)
      .flatMap((record) => [
        toTime(record.created_at),
        toTime(record.assigned_at),
        toTime(record.started_at),
        toTime(record.completed_at),
      ]),
  )
}

function findPrimaryClient(question: string, clients: ClientRecord[], records: DatedClientRecord[]) {
  const lowerQuestion = question.toLowerCase()
  const namedClient = clients.find((client) => lowerQuestion.includes(client.full_name.toLowerCase()))
  if (namedClient) return { id: namedClient.id, name: namedClient.full_name }

  const latestRecord = records
    .filter((record) => record.client_id)
    .sort((a, b) => Math.max(toTime(b.created_at), toTime(b.completed_at), toTime(b.assigned_at)) - Math.max(toTime(a.created_at), toTime(a.completed_at), toTime(a.assigned_at)))[0]
  const client = latestRecord ? clients.find((item) => item.id === latestRecord.client_id) : null
  return client ? { id: client.id, name: client.full_name } : null
}

function buildDailyBrief(
  clients: ClientRecord[],
  assignments: DatedClientRecord[],
  worksheetAssignments: DatedClientRecord[],
  reflections: DatedClientRecord[],
  moodCheckIns: DatedClientRecord[],
) {
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const homeworkWaiting = [
    ...assignments.filter((item) => Boolean(item.completed || item.status === "completed" || item.reflection)),
    ...worksheetAssignments.filter((item) => item.status === "completed"),
  ]
  const reflectionItems = reflections
  const moodByClient = new Map<string, DatedClientRecord[]>()

  moodCheckIns.forEach((checkIn) => {
    const items = moodByClient.get(checkIn.client_id) || []
    items.push(checkIn)
    moodByClient.set(checkIn.client_id, items)
  })

  const moodAlerts = Array.from(moodByClient.entries()).flatMap(([clientId, items]) => {
    const sorted = items.sort((a, b) => toTime(b.created_at) - toTime(a.created_at))
    const latest = sorted[0]
    const previous = sorted[1]
    const moodDrop = previous?.mood_rating && latest?.mood_rating ? previous.mood_rating - latest.mood_rating : 0
    const alertReasons = [
      latest?.mood_rating !== null && latest?.mood_rating !== undefined && latest.mood_rating < 4 ? `mood ${latest.mood_rating}/10` : null,
      latest?.anxiety_rating !== null && latest?.anxiety_rating !== undefined && latest.anxiety_rating >= 8 ? `anxiety ${latest.anxiety_rating}/10` : null,
      latest?.stress_rating !== null && latest?.stress_rating !== undefined && latest.stress_rating >= 8 ? `stress ${latest.stress_rating}/10` : null,
      moodDrop >= 3 ? `mood dropped ${moodDrop} points` : null,
    ].filter(Boolean)
    return alertReasons.length ? [{ clientId, clientName: getClientName(clientById, clientId), reasons: alertReasons, date: latest?.created_at }] : []
  })

  const allActivity = [...assignments, ...worksheetAssignments, ...reflections, ...moodCheckIns]
  const inactiveClients = clients.filter((client) => {
    const lastActivity = latestActivityAt(client, allActivity)
    if (!lastActivity) return false
    const daysSince = Math.floor((Date.now() - lastActivity) / 86400000)
    return daysSince >= 14
  })

  const estimatedReviewTime = Math.max(
    5,
    homeworkWaiting.length * 2 + reflectionItems.length * 2 + moodAlerts.length * 3 + inactiveClients.length,
  )

  return {
    homeworkWaiting: homeworkWaiting.length,
    reflectionsSubmitted: reflectionItems.length,
    moodAlerts: moodAlerts.length,
    inactiveClients: inactiveClients.length,
    estimatedReviewTime,
    highlights: [
      ...homeworkWaiting.slice(0, 3).map((item) => `${getClientName(clientById, item.client_id)} has homework ready for review (${formatDate(item.completed_at || item.created_at)}).`),
      ...reflectionItems.slice(0, 3).map((item) => `${getClientName(clientById, item.client_id)} submitted a reflection (${formatDate(item.created_at)}).`),
      ...moodAlerts.slice(0, 3).map((item) => `${item.clientName}: ${item.reasons.join(", ")}.`),
      ...inactiveClients.slice(0, 3).map((client) => `${client.full_name} has no recorded activity in 14+ days.`),
    ].slice(0, 8),
  }
}

export async function POST(request: Request) {
  try {
    const { question, history } = await request.json()

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 })
    }

    const openAiApiKey = process.env.OPENAI_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!openAiApiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 })
    }

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "AI Copilot service is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in to use AI Copilot" }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const tenant = await resolveTenantContext(adminClient, user)

    if (!tenant) {
      return NextResponse.json({ error: "No active clinician organization was found" }, { status: 403 })
    }

    const { data: therapist, error: therapistError } = await adminClient
      .from("therapists")
      .select("id, full_name, email")
      .eq("id", tenant.therapistId)
      .eq("organization_id", tenant.organizationId)
      .maybeSingle()

    if (therapistError) {
      return NextResponse.json({ error: therapistError.message }, { status: 500 })
    }

    if (!therapist) {
      return NextResponse.json({ error: "No therapist account found for your email" }, { status: 403 })
    }

    const [
      clients,
      assignments,
      worksheetAssignments,
      reflections,
      moodCheckIns,
      progressNotes,
      sessionPrepNotes,
    ] = await Promise.all([
      fetchOptionalData(
        "clients query failed",
        adminClient
          .from("clients")
          .select("id, full_name, status, created_at, user_id, invite_sent_at, invite_accepted_at")
          .eq("therapist_id", therapist.id)
          .eq("organization_id", tenant.organizationId)
          .order("created_at", { ascending: false })
          .limit(100),
        [],
      ),
      fetchOptionalData(
        "assignments query failed",
        adminClient
          .from("assignments")
          .select("id, client_id, title, description, completed, status, reflection, due_date, created_at, assigned_at, started_at, completed_at")
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(100),
        [],
      ),
      fetchOptionalData(
        "worksheet_assignments query failed",
        adminClient
          .from("worksheet_assignments")
          .select("id, client_id, status, due_date, assigned_at, started_at, completed_at, created_at, worksheet_templates(title, description)")
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(100),
        [],
      ),
      fetchOptionalData(
        "client_reflections query failed",
        adminClient
          .from("client_reflections")
          .select("id, client_id, title, reflection_text, mood_rating, created_at")
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(100),
        [],
      ),
      fetchOptionalData(
        "client_mood_checkins query failed",
        adminClient
          .from("client_mood_checkins")
          .select("id, client_id, mood_rating, anxiety_rating, stress_rating, note, created_at")
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(100),
        [],
      ),
      fetchOptionalData(
        "progress_notes query failed",
        adminClient
          .from("progress_notes")
          .select("id, client_id, note_type, subjective, objective, assessment, plan, private_note, created_at, updated_at")
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(50),
        [],
      ),
      fetchOptionalData(
        "session_prep_notes query failed",
        adminClient
          .from("session_prep_notes")
          .select("id, client_id, note, created_at, updated_at")
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(50),
        [],
      ),
    ])

    const clientRows = Array.isArray(clients) ? clients as ClientRecord[] : []
    const assignmentRows = Array.isArray(assignments) ? assignments as DatedClientRecord[] : []
    const worksheetRows = Array.isArray(worksheetAssignments) ? worksheetAssignments as DatedClientRecord[] : []
    const reflectionRows = Array.isArray(reflections) ? reflections as DatedClientRecord[] : []
    const moodRows = Array.isArray(moodCheckIns) ? moodCheckIns as DatedClientRecord[] : []
    const noteRows = [
      ...(Array.isArray(progressNotes) ? progressNotes as DatedClientRecord[] : []),
      ...(Array.isArray(sessionPrepNotes) ? sessionPrepNotes as DatedClientRecord[] : []),
    ]

    const sourceCounts = {
      clients: clientRows.length,
      assignments: assignmentRows.length,
      worksheetAssignments: worksheetRows.length,
      reflections: reflectionRows.length,
      moodCheckIns: moodRows.length,
      progressNotes: Array.isArray(progressNotes) ? progressNotes.length : 0,
      sessionPrepNotes: Array.isArray(sessionPrepNotes) ? sessionPrepNotes.length : 0,
    }

    const primaryClient = findPrimaryClient(question, clientRows, [
      ...assignmentRows,
      ...worksheetRows,
      ...reflectionRows,
      ...moodRows,
      ...noteRows,
    ])
    const dailyBrief = buildDailyBrief(clientRows, assignmentRows, worksheetRows, reflectionRows, moodRows)

    const context = {
      generatedAt: new Date().toISOString(),
      therapist: {
        id: therapist.id,
        name: therapist.full_name,
      },
      question: question.trim(),
      currentSessionHistory: Array.isArray(history) ? history.slice(-8) : [],
      sourceCounts,
      dailyBrief,
      clients,
      homework: {
        assignments,
        worksheetAssignments,
      },
      reflections,
      moodCheckIns,
      sessionNotes: {
        progressNotes,
        sessionPrepNotes,
      },
    }

    const model = process.env.OPENAI_MODEL || defaultModel
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are SessionSteps AI Copilot, a therapist-facing workflow assistant.",
              "Use only the supplied JSON data. Never fabricate client names, diagnoses, symptoms, homework, progress, risks, attendance, or clinical facts.",
              "Never infer access to data outside the supplied therapist-owned records.",
              "Do not diagnose. Do not present AI output as clinical fact. Keep language neutral and framed for therapist review.",
              "If the answer cannot be grounded in the supplied data, say what data is missing.",
              "Every response must use this structure: Summary, Key Findings, Recommended Next Steps, Supporting Data, Clinical Reminder.",
              `The Clinical Reminder must preserve this sentence: ${disclaimer}`,
              "For homework suggestions, provide general worksheet-style ideas, not diagnoses, and clearly say the therapist should review fit.",
              "Do not include client email addresses, therapist ids, internal ids, or database implementation details.",
              "Return valid JSON only with keys: structuredAnswer, sources, suggestedFollowUps, recommendedHomework.",
              "structuredAnswer must include summary, keyFindings, recommendedNextSteps, supportingData, clinicalReminder.",
              "sources must include homework, reflections, moodCheckIns, and sessionNotes. Each source section must have summary and citations.",
              "suggestedFollowUps must be 2 to 4 grounded follow-up questions.",
              "recommendedHomework may be null. Only include it when the user asks for homework or when a next step clearly includes homework.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify(context),
          },
        ],
      }),
    })

    const openAiResult = await openAiResponse.json().catch(() => null)

    if (!openAiResponse.ok) {
      return NextResponse.json(
        { error: openAiResult?.error?.message || "OpenAI AI Copilot request failed" },
        { status: 502 },
      )
    }

    const content = openAiResult?.choices?.[0]?.message?.content

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "OpenAI returned an empty Copilot response" }, { status: 502 })
    }

    let parsedResponse: unknown
    try {
      parsedResponse = JSON.parse(content)
    } catch (error) {
      return NextResponse.json({ error: `OpenAI returned invalid JSON: ${getErrorMessage(error)}` }, { status: 502 })
    }

    const copilotResponse = normalizeCopilotResponse(parsedResponse, primaryClient)

    return NextResponse.json({
      answer: copilotResponse.answer,
      structuredAnswer: copilotResponse.structuredAnswer,
      suggestedFollowUps: copilotResponse.suggestedFollowUps,
      recommendedHomework: copilotResponse.recommendedHomework,
      primaryClient: copilotResponse.primaryClient,
      dailyBrief,
      sources: copilotResponse.sources,
      sourceCounts,
      model,
    })
  } catch (error) {
    console.error("[v0] AI Copilot: failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run AI Copilot" },
      { status: 500 },
    )
  }
}
