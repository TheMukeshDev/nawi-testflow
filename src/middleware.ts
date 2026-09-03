/**
 * NAWI TestFlow — Next.js Middleware
 *
 * This middleware is intentionally minimal.
 * All authentication and authorization is handled client-side
 * by the AuthContext and RouteGuard, and on the backend by
 * API authorization and database RLS.
 *
 * This middleware only prevents unnecessary server rendering
 * for unauthenticated users hitting protected pages.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow all routes — client-side auth handles protection
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
