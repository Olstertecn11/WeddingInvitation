import crypto from "node:crypto";
import { promisify } from "node:util";
import { getPool } from "@/lib/db";

export const ADMIN_COOKIE = "wedding_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_HASH_PREFIX = "scrypt";
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 };
const scrypt = promisify(crypto.scrypt);

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value) {
  return base64UrlEncode(JSON.stringify(value));
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_JWT_SECRET must contain at least 32 characters");
  }
  return secret;
}

function signJwtPayload(encodedHeader, encodedPayload) {
  return crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
}

function timingSafeEqualText(left = "", right = "") {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function createJwt(payload) {
  const encodedHeader = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const encodedPayload = base64UrlJson(payload);
  return `${encodedHeader}.${encodedPayload}.${signJwtPayload(
    encodedHeader,
    encodedPayload,
  )}`;
}

function verifyJwt(token = "") {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) return null;

  const expected = signJwtPayload(encodedHeader, encodedPayload);
  if (!timingSafeEqualText(signature, expected)) return null;

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    if (!payload.sub || !payload.jti || !payload.exp) return null;
    if (Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashSessionId(jti) {
  return crypto.createHash("sha256").update(jti).digest("hex");
}

export async function hashAdminPassword(password) {
  if (!password || String(password).length < 12) {
    throw new Error("Admin password must contain at least 12 characters");
  }

  const salt = crypto.randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(String(password), salt, SCRYPT_PARAMS.keyLength, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  });

  return [
    PASSWORD_HASH_PREFIX,
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyAdminPassword(password, storedHash = "") {
  const [prefix, n, r, p, salt, key] = storedHash.split("$");
  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !key) return false;

  const storedKey = Buffer.from(key, "base64url");
  const derivedKey = await scrypt(String(password || ""), salt, storedKey.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return (
    storedKey.length === derivedKey.length &&
    crypto.timingSafeEqual(storedKey, derivedKey)
  );
}

export async function findAdminUserByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const [rows] = await getPool().execute(
    `SELECT id, email, password_hash, display_name, is_active
     FROM admin_users
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail],
  );

  return rows[0] || null;
}

export async function createAdminSession(user, request) {
  const now = Math.floor(Date.now() / 1000);
  const expires = now + SESSION_TTL_SECONDS;
  const jti = crypto.randomUUID();
  const token = createJwt({
    sub: String(user.id),
    email: user.email,
    jti,
    iat: now,
    exp: expires,
  });

  await getPool().execute(
    `INSERT INTO admin_sessions
     (admin_user_id, token_hash, user_agent, expires_at)
     VALUES (?, ?, ?, FROM_UNIXTIME(?))`,
    [
      user.id,
      hashSessionId(jti),
      String(request.headers.get("user-agent") || "").slice(0, 500) || null,
      expires,
    ],
  );
  await getPool().execute(
    "UPDATE admin_users SET last_login_at = NOW() WHERE id = ?",
    [user.id],
  );

  return token;
}

export async function getAdminSession(token = "") {
  const payload = verifyJwt(token);
  if (!payload) return null;

  const [rows] = await getPool().execute(
    `SELECT s.id, s.admin_user_id, u.email, u.display_name
     FROM admin_sessions s
     INNER JOIN admin_users u ON u.id = s.admin_user_id
     WHERE s.token_hash = ?
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL
       AND u.is_active = 1
     LIMIT 1`,
    [hashSessionId(payload.jti)],
  );

  return rows[0] || null;
}

export async function revokeAdminSession(token = "") {
  const payload = verifyJwt(token);
  if (!payload) return;

  await getPool().execute(
    `UPDATE admin_sessions
     SET revoked_at = NOW()
     WHERE token_hash = ? AND revoked_at IS NULL`,
    [hashSessionId(payload.jti)],
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

export async function isValidAdminSession(value = "") {
  return Boolean(await getAdminSession(value));
}

export async function requestIsAdmin(request) {
  return isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
}
