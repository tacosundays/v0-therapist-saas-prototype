import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { handleGenerateWorksheetRequest } from "../app/api/generate-worksheet/route.ts"
import { checkRateLimit, resetRateLimitsForTests } from "../lib/security/rate-limit.ts"

type MockUser = {
  id: string
  email: string | null
}

type MockTherapist = {
  id: string
  email: string
  subscription_status?: string | null
}

function request(body: Record<string, unknown>, token = "valid-token", ip = "198.51.100.10") {
  return new Request("https://app.example.test/api/generate-worksheet", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  })
}

function deps({
  user,
  therapist,
  generated = { title: "Worksheet" },
}: {
  user: MockUser | null
  therapist: MockTherapist | null
  generated?: unknown
}) {
  const auditEvents: string[] = []

  return {
    auditEvents,
    createAuthClient: () => ({
      auth: {
        getUser: async () => ({ data: { user }, error: null }),
      },
    }),
    createAdminClient: () => ({
      from: () => ({
        select: () => ({
          ilike: () => ({
            maybeSingle: async () => ({ data: therapist, error: null }),
          }),
        }),
      }),
    }),
    generateWorksheet: async () => generated,
    audit: async (event: { action: string }) => {
      auditEvents.push(event.action)
    },
    rateLimit: checkRateLimit,
  }
}

beforeEach(() => {
  resetRateLimitsForTests()
})

test("anonymous worksheet generation requests fail", async () => {
  const mockDeps = deps({ user: null, therapist: null })
  const response = await handleGenerateWorksheetRequest(new Request("https://app.example.test/api/generate-worksheet"), mockDeps)

  assert.equal(response.status, 401)
})

test("client users cannot generate worksheets", async () => {
  const mockDeps = deps({ user: { id: "client-user", email: "client@example.test" }, therapist: null })
  const response = await handleGenerateWorksheetRequest(request({ topic: "Stress", goal: "Practice calming skills" }), mockDeps)

  assert.equal(response.status, 403)
})

test("inactive therapists cannot generate worksheets", async () => {
  const mockDeps = deps({
    user: { id: "therapist-user", email: "therapist@example.test" },
    therapist: { id: "therapist-id", email: "therapist@example.test", subscription_status: "inactive" },
  })
  const response = await handleGenerateWorksheetRequest(request({ topic: "Stress", goal: "Practice calming skills" }), mockDeps)

  assert.equal(response.status, 403)
})

test("valid therapists can generate worksheets", async () => {
  const mockDeps = deps({
    user: { id: "therapist-user", email: "therapist@example.test" },
    therapist: { id: "therapist-id", email: "therapist@example.test", subscription_status: "trialing" },
  })
  const response = await handleGenerateWorksheetRequest(request({ topic: "Stress", goal: "Practice calming skills" }), mockDeps)
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(payload.worksheet, { title: "Worksheet" })
  assert.deepEqual(mockDeps.auditEvents, ["worksheet.generate_requested", "worksheet.generate_succeeded"])
})

test("forged therapist ids in the browser payload do not affect authorization", async () => {
  const mockDeps = deps({
    user: { id: "therapist-user", email: "therapist@example.test" },
    therapist: { id: "real-therapist-id", email: "therapist@example.test", subscription_status: "active" },
  })
  const response = await handleGenerateWorksheetRequest(request({
    topic: "Stress",
    goal: "Practice calming skills",
    therapist_id: "forged-therapist-id",
  }), mockDeps)

  assert.equal(response.status, 400)
  assert.equal(mockDeps.auditEvents.at(-1), "worksheet.generate_failed")
})

test("rate limits are enforced per authenticated user and IP", async () => {
  const mockDeps = deps({
    user: { id: "therapist-user", email: "therapist@example.test" },
    therapist: { id: "therapist-id", email: "therapist@example.test", subscription_status: "active" },
  })

  for (let index = 0; index < 10; index += 1) {
    const response = await handleGenerateWorksheetRequest(request({ topic: "Stress", goal: "Practice calming skills" }), mockDeps)
    assert.equal(response.status, 200)
  }

  const limitedResponse = await handleGenerateWorksheetRequest(request({ topic: "Stress", goal: "Practice calming skills" }), mockDeps)
  assert.equal(limitedResponse.status, 429)
})
