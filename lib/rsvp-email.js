import nodemailer from "nodemailer";
import { getCeremonyRoleDetails } from "@/lib/ceremony";

const WEDDING_DETAILS = {
  couple: "Oliver & Analucía",
  date: "Domingo, 13 de diciembre de 2026",
  time: "12:00 p. m. - 5:00 p. m.",
  place: "Ermita de la Santa Cruz, Antigua Guatemala",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Ermita+de+la+Santa+Cruz+Antigua+Guatemala",
  rsvpDeadline: "15 de noviembre de 2026",
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) return null;

  return {
    transport: {
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      connectionTimeout: Number(process.env.SMTP_TIMEOUT_MS || 5000),
      greetingTimeout: Number(process.env.SMTP_TIMEOUT_MS || 5000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 8000),
      auth: { user, pass },
    },
    from,
  };
}

function attendanceLabel(status) {
  if (status === "attending") return "Asistiré";
  if (status === "not_attending") return "No podré asistir";
  return "Pendiente";
}

function guestDisplayList(guests = []) {
  return guests
    .map((guest) => guest.fullName)
    .filter(Boolean)
    .join(", ");
}

function buildGuestResponseHtml(guests = []) {
  return guests
    .map(
      (guest) =>
        `<p style="margin: 0 0 8px;"><strong>${escapeHtml(guest.fullName)}:</strong> ${attendanceLabel(guest.attendanceStatus)}</p>`,
    )
    .join("");
}

function getInvitationUrl({ invitation, guest, guests }) {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return "";

  const code =
    invitation?.linkMode === "group"
      ? invitation?.code
      : guest?.code || guests?.[0]?.code;
  return code ? `${siteUrl}/${code}` : "";
}

