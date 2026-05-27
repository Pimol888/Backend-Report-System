-- OCM Report System full SQL dump
-- Generated: 2026-05-27T03:09:17.788Z
-- Run this in MySQL Workbench to recreate the database with data.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS `reportdb`;
CREATE DATABASE `reportdb` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `reportdb`;

-- ============================================================
-- Schema
-- ============================================================
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

-- ============================================================
-- Data
-- ============================================================

-- Data for table `general_directorates` (2 rows)
LOCK TABLES `general_directorates` WRITE;
INSERT INTO `general_directorates` (`id`, `name`, `created_at`) VALUES
('gd-admin-tech', 'អគ្គនាយកដ្ឋានរដ្ឋបាល និងបច្ចេកវិទ្យា', '2026-05-27 03:09:16'),
('gd-policy-info', 'អគ្គនាយកដ្ឋានគោលការណ៍ និងព័ត៌មាន', '2026-05-27 03:09:16');
UNLOCK TABLES;

-- Data for table `departments` (4 rows)
LOCK TABLES `departments` WRITE;
INSERT INTO `departments` (`id`, `general_directorate_id`, `name`, `created_at`) VALUES
('dept-digital', 'gd-admin-tech', 'នាយកដ្ឋានបច្ចេកវិទ្យា និងឌីជីថល', '2026-05-27 03:09:16'),
('dept-docs', 'gd-policy-info', 'នាយកដ្ឋានឯកសារ និងព័ត៌មានវិទ្យា', '2026-05-27 03:09:16'),
('dept-governance', 'gd-policy-info', 'នាយកដ្ឋានគោលការណ៍ និងគ្រប់គ្រងគុណភាព', '2026-05-27 03:09:16'),
('dept-ops', 'gd-admin-tech', 'នាយកដ្ឋានប្រតិបត្តិ និងគាំទ្របច្ចេកទេស', '2026-05-27 03:09:16');
UNLOCK TABLES;

