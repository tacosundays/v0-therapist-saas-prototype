"use client"

import { useEffect, useState } from "react"

export const DEMO_MODE_STORAGE_KEY = "shrinkaId.demoMode"
export const DEMO_THERAPIST_ID = "demo-therapist-emily-carter"
export const DEMO_SESSION_PREP_NOTE_STORAGE_PREFIX = "shrinkaId.demoSessionPrepNote"

export type DemoClient = {
  id: string
  therapist_id: string
  full_name: string
  email: string
  status: string
  created_at: string
  user_id: string
  invite_sent_at: string
  invite_accepted_at: string
  age: number
  pronouns: string
  avatar: string
  clientType: "Individual" | "Couple" | "Teen"
  focus: string[]
  therapy_start_date: string
  treatment_goals: string[]
  upcoming_appointment: string
  previous_appointment: string
}

type DemoAssignment = {
  id: string
  therapist_id: string
  client_id: string
  title: string
  completed: boolean
  status: string
  due_date: string | null
  reflection: string | null
  created_at: string
  assigned_at: string
  started_at: string | null
  completed_at: string | null
}

type DemoWorksheetAssignment = {
  id: string
  therapist_id: string
  client_id: string
  status: string
  created_at: string
  assigned_at: string
  started_at: string | null
  completed_at: string | null
  worksheet_template_id: string
  worksheet_templates: {
    title: string
    category: string
  }
}

type DemoReflection = {
  id: string
  therapist_id: string
  client_id: string
  title: string
  reflection_text: string
  mood_rating: number | null
  created_at: string
}

type DemoMoodCheckIn = {
  id: string
  therapist_id: string
  client_id: string
  mood_rating: number
  anxiety_rating: number | null
  stress_rating: number | null
  note: string | null
  created_at: string
}

type DemoProgressNote = {
  id: string
  therapist_id: string
  client_id: string
  note_type: "DAP" | "SOAP"
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  private_note: string | null
  created_at: string
  updated_at: string | null
}

type DemoSessionSummary = {
  id: string
  therapist_id: string
  client_id: string
  summary_json: {
    clientOverview: string
    progressSinceLastSession: string
    moodTrends: string
    reflectionThemes: string
    homeworkProgress: string
    suggestedDiscussionTopics: string[]
  }
  summary_text: string
  source_counts: Record<string, number>
  model: string
  created_at: string
}

type DemoCalendarEvent = {
  id: string
  title: string
  description: string | null
  location: string | null
  htmlLink: string | null
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  matchedClient: { id: string; name: string } | null
  prep: {
    homeworkStatus: string
    reflectionStatus: string
    moodStatus: string
    lastActivityAt: string | null
  } | null
  status: "Completed" | "Upcoming"
}

