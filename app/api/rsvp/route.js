import { after, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { cleanText } from "@/lib/invitations";
import { getClientIp, hashIp, isValidEmail, isValidPhone } from "@/lib/rsvp";
import { sendRsvpConfirmationEmail } from "@/lib/rsvp-email";

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

  let connection;

  try {
    connection = await getPool().getConnection();
    await connection.beginTransaction();
    const [guestCodeInvitations] = await connection.execute(
      `SELECT i.id, i.code, i.display_name, i.max_guests, i.link_mode,
              ig.id AS selected_guest_id
       FROM invitation_guests ig
       INNER JOIN invitations i ON i.id = ig.invitation_id
       WHERE ig.code = ? AND i.status = 'active' AND i.link_mode = 'individual'
       LIMIT 1
       FOR UPDATE`,
      [code],
    );
    const [invitations] = await connection.execute(
      `SELECT id, code, display_name, max_guests, link_mode
       FROM invitations
       WHERE code = ?
         AND status = 'active'
         AND (link_mode = 'group' OR invitation_type = 'individual')
       LIMIT 1
       FOR UPDATE`,
      [code],
    );

    const invitation = guestCodeInvitations[0] || invitations[0];
    const selectedGuestId = invitation?.selected_guest_id || null;
    if (!invitation) {
      await connection.rollback();
      return NextResponse.json(
        { message: "El código de invitación no es válido o ya no está activo." },
        { status: 404 },
      );
    }

    const [guestRows] = await connection.execute(
      `SELECT id, code, full_name, ceremony_role
       FROM invitation_guests
       WHERE invitation_id = ?
         ${selectedGuestId ? "AND id = ?" : ""}
       ORDER BY is_primary DESC, id
       FOR UPDATE`,
      selectedGuestId ? [invitation.id, selectedGuestId] : [invitation.id],
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
      selectedGuestId,
      contactName,
      contactEmail,
      contactPhone || null,
      dietaryNotes || null,
      guestMessage || null,
      hashIp(getClientIp(request)),
      cleanText(request.headers.get("user-agent"), 500) || null,
    ];

    const [existing] = await connection.execute(
      `SELECT id FROM rsvps
       WHERE invitation_id = ?
         AND ${
           selectedGuestId
             ? "invitation_guest_id = ?"
             : "invitation_guest_id IS NULL"
         }
       LIMIT 1
       FOR UPDATE`,
      selectedGuestId ? [invitation.id, selectedGuestId] : [invitation.id],
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
        [...rsvpValues.slice(2), rsvpId],
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO rsvps
         (invitation_id, invitation_guest_id, contact_name, contact_email, contact_phone,
          dietary_notes, guest_message, ip_hash, user_agent, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
    const confirmedGuest =
      guestRows.find((guest) => Number(guest.id) === Number(selectedGuestId)) ||
      guestRows[0];
    const confirmedResponse =
      guestResponses.find(
        (response) =>
          Number(response.invitationGuestId) === Number(confirmedGuest?.id),
      ) || guestResponses[0];
    const responseByGuestId = new Map(
      guestResponses.map((response) => [
        Number(response.invitationGuestId),
        response.attendanceStatus,
      ]),
    );

    after(() => {
      sendRsvpConfirmationEmail({
        to: contactEmail,
        invitation: {
          id: invitation.id,
          code: invitation.code,
          displayName: invitation.display_name,
          linkMode: invitation.link_mode,
        },
        guest: {
          id: confirmedGuest.id,
          code: confirmedGuest.code,
          fullName: confirmedGuest.full_name,
          ceremonyRole: confirmedGuest.ceremony_role,
        },
        guests: guestRows.map((guest) => ({
          id: guest.id,
          code: guest.code,
          fullName: guest.full_name,
          ceremonyRole: guest.ceremony_role,
          attendanceStatus: responseByGuestId.get(Number(guest.id)) || "pending",
        })),
        attendanceStatus: confirmedResponse.attendanceStatus,
      }).catch((error) => {
        console.warn(
          "RSVP confirmation email failed:",
          error?.code || error?.message || error,
        );
      });
    });

    return NextResponse.json({
      message: existing.length
        ? "Actualizamos tu respuesta. Gracias por avisarnos."
        : "¡Gracias! Tu respuesta quedó registrada.",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("RSVP registration failed:", error);
    return NextResponse.json(
      {
        message:
          error?.code === "ETIMEDOUT"
            ? "La base de datos tardó demasiado en responder. Intenta nuevamente en unos segundos."
            : "No pudimos guardar tu respuesta. Por favor intenta nuevamente.",
      },
      { status: error?.code === "ETIMEDOUT" ? 503 : 500 },
    );
  } finally {
    if (connection) connection.release();
  }
}
