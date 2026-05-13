const RESPONSE_TYPES = [
  { value: "conformidade", label: "Conforme / Nao conforme / N/A" },
  { value: "sim_nao", label: "Sim / Nao" },
  { value: "texto_curto", label: "Texto curto" },
  { value: "texto_longo", label: "Texto longo" },
  { value: "numero", label: "Numero" },
  { value: "data", label: "Data" },
  { value: "hora", label: "Hora" },
  { value: "data_hora", label: "Data e hora" },
  { value: "foto", label: "Foto" },
  { value: "multiplas_fotos", label: "Multiplas fotos" },
  { value: "multipla_escolha", label: "Multipla escolha" },
  { value: "selecao_unica", label: "Selecao unica" },
  { value: "checklist_simples", label: "Checklist simples" },
  { value: "assinatura", label: "Assinatura" },
  { value: "upload_arquivo", label: "Upload de arquivo" },
  { value: "informativo", label: "Campo informativo sem resposta" }
];

const RESPONSE_OPTION_PRESETS = [
  {
    value: "conformidade",
    label: "Conforme / Nao conforme / N/A",
    options: [
      { label: "Conforme", value: "conforme" },
      { label: "Nao conforme", value: "nao_conforme" },
      { label: "N/A", value: "na" }
    ]
  },
  {
    value: "sim_nao",
    label: "Sim / Nao",
    options: [
      { label: "Sim", value: "sim" },
      { label: "Nao", value: "nao" }
    ]
  },
  {
    value: "sim_nao_na",
    label: "Sim / Nao / N/A",
    options: [
      { label: "Sim", value: "sim" },
      { label: "Nao", value: "nao" },
      { label: "N/A", value: "na" }
    ]
  },
  {
    value: "aprovacao",
    label: "Aprovado / Reprovado / N/A",
    options: [
      { label: "Aprovado", value: "aprovado" },
      { label: "Reprovado", value: "reprovado" },
      { label: "N/A", value: "na" }
    ]
  },
  {
    value: "estado",
    label: "Bom / Regular / Ruim",
    options: [
      { label: "Bom", value: "bom" },
      { label: "Regular", value: "regular" },
      { label: "Ruim", value: "ruim" }
    ]
  },
  {
    value: "prioridade",
    label: "Baixo / Medio / Alto",
    options: [
      { label: "Baixo", value: "baixo" },
      { label: "Medio", value: "medio" },
      { label: "Alto", value: "alto" }
    ]
  }
];

const ROLE_NAMES = ["admin", "operador", "consultor", "gestor"];
const SUBMISSION_STATUS = ["draft", "pending", "finished"];

module.exports = { RESPONSE_TYPES, RESPONSE_OPTION_PRESETS, ROLE_NAMES, SUBMISSION_STATUS };
