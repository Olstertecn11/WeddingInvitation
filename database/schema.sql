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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example invitation URL: https://your-domain.com/?i=FAMILIA-TZUNUN-2026
INSERT INTO invitations (code, display_name, max_guests, allowed_guests)
VALUES (
  'FAMILIA-TZUNUN-2026',
  'Familia Tzunún',
  2,
  '["Nombre de invitado", "Nombre de acompañante"]'
);

INSERT INTO invitation_guests
  (invitation_id, full_name, normalized_name, gender, is_primary)
SELECT id, 'Nombre de invitado', 'nombre de invitado', 'unspecified', TRUE
FROM invitations
WHERE code = 'FAMILIA-TZUNUN-2026';

INSERT INTO invitation_guests
  (invitation_id, full_name, normalized_name, gender, is_primary)
SELECT id, 'Nombre de acompañante', 'nombre de acompanante', 'unspecified', FALSE
FROM invitations
WHERE code = 'FAMILIA-TZUNUN-2026';
