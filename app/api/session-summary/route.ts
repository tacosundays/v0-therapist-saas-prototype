import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const defaultModel = "gpt-4o-mini"

interface SessionSummarySections {
  clientOverview: string
  progressSinceLastSession: string
  moodTrends: string
  reflectionThemes: string
  homeworkProgress: string
  suggestedDiscussionTopics: string[]
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

function buildSummaryText(summary: SessionSummarySections) {
  return [
    `Client Overview\n${summary.clientOverview}`,
    `Progress Since Last Session\n${summary.progressSinceLastSession}`,
    `Mood Trends\n${summary.moodTrends}`,
    `Reflection Themes\n${summary.reflectionThemes}`,
    `Homework Progress\n${summary.homeworkProgress}`,
    `Suggested Discussion Topics\n${summary.suggestedDiscussionTopics.map((topic) => `- ${topic}`).join("\n")}`,
  ].join("\n\n")
}

function normalizeSummary(rawSummary: unknown): SessionSummarySections {
  const value = rawSummary && typeof rawSummary === "object" ? rawSummary as Partial<SessionSummarySections> : {}
  const fallback = "No relevant data was available in the provided client record."

  return {
    clientOverview: typeof value.clientOverview === "string" && value.clientOverview.trim() ? value.clientOverview.trim() : fallback,
    progressSinceLastSession: typeof value.progressSinceLastSession === "string" && value.progressSinceLastSession.trim()
      ? value.progressSinceLastSession.trim()
      : fallback,
    moodTrends: typeof value.moodTrends === "string" && value.moodTrends.trim() ? value.moodTrends.trim() : fallback,
    reflectionThemes: typeof value.reflectionThemes === "string" && value.reflectionThemes.trim() ? value.reflectionThemes.trim() : fallback,
    homeworkProgress: typeof value.homeworkProgress === "string" && value.homeworkProgress.trim() ? value.homeworkProgress.trim() : fallback,
    suggestedDiscussionTopics: Array.isArray(value.suggestedDiscussionTopics)
      ? value.suggestedDiscussionTopics
          .filter((topic): topic is string => typeof topic === "string" && topic.trim().length > 0)
          .map((topic) => topic.trim())
          .slice(0, 6)
      : [],
  }
}

async function fetchOptionalData<T>(
  label: string,
  query: PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
) {
  const result = await query
  if (result.error) {
    console.warn(`[v0] Session Summary: ${label} unavailable`, result.error)
    return fallback
  }
  return result.data ?? fallback
}

export async function POST(request: Request) {
  try {
    const { clientId } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: "Missing client id" }, { status: 400 })
    }

    const openAiApiKey = process.env.OPENAI_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!openAiApiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 })
    }

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Session summary service is not configured" }, { status: 500 })
    }

    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Missing authentication token" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

    if (userError || !user?.email) {
      return NextResponse.json({ error: "You must be logged in to generate session summaries" }, { status: 401 })
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

    const { data: client, error: clientError } = await adminClient
      .from("clients")
      .select("id, therapist_id, full_name, email, status, created_at, user_id, invite_sent_at, invite_accepted_at, last_login, last_login_at, last_seen_at")
      .eq("id", clientId)
      .eq("therapist_id", therapist.id)
      .maybeSingle()

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    if (!client) {
      return NextResponse.json({ error: "Client record was not found for this therapist" }, { status: 404 })
    }

    const [
      assignments,
      worksheetAssignments,
      clientReflections,
      moodCheckIns,
      progressNotes,
      couples,
    ] = await Promise.all([
      fetchOptionalData(
        "assignments query failed",
        adminClient
          .from("assignments")
          .select("id, title, completed, status, reflection, created_at, assigned_at, started_at, completed_at")
          .eq("client_id", client.id)
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(25),
        [],
      ),
      fetchOptionalData(
        "worksheet_assignments query failed",
        adminClient
          .from("worksheet_assignments")
          .select("id, status, assigned_at, started_at, completed_at, created_at, worksheet_templates(title, description)")
          .eq("client_id", client.id)
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(25),
        [],
      ),
      fetchOptionalData(
        "client_reflections query failed",
        adminClient
          .from("client_reflections")
          .select("id, title, reflection_text, mood_rating, created_at")
          .eq("client_id", client.id)
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(20),
        [],
      ),
      fetchOptionalData(
        "client_mood_checkins query failed",
        adminClient
          .from("client_mood_checkins")
          .select("id, mood_rating, anxiety_rating, stress_rating, note, created_at")
          .eq("client_id", client.id)
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(30),
        [],
      ),
      fetchOptionalData(
        "progress_notes query failed",
        adminClient
          .from("progress_notes")
          .select("id, note_type, subjective, objective, assessment, plan, private_note, created_at")
          .eq("client_id", client.id)
          .eq("therapist_id", therapist.id)
          .order("created_at", { ascending: false })
          .limit(5),
        [],
      ),
      fetchOptionalData(
        "couples query failed",
        adminClient
          .from("couples")
          .select("id, relationship_name, relationship_status, created_at")
          .eq("therapist_id", therapist.id)
          .or(`partner_1_client_id.eq.${client.id},partner_2_client_id.eq.${client.id}`)
          .order("created_at", { ascending: false })
          .limit(5),
        [],
      ),
    ])

    const coupleIds = Array.isArray(couples) ? couples.map((couple: { id: string }) => couple.id) : []
    const coupleCheckIns = coupleIds.length > 0
      ? await fetchOptionalData(
          "couple_check_ins query failed",
          adminClient
            .from("couple_check_ins")
            .select("id, couple_id, client_id, check_in_week, relationship_satisfaction, trust, communication, intimacy, conflict_level, reflection, created_at")
            .eq("therapist_id", therapist.id)
            .in("couple_id", coupleIds)
            .order("check_in_week", { ascending: false })
            .limit(20),
          [],
        )
      : []

    const worksheetAssignmentIds = Array.isArray(worksheetAssignments)
      ? worksheetAssignments.map((assignment: { id: string }) => assignment.id)
      : []
    const worksheetResponses = worksheetAssignmentIds.length > 0
      ? await fetchOptionalData(
          "worksheet_responses query failed",
          adminClient
            .from("worksheet_responses")
            .select("id, assignment_id, question_id, answer_text, answer_json, created_at, updated_at")
            .eq("client_id", client.id)
            .in("assignment_id", worksheetAssignmentIds)
            .order("updated_at", { ascending: false })
            .limit(30),
          [],
        )
      : []

    const sourceCounts = {
      assignments: Array.isArray(assignments) ? assignments.length : 0,
      worksheetAssignments: Array.isArray(worksheetAssignments) ? worksheetAssignments.length : 0,
      worksheetResponses: Array.isArray(worksheetResponses) ? worksheetResponses.length : 0,
      reflections: Array.isArray(clientReflections) ? clientReflections.length : 0,
      moodCheckIns: Array.isArray(moodCheckIns) ? moodCheckIns.length : 0,
      couples: Array.isArray(couples) ? couples.length : 0,
      coupleCheckIns: Array.isArray(coupleCheckIns) ? coupleCheckIns.length : 0,
      progressNotes: Array.isArray(progressNotes) ? progressNotes.length : 0,
    }

    const model = process.env.OPENAI_MODEL || defaultModel
    const context = {
      generatedAt: new Date().toISOString(),
      therapist: {
        id: therapist.id,
        name: therapist.full_name,
      },
      client,
      assignments,
      worksheetAssignments,
      worksheetResponses,
      reflections: clientReflections,
      moodCheckIns,
      couples,
      coupleCheckIns,
      progressNotes,
      sourceCounts,
    }

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
              "You create therapist-facing session briefings from structured ShrinkAid client data.",
              "Only summarize facts present in the supplied JSON. Never fabricate progress, risks, diagnoses, attendance, symptoms, or clinical conclusions.",
              "If a section lacks data, say that the record does not contain enough information for that section.",
              "Do not include client email addresses or therapist identifiers in the output.",
              "Do not make diagnoses. Suggested discussion topics must be neutral prompts grounded in existing client activity.",
              "Return only valid JSON with keys: clientOverview, progressSinceLastSession, moodTrends, reflectionThemes, homeworkProgress, suggestedDiscussionTopics.",
              "suggestedDiscussionTopics must be an array of short strings.",
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
        { error: openAiResult?.error?.message || "OpenAI session summary generation failed" },
        { status: 502 },
      )
    }

    const content = openAiResult?.choices?.[0]?.message?.content

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "OpenAI returned an empty session summary" }, { status: 502 })
    }

    let parsedSummary: unknown
    try {
      parsedSummary = JSON.parse(content)
    } catch (error) {
      return NextResponse.json({ error: `OpenAI returned invalid JSON: ${getErrorMessage(error)}` }, { status: 502 })
    }

    const summary = normalizeSummary(parsedSummary)
    const summaryText = buildSummaryText(summary)

    const { data: savedSummary, error: saveError } = await adminClient
      .from("session_summaries")
      .insert({
        therapist_id: therapist.id,
        client_id: client.id,
        summary_json: summary,
        summary_text: summaryText,
        source_counts: sourceCounts,
        model,
      })
      .select("id, therapist_id, client_id, summary_json, summary_text, source_counts, model, created_at")
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({ summary: savedSummary })
  } catch (error) {
    console.error("[v0] Session Summary: failed to generate", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate session summary" },
      { status: 500 },
    )
  }
}
