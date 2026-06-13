import mysql from "mysql2/promise";

const baseUrl = "http://localhost:3000";
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
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
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
      personalizedMessage: "Nos hará mucha ilusión celebrar con ustedes.",
      guests: [
        { fullName: "María Prueba", gender: "female" },
        { fullName: "Carlos Prueba", gender: "male" },
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

  const invitation = await fetch(
    `${baseUrl}/api/invitation?code=${encodeURIComponent(code)}`,
  );
  const invitationBody = await invitation.json();
  assert(invitation.ok, `Public lookup failed with ${invitation.status}`);
  assert(invitationBody.guests.length === 2, "Guest list is incomplete");

  const rsvp = await fetch(`${baseUrl}/api/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invitationCode: code,
      selectedGuestIds: invitationBody.guests.map((guest) => guest.id),
      attendance: "yes",
      email: "prueba@example.com",
      dietaryNotes: "",
    }),
  });
  const rsvpBody = await rsvp.json();
  assert(rsvp.ok, rsvpBody.message || `RSVP failed with ${rsvp.status}`);

  const closed = await fetch(
    `${baseUrl}/api/invitation?code=${encodeURIComponent(code)}`,
  );
  assert(closed.status === 410, `Expected closed link, received ${closed.status}`);

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
      search: "ok",
      publicLookup: "ok",
      rsvp: "ok",
      linkInvalidation: "ok",
      invitationDeletion: "ok",
    }),
  );
} finally {
  if (code) {
    await connection.execute("DELETE FROM invitations WHERE code = ?", [code]);
  }
  await connection.end();
}
