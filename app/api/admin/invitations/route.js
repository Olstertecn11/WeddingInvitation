import { NextResponse } from "next/server";
import { requestIsAdmin } from "@/lib/admin-auth";
import { getPool } from "@/lib/db";
import {
  cleanText,
  createInvitationCode,
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
  if (!requestIsAdmin(request)) return unauthorized();

  const query = cleanText(new URL(request.url).searchParams.get("q"), 100);
  const like = `%${query}%`;

  try {
    const [invitations] = await getPool().execute(
      `SELECT i.id, i.code, i.display_name, i.invitation_type,
              i.max_guests, i.personalized_message, i.active, i.used_at,
              i.created_at, r.attendance, r.email, r.created_at AS responded_at
       FROM invitations i
       LEFT JOIN rsvps r ON r.invitation_id = i.id
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
      `SELECT id, invitation_id, full_name, gender, is_primary
       FROM invitation_guests
       WHERE invitation_id IN (${placeholders})
       ORDER BY invitation_id, is_primary DESC, id`,
      ids,
    );

    const invitationsWithGuests = invitations.map((invitation) => ({
      ...invitation,
      active: Boolean(invitation.active),
      guests: guests
        .filter((guest) => guest.invitation_id === invitation.id)
        .map((guest) => ({
          id: guest.id,
          fullName: guest.full_name,
          gender: guest.gender,
          isPrimary: Boolean(guest.is_primary),
        })),
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
  if (!requestIsAdmin(request)) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Los datos enviados no son válidos." },
      { status: 400 },
    );
  }

  const invitationType =
    payload.invitationType === "family" ? "family" : "individual";
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
           (code, display_name, invitation_type, max_guests, allowed_guests,
            personalized_message, active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [
            code,
            displayName,
            invitationType,
            guests.length,
            JSON.stringify(guests.map((guest) => guest.fullName)),
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
      await connection.execute(
        `INSERT INTO invitation_guests
         (invitation_id, full_name, normalized_name, gender, is_primary)
         VALUES (?, ?, ?, ?, ?)`,
        [
          invitationId,
          guest.fullName,
          guest.normalizedName,
          guest.gender,
          guest.isPrimary ? 1 : 0,
        ],
      );
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
  if (!requestIsAdmin(request)) return unauthorized();

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
