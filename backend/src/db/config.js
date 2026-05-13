const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const LOCAL_DATABASE_URL = "mysql://root:root@localhost:3306/sig_checklist";
const RAILWAY_DB_VARIABLES = ["DATABASE_URL", "MYSQL_URL", "MYSQLHOST", "MYSQLUSER", "MYSQLPASSWORD", "MYSQLDATABASE", "MYSQLPORT"];

function isRailwayEnvironment() {
  return Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);
}

function isLocalDatabaseUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch (_error) {
    return false;
  }
}

function buildMysqlUrlFromParts() {
  const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = process.env;

  if (!MYSQLHOST || !MYSQLUSER || !MYSQLPASSWORD || !MYSQLDATABASE) {
    return null;
  }

  const user = encodeURIComponent(MYSQLUSER);
  const password = encodeURIComponent(MYSQLPASSWORD);
  const database = encodeURIComponent(MYSQLDATABASE);
  const port = MYSQLPORT || 3306;

  return `mysql://${user}:${password}@${MYSQLHOST}:${port}/${database}`;
}

function missingRailwayDatabaseError() {
  return new Error(
    `Railway database variables were not found. Add MYSQL_URL from the MySQL service, or set ${RAILWAY_DB_VARIABLES.join(", ")} on the backend service.`
  );
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  const mysqlUrl = process.env.MYSQL_URL;
  const mysqlUrlFromParts = buildMysqlUrlFromParts();

  if (isRailwayEnvironment() && isLocalDatabaseUrl(databaseUrl)) {
    if (mysqlUrl || mysqlUrlFromParts) {
      return mysqlUrl || mysqlUrlFromParts;
    }
    throw missingRailwayDatabaseError();
  }

  if (isRailwayEnvironment()) {
    const railwayUrl = databaseUrl || mysqlUrl || mysqlUrlFromParts;
    if (!railwayUrl || isLocalDatabaseUrl(railwayUrl)) {
      throw missingRailwayDatabaseError();
    }
    return railwayUrl;
  }

  return databaseUrl || mysqlUrl || mysqlUrlFromParts || LOCAL_DATABASE_URL;
}

module.exports = { getDatabaseUrl };
