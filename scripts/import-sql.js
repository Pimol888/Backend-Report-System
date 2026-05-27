require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");
const { config } = require("../src/config/env");

function splitStatements(sql) {
  const statements = [];
  let buffer = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      buffer += ch;
      continue;
    }
    if (inBlockComment) {
      buffer += ch;
      if (ch === "*" && next === "/") {
        buffer += next;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === "-" && next === "-") {
        inLineComment = true;
        buffer += ch;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        buffer += ch;
        continue;
      }
    }

    if (!inDouble && !inBacktick && ch === "'" && sql[i - 1] !== "\\") inSingle = !inSingle;
    else if (!inSingle && !inBacktick && ch === '"' && sql[i - 1] !== "\\") inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === "`") inBacktick = !inBacktick;

    if (ch === ";" && !inSingle && !inDouble && !inBacktick) {
      const trimmed = buffer.trim();
      if (trimmed) statements.push(trimmed);
      buffer = "";
      continue;
    }
    buffer += ch;
  }

  const tail = buffer.trim();
  if (tail) statements.push(tail);
  return statements;
}

(async () => {
  const fileArg = process.argv[2] || path.join("db", `${config.db.database}.sql`);
  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);

  if (!fs.existsSync(filePath)) {
    console.error("SQL file not found:", filePath);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, "utf8");
  const statements = splitStatements(sql);

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: false,
    charset: "utf8mb4",
  });

  console.log(`Importing ${statements.length} statement(s) from ${filePath}...`);
  let executed = 0;
  try {
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        executed += 1;
      } catch (err) {
        console.error("\nFailed statement:");
        console.error(stmt.slice(0, 300) + (stmt.length > 300 ? "..." : ""));
        throw err;
      }
    }
    console.log(`Imported ${executed} statement(s) into '${config.db.database}'.`);
  } catch (err) {
    console.error("Import failed:", err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
