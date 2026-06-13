import crypto from "node:crypto";

export const ADMIN_COOKIE = "wedding_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return secret;
}

function sign(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function isValidAdminSession(value = "") {
  const [expires, signature] = value.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) {
    return false;
  }

  const expected = Buffer.from(sign(expires));
  const received = Buffer.from(signature);
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

export function isValidAdminPassword(password = "") {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) throw new Error("ADMIN_PASSWORD is not configured");
  const expected = Buffer.from(configured);
  const received = Buffer.from(String(password));
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  };
}

export function requestIsAdmin(request) {
  return isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
}
