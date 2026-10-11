import { NextResponse, type NextRequest } from 'next/server';

/** Cheap first check: no session cookie, no app. The API still verifies the token on every call. */
export function middleware(req: NextRequest) {
  if (!req.cookies.has('erp_token') && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
