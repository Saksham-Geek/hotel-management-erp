import { NextResponse, type NextRequest } from 'next/server';

/** Cheap first check: no session cookie, no app. The API still verifies the token on every call. */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const publicPath = path.startsWith('/login')
    || path.startsWith('/verify-email')
    || path.startsWith('/forgot-password')
    || path.startsWith('/reset-password');
  if (!req.cookies.has('erp_token') && !publicPath) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
