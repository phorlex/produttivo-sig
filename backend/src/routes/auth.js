const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
const { query } = require("../db/pool");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query(
    `SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id
     WHERE lower(u.email)=lower($1) AND u.active = TRUE`,
    [email]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "Credenciais invalidas" });
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "12h" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, store: user.store } });
});

router.get("/me", authenticate, (req, res) => res.json(req.user));

module.exports = router;
