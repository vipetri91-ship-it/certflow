import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rotas do portal do parceiro têm autenticação própria — não interferir
  if (pathname.startsWith('/portal')) {
    const reqHeaders = new Headers(req.headers)
    reqHeaders.set('x-pathname', pathname)
    return NextResponse.next({ request: { headers: reqHeaders } })
  }

  // Modo TV do painel de Performance — acesso público por token na própria
  // URL (sem login), validado dentro da página. Mesma ideia do /portal acima.
  if (pathname.startsWith('/tv/')) {
    return NextResponse.next()
  }

  // Arquivos estáticos e APIs — sem verificação de auth
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css')
  ) {
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
