import { NextResponse } from "next/server"
import { getGoogleAuthUrl, resolveTherapistFromToken, signState } from "@/lib/google-calendar"

export async function POST(request: Request) {
  try {
    const resolved = await resolveTherapistFromToken(request)
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status })

    const state = signState({
      therapistId: resolved.therapist.id,
      email: resolved.user.email,
      exp: Date.now() + 10 * 60 * 1000,
    })

    return NextResponse.json({ authUrl: getGoogleAuthUrl(request, state) })
  } catch (error) {
    console.warn("[security] Calendar OAuth start failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    return NextResponse.json(
      { error: "We couldn't start Google Calendar connection." },
      { status: 500 },
    )
  }
}
