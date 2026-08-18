import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createAdminSession,
  findAdminUserByEmail,
  getAdminCookieOptions,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const user = await findAdminUserByEmail(email);
    const validPassword =
      user?.is_active && (await verifyAdminPassword(password, user.password_hash));

    if (!validPassword) {
      return NextResponse.json(
        { message: "El correo o la contraseña no son correctos." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ message: "Sesión iniciada." });
    response.cookies.set(
      ADMIN_COOKIE,
      await createAdminSession(user, request),
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
