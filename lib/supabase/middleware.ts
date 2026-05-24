import { NextResponse, type NextRequest } from 'next/server'

// Note: This middleware cannot check Supabase auth because the JS client
// stores sessions in localStorage (browser-only), not in cookies.
// Auth protection is handled client-side in each protected page/component.
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  return response
}
