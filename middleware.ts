import { type NextRequest } from "next/server";
import { updateSession } from "utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Protected routes that need auth
    "/goals/:path*",
    "/habits/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/settings",
    "/settings/:path*",
    
    // Auth routes
    "/sign-in",
    "/sign-up",
    "/sign-out",
    "/auth/callback",
    "/forgot-password",
    
    // Root route
    "/"
  ],
};
