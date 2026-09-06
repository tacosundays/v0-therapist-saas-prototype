import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("landing demo links open the public demo chooser", () => {
  const header = read("components/landing/header.tsx")
  const hero = read("components/landing/hero.tsx")

  assert.match(header, /href="\/demo"/)
  assert.match(hero, /href="\/demo"/)
})

test("demo chooser provides therapist and client experiences", () => {
  const chooser = read("app/demo/page.tsx")

  assert.match(chooser, /\/demo\/therapist/)
  assert.doesNotMatch(chooser, /href:\s*"\/dashboard\?demo=1"/)
  assert.match(chooser, /\/demo\/client/)
  assert.match(chooser, /No account needed/)
})

test("therapist demo is a public, self-contained walkthrough", () => {
  const entry = read("app/demo/therapist/page.tsx")
  const data = read("lib/isolated-demo-data.ts")
  const clientDemo = read("app/demo/client/page.tsx")

  assert.match(entry, /Fictional therapist demo/)
  assert.match(entry, /isolated from production/)
  assert.match(entry, /Create My Practice/)
  assert.match(entry, /Reset demo/)
  assert.match(entry, /View as client/)
  assert.match(entry, /AI Session Prep example/)
  assert.match(data, /Maya Thompson/)
  assert.match(data, /Jordan Ellis/)
  assert.match(data, /Ava Patel & Noah Green/)
  assert.match(data, /Thought Record/)
  assert.match(data, /Couples Repair Conversation/)
  assert.match(entry, /\/demo\/client/)
  assert.match(entry, /\/signup/)
  assert.doesNotMatch(entry, /NextResponse\.redirect/)
  assert.doesNotMatch(entry, /\/dashboard\?demo=1/)
  assert.doesNotMatch(entry, /supabase|localStorage|sessionStorage|fetch\(|XMLHttpRequest|\/api\//)
  assert.doesNotMatch(data, /supabase|localStorage|sessionStorage|fetch\(|XMLHttpRequest|\/api\//)
  assert.match(clientDemo, /\/demo\/therapist/)
})

test("isolated therapist demo includes the full workflow and synthetic history", () => {
  const entry = read("app/demo/therapist/page.tsx")
  const data = read("lib/isolated-demo-data.ts")

  for (const label of ["Dashboard", "Clients", "Worksheets", "Progress", "Session Prep", "Client portal preview"]) {
    assert.match(entry, new RegExp(label))
  }
  assert.equal((data.match(/id: \"(?:maya|jordan|sofia|liam|ava-noah|ethan|nia|oliver)\"/g) || []).length, 8)
  assert.match(data, /Completed/)
  assert.match(data, /Overdue/)
  assert.match(data, /mood:/)
  assert.match(data, /reflections:/)
})

test("therapist demo guides first-time visitors without blocking exploration", () => {
  const entry = read("app/demo/therapist/page.tsx")

  assert.match(entry, /See the core workflow in about two minutes/)
  assert.match(entry, /Start guided tour/)
  assert.match(entry, /Explore on my own/)
  assert.match(entry, /Step.*of 3/)
  assert.match(entry, /Open Maya's profile/)
  assert.match(entry, /Browse worksheets/)
  assert.match(entry, /Open Session Prep/)
  assert.match(entry, /You’ve seen the core workflow/)
  assert.match(entry, /Create My Practice/)
})

test("landing and demo surfaces share one canonical logo component", () => {
  const logo = read("components/brand/sessionsteps-logo.tsx")
  const header = read("components/landing/header.tsx")
  const footer = read("components/landing/footer.tsx")
  const chooser = read("app/demo/page.tsx")
  const therapist = read("app/demo/therapist/page.tsx")
  const client = read("app/demo/client/page.tsx")

  assert.match(logo, /BrandMark/)
  for (const source of [header, footer, chooser, therapist, client]) {
    assert.match(source, /SessionStepsLogo/)
  }
})

test("every branded application surface uses the canonical SessionSteps logo", () => {
  for (const path of [
    "app/signup/page.tsx",
    "app/login/page.tsx",
    "app/forgot-password/page.tsx",
    "app/pricing/page.tsx",
    "app/onboarding/page.tsx",
    "app/portal/layout.tsx",
    "app/client-portal/layout.tsx",
    "components/dashboard/sidebar.tsx",
  ]) {
    const source = read(path)
    assert.match(source, /SessionStepsLogo|SessionStepsMark/, path)
    assert.doesNotMatch(source, /<Brain[^>]+(?:primary-foreground|text-white)/, path)
  }
})

test("canonical logo stays on its own line beside auth back links", () => {
  const logo = read("components/brand/sessionsteps-logo.tsx")
  assert.match(logo, /cn\("flex items-center gap-2"/)
  assert.doesNotMatch(logo, /inline-flex items-center gap-2/)
})

test("client demo is fictional and does not access persistent or production data", () => {
  const clientDemo = read("app/demo/client/page.tsx")

  assert.match(clientDemo, /Fictional client demo/)
  assert.match(clientDemo, /Jordan/)
  assert.match(clientDemo, /changes reset/)
  assert.doesNotMatch(clientDemo, /fetch\s*\(/)
  assert.doesNotMatch(clientDemo, /createClient/)
  assert.doesNotMatch(clientDemo, /supabase/i)
  assert.doesNotMatch(clientDemo, /localStorage/)
})
