const express = require("express");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/roles", authorize("admin", "gestor"), async (_req, res) => {
  res.json((await query("SELECT * FROM roles ORDER BY name")).rows);
});

router.get("/", authorize("admin", "gestor"), async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id,u.name,u.email,u.store,u.active,u.created_at,r.name AS role
     FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.name`
  );
  res.json(rows);
});

router.post("/", authorize("admin"), async (req, res) => {
  const role = (await query("SELECT id FROM roles WHERE name=$1", [req.body.role])).rows[0];
  if (!role) return res.status(400).json({ message: "Perfil invalido" });
  const passwordHash = await bcrypt.hash(req.body.password || "123456", 10);
  const id = randomUUID();
  await query(
    `INSERT INTO users (id,name,email,password_hash,role_id,store,active)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, req.body.name, req.body.email, passwordHash, role.id, req.body.store || null, req.body.active !== false]
  );
  const { rows } = await query("SELECT id,name,email,store,active FROM users WHERE id=$1", [id]);
  res.status(201).json(rows[0]);
});

module.exports = router;
