import { NextResponse } from "next/server";
import { requestIsAdmin } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import {
  cleanText,
  createInvitationCode,
  normalizeCeremonyRole,
  normalizeGuests,
} from "@/lib/invitations";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { message: "Tu sesión administrativa no es válida." },
    { status: 401 },
  );
}

export async function GET(request) {
  if (!(await requestIsAdmin(request))) return unauthorized();

  const query = cleanText(new URL(request.url).searchParams.get("q"), 100);
  const like = `%${query}%`;

  try {
    const [invitations] = await getPool().execute(
      `SELECT i.id, i.code, i.display_name, i.invitation_type,
              i.status, i.max_guests, i.personalized_message,
              i.first_opened_at, i.last_opened_at, i.created_at
       FROM invitations i
       WHERE (? = '' OR i.display_name LIKE ? OR i.code LIKE ?
              OR EXISTS (
                SELECT 1 FROM invitation_guests ig
                WHERE ig.invitation_id = i.id AND ig.full_name LIKE ?
              ))
       ORDER BY i.created_at DESC
       LIMIT 100`,
      [query, like, like, like],
    );

    if (!invitations.length) {
      return NextResponse.json({ invitations: [] });
    }

    const ids = invitations.map((invitation) => invitation.id);
    const placeholders = ids.map(() => "?").join(",");
    const [guests] = await getPool().execute(
      `SELECT id, code, invitation_id, full_name, ceremony_role, is_primary
       FROM invitation_guests
       WHERE invitation_id IN (${placeholders})
       ORDER BY invitation_id, is_primary DESC, id`,
      ids,
    );

    const [rsvps] = await getPool().execute(
      `SELECT id, invitation_id, invitation_guest_id, contact_name,
              contact_email, contact_phone, submitted_at
       FROM rsvps
       WHERE invitation_id IN (${placeholders})
       ORDER BY submitted_at DESC, id DESC`,
      ids,
    );

    const rsvpIds = rsvps.map((rsvp) => rsvp.id);
    let responses = [];
    if (rsvpIds.length) {
      const responsePlaceholders = rsvpIds.map(() => "?").join(",");
      const [responseRows] = await getPool().execute(
        `SELECT rsvp_id, invitation_guest_id, attendance_status
         FROM rsvp_guest_responses
         WHERE rsvp_id IN (${responsePlaceholders})`,
        rsvpIds,
      );
      responses = responseRows;
    }

    const invitationsWithGuests = invitations.map((invitation) => ({
      ...invitation,
      rsvpCount: rsvps.filter((rsvp) => rsvp.invitation_id === invitation.id)
        .length,
      guests: guests
        .filter((guest) => guest.invitation_id === invitation.id)
        .map((guest) => {
          const guestRsvp =
            rsvps.find(
              (rsvp) =>
                rsvp.invitation_id === invitation.id &&
                Number(rsvp.invitation_guest_id) === Number(guest.id),
            ) ||
            rsvps.find(
              (rsvp) =>
                rsvp.invitation_id === invitation.id &&
                rsvp.invitation_guest_id === null,
            );
          return {
            id: guest.id,
            code: guest.code,
            fullName: guest.full_name,
            ceremonyRole: guest.ceremony_role,
            isPrimary: Boolean(guest.is_primary),
            contactName: guestRsvp?.contact_name || null,
            contactEmail: guestRsvp?.contact_email || null,
            attendanceStatus:
              responses.find(
                (response) =>
                  response.rsvp_id === guestRsvp?.id &&
                  response.invitation_guest_id === guest.id,
              )?.attendance_status || "pending",
          };
        }),
    }));

    return NextResponse.json({ invitations: invitationsWithGuests });
  } catch (error) {
    console.error("Admin invitation search failed:", error);
    return NextResponse.json(
      { message: "No pudimos consultar las invitaciones." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  if (!(await requestIsAdmin(request))) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Los datos enviados no son válidos." },
      { status: 400 },
    );
  }

  const invitationType = ["individual", "couple", "family"].includes(
    payload.invitationType,
  )
    ? payload.invitationType
    : "individual";
  const displayName = cleanText(payload.displayName, 160);
  const personalizedMessage = cleanText(payload.personalizedMessage, 500);
  const guests = normalizeGuests(payload.guests);

  if (!displayName || !guests.length) {
    return NextResponse.json(
      { message: "Agrega un nombre para la invitación y al menos un invitado." },
      { status: 400 },
    );
  }

  if (invitationType === "individual" && guests.length !== 1) {
    return NextResponse.json(
      { message: "Una invitación individual debe tener un solo invitado." },
      { status: 400 },
    );
  }

  if (invitationType === "couple" && guests.length !== 2) {
    return NextResponse.json(
      { message: "Una invitación de pareja debe tener dos invitados." },
      { status: 400 },
    );
  }

  if (guests.length > 20) {
    return NextResponse.json(
      { message: "La invitación no puede incluir más de 20 personas." },
      { status: 400 },
    );
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    let code;
    let invitationId;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      code = createInvitationCode();
      try {
        const [result] = await connection.execute(
          `INSERT INTO invitations
           (code, display_name, invitation_type, status, max_guests,
            personalized_message)
           VALUES (?, ?, ?, 'active', ?, ?)`,
          [
            code,
            displayName,
            invitationType,
            guests.length,
            personalizedMessage || null,
          ],
        );
        invitationId = result.insertId;
        break;
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY" || attempt === 2) throw error;
      }
    }

    for (const guest of guests) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await connection.execute(
            `INSERT INTO invitation_guests
             (code, invitation_id, full_name, normalized_name, ceremony_role,
              is_primary)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              createInvitationCode(),
              invitationId,
              guest.fullName,
              guest.normalizedName,
              guest.ceremonyRole,
              guest.isPrimary ? 1 : 0,
            ],
          );
          break;
        } catch (error) {
          if (error.code !== "ER_DUP_ENTRY" || attempt === 2) throw error;
        }
      }
    }

    await connection.commit();
    return NextResponse.json(
      {
        message: "Invitación creada correctamente.",
        invitation: { id: invitationId, code },
      },
      { status: 201 },
    );
  } catch (error) {
    await connection.rollback();
    console.error("Admin invitation creation failed:", error);
    return NextResponse.json(
      { message: "No pudimos crear la invitación." },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}

export async function DELETE(request) {
  if (!(await requestIsAdmin(request))) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { message: "La solicitud de eliminación no es válida." },
      { status: 400 },
    );
  }

  const invitationId = Number(payload.id);
  if (!Number.isInteger(invitationId) || invitationId < 1) {
    return NextResponse.json(
      { message: "La invitación indicada no es válida." },
      { status: 400 },
    );
  }

  try {
    const [result] = await getPool().execute(
      "DELETE FROM invitations WHERE id = ?",
      [invitationId],
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { message: "La invitación ya no existe." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Invitación eliminada correctamente.",
    });
  } catch (error) {
    console.error("Admin invitation deletion failed:", error);
    return NextResponse.json(
      { message: "No pudimos eliminar la invitación." },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  if (!(await requestIsAdmin(request))) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { message: "La solicitud de actualización no es válida." },
      { status: 400 },
    );
  }

  const guestId = Number(payload.guestId);
  const ceremonyRole = normalizeCeremonyRole(payload.ceremonyRole);

  if (!Number.isInteger(guestId) || guestId < 1) {
    return NextResponse.json(
      { message: "El invitado indicado no es válido." },
      { status: 400 },
    );
  }

  try {
    const [result] = await getPool().execute(
      `UPDATE invitation_guests
       SET ceremony_role = ?, updated_at = NOW()
       WHERE id = ?`,
      [ceremonyRole, guestId],
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { message: "El invitado ya no existe." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Rol actualizado correctamente.",
      guest: { id: guestId, ceremonyRole },
    });
  } catch (error) {
    console.error("Admin guest update failed:", error);
    return NextResponse.json(
      { message: "No pudimos actualizar el rol del invitado." },
      { status: 500 },
    );
  }
}
