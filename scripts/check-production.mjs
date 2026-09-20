const origin = process.env.SESSIONSTEPS_MONITOR_ORIGIN || "https://sessionsteps.com"
const paths = ["/", "/demo/therapist", "/privacy", "/terms", "/security", "/api/health"]

const failures = []

for (const path of paths) {
  const startedAt = Date.now()
  try {
    const response = await fetch(`${origin}${path}`, {
      headers: { "User-Agent": "SessionSteps-Production-Monitor/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    })
    const elapsed = Date.now() - startedAt

    if (!response.ok) {
      failures.push(`${path}: HTTP ${response.status}`)
      console.error(`FAIL ${path} HTTP ${response.status} ${elapsed}ms`)
      continue
    }

    if (path === "/api/health") {
      const health = await response.json()
      if (health.status !== "ok" || health.service !== "sessionsteps") {
        failures.push(`${path}: unexpected health response`)
        console.error(`FAIL ${path} unexpected health response ${elapsed}ms`)
        continue
      }
    }

    if (path === "/") {
      const requiredHeaders = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
      }
      for (const [name, expected] of Object.entries(requiredHeaders)) {
        if (response.headers.get(name) !== expected) {
          failures.push(`${path}: missing or invalid ${name} header`)
        }
      }
      if (!response.headers.get("strict-transport-security")) {
        failures.push(`${path}: missing strict-transport-security header`)
      }
    }

    console.log(`OK   ${path} HTTP ${response.status} ${elapsed}ms`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${path}: ${message}`)
    console.error(`FAIL ${path} ${message}`)
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} production check(s) failed:`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`\nAll ${paths.length} production checks passed.`)
