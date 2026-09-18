import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8")
const sender = read("lib/email/paubox.ts")
const invitations = read("lib/invitations.ts")
const clientTemplate = read("components/emails/client-invite-email.ts")
const therapistTemplate = read("components/emails/therapist-invite-email.ts")
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

test("Paubox requests use the account endpoint username and multipart content shape", () => {
  assert.match(sender, /https:\/\/api\.paubox\.net\/v1/)
  assert.match(sender, /DEFAULT_ENDPOINT_USERNAME = "sessionsteps"/)
  assert.match(sender, /process\.env\.PAUBOX_ENDPOINT_USERNAME/)
  assert.match(sender, /encodeURIComponent\(endpointUsername\)/)
  assert.doesNotMatch(sender, /encodeURIComponent\(sendingDomain\)/)
  assert.match(sender, /recipients/)
  assert.match(sender, /"text\/plain": message\.text/)
  assert.match(sender, /"text\/html": message\.html/)
  assert.match(sender, /sourceTrackingId/)
  assert.match(sender, /Paubox rejected email delivery/)
  assert.match(sender, /result\?\.errors/)
})

test("client resend failures expose the provider rejection while retaining the manual link", () => {
  const clientsPage = read("app/dashboard/clients/page.tsx")
  assert.match(clientsPage, /Email delivery failed: \$\{deliveryError\}/)
  assert.match(clientsPage, /Invite link copied so you can send it manually/)
})

test("all transactional invitation routes share the Paubox sender", () => {
  for (const route of emailRoutes) {
    assert.match(route, /sendPauboxEmail/)
    assert.doesNotMatch(route, /api\.resend\.com|RESEND_API_KEY|RESEND_FROM_EMAIL/)
  }
})

test("invitation emails use the hosted SessionSteps logo", () => {
  for (const template of [clientTemplate, therapistTemplate]) {
    assert.match(template, /https:\/\/sessionsteps\.com\/sessionsteps-email-logo\.png/)
    assert.match(template, /alt="SessionSteps"/)
  }
})

test("team invitations retain a manual-link fallback when email delivery fails", () => {
  const teamInviteRoute = emailRoutes[2]
  assert.match(teamInviteRoute, /emailSent: false/)
  assert.match(teamInviteRoute, /inviteLink/)
  assert.match(teamInviteRoute, /pauboxError/)
})

test("production invitation links use the canonical SessionSteps domain", () => {
  assert.match(invitations, /PRODUCTION_APP_ORIGIN = "https:\/\/sessionsteps\.com"/)
  assert.match(invitations, /process\.env\.NODE_ENV === "production"/)
  assert.match(invitations, /process\.env\.INVITE_BASE_URL/)

  for (const route of [
    read("app/api/client-invitations/create/route.ts"),
    read("app/api/client-invitations/resend/route.ts"),
    read("app/api/team/invites/create/route.ts"),
  ]) {
    assert.match(route, /getInviteOrigin\(request\)/)
    assert.doesNotMatch(route, /request\.headers\.get\("origin"\) \|\| process\.env\.NEXT_PUBLIC_APP_URL/)
  }
})
