import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Get session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // If user is logged in and tries to access the root marketing page, redirect to dashboard
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Allow request to proceed
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*) ',
     // Apply middleware only to the root path for this specific redirect rule
     // If adding protected route logic later, adjust matcher accordingly
     '/',
  ],
} 