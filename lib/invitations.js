import crypto from "node:crypto";
import { normalizePersonName } from "@/lib/rsvp";

export function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function createInvitationCode() {
  return crypto.randomBytes(9).toString("base64url");
}

export function normalizeCeremonyRole(value) {
  return ["bridesmaid", "groomsman"].includes(value) ? value : "none";
}

export function normalizeOwnerSide(value) {
  return ["bride", "groom", "shared"].includes(value) ? value : "shared";
}

export function normalizePeopleCount(value) {
  const peopleCount = Number(value);
  if (!Number.isInteger(peopleCount)) return 1;
  return Math.min(Math.max(peopleCount, 1), 20);
}

export function normalizeGuests(guests) {
  if (!Array.isArray(guests)) return [];

  const normalizedGuests = guests
    .map((guest, index) => {
      const fullName = cleanText(guest?.fullName, 160);
      const ceremonyRole = normalizeCeremonyRole(
        guest?.ceremonyRole ||
          (guest?.gender === "female"
            ? "bridesmaid"
            : guest?.gender === "male"
              ? "groomsman"
              : "none"),
      );
      return {
        fullName,
        normalizedName: normalizePersonName(fullName),
        ceremonyRole,
        ownerSide: normalizeOwnerSide(guest?.ownerSide),
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
  return `Para ${primary?.fullName || displayName}`;
}
