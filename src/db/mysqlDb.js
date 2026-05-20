/**
 * MySQL database adapter (table-backed).
 * Provides getDb/updateDb interface for database operations.
 * All tables are automatically created on startup via initializeDatabase().
 */
const mysql = require("mysql2/promise");
const { config } = require("../config/env");

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      connectionLimit: config.db.connectionLimit,
      dateStrings: true,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

/**
 * Initialize database schema (creates tables if they don't exist).
 * Should be called on app startup.
 */
async function initializeDatabase() {
  const connection = await getPool().getConnection();
  try {
    // Create tables (order matters for foreign keys - referenced tables first)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticketCode VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        courtesyName VARCHAR(50) DEFAULT '',
        position TEXT,
        department TEXT,
        phoneNumber VARCHAR(50),
        title TEXT,
        description TEXT,
        roomNumber VARCHAR(50),
        ticketCategory VARCHAR(100),
        ticketCategoryOther TEXT,
        categoryItems JSON,
        status ENUM('open', 'in_progress', 'closed', 'done') DEFAULT 'open',
        solution JSON,
        adminComment TEXT,
        assignedStaff JSON,
        closedBy JSON,
        images JSON,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_status (status),
        INDEX idx_ticketCode (ticketCode),
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Add closedBy column if it doesn't exist (for existing databases)
    try {
      await connection.query(`ALTER TABLE tickets ADD COLUMN closedBy JSON AFTER assignedStaff`);
    } catch (e) {
      // Column already exists, ignore
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255),
        passwordHash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'super_admin') DEFAULT 'admin',
        createdAt DATETIME NOT NULL,
        INDEX idx_username (username),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255),
        passwordHash VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL,
        INDEX idx_username (username),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS adminResetTokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(10) NOT NULL,
        adminId VARCHAR(50) NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL,
        INDEX idx_token (token),
        INDEX idx_adminId (adminId),
        INDEX idx_expiresAt (expiresAt),
        FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS userResetTokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(10) NOT NULL,
        userId VARCHAR(50) NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL,
        INDEX idx_token (token),
        INDEX idx_userId (userId),
        INDEX idx_expiresAt (expiresAt),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS teamAlerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_createdAt (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS permissionRequests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adminId VARCHAR(50) NOT NULL,
        status ENUM('late', 'leave_early', 'absent', 'out_of_office') NOT NULL,
        reason TEXT,
        approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        reviewedBy VARCHAR(50),
        reviewedAt DATETIME,
        reviewComment TEXT,
        arrivalTime VARCHAR(10),
        leaveTime VARCHAR(10),
        fromDate DATE,
        toDate DATE,
        totalDays INT,
        startTime DATETIME,
        endTime DATETIME,
        location VARCHAR(255),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_adminId (adminId),
        INDEX idx_status (status),
        INDEX idx_approvalStatus (approvalStatus),
        INDEX idx_createdAt (createdAt),
        FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS meetingNotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        note TEXT,
        image JSON,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        adminId VARCHAR(50) NOT NULL,
        ticketId INT DEFAULT 0,
        permissionRequestId INT,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        \`read\` BOOLEAN DEFAULT FALSE,
        readAt DATETIME,
        createdAt DATETIME NOT NULL,
        INDEX idx_adminId (adminId),
        INDEX idx_ticketId (ticketId),
        INDEX idx_read (\`read\`),
        INDEX idx_createdAt (createdAt),
        INDEX idx_type (type),
        FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS calendarNotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adminId VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        note TEXT,
        images JSON,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        UNIQUE KEY unique_admin_date (adminId, date),
        INDEX idx_adminId (adminId),
        INDEX idx_date (date),
        FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS workLogs (
        id VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        role ENUM('admin', 'super_admin') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        workDate DATE NOT NULL,
        attachmentFilename VARCHAR(255),
        ticketId INT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_workDate (workDate),
        INDEX idx_ticketId (ticketId),
        INDEX idx_createdAt (createdAt),
        FOREIGN KEY (userId) REFERENCES admins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS workFollowers (
        id VARCHAR(50) PRIMARY KEY,
        superAdminId VARCHAR(50) NOT NULL,
        adminId VARCHAR(50) NOT NULL,
        createdAt DATETIME NOT NULL,
        UNIQUE KEY unique_super_admin (superAdminId, adminId),
        INDEX idx_superAdminId (superAdminId),
        INDEX idx_adminId (adminId),
        FOREIGN KEY (superAdminId) REFERENCES admins(id) ON DELETE CASCADE,
        FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sequences (
        name VARCHAR(50) PRIMARY KEY,
        value INT DEFAULT 0,
        updatedAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Initialize sequences if they don't exist
    await connection.query(`
      INSERT IGNORE INTO sequences (name, value, updatedAt) VALUES
      ('lastTicketId', 0, NOW()),
      ('lastAlertId', 0, NOW()),
      ('lastTeamAlertId', 0, NOW()),
      ('lastPermissionRequestId', 0, NOW()),
      ('lastMeetingNoteId', 0, NOW());
    `);
  } finally {
    connection.release();
  }
}

/**
 * Convert ISO date string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS).
 * Uses UTC components so DATETIME stores UTC wall time; clients interpret via ISO Z from API.
 */
function toMySQLDateTime(value) {
  if (!value) return null;
  // Date object — store UTC components (same instant as toISOString())
  if (value instanceof Date) {
    const date = value;
    if (isNaN(date.getTime())) return null;
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  // Numeric timestamp (ms)
  if (typeof value === "number") {
    return toMySQLDateTime(new Date(value));
  }
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Already MySQL DATETIME (or DATE) format
  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(trimmed)) {
    return trimmed.length === 10 ? `${trimmed} 00:00:00` : trimmed;
  }
  // Convert ISO 8601 to MySQL DATETIME (UTC wall time)
  // '2026-02-19T07:16:32.348Z' -> '2026-02-19 07:16:32' (UTC)
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return trimmed; // Invalid date, return as-is
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * MySQL DATETIME is timezone-naive; we store UTC wall time. Expose ISO 8601 with Z to APIs
 * so browsers parse one correct instant everywhere.
 */
function mysqlDatetimeStringToIsoUtc(mysqlStr) {
  if (mysqlStr == null || mysqlStr === undefined) return mysqlStr;
  if (typeof mysqlStr !== "string") {
    if (mysqlStr instanceof Date) return isNaN(mysqlStr.getTime()) ? null : mysqlStr.toISOString();
    return mysqlStr;
  }
  const s = mysqlStr.trim();
  if (!s) return mysqlStr;
  if (/[zZ]$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? mysqlStr : d.toISOString();
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/.exec(s);
  if (!m) return mysqlStr;
  const ms = m[7] ? Number(String(m[7]).padEnd(3, "0").slice(0, 3)) : 0;
  const d = new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6]),
      ms
    )
  );
  return d.toISOString();
}

function toMySQLDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "number") return toMySQLDateOnly(new Date(value));
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Internal helper to load database state from a connection (used by both getDb and updateDb).
 */
async function loadDbState(connection) {
  const [tickets] = await connection.query("SELECT * FROM tickets ORDER BY id");
  const [admins] = await connection.query("SELECT * FROM admins");
  const [users] = await connection.query("SELECT * FROM users");
  const [adminResetTokens] = await connection.query("SELECT * FROM adminResetTokens");
  const [userResetTokens] = await connection.query("SELECT * FROM userResetTokens");
  const [alerts] = await connection.query("SELECT * FROM alerts");
  const [teamAlerts] = await connection.query("SELECT * FROM teamAlerts");
  const [permissionRequests] = await connection.query("SELECT * FROM permissionRequests");
  const [meetingNotes] = await connection.query("SELECT * FROM meetingNotes");
  const [notifications] = await connection.query("SELECT * FROM notifications");
  const [calendarNotesRows] = await connection.query("SELECT * FROM calendarNotes");
  const [workLogs] = await connection.query("SELECT * FROM workLogs ORDER BY workDate DESC, createdAt DESC");
  const [workFollowers] = await connection.query("SELECT * FROM workFollowers");
  const [sequences] = await connection.query("SELECT * FROM sequences");

  // Convert sequences to object
  const sequencesObj = {};
  sequences.forEach((seq) => {
    sequencesObj[seq.name] = seq.value;
  });

  // Parse JSON columns helper
  const parseJson = (val) => {
    if (val === null || val === undefined) return null;
    // MySQL2 automatically parses JSON columns, so it might already be an object
    if (typeof val === "object" && !Array.isArray(val)) {
      return val;
    }
    if (Array.isArray(val)) {
      return val;
    }
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        // If parsing fails, return empty array for images, or the value itself
        return val;
      }
    }
    return val;
  };

  // Convert calendarNotes to nested object structure
  const calendarNotes = {};
  calendarNotesRows.forEach((row) => {
    const normalizedDate = toMySQLDateOnly(row.date);
    if (!normalizedDate) return;
    if (!calendarNotes[row.adminId]) {
      calendarNotes[row.adminId] = {};
    }
    let images = parseJson(row.images);
    // Ensure images is always an array
    if (!images) {
      images = [];
    } else if (!Array.isArray(images)) {
      // If it's a single value (like a URL string), wrap it in an array
      images = typeof images === "string" && images.trim() ? [images] : [];
    }
    calendarNotes[row.adminId][normalizedDate] = {
      note: row.note || "",
      images: images,
    };
  });

  return {
    tickets: tickets.map((t) => {
      const assignedStaff = parseJson(t.assignedStaff);
      const closedBy = parseJson(t.closedBy);
      return {
        ...t,
        createdAt: mysqlDatetimeStringToIsoUtc(t.createdAt),
        updatedAt: mysqlDatetimeStringToIsoUtc(t.updatedAt),
        categoryItems: parseJson(t.categoryItems),
        solution: parseJson(t.solution),
        assignedStaff: Array.isArray(assignedStaff) ? assignedStaff : [],
        closedBy: closedBy && typeof closedBy === "object" && closedBy.id && closedBy.name ? closedBy : null,
        images: parseJson(t.images),
      };
    }),
    admins: admins.map((a) => ({
      ...a,
      createdAt: mysqlDatetimeStringToIsoUtc(a.createdAt),
    })),
    users: users.map((u) => ({
      ...u,
      createdAt: mysqlDatetimeStringToIsoUtc(u.createdAt),
    })),
    adminResetTokens,
    userResetTokens,
    alerts: alerts.map((a) => ({
      ...a,
      createdAt: mysqlDatetimeStringToIsoUtc(a.createdAt),
      updatedAt: mysqlDatetimeStringToIsoUtc(a.updatedAt),
    })),
    teamAlerts: teamAlerts.map((a) => ({
      ...a,
      createdAt: mysqlDatetimeStringToIsoUtc(a.createdAt),
      updatedAt: mysqlDatetimeStringToIsoUtc(a.updatedAt),
    })),
    permissionRequests: permissionRequests.map((r) => ({
      ...r,
      createdAt: mysqlDatetimeStringToIsoUtc(r.createdAt),
      updatedAt: mysqlDatetimeStringToIsoUtc(r.updatedAt),
      reviewedAt: r.reviewedAt ? mysqlDatetimeStringToIsoUtc(r.reviewedAt) : null,
      startTime: r.startTime ? mysqlDatetimeStringToIsoUtc(r.startTime) : null,
      endTime: r.endTime ? mysqlDatetimeStringToIsoUtc(r.endTime) : null,
    })),
    meetingNotes: meetingNotes.map((m) => ({
      ...m,
      createdAt: mysqlDatetimeStringToIsoUtc(m.createdAt),
      updatedAt: mysqlDatetimeStringToIsoUtc(m.updatedAt),
      image: parseJson(m.image),
    })),
    notifications: notifications.map((n) => ({
      ...n,
      read: n.read === 1 || n.read === true || n.read === "1",
      createdAt: mysqlDatetimeStringToIsoUtc(n.createdAt),
      readAt: n.readAt ? mysqlDatetimeStringToIsoUtc(n.readAt) : null,
    })),
    calendarNotes,
    workLogs: workLogs.map((w) => ({
      ...w,
      workDate: toMySQLDateOnly(w.workDate),
      createdAt: mysqlDatetimeStringToIsoUtc(w.createdAt),
      updatedAt: mysqlDatetimeStringToIsoUtc(w.updatedAt),
    })),
    workFollowers,
    lastTicketId: sequencesObj.lastTicketId || 0,
    lastAlertId: sequencesObj.lastAlertId || 0,
    lastTeamAlertId: sequencesObj.lastTeamAlertId || 0,
    lastPermissionRequestId: sequencesObj.lastPermissionRequestId || 0,
    lastMeetingNoteId: sequencesObj.lastMeetingNoteId || 0,
  };
}

/**
 * Get the current database state as a JSON-like object.
 * This is mainly used for reading data in a transaction-like manner.
 */
async function getDb() {
  const connection = await getPool().getConnection();
  try {
    return await loadDbState(connection);
  } finally {
    connection.release();
  }
}

/**
 * Execute a mutation function within a transaction.
 * The mutator function receives the db object and can modify it.
 * Changes are persisted to MySQL.
 */
async function updateDb(mutatorFn) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    // Get current state (using the same connection for transaction)
    const db = await loadDbState(connection);

    // Execute mutator
    const result = await mutatorFn(db);

    // Persist changes
    // Update tickets
    const ticketIds = (db.tickets || []).map((t) => t.id).filter((id) => id != null);
    if (ticketIds.length > 0) {
      await connection.query(`DELETE FROM tickets WHERE id NOT IN (${ticketIds.map(() => "?").join(",")})`, ticketIds);
    } else {
      await connection.query("DELETE FROM tickets");
    }
    for (const ticket of db.tickets || []) {
      await connection.query(
        `INSERT INTO tickets (
          id, ticketCode, name, courtesyName, position, department, phoneNumber, title, description,
          roomNumber, ticketCategory, ticketCategoryOther, categoryItems, status, solution,
          adminComment, assignedStaff, closedBy, images, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ticketCode=VALUES(ticketCode), name=VALUES(name), courtesyName=VALUES(courtesyName),
          position=VALUES(position), department=VALUES(department), phoneNumber=VALUES(phoneNumber),
          title=VALUES(title), description=VALUES(description), roomNumber=VALUES(roomNumber),
          ticketCategory=VALUES(ticketCategory), ticketCategoryOther=VALUES(ticketCategoryOther),
          categoryItems=VALUES(categoryItems), status=VALUES(status), solution=VALUES(solution),
          adminComment=VALUES(adminComment), assignedStaff=VALUES(assignedStaff),
          closedBy=VALUES(closedBy), images=VALUES(images), updatedAt=VALUES(updatedAt)`,
        [
          ticket.id,
          ticket.ticketCode,
          ticket.name,
          ticket.courtesyName || "",
          ticket.position,
          ticket.department,
          ticket.phoneNumber,
          ticket.title || "",
          ticket.description || "",
          ticket.roomNumber || "",
          ticket.ticketCategory || "",
          ticket.ticketCategoryOther || "",
          JSON.stringify(ticket.categoryItems || []),
          ticket.status,
          ticket.solution ? JSON.stringify(ticket.solution) : null,
          ticket.adminComment,
          JSON.stringify(ticket.assignedStaff || []),
          ticket.closedBy ? JSON.stringify(ticket.closedBy) : null,
          JSON.stringify(ticket.images || []),
          toMySQLDateTime(ticket.createdAt),
          toMySQLDateTime(ticket.updatedAt),
        ]
      );
    }

    // Update admins
    for (const admin of db.admins || []) {
      await connection.query(
        `INSERT INTO admins (id, username, email, passwordHash, role, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username=VALUES(username), email=VALUES(email),
           passwordHash=VALUES(passwordHash), role=VALUES(role)`,
        [admin.id, admin.username, admin.email, admin.passwordHash, admin.role || "admin", toMySQLDateTime(admin.createdAt)]
      );
    }

    // Update users
    for (const user of db.users || []) {
      await connection.query(
        `INSERT INTO users (id, username, email, passwordHash, createdAt)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username=VALUES(username), email=VALUES(email), passwordHash=VALUES(passwordHash)`,
        [user.id, user.username, user.email, user.passwordHash, toMySQLDateTime(user.createdAt)]
      );
    }

    // Update adminResetTokens (delete all and reinsert)
    await connection.query("DELETE FROM adminResetTokens");
    for (const token of db.adminResetTokens || []) {
      await connection.query(
        `INSERT INTO adminResetTokens (token, adminId, expiresAt, createdAt) VALUES (?, ?, ?, ?)`,
        [token.token, token.adminId, toMySQLDateTime(token.expiresAt), toMySQLDateTime(token.createdAt || new Date().toISOString())]
      );
    }

    // Update userResetTokens (delete all and reinsert)
    await connection.query("DELETE FROM userResetTokens");
    for (const token of db.userResetTokens || []) {
      await connection.query(
        `INSERT INTO userResetTokens (token, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)`,
        [token.token, token.userId, toMySQLDateTime(token.expiresAt), toMySQLDateTime(token.createdAt || new Date().toISOString())]
      );
    }

    // Update alerts
    const alertIds = (db.alerts || []).map((a) => a.id).filter((id) => id != null);
    if (alertIds.length > 0) {
      await connection.query(`DELETE FROM alerts WHERE id NOT IN (${alertIds.map(() => "?").join(",")})`, alertIds);
    } else {
      await connection.query("DELETE FROM alerts");
    }
    for (const alert of db.alerts || []) {
      await connection.query(
        `INSERT INTO alerts (id, title, message, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), message=VALUES(message), updatedAt=VALUES(updatedAt)`,
        [alert.id, alert.title, alert.message || "", toMySQLDateTime(alert.createdAt), toMySQLDateTime(alert.updatedAt)]
      );
    }

    // Update teamAlerts
    const teamAlertIds = (db.teamAlerts || []).map((a) => a.id).filter((id) => id != null);
    if (teamAlertIds.length > 0) {
      await connection.query(`DELETE FROM teamAlerts WHERE id NOT IN (${teamAlertIds.map(() => "?").join(",")})`, teamAlertIds);
    } else {
      await connection.query("DELETE FROM teamAlerts");
    }
    for (const alert of db.teamAlerts || []) {
      await connection.query(
        `INSERT INTO teamAlerts (id, title, message, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), message=VALUES(message), updatedAt=VALUES(updatedAt)`,
        [alert.id, alert.title, alert.message || "", toMySQLDateTime(alert.createdAt), toMySQLDateTime(alert.updatedAt)]
      );
    }

    // Update permissionRequests
    const permissionRequestIds = (db.permissionRequests || []).map((r) => r.id).filter((id) => id != null);
    if (permissionRequestIds.length > 0) {
      await connection.query(`DELETE FROM permissionRequests WHERE id NOT IN (${permissionRequestIds.map(() => "?").join(",")})`, permissionRequestIds);
    } else {
      await connection.query("DELETE FROM permissionRequests");
    }
    for (const req of db.permissionRequests || []) {
      await connection.query(
        `INSERT INTO permissionRequests (
          id, adminId, status, reason, approvalStatus, reviewedBy, reviewedAt, reviewComment,
          arrivalTime, leaveTime, fromDate, toDate, totalDays, startTime, endTime, location,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          adminId=VALUES(adminId), status=VALUES(status), reason=VALUES(reason),
          approvalStatus=VALUES(approvalStatus), reviewedBy=VALUES(reviewedBy),
          reviewedAt=VALUES(reviewedAt), reviewComment=VALUES(reviewComment),
          arrivalTime=VALUES(arrivalTime), leaveTime=VALUES(leaveTime),
          fromDate=VALUES(fromDate), toDate=VALUES(toDate), totalDays=VALUES(totalDays),
          startTime=VALUES(startTime), endTime=VALUES(endTime), location=VALUES(location),
          updatedAt=VALUES(updatedAt)`,
        [
          req.id,
          req.adminId,
          req.status,
          req.reason,
          req.approvalStatus,
          req.reviewedBy,
          req.reviewedAt ? toMySQLDateTime(req.reviewedAt) : null,
          req.reviewComment,
          req.arrivalTime,
          req.leaveTime,
          req.fromDate,
          req.toDate,
          req.totalDays,
          req.startTime ? toMySQLDateTime(req.startTime) : null,
          req.endTime ? toMySQLDateTime(req.endTime) : null,
          req.location,
          toMySQLDateTime(req.createdAt),
          toMySQLDateTime(req.updatedAt),
        ]
      );
    }

    // Update meetingNotes
    const meetingNoteIds = (db.meetingNotes || []).map((n) => n.id).filter((id) => id != null);
    if (meetingNoteIds.length > 0) {
      await connection.query(`DELETE FROM meetingNotes WHERE id NOT IN (${meetingNoteIds.map(() => "?").join(",")})`, meetingNoteIds);
    } else {
      await connection.query("DELETE FROM meetingNotes");
    }
    for (const note of db.meetingNotes || []) {
      await connection.query(
        `INSERT INTO meetingNotes (id, date, note, image, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE date=VALUES(date), note=VALUES(note), image=VALUES(image), updatedAt=VALUES(updatedAt)`,
        [
          note.id,
          note.date,
          note.note || "",
          note.image ? JSON.stringify(note.image) : null,
          toMySQLDateTime(note.createdAt),
          toMySQLDateTime(note.updatedAt),
        ]
      );
    }

    // Update notifications
    await connection.query("DELETE FROM notifications");
    for (const notif of db.notifications || []) {
      await connection.query(
        `INSERT INTO notifications (id, adminId, ticketId, permissionRequestId, message, type, \`read\`, readAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notif.id,
          notif.adminId,
          notif.ticketId || 0,
          notif.permissionRequestId || null,
          notif.message,
          notif.type,
          notif.read === true || notif.read === 1 || notif.read === "1" ? 1 : 0,
          notif.readAt ? toMySQLDateTime(notif.readAt) : null,
          toMySQLDateTime(notif.createdAt),
        ]
      );
    }

    // Update calendarNotes
    await connection.query("DELETE FROM calendarNotes");
    for (const [adminId, dates] of Object.entries(db.calendarNotes || {})) {
      if (typeof dates === "object" && dates !== null) {
        for (const [date, entry] of Object.entries(dates)) {
          if (typeof entry === "object" && entry !== null) {
            const normalizedDate = toMySQLDateOnly(date);
            if (!normalizedDate) continue;
            await connection.query(
              `INSERT INTO calendarNotes (adminId, date, note, images, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE note=VALUES(note), images=VALUES(images), updatedAt=NOW()`,
              [adminId, normalizedDate, entry.note || "", JSON.stringify(entry.images || [])]
            );
          }
        }
      }
    }

    // Update workLogs
    const workLogIds = (db.workLogs || []).map((w) => w.id).filter((id) => id != null);
    if (workLogIds.length > 0) {
      await connection.query(`DELETE FROM workLogs WHERE id NOT IN (${workLogIds.map(() => "?").join(",")})`, workLogIds);
    } else {
      await connection.query("DELETE FROM workLogs");
    }
    for (const log of db.workLogs || []) {
      await connection.query(
        `INSERT INTO workLogs (id, userId, role, title, description, workDate, attachmentFilename, ticketId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           userId=VALUES(userId), role=VALUES(role), title=VALUES(title),
           description=VALUES(description), workDate=VALUES(workDate),
           attachmentFilename=VALUES(attachmentFilename), ticketId=VALUES(ticketId),
           updatedAt=VALUES(updatedAt)`,
        [
          log.id,
          log.userId,
          log.role,
          log.title,
          log.description || "",
          toMySQLDateOnly(log.workDate),
          log.attachmentFilename || null,
          log.ticketId || null,
          toMySQLDateTime(log.createdAt),
          toMySQLDateTime(log.updatedAt),
        ]
      );
    }

    // Update workFollowers
    await connection.query("DELETE FROM workFollowers");
    for (const follower of db.workFollowers || []) {
      await connection.query(
        `INSERT INTO workFollowers (id, superAdminId, adminId, createdAt)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE superAdminId=VALUES(superAdminId), adminId=VALUES(adminId)`,
        [follower.id, follower.superAdminId, follower.adminId, toMySQLDateTime(follower.createdAt)]
      );
    }

    // Update sequences
    if (typeof db.lastTicketId === "number") {
      await connection.query(`UPDATE sequences SET value=?, updatedAt=NOW() WHERE name='lastTicketId'`, [db.lastTicketId]);
    }
    if (typeof db.lastAlertId === "number") {
      await connection.query(`UPDATE sequences SET value=?, updatedAt=NOW() WHERE name='lastAlertId'`, [db.lastAlertId]);
    }
    if (typeof db.lastTeamAlertId === "number") {
      await connection.query(`UPDATE sequences SET value=?, updatedAt=NOW() WHERE name='lastTeamAlertId'`, [db.lastTeamAlertId]);
    }
    if (typeof db.lastPermissionRequestId === "number") {
      await connection.query(`UPDATE sequences SET value=?, updatedAt=NOW() WHERE name='lastPermissionRequestId'`, [db.lastPermissionRequestId]);
    }
    if (typeof db.lastMeetingNoteId === "number") {
      await connection.query(`UPDATE sequences SET value=?, updatedAt=NOW() WHERE name='lastMeetingNoteId'`, [db.lastMeetingNoteId]);
    }

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Close the database connection pool (for graceful shutdown).
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getDb,
  updateDb,
  initializeDatabase,
  closePool,
  getPool, // Expose pool for direct queries if needed
};
