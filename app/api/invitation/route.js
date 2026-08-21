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
    const [guestCodeRows] = await pool.execute(
      `SELECT ig.id AS selected_guest_id, ig.full_name AS selected_guest_name,
              i.id, i.display_name,
              i.invitation_type, i.status, i.max_guests,
              i.personalized_message
       FROM invitation_guests ig
       INNER JOIN invitations i ON i.id = ig.invitation_id
       WHERE ig.code = ?
       LIMIT 1`,
      [code],
    );
    const [rows] = await pool.execute(
      `SELECT id, display_name, invitation_type, status, max_guests,
              personalized_message
       FROM invitations
       WHERE code = ?
       LIMIT 1`,
      [code],
    );
    const invitation = guestCodeRows[0] || rows[0];
    if (!invitation) {
      return NextResponse.json(
        { message: "Invitación no encontrada." },
        { status: 404 },
      );
    }
    if (invitation.status !== "active") {
      return NextResponse.json(
        {
          message: "Esta invitación no está disponible.",
          status: invitation.status,
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
      [invitation.id],
    );

    const [guests] = await pool.execute(
      `SELECT id, code, full_name, ceremony_role, is_primary
       FROM invitation_guests
       WHERE invitation_id = ?
       ORDER BY is_primary DESC, id`,
      [invitation.id],
    );

    const selectedGuestId = invitation.selected_guest_id || null;
    const visibleGuests = selectedGuestId
      ? guests.filter((guest) => Number(guest.id) === Number(selectedGuestId))
      : guests;

    const [rsvps] = await pool.execute(
      `SELECT id, contact_name, contact_email, contact_phone,
              dietary_notes, guest_message, submitted_at
       FROM rsvps
       WHERE invitation_id = ?
         AND ${
           selectedGuestId
             ? "invitation_guest_id = ?"
             : "invitation_guest_id IS NULL"
         }
       LIMIT 1`,
      selectedGuestId ? [invitation.id, selectedGuestId] : [invitation.id],
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
      displayName: invitation.selected_guest_name || invitation.display_name,
      groupName: invitation.display_name,
      invitationType: selectedGuestId ? "individual" : invitation.invitation_type,
      status: invitation.status,
      maxGuests: visibleGuests.length,
      personalizedMessage: invitation.personalized_message,
      selectedGuestId,
      guests: visibleGuests.map((guest) => ({
        id: guest.id,
        code: guest.code,
        fullName: guest.full_name,
        ceremonyRole: guest.ceremony_role,
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
