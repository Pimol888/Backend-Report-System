CREATE TABLE IF NOT EXISTS general_directorates (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(64) PRIMARY KEY,
  general_directorate_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_departments_gd FOREIGN KEY (general_directorate_id) REFERENCES general_directorates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user',
  name VARCHAR(255) NOT NULL,
  courtesy_name VARCHAR(64) NOT NULL DEFAULT 'លោក',
  phone VARCHAR(64) NOT NULL DEFAULT '',
  department_id VARCHAR(64) NULL,
  initials VARCHAR(16) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  cycle ENUM('monthly', 'quarterly', 'semiannual', 'yearly') NOT NULL,
  status ENUM('pending', 'reviewed') NOT NULL DEFAULT 'pending',
  description TEXT NULL,
  period_label VARCHAR(255) NOT NULL,
  submitted_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  submitter_id VARCHAR(64) NOT NULL,
  department_id VARCHAR(64) NOT NULL,
  general_directorate_id VARCHAR(64) NOT NULL,
  reviewed_at DATETIME NULL,
  reviewer_name VARCHAR(255) NULL,
  CONSTRAINT fk_reports_submitter FOREIGN KEY (submitter_id) REFERENCES users(id),
  CONSTRAINT fk_reports_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_reports_gd FOREIGN KEY (general_directorate_id) REFERENCES general_directorates(id),
  INDEX idx_reports_department (department_id),
  INDEX idx_reports_gd (general_directorate_id),
  INDEX idx_reports_cycle (cycle),
  INDEX idx_reports_status (status),
  INDEX idx_reports_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_files (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  file_type ENUM('pdf', 'word') NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  pages INT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_at DATETIME NOT NULL,
  is_resubmission TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_report_files_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  INDEX idx_report_files_report (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_notes (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  text TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  time_label VARCHAR(64) NOT NULL,
  kind ENUM('comment', 'request-files') NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_admin_notes_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  INDEX idx_admin_notes_report (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL,
  actor_id VARCHAR(64) NULL,
  actor_name VARCHAR(255) NOT NULL,
  action ENUM('created', 'status_changed', 'note_added', 'files_resubmitted') NOT NULL,
  from_status ENUM('pending', 'reviewed') NULL,
  to_status ENUM('pending', 'reviewed') NULL,
  message VARCHAR(500) NULL,
  metadata_json TEXT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_report_activity_logs_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_activity_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_report_activity_logs_report (report_id),
  INDEX idx_report_activity_logs_actor (actor_id),
  INDEX idx_report_activity_logs_action (action),
  INDEX idx_report_activity_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
