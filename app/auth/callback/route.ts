import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getURL } from "@/utils/helpers";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();
  const baseUrl = getURL().replace(/\/$/, ''); // Remove trailing slash if present
  const type = requestUrl.searchParams.get("type")?.toString();

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // If this is a password reset, redirect to the sign in page
    if (type === 'recovery') {
      return NextResponse.redirect(`${baseUrl}/sign-in?message=password_updated`);
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${baseUrl}${redirectTo}`);
  }

  // URL to redirect to after sign up process completes
  return NextResponse.redirect(`${baseUrl}/dashboard`);
}
