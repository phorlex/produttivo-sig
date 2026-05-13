const jwt = require("jsonwebtoken");
const { query } = require("../db/pool");

async function authenticate(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Token ausente" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.store, r.name AS role, r.permissions
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.active = TRUE`,
      [payload.sub]
    );
    if (!rows[0]) return res.status(401).json({ message: "Usuario invalido" });
    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalido" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.length || roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: "Permissao insuficiente" });
  };
}

module.exports = { authenticate, authorize };
