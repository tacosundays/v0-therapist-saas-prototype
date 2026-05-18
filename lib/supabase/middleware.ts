import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  // If Supabase is not configured, skip auth checks and allow all routes
  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Get auth token from cookie
  const authCookie = request.cookies.get('sb-access-token')?.value
  let user = null

  if (authCookie) {
    try {
      const { data } = await supabase.auth.getUser(authCookie)
      user = data.user
    } catch {
      // Token invalid or expired
      user = null
    }
  }

  // Check for session cookie as fallback
  const sessionCookie = request.cookies.get('supabase-auth-token')?.value
  if (!user && sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie)
      if (session?.access_token) {
        const { data } = await supabase.auth.getUser(session.access_token)
        user = data.user
      }
    } catch {
      user = null
    }
  }

  // Protected routes check
  const protectedPaths = ['/dashboard', '/portal', '/onboarding']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.includes(request.nextUrl.pathname)

  if (isAuthPath && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}
