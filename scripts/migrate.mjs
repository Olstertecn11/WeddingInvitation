import mysql from "mysql2/promise";
import crypto from "node:crypto";

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 3306),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? undefined
      : { rejectUnauthorized: true },
});

async function tableExists(table) {
  const [rows] = await connection.query("SHOW TABLES LIKE ?", [table]);
  return rows.length > 0;
}

async function columnExists(table, column) {
  if (!(await tableExists(table))) return false;
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
  return rows.some((row) => row.Field === column);
}

async function indexExists(table, index) {
  if (!(await tableExists(table))) return false;
  const [rows] = await connection.query(`SHOW INDEX FROM \`${table}\``);
  return rows.some((row) => row.Key_name === index);
}

async function constraintExists(name) {
  const [rows] = await connection.execute(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND CONSTRAINT_NAME = ?
     LIMIT 1`,
    [name],
  );
  return rows.length > 0;
}

async function addColumn(table, column, definition) {
  if (await columnExists(table, column)) return;
  await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  console.log(`Added ${table}.${column}`);
}

async function dropColumn(table, column) {
  if (!(await columnExists(table, column))) return;
  await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
  console.log(`Dropped ${table}.${column}`);
}

async function dropIndex(table, index) {
  if (!(await indexExists(table, index))) return;
  await connection.query(`ALTER TABLE \`${table}\` DROP INDEX \`${index}\``);
  console.log(`Dropped ${table}.${index}`);
}

function createGuestCode() {
  return crypto.randomBytes(9).toString("base64url");
}

async function assignMissingGuestCodes() {
  const [guests] = await connection.query(
    "SELECT id FROM invitation_guests WHERE code IS NULL OR code = ''",
  );

  for (const guest of guests) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await connection.execute(
          "UPDATE invitation_guests SET code = ? WHERE id = ?",
          [createGuestCode(), guest.id],
        );
        break;
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY" || attempt === 4) throw error;
      }
    }
  }
}

