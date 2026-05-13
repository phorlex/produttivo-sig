const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });
const { pool } = require("./pool");

async function ensureDatabase() {
  const databaseUrl = new URL(process.env.DATABASE_URL || process.env.MYSQL_URL || "mysql://root:root@localhost:3306/sig_checklist");
  const database = databaseUrl.pathname.replace("/", "");
  const connection = await mysql.createConnection({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password)
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
}

async function migrate() {
  await ensureDatabase();
  const dir = path.join(__dirname, "../../migrations");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await pool.query(sql);
    console.log(`Migration aplicada: ${file}`);
  }
  await pool.end();
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
