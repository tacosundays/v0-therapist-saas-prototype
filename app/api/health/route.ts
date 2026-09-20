import { type NextRequest, NextResponse } from "next/server"
import { getProductionReadiness } from "@/lib/health-readiness"

export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  const readiness = getProductionReadiness(process.env, request.nextUrl.origin)

  return NextResponse.json(
    {
      status: readiness.ready ? "ok" : "degraded",
      service: "sessionsteps",
      checks: readiness.checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: readiness.ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  )
}
