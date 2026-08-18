import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  getAdminCookieOptions,
  revokeAdminSession,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request) {
  await revokeAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);

  const response = NextResponse.json({ message: "Sesión cerrada." });
  response.cookies.set(ADMIN_COOKIE, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });
  return response;
}
