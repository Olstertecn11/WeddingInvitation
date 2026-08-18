import crypto from "node:crypto";
import { normalizePersonName } from "@/lib/rsvp";

export function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function createInvitationCode() {
  return crypto.randomBytes(9).toString("base64url");
}

export function normalizeGuests(guests) {
  if (!Array.isArray(guests)) return [];

  const normalizedGuests = guests
    .map((guest, index) => {
      const fullName = cleanText(guest?.fullName, 160);
      const gender = ["male", "female"].includes(guest?.gender)
        ? guest.gender
        : "unspecified";
      return {
        fullName,
        normalizedName: normalizePersonName(fullName),
        gender,
        isPrimary: index === 0,
      };
    })
    .filter((guest) => guest.fullName.length >= 3)
    .slice(0, 20);

  const seen = new Set();
  return normalizedGuests.filter((guest) => {
    if (seen.has(guest.normalizedName)) return false;
    seen.add(guest.normalizedName);
    return true;
  });
}

export function getGreeting(invitationType, guests, displayName) {
  if (invitationType === "family") return `Querida ${displayName}`;
  const primary = guests.find((guest) => guest.isPrimary) || guests[0];
  if (primary?.gender === "female") return `Querida ${primary.fullName}`;
  if (primary?.gender === "male") return `Querido ${primary.fullName}`;
  return `Para ${primary?.fullName || displayName}`;
}
