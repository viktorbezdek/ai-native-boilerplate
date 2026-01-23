import { type NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/settings", "/api/user"];

// Routes that are only for unauthenticated users
const authRoutes = ["/sign-in", "/sign-up", "/forgot-password"];

/**
 * Validate session token format
 * Better Auth uses format: {session_id}.{signature}
 * This provides basic validation - full validation happens server-side
 */
function isValidTokenFormat(token: string): boolean {
  // Token must exist and have reasonable length
  if (!token || token.length < 32) {
    return false;
  }

  // Better Auth tokens contain alphanumeric characters and some special chars
  // Check for suspicious characters that could indicate tampering
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(token)) {
    return false;
  }

  // Token should have the signature part (contains a dot)
  if (!token.includes(".")) {
    return false;
  }

  return true;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session token from cookie
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Validate token format for protected routes
  const hasValidToken = sessionToken && isValidTokenFormat(sessionToken);

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !hasValidToken) {
    // Clear any malformed session cookie
    const response = NextResponse.redirect(
      new URL(
        `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`,
        request.url
      )
    );
    if (sessionToken && !hasValidToken) {
      response.cookies.delete("better-auth.session_token");
    }
    return response;
  }

  // Redirect authenticated users from auth routes
  // For auth routes, we trust the token exists - server will validate fully
  if (isAuthRoute && hasValidToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
