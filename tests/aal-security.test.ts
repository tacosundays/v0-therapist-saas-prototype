import assert from "node:assert/strict"
import { test } from "node:test"
import { getJwtAssuranceLevel, hasAal2 } from "../lib/security/aal.ts"

function token(aal: string) {
  return `header.${Buffer.from(JSON.stringify({ aal })).toString("base64url")}.signature`
}

test("only validated AAL2 claims satisfy the sensitive-route gate", () => {
  assert.equal(hasAal2(token("aal2")), true)
  assert.equal(hasAal2(token("aal1")), false)
  assert.equal(getJwtAssuranceLevel("invalid"), null)
})
