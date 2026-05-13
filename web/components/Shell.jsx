"use client";

import Link from "next/link";
import { ClipboardCheck, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";

export function Shell({ children }) {
  function logout() {
    localStorage.removeItem("sig_token");
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-sig-black text-white md:block">
        <div className="border-b border-white/10 px-6 py-5">
          <strong className="text-lg text-sig-yellow">SIG</strong>
          <p className="text-sm text-zinc-300">Checklist Operacional</p>
        </div>
        <nav className="space-y-1 p-4">
          <Link className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white/10" href="/dashboard"><LayoutDashboard size={18} /> Dashboard</Link>
          <Link className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white/10" href="/checklists"><ClipboardCheck size={18} /> Checklists</Link>
          <Link className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white/10" href="/checklists?new=1"><PlusCircle size={18} /> Novo modelo</Link>
        </nav>
        <button onClick={logout} className="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-2 text-zinc-200 hover:text-white"><LogOut size={18} /> Sair</button>
      </aside>
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