function buildSpecialRoleBlock(roleDetails) {
  if (!roleDetails) return "";

  return `
    <tr>
      <td style="padding: 0 28px 28px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #dac7b9; background: #fffaf3;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #8e4736;">Información especial</p>
              <h2 style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; line-height: 1.1; color: #3f493d; font-weight: 400;">${escapeHtml(roleDetails.role)}</h2>
              <p style="margin: 0 0 16px; color: #685a50; line-height: 1.7;">${escapeHtml(roleDetails.body)}</p>
              <p style="margin: 0 0 6px; color: #8e4736; font-weight: 600;">${escapeHtml(roleDetails.meetingTitle)}</p>
              <p style="margin: 0 0 6px; color: #685a50;">${escapeHtml(roleDetails.meetingTime)}</p>
              <p style="margin: 0 0 18px; color: #685a50;">Zona horaria: America/Guatemala</p>
              <a href="${roleDetails.meetUrl}" style="display: inline-block; margin: 0 8px 8px 0; padding: 11px 16px; background: #3f493d; color: #ffffff; text-decoration: none; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Google Meet</a>
              <a href="${roleDetails.whatsappUrl}" style="display: inline-block; margin: 0 0 8px; padding: 11px 16px; background: #8e4736; color: #ffffff; text-decoration: none; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">WhatsApp</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function buildEmailHtml({ invitation, guest, guests, attendanceStatus, roleDetails }) {
  const invitationUrl = getInvitationUrl({ invitation, guest, guests });
  const specialRoleBlock = buildSpecialRoleBlock(roleDetails);
  const includedGuests = guests?.length ? guests : [{ ...guest, attendanceStatus }];
  const guestNames = guestDisplayList(includedGuests) || guest.fullName;
  const responseRows = buildGuestResponseHtml(includedGuests);

  return `<!doctype html>
  <html>
    <body style="margin: 0; padding: 0; background: #efe5da; font-family: Arial, Helvetica, sans-serif; color: #3f3732;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #efe5da; padding: 28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #fffaf3; border: 1px solid #dac7b9;">
              <tr>
                <td style="padding: 34px 28px 22px; text-align: center; background: #754337; color: #fffaf3;">
                  <p style="margin: 0 0 10px; font-family: Georgia, 'Times New Roman', serif; font-size: 28px;">O &amp; A</p>
                  <p style="margin: 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Confirmación recibida</p>
                  <h1 style="margin: 16px 0 0; font-family: Georgia, 'Times New Roman', serif; font-size: 36px; line-height: 1.05; font-weight: 400;">Gracias, ${escapeHtml(guestNames || invitation.displayName)}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 28px;">
                  <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.8;">Hemos recibido tu respuesta para la boda de <strong>${WEDDING_DETAILS.couple}</strong>.</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f3ebe2; border: 1px solid #e1d1c2;">
                    <tr>
                      <td style="padding: 18px; color: #685a50;">
                        <p style="margin: 0 0 8px;"><strong>Invitados:</strong> ${escapeHtml(guestNames)}</p>
                        ${responseRows}
                        <p style="margin: 0;"><strong>Invitación:</strong> ${escapeHtml(invitation.displayName)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${specialRoleBlock}
              <tr>
                <td style="padding: 0 28px 28px;">
                  <h2 style="margin: 0 0 14px; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; color: #8e4736; font-weight: 400;">Información general</h2>
                  <p style="margin: 0 0 8px;"><strong>Fecha:</strong> ${WEDDING_DETAILS.date}</p>
                  <p style="margin: 0 0 8px;"><strong>Horario:</strong> ${WEDDING_DETAILS.time}</p>
                  <p style="margin: 0 0 8px;"><strong>Lugar:</strong> ${WEDDING_DETAILS.place}</p>
                  <p style="margin: 0 0 18px;"><strong>Fecha límite RSVP:</strong> ${WEDDING_DETAILS.rsvpDeadline}</p>
                  <a href="${WEDDING_DETAILS.mapUrl}" style="display: inline-block; margin: 0 8px 8px 0; padding: 11px 16px; background: #8e4736; color: #ffffff; text-decoration: none; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Ver ubicación</a>
                  ${
                    invitationUrl
                      ? `<a href="${invitationUrl}" style="display: inline-block; margin: 0 0 8px; padding: 11px 16px; background: #3f493d; color: #ffffff; text-decoration: none; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Abrir invitación</a>`
                      : ""
                  }
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 28px 30px; text-align: center; color: #8e7a6b; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
                  Con amor, Oliver &amp; Analucía
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function buildEmailText({ invitation, guest, guests, attendanceStatus, roleDetails }) {
  const invitationUrl = getInvitationUrl({ invitation, guest, guests });
  const includedGuests = guests?.length ? guests : [{ ...guest, attendanceStatus }];
  const guestNames = guestDisplayList(includedGuests) || guest.fullName;
  const lines = [
    `Confirmación recibida - ${WEDDING_DETAILS.couple}`,
    "",
    `Gracias, ${guestNames || invitation.displayName}.`,
    `Invitados: ${guestNames}`,
    ...includedGuests.map(
      (includedGuest) =>
        `${includedGuest.fullName}: ${attendanceLabel(includedGuest.attendanceStatus)}`,
    ),
    `Invitación: ${invitation.displayName}`,
    "",
    "Información general:",
    `${WEDDING_DETAILS.date}`,
    `${WEDDING_DETAILS.time}`,
    `${WEDDING_DETAILS.place}`,
    `Ubicación: ${WEDDING_DETAILS.mapUrl}`,
  ];

  if (roleDetails) {
    lines.push(
      "",
      `Información especial: ${roleDetails.role}`,
      roleDetails.meetingTitle,
      roleDetails.meetingTime,
      "Zona horaria: America/Guatemala",
      `Google Meet: ${roleDetails.meetUrl}`,
      `WhatsApp: ${roleDetails.whatsappUrl}`,
    );
  }

  if (invitationUrl) lines.push("", `Tu invitación: ${invitationUrl}`);
  return lines.join("\n");
}

export async function sendRsvpConfirmationEmail({
  to,
  invitation,
  guest,
  guests,
  attendanceStatus,
}) {
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    console.warn("RSVP confirmation email skipped: SMTP is not configured.");
    return { skipped: true };
  }

  const roleDetails = getCeremonyRoleDetails(guest?.ceremonyRole);
  const transporter = nodemailer.createTransport(smtpConfig.transport);
  const subject = roleDetails
    ? `Confirmación recibida | ${roleDetails.role} | Oliver & Analucía`
    : "Confirmación recibida | Boda de Oliver & Analucía";

  await transporter.sendMail({
    from: smtpConfig.from,
    to,
    subject,
    html: buildEmailHtml({ invitation, guest, guests, attendanceStatus, roleDetails }),
    text: buildEmailText({ invitation, guest, guests, attendanceStatus, roleDetails }),
  });

  return { skipped: false };
}
