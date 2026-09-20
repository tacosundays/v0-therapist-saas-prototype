import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const migration = readFileSync("supabase/migrations/033_expand_premade_worksheet_library.sql", "utf8")

test("expanded library seeds 210 additional premade worksheets", () => {
  const topicCount = (migration.match(/^\s*\('(cbt|dbt|act|mindfulness|journaling)'/gm) || []).length
  const formatCount = (migration.match(/^\s*\('(Awareness Check-In|Pattern Map|Skills Practice|Action Plan|Weekly Review)'/gm) || []).length

  assert.equal(topicCount, 42)
  assert.equal(formatCount, 5)
  assert.equal(topicCount * formatCount, 210)
})

test("expanded library is idempotent, structured, and provisioned for future therapists", () => {
  assert.match(migration, /source_type='premade'/)
  assert.match(migration, /WHERE NOT EXISTS/)
  assert.match(migration, /INSERT INTO public\.worksheet_questions/)
  assert.match(migration, /seed_starter_worksheets_after_therapist_insert/)
  assert.match(migration, /PERFORM public\.seed_expanded_worksheet_library\(NEW\.id\)/)
  assert.match(migration, /SELECT public\.seed_expanded_worksheet_library\(id\) FROM public\.therapists/)
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.seed_expanded_worksheet_library/)
})

test("expanded library covers every supported category and question format", () => {
  for (const category of ["cbt", "dbt", "act", "mindfulness", "journaling"]) {
    assert.match(migration, new RegExp(`\\('${category}'`))
  }

  for (const questionType of ["short_text", "long_text", "scale", "date"]) {
    assert.match(migration, new RegExp(`'${questionType}'`))
  }
})
