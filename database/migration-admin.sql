ALTER TABLE invitations
  ADD COLUMN link_mode ENUM('individual', 'group') NOT NULL DEFAULT 'individual' AFTER invitation_type,
  ADD COLUMN status ENUM('active', 'disabled', 'expired') NOT NULL DEFAULT 'active' AFTER link_mode,
  ADD COLUMN people_count TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER max_guests,
  ADD COLUMN first_opened_at DATETIME NULL AFTER personalized_message,
  ADD COLUMN last_opened_at DATETIME NULL AFTER first_opened_at,
  MODIFY invitation_type ENUM('individual', 'couple', 'family') NOT NULL DEFAULT 'individual',
  ADD KEY idx_invitations_link_mode (link_mode),
  ADD KEY idx_invitations_status (status);

ALTER TABLE invitation_guests
  ADD COLUMN code VARCHAR(64) NULL AFTER id,
  ADD COLUMN owner_side ENUM('bride', 'groom', 'shared') NOT NULL DEFAULT 'shared' AFTER normalized_name,
  ADD COLUMN ceremony_role ENUM('none', 'bridesmaid', 'groomsman') NOT NULL DEFAULT 'none' AFTER owner_side,
  ADD UNIQUE KEY uq_invitation_guests_code (code),
  ADD KEY idx_invitation_guests_owner_side (owner_side),
  ADD KEY idx_invitation_guests_ceremony_role (ceremony_role),
  ADD COLUMN updated_at DATETIME NULL AFTER created_at,
  ADD UNIQUE KEY uq_invitation_guests_name (invitation_id, normalized_name);

UPDATE invitation_guests
SET ceremony_role = CASE
  WHEN gender = 'female' THEN 'bridesmaid'
  WHEN gender = 'male' THEN 'groomsman'
  ELSE 'none'
END
WHERE ceremony_role = 'none';

UPDATE invitation_guests
SET code = REPLACE(UUID(), '-', '')
WHERE code IS NULL OR code = '';

ALTER TABLE invitation_guests
  MODIFY code VARCHAR(64) NOT NULL,
  DROP COLUMN gender;

ALTER TABLE rsvps
  ADD COLUMN invitation_guest_id BIGINT UNSIGNED NULL AFTER invitation_id,
  ADD COLUMN contact_name VARCHAR(160) NOT NULL AFTER invitation_id,
  ADD COLUMN contact_email VARCHAR(190) NOT NULL AFTER contact_name,
  ADD COLUMN contact_phone VARCHAR(30) NULL AFTER contact_email,
  ADD COLUMN guest_message VARCHAR(500) NULL AFTER dietary_notes,
  ADD COLUMN submitted_at DATETIME NOT NULL AFTER user_agent,
  DROP INDEX uq_rsvps_invitation,
  DROP INDEX uq_rsvps_invitation_id,
  ADD UNIQUE KEY uq_rsvps_invitation_guest (invitation_guest_id),
  ADD KEY idx_rsvps_invitation (invitation_id),
  ADD KEY idx_rsvps_contact_email (contact_email);

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
