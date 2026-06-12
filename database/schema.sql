CREATE TABLE invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  max_guests TINYINT UNSIGNED NOT NULL DEFAULT 1,
  allowed_guests JSON NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitations_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE rsvps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invitation_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  normalized_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  attendance ENUM('yes', 'no') NOT NULL,
  companion_names JSON NULL,
  dietary_notes VARCHAR(500) NULL,
  ip_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rsvps_invitation (invitation_id),
  KEY idx_rsvps_normalized_name (normalized_name),
  KEY idx_rsvps_ip_hash (ip_hash),
  CONSTRAINT fk_rsvps_invitation
    FOREIGN KEY (invitation_id) REFERENCES invitations(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Example invitation URL: https://your-domain.com/?i=FAMILIA-TZUNUN-2026
INSERT INTO invitations (code, display_name, max_guests, allowed_guests)
VALUES (
  'FAMILIA-TZUNUN-2026',
  'Familia Tzunún',
  2,
  JSON_ARRAY('Nombre de invitado', 'Nombre de acompañante')
);
