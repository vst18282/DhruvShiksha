import { NextResponse, type NextRequest } from 'next/server';
import { rolesForPath } from '@/lib/permissions-core';
import type { Role } from '@/types';

/**
 * Demo route protection. The `demo_role` cookie is set by the client-side demo login.
 * NOT a security boundary — a real deployment must verify a signed session server-side.
 */
const VALID: Role[] = ['admin', 'scientist', 'content_manager', 'researcher', 'student'];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const roles = rolesForPath(pathname);
  if (!roles) return NextResponse.next();

  const cookie = req.cookies.get('demo_role')?.value as Role | undefined;
  const role = cookie && VALID.includes(cookie) ? cookie : null;

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (!roles.includes(role)) {
    const url = req.nextUrl.clone();
    url.pathname = '/403';
    url.search = `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/studio/:path*', '/upload/:path*'],
};