function daysAgo(days: number, hour = 10, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function daysFromNow(days: number, hour = 10, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function initialsAvatar(name: string, color: string) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="28" fill="${color}"/><text x="48" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="white">${initials}</text></svg>`)}`
}

export const demoPractice = {
  name: "North Hills Counseling",
  therapist: "Dr. Emily Carter, LMHC",
  therapistEmail: "emily.carter@northhillscounseling.demo",
}

export const demoClients: DemoClient[] = [
  {
    id: "demo-client-maya",
    therapist_id: DEMO_THERAPIST_ID,
    full_name: "Maya Thompson",
    email: "maya.thompson@example.demo",
    status: "active",
    created_at: daysAgo(92, 9),
    user_id: "demo-user-maya",
    invite_sent_at: daysAgo(92, 9),
    invite_accepted_at: daysAgo(91, 15),
    age: 34,
    pronouns: "she/her",
    avatar: initialsAvatar("Maya Thompson", "#6D5EF5"),
    clientType: "Individual",
    focus: ["Anxiety", "Stress"],
    therapy_start_date: daysAgo(90, 10),
    treatment_goals: ["Reduce workday rumination", "Practice grounding before difficult meetings", "Rebuild evening routines"],
    upcoming_appointment: daysFromNow(0, 11, 30),
    previous_appointment: daysAgo(7, 11, 30),
  },
  {
    id: "demo-client-jordan",
    therapist_id: DEMO_THERAPIST_ID,
    full_name: "Jordan Ellis",
    email: "jordan.ellis@example.demo",
    status: "active",
    created_at: daysAgo(78, 13),
    user_id: "demo-user-jordan",
    invite_sent_at: daysAgo(78, 13),
    invite_accepted_at: daysAgo(76, 16),
    age: 29,
    pronouns: "they/them",
    avatar: initialsAvatar("Jordan Ellis", "#18B7A0"),
    clientType: "Individual",
    focus: ["Depression", "Behavioral Activation"],
    therapy_start_date: daysAgo(75, 14),
    treatment_goals: ["Increase weekly activity", "Track avoidance patterns", "Reconnect with supportive friends"],
    upcoming_appointment: daysFromNow(0, 14, 0),
    previous_appointment: daysAgo(6, 14, 0),
  },
  {
    id: "demo-client-sofia",
    therapist_id: DEMO_THERAPIST_ID,
    full_name: "Sofia Ramirez",
    email: "sofia.ramirez@example.demo",
    status: "active",
    created_at: daysAgo(64, 12),
    user_id: "demo-user-sofia",
    invite_sent_at: daysAgo(64, 12),
    invite_accepted_at: daysAgo(63, 17),
    age: 42,
    pronouns: "she/her",
    avatar: initialsAvatar("Sofia Ramirez", "#F59E0B"),
    clientType: "Individual",
    focus: ["Trauma", "Anxiety"],
    therapy_start_date: daysAgo(61, 10),
    treatment_goals: ["Build stabilization skills", "Notice triggers without avoidance", "Improve sleep consistency"],
    upcoming_appointment: daysFromNow(0, 16, 0),
    previous_appointment: daysAgo(8, 16, 0),
  },
  {
    id: "demo-client-liam",
    therapist_id: DEMO_THERAPIST_ID,
    full_name: "Liam Chen",
    email: "liam.chen@example.demo",
    status: "active",
    created_at: daysAgo(49, 8),
    user_id: "demo-user-liam",
    invite_sent_at: daysAgo(49, 8),
    invite_accepted_at: daysAgo(48, 19),
    age: 16,
    pronouns: "he/him",
    avatar: initialsAvatar("Liam Chen", "#0EA5E9"),
    clientType: "Teen",
    focus: ["Anxiety", "School Stress"],
    therapy_start_date: daysAgo(47, 15),
    treatment_goals: ["Use coping skills before tests", "Reduce late-night worry", "Practice asking for help"],
    upcoming_appointment: daysFromNow(1, 15, 30),
    previous_appointment: daysAgo(5, 15, 30),
  },
  {
    id: "demo-client-ava-noah",
    therapist_id: DEMO_THERAPIST_ID,
    full_name: "Ava Patel & Noah Green",
    email: "ava.noah@example.demo",
    status: "active",
    created_at: daysAgo(71, 11),
    user_id: "demo-user-ava-noah",
    invite_sent_at: daysAgo(71, 11),
    invite_accepted_at: daysAgo(70, 18),
    age: 38,
    pronouns: "she/her & he/him",
    avatar: initialsAvatar("Ava Patel Noah Green", "#EC4899"),
    clientType: "Couple",
    focus: ["Relationship", "Communication"],
    therapy_start_date: daysAgo(68, 17),
    treatment_goals: ["Reduce escalation cycles", "Practice repair attempts", "Clarify shared household expectations"],
    upcoming_appointment: daysFromNow(1, 10, 0),
    previous_appointment: daysAgo(7, 10, 0),
  },
  {
    id: "demo-client-ethan",
    therapist_id: DEMO_THERAPIST_ID,
    full_name: "Ethan Brooks",
    email: "ethan.brooks@example.demo",
    status: "active",
    created_at: daysAgo(112, 10),
    user_id: "demo-user-ethan",
    invite_sent_at: daysAgo(112, 10),
    invite_accepted_at: daysAgo(110, 13),
    age: 45,
    pronouns: "he/him",
    avatar: initialsAvatar("Ethan Brooks", "#64748B"),
    clientType: "Individual",
    focus: ["Stress", "Burnout"],
    therapy_start_date: daysAgo(108, 9),
    treatment_goals: ["Set work boundaries", "Improve recovery time", "Reduce irritability at home"],
    upcoming_appointment: daysFromNow(0, 9, 0),
    previous_appointment: daysAgo(14, 9, 0),
  },
  {
    id: "demo-client-nia",
    therapist_id: DEMO_THERAPIST_ID,
    full_name: "Nia Williams",
    email: "nia.williams@example.demo",
    status: "active",
    created_at: daysAgo(39, 14),
    user_id: "demo-user-nia",
    invite_sent_at: daysAgo(39, 14),
    invite_accepted_at: daysAgo(38, 9),
    age: 27,
    pronouns: "she/her",
    avatar: initialsAvatar("Nia Williams", "#10B981"),
    clientType: "Individual",
    focus: ["Depression", "Grief"],
    therapy_start_date: daysAgo(36, 12),
    treatment_goals: ["Name grief triggers", "Restore morning routine", "Identify supportive contact points"],
    upcoming_appointment: daysFromNow(2, 13, 0),
    previous_appointment: daysAgo(9, 13, 0),
  },
  {
    id: "demo-client-oliver",
    therapist_id: DEMO_THERAPIST_ID,
    full_name: "Oliver Bennett",
    email: "oliver.bennett@example.demo",
    status: "active",
    created_at: daysAgo(58, 10),
    user_id: "demo-user-oliver",
    invite_sent_at: daysAgo(58, 10),
    invite_accepted_at: daysAgo(57, 11),
    age: 31,
    pronouns: "he/him",
    avatar: initialsAvatar("Oliver Bennett", "#EF4444"),
    clientType: "Individual",
    focus: ["Trauma", "Relationship"],
    therapy_start_date: daysAgo(55, 16),
    treatment_goals: ["Track shutdown cues", "Practice boundaries after conflict", "Increase self-compassion language"],
    upcoming_appointment: daysFromNow(0, 13, 0),
    previous_appointment: daysAgo(12, 13, 0),
  },
]

const homeworkTitles = [
  "Thought Record",
  "Communication Practice",
  "Values Worksheet",
  "Boundary Exercise",
  "Behavioral Activation",
  "Gratitude Practice",
  "Exposure Hierarchy",
  "Grounding Practice",
]

const reflections = [
  "I noticed I became anxious before work again.",
  "I tried the communication exercise and paused before responding.",
  "I avoided texting my ex and wrote down what I wanted to say instead.",
  "The worksheet helped me see how quickly I assume the worst.",
  "I did not finish everything, but I did take a walk twice.",
  "The breathing practice helped for a few minutes before the meeting.",
  "I felt more irritable than sad this week.",
  "We used the repair script once and it lowered the tension.",
]

export const demoAssignments: DemoAssignment[] = demoClients.flatMap((client, clientIndex) => (
  client.id === "demo-client-oliver" ? [] :
  [0, 1, 2].map((slot) => {
    const completed = slot !== 2 || clientIndex % 3 === 0
    const assignedDaysAgo = 28 - slot * 9 + clientIndex
    return {
      id: `demo-assignment-${client.id}-${slot}`,
      therapist_id: DEMO_THERAPIST_ID,
      client_id: client.id,
      title: homeworkTitles[(clientIndex + slot) % homeworkTitles.length],
      completed,
      status: completed ? "completed" : slot === 2 ? "started" : "assigned",
      due_date: daysAgo(Math.max(0, assignedDaysAgo - 5), 23),
      reflection: completed ? reflections[(clientIndex + slot) % reflections.length] : null,
      created_at: daysAgo(assignedDaysAgo, 9),
      assigned_at: daysAgo(assignedDaysAgo, 9),
      started_at: completed || slot === 2 ? daysAgo(Math.max(1, assignedDaysAgo - 2), 18) : null,
      completed_at: completed ? daysAgo(Math.max(0, assignedDaysAgo - 5), 20) : null,
    }
  })
))

export const demoWorksheetAssignments: DemoWorksheetAssignment[] = demoClients.slice(0, 6).map((client, index) => ({
  id: `demo-worksheet-${client.id}`,
  therapist_id: DEMO_THERAPIST_ID,
  client_id: client.id,
  status: index === 4 ? "in_progress" : "completed",
  created_at: daysAgo(18 + index, 11),
  assigned_at: daysAgo(18 + index, 11),
  started_at: daysAgo(15 + index, 18),
  completed_at: index === 4 ? null : daysAgo(12 + index, 19),
  worksheet_template_id: `demo-template-${index}`,
  worksheet_templates: {
    title: homeworkTitles[(index + 2) % homeworkTitles.length],
    category: ["cbt", "communication", "values", "stress", "trauma", "relationships"][index % 6],
  },
}))

export const demoReflections: DemoReflection[] = demoClients.flatMap((client, clientIndex) => (
  client.id === "demo-client-oliver" ? [] :
  [0, 1].map((slot) => ({
    id: `demo-reflection-${client.id}-${slot}`,
    therapist_id: DEMO_THERAPIST_ID,
    client_id: client.id,
    title: slot === 0 ? "Between-session reflection" : "Practice notes",
    reflection_text: reflections[(clientIndex + slot + 1) % reflections.length],
    mood_rating: [6, 5, 4, 7, 6, 3, 5, 4][(clientIndex + slot) % 8],
    created_at: daysAgo(2 + clientIndex + slot * 11, 18),
  }))
))

export const demoMoodCheckIns: DemoMoodCheckIn[] = demoClients.flatMap((client, clientIndex) => {
  if (client.id === "demo-client-oliver") return []
  const patterns = [
    [4, 5, 5, 6, 6],
    [3, 4, 5, 5, 4],
    [6, 5, 4, 4, 3],
    [5, 6, 5, 7, 6],
    [7, 6, 6, 5, 6],
    [6, 5, 4, 3, 3],
    [4, 4, 5, 6, 5],
    [5, 4, 5, 4, 4],
  ]
  return patterns[clientIndex].map((rating, slot) => ({
    id: `demo-mood-${client.id}-${slot}`,
    therapist_id: DEMO_THERAPIST_ID,
    client_id: client.id,
    mood_rating: rating,
    anxiety_rating: client.focus.includes("Anxiety") ? Math.min(10, 5 + slot + (clientIndex % 2)) : 4 + (slot % 3),
    stress_rating: client.focus.includes("Stress") ? Math.min(10, 6 + slot) : 4 + (clientIndex % 4),
    note: slot === 4 ? reflections[(clientIndex + 3) % reflections.length] : null,
    created_at: daysAgo(1 + slot * 7 + clientIndex, 8),
  }))
})

export const demoProgressNotes: DemoProgressNote[] = demoClients.flatMap((client, index) => ([
  ...(client.id === "demo-client-oliver" ? [] : [{
    id: `demo-note-${client.id}-recent`,
    therapist_id: DEMO_THERAPIST_ID,
    client_id: client.id,
    note_type: "DAP" as const,
    subjective: `${client.full_name} described one concrete moment connected to ${client.focus[0].toLowerCase()}.`,
    objective: null,
    assessment: "Client engaged with skills practice and identified one barrier to follow-through.",
    plan: `Continue ${homeworkTitles[index % homeworkTitles.length].toLowerCase()} and review next session.`,
    private_note: `Demo session note for ${client.full_name}.`,
    created_at: client.previous_appointment,
    updated_at: client.previous_appointment,
  }]),
]))

export const demoSessionPrepNotes = demoClients
  .filter((client) => client.id !== "demo-client-oliver")
  .map((client, index) => ({
  id: `demo-prep-note-${client.id}`,
  therapist_id: DEMO_THERAPIST_ID,
  client_id: client.id,
  note: `Prep focus: review ${homeworkTitles[index % homeworkTitles.length].toLowerCase()}, check recent mood pattern, and ask what made practice easier or harder this week.`,
  created_at: daysAgo(3 + index, 17),
  updated_at: daysAgo(1 + index, 17),
  }))

export const demoSessionSummaries: DemoSessionSummary[] = demoClients
  .filter((client) => client.id !== "demo-client-oliver")
  .map((client, index) => ({
  id: `demo-summary-${client.id}`,
  therapist_id: DEMO_THERAPIST_ID,
  client_id: client.id,
  summary_json: {
    clientOverview: `${client.full_name} is working on ${client.focus.join(" and ").toLowerCase()} goals in ${client.clientType.toLowerCase()} therapy.`,
    progressSinceLastSession: index % 3 === 0 ? "Follow-through improved this week, with one completed assignment and a specific reflection." : "Progress is mixed; client engaged with some skills while reporting continued barriers.",
    moodTrends: index % 4 === 2 ? "Recent check-ins show a setback that should be reviewed without treating the trend as clinical fact." : "Recent mood data shows modest variability across the last month.",
    reflectionThemes: reflections[(index + 1) % reflections.length],
    homeworkProgress: `${demoAssignments.filter((assignment) => assignment.client_id === client.id && assignment.completed).length} homework items completed in the demo history.`,
    suggestedDiscussionTopics: [
      "What made the most recent practice easier or harder?",
      "Which skill feels realistic to repeat before the next appointment?",
      "Are there any safety or support needs the therapist should review directly?",
    ],
  },
  summary_text: `Demo AI prep for ${client.full_name}: review homework, reflections, mood, and recent note context.`,
  source_counts: { assignments: 3, reflections: 2, moodCheckIns: 5, sessionNotes: 1 },
  model: "demo",
  created_at: daysAgo(index + 1, 7),
  }))

export const demoCouples = [{
  id: "demo-couple-ava-noah",
  relationship_name: "Ava + Noah",
  partner_1_client_id: "demo-client-ava-noah",
  partner_2_client_id: "demo-client-ava-noah",
}]

export const demoCoupleCheckIns = [1, 7, 14, 21, 28].map((days, index) => ({
  id: `demo-couple-check-in-${index}`,
  couple_id: "demo-couple-ava-noah",
  relationship_satisfaction: [7, 6, 6, 5, 5][index],
  trust: [7, 7, 6, 6, 6][index],
  communication: [7, 6, 5, 5, 4][index],
  conflict_level: [5, 6, 7, 7, 8][index],
  intimacy: [6, 6, 6, 5, 5][index],
  check_in_week: daysAgo(days, 19),
}))

export const demoCalendarPayload = {
  connected: true,
  connection: {
    providerAccountEmail: "dr.carter@northhillscounseling.demo",
    generateAiPrepOvernight: true,
    connectedAt: daysAgo(40),
  },
  sections: {
    today: [
      calendarEvent("demo-event-ethan", "Ethan Brooks therapy session", demoClients[5], 0, 9, "Completed"),
      calendarEvent("demo-event-maya", "Maya Thompson therapy session", demoClients[0], 0, 11, "Upcoming"),
      calendarEvent("demo-event-oliver", "Oliver Bennett session", demoClients[7], 0, 13, "Upcoming"),
      calendarEvent("demo-event-jordan", "Jordan Ellis session", demoClients[1], 0, 14, "Upcoming"),
      calendarEvent("demo-event-consult", "Consultation call", null, 0, 15, "Upcoming"),
    ],
    tomorrow: [
      calendarEvent("demo-event-ava-noah", "Ava + Noah couples session", demoClients[4], 1, 10, "Upcoming"),
      calendarEvent("demo-event-liam", "Liam Chen teen session", demoClients[3], 1, 15, "Upcoming"),
    ],
    upcomingWeek: [
      calendarEvent("demo-event-nia", "Nia Williams therapy session", demoClients[6], 2, 13, "Upcoming"),
      calendarEvent("demo-event-sofia", "Sofia Ramirez therapy session", demoClients[2], 3, 16, "Upcoming"),
    ],
  },
}

function calendarEvent(
  id: string,
  title: string,
  client: DemoClient | null,
  dayOffset: number,
  hour: number,
  status: "Completed" | "Upcoming",
): DemoCalendarEvent {
  const start = daysFromNow(dayOffset, hour, 0)
  const end = daysFromNow(dayOffset, hour, 50)
  return {
    id,
    title,
    description: "Demo calendar event",
    location: "Telehealth",
    htmlLink: null,
    start: { dateTime: start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    matchedClient: client ? { id: client.id, name: client.full_name } : null,
    prep: client ? buildDemoPrep(client) : null,
    status,
  }
}

function buildDemoPrep(client: DemoClient) {
  const assignments = demoAssignments.filter((assignment) => assignment.client_id === client.id)
  const reflections = demoReflections.filter((reflection) => reflection.client_id === client.id)
  const moods = demoMoodCheckIns.filter((checkIn) => checkIn.client_id === client.id)
  const readyHomework = assignments.filter((assignment) => assignment.completed || assignment.status === "completed").length
  const latestMood = moods[0]
  return {
    homeworkStatus: readyHomework > 0 ? `${readyHomework} ready` : "No homework",
    reflectionStatus: reflections.length > 0 ? "Submitted" : "None yet",
    moodStatus: latestMood ? (latestMood.mood_rating < 4 ? "Needs review" : `Mood ${latestMood.mood_rating}/10`) : "No check-in",
    lastActivityAt: [
      assignments[0]?.completed_at,
      reflections[0]?.created_at,
      moods[0]?.created_at,
    ].filter(Boolean).sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] as string | null || null,
  }
}

export const demoMessages = [
  {
    id: "demo-message-1",
    clientId: "demo-client-sofia",
    clientName: "Sofia Ramirez",
    timestamp: daysAgo(0, 8, 15),
    description: "Client message: Sleep was rough after a trigger at work.",
  },
  {
    id: "demo-message-2",
    clientId: "demo-client-ava-noah",
    clientName: "Ava Patel & Noah Green",
    timestamp: daysAgo(1, 18, 40),
    description: "Client message: We tried the repair script once.",
  },
]

export function isDemoModeEnabled() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true"
}

export function enableDemoMode() {
  window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, "true")
  document.cookie = `${DEMO_MODE_STORAGE_KEY}=true; path=/; max-age=86400; samesite=lax`
  window.dispatchEvent(new Event("demo-mode-change"))
}

export function disableDemoMode() {
  window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY)
  document.cookie = `${DEMO_MODE_STORAGE_KEY}=; path=/; max-age=0; samesite=lax`
  window.dispatchEvent(new Event("demo-mode-change"))
}

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    const sync = () => setIsDemoMode(isDemoModeEnabled())
    sync()
    window.addEventListener("storage", sync)
    window.addEventListener("demo-mode-change", sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("demo-mode-change", sync)
    }
  }, [])

  return { isDemoMode, enableDemoMode, disableDemoMode }
}

export function demoClientById(clientId: string | null | undefined) {
  return demoClients.find((client) => client.id === clientId) || null
}
