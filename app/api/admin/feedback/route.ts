import { NextResponse } from "next/server"
import { authenticateAnalyticsRequest, isAnalyticsAdmin } from "@/lib/analytics/server"

export async function GET(request: Request) {
  const authenticated = await authenticateAnalyticsRequest(request)
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAnalyticsAdmin(authenticated.user.id)) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  const { data, error } = await authenticated.admin
    .from("beta_feedback")
    .select("id, category, message, page_path, screenshot_path, browser_metadata, status, created_at, therapist_id")
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: "Feedback could not be loaded." }, { status: 500 })

  const feedback = await Promise.all((data || []).map(async (item) => {
    if (!item.screenshot_path) return { ...item, screenshot_url: null }
    const { data: signed } = await authenticated.admin.storage
      .from("feedback-screenshots")
      .createSignedUrl(item.screenshot_path, 300)
    return { ...item, screenshot_url: signed?.signedUrl || null }
  }))
  return NextResponse.json({ feedback })
}

export async function PATCH(request: Request) {
  const authenticated = await authenticateAnalyticsRequest(request)
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAnalyticsAdmin(authenticated.user.id)) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body?.id || !["new", "reviewing", "resolved"].includes(body?.status)) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 })
  }
  const { error } = await authenticated.admin.from("beta_feedback")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id)
  if (error) return NextResponse.json({ error: "Feedback could not be updated." }, { status: 500 })
  return NextResponse.json({ updated: true })
}
