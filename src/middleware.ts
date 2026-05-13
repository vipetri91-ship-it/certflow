import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/') || pathname.startsWith('/_next') || pathname.endsWith('.png') || pathname.endsWith('.ico')) {
    return NextResponse.next()
  }

  const token =
    req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value

  const isLoginPage = pathname.startsWith('/login')

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}