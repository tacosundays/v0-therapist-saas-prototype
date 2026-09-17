import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8")
const sender = read("lib/email/paubox.ts")
const emailRoutes = [
  "app/api/client-invitations/send/route.ts",
  "app/api/client-invitations/resend/route.ts",
  "app/api/team/invites/create/route.ts",
].map(read)

test("Paubox credentials remain server-only and are never sent in message bodies", () => {
  assert.match(sender, /import "server-only"/)
  assert.match(sender, /process\.env\.PAUBOX_API_KEY/)
  assert.match(sender, /Authorization: `Token token=\$\{apiKey\}`/)
  assert.doesNotMatch(sender, /NEXT_PUBLIC_PAUBOX/)
  assert.doesNotMatch(sender, /JSON\.stringify\([\s\S]*apiKey/)
})

test("Paubox requests use the verified domain endpoint and multipart content shape", () => {
  assert.match(sender, /https:\/\/api\.paubox\.net\/v1/)
  assert.match(sender, /encodeURIComponent\(sendingDomain\)/)
  assert.match(sender, /recipients/)
  assert.match(sender, /"text\/plain": message\.text/)
  assert.match(sender, /"text\/html": message\.html/)
  assert.match(sender, /sourceTrackingId/)
})

test("all transactional invitation routes share the Paubox sender", () => {
  for (const route of emailRoutes) {
    assert.match(route, /sendPauboxEmail/)
    assert.doesNotMatch(route, /api\.resend\.com|RESEND_API_KEY|RESEND_FROM_EMAIL/)
  }
})

test("team invitations retain a manual-link fallback when email delivery fails", () => {
  const teamInviteRoute = emailRoutes[2]
  assert.match(teamInviteRoute, /emailSent: false/)
  assert.match(teamInviteRoute, /inviteLink/)
  assert.match(teamInviteRoute, /pauboxError/)
})
