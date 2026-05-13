const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const LOCAL_DATABASE_URL = "mysql://root:root@localhost:3306/sig_checklist";

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

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  const mysqlUrl = process.env.MYSQL_URL;

  if (isRailwayEnvironment() && mysqlUrl && isLocalDatabaseUrl(databaseUrl)) {
    return mysqlUrl;
  }

  return databaseUrl || mysqlUrl || LOCAL_DATABASE_URL;
}

module.exports = { getDatabaseUrl };
