import crypto from "node:crypto";

export function normalizeName(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function hashIp(ip = "") {
  const salt = process.env.RSVP_HASH_SALT;
  if (!salt) throw new Error("RSVP_HASH_SALT is not configured");
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
