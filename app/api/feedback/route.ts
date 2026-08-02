import { NextResponse } from "next/server"
import { authenticateAnalyticsRequest, resolveTherapistId } from "@/lib/analytics/server"

const categories = new Set(["bug", "idea", "confusing", "other"])
const likelySensitiveIdentifier = /(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b)/i

export async function POST(request: Request) {
  const authenticated = await authenticateAnalyticsRequest(request)
  if (!authenticated) return NextResponse.json({ error: "Please sign in again." }, { status: 401 })

  const therapistId = await resolveTherapistId(authenticated.admin, authenticated.user)
  if (!therapistId) return NextResponse.json({ error: "Therapist account not found." }, { status: 403 })

  const body = await request.json().catch(() => null)
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  const category = typeof body?.category === "string" ? body.category : ""
  const rawPagePath = typeof body?.pagePath === "string" ? body.pagePath : "/dashboard"
  const pagePath = rawPagePath.split("?")[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").slice(0, 500)
  const screenshotPath = null

  if (!categories.has(category) || message.length < 3 || message.length > 4000) {
    return NextResponse.json({ error: "Choose a category and enter 3–4,000 characters." }, { status: 400 })
  }
  if (likelySensitiveIdentifier.test(message)) {
    return NextResponse.json({ error: "Remove email addresses and client identifiers before submitting feedback." }, { status: 400 })
  }

  const metadata = body?.metadata && typeof body.metadata === "object"
    ? {
        viewport: String(body.metadata.viewport || "").slice(0, 40),
        platform: String(body.metadata.platform || "").slice(0, 100),
        userAgent: String(body.metadata.userAgent || "").slice(0, 500),
      }
    : {}

  const { data, error } = await authenticated.admin.from("beta_feedback").insert({
    therapist_id: therapistId,
    category,
    message,
    page_path: pagePath,
    screenshot_path: screenshotPath,
    browser_metadata: metadata,
  }).select("id").single()

  if (error) return NextResponse.json({ error: "Feedback could not be submitted." }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
