import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const sourceRoots = ["app", "components", "lib"]

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : []
  })
}

test("production code does not log patient or clinician identifiers", () => {
  const unsafeLogs: string[] = []

  for (const file of sourceRoots.flatMap(sourceFiles)) {
    const source = readFileSync(file, "utf8")
    const lines = source.split("\n")

    lines.forEach((line, index) => {
      if (/console\.log\([^\n]*(?:email|client\s+id|client\s+emails|therapist\s+id)/i.test(line)) {
        unsafeLogs.push(`${file}:${index + 1}`)
      }
    })
  }

  assert.deepEqual(unsafeLogs, [], `Identifier-bearing logs found at ${unsafeLogs.join(", ")}`)
})
