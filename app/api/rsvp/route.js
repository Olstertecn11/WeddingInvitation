import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  getClientIp,
  hashIp,
  isValidEmail,
  normalizeName,
} from "@/lib/rsvp";

export const runtime = "nodejs";

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

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
  const fullName = cleanText(payload.fullName, 160);
  const email = cleanText(payload.email, 190).toLowerCase();
  const attendance = payload.attendance === "yes" ? "yes" : "no";
  const dietaryNotes = cleanText(payload.dietaryNotes, 500);
  const companions = Array.isArray(payload.companionNames)
    ? payload.companionNames
        .map((name) => cleanText(name, 160))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  if (!code || fullName.length < 3 || !isValidEmail(email)) {
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
      `SELECT id, display_name, max_guests, allowed_guests
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
    const allowedGuests =
      typeof invitation.allowed_guests === "string"
        ? JSON.parse(invitation.allowed_guests)
        : invitation.allowed_guests || [];
    const submittedNames = [fullName, ...companions].map(normalizeName);
    const allowedNames = allowedGuests.map(normalizeName);

    if (submittedNames.length > invitation.max_guests) {
      await connection.rollback();
      return NextResponse.json(
        {
          message: `Esta invitación permite ${invitation.max_guests} persona(s).`,
        },
        { status: 400 },
      );
    }

    if (
      allowedNames.length &&
      submittedNames.some((name) => !allowedNames.includes(name))
    ) {
      await connection.rollback();
      return NextResponse.json(
        {
          message:
            "Uno de los nombres no coincide con las personas incluidas en la invitación.",
        },
        { status: 400 },
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

    await connection.execute(
      `INSERT INTO rsvps
       (invitation_id, full_name, normalized_name, email, attendance,
        companion_names, dietary_notes, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invitation.id,
        fullName,
        normalizeName(fullName),
        email,
        attendance,
        JSON.stringify(companions),
        dietaryNotes || null,
        hashIp(getClientIp(request)),
        cleanText(request.headers.get("user-agent"), 500),
      ],
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
