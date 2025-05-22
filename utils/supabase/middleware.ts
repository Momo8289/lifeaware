import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // Get current path
  const path = request.nextUrl.pathname;
  
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Skip middleware entirely for static assets or special paths
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/.well-known/') ||
    path.includes('favicon') ||
    path.endsWith('.json') ||
    path.endsWith('.ico') ||
    path.endsWith('.svg') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg')
  ) {
    return response;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Always allow access to authentication-related routes
    if (
      path === '/sign-in' || 
      path === '/sign-up' || 
      path === '/forgot-password' ||
      path.startsWith('/auth/')
    ) {
      // Check if the user is already logged in - if so, redirect to dashboard
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return response;
    }

    // Define protected routes that require authentication
    const isProtectedRoute = 
      path.startsWith('/goals') || 
      path.startsWith('/habits') || 
      path.startsWith('/dashboard') || 
      path.startsWith('/settings');
    
    // Only check auth for protected routes
    if (isProtectedRoute) {
      // Refresh session
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // Redirect to sign-in for protected routes if no user
      if (!user || error) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    }

    return response;
  } catch (e) {
    // Silent error handling in production
    // For protected routes, redirect to sign-in
    // For others, just return the original response to avoid loops
    const path = request.nextUrl.pathname;
    const isProtectedRoute = 
      path.startsWith('/goals') || 
      path.startsWith('/habits') || 
      path.startsWith('/dashboard') || 
      path.startsWith('/settings');
    
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    
    return response;
  }
};
