const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const { authenticate } = require("../middleware/auth");
const { getSubmission, validateSubmission, calculateScores } = require("../services/checklistService");
const { generatePdf } = require("../services/pdfService");

const router = express.Router();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, "../../uploads/photos")),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`)
});
const upload = multer({ storage });

router.use(authenticate);

router.get("/", async (req, res) => {
  const { status, vehicle_id, template_id, user_id, store, start, end } = req.query;
  const { rows } = await query(
    `SELECT s.*, t.name AS checklist_name, u.name AS user_name, v.plate
     FROM checklist_submissions s
     JOIN checklist_templates t ON t.id=s.template_id
     JOIN users u ON u.id=s.user_id
     LEFT JOIN vehicles v ON v.id=s.vehicle_id
     WHERE ($1 IS NULL OR s.status=$1)
       AND ($2 IS NULL OR s.vehicle_id=$2)
       AND ($3 IS NULL OR s.template_id=$3)
       AND ($4 IS NULL OR s.user_id=$4)
       AND ($5 IS NULL OR s.store=$5)
       AND ($6 IS NULL OR s.created_at >= $6)
       AND ($7 IS NULL OR s.created_at <= $7)
     ORDER BY s.updated_at DESC`,
    [status || null, vehicle_id || null, template_id || null, user_id || null, store || null, start || null, end || null]
  );
  res.json(rows);
});

router.get("/dashboard", async (_req, res) => {
  const [totals, byUser, byVehicle] = await Promise.all([
    query(`SELECT status, COUNT(*) AS total FROM checklist_submissions GROUP BY status`),
    query(`SELECT u.name, COUNT(*) AS total FROM checklist_submissions s JOIN users u ON u.id=s.user_id GROUP BY u.name ORDER BY total DESC`),
    query(`SELECT COALESCE(v.plate,'Sem veiculo') AS plate, COUNT(*) AS total FROM checklist_submissions s LEFT JOIN vehicles v ON v.id=s.vehicle_id GROUP BY v.plate ORDER BY total DESC LIMIT 20`)
  ]);
  res.json({ totals: totals.rows, byUser: byUser.rows, byVehicle: byVehicle.rows });
});

router.post("/", async (req, res) => {
  const reportNumber = `SIG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
  const id = randomUUID();
  await query(
    `INSERT INTO checklist_submissions (id, report_number, template_id, vehicle_id, user_id, store, status, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,'draft',$7)`,
    [id, reportNumber, req.body.template_id, req.body.vehicle_id || null, req.user.id, req.body.store || req.user.store, JSON.stringify({})]
  );
  const { rows } = await query("SELECT * FROM checklist_submissions WHERE id=$1", [id]);
  res.status(201).json(rows[0]);
});

router.get("/:id", async (req, res) => {
  const submission = await getSubmission(req.params.id);
  if (!submission) return res.status(404).json({ message: "Checklist preenchido nao encontrado" });
  res.json(submission);
});

router.put("/:id/answers", async (req, res) => {
  const answers = req.body.answers || [];
  for (const answer of answers) {
    await query(
      `INSERT INTO checklist_answers (id, submission_id, question_id, value, observation)
       VALUES ($1,$2,$3,$4,$5)
       ON DUPLICATE KEY UPDATE value=VALUES(value), observation=VALUES(observation), updated_at=NOW()`,
      [randomUUID(), req.params.id, answer.question_id, JSON.stringify(answer.value ?? null), answer.observation || null]
    );
  }
  await query("UPDATE checklist_submissions SET status=$1, updated_at=NOW() WHERE id=$2", [req.body.status || "draft", req.params.id]);
  res.json(await getSubmission(req.params.id));
});

router.post("/:id/attachments", upload.array("files"), async (req, res) => {
  const saved = [];
  for (const file of req.files || []) {
    const id = randomUUID();
    await query(
      `INSERT INTO attachments (id, submission_id, answer_id, question_id, kind, file_name, file_path, mime_type, size, latitude, longitude, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        req.params.id,
        req.body.answer_id || null,
        req.body.question_id || null,
        req.body.kind || "photo",
        file.originalname,
        `uploads/photos/${file.filename}`,
        file.mimetype,
        file.size,
        req.body.latitude || null,
        req.body.longitude || null,
        req.user.id
      ]
    );
    const { rows } = await query("SELECT * FROM attachments WHERE id=$1", [id]);
    saved.push(rows[0]);
  }
  res.status(201).json(saved);
});

router.post("/:id/signatures", async (req, res) => {
  const { answer_id, signer_name, signer_role, image_base64 } = req.body;
  if (!signer_name || !image_base64) return res.status(400).json({ message: "Assinatura invalida" });
  const base64 = image_base64.replace(/^data:image\/png;base64,/, "");
  const fileName = `signature-${Date.now()}.png`;
  const filePath = path.join(__dirname, "../../uploads/photos", fileName);
  fs.writeFileSync(filePath, base64, "base64");
  const id = randomUUID();
  await query(
    `INSERT INTO signatures (id, submission_id, answer_id, signer_name, signer_role, image_path)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, req.params.id, answer_id || null, signer_name, signer_role || null, `uploads/photos/${fileName}`]
  );
  const { rows } = await query("SELECT * FROM signatures WHERE id=$1", [id]);
  res.status(201).json(rows[0]);
});

router.post("/:id/finalize", async (req, res) => {
  const errors = await validateSubmission(req.params.id);
  if (errors.length) return res.status(422).json({ message: "Checklist incompleto", errors });
  await calculateScores(req.params.id);
  await query("UPDATE checklist_submissions SET status='finished', finished_at=NOW(), updated_at=NOW() WHERE id=$1", [req.params.id]);
  res.json(await getSubmission(req.params.id));
});

router.post("/:id/pdf", async (req, res) => {
  const pdf = await generatePdf(req.params.id, req.user.id);
  res.download(pdf.filePath, pdf.fileName);
});

module.exports = router;
