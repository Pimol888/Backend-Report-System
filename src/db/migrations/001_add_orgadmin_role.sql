-- Run once on existing DB (or use npm run db:reset for fresh install)
ALTER TABLE users
  MODIFY role ENUM('user', 'admin', 'orgadmin', 'superadmin') NOT NULL DEFAULT 'user';

ALTER TABLE users
  ADD COLUMN general_directorate_id VARCHAR(64) NULL AFTER department_id,
  ADD CONSTRAINT fk_users_gd FOREIGN KEY (general_directorate_id) REFERENCES general_directorates(id) ON DELETE SET NULL;
