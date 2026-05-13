const DEFAULT_API_URL = "https://web-production-b0b5b.up.railway.app";

function normalizeApiUrl(url) {
  return url.trim().replace(/\/+$/, "");
}

export async function getApiUrl() {
  return normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL);
}

function readApiError(data, fallback) {
  if (data?.errors?.length) return data.errors.join("\n");
  return data?.message || fallback;
}

async function readResponseData(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

export async function api(path, token, options = {}) {
  const apiUrl = await getApiUrl();
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await readResponseData(response);
  if (!response.ok) throw new Error(readApiError(data, "Erro na API"));
  return data;
}

export async function uploadPhoto(submissionId, questionId, uri, token, location) {
  const apiUrl = await getApiUrl();
  const form = new FormData();
  form.append("question_id", questionId);
  if (location?.coords) {
    form.append("latitude", String(location.coords.latitude));
    form.append("longitude", String(location.coords.longitude));
  }
  form.append("files", { uri, name: `foto-${Date.now()}.jpg`, type: "image/jpeg" });
  const response = await fetch(`${apiUrl}/submissions/${submissionId}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const data = await readResponseData(response);
  if (!response.ok) throw new Error(readApiError(data, "Falha ao enviar foto"));
  return data;
}

export async function uploadSignature(submissionId, answerId, imageBase64, token) {
  const apiUrl = await getApiUrl();
  const response = await fetch(`${apiUrl}/submissions/${submissionId}/signatures`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      answer_id: answerId,
      signer_name: "Assinatura no telefone",
      signer_role: "Responsavel",
      image_base64: imageBase64
    })
  });
  const data = await readResponseData(response);
  if (!response.ok) throw new Error(readApiError(data, "Falha ao salvar assinatura"));
  return data;
}
