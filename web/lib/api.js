"use client";

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");

function normalizeApiUrl(url) {
  return url.trim().replace(/\/+$/, "");
}

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("sig_token") || "";
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
  } catch (_error) {
    const isHtml = text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html");
    if (isHtml && response.status === 404) {
      return { message: "Endpoint da API nao encontrado. Confira a variavel NEXT_PUBLIC_API_URL do painel web." };
    }
    return { message: text };
  }
}

export async function api(path, options = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {})
      }
    });
    const data = await readResponseData(response);
    if (!response.ok) throw new Error(readApiError(data, "Erro na API"));
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Nao foi possivel conectar na API. Confira NEXT_PUBLIC_API_URL e se o backend esta online.");
    }
    throw error;
  }
}
