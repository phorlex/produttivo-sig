"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Camera, CheckCircle2, Copy, Eye, FileText, ListChecks, Pencil, Plus, Save, ScrollText, SlidersHorizontal, Trash2, X } from "lucide-react";
import shared from "@sig-checklist/shared";
import { Shell } from "../../components/Shell";
import { api } from "../../lib/api";

const { RESPONSE_TYPES, RESPONSE_OPTION_PRESETS } = shared;

const blankQuestion = {
  title: "Nova pergunta",
  description: "",
  response_type: "selecao_unica",
  required: false,
  requires_photo: false,
  min_photos: 0,
  max_photos: "",
  allows_observation: true,
  observation_required: false,
  options: [],
  condition: {},
  config: {}
};

const blankTemplate = {
  name: "Novo checklist",
  description: "",
  active: true,
  categories: [{ title: "Primeira categoria", description: "", questions: [{ ...blankQuestion }] }]
};

const quickTypes = [
  { label: "Conformidade", value: "conformidade" },
  { label: "Sim / Nao", value: "sim_nao" },
  { label: "Texto", value: "texto_longo" },
  { label: "Foto", value: "foto" },
  { label: "Assinatura", value: "assinatura" }
];

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(blankTemplate);
  const [viewMode, setViewMode] = useState("edit");
  const [questionModal, setQuestionModal] = useState(null);
  const load = () => api("/checklists").then(setTemplates);

  useEffect(() => {
    load().catch(() => (location.href = "/login"));
  }, []);

  const summary = useMemo(() => {
    const categories = template.categories || [];
    const questions = categories.flatMap((category) => category.questions || []);
    return {
      categories: categories.length,
      questions: questions.length,
      required: questions.filter((question) => question.required).length,
      photos: questions.filter((question) => question.requires_photo || question.response_type === "foto" || question.response_type === "multiplas_fotos").length
    };
  }, [template]);

  async function openTemplate(id) {
    setTemplate(await api(`/checklists/${id}`));
    setViewMode("edit");
  }

  async function save() {
    const saved = await api(template.id ? `/checklists/${template.id}` : "/checklists", {
      method: template.id ? "PUT" : "POST",
      body: JSON.stringify(template)
    });
    setTemplate(saved);
    load();
  }

  const updateCategory = (index, patch) => {
    const categories = [...template.categories];
    categories[index] = { ...categories[index], ...patch };
    setTemplate({ ...template, categories });
  };

  const updateQuestion = (categoryIndex, questionIndex, patch) => {
    const categories = [...template.categories];
    const questions = [...categories[categoryIndex].questions];
    questions[questionIndex] = { ...questions[questionIndex], ...patch };
    categories[categoryIndex] = { ...categories[categoryIndex], questions };
    setTemplate({ ...template, categories });
  };

  const saveQuestionFromModal = (question) => {
    const categories = [...template.categories];
    const questions = [...(categories[questionModal.categoryIndex].questions || [])];
    if (questionModal.questionIndex === null) {
      questions.push(question);
    } else {
      questions[questionModal.questionIndex] = question;
    }
    categories[questionModal.categoryIndex] = { ...categories[questionModal.categoryIndex], questions };
    setTemplate({ ...template, categories });
    setQuestionModal(null);
  };

  const moveCategory = (from, to) => {
    if (to < 0 || to >= template.categories.length) return;
    const categories = [...template.categories];
    const [item] = categories.splice(from, 1);
    categories.splice(to, 0, item);
    setTemplate({ ...template, categories });
  };

  const moveQuestion = (categoryIndex, from, to) => {
    const categories = [...template.categories];
    const questions = [...categories[categoryIndex].questions];
    if (to < 0 || to >= questions.length) return;
    const [item] = questions.splice(from, 1);
    questions.splice(to, 0, item);
    categories[categoryIndex] = { ...categories[categoryIndex], questions };
    setTemplate({ ...template, categories });
  };

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Criador de checklist</h1>
          <p className="text-sm text-zinc-600">Monte o formulario por etapas: dados, categorias, perguntas e regras.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === "form" ? "edit" : "form")} className="flex items-center gap-2 border bg-white px-3 py-2"><Eye size={16} /> {viewMode === "form" ? "Editar" : "Previa app"}</button>
          <button onClick={() => setViewMode(viewMode === "pdf" ? "edit" : "pdf")} className="flex items-center gap-2 border bg-white px-3 py-2"><ScrollText size={16} /> {viewMode === "pdf" ? "Editar" : "Previa PDF"}</button>
          <button onClick={() => setTemplate(JSON.parse(JSON.stringify(blankTemplate)))} className="flex items-center gap-2 border bg-white px-3 py-2"><Plus size={16} /> Novo</button>
          <button onClick={save} className="flex items-center gap-2 bg-sig-yellow px-3 py-2 text-sig-black"><Save size={16} /> Salvar</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 font-bold">Modelos salvos</h2>
            <div className="space-y-2">
              {templates.map((item) => (
                <button key={item.id} onClick={() => openTemplate(item.id)} className="w-full rounded-md border p-3 text-left hover:border-sig-yellow hover:bg-yellow-50">
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="text-xs text-zinc-500">{item.active ? "Ativo" : "Inativo"}</span>
                </button>
              ))}
              {!templates.length && <p className="text-sm text-zinc-500">Nenhum modelo criado ainda.</p>}
            </div>
          </div>

          <div className="rounded-lg border bg-sig-black p-4 text-white">
            <p className="text-sm text-zinc-300">Resumo do modelo atual</p>
            <strong className="mt-1 block text-lg text-sig-yellow">{template.name}</strong>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Metric label="Categorias" value={summary.categories} />
              <Metric label="Perguntas" value={summary.questions} />
              <Metric label="Obrigatorias" value={summary.required} />
              <Metric label="Com foto" value={summary.photos} />
            </div>
          </div>
        </aside>

        {viewMode === "form" ? (
          <Preview template={template} />
        ) : viewMode === "pdf" ? (
          <PdfPreview template={template} />
        ) : (
          <section className="space-y-4">
            <TemplateBasics template={template} setTemplate={setTemplate} />

            {(template.categories || []).map((category, categoryIndex) => (
              <div
                key={categoryIndex}
                className="rounded-lg border bg-white"
              >
                <div className="flex flex-wrap items-center gap-3 border-b p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sig-black font-bold text-sig-yellow">{categoryIndex + 1}</div>
                  <div className="min-w-0 flex-1">
                    <label className="text-xs font-bold uppercase text-zinc-500">Nome da categoria</label>
                    <input value={category.title} onChange={(event) => updateCategory(categoryIndex, { title: event.target.value })} />
                  </div>
                  <button title="Subir categoria" onClick={() => moveCategory(categoryIndex, categoryIndex - 1)} className="border p-2"><ArrowUp size={16} /></button>
                  <button title="Descer categoria" onClick={() => moveCategory(categoryIndex, categoryIndex + 1)} className="border p-2"><ArrowDown size={16} /></button>
                  <button title="Duplicar categoria" onClick={() => setTemplate({ ...template, categories: [...template.categories, JSON.parse(JSON.stringify(category))] })} className="border p-2"><Copy size={16} /></button>
                  <button title="Excluir categoria" onClick={() => setTemplate({ ...template, categories: template.categories.filter((_, index) => index !== categoryIndex) })} className="border p-2 text-red-700"><Trash2 size={16} /></button>
                </div>

                <div className="p-4">
                  <label className="block text-sm font-semibold">Descricao da categoria</label>
                  <textarea placeholder="Exemplo: itens conferidos antes da entrega" value={category.description || ""} onChange={(event) => updateCategory(categoryIndex, { description: event.target.value })} />

                  <div className="mt-4 space-y-3">
                    {(category.questions || []).map((question, questionIndex) => (
                      <div key={questionIndex}>
                        <QuestionRow
                          index={questionIndex}
                          question={question}
                          onEdit={() => setQuestionModal({ categoryIndex, questionIndex, question: JSON.parse(JSON.stringify(question)) })}
                          onMoveUp={() => moveQuestion(categoryIndex, questionIndex, questionIndex - 1)}
                          onMoveDown={() => moveQuestion(categoryIndex, questionIndex, questionIndex + 1)}
                          onDuplicate={() => updateCategory(categoryIndex, { questions: [...category.questions.slice(0, questionIndex + 1), JSON.parse(JSON.stringify({ ...question, title: `${question.title} - copia` })), ...category.questions.slice(questionIndex + 1)] })}
                          onDelete={() => updateCategory(categoryIndex, { questions: category.questions.filter((_, index) => index !== questionIndex) })}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setQuestionModal({ categoryIndex, questionIndex: null, question: JSON.parse(JSON.stringify(blankQuestion)) })} className="flex items-center gap-2 bg-sig-black px-3 py-2 text-white"><Plus size={16} /> Adicionar pergunta</button>
                    {quickTypes.map((type) => (
                      <button key={type.value} onClick={() => setQuestionModal({ categoryIndex, questionIndex: null, question: { ...JSON.parse(JSON.stringify(blankQuestion)), response_type: type.value, title: `Pergunta de ${type.label}` } })} className="border bg-white px-3 py-2">
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => setTemplate({ ...template, categories: [...template.categories, { title: "Nova categoria", description: "", questions: [] }] })} className="flex items-center gap-2 bg-white px-4 py-2 ring-1 ring-zinc-300">
              <Plus size={16} /> Adicionar nova categoria
            </button>
          </section>
        )}
      </div>

      {questionModal && (
        <QuestionModal
          initialQuestion={questionModal.question}
          onClose={() => setQuestionModal(null)}
          onSave={saveQuestionFromModal}
        />
      )}
    </Shell>
  );
}

function TemplateBasics({ template, setTemplate }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <FileText size={18} />
        <h2 className="font-bold">Dados do checklist</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="md:col-span-2">
          <span className="text-sm font-semibold">Nome que o operador vai ver</span>
          <input value={template.name} onChange={(event) => setTemplate({ ...template, name: event.target.value })} />
        </label>
        <label>
          <span className="text-sm font-semibold">Status</span>
          <select value={template.active ? "1" : "0"} onChange={(event) => setTemplate({ ...template, active: event.target.value === "1" })}>
            <option value="1">Ativo para uso</option>
            <option value="0">Inativo</option>
          </select>
        </label>
        <label className="md:col-span-3">
          <span className="text-sm font-semibold">Descricao interna</span>
          <textarea placeholder="Explique quando este checklist deve ser usado" value={template.description || ""} onChange={(event) => setTemplate({ ...template, description: event.target.value })} />
        </label>
      </div>
    </div>
  );
}

function QuestionRow({ index, question, onEdit, onDelete, onDuplicate, onMoveUp, onMoveDown }) {
  const typeLabel = RESPONSE_TYPES.find((type) => type.value === question.response_type)?.label || question.response_type;
  const badges = [
    question.required && "Obrigatoria",
    (question.requires_photo || question.response_type === "foto" || question.response_type === "multiplas_fotos") && "Foto",
    question.observation_required && "Obs. obrigatoria"
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-zinc-50 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold ring-1 ring-zinc-200">{index + 1}</div>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <strong className="block truncate">{question.title}</strong>
        <span className="text-xs text-zinc-500">{typeLabel}</span>
      </button>
      <div className="flex flex-wrap gap-1">
        {badges.map((badge) => <span key={badge} className="rounded-full bg-white px-2 py-1 text-xs text-zinc-600 ring-1 ring-zinc-200">{badge}</span>)}
      </div>
      <button title="Subir pergunta" onClick={onMoveUp} className="border bg-white p-2"><ArrowUp size={16} /></button>
      <button title="Descer pergunta" onClick={onMoveDown} className="border bg-white p-2"><ArrowDown size={16} /></button>
      <button title="Editar pergunta" onClick={onEdit} className="border bg-white p-2"><Pencil size={16} /></button>
      <button title="Duplicar pergunta" onClick={onDuplicate} className="border bg-white p-2"><Copy size={16} /></button>
      <button title="Excluir pergunta" onClick={onDelete} className="border bg-white p-2 text-red-700"><Trash2 size={16} /></button>
    </div>
  );
}

function QuestionModal({ initialQuestion, onClose, onSave }) {
  const [question, setQuestion] = useState(initialQuestion);
  const typeLabel = RESPONSE_TYPES.find((type) => type.value === question.response_type)?.label || question.response_type;

  function updateOption(optionIndex, patch) {
    const options = [...(question.options || [])];
    options[optionIndex] = { ...options[optionIndex], ...patch };
    setQuestion({ ...question, options });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-sig-black p-4 text-white">
          <div>
            <h2 className="font-bold text-sig-yellow">Configurar pergunta</h2>
            <p className="text-sm text-zinc-300">{typeLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white hover:bg-white/10"><X size={18} /></button>
        </div>

        <div className="max-h-[calc(90vh-132px)] overflow-y-auto p-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="rounded-md border bg-zinc-50 p-3">
                <div className="grid gap-3">
                  <label>
                    <span className="text-sm font-semibold">Pergunta</span>
                    <input className="font-semibold" value={question.title} onChange={(event) => setQuestion({ ...question, title: event.target.value })} />
                  </label>
                  <label>
                    <span className="text-sm font-semibold">Tipo de resposta</span>
                    <select value={question.response_type} onChange={(event) => setQuestion({ ...question, response_type: event.target.value })}>
                      {RESPONSE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-semibold">Texto de apoio para o operador</span>
                    <textarea placeholder="Opcional: detalhe o que deve ser conferido" value={question.description || ""} onChange={(event) => setQuestion({ ...question, description: event.target.value })} />
                  </label>
                </div>
              </div>

              <OptionsEditor question={question} updateOption={updateOption} onChange={(patch) => setQuestion({ ...question, ...patch })} />
            </div>

            <div className="space-y-3">
              <RuleGroup icon={<CheckCircle2 size={16} />} title="Obrigatoriedade">
                <Switch label="Resposta obrigatoria" checked={question.required} onChange={(value) => setQuestion({ ...question, required: value })} />
              </RuleGroup>

              <RuleGroup icon={<Camera size={16} />} title="Fotos">
                <p className="rounded-md bg-yellow-50 p-2 text-xs text-zinc-700">Regra fixa: respostas Nao e Nao conforme sempre exigem foto de justificativa.</p>
                <Switch label="Exigir foto" checked={question.requires_photo} onChange={(value) => setQuestion({ ...question, requires_photo: value })} />
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="text-xs font-semibold">Min</span><input type="number" min="0" value={question.min_photos || 0} onChange={(event) => setQuestion({ ...question, min_photos: Number(event.target.value) })} /></label>
                  <label><span className="text-xs font-semibold">Max</span><input type="number" min="0" value={question.max_photos || ""} onChange={(event) => setQuestion({ ...question, max_photos: event.target.value })} /></label>
                </div>
              </RuleGroup>

              <RuleGroup icon={<SlidersHorizontal size={16} />} title="Observacao">
                <Switch label="Permitir observacao" checked={question.allows_observation} onChange={(value) => setQuestion({ ...question, allows_observation: value })} />
                <Switch label="Observacao obrigatoria" checked={question.observation_required} onChange={(value) => setQuestion({ ...question, observation_required: value })} />
              </RuleGroup>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t p-4">
          <button onClick={onClose} className="border px-4 py-2">Cancelar</button>
          <button onClick={() => onSave(question)} className="bg-sig-yellow px-4 py-2 text-sig-black">Salvar pergunta</button>
        </div>
      </div>
    </div>
  );
}

function sameOptions(left = [], right = []) {
  if (left.length !== right.length) return false;
  return left.every((option, index) => option.label === right[index]?.label && option.value === right[index]?.value);
}

function OptionsEditor({ question, updateOption, onChange }) {
  const options = question.options || [];
  const selectedPreset = RESPONSE_OPTION_PRESETS.find((preset) => sameOptions(options, preset.options))?.value || (options.length ? "personalizado" : "");

  function applyPreset(value) {
    if (!value) {
      onChange({ options: [], config: { ...(question.config || {}), response_option_preset: "" } });
      return;
    }
    const preset = RESPONSE_OPTION_PRESETS.find((item) => item.value === value);
    if (!preset) return;
    onChange({
      options: preset.options.map((option) => ({ ...option })),
      config: { ...(question.config || {}), response_option_preset: preset.value }
    });
  }

  return (
    <div className="rounded-md border bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks size={16} />
          <h3 className="font-bold">Opcoes de resposta</h3>
        </div>
        <button onClick={() => onChange({ options: [...options, { label: "Nova opcao", value: "nova_opcao" }] })} className="border px-3 py-2">Adicionar</button>
      </div>
      <label className="mb-3 block">
        <span className="text-sm font-semibold">Respostas predefinidas</span>
        <select value={selectedPreset} onChange={(event) => applyPreset(event.target.value)}>
          <option value="">Nenhuma</option>
          {RESPONSE_OPTION_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
          {selectedPreset === "personalizado" && <option value="personalizado">Personalizado</option>}
        </select>
      </label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_40px]">
            <input placeholder="Rotulo" value={option.label || ""} onChange={(event) => updateOption(index, { label: event.target.value })} />
            <input placeholder="Valor interno" value={option.value || ""} onChange={(event) => updateOption(index, { value: event.target.value })} />
            <button onClick={() => onChange({ options: options.filter((_, optionIndex) => optionIndex !== index) })} className="border text-red-700"><Trash2 size={15} className="mx-auto" /></button>
          </div>
        ))}
        {!options.length && <p className="text-sm text-zinc-500">Este tipo pode ser respondido sem opcoes predefinidas.</p>}
      </div>
    </div>
  );
}

function RuleGroup({ icon, title, children }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="mb-2 flex items-center gap-2 font-bold">{icon}{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Switch({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
      <span>{label}</span>
      <input className="w-auto" type="checkbox" checked={!!checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md bg-white/10 p-2">
      <span className="block text-xs text-zinc-300">{label}</span>
      <strong className="text-lg">{value}</strong>
    </div>
  );
}

function Preview({ template }) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <div className="mb-5 border-b pb-4">
        <h2 className="text-xl font-bold">{template.name}</h2>
        <p className="text-sm text-zinc-600">{template.description || "Sem descricao"}</p>
      </div>
      {template.categories.map((category, index) => (
        <div key={index} className="mb-6">
          <h3 className="border-b pb-2 font-bold">{index + 1}. {category.title}</h3>
          {category.questions.map((question, qIndex) => (
            <div key={qIndex} className="grid gap-2 border-b py-3 md:grid-cols-[1fr_180px_140px]">
              <strong>{qIndex + 1}. {question.title}</strong>
              <span className="text-sm text-zinc-600">{RESPONSE_TYPES.find((type) => type.value === question.response_type)?.label || question.response_type}</span>
              <span className="text-sm">{question.required ? "Obrigatoria" : "Opcional"}</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function PdfPreview({ template }) {
  const categories = template.categories || [];
  const questions = categories.flatMap((category) => category.questions || []);

  return (
    <section className="rounded-lg border bg-zinc-200 p-4">
      <div className="mx-auto min-h-[900px] max-w-4xl bg-white shadow-lg">
        <div className="flex items-center justify-between bg-sig-black px-8 py-6 text-white">
          <div>
            <div className="text-3xl font-black text-sig-yellow">SIG</div>
            <p className="text-sm text-zinc-300">Multimarcas</p>
          </div>
          <div className="text-right">
            <strong className="block text-lg">SIG Checklist Operacional</strong>
            <span className="text-sm text-zinc-300">Previa do relatorio PDF</span>
          </div>
        </div>

        <div className="space-y-6 p-8">
          <div className="border-b pb-5">
            <h2 className="text-2xl font-bold">{template.name}</h2>
            <p className="mt-1 text-sm text-zinc-600">{template.description || "Sem descricao cadastrada."}</p>
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-3">
            <PdfInfo label="Relatorio" value="SIG-000000" />
            <PdfInfo label="Inicio" value="__/__/____ __:__" />
            <PdfInfo label="Finalizacao" value="__/__/____ __:__" />
            <PdfInfo label="Empresa" value="Sig Multimarcas" />
            <PdfInfo label="CNPJ" value="Configurar" />
            <PdfInfo label="Responsavel" value="Usuario operador" />
            <PdfInfo label="Veiculo" value="Placa / marca / modelo" />
            <PdfInfo label="Loja" value="Loja vinculada" />
            <PdfInfo label="Total de perguntas" value={questions.length} />
          </div>

          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="break-inside-avoid border-t pt-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">{categoryIndex + 1}. {category.title}</h3>
                  {category.description && <p className="text-sm text-zinc-600">{category.description}</p>}
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">{(category.questions || []).length} perguntas</span>
              </div>

              <div className="overflow-hidden rounded-md border">
                <div className="grid grid-cols-[1.5fr_180px_1fr] bg-zinc-100 px-3 py-2 text-xs font-bold uppercase text-zinc-600">
                  <span>Pergunta</span>
                  <span>Tipo</span>
                  <span>Resposta no PDF</span>
                </div>
                {(category.questions || []).map((question, questionIndex) => (
                  <div key={questionIndex} className="grid grid-cols-[1.5fr_180px_1fr] gap-3 border-t px-3 py-3 text-sm">
                    <div>
                      <strong>{questionIndex + 1}. {question.title}</strong>
                      {question.description && <p className="mt-1 text-xs text-zinc-500">{question.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {question.required && <PdfTag>Obrigatoria</PdfTag>}
                        {question.requires_photo && <PdfTag>Foto obrigatoria</PdfTag>}
                        {question.observation_required && <PdfTag>Obs. obrigatoria</PdfTag>}
                      </div>
                    </div>
                    <span className="text-zinc-600">{RESPONSE_TYPES.find((type) => type.value === question.response_type)?.label || question.response_type}</span>
                    <div className="space-y-2">
                      <div className="rounded border border-dashed border-zinc-300 px-3 py-2 text-zinc-400">Resposta preenchida</div>
                      {(question.requires_photo || question.response_type === "foto" || question.response_type === "multiplas_fotos") && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="aspect-square rounded border border-dashed border-zinc-300 bg-zinc-50" />
                          <div className="aspect-square rounded border border-dashed border-zinc-300 bg-zinc-50" />
                          <div className="aspect-square rounded border border-dashed border-zinc-300 bg-zinc-50" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t pt-5 text-center text-xs text-zinc-500">
            Sig Multimarcas - Relatorio gerado pelo SIG Checklist Operacional
          </div>
        </div>
      </div>
    </section>
  );
}

function PdfInfo({ label, value }) {
  return (
    <div className="rounded-md border bg-zinc-50 p-3">
      <span className="block text-xs font-bold uppercase text-zinc-500">{label}</span>
      <strong className="mt-1 block text-zinc-900">{value}</strong>
    </div>
  );
}

function PdfTag({ children }) {
  return <span className="rounded-full bg-yellow-50 px-2 py-1 text-xs text-zinc-700 ring-1 ring-yellow-200">{children}</span>;
}
