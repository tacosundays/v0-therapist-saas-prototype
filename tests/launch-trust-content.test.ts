import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("every paid plan accurately describes BAA availability", () => {
  const products = read("lib/products.ts")

  assert.equal(
    products.match(/BAA available for eligible customers/g)?.length,
    3,
    "every plan should state that a BAA is available for eligible customers",
  )
  assert.doesNotMatch(products, /HIPAA BAA included/)
})

test("public trust pages list the current email provider and contact routes", () => {
  const subprocessors = read("app/subprocessors/page.tsx")
  const privacy = read("app/privacy/page.tsx")
  const security = read("app/security/page.tsx")
  const terms = read("app/terms/page.tsx")

  assert.match(subprocessors, /Paubox/)
  assert.doesNotMatch(subprocessors, /Amazon Web Services or Resend/)
  assert.match(privacy, /PRIVACY_EMAIL/)
  assert.match(security, /SECURITY_EMAIL/)
  assert.match(terms, /LEGAL_EMAIL/)
})
