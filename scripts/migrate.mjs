import mysql from "mysql2/promise";

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
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
  return rows.some((row) => row.Field === column);
}

async function indexExists(table, index) {
  const [rows] = await connection.query(`SHOW INDEX FROM \`${table}\``);
  return rows.some((row) => row.Key_name === index);
}

try {
  if (!(await tableExists("invitations"))) {
    await connection.query(`
      CREATE TABLE invitations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(64) NOT NULL,
        display_name VARCHAR(160) NOT NULL,
        invitation_type ENUM('individual', 'family') NOT NULL DEFAULT 'individual',
        max_guests TINYINT UNSIGNED NOT NULL DEFAULT 1,
        allowed_guests LONGTEXT NULL,
        personalized_message VARCHAR(500) NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        used_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_invitations_code (code),
        KEY idx_invitations_display_name (display_name),
        KEY idx_invitations_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created invitations");
  }

  const columns = [
    [
      "invitation_type",
      "ADD COLUMN invitation_type ENUM('individual', 'family') NOT NULL DEFAULT 'individual' AFTER display_name",
    ],
    [
      "personalized_message",
      "ADD COLUMN personalized_message VARCHAR(500) NULL AFTER allowed_guests",
    ],
    ["used_at", "ADD COLUMN used_at DATETIME NULL AFTER active"],
  ];

  for (const [column, sql] of columns) {
    if (!(await columnExists("invitations", column))) {
      await connection.query(`ALTER TABLE invitations ${sql}`);
      console.log(`Added invitations.${column}`);
    }
  }

  if (!(await indexExists("invitations", "idx_invitations_display_name"))) {
    await connection.query(
      "ALTER TABLE invitations ADD KEY idx_invitations_display_name (display_name)",
    );
    console.log("Added invitation display-name index");
  }

  if (!(await indexExists("invitations", "idx_invitations_active"))) {
    await connection.query(
      "ALTER TABLE invitations ADD KEY idx_invitations_active (active)",
    );
    console.log("Added invitation active index");
  }

  if (!(await tableExists("invitation_guests"))) {
    await connection.query(`
      CREATE TABLE invitation_guests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        invitation_id BIGINT UNSIGNED NOT NULL,
        full_name VARCHAR(160) NOT NULL,
        normalized_name VARCHAR(160) NOT NULL,
        gender ENUM('male', 'female', 'unspecified') NOT NULL DEFAULT 'unspecified',
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_invitation_guests_invitation (invitation_id),
        KEY idx_invitation_guests_name (normalized_name),
        CONSTRAINT fk_invitation_guests_invitation
          FOREIGN KEY (invitation_id) REFERENCES invitations(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created invitation_guests");
  }

  if (!(await tableExists("rsvps"))) {
    await connection.query(`
      CREATE TABLE rsvps (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        invitation_id BIGINT UNSIGNED NOT NULL,
        full_name VARCHAR(160) NOT NULL,
        normalized_name VARCHAR(160) NOT NULL,
        email VARCHAR(190) NOT NULL,
        attendance ENUM('yes', 'no') NOT NULL,
        companion_names LONGTEXT NULL,
        dietary_notes VARCHAR(500) NULL,
        ip_hash CHAR(64) NOT NULL,
        user_agent VARCHAR(500) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_rsvps_invitation (invitation_id),
        KEY idx_rsvps_normalized_name (normalized_name),
        KEY idx_rsvps_ip_hash (ip_hash),
        CONSTRAINT fk_rsvps_invitation
          FOREIGN KEY (invitation_id) REFERENCES invitations(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Created rsvps");
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
       (invitation_id, full_name, normalized_name, gender, is_primary)
       VALUES (?, ?, ?, 'unspecified', 1)`,
      [
        invitation.id,
        invitation.display_name,
        invitation.display_name.toLowerCase(),
      ],
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
