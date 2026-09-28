import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8")
const portal = read("app/portal/page.tsx")
const sessionSummary = read("app/api/session-summary/route.ts")
const inviteAccept = read("app/api/client-invitations/accept/route.ts")
const inviteSend = read("app/api/client-invitations/send/route.ts")
const signup = read("app/signup/page.tsx")

test("client portal exits loading and shows retryable network failures", () => {
  assert.match(portal, /finally \{[\s\S]{0,120}setIsLoading\(false\)/)
  assert.match(portal, /The portal could not be loaded\. Check your connection and try again\./)
  assert.match(portal, /Your assignment could not be saved\. Check your connection and try again\./)
  assert.match(portal, /role="alert"/)
})

test("AI failure responses are safe and actionable", () => {
  assert.match(sessionSummary, /AI Session Prep is temporarily unavailable\. Please try again\./)
  assert.match(sessionSummary, /AI Session Prep returned an invalid response\. Please try again\./)
  assert.doesNotMatch(sessionSummary, /openAiResult\?\.error\?\.message/)
  assert.doesNotMatch(sessionSummary, /\{ error: saveError\.message \}/)
})

test("invitation failures do not expose database or provider internals", () => {
  for (const route of [inviteAccept, inviteSend]) {
    assert.doesNotMatch(route, /\{ error: (lookupError|updateError|therapistError|clientError)\.message \}/)
    assert.doesNotMatch(route, /error instanceof Error \? error\.message/)
  }
  assert.match(inviteAccept, /Invalid or expired invite link/)
  assert.match(inviteSend, /Copy the invite link and send it manually/)
})

test("signup exits loading states after session and network failures", () => {
  assert.match(signup, /We could not verify your session\. Check your connection and try again\./)
  assert.match(signup, /Signup could not be completed\. Check your connection and try again\./)
  assert.match(signup, /finally \{[\s\S]{0,100}setIsLoading\(false\)/)
  assert.match(signup, /finally \{[\s\S]{0,120}setIsCheckingSession\(false\)/)
})
