import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

test("therapist dashboard uses a mobile navigation drawer and hides the desktop sidebar", () => {
  const sidebar = read("components/dashboard/sidebar.tsx")
  assert.match(sidebar, /aria-controls="mobile-dashboard-navigation"/)
  assert.match(sidebar, /id="mobile-dashboard-navigation"/)
  assert.match(sidebar, /md:hidden/)
  assert.match(sidebar, /hidden h-full flex-col[\s\S]*md:flex/)
  assert.match(sidebar, /document\.body\.style\.overflow = "hidden"/)
})

test("dashboard shell removes desktop offset and uses phone-sized gutters", () => {
  const layout = read("app/dashboard/layout.tsx")
  assert.match(layout, /pl-0[\s\S]*md:pl-64/)
  assert.match(layout, /px-4[\s\S]*sm:px-6[\s\S]*md:px-8/)
  assert.match(layout, /min-w-0/)
})

test("primary dashboard actions are full-width on phones", () => {
  const dashboard = read("app/dashboard/page.tsx")
  assert.match(dashboard, /Prepare Next Session[\s\S]*<\/Link>/)
  assert.match(dashboard, /w-full rounded-xl[\s\S]*sm:w-auto/)
  assert.match(dashboard, /w-full shadow-md[\s\S]*sm:w-auto/)
})
