import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

async function isAdmin(accessToken: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!supabaseUrl || !serviceKey || !anonKey) return false;

  // Lazy-import to avoid top-level side effects during build
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(supabaseUrl, serviceKey);

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error,
  } = await anonClient.auth.getUser();

  if (error || !user) return false;

  if (adminEmail && user.email === adminEmail) return true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const accessToken = request.cookies.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const allowed = await isAdmin(accessToken);

    if (!allowed) {
      if (request.nextUrl.pathname.startsWith("/admin/api")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
