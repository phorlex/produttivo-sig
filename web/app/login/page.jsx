"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@sig.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) return setError(data.message || "Falha no login");
    localStorage.setItem("sig_token", data.token);
    window.location.href = "/dashboard";
  }

  return (
    <main className="grid min-h-screen place-items-center bg-sig-black p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6">
          <div className="text-3xl font-black text-sig-black">SIG</div>
          <h1 className="text-xl font-bold">Checklist Operacional</h1>
          <p className="text-sm text-zinc-600">Acesse com seu usuario interno.</p>
        </div>
        <label className="mb-3 block text-sm font-semibold">E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label>
        <label className="mb-4 block text-sm font-semibold">Senha<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></label>
        {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button className="w-full bg-sig-yellow px-4 py-2 text-sig-black hover:brightness-95">Entrar</button>
      </form>
    </main>
  );
}
