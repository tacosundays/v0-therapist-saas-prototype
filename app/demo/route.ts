import { NextResponse } from "next/server"

export function GET(request: Request) {
  const destination = new URL("/dashboard?demo=1", request.url)
  const response = NextResponse.redirect(destination)
  response.cookies.set("shrinkaId.demoMode", "true", {
    httpOnly: false,
    maxAge: 60 * 60 * 24,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  return response
}
