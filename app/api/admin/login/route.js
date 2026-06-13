import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createAdminSession,
  getAdminCookieOptions,
  isValidAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (!isValidAdminPassword(password)) {
      return NextResponse.json(
        { message: "La contraseña no es correcta." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ message: "Sesión iniciada." });
    response.cookies.set(
      ADMIN_COOKIE,
      createAdminSession(),
      getAdminCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json(
      { message: "No fue posible iniciar sesión." },
      { status: 500 },
    );
  }
}
