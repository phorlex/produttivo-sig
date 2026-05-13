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

const ROLE_NAMES = ["admin", "operador", "consultor", "gestor"];
const SUBMISSION_STATUS = ["draft", "pending", "finished"];

module.exports = { RESPONSE_TYPES, ROLE_NAMES, SUBMISSION_STATUS };
