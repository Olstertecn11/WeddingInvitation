import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ message: "Falta el código." }, { status: 400 });
  }

  try {
    const [rows] = await getPool().execute(
      `SELECT display_name, max_guests, allowed_guests
       FROM invitations
       WHERE code = ? AND active = 1
       LIMIT 1`,
      [code],
    );
    if (!rows.length) {
      return NextResponse.json(
        { message: "Invitación no encontrada." },
        { status: 404 },
      );
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Invitation lookup failed:", error);
    return NextResponse.json(
      { message: "El servicio de invitaciones no está disponible." },
      { status: 503 },
    );
  }
}
