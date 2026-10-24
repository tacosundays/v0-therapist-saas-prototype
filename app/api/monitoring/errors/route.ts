import { NextResponse } from "next/server"
import { parseClientErrorReport } from "@/lib/security/client-error-report"
import { checkRateLimit } from "@/lib/security/rate-limit"

export const runtime = "nodejs"

const maxReportBytes = 2048
const noStoreHeaders = { "Cache-Control": "no-store" }

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...noStoreHeaders, ...headers } })
}

export async function POST(request: Request) {
  const rawContentLength = request.headers.get("content-length")
  if (rawContentLength) {
    const contentLength = Number(rawContentLength)
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > maxReportBytes) {
      return json({ error: "invalid_request" }, 413)
    }
  }

  const requestUrl = new URL(request.url)
  const origin = request.headers.get("origin")
  if (origin && origin !== requestUrl.origin) return json({ error: "forbidden" }, 403)

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const rateLimit = checkRateLimit(`client-error:${ip}`, 20, 60_000)
  if (!rateLimit.allowed) {
    return json(
      { error: "rate_limited" },
      429,
      { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))) },
    )
  }

  let body: unknown
  try {
    const text = await request.text()
    if (text.length > maxReportBytes) return json({ error: "invalid_request" }, 413)
    body = JSON.parse(text)
  } catch {
    return json({ error: "invalid_request" }, 400)
  }

  const report = parseClientErrorReport(body)
  if (!report) return json({ error: "invalid_request" }, 400)

  console.error(JSON.stringify({
    event: "client_error",
    timestamp: new Date().toISOString(),
    ...report,
  }))

  return json({ accepted: true }, 202)
}
