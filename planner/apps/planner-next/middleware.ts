import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect planner API routes — return JSON 401 for unauthenticated calls
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/planner");
  if (isApiRoute && !user) {
    return NextResponse.json(
      {
        apiVersion: "v1",
        error: {
          code: "UNAUTHENTICATED",
          message: "A valid Supabase session is required.",
        },
      },
      { status: 401 }
    );
  }

  // Redirect unauthenticated page visits to /auth (but not /auth itself)
  const isAuthPage = request.nextUrl.pathname === "/auth" ||
    request.nextUrl.pathname.startsWith("/auth/");
  const isPageRoute =
    !isAuthPage &&
    !request.nextUrl.pathname.startsWith("/api") &&
    !request.nextUrl.pathname.startsWith("/_next");
  if (isPageRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
