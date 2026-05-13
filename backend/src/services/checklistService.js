const { query, pool } = require("../db/pool");
const { randomUUID } = require("crypto");

async function getTemplate(id) {
  const { rows } = await query("SELECT * FROM checklist_templates WHERE id = $1", [id]);
  const template = rows[0];
  if (!template) return null;
  const categories = await query(
    "SELECT * FROM checklist_categories WHERE template_id = $1 ORDER BY sort_order, created_at",
    [id]
  );
  for (const category of categories.rows) {
    const questions = await query(
      "SELECT * FROM checklist_questions WHERE category_id = $1 ORDER BY sort_order, created_at",
      [category.id]
    );
    for (const question of questions.rows) {
      const options = await query(
        "SELECT * FROM checklist_options WHERE question_id = $1 ORDER BY sort_order",
        [question.id]
      );
      question.options = options.rows;
    }
    category.questions = questions.rows;
  }
  template.categories = categories.rows;
  return template;
}

async function saveTemplate(payload, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let templateId = payload.id;
    if (templateId) {
      await client.query(
        `UPDATE checklist_templates SET name=$1, description=$2, active=$3, scoring_enabled=$4,
         metadata=$5, updated_at=NOW() WHERE id=$6`,
        [payload.name, payload.description, payload.active, false, JSON.stringify(payload.metadata || {}), templateId]
      );
      await client.query("DELETE FROM checklist_categories WHERE template_id=$1", [templateId]);
    } else {
      templateId = randomUUID();
      await client.query(
        `INSERT INTO checklist_templates (id, name, description, active, scoring_enabled, metadata, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [templateId, payload.name, payload.description, payload.active !== false, false, JSON.stringify(payload.metadata || {}), userId]
      );
    }

    for (const [categoryIndex, category] of (payload.categories || []).entries()) {
      const categoryId = randomUUID();
      await client.query(
        `INSERT INTO checklist_categories (id, template_id, title, description, sort_order, scoring_enabled)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [categoryId, templateId, category.title, category.description, categoryIndex, false]
      );
      for (const [questionIndex, question] of (category.questions || []).entries()) {
        const questionId = randomUUID();
        await client.query(
          `INSERT INTO checklist_questions
           (id,category_id,title,description,response_type,required,requires_photo,min_photos,max_photos,
            allows_observation,observation_required,scoring_enabled,score_weight,\`condition\`,config,sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            questionId,
            categoryId,
            question.title,
            question.description,
            question.response_type,
            !!question.required,
            !!question.requires_photo,
            Number(question.min_photos || 0),
            question.max_photos || null,
            question.allows_observation !== false,
            !!question.observation_required,
            false,
            1,
            JSON.stringify(question.condition || {}),
            JSON.stringify(question.config || {}),
            questionIndex
          ]
        );
        for (const [optionIndex, option] of (question.options || []).entries()) {
          await client.query(
            `INSERT INTO checklist_options (id,question_id,label,value,score,sort_order)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [randomUUID(), questionId, option.label, option.value || option.label, null, optionIndex]
          );
        }
      }
    }
    await client.query("COMMIT");
    return getTemplate(templateId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function valueIsEmpty(value) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function normalizeAnswerText(value) {
  if (value === undefined || value === null) return "";
  const raw = typeof value === "object" ? `${value.value || ""} ${value.label || ""}` : String(value);
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function requiresPhotoJustification(answer, question) {
  const answerText = normalizeAnswerText(answer?.value);
  const option = (question.options || []).find((item) => normalizeAnswerText(item.value) === answerText);
  const optionText = normalizeAnswerText(`${option?.value || ""} ${option?.label || ""}`);
  const combined = `${answerText} ${optionText}`.trim();
  return combined === "nao" || combined.includes("nao conforme") || combined.includes("nao_conforme");
}

async function validateSubmission(submissionId) {
  const submission = await getSubmission(submissionId);
  const errors = [];
  for (const category of submission.template.categories) {
    for (const question of category.questions) {
      const answer = submission.answers.find((item) => item.question_id === question.id);
      const photos = submission.attachments.filter((item) => item.question_id === question.id && item.kind === "photo");
      if (question.response_type !== "informativo" && question.required && (!answer || valueIsEmpty(answer.value))) {
        errors.push(`${category.title}: ${question.title} e obrigatoria`);
      }
      if (question.requires_photo && photos.length < Number(question.min_photos || 1)) {
        errors.push(`${category.title}: ${question.title} exige foto`);
      }
      if (requiresPhotoJustification(answer, question) && photos.length < 1) {
        errors.push(`${category.title}: ${question.title} foi marcada como Nao/Nao conforme e exige foto de justificativa`);
      }
      if (question.observation_required && (!answer || !answer.observation)) {
        errors.push(`${category.title}: ${question.title} exige observacao`);
      }
      if (question.response_type === "assinatura" && question.required && !answer?.value && submission.signatures.every((s) => s.answer_id !== answer?.id)) {
        errors.push(`${category.title}: ${question.title} exige assinatura`);
      }
    }
  }
  return errors;
}

async function getSubmission(id) {
  const submission = (await query(
    `SELECT s.*, u.name AS user_name, v.plate, v.brand, v.model, v.version, v.year, v.color, v.mileage, v.store AS vehicle_store
     FROM checklist_submissions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN vehicles v ON v.id = s.vehicle_id
     WHERE s.id = $1`,
    [id]
  )).rows[0];
  if (!submission) return null;
  submission.template = await getTemplate(submission.template_id);
  submission.answers = (await query("SELECT * FROM checklist_answers WHERE submission_id=$1", [id])).rows;
  submission.attachments = (await query("SELECT * FROM attachments WHERE submission_id=$1 ORDER BY created_at", [id])).rows;
  submission.signatures = (await query("SELECT * FROM signatures WHERE submission_id=$1 ORDER BY signed_at", [id])).rows;
  return submission;
}

async function calculateScores(submissionId) {
  await query("UPDATE checklist_submissions SET total_score=NULL, max_score=NULL WHERE id=$1", [submissionId]);
  return null;
}

module.exports = { getTemplate, saveTemplate, validateSubmission, getSubmission, calculateScores };
