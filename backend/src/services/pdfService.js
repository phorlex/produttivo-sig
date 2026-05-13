const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { randomUUID } = require("crypto");
const { query } = require("../db/pool");
const { getSubmission } = require("./checklistService");

function formatValue(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return Array.isArray(value) ? value.join(", ") : JSON.stringify(value);
  return String(value);
}

async function generatePdf(submissionId, userId) {
  const submission = await getSubmission(submissionId);
  if (!submission) throw new Error("Checklist preenchido nao encontrado");
  const reportsDir = path.join(__dirname, "../../uploads/reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const fileName = `${submission.report_number}.pdf`;
  const filePath = path.join(reportsDir, fileName);
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.rect(0, 0, 595, 74).fill("#111111");
  doc.fillColor("#f6c600").fontSize(20).text("SIG MULTIMARCAS", 36, 24);
  doc.fillColor("#ffffff").fontSize(10).text("SIG Checklist Operacional", 380, 30);
  doc.moveDown(3);
  doc.fillColor("#111111").fontSize(18).text(submission.template.name);
  doc.fontSize(10).text(`Relatorio: ${submission.report_number}`);
  doc.text(`Empresa: Sig Multimarcas | CNPJ: configurar no painel`);
  doc.text(`Inicio: ${new Date(submission.started_at).toLocaleString("pt-BR")}`);
  doc.text(`Finalizacao: ${submission.finished_at ? new Date(submission.finished_at).toLocaleString("pt-BR") : "-"}`);
  doc.text(`Responsavel: ${submission.user_name} | Loja: ${submission.store || submission.vehicle_store || "-"}`);
  if (submission.plate) {
    doc.text(`Veiculo: ${submission.plate} - ${submission.brand || ""} ${submission.model || ""} ${submission.version || ""} ${submission.year || ""}`);
  }
  doc.moveDown();

  for (const category of submission.template.categories) {
    doc.fillColor("#111111").fontSize(14).text(category.title, { underline: true });
    if (category.description) doc.fontSize(9).text(category.description);
    doc.moveDown(0.4);
    for (const question of category.questions) {
      const answer = submission.answers.find((item) => item.question_id === question.id);
      const attachments = submission.attachments.filter((item) => item.question_id === question.id);
      doc.fillColor("#111111").fontSize(10).text(question.title, { continued: false });
      if (question.description) doc.fillColor("#555555").fontSize(8).text(question.description);
      if (question.response_type !== "informativo") {
        doc.fillColor("#222222").fontSize(9).text(`Resposta: ${formatValue(answer?.value)}`);
      }
      if (answer?.observation) doc.text(`Observacao: ${answer.observation}`);
      if (attachments.length) {
        doc.text("Fotos/anexos:");
        for (const attachment of attachments) {
          const localPath = path.join(__dirname, "../../", attachment.file_path);
          if (fs.existsSync(localPath) && attachment.mime_type.startsWith("image/")) {
            try {
              doc.image(localPath, { fit: [150, 110] });
            } catch {
              doc.text(`- ${attachment.file_name}`);
            }
          } else {
            doc.text(`- ${attachment.file_name}`);
          }
        }
      }
      const signatures = submission.signatures.filter((item) => item.answer_id === answer?.id);
      for (const signature of signatures) doc.text(`Assinatura: ${signature.signer_name} (${signature.signer_role || "-"})`);
      doc.moveDown(0.8);
      if (doc.y > 720) doc.addPage();
    }
  }
  doc.fontSize(8).fillColor("#555555").text("Sig Multimarcas - Relatorio gerado pelo SIG Checklist Operacional", 36, 760, { align: "center" });
  doc.end();
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  await query(
    "INSERT INTO generated_reports (id, submission_id, report_number, file_path, generated_by) VALUES ($1,$2,$3,$4,$5)",
    [randomUUID(), submissionId, submission.report_number, `uploads/reports/${fileName}`, userId]
  );
  return { filePath, fileName };
}

module.exports = { generatePdf };
