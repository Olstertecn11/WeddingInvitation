import mysql from "mysql2/promise";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const testName = `Familia Prueba ${Date.now()}`;
let code;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 3306),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

try {
  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  assert(login.ok, `Admin login failed with ${login.status}`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert(cookie, "Admin login did not return a session cookie");

  const created = await fetch(`${baseUrl}/api/admin/invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      invitationType: "family",
      displayName: testName,
      peopleCount: 2,
      personalizedMessage: "Nos hará mucha ilusión celebrar con ustedes.",
      guests: [
        { fullName: "María Prueba", ceremonyRole: "bridesmaid" },
        { fullName: "Carlos Prueba", ceremonyRole: "groomsman" },
      ],
    }),
  });
  const createdBody = await created.json();
  assert(created.ok, createdBody.message || `Create failed with ${created.status}`);
  code = createdBody.invitation.code;

  const search = await fetch(
    `${baseUrl}/api/admin/invitations?q=${encodeURIComponent(testName)}`,
    { headers: { Cookie: cookie } },
  );
  const searchBody = await search.json();
  assert(search.ok, `Search failed with ${search.status}`);
  assert(searchBody.invitations.length === 1, "Created invitation was not found");
  assert(
    Number(searchBody.invitations[0].people_count) === 2,
    "Invitation people count was not returned",
  );
  assert(
    searchBody.invitations[0].guests.every((guest) => guest.code),
    "Guest invitation links were not returned",
  );
  const updatedPeopleCount = await fetch(`${baseUrl}/api/admin/invitations`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      invitationId: searchBody.invitations[0].id,
      peopleCount: 3,
    }),
  });
  const updatedPeopleCountBody = await updatedPeopleCount.json();
  assert(
    updatedPeopleCount.ok,
    updatedPeopleCountBody.message ||
      `People count update failed with ${updatedPeopleCount.status}`,
  );
  const guestLinkCode = searchBody.invitations[0].guests[0].code;
  const secondGuestLinkCode = searchBody.invitations[0].guests[1].code;

  const invitation = await fetch(
    `${baseUrl}/api/invitation?code=${encodeURIComponent(guestLinkCode)}`,
  );
  const invitationBody = await invitation.json();
  assert(invitation.ok, `Public lookup failed with ${invitation.status}`);
  assert(invitationBody.guests.length === 1, "Personal invitation returned more than one guest");
  assert(invitationBody.selectedGuestId, "Personal invitation did not select a guest");
  assert(
    invitationBody.guests[0].ceremonyRole === "bridesmaid",
    "Personal invitation did not return the special ceremony role",
  );

  const rsvp = await fetch(`${baseUrl}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invitationCode: guestLinkCode,
      contactName: "María Prueba",
      contactEmail: "prueba@example.com",
      contactPhone: "",
      dietaryNotes: "",
      guestMessage: "",
      guestResponses: invitationBody.guests.map((guest) => ({
        invitationGuestId: guest.id,
        attendanceStatus: "attending",
      })),
    }),
  });
  const rsvpBody = await rsvp.json();
  assert(rsvp.ok, rsvpBody.message || `RSVP failed with ${rsvp.status}`);

  const updated = await fetch(`${baseUrl}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invitationCode: guestLinkCode,
      contactName: "María Prueba",
      contactEmail: "prueba@example.com",
      contactPhone: "",
      dietaryNotes: "Sin restricciones",
      guestMessage: "Gracias.",
      guestResponses: invitationBody.guests.map((guest) => ({
        invitationGuestId: guest.id,
        attendanceStatus: "not_attending",
      })),
    }),
  });
  const updatedBody = await updated.json();
  assert(updated.ok, updatedBody.message || `Update failed with ${updated.status}`);

  const withRsvp = await fetch(
    `${baseUrl}/api/invitation?code=${encodeURIComponent(guestLinkCode)}`,
  );
  const withRsvpBody = await withRsvp.json();
  assert(withRsvp.ok, `Expected active link, received ${withRsvp.status}`);
  assert(withRsvpBody.rsvp, "Saved RSVP was not returned");
  assert(
    withRsvpBody.rsvp.guestResponses.some(
      (response) => response.attendanceStatus === "not_attending",
    ),
    "Updated guest response was not returned",
  );

  const secondInvitation = await fetch(
    `${baseUrl}/api/invitation?code=${encodeURIComponent(secondGuestLinkCode)}`,
  );
  const secondInvitationBody = await secondInvitation.json();
  assert(secondInvitation.ok, `Second public lookup failed with ${secondInvitation.status}`);
  assert(secondInvitationBody.guests.length === 1, "Second personal invitation returned more than one guest");

  const secondRsvp = await fetch(`${baseUrl}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invitationCode: secondGuestLinkCode,
      contactName: "Carlos Prueba",
      contactEmail: "carlos.prueba@example.com",
      contactPhone: "",
      dietaryNotes: "",
      guestMessage: "",
      guestResponses: secondInvitationBody.guests.map((guest) => ({
        invitationGuestId: guest.id,
        attendanceStatus: "attending",
      })),
    }),
  });
  const secondRsvpBody = await secondRsvp.json();
  assert(secondRsvp.ok, secondRsvpBody.message || `Second RSVP failed with ${secondRsvp.status}`);

  const deleted = await fetch(`${baseUrl}/api/admin/invitations`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ id: createdBody.invitation.id }),
  });
  assert(deleted.ok, `Delete failed with ${deleted.status}`);

  const missing = await fetch(
    `${baseUrl}/api/invitation?code=${encodeURIComponent(code)}`,
  );
  assert(missing.status === 404, `Expected deleted link, received ${missing.status}`);
  code = undefined;

  console.log(
    JSON.stringify({
      adminLogin: "ok",
      invitationCreation: "ok",
      peopleCountUpdate: "ok",
      search: "ok",
      publicLookup: "ok",
      rsvp: "ok",
      rsvpUpdate: "ok",
      rsvpPreload: "ok",
      invitationDeletion: "ok",
    }),
  );
} finally {
  if (code) {
    await connection.execute("DELETE FROM invitations WHERE code = ?", [code]);
  }
  await connection.end();
}
