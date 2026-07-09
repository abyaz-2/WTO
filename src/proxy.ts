import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/proxy";

const DASHBOARD_ROUTES = ["/dashboard"];
const AUTH_ROUTES = ["/", "/login"];

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = await createClient(request);

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = DASHBOARD_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r);

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.svg|.*\\.png).*)",
  ],
};
