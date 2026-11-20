ALTER TABLE invitation_guests
  ADD COLUMN attendance_status ENUM('pending', 'attending', 'not_attending') NOT NULL DEFAULT 'pending'
  AFTER ceremony_role;
