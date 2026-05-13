const DEFAULT_API_URL = "https://web-production-b0b5b.up.railway.app";

function normalizeApiUrl(url) {
  return url.trim().replace(/\/+$/, "");
}

export async function getApiUrl() {
  return normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL);
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
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.errors?.join("\n") || data?.message || "Erro na API");
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
  if (!response.ok) throw new Error("Falha ao enviar foto");
  return response.json();
}
