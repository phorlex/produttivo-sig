"use client";

import { useEffect, useState } from "react";
import { Shell } from "../../components/Shell";
import { api } from "../../lib/api";

export default function DashboardPage() {
  const [data, setData] = useState({ totals: [], byUser: [], byVehicle: [] });
  const [filters, setFilters] = useState({ start: "", end: "", store: "", status: "", template_id: "", user_id: "" });
  const [rows, setRows] = useState([]);
  useEffect(() => { api("/submissions/dashboard").then(setData).catch(() => location.href = "/login"); }, []);
  useEffect(() => { search(); }, []);
  function search() {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api(`/submissions?${params}`).then(setRows).catch(() => {});
  }
  const total = data.totals.reduce((sum, item) => sum + item.total, 0);
  const byStatus = Object.fromEntries(data.totals.map((item) => [item.status, item.total]));

  return (
    <Shell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard operacional</h1>
        <p className="text-sm text-zinc-600">Visao geral por data, loja, responsavel, checklist e status.</p>
      </header>
      <section className="mb-6 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-6">
        <input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
        <input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
        <input placeholder="Loja" value={filters.store} onChange={(e) => setFilters({ ...filters, store: e.target.value })} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Status</option><option value="draft">Rascunho</option><option value="pending">Pendente</option><option value="finished">Finalizado</option></select>
        <input placeholder="ID checklist" value={filters.template_id} onChange={(e) => setFilters({ ...filters, template_id: e.target.value })} />
        <button onClick={search} className="bg-sig-black px-3 py-2 text-white">Filtrar</button>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        {[["Total", total], ["Pendentes", byStatus.pending || 0], ["Finalizados", byStatus.finished || 0], ["Rascunhos", byStatus.draft || 0]].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-white p-5">
            <p className="text-sm text-zinc-500">{label}</p>
            <strong className="text-3xl">{value}</strong>
          </div>
        ))}
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Panel title="Checklists por usuario" rows={data.byUser.map((i) => [i.name, i.total])} />
        <Panel title="Checklists por veiculo" rows={data.byVehicle.map((i) => [i.plate, i.total])} />
      </section>
      <section className="mt-6 rounded-lg border bg-white p-5">
        <h2 className="mb-3 font-bold">Relatorios filtrados</h2>
        {rows.map((item) => <div key={item.id} className="grid grid-cols-4 gap-3 border-b py-2 text-sm"><span>{item.report_number}</span><span>{item.checklist_name}</span><span>{item.plate || "Sem veiculo"}</span><strong>{item.status}</strong></div>)}
      </section>
    </Shell>
  );
}

function Panel({ title, rows }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <h2 className="mb-3 font-bold">{title}</h2>
      <div className="space-y-2">
        {rows.map(([label, value]) => <div key={label} className="flex justify-between border-b py-2 text-sm"><span>{label}</span><strong>{value}</strong></div>)}
      </div>
    </div>
  );
}
