const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || "mysql://root:root@localhost:3306/sig_checklist";

const pool = mysql.createPool({
  uri: databaseUrl,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
  multipleStatements: true
});

function convertPgPlaceholders(sql, params = []) {
  const values = [];
  const converted = sql
    .replace(/::(text|uuid|timestamptz|int)/g, "")
    .replace(/\bILIKE\b/g, "LIKE")
    .replace(/\$(\d+)/g, (_match, index) => {
      values.push(params[Number(index) - 1]);
      return "?";
    });
  return { sql: converted, values };
}

async function run(target, sql, params = []) {
  const converted = convertPgPlaceholders(sql, params);
  const [rows] = await target.query(converted.sql, converted.values);
  return { rows: Array.isArray(rows) ? rows : [], rowCount: rows.affectedRows || rows.length || 0, insertId: rows.insertId };
}

async function query(sql, params = []) {
  return run(pool, sql, params);
}

async function connect() {
  const connection = await pool.getConnection();
  return {
    query: (sql, params = []) => run(connection, sql, params),
    release: () => connection.release()
  };
}

module.exports = { pool: { query, connect, end: () => pool.end() }, query };
