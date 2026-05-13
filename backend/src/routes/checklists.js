const express = require("express");
const { query } = require("../db/pool");
const { authenticate, authorize } = require("../middleware/auth");
const { getTemplate, saveTemplate } = require("../services/checklistService");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { rows } = await query("SELECT * FROM checklist_templates ORDER BY updated_at DESC");
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const template = await getTemplate(req.params.id);
  if (!template) return res.status(404).json({ message: "Modelo nao encontrado" });
  res.json(template);
});

router.post("/", authorize("admin", "gestor"), async (req, res) => {
  const template = await saveTemplate(req.body, req.user.id);
  res.status(201).json(template);
});

router.put("/:id", authorize("admin", "gestor"), async (req, res) => {
  const template = await saveTemplate({ ...req.body, id: req.params.id }, req.user.id);
  res.json(template);
});

router.delete("/:id", authorize("admin"), async (req, res) => {
  await query("DELETE FROM checklist_templates WHERE id=$1", [req.params.id]);
  res.status(204).end();
});

module.exports = router;
