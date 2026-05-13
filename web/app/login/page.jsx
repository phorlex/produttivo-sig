"use client";

import { useState } from "react";
import { api } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@sig.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    try {
      setError("");
      setLoading(true);
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("sig_token", data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-sig-black p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6">
          <div className="text-3xl font-black text-sig-black">SIG</div>
          <h1 className="text-xl font-bold">Checklist Operacional</h1>
          <p className="text-sm text-zinc-600">Acesse com seu usuario interno.</p>
        </div>
        <label className="mb-3 block text-sm font-semibold">E-mail<input autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label>
        <label className="mb-4 block text-sm font-semibold">Senha<input autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></label>
        {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="w-full bg-sig-yellow px-4 py-2 text-sig-black hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