-- Data for table `users` (14 rows)
LOCK TABLES `users` WRITE;
INSERT INTO `users` (`id`, `email`, `password`, `role`, `name`, `courtesy_name`, `phone`, `department_id`, `initials`, `created_at`) VALUES
('u-admin', 'admin', 'admin', 'admin', 'សុំ ចិន្តា', 'លោកស្រី', '+855 12 111 222', 'dept-digital', NULL, '2026-05-27 03:09:16'),
('u-member-1', 'member1', 'password', 'user', 'លោក ហេង ហ៊ុយឡុង', 'លោក', '+855 12 000 000', 'dept-digital', 'ហហ', '2026-05-27 03:09:16'),
('u-member-10', 'member10', 'password', 'user', 'អ្នកស្រី ប៊ុនធីតា ម៉ុន', 'អ្នកស្រី', '+855 12 000 000', 'dept-docs', 'បម', '2026-05-27 03:09:16'),
('u-member-11', 'member11', 'password', 'user', 'លោក សុខា រស្មី', 'លោក', '+855 12 000 000', 'dept-docs', 'សរ', '2026-05-27 03:09:16'),
('u-member-12', 'member12', 'password', 'user', 'អ្នកស្រី ចន្ទ្រា ស៊ុន', 'អ្នកស្រី', '+855 12 000 000', 'dept-docs', 'ចស', '2026-05-27 03:09:16'),
('u-member-2', 'member2', 'password', 'user', 'អ្នកស្រី សុខ ពិសិដ្ឋ', 'អ្នកស្រី', '+855 12 000 000', 'dept-digital', 'សព', '2026-05-27 03:09:16'),
('u-member-3', 'member3', 'password', 'user', 'លោក ចាន់ វិច្ឆិកា', 'លោក', '+855 12 000 000', 'dept-digital', 'ចវ', '2026-05-27 03:09:16'),
('u-member-4', 'member4', 'password', 'user', 'អ្នកស្រី ម៉ារី សុខា', 'អ្នកស្រី', '+855 12 000 000', 'dept-ops', 'មស', '2026-05-27 03:09:16'),
('u-member-5', 'member5', 'password', 'user', 'លោក ពៅ សុភាព', 'លោក', '+855 12 000 000', 'dept-ops', 'ពស', '2026-05-27 03:09:16'),
('u-member-6', 'member6', 'password', 'user', 'អ្នកស្រី លីណា ចន្ទ្រា', 'អ្នកស្រី', '+855 12 000 000', 'dept-ops', 'លច', '2026-05-27 03:09:16'),
('u-member-7', 'member7', 'password', 'user', 'លោក សំរាប់ បញ្ញា', 'លោក', '+855 12 000 000', 'dept-governance', 'សប', '2026-05-27 03:09:16'),
('u-member-8', 'member8', 'password', 'user', 'អ្នកស្រី រតនា សុខុម', 'អ្នកស្រី', '+855 12 000 000', 'dept-governance', 'រស', '2026-05-27 03:09:16'),
('u-member-9', 'member9', 'password', 'user', 'លោក វិចិត្រ សារុន', 'លោក', '+855 12 000 000', 'dept-governance', 'វស', '2026-05-27 03:09:16'),
('u-superadmin', 'superadmin', 'superadmin', 'superadmin', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', 'លោក', '+855 12 222 333', NULL, NULL, '2026-05-27 03:09:16');
UNLOCK TABLES;

-- Data for table `reports` (20 rows)
LOCK TABLES `reports` WRITE;
INSERT INTO `reports` (`id`, `title`, `cycle`, `status`, `description`, `period_label`, `submitted_at`, `updated_at`, `submitter_id`, `department_id`, `general_directorate_id`, `reviewed_at`, `reviewer_name`) VALUES
('1', 'របាយការណ៍ប្រតិបត្តិការហិរញ្ញវត្ថុ ខែវិច្ឆិកា ២០២៥', 'monthly', 'reviewed', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ខែវិច្ឆិកា ២០២៥', '2025-11-12 10:42:00', '2025-11-12 10:42:00', 'u-member-1', 'dept-digital', 'gd-admin-tech', '2025-11-12 10:42:00', 'សុំ ចិន្តា'),
('10', 'របាយការណ៍គណនេយ្យភាពហិរញ្ញវត្ថុ ខែសីហា ២០២៥', 'monthly', 'pending', NULL, 'ខែវិច្ឆិកា ២០២៥', '2025-08-30 09:30:00', '2025-08-30 09:30:00', 'u-member-10', 'dept-docs', 'gd-policy-info', NULL, NULL),
('11', 'របាយការណ៍អនុលោមតាមច្បាប់និងលិខិតបញ្ជូន ត្រីមាសទី ១', 'quarterly', 'reviewed', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ត្រីមាសទី ៣ ឆ្នាំ ២០២៥', '2025-08-12 16:18:00', '2025-08-12 16:18:00', 'u-member-11', 'dept-docs', 'gd-policy-info', '2025-08-12 16:18:00', 'សុំ ចិន្តា'),
('12', 'របាយការណ៍បច្ចេកទេសព័ត៌មានវិទ្យា ខែកក្កដា ២០២៥', 'monthly', 'pending', NULL, 'ខែវិច្ឆិកា ២០២៥', '2025-07-28 14:02:00', '2025-07-28 14:02:00', 'u-member-12', 'dept-docs', 'gd-policy-info', NULL, NULL),
('13', 'របាយការណ៍សុវត្តិភាពយានយន្ត និងប្រើប្រាស់ប្រេង ឆមាសទី ១', 'semiannual', 'reviewed', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ឆមាសទី ២ ឆ្នាំ ២០២៥', '2025-07-10 08:45:00', '2025-07-10 08:45:00', 'u-member-1', 'dept-digital', 'gd-admin-tech', '2025-07-10 08:45:00', 'សុំ ចិន្តា'),
('14', 'របាយការណ៍ថែទាំនិងអាជីវកម្មរក្សាសំណង់ ប្រចាំឆ្នាំ ២០២៤', 'yearly', 'pending', NULL, 'ឆ្នាំ ២០២៤', '2025-06-25 11:10:00', '2025-06-25 11:10:00', 'u-member-2', 'dept-digital', 'gd-admin-tech', NULL, NULL),
('15', 'របាយការណ៍អធិការកិច្ចខាងក្នុង ខែមេសា ២០២៥', 'monthly', 'reviewed', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ខែវិច្ឆិកា ២០២៥', '2025-05-08 13:25:00', '2025-05-08 13:25:00', 'u-member-3', 'dept-digital', 'gd-admin-tech', '2025-05-08 13:25:00', 'សុំ ចិន្តា'),
('16', 'របាយការណ៍រក្សាការប្រាក់និងថវិការប្រចាំត្រីមាស ពាក់កណ្តាលឆ្នាំ', 'quarterly', 'reviewed', NULL, 'ត្រីមាសទី ៣ ឆ្នាំ ២០២៥', '2025-04-22 10:50:00', '2025-04-22 10:50:00', 'u-member-4', 'dept-ops', 'gd-admin-tech', '2025-04-22 10:50:00', 'សុំ ចិន្តា'),
('17', 'របាយការណ៍ផែនការការងារខែមិថុនា ២០២៥', 'monthly', 'pending', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ខែវិច្ឆិកា ២០២៥', '2025-03-14 15:05:00', '2025-03-14 15:05:00', 'u-member-5', 'dept-ops', 'gd-admin-tech', NULL, NULL),
('18', 'របាយការណ៍វិនិយោគសហគមន៍ និងគម្រោងរដ្ឋបាល ឆមាសទី ២', 'semiannual', 'pending', NULL, 'ឆមាសទី ២ ឆ្នាំ ២០២៥', '2025-02-03 09:20:00', '2025-02-03 09:20:00', 'u-member-6', 'dept-ops', 'gd-admin-tech', NULL, NULL),
('19', 'របាយការណ៍អនុវត្តការបោះឆ្នោតនិងអាជ្ញាធរជ្រើសរើស ឆ្នាំ ២០២៤', 'yearly', 'reviewed', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ឆ្នាំ ២០២៤', '2025-01-18 12:40:00', '2025-01-18 12:40:00', 'u-member-7', 'dept-governance', 'gd-policy-info', '2025-01-18 12:40:00', 'សុំ ចិន្តា'),
('2', 'របាយការណ៍សង្ខេបធនធានមនុស្ស ត្រីមាសទី ៣ ឆ្នាំ ២០២៥', 'quarterly', 'pending', NULL, 'ត្រីមាសទី ៣ ឆ្នាំ ២០២៥', '2025-10-28 14:05:00', '2025-10-28 14:05:00', 'u-member-2', 'dept-digital', 'gd-admin-tech', NULL, NULL),
('20', 'របាយការណ៍ធនធានទឹកនិងជល់សារធាណ៍ ខែធ្នូ ២០២៤', 'monthly', 'reviewed', NULL, 'ខែវិច្ឆិកា ២០២៥', '2024-12-09 08:55:00', '2024-12-09 08:55:00', 'u-member-8', 'dept-governance', 'gd-policy-info', '2024-12-09 08:55:00', 'សុំ ចិន្តា'),
('3', 'របាយការណ៍ពិនិត្យឡើងវិញពាក់ព័ន្ធរដ្ឋបាលឆមាស', 'semiannual', 'reviewed', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ឆមាសទី ២ ឆ្នាំ ២០២៥', '2025-09-03 09:18:00', '2025-09-03 09:18:00', 'u-member-3', 'dept-digital', 'gd-admin-tech', '2025-09-03 09:18:00', 'សុំ ចិន្តា'),
('4', 'របាយការណ៍អនុលោមតាមប្រព័ន្ធរដ្ឋបាលប្រចាំឆ្នាំ ២០២៤', 'yearly', 'pending', NULL, 'ឆ្នាំ ២០២៤', '2025-08-19 16:30:00', '2025-08-19 16:30:00', 'u-member-4', 'dept-ops', 'gd-admin-tech', NULL, NULL),
('5', 'របាយការណ៍លម្អិតចំណូល-ចំណាយ ខែតុលា ២០២៥', 'monthly', 'reviewed', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ខែវិច្ឆិកា ២០២៥', '2025-11-05 08:15:00', '2025-11-05 08:15:00', 'u-member-5', 'dept-ops', 'gd-admin-tech', '2025-11-05 08:15:00', 'សុំ ចិន្តា'),
('6', 'របាយការណ៍គម្រោងវិនិយោគ ត្រីមាសទី ២ ឆ្នាំ ២០២៥', 'quarterly', 'reviewed', NULL, 'ត្រីមាសទី ៣ ឆ្នាំ ២០២៥', '2025-10-15 11:22:00', '2025-10-15 11:22:00', 'u-member-6', 'dept-ops', 'gd-admin-tech', '2025-10-15 11:22:00', 'សុំ ចិន្តា'),
('7', 'របាយការណ៍សកម្មភាពទីស្នាក់ការ ខែកញ្ញា ២០២៥', 'monthly', 'pending', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ខែវិច្ឆិកា ២០២៥', '2025-10-02 15:40:00', '2025-10-02 15:40:00', 'u-member-7', 'dept-governance', 'gd-policy-info', NULL, NULL),
('8', 'របាយការណ៍តាមដានអនុវត្តគោលនយោបាយរដ្ឋបាល ឆមាសទី ២', 'semiannual', 'reviewed', NULL, 'ឆមាសទី ២ ឆ្នាំ ២០២៥', '2025-09-20 10:00:00', '2025-09-20 10:00:00', 'u-member-8', 'dept-governance', 'gd-policy-info', '2025-09-20 10:00:00', 'សុំ ចិន្តា'),
('9', 'របាយការណ៍សម្រេចការងារប្រចាំឆ្នាំ ២០២៣', 'yearly', 'reviewed', 'របាយការណ៍នេះសង្ខេបលទ្ធផលប្រតិបត្តិការ និងសកម្មភាពសំខាន់ៗក្នុងរយៈពេលដែលបានជ្រើសរើស។ ឯកសារភ្ជាប់មានទម្រង់ PDF និង Word សម្រាប់អនុម័ត និងរក្សាទុកក្នុងប្រព័ន្ធ។', 'ឆ្នាំ ២០២៤', '2025-09-01 13:55:00', '2025-09-01 13:55:00', 'u-member-9', 'dept-governance', 'gd-policy-info', '2025-09-01 13:55:00', 'សុំ ចិន្តា');
UNLOCK TABLES;

-- Data for table `report_files` (28 rows)
LOCK TABLES `report_files` WRITE;
INSERT INTO `report_files` (`id`, `report_id`, `file_type`, `original_name`, `stored_name`, `size_bytes`, `pages`, `uploaded_at`, `is_resubmission`) VALUES
('080733bf-9afe-4e8d-ba15-178479968b67', '13', 'word', 'seed-13-word.docx', 'seed-13-word', 2936013, 0, '2025-07-10 08:45:00', 0),
('1c45cb69-f0f3-479d-9c6d-1e8c00bdd2d8', '6', 'pdf', 'seed-6-pdf.pdf', 'seed-6-pdf', 3250586, 0, '2025-10-15 11:22:00', 0),
('27b14ace-ab7e-42ca-95d8-f5b78500f144', '9', 'pdf', 'seed-9-pdf.pdf', 'seed-9-pdf', 5662310, 0, '2025-09-01 13:55:00', 0),
('474dcdee-789b-4e98-bd2e-cebcb201e5c6', '20', 'pdf', 'seed-20-pdf.pdf', 'seed-20-pdf', 1468006, 0, '2024-12-09 08:55:00', 0),
('49551e79-1514-47a4-aebe-5701ee45d8e6', '12', 'pdf', 'seed-12-pdf.pdf', 'seed-12-pdf', 1013760, 0, '2025-07-28 14:02:00', 0),
('5a55cffc-2845-4280-a8fa-c4bce3543f7b', '15', 'pdf', 'seed-15-pdf.pdf', 'seed-15-pdf', 655360, 0, '2025-05-08 13:25:00', 0),
('5e75b4b1-f3dc-4a99-bc10-37a85da81452', '13', 'pdf', 'seed-13-pdf.pdf', 'seed-13-pdf', 2936013, 0, '2025-07-10 08:45:00', 0),
('5f3adfc6-a757-440d-87ca-f52a296e7798', '11', 'pdf', 'seed-11-pdf.pdf', 'seed-11-pdf', 1677722, 0, '2025-08-12 16:18:00', 0),
('69174e17-f021-4001-8eda-f31e8e8c9086', '1', 'word', 'seed-1-word.docx', 'seed-1-word', 2516582, 0, '2025-11-12 10:42:00', 0),
('733c08ab-569d-4b85-a259-152946429643', '3', 'word', 'seed-3-word.docx', 'seed-3-word', 911360, 0, '2025-09-03 09:18:00', 0),
('739bc4ff-8f9f-414a-9011-f4772b8e9a7a', '19', 'word', 'seed-19-word.docx', 'seed-19-word', 2726298, 0, '2025-01-18 12:40:00', 0),
('73fd111d-423b-436f-9c0d-e8d5ccd0288b', '10', 'word', 'seed-10-word.docx', 'seed-10-word', 1258291, 0, '2025-08-30 09:30:00', 0),
('788c2c93-eb44-4eaa-9a42-edb523df7c77', '16', 'pdf', 'seed-16-pdf.pdf', 'seed-16-pdf', 3670016, 0, '2025-04-22 10:50:00', 0),
('82a79371-2e16-4bce-ad02-e17fc8f74919', '18', 'pdf', 'seed-18-pdf.pdf', 'seed-18-pdf', 4194304, 0, '2025-02-03 09:20:00', 0),
('8826ed5e-fdff-4941-a117-65ebea69f3e4', '2', 'pdf', 'seed-2-pdf.pdf', 'seed-2-pdf', 1153434, 0, '2025-10-28 14:05:00', 0),
('94578a0c-c3b4-4ed6-8553-56ca7f833d9a', '5', 'pdf', 'seed-5-pdf.pdf', 'seed-5-pdf', 1887437, 0, '2025-11-05 08:15:00', 0),
('b372c679-37d1-4fbf-aa2c-4a331241491f', '8', 'word', 'seed-8-word.docx', 'seed-8-word', 2097152, 0, '2025-09-20 10:00:00', 0),
('b82ab6d4-a77c-40b5-b07f-0af5e79f86e3', '14', 'word', 'seed-14-word.docx', 'seed-14-word', 2306867, 0, '2025-06-25 11:10:00', 0),
('bcef74d7-a833-45b6-9430-5b029ed4972e', '16', 'word', 'seed-16-word.docx', 'seed-16-word', 3670016, 0, '2025-04-22 10:50:00', 0),
('c3e4b579-9ae5-47e9-bf5b-f237e45ffd9e', '7', 'word', 'seed-7-word.docx', 'seed-7-word', 737280, 0, '2025-10-02 15:40:00', 0),
('c933f964-c171-4138-afc5-e6e47159e8ef', '17', 'word', 'seed-17-word.docx', 'seed-17-word', 522240, 0, '2025-03-14 15:05:00', 0),
('dfaec27d-a5fb-4b2b-be9a-c8a9e8787018', '4', 'pdf', 'seed-4-pdf.pdf', 'seed-4-pdf', 4404019, 0, '2025-08-19 16:30:00', 0),
('e50a90c8-c88a-482b-9843-79f9072149b6', '19', 'pdf', 'seed-19-pdf.pdf', 'seed-19-pdf', 2726298, 0, '2025-01-18 12:40:00', 0),
('e982ce66-478f-4c25-9c3a-07f622bcae0d', '6', 'word', 'seed-6-word.docx', 'seed-6-word', 3250586, 0, '2025-10-15 11:22:00', 0),
('eaa1f512-60fd-4250-965d-e58676bc1669', '4', 'word', 'seed-4-word.docx', 'seed-4-word', 4404019, 0, '2025-08-19 16:30:00', 0),
('f7188f6e-4d33-48b4-938c-c7d59c2d5959', '8', 'pdf', 'seed-8-pdf.pdf', 'seed-8-pdf', 2097152, 0, '2025-09-20 10:00:00', 0),
('fb3ee338-5ed1-4fa5-9405-c017b4ec9ee5', '11', 'word', 'seed-11-word.docx', 'seed-11-word', 1677722, 0, '2025-08-12 16:18:00', 0),
('fe1e5f88-8faa-4603-8b61-e234f6e6c24d', '1', 'pdf', 'seed-1-pdf.pdf', 'seed-1-pdf', 2516582, 0, '2025-11-12 10:42:00', 0);
UNLOCK TABLES;

-- Data for table `admin_notes` (3 rows)
LOCK TABLES `admin_notes` WRITE;
INSERT INTO `admin_notes` (`id`, `report_id`, `text`, `author`, `time_label`, `kind`, `created_at`) VALUES
('4b41ac4b-85fb-4b74-84f7-4facb87258b8', '4', 'ឯកសារ Word មិនគ្រប់គ្រាន់ — សូមភ្ជាប់ទំព័រខុសគ្នា និង PDF សង្ខេប។', 'សុំ ចិន្តា', '09:05 ថ្ងៃនេះ', 'request-files', '2025-08-19 16:30:00'),
('7df1b8e1-f793-4b7e-9d9b-a0d5bdd5a426', '2', 'សូមដាក់ស្នើឯកសារ PDF និង Word កំណែធ្វើបច្ចុប្បន្នភាពឡើងវិញ។', 'សុំ ចិន្តា', '14:20 ថ្ងៃនេះ', 'request-files', '2025-10-28 14:05:00'),
('fe462055-d745-4f2a-b6a8-de8e5d852cf0', '1', 'របាយការណ៍ត្រូវបានពិនិត្យ និងអនុម័តរួចរាល់។ សូមរក្សាទម្រង់ PDF/Word និងពេលវេលាដាក់ស្នើឱ្យដូចគ្នាសម្រាប់រយៈពេលបន្ទាប់។', 'សុំ ចិន្តា', '14:08 ថ្ងៃនេះ', 'comment', '2025-11-12 10:42:00');
UNLOCK TABLES;

-- Data for table `report_activity_logs` (35 rows)
LOCK TABLES `report_activity_logs` WRITE;
INSERT INTO `report_activity_logs` (`id`, `report_id`, `actor_id`, `actor_name`, `action`, `from_status`, `to_status`, `message`, `metadata_json`, `created_at`) VALUES
('03096a74-3e5a-4ca8-8f95-0a160d600cae', '1', 'u-admin', 'សុំ ចិន្តា', 'note_added', NULL, NULL, 'Admin added a note', '{"kind":"comment"}', '2025-11-12 10:42:00'),
('09af8ffe-4d55-411d-8279-d0171c36ea1e', '15', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-05-08 13:25:00'),
('0b19709d-dc12-4e01-a42d-466c3565ff16', '11', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-08-12 16:18:00'),
('1a1b3353-854c-43c4-a23e-01bf76dd6da0', '5', 'u-member-5', 'លោក ពៅ សុភាព', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-11-05 08:15:00'),
('1ee668d0-bf9a-406a-bae0-ea1e8df082dd', '10', 'u-member-10', 'អ្នកស្រី ប៊ុនធីតា ម៉ុន', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-08-30 09:30:00'),
('22fdbd5f-6a1e-4fb9-bbc4-ec6f91bfa6e1', '16', 'u-member-4', 'អ្នកស្រី ម៉ារី សុខា', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-04-22 10:50:00'),
('2607233e-3841-4936-bb64-6a77203175f4', '19', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-01-18 12:40:00'),
('3e337d3a-4835-4cf2-8410-f1395da3a4b0', '5', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-11-05 08:15:00'),
('43daba3b-b079-45bf-b9ba-3e6a0f1b2dc6', '4', 'u-admin', 'សុំ ចិន្តា', 'note_added', NULL, NULL, 'Admin requested file resubmission', '{"kind":"request-files"}', '2025-08-19 16:30:00'),
('44c4e5a9-97bf-4b4c-b6a7-85506d6ae697', '20', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2024-12-09 08:55:00'),
('48d98181-9153-4403-a22a-7cf5eb28ad95', '1', 'u-member-1', 'លោក ហេង ហ៊ុយឡុង', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-11-12 10:42:00'),
('551b97c5-e88a-4dde-b719-5c236479142d', '12', 'u-member-12', 'អ្នកស្រី ចន្ទ្រា ស៊ុន', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-07-28 14:02:00'),
('5e458fbd-93b8-42bf-a1fa-c87d00e65cd8', '4', 'u-member-4', 'អ្នកស្រី ម៉ារី សុខា', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-08-19 16:30:00'),
('69fb0e98-6394-4412-a7ac-caccd9d1612d', '18', 'u-member-6', 'អ្នកស្រី លីណា ចន្ទ្រា', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-02-03 09:20:00'),
('6fb9568a-95c1-4289-bd56-6e56e4a599e8', '13', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-07-10 08:45:00'),
('7852d435-450b-4b3c-bc64-2f9497395627', '6', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-10-15 11:22:00'),
('7cfcb5aa-c500-44b6-aebc-d2e0fd178fbf', '9', 'u-member-9', 'លោក វិចិត្រ សារុន', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-09-01 13:55:00'),
('7d79ed77-96cb-41ca-939e-503818633ac3', '20', 'u-member-8', 'អ្នកស្រី រតនា សុខុម', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2024-12-09 08:55:00'),
('80f0c53f-cb56-4e7b-b008-78f35df874ba', '19', 'u-member-7', 'លោក សំរាប់ បញ្ញា', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-01-18 12:40:00'),
('8a7d4438-e39d-4816-9027-fd64ece63617', '3', 'u-member-3', 'លោក ចាន់ វិច្ឆិកា', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-09-03 09:18:00'),
('8b06b47c-a114-4570-a45f-abddac196ab2', '6', 'u-member-6', 'អ្នកស្រី លីណា ចន្ទ្រា', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-10-15 11:22:00'),
('a438e1a3-21f0-4263-ba82-706010b1b225', '2', 'u-admin', 'សុំ ចិន្តា', 'note_added', NULL, NULL, 'Admin requested file resubmission', '{"kind":"request-files"}', '2025-10-28 14:05:00'),
('a6848937-09a2-46b5-a24d-e54ec36dd22a', '15', 'u-member-3', 'លោក ចាន់ វិច្ឆិកា', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-05-08 13:25:00'),
('a9201c20-de94-4031-b7b6-3e38efe4f031', '7', 'u-member-7', 'លោក សំរាប់ បញ្ញា', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-10-02 15:40:00'),
('b0dec404-fb44-4951-b471-fc50a5c669ea', '8', 'u-member-8', 'អ្នកស្រី រតនា សុខុម', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-09-20 10:00:00'),
('b691af3e-923d-4e31-bf3f-698022bf650f', '14', 'u-member-2', 'អ្នកស្រី សុខ ពិសិដ្ឋ', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-06-25 11:10:00'),
('c9eea259-6228-46ae-bb6d-743846b0d85c', '13', 'u-member-1', 'លោក ហេង ហ៊ុយឡុង', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-07-10 08:45:00'),
('cfeba769-82b8-4fee-9d21-27249d431f2f', '9', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-09-01 13:55:00'),
('d33f88e6-393e-4aeb-b951-8d902ce30a60', '3', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-09-03 09:18:00'),
('da032677-a130-4f2a-9826-04f0ec2223e3', '2', 'u-member-2', 'អ្នកស្រី សុខ ពិសិដ្ឋ', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-10-28 14:05:00'),
('e7c61952-716b-4f0c-88e5-28a185746174', '8', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-09-20 10:00:00'),
('f070fb9c-ffc3-47fd-b940-5dc2eb9bfcb7', '17', 'u-member-5', 'លោក ពៅ សុភាព', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-03-14 15:05:00'),
('f8bc16c0-b75a-47e5-8e1b-57cebd5d9707', '1', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-11-12 10:42:00'),
('fe526a91-09f3-4cfc-9ae6-f0e9d3c7c0bb', '11', 'u-member-11', 'លោក សុខា រស្មី', 'created', NULL, 'pending', 'Report submitted (seed)', NULL, '2025-08-12 16:18:00'),
('ff7ed2e5-f561-4de4-b7be-4723bb553d51', '16', 'u-admin', 'សុំ ចិន្តា', 'status_changed', 'pending', 'reviewed', 'Report reviewed (seed)', NULL, '2025-04-22 10:50:00');
UNLOCK TABLES;

SET FOREIGN_KEY_CHECKS = 1;
