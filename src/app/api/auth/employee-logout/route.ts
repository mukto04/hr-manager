import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out completely" });
  response.cookies.delete("employee_session");
  return response;
}
