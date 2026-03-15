import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const userCookie = request.cookies.get('user')?.value;
  const { pathname } = request.nextUrl;

  // 1. If trying to access protected pages without token/user, redirect to login
  if (!token || !userCookie) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/member')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  let user;
  try {
    user = JSON.parse(userCookie);
  } catch (e) {
    // If cookie is invalid, treat as logged out
    return NextResponse.next();
  }

  // 2. If already logged in and trying to access login page (/), redirect to dashboard
  if (pathname === '/') {
    if (user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else {
      return NextResponse.redirect(new URL('/member', request.url));
    }
  }

  // 3. Role-based access control
  if (pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/member', request.url));
  }

  if (pathname.startsWith('/member') && user.role === 'admin') {
    // Admins are technically allowed in member view or we can keep them in admin
    // For now, let's allow admins to stay in admin
    return NextResponse.next();
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/', '/admin/:path*', '/member/:path*'],
};
