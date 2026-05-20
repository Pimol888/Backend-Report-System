-- Optional MySQL schema for Daily Work Log (when migrating from file DB)
-- Current implementation uses file-based db (data/db.json).

-- Table: work_logs
CREATE TABLE IF NOT EXISTS work_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  role ENUM('admin','super_admin') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  workDate DATE NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_workDate (workDate),
  INDEX idx_user_workDate (userId, workDate)
);

-- Table: work_followers (super admin follow admins)
CREATE TABLE IF NOT EXISTS work_followers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  superAdminId VARCHAR(64) NOT NULL,
  adminId VARCHAR(64) NOT NULL,
  createdAt DATETIME NOT NULL,
  UNIQUE KEY uq_follow (superAdminId, adminId),
  INDEX idx_superAdmin (superAdminId),
  INDEX idx_admin (adminId)
);
