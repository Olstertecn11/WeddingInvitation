import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ message: "Falta el código." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, display_name, invitation_type, status, max_guests,
              personalized_message
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
    if (rows[0].status !== "active") {
      return NextResponse.json(
        {
          message: "Esta invitación no está disponible.",
          status: rows[0].status,
        },
        { status: 410 },
      );
    }

    await pool.execute(
      `UPDATE invitations
       SET first_opened_at = IFNULL(first_opened_at, NOW()),
           last_opened_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [rows[0].id],
    );

    const [guests] = await pool.execute(
      `SELECT id, full_name, gender, is_primary
       FROM invitation_guests
       WHERE invitation_id = ?
       ORDER BY is_primary DESC, id`,
      [rows[0].id],
    );

    const [rsvps] = await pool.execute(
      `SELECT id, contact_name, contact_email, contact_phone,
              dietary_notes, guest_message, submitted_at
       FROM rsvps
       WHERE invitation_id = ?
       LIMIT 1`,
      [rows[0].id],
    );

    let rsvp = null;
    if (rsvps.length) {
      const [responses] = await pool.execute(
        `SELECT invitation_guest_id, attendance_status
         FROM rsvp_guest_responses
         WHERE rsvp_id = ?`,
        [rsvps[0].id],
      );
      rsvp = {
        contactName: rsvps[0].contact_name,
        contactEmail: rsvps[0].contact_email,
        contactPhone: rsvps[0].contact_phone,
        dietaryNotes: rsvps[0].dietary_notes,
        guestMessage: rsvps[0].guest_message,
        submittedAt: rsvps[0].submitted_at,
        guestResponses: responses.map((response) => ({
          invitationGuestId: response.invitation_guest_id,
          attendanceStatus: response.attendance_status,
        })),
      };
    }

    return NextResponse.json({
      displayName: rows[0].display_name,
      invitationType: rows[0].invitation_type,
      status: rows[0].status,
      maxGuests: rows[0].max_guests,
      personalizedMessage: rows[0].personalized_message,
      guests: guests.map((guest) => ({
        id: guest.id,
        fullName: guest.full_name,
        gender: guest.gender,
        isPrimary: Boolean(guest.is_primary),
      })),
      rsvp,
    });
  } catch (error) {
    console.error("Invitation lookup failed:", error);
    return NextResponse.json(
      { message: "El servicio de invitaciones no está disponible." },
      { status: 503 },
    );
  }
}
