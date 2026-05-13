"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, Pencil, Save } from "lucide-react";
import shared from "@sig-checklist/shared";
import { Shell } from "../../../components/Shell";
import { API_URL, api } from "../../../lib/api";

const { RESPONSE_TYPES } = shared;

export default function SubmissionPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState(searchParams.get("mode") || "view");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const readOnly = mode === "view";

  useEffect(() => {
    api(`/submissions/${id}`)
      .then((loaded) => {
        setSubmission(loaded);
        setAnswers(Object.fromEntries((loaded.answers || []).map((answer) => [answer.question_id, {
          question_id: answer.question_id,
          value: normalizeAnswerValue(answer.value),
          observation: answer.observation || ""
        }])));
      })
      .catch(() => (location.href = "/login"));
  }, [id]);

  const progress = useMemo(() => {
    const questions = submission?.template?.categories?.flatMap((category) => category.questions || []) || [];
    const fillable = questions.filter((question) => question.response_type !== "informativo");
    const answered = fillable.filter((question) => {
      if (question.response_type === "foto" || question.response_type === "multiplas_fotos") return photosFor(submission, question.id).length > 0;
      return !!answers[question.id]?.value;
    });
    return { total: fillable.length, answered: answered.length };
  }, [answers, submission]);

  function updateAnswer(questionId, patch) {
    if (readOnly) return;
    setAnswers((current) => ({
      ...current,
      [questionId]: { question_id: questionId, ...(current[questionId] || {}), ...patch }
    }));
  }

  async function save() {
    setError("");
    setMessage("");
    try {
      const saved = await api(`/submissions/${submission.id}/answers`, {
        method: "PUT",
        body: JSON.stringify({ status: submission.status || "draft", answers: Object.values(answers) })
      });
      setSubmission({ ...submission, ...saved });
      setMessage("Checklist salvo.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!submission) {
    return <Shell><p>Carregando checklist...</p></Shell>;
  }

  return (
    <Shell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600"><ArrowLeft size={16} /> Voltar</Link>
          <h1 className="text-2xl font-bold">{submission.template.name}</h1>
          <p className="text-sm text-zinc-600">{submission.report_number} - {submission.plate || "Sem veiculo"} - {statusLabel(submission.status)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode(readOnly ? "edit" : "view")} className="flex items-center gap-2 border bg-white px-3 py-2">
            {readOnly ? <Pencil size={16} /> : <Eye size={16} />}
            {readOnly ? "Editar" : "Visualizar"}
          </button>
          {!readOnly && <button onClick={save} className="flex items-center gap-2 bg-sig-yellow px-3 py-2 text-sig-black"><Save size={16} /> Salvar</button>}
        </div>
      </div>

      {!!message && <p className="mb-4 rounded-md bg-green-100 p-3 text-sm font-semibold text-green-800">{message}</p>}
      {!!error && <p className="mb-4 whitespace-pre-wrap rounded-md bg-red-100 p-3 text-sm font-semibold text-red-800">{error}</p>}

      <section className="mb-5 rounded-lg border bg-sig-black p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-300">Progresso</p>
            <strong className="text-lg text-sig-yellow">{progress.answered} de {progress.total} perguntas respondidas</strong>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{readOnly ? "Visualizacao" : "Edicao"}</span>
        </div>
      </section>

      <section className="space-y-5">
        {submission.template.categories.map((category, categoryIndex) => (
          <div key={category.id} className="rounded-lg border bg-white p-4">
            <div className="mb-4 flex items-start gap-3 border-b pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sig-black font-bold text-sig-yellow">{categoryIndex + 1}</span>
              <div>
                <h2 className="font-bold">{category.title}</h2>
                {!!category.description && <p className="text-sm text-zinc-600">{category.description}</p>}
              </div>
            </div>
            <div className="space-y-3">
              {category.questions.map((question, questionIndex) => (
                <Question
                  key={question.id}
                  question={question}
                  index={questionIndex + 1}
                  answer={answers[question.id]}
                  photos={photosFor(submission, question.id)}
                  readOnly={readOnly}
                  onChange={(patch) => updateAnswer(question.id, patch)}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </Shell>
  );
}

function Question({ question, index, answer, photos, readOnly, onChange }) {
  const options = question.options || [];
  const textLike = ["texto_curto", "texto_longo", "numero", "data", "hora", "data_hora", "upload_arquivo"].includes(question.response_type);
  const typeLabel = RESPONSE_TYPES.find((type) => type.value === question.response_type)?.label || question.response_type;
  const answered = question.response_type === "informativo" || !!answer?.value || photos.length > 0;

  return (
    <div className={`rounded-md border p-3 ${answered ? "border-green-200 bg-green-50/40" : "bg-zinc-50"}`}>
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold ring-1 ring-zinc-200">{index}</span>
        <div className="min-w-0 flex-1">
          <strong className="block">{question.title}</strong>
          <span className="text-xs text-zinc-500">{typeLabel}</span>
          {!!question.description && <p className="mt-1 text-sm text-zinc-600">{question.description}</p>}
        </div>
        {answered && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800"><CheckCircle2 size={14} /> Ok</span>}
      </div>

      {question.response_type === "informativo" ? null : textLike ? (
        <input disabled={readOnly} value={answer?.value || ""} onChange={(event) => onChange({ value: event.target.value })} placeholder="Resposta" />
      ) : options.length ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button key={option.value} disabled={readOnly} onClick={() => onChange({ value: option.value })} className={`border px-3 py-2 ${answer?.value === option.value ? "border-sig-black bg-yellow-100" : "bg-white"}`}>
              {option.label}
            </button>
          ))}
        </div>
      ) : question.response_type === "assinatura" ? (
        <p className="rounded-md border bg-white p-3 text-sm text-zinc-600">{answer?.value ? "Assinatura coletada" : "Sem assinatura"}</p>
      ) : (
        <p className="text-sm text-zinc-500">Sem respostas configuradas para esta pergunta.</p>
      )}

      {question.allows_observation && (
        <textarea disabled={readOnly} className="mt-3" placeholder="Observacao" value={answer?.observation || ""} onChange={(event) => onChange({ observation: event.target.value })} />
      )}

      {!!photos.length && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.map((photo) => <img key={photo.id} src={`${API_URL}/${photo.file_path}`} alt={photo.file_name || "Foto do checklist"} className="aspect-square rounded-md border object-cover" />)}
        </div>
      )}
    </div>
  );
}

function photosFor(submission, questionId) {
  return (submission?.attachments || []).filter((item) => item.kind === "photo" && item.question_id === questionId);
}

function normalizeAnswerValue(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function statusLabel(status) {
  return { draft: "Rascunho", pending: "Pendente", finished: "Finalizado" }[status] || status;
}
