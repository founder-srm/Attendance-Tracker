import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // Refresh the session cookie on every request. This prevents the access
  // token from expiring while the user is still active.
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // Server-side guard: redirect unauthenticated users away from protected routes.
  // Role-based routing (admin vs member) is handled by AuthProvider on the client.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
