"use client";

import { useEffect, useState } from "react";
import { Shell } from "../../components/Shell";
import { api } from "../../lib/api";

const empty = { plate: "", brand: "", model: "", version: "", year: "", color: "", mileage: "", store: "", status: "", notes: "" };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(empty);
  const load = () => api("/vehicles").then(setVehicles);
  useEffect(() => { load().catch(() => location.href = "/login"); }, []);

  async function save(event) {
    event.preventDefault();
    await api(form.id ? `/vehicles/${form.id}` : "/vehicles", { method: form.id ? "PUT" : "POST", body: JSON.stringify(form) });
    setForm(empty);
    load();
  }

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold">Cadastro de veiculos</h1>
      <form onSubmit={save} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
        {Object.keys(empty).map((key) => (
          <label key={key} className={key === "notes" ? "md:col-span-4" : ""}>
            <span className="text-xs font-semibold uppercase text-zinc-500">{key}</span>
            <input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={key === "plate"} />
          </label>
        ))}
        <button className="bg-sig-black px-4 py-2 text-white">Salvar veiculo</button>
      </form>
      <div className="mt-6 overflow-hidden rounded-lg border bg-white">
        {vehicles.map((v) => (
          <button key={v.id} onClick={() => setForm(v)} className="grid w-full grid-cols-4 gap-3 border-b p-4 text-left hover:bg-zinc-50">
            <strong>{v.plate}</strong><span>{v.brand} {v.model}</span><span>{v.store}</span><span>{v.status}</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}
