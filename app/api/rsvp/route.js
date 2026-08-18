import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cleanText } from "@/lib/invitations";
import { getClientIp, hashIp, isValidEmail, isValidPhone } from "@/lib/rsvp";

export const runtime = "nodejs";

const ATTENDANCE_STATUSES = new Set(["pending", "attending", "not_attending"]);

function normalizeGuestResponses(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((response) => ({
      invitationGuestId: Number(response?.invitationGuestId),
      attendanceStatus: cleanText(response?.attendanceStatus, 32),
    }))
    .filter(
      (response) =>
        Number.isInteger(response.invitationGuestId) &&
        response.invitationGuestId > 0 &&
        ATTENDANCE_STATUSES.has(response.attendanceStatus),
    )
    .slice(0, 20);
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
  const contactName = cleanText(payload.contactName, 160);
  const contactEmail = cleanText(payload.contactEmail, 190).toLowerCase();
  const contactPhone = cleanText(payload.contactPhone, 30);
  const dietaryNotes = cleanText(payload.dietaryNotes, 500);
  const guestMessage = cleanText(payload.guestMessage, 500);
  const guestResponses = normalizeGuestResponses(payload.guestResponses);

  if (!code || !contactName || !isValidEmail(contactEmail)) {
    return NextResponse.json(
      { message: "Revisa tu código, nombre de contacto y correo electrónico." },
      { status: 400 },
    );
  }

  if (contactPhone && !isValidPhone(contactPhone)) {
    return NextResponse.json(
      { message: "Revisa el teléfono de contacto." },
      { status: 400 },
    );
  }

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const [invitations] = await connection.execute(
      `SELECT id, max_guests
       FROM invitations
       WHERE code = ? AND status = 'active'
       LIMIT 1
       FOR UPDATE`,
      [code],
    );

    if (!invitations.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "El código de invitación no es válido o ya no está activo." },
        { status: 404 },
      );
    }

    const invitation = invitations[0];
    const [guestRows] = await connection.execute(
      `SELECT id
       FROM invitation_guests
       WHERE invitation_id = ?
       ORDER BY is_primary DESC, id
       FOR UPDATE`,
      [invitation.id],
    );

    if (!guestRows.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "La invitación no tiene integrantes configurados." },
        { status: 409 },
      );
    }

    if (guestRows.length > invitation.max_guests) {
      await connection.rollback();
      return NextResponse.json(
        { message: "La invitación excede el máximo de invitados configurado." },
        { status: 409 },
      );
    }

    const allowedIds = new Set(guestRows.map((guest) => Number(guest.id)));
    const responseIds = new Set(
      guestResponses.map((response) => response.invitationGuestId),
    );

    if (
      guestResponses.length !== guestRows.length ||
      responseIds.size !== guestRows.length ||
      guestResponses.some((response) => !allowedIds.has(response.invitationGuestId))
    ) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Responde la asistencia de cada persona incluida." },
        { status: 400 },
      );
    }

    const rsvpValues = [
      invitation.id,
      contactName,
      contactEmail,
      contactPhone || null,
      dietaryNotes || null,
      guestMessage || null,
      hashIp(getClientIp(request)),
      cleanText(request.headers.get("user-agent"), 500) || null,
    ];

    const [existing] = await connection.execute(
      "SELECT id FROM rsvps WHERE invitation_id = ? LIMIT 1 FOR UPDATE",
      [invitation.id],
    );

    let rsvpId;
    if (existing.length) {
      rsvpId = existing[0].id;
      await connection.execute(
        `UPDATE rsvps
         SET contact_name = ?,
             contact_email = ?,
             contact_phone = ?,
             dietary_notes = ?,
             guest_message = ?,
             ip_hash = ?,
             user_agent = ?,
             submitted_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [...rsvpValues.slice(1), rsvpId],
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO rsvps
         (invitation_id, contact_name, contact_email, contact_phone,
          dietary_notes, guest_message, ip_hash, user_agent, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        rsvpValues,
      );
      rsvpId = result.insertId;
    }

    for (const response of guestResponses) {
      await connection.execute(
        `INSERT INTO rsvp_guest_responses
         (rsvp_id, invitation_guest_id, attendance_status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           attendance_status = VALUES(attendance_status),
           updated_at = NOW()`,
        [
          rsvpId,
          response.invitationGuestId,
          response.attendanceStatus,
        ],
      );
    }

    await connection.commit();
    return NextResponse.json({
      message: existing.length
        ? "Actualizamos tu respuesta. Gracias por avisarnos."
        : "¡Gracias! Tu respuesta quedó registrada.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("RSVP registration failed:", error);
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
