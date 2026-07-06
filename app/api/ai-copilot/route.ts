import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const defaultModel = "gpt-4o-mini"

type CopilotSection = {
  summary: string
  citations: string[]
}

type CopilotResponse = {
  answer: string
  sources: {
    homework: CopilotSection
    reflections: CopilotSection
    moodCheckIns: CopilotSection
    sessionNotes: CopilotSection
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
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

function normalizeCopilotResponse(rawResponse: unknown): CopilotResponse {
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

  return {
    answer: typeof value.answer === "string" && value.answer.trim()
      ? value.answer.trim()
      : "I could not generate a grounded answer from the available therapist-owned data.",
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

export async function POST(request: Request) {
  try {
    const { question } = await request.json()

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
    const normalizedTherapistEmail = normalizeEmail(user.email)

    const { data: therapist, error: therapistError } = await adminClient
      .from("therapists")
      .select("id, full_name, email")
      .ilike("email", normalizedTherapistEmail)
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

    const sourceCounts = {
      clients: Array.isArray(clients) ? clients.length : 0,
      assignments: Array.isArray(assignments) ? assignments.length : 0,
      worksheetAssignments: Array.isArray(worksheetAssignments) ? worksheetAssignments.length : 0,
      reflections: Array.isArray(reflections) ? reflections.length : 0,
      moodCheckIns: Array.isArray(moodCheckIns) ? moodCheckIns.length : 0,
      progressNotes: Array.isArray(progressNotes) ? progressNotes.length : 0,
      sessionPrepNotes: Array.isArray(sessionPrepNotes) ? sessionPrepNotes.length : 0,
    }

    const context = {
      generatedAt: new Date().toISOString(),
      therapist: {
        id: therapist.id,
        name: therapist.full_name,
      },
      question: question.trim(),
      sourceCounts,
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
              "You are ShrinkAid AI Copilot, a therapist-facing assistant.",
              "Use only the supplied JSON data. Never fabricate client names, diagnoses, symptoms, homework, progress, risks, or attendance.",
              "Never infer access to data outside the supplied therapist-owned records.",
              "Do not provide a diagnosis or treatment directive. Keep language neutral and framed for therapist review.",
              "If the answer cannot be grounded in the supplied data, say what data is missing.",
              "For homework suggestions, provide general worksheet-style ideas, not diagnoses, and clearly say the therapist should review fit.",
              "Do not include client email addresses, therapist ids, or internal ids.",
              "Return valid JSON only with keys: answer and sources.",
              "sources must include homework, reflections, moodCheckIns, and sessionNotes.",
              "Each source section must have summary and citations. Citations should be short labels grounded in supplied rows, such as client name plus date/title.",
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

    const copilotResponse = normalizeCopilotResponse(parsedResponse)

    return NextResponse.json({
      answer: copilotResponse.answer,
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
