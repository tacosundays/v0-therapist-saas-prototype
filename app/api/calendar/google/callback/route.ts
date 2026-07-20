import { NextResponse } from "next/server"
import {
  encryptToken,
  exchangeCodeForTokens,
  fetchGoogleProfile,
  getAdminClient,
  getOrigin,
  verifyState,
} from "@/lib/google-calendar"

export async function GET(request: Request) {
  const origin = getOrigin(request)

  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const oauthError = url.searchParams.get("error")

    if (oauthError) {
      return NextResponse.redirect(`${origin}/dashboard/settings?calendar=error&message=${encodeURIComponent("Google Calendar connection was not completed.")}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${origin}/dashboard/settings?calendar=error&message=${encodeURIComponent("Missing Google OAuth response.")}`)
    }

    const payload = verifyState<{ therapistId: string; email: string; exp: number }>(state)
    if (!payload.therapistId) {
      throw new Error("Calendar connection state is missing therapist context.")
    }

    const adminClient = getAdminClient()
    const { data: therapist, error: therapistError } = await adminClient
      .from("therapists")
      .select("id")
      .eq("id", payload.therapistId)
      .ilike("email", payload.email)
      .maybeSingle()

    if (therapistError || !therapist) {
      throw new Error("Calendar connection state could not be verified.")
    }

    const tokens = await exchangeCodeForTokens(request, code)
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Google did not return a refresh token. Try connecting again and approve offline calendar access.")
    }

    const profile = await fetchGoogleProfile(tokens.access_token)
    const tokenExpiresAt = new Date(Date.now() + ((tokens.expires_in || 3600) - 60) * 1000).toISOString()
    const scopes = tokens.scope?.split(/\s+/).filter(Boolean) || []

    const { error } = await adminClient
      .from("therapist_calendar_connections")
      .upsert({
        therapist_id: payload.therapistId,
        provider: "google",
        provider_account_email: profile?.email || payload.email || null,
        calendar_id: "primary",
        access_token_encrypted: encryptToken(tokens.access_token),
        refresh_token_encrypted: encryptToken(tokens.refresh_token),
        token_expires_at: tokenExpiresAt,
        scopes,
      }, { onConflict: "therapist_id,provider,calendar_id" })

    if (error) throw new Error(error.message)

    return NextResponse.redirect(`${origin}/dashboard/settings?calendar=connected`)
  } catch (error) {
    console.warn("[security] Calendar OAuth callback failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    return NextResponse.redirect(
      `${origin}/dashboard/settings?calendar=error&message=${encodeURIComponent("Google Calendar connection failed.")}`,
    )
  }
}
