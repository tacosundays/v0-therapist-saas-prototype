import { NextResponse } from "next/server"
import { resolveTherapistFromToken } from "@/lib/google-calendar"

export async function GET(request: Request) {
  try {
    const resolved = await resolveTherapistFromToken(request)
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status })

    const { data, error } = await resolved.adminClient
      .from("therapist_calendar_connections")
      .select("id, provider, provider_account_email, calendar_id, scopes, generate_ai_prep_overnight, connected_at, updated_at")
      .eq("therapist_id", resolved.therapist.id)
      .eq("provider", "google")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      connected: Boolean(data),
      connection: data || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load calendar connection." },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const resolved = await resolveTherapistFromToken(request)
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status })

    const { generateAiPrepOvernight } = await request.json()

    const { data, error } = await resolved.adminClient
      .from("therapist_calendar_connections")
      .update({ generate_ai_prep_overnight: Boolean(generateAiPrepOvernight) })
      .eq("therapist_id", resolved.therapist.id)
      .eq("provider", "google")
      .select("id, provider, provider_account_email, calendar_id, scopes, generate_ai_prep_overnight, connected_at, updated_at")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "No Google Calendar connection found." }, { status: 404 })

    return NextResponse.json({ connected: true, connection: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update calendar connection." },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const resolved = await resolveTherapistFromToken(request)
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status })

    const { error } = await resolved.adminClient
      .from("therapist_calendar_connections")
      .delete()
      .eq("therapist_id", resolved.therapist.id)
      .eq("provider", "google")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ connected: false })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect calendar." },
      { status: 500 },
    )
  }
}
