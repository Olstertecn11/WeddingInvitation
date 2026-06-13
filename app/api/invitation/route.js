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
      `SELECT id, display_name, invitation_type, max_guests,
              personalized_message, active
       FROM invitations
       WHERE code = ?
       LIMIT 1`,
      [code],
    );
    if (!rows.length) {
      return NextResponse.json(
        { message: "Invitación no encontrada." },
        { status: 404 },
      );
    }
    if (!rows[0].active) {
      return NextResponse.json(
        {
          message:
            "Esta invitación ya fue respondida y el enlace está cerrado.",
          status: "used",
        },
        { status: 410 },
      );
    }

    const [guests] = await getPool().execute(
      `SELECT id, full_name, gender, is_primary
       FROM invitation_guests
       WHERE invitation_id = ?
       ORDER BY is_primary DESC, id`,
      [rows[0].id],
    );

    return NextResponse.json({
      displayName: rows[0].display_name,
      invitationType: rows[0].invitation_type,
      maxGuests: rows[0].max_guests,
      personalizedMessage: rows[0].personalized_message,
      guests: guests.map((guest) => ({
        id: guest.id,
        fullName: guest.full_name,
        gender: guest.gender,
        isPrimary: Boolean(guest.is_primary),
      })),
    });
  } catch (error) {
    console.error("Invitation lookup failed:", error);
    return NextResponse.json(
      { message: "El servicio de invitaciones no está disponible." },
      { status: 503 },
    );
  }
}
