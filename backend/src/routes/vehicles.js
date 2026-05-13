const express = require("express");
const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { q, store, status } = req.query;
  const { rows } = await query(
    `SELECT * FROM vehicles
     WHERE ($1 IS NULL OR plate LIKE CONCAT('%',$1,'%') OR brand LIKE CONCAT('%',$1,'%') OR model LIKE CONCAT('%',$1,'%'))
       AND ($2 IS NULL OR store=$2)
       AND ($3 IS NULL OR status=$3)
     ORDER BY updated_at DESC`,
    [q || null, store || null, status || null]
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const v = req.body;
  const id = randomUUID();
  await query(
    `INSERT INTO vehicles (id,plate,brand,model,version,year,color,mileage,store,status,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, v.plate, v.brand, v.model, v.version, v.year || null, v.color, v.mileage || null, v.store, v.status, v.notes]
  );
  const { rows } = await query("SELECT * FROM vehicles WHERE id=$1", [id]);
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const v = req.body;
  await query(
    `UPDATE vehicles SET plate=$1,brand=$2,model=$3,version=$4,year=$5,color=$6,mileage=$7,store=$8,status=$9,notes=$10,updated_at=NOW()
     WHERE id=$11`,
    [v.plate, v.brand, v.model, v.version, v.year || null, v.color, v.mileage || null, v.store, v.status, v.notes, req.params.id]
  );
  const { rows } = await query("SELECT * FROM vehicles WHERE id=$1", [req.params.id]);
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  await query("DELETE FROM vehicles WHERE id=$1", [req.params.id]);
  res.status(204).end();
});

module.exports = router;
