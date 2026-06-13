import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  getClientIp,
  hashIp,
  isValidEmail,
  normalizeName,
} from "@/lib/rsvp";
import { cleanText } from "@/lib/invitations";

export const runtime = "nodejs";

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { message: "La información enviada no es válida." },
      { status: 400 },
    );
  }

  const code = cleanText(payload.invitationCode, 64);
  const selectedGuestIds = Array.isArray(payload.selectedGuestIds)
    ? payload.selectedGuestIds
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
        .slice(0, 20)
    : [];
  const email = cleanText(payload.email, 190).toLowerCase();
  const attendance = payload.attendance === "yes" ? "yes" : "no";
  const dietaryNotes = cleanText(payload.dietaryNotes, 500);

  if (!code || !isValidEmail(email)) {
    return NextResponse.json(
      { message: "Revisa tu código, nombre y correo electrónico." },
      { status: 400 },
    );
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [invitations] = await connection.execute(
      `SELECT id, display_name, max_guests
       FROM invitations
       WHERE code = ? AND active = 1
       LIMIT 1
       FOR UPDATE`,
      [code],
    );

    if (!invitations.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "El código de invitación no es válido." },
        { status: 404 },
      );
    }

    const invitation = invitations[0];
    const [guestRows] = await connection.execute(
      `SELECT id, full_name, is_primary
       FROM invitation_guests
       WHERE invitation_id = ?
       ORDER BY is_primary DESC, id`,
      [invitation.id],
    );
    const allowedIds = new Set(guestRows.map((guest) => Number(guest.id)));
    const attendingGuests =
      attendance === "yes"
        ? guestRows.filter((guest) => selectedGuestIds.includes(Number(guest.id)))
        : [];

    if (
      attendance === "yes" &&
      (!attendingGuests.length ||
        selectedGuestIds.some((id) => !allowedIds.has(id)))
    ) {
      await connection.rollback();
      return NextResponse.json(
        {
          message: "Selecciona al menos una persona incluida en la invitación.",
        },
        { status: 400 },
      );
    }

    if (!guestRows.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "La invitación no tiene integrantes configurados." },
        { status: 409 },
      );
    }

    const [existing] = await connection.execute(
      "SELECT id FROM rsvps WHERE invitation_id = ? LIMIT 1",
      [invitation.id],
    );
    if (existing.length) {
      await connection.rollback();
      return NextResponse.json(
        {
          message:
            "Esta invitación ya fue confirmada. Escríbenos si necesitas hacer un cambio.",
        },
        { status: 409 },
      );
    }

    const primaryGuest =
      attendingGuests.find((guest) => guest.is_primary) ||
      attendingGuests[0] ||
      guestRows.find((guest) => guest.is_primary) ||
      guestRows[0];
    const companions = attendingGuests
      .filter((guest) => guest.id !== primaryGuest.id)
      .map((guest) => guest.full_name);

    await connection.execute(
      `INSERT INTO rsvps
       (invitation_id, full_name, normalized_name, email, attendance,
        companion_names, dietary_notes, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invitation.id,
        primaryGuest.full_name,
        normalizeName(primaryGuest.full_name),
        email,
        attendance,
        JSON.stringify(companions),
        dietaryNotes || null,
        hashIp(getClientIp(request)),
        cleanText(request.headers.get("user-agent"), 500),
      ],
    );

    await connection.execute(
      `UPDATE invitations
       SET active = 0, used_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [invitation.id],
    );

    await connection.commit();
    return NextResponse.json({
      message:
        attendance === "yes"
          ? "¡Gracias! Tu asistencia quedó confirmada."
          : "Gracias por responder. Te tendremos presente en este día.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("RSVP registration failed:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { message: "Esta invitación ya fue confirmada." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        message:
          "No pudimos guardar tu respuesta. Por favor intenta nuevamente.",
      },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
