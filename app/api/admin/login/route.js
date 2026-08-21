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
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    // 1. Validar que vengan ambos campos
    if (!email || !password) {
      return NextResponse.json(
        { message: "El correo y la contraseña son requeridos." },
        { status: 400 },
      );
    }

    const user = await findAdminUserByEmail(email);

    // 2. Verificar la contraseña siempre para evitar timing attacks
    // (Pasa un hash dummy en caso de que el usuario no exista o esté inactivo)
    const dummyHash =
      "scrypt$16384$8$1$0000000000000000000000==$0000000000000000000000==";
    const targetHash = user?.password_hash || dummyHash;
    const isPasswordCorrect = await verifyAdminPassword(password, targetHash);

    const isValidUser = Boolean(user && user.is_active && isPasswordCorrect);

    if (!isValidUser) {
      return NextResponse.json(
        { message: "El correo o la contraseña no son correctos." },
        { status: 401 },
      );
    }

    const token = await createAdminSession(user, request);
    const response = NextResponse.json({ message: "Sesión iniciada." });

    response.cookies.set(ADMIN_COOKIE, token, getAdminCookieOptions());

    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json(
      { message: "No fue posible iniciar sesión." },
      { status: 500 },
    );
  }
}
