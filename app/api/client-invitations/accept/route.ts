import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(request: Request) {
  try {
    const { clientId, email, fullName, inviteToken, userId } = await request.json()

    if (!clientId || !email || !fullName || !inviteToken || !userId) {
      return NextResponse.json({ error: "Missing invitation acceptance data" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Invitation acceptance is not configured" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const normalizedEmail = String(email).trim().toLowerCase()
    const inviteTokenHash = hashInviteToken(String(inviteToken))

    const { data: client, error: lookupError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("email", normalizedEmail)
      .eq("invite_token_hash", inviteTokenHash)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }

    if (!client) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        user_id: userId,
        full_name: fullName,
        invite_accepted_at: new Date().toISOString(),
        invite_token_hash: null,
      })
      .eq("id", clientId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept invite" },
      { status: 500 }
    )
  }
}
