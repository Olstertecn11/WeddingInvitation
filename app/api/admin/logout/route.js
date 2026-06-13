import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  getAdminCookieOptions,
} from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ message: "Sesión cerrada." });
  response.cookies.set(ADMIN_COOKIE, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });
  return response;
}
