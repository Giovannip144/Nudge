import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase client for use in Next.js middleware.
 * Refreshes the session cookie on every request to keep sessions alive.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must await getUser() to keep the session fresh
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const isAuthRoute = url.pathname.startsWith("/login");
  const isApiRoute = url.pathname.startsWith("/api");
  const isPublicRoute = url.pathname === "/";

  // Unauthenticated user trying to access protected route → redirect to login
  if (!user && !isAuthRoute && !isApiRoute && !isPublicRoute) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user visiting login → redirect to inbox
  if (user && isAuthRoute) {
    url.pathname = "/inbox";
    return NextResponse.redirect(url);
  }

  // Authenticated user, check onboarding status
  if (user && !isAuthRoute && !isApiRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .single();

    const isOnboardingRoute = url.pathname.startsWith("/onboarding");
  const isUpgradeRoute     = url.pathname.startsWith("/upgrade");

    if (profile && !profile.onboarded && !isOnboardingRoute && !isUpgradeRoute) {
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (profile?.onboarded && isOnboardingRoute) {
      url.pathname = "/inbox";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
