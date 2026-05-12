import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const slug = body?.slug as string | undefined;

    // Redirect to branded company login if slug available, else generic /login
    const redirectUrl = slug ? `/${slug}-hr` : "/login";
    const response = NextResponse.json({ message: "Logged out", redirect: redirectUrl });

    // Clear the correct auth cookie
    response.cookies.set("hr_auth_token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
      secure: true,
      sameSite: "lax",
    });
    return response;
  } catch {
    const response = NextResponse.json({ message: "Logged out" });
    response.cookies.set("hr_auth_token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
    return response;
  }
}
