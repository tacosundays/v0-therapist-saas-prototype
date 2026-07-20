import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { encryptToken, signState, verifyState } from "../lib/google-calendar.ts"

test("calendar token encryption requires a dedicated secret", () => {
  const previousCalendarSecret = process.env.GOOGLE_CALENDAR_TOKEN_SECRET
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  delete process.env.GOOGLE_CALENDAR_TOKEN_SECRET
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-must-not-be-used-for-calendar-token-encryption"

  try {
    assert.throws(() => encryptToken("fictional-google-token"), /GOOGLE_CALENDAR_TOKEN_SECRET/)
  } finally {
    if (previousCalendarSecret === undefined) {
      delete process.env.GOOGLE_CALENDAR_TOKEN_SECRET
    } else {
      process.env.GOOGLE_CALENDAR_TOKEN_SECRET = previousCalendarSecret
    }

    if (previousServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey
    }
  }
})

test("calendar OAuth state rejects tampered signatures without length errors", () => {
  const previousCalendarSecret = process.env.GOOGLE_CALENDAR_TOKEN_SECRET
  process.env.GOOGLE_CALENDAR_TOKEN_SECRET = "test-calendar-token-secret"

  try {
    const state = signState({
      therapistId: "00000000-0000-0000-0000-000000000001",
      email: "therapist@example.test",
      exp: Date.now() + 60_000,
    })

    const [body] = state.split(".")
    assert.throws(() => verifyState(`${body}.short`), /could not be verified/)
  } finally {
    if (previousCalendarSecret === undefined) {
      delete process.env.GOOGLE_CALENDAR_TOKEN_SECRET
    } else {
      process.env.GOOGLE_CALENDAR_TOKEN_SECRET = previousCalendarSecret
    }
  }
})

test("calendar connection migration prevents browser-role token table access", () => {
  const migration = readFileSync("supabase/migrations/022_lock_down_calendar_connections.sql", "utf8")

  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i)
  assert.match(migration, /FORCE ROW LEVEL SECURITY/i)
  assert.match(migration, /REVOKE ALL ON TABLE public\.therapist_calendar_connections FROM anon/i)
  assert.match(migration, /REVOKE ALL ON TABLE public\.therapist_calendar_connections FROM authenticated/i)
})
