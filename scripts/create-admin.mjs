import crypto from "node:crypto";
import { promisify } from "node:util";
import mysql from "mysql2/promise";

const scrypt = promisify(crypto.scrypt);
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 };

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

async function hashPassword(password) {
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
  }

  const saltBytes = crypto.randomBytes(16);
  const derivedKey = await scrypt(password, saltBytes, SCRYPT_PARAMS.keyLength, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  });

  return [
    "scrypt",
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    saltBytes.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

const email = requiredEnv("ADMIN_EMAIL").trim().toLowerCase();
const displayName = process.env.ADMIN_DISPLAY_NAME || "Administrador";
const passwordHash = await hashPassword(requiredEnv("ADMIN_PASSWORD"));

const connection = await mysql.createConnection({
  host: requiredEnv("DATABASE_HOST"),
  port: Number(process.env.DATABASE_PORT || 3306),
  database: requiredEnv("DATABASE_NAME"),
  user: requiredEnv("DATABASE_USER"),
  password: requiredEnv("DATABASE_PASSWORD"),
  ssl:
    process.env.DATABASE_SSL === "false"
      ? undefined
      : { rejectUnauthorized: true },
});

try {
  const [result] = await connection.execute(
    `INSERT INTO admin_users
     (email, password_hash, display_name, is_active, updated_at)
     VALUES (?, ?, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       display_name = VALUES(display_name),
       is_active = 1,
       updated_at = NOW()`,
    [email, passwordHash, displayName],
  );

  console.log(
    JSON.stringify({
      email,
      action: result.insertId ? "created" : "updated",
    }),
  );
} finally {
  await connection.end();
}