try {
  if (!(await tableExists("invitations"))) {
    await connection.query(`
      CREATE TABLE invitations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(64) NOT NULL,
        display_name VARCHAR(160) NOT NULL,
        invitation_type ENUM('individual', 'couple', 'family') NOT NULL DEFAULT 'individual',
        status ENUM('active', 'disabled', 'expired') NOT NULL DEFAULT 'active',
        max_guests TINYINT UNSIGNED NOT NULL DEFAULT 1,
        people_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
        personalized_message VARCHAR(500) NULL,
        first_opened_at DATETIME NULL,
        last_opened_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_invitations_code (code),
        KEY idx_invitations_display_name (display_name),
        KEY idx_invitations_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created invitations");
  }

  await addColumn(
    "invitations",
    "invitation_type",
    "invitation_type ENUM('individual', 'couple', 'family') NOT NULL DEFAULT 'individual' AFTER display_name",
  );
  await connection.query(
    "ALTER TABLE invitations MODIFY invitation_type ENUM('individual', 'couple', 'family') NOT NULL DEFAULT 'individual'",
  );
  await addColumn(
    "invitations",
    "status",
    "status ENUM('active', 'disabled', 'expired') NOT NULL DEFAULT 'active' AFTER invitation_type",
  );
  await addColumn(
    "invitations",
    "people_count",
    "people_count TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER max_guests",
  );
  await connection.query(
    "UPDATE invitations SET people_count = 1 WHERE people_count IS NULL OR people_count < 1",
  );
  await addColumn(
    "invitations",
    "personalized_message",
    "personalized_message VARCHAR(500) NULL AFTER people_count",
  );
  await addColumn(
    "invitations",
    "first_opened_at",
    "first_opened_at DATETIME NULL AFTER personalized_message",
  );
  await addColumn(
    "invitations",
    "last_opened_at",
    "last_opened_at DATETIME NULL AFTER first_opened_at",
  );
  await addColumn(
    "invitations",
    "updated_at",
    "updated_at DATETIME NULL AFTER created_at",
  );

  if (await columnExists("invitations", "active")) {
    await connection.query(
      "UPDATE invitations SET status = IF(active = 1, 'active', 'disabled')",
    );
  }
  if (await columnExists("invitations", "used_at")) {
    await connection.query(
      "UPDATE invitations SET first_opened_at = COALESCE(first_opened_at, used_at), last_opened_at = COALESCE(last_opened_at, used_at)",
    );
  }

  await dropIndex("invitations", "idx_invitations_active");
  await dropColumn("invitations", "allowed_guests");
  await dropColumn("invitations", "active");
  await dropColumn("invitations", "used_at");

  if (!(await indexExists("invitations", "idx_invitations_display_name"))) {
    await connection.query(
      "ALTER TABLE invitations ADD KEY idx_invitations_display_name (display_name)",
    );
  }
  if (!(await indexExists("invitations", "idx_invitations_status"))) {
    await connection.query(
      "ALTER TABLE invitations ADD KEY idx_invitations_status (status)",
    );
  }

  if (!(await tableExists("invitation_guests"))) {
    await connection.query(`
      CREATE TABLE invitation_guests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(64) NOT NULL,
        invitation_id BIGINT UNSIGNED NOT NULL,
        full_name VARCHAR(160) NOT NULL,
        normalized_name VARCHAR(160) NOT NULL,
        owner_side ENUM('bride', 'groom', 'shared') NOT NULL DEFAULT 'shared',
        ceremony_role ENUM('none', 'bridesmaid', 'groomsman') NOT NULL DEFAULT 'none',
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_invitation_guests_code (code),
        UNIQUE KEY uq_invitation_guests_name (invitation_id, normalized_name),
        KEY idx_invitation_guests_invitation (invitation_id),
        KEY idx_invitation_guests_owner_side (owner_side),
        KEY idx_invitation_guests_ceremony_role (ceremony_role),
        KEY idx_invitation_guests_name (normalized_name),
        CONSTRAINT fk_invitation_guests_invitation
          FOREIGN KEY (invitation_id) REFERENCES invitations(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created invitation_guests");
  }

  await addColumn(
    "invitation_guests",
    "code",
    "code VARCHAR(64) NULL AFTER id",
  );
  await addColumn(
    "invitation_guests",
    "owner_side",
    "owner_side ENUM('bride', 'groom', 'shared') NOT NULL DEFAULT 'shared' AFTER normalized_name",
  );
  if (!(await indexExists("invitation_guests", "idx_invitation_guests_owner_side"))) {
    await connection.query(
      "ALTER TABLE invitation_guests ADD KEY idx_invitation_guests_owner_side (owner_side)",
    );
  }
  await addColumn(
    "invitation_guests",
    "ceremony_role",
    "ceremony_role ENUM('none', 'bridesmaid', 'groomsman') NOT NULL DEFAULT 'none' AFTER owner_side",
  );
  if (await columnExists("invitation_guests", "gender")) {
    await connection.query(
      `UPDATE invitation_guests
       SET ceremony_role = CASE
         WHEN gender = 'female' THEN 'bridesmaid'
         WHEN gender = 'male' THEN 'groomsman'
         ELSE 'none'
       END
       WHERE ceremony_role = 'none'`,
    );
  }
  if (!(await indexExists("invitation_guests", "uq_invitation_guests_code"))) {
    await connection.query(
      "ALTER TABLE invitation_guests ADD UNIQUE KEY uq_invitation_guests_code (code)",
    );
  }
  await assignMissingGuestCodes();
  await connection.query(
    "ALTER TABLE invitation_guests MODIFY code VARCHAR(64) NOT NULL",
  );
  if (!(await indexExists("invitation_guests", "idx_invitation_guests_ceremony_role"))) {
    await connection.query(
      "ALTER TABLE invitation_guests ADD KEY idx_invitation_guests_ceremony_role (ceremony_role)",
    );
  }
  await addColumn(
    "invitation_guests",
    "updated_at",
    "updated_at DATETIME NULL AFTER created_at",
  );
  if (!(await indexExists("invitation_guests", "uq_invitation_guests_name"))) {
    await connection.query(
      "ALTER TABLE invitation_guests ADD UNIQUE KEY uq_invitation_guests_name (invitation_id, normalized_name)",
    );
  }

  const [missingGuests] = await connection.query(`
    SELECT i.id, i.display_name
    FROM invitations i
    LEFT JOIN invitation_guests ig ON ig.invitation_id = i.id
    WHERE ig.id IS NULL
  `);

  for (const invitation of missingGuests) {
    await connection.execute(
      `INSERT INTO invitation_guests
       (code, invitation_id, full_name, normalized_name, owner_side, ceremony_role, is_primary)
       VALUES (?, ?, ?, LOWER(?), 'shared', 'none', 1)`,
      [
        createGuestCode(),
        invitation.id,
        invitation.display_name,
        invitation.display_name,
      ],
    );
  }

  await dropColumn("invitation_guests", "gender");

  if (!(await tableExists("rsvps"))) {
    await connection.query(`
      CREATE TABLE rsvps (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        invitation_id BIGINT UNSIGNED NOT NULL,
        invitation_guest_id BIGINT UNSIGNED NULL,
        contact_name VARCHAR(160) NOT NULL,
        contact_email VARCHAR(190) NOT NULL,
        contact_phone VARCHAR(30) NULL,
        dietary_notes VARCHAR(500) NULL,
        guest_message VARCHAR(500) NULL,
        ip_hash CHAR(64) NOT NULL,
        user_agent VARCHAR(500) NULL,
        submitted_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_rsvps_invitation_guest (invitation_guest_id),
        KEY idx_rsvps_invitation (invitation_id),
        KEY idx_rsvps_contact_email (contact_email),
        KEY idx_rsvps_ip_hash (ip_hash),
        CONSTRAINT fk_rsvps_invitation
          FOREIGN KEY (invitation_id) REFERENCES invitations(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_rsvps_invitation_guest
          FOREIGN KEY (invitation_guest_id) REFERENCES invitation_guests(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created rsvps");
  }

  await addColumn(
    "rsvps",
    "invitation_guest_id",
    "invitation_guest_id BIGINT UNSIGNED NULL AFTER invitation_id",
  );
  await addColumn(
    "rsvps",
    "contact_name",
    "contact_name VARCHAR(160) NULL AFTER invitation_guest_id",
  );
  await addColumn(
    "rsvps",
    "contact_email",
    "contact_email VARCHAR(190) NULL AFTER contact_name",
  );
  await addColumn(
    "rsvps",
    "contact_phone",
    "contact_phone VARCHAR(30) NULL AFTER contact_email",
  );
  await addColumn(
    "rsvps",
    "dietary_notes",
    "dietary_notes VARCHAR(500) NULL AFTER contact_phone",
  );
  await addColumn(
    "rsvps",
    "guest_message",
    "guest_message VARCHAR(500) NULL AFTER dietary_notes",
  );
  await addColumn(
    "rsvps",
    "submitted_at",
    "submitted_at DATETIME NULL AFTER user_agent",
  );

  if (await columnExists("rsvps", "full_name")) {
    await connection.query(
      "UPDATE rsvps SET contact_name = COALESCE(contact_name, full_name)",
    );
  }
  if (await columnExists("rsvps", "email")) {
    await connection.query(
      "UPDATE rsvps SET contact_email = COALESCE(contact_email, email)",
    );
  }
  await connection.query(
    "UPDATE rsvps SET submitted_at = COALESCE(submitted_at, created_at, NOW()), contact_name = COALESCE(contact_name, 'Invitado'), contact_email = COALESCE(contact_email, 'sin-correo@example.com')",
  );
  await connection.query(
    "ALTER TABLE rsvps MODIFY contact_name VARCHAR(160) NOT NULL",
  );
  await connection.query(
    "ALTER TABLE rsvps MODIFY contact_email VARCHAR(190) NOT NULL",
  );
  await connection.query("ALTER TABLE rsvps MODIFY submitted_at DATETIME NOT NULL");

  await dropColumn("rsvps", "full_name");
  await dropColumn("rsvps", "normalized_name");
  await dropColumn("rsvps", "email");
  await dropColumn("rsvps", "attendance");
  await dropColumn("rsvps", "companion_names");
  await dropIndex("rsvps", "uq_rsvps_invitation");
  await dropIndex("rsvps", "uq_rsvps_invitation_id");

  if (!(await indexExists("rsvps", "uq_rsvps_invitation_guest"))) {
    await connection.query(
      "ALTER TABLE rsvps ADD UNIQUE KEY uq_rsvps_invitation_guest (invitation_guest_id)",
    );
  }

  if (!(await indexExists("rsvps", "idx_rsvps_invitation"))) {
    await connection.query(
      "ALTER TABLE rsvps ADD KEY idx_rsvps_invitation (invitation_id)",
    );
  }

  if (!(await indexExists("rsvps", "idx_rsvps_contact_email"))) {
    await connection.query(
      "ALTER TABLE rsvps ADD KEY idx_rsvps_contact_email (contact_email)",
    );
  }

  if (!(await tableExists("rsvp_guest_responses"))) {
    await connection.query(`
      CREATE TABLE rsvp_guest_responses (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        rsvp_id BIGINT UNSIGNED NOT NULL,
        invitation_guest_id BIGINT UNSIGNED NOT NULL,
        attendance_status ENUM('pending', 'attending', 'not_attending') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_rsvp_guest_responses_guest (rsvp_id, invitation_guest_id),
        KEY idx_rsvp_guest_responses_rsvp (rsvp_id),
        KEY idx_rsvp_guest_responses_invitation_guest (invitation_guest_id),
        CONSTRAINT fk_rsvp_guest_responses_rsvp
          FOREIGN KEY (rsvp_id) REFERENCES rsvps(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_rsvp_guest_responses_invitation_guest
          FOREIGN KEY (invitation_guest_id) REFERENCES invitation_guests(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created rsvp_guest_responses");
  }

  if (!(await constraintExists("fk_rsvp_guest_responses_rsvp"))) {
    await connection.query(
      "ALTER TABLE rsvp_guest_responses ADD CONSTRAINT fk_rsvp_guest_responses_rsvp FOREIGN KEY (rsvp_id) REFERENCES rsvps(id) ON DELETE CASCADE",
    );
  }
  if (!(await constraintExists("fk_rsvp_guest_responses_invitation_guest"))) {
    await connection.query(
      "ALTER TABLE rsvp_guest_responses ADD CONSTRAINT fk_rsvp_guest_responses_invitation_guest FOREIGN KEY (invitation_guest_id) REFERENCES invitation_guests(id) ON DELETE CASCADE",
    );
  }

  if (!(await constraintExists("fk_rsvps_invitation_guest"))) {
    await connection.query(
      "ALTER TABLE rsvps ADD CONSTRAINT fk_rsvps_invitation_guest FOREIGN KEY (invitation_guest_id) REFERENCES invitation_guests(id) ON DELETE CASCADE",
    );
  }

  if (!(await tableExists("admin_users"))) {
    await connection.query(`
      CREATE TABLE admin_users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(190) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(160) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_admin_users_email (email),
        KEY idx_admin_users_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created admin_users");
  }

  if (!(await tableExists("admin_sessions"))) {
    await connection.query(`
      CREATE TABLE admin_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        admin_user_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL,
        user_agent VARCHAR(500) NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_admin_sessions_token_hash (token_hash),
        KEY idx_admin_sessions_user (admin_user_id),
        KEY idx_admin_sessions_expiration (expires_at, revoked_at),
        CONSTRAINT fk_admin_sessions_user
          FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created admin_sessions");
  }

  if (!(await constraintExists("fk_admin_sessions_user"))) {
    await connection.query(
      "ALTER TABLE admin_sessions ADD CONSTRAINT fk_admin_sessions_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE",
    );
  }

  const [versionRows] = await connection.query(
    "SELECT VERSION() AS version, DATABASE() AS databaseName",
  );
  console.log(
    `Migration complete on ${versionRows[0].databaseName} (${versionRows[0].version})`,
  );
} finally {
  await connection.end();
}
