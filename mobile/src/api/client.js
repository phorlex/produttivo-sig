import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL_STORAGE_KEY = "sig_api_url";
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

function normalizeApiUrl(url) {
  return url.trim().replace(/\/+$/, "");
}

export async function getApiUrl() {
  const storedUrl = await AsyncStorage.getItem(API_URL_STORAGE_KEY);
  return normalizeApiUrl(storedUrl || DEFAULT_API_URL);
}

export async function saveApiUrl(url) {
  const nextUrl = normalizeApiUrl(url);
  await AsyncStorage.setItem(API_URL_STORAGE_KEY, nextUrl);
  return nextUrl;
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
