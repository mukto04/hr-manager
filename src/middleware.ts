import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const HR_COOKIE = "hr_auth_token";
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/auth/login",
  "/api/tenant/resolve",
  "/employee-login",
  "/api/auth/employee-login",
  "/super-admin/login",
  "/api/super-admin/login",
  "/api/super-admin/settings/public",
  "/public",
  "/api/landing-page",
  "/api/debug-db",
  "/api/attendance/heartbeat",
  "/api/attendance/sync-push",
  "/api/attendance/adms"
];

// Helper to check if a path exactly match or is a subpath of a prefix (e.g. /employee match /employee/1 but not /employees)
function matchPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets
  if (
    pathname.includes(".") || 
    pathname.startsWith("/_next") || 
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/super-admin/test-db")
  ) {
    return NextResponse.next();
  }

  // 2. Allow public paths & handle dynamic company URIs
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Handle dynamic /[slug]-hr paths (login page OR dashboard sub-paths)
  if (pathname.includes("-hr")) {
    const hrIdx = pathname.indexOf("-hr");
    // Only match if -hr is followed by end or /
    const afterHr = pathname.slice(hrIdx + 3); // what comes after "-hr"
    if (afterHr === "" || afterHr.startsWith("/")) {
      const slugPart = pathname.slice(1, hrIdx); // e.g. "appdevsuk"
      if (slugPart) {
        const url = request.nextUrl.clone();
        if (afterHr === "" || afterHr === "/") {
          // /appdevsuk-hr → rewrite to /login?slug=appdevsuk
          url.pathname = "/login";
          url.searchParams.set("slug", slugPart);
        } else {
          // /appdevsuk-hr/dashboard → rewrite to /dashboard if logged in, else redirect to login
          const hrToken = request.cookies.get(HR_COOKIE)?.value;
          if (!hrToken) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("slug", slugPart);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
          }
          url.pathname = afterHr;
          url.searchParams.delete("slug");
        }
        return NextResponse.rewrite(url);
      }
    }
  }

  // Handle dynamic /[slug]-employee paths
  if (pathname.includes("-employee")) {
    const empIdx = pathname.indexOf("-employee");
    const afterEmp = pathname.slice(empIdx + 9);
    if (afterEmp === "" || afterEmp.startsWith("/")) {
      const slugPart = pathname.slice(1, empIdx);
      if (slugPart) {
        const url = request.nextUrl.clone();
        if (afterEmp === "" || afterEmp === "/") {
          url.pathname = "/employee-login";
          url.searchParams.set("slug", slugPart);
        } else {
          const empToken = request.cookies.get("employee_session")?.value;
          if (!empToken) {
            const loginUrl = new URL("/employee-login", request.url);
            loginUrl.searchParams.set("slug", slugPart);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
          }
          url.pathname = afterEmp;
        }
        return NextResponse.rewrite(url);
      }
    }
  }

  // 3. Super Admin Route Protection (UI & API)
  if (matchPath(pathname, "/super-admin") || matchPath(pathname, "/api/super-admin")) {
    const adminToken = request.cookies.get("super_session")?.value;
    if (pathname === "/api/super-admin/login") return NextResponse.next();
    
    if (!adminToken) {
       if (pathname === "/super-admin/login") return NextResponse.next();
       return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
    
    // Redirect /super-admin to /super-admin/tenants for authenticated admins
    if (pathname === "/super-admin") {
      return NextResponse.redirect(new URL("/super-admin/tenants", request.url));
    }
    
    return NextResponse.next();
  }

  // 4. Employee Portal Route Protection (UI & API)
  // We use strict matching here to avoid conflict with /employees (plural)
  const isEmployeePortal = matchPath(pathname, "/employee") || matchPath(pathname, "/api/employee");

  if (isEmployeePortal) {
    const empToken = request.cookies.get("employee_session")?.value;
    if (!empToken) return NextResponse.redirect(new URL("/employee-login", request.url));
    
    try {
      const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
      await jose.jwtVerify(empToken, secret);
      return NextResponse.next();
    } catch (err) {
      // Token expired or invalid
      const response = NextResponse.redirect(new URL("/employee-login", request.url));
      response.cookies.delete("employee_session");
      return response;
    }
  }

  // 5. HR Portal Check (Fallback)
  // Everything else (/, /employees, /attendance, etc.) is considered HR territory
  const hrToken = request.cookies.get(HR_COOKIE)?.value;

  if (!hrToken) {
    if (pathname === "/login") return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
