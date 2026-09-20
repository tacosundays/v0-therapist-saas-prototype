import { NextResponse } from "next/server"
import { getProductionReadiness } from "@/lib/health-readiness"

export const dynamic = "force-dynamic"

export function GET() {
  const readiness = getProductionReadiness(process.env)

  return NextResponse.json(
    {
      status: readiness.ready ? "ok" : "degraded",
      service: "sessionsteps",
      timestamp: new Date().toISOString(),
    },
    {
      status: readiness.ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  )
}
