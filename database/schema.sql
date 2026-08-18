CREATE TABLE invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  invitation_type ENUM('individual', 'couple', 'family') NOT NULL DEFAULT 'individual',
  status ENUM('active', 'disabled', 'expired') NOT NULL DEFAULT 'active',
  max_guests TINYINT UNSIGNED NOT NULL DEFAULT 1,
  personalized_message VARCHAR(500) NULL,
  first_opened_at DATETIME NULL,
  last_opened_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitations_code (code),
  KEY idx_invitations_display_name (display_name),
  KEY idx_invitations_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invitation_guests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invitation_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  normalized_name VARCHAR(160) NOT NULL,
  gender ENUM('male', 'female', 'unspecified') NOT NULL DEFAULT 'unspecified',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitation_guests_name (invitation_id, normalized_name),
  KEY idx_invitation_guests_invitation (invitation_id),
  KEY idx_invitation_guests_name (normalized_name),
  CONSTRAINT fk_invitation_guests_invitation
    FOREIGN KEY (invitation_id) REFERENCES invitations(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rsvps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invitation_id BIGINT UNSIGNED NOT NULL,
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
  UNIQUE KEY uq_rsvps_invitation (invitation_id),
  KEY idx_rsvps_contact_email (contact_email),
  KEY idx_rsvps_ip_hash (ip_hash),
  CONSTRAINT fk_rsvps_invitation
    FOREIGN KEY (invitation_id) REFERENCES invitations(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO invitations
  (code, display_name, invitation_type, status, max_guests, personalized_message)
VALUES
  (
    'FAMILIA-TZUNUN-2026',
    'Familia Tzunún',
    'family',
    'active',
    2,
    'Nos hará mucha ilusión celebrar con ustedes.'
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
