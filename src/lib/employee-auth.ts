import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function getEmployeeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("employee_session")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getEmployeeIdFromSession(): Promise<string | null> {
  const payload = await getEmployeeSession();
  return (payload?.employeeId as string) || null;
}
