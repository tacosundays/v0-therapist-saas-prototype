import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const migration = readFileSync("supabase/migrations/032_trial_and_starter_worksheets.sql", "utf8")
const library = readFileSync("app/dashboard/library/page.tsx", "utf8")

test("new organizations inherit an active 14-day trial", () => {
  assert.match(migration, /subscription_status SET DEFAULT 'trialing'/)
  assert.match(migration, /trial_ends_at SET DEFAULT \(now\(\) \+ interval '14 days'\)/)
  assert.match(migration, /COALESCE\(NEW\.trial_ends_at, NEW\.trial_end_date/)
  assert.match(migration, /o\.stripe_subscription_id IS NULL/)
})

test("starter worksheets are structured, idempotent, and assigned through the worksheet engine", () => {
  assert.match(migration, /seed_starter_worksheet_templates/)
  assert.match(migration, /Anxiety Thought Record/)
  assert.match(migration, /Mindfulness Grounding Exercise/)
  assert.match(migration, /NOT EXISTS \(SELECT 1 FROM public\.worksheet_templates/)
  assert.match(migration, /INSERT INTO public\.worksheet_questions/)
  assert.match(library, /isInteractive: true/)
  assert.match(library, /item\.source_type === "premade"/)
  assert.match(library, /interactiveTitles/)
})
