import { NextResponse } from "next/server"
import { CalendarConnection, getAccessToken, resolveTherapistFromToken } from "@/lib/google-calendar"

type GoogleCalendarEvent = {
  id: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
}

type ClientRecord = {
  id: string
  full_name: string
  email: string | null
}

function normalizeName(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function eventStart(event: { start?: { dateTime?: string; date?: string } }) {
  return event.start?.dateTime || event.start?.date || null
}

function isSameDay(value: string, date: Date) {
  const eventDate = new Date(value)
  return eventDate.getFullYear() === date.getFullYear()
    && eventDate.getMonth() === date.getMonth()
    && eventDate.getDate() === date.getDate()
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function matchClient(event: GoogleCalendarEvent, clients: ClientRecord[]) {
  const haystack = normalizeName([event.summary, event.description, event.location].filter(Boolean).join(" "))
  if (!haystack) return null

  return clients.find((client) => {
    const name = normalizeName(client.full_name)
    if (!name) return false
    const nameParts = name.split(" ").filter((part) => part.length > 1)
    return haystack.includes(name) || nameParts.every((part) => haystack.includes(part))
  }) || null
}

function newestDate(values: Array<string | null | undefined>) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value!))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())

  return dates[0]?.toISOString() || null
}

export async function GET(request: Request) {
  try {
    const resolved = await resolveTherapistFromToken(request)
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status })

    const { data: connection, error: connectionError } = await resolved.adminClient
      .from("therapist_calendar_connections")
      .select("*")
      .eq("therapist_id", resolved.therapist.id)
      .eq("provider", "google")
      .maybeSingle()

    if (connectionError) return NextResponse.json({ error: "We couldn't load calendar events." }, { status: 500 })
    if (!connection) return NextResponse.json({ connected: false, sections: { today: [], tomorrow: [], upcomingWeek: [] } })

    const [clientsResult, assignmentsResult, worksheetResult, reflectionsResult, moodResult] = await Promise.all([
      resolved.adminClient
        .from("clients")
        .select("id, full_name, email")
        .eq("therapist_id", resolved.therapist.id)
        .order("full_name", { ascending: true }),
      resolved.adminClient
        .from("assignments")
        .select("id, client_id, completed, status, reflection, assigned_at, started_at, completed_at, created_at")
        .eq("therapist_id", resolved.therapist.id)
        .order("created_at", { ascending: false }),
      resolved.adminClient
        .from("worksheet_assignments")
        .select("id, client_id, status, assigned_at, started_at, completed_at")
        .eq("therapist_id", resolved.therapist.id)
        .order("assigned_at", { ascending: false }),
      resolved.adminClient
        .from("client_reflections")
        .select("id, client_id, created_at")
        .eq("therapist_id", resolved.therapist.id)
        .order("created_at", { ascending: false }),
      resolved.adminClient
        .from("client_mood_checkins")
        .select("id, client_id, mood_rating, anxiety_rating, stress_rating, created_at")
        .eq("therapist_id", resolved.therapist.id)
        .order("created_at", { ascending: false }),
    ])

    if (clientsResult.error) throw new Error(clientsResult.error.message)
    if (assignmentsResult.error) throw new Error(assignmentsResult.error.message)
    if (worksheetResult.error) throw new Error(worksheetResult.error.message)
    if (reflectionsResult.error) throw new Error(reflectionsResult.error.message)
    if (moodResult.error) throw new Error(moodResult.error.message)

    const accessToken = await getAccessToken(request, connection as CalendarConnection)
    const timeMin = new Date()
    timeMin.setHours(0, 0, 0, 0)
    const timeMax = addDays(timeMin, 8)
    const googleUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
    googleUrl.searchParams.set("singleEvents", "true")
    googleUrl.searchParams.set("orderBy", "startTime")
    googleUrl.searchParams.set("maxResults", "50")
    googleUrl.searchParams.set("timeMin", timeMin.toISOString())
    googleUrl.searchParams.set("timeMax", timeMax.toISOString())

    const googleResponse = await fetch(googleUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const googlePayload = await googleResponse.json().catch(() => null)

    if (!googleResponse.ok) {
      throw new Error(googlePayload?.error?.message || "Failed to read Google Calendar events.")
    }

    const clients = (clientsResult.data || []) as ClientRecord[]
    const assignments = assignmentsResult.data || []
    const worksheets = worksheetResult.data || []
    const reflections = reflectionsResult.data || []
    const moods = moodResult.data || []

    const events = ((googlePayload?.items || []) as GoogleCalendarEvent[])
      .filter((event) => eventStart(event))
      .map((event) => {
        const client = matchClient(event, clients)
        const clientAssignments = client ? assignments.filter((item) => item.client_id === client.id) : []
        const clientWorksheets = client ? worksheets.filter((item) => item.client_id === client.id) : []
        const clientReflections = client ? reflections.filter((item) => item.client_id === client.id) : []
        const clientMoods = client ? moods.filter((item) => item.client_id === client.id) : []
        const homeworkReady = [
          ...clientAssignments.filter((item) => item.completed || item.status === "completed" || Boolean(item.reflection)),
          ...clientWorksheets.filter((item) => item.status === "completed" || Boolean(item.completed_at)),
        ].length
        const homeworkPending = [
          ...clientAssignments.filter((item) => !item.completed && item.status !== "completed"),
          ...clientWorksheets.filter((item) => item.status !== "completed" && !item.completed_at),
        ].length
        const latestMood = clientMoods[0] || null
        const moodAlert = Boolean(
          latestMood && (
            latestMood.mood_rating < 4
            || (latestMood.anxiety_rating !== null && latestMood.anxiety_rating >= 8)
            || (latestMood.stress_rating !== null && latestMood.stress_rating >= 8)
          )
        )

        return {
          id: event.id,
          title: event.summary || "Calendar event",
          description: event.description || null,
          location: event.location || null,
          htmlLink: event.htmlLink || null,
          start: event.start,
          end: event.end,
          matchedClient: client ? {
            id: client.id,
            name: client.full_name,
          } : null,
          prep: client ? {
            homeworkStatus: homeworkReady > 0 ? `${homeworkReady} ready` : homeworkPending > 0 ? `${homeworkPending} pending` : "No homework",
            reflectionStatus: clientReflections[0] ? "Submitted" : "None yet",
            moodStatus: moodAlert ? "Needs review" : latestMood ? `Mood ${latestMood.mood_rating}/10` : "No check-in",
            lastActivityAt: newestDate([
              ...clientAssignments.map((item) => item.completed_at || item.started_at || item.assigned_at || item.created_at),
              ...clientWorksheets.map((item) => item.completed_at || item.started_at || item.assigned_at),
              ...clientReflections.map((item) => item.created_at),
              ...clientMoods.map((item) => item.created_at),
            ]),
          } : null,
        }
      })

    const today = new Date()
    const tomorrow = addDays(today, 1)
    const todayEvents = events.filter((event) => isSameDay(eventStart(event)!, today))
    const tomorrowEvents = events.filter((event) => isSameDay(eventStart(event)!, tomorrow))
    const upcomingWeek = events.filter((event) => !isSameDay(eventStart(event)!, today) && !isSameDay(eventStart(event)!, tomorrow))

    return NextResponse.json({
      connected: true,
      connection: {
        providerAccountEmail: connection.provider_account_email,
        generateAiPrepOvernight: connection.generate_ai_prep_overnight,
        connectedAt: connection.connected_at,
      },
      sections: {
        today: todayEvents,
        tomorrow: tomorrowEvents,
        upcomingWeek,
      },
    })
  } catch (error) {
    console.warn("[security] Calendar events load failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    return NextResponse.json(
      { error: "We couldn't load calendar events." },
      { status: 500 },
    )
  }
}
