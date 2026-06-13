ALTER TABLE invitations
  ADD COLUMN invitation_type ENUM('individual', 'family')
    NOT NULL DEFAULT 'individual' AFTER display_name,
  ADD COLUMN personalized_message VARCHAR(500) NULL AFTER allowed_guests,
  ADD COLUMN used_at DATETIME NULL AFTER active,
  ADD KEY idx_invitations_display_name (display_name),
  ADD KEY idx_invitations_active (active);

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

INSERT INTO invitation_guests
  (invitation_id, full_name, normalized_name, gender, is_primary)
SELECT
  id,
  display_name,
  LOWER(display_name),
  'unspecified',
  TRUE
FROM invitations;
