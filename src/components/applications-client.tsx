"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  createApplication,
  updateApplication,
  deleteApplication,
  toggleApplicationActive,
} from "@/lib/actions/applications";

interface AppRow {
  id: string;
  name: string;
  repoUrl: string | null;
  defaultBranch: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  jobCount?: number;
}

interface Props {
  initial: AppRow[];
  canEdit: boolean;
}

export default function ApplicationsClient({ initial, canEdit }: Props) {
  const [apps, setApps] = useState<AppRow[]>(initial);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.notes ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(app: AppRow) {
    setEditing(app);
    setDialogOpen(true);
  }

  function handleToggle(app: AppRow) {
    startTransition(async () => {
      try {
        await toggleApplicationActive(app.id, !app.isActive);
        setApps((prev) =>
          prev.map((a) => (a.id === app.id ? { ...a, isActive: !a.isActive } : a))
        );
        toast.success(app.isActive ? "Aplicação desativada" : "Aplicação ativada");
      } catch (e) {
        toast.error((e as Error).message ?? "Erro ao alterar status");
      }
    });
  }

  function handleDelete(app: AppRow) {
    setConfirmDelete(app);
  }

  function confirmDoDelete() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    startTransition(async () => {
      try {
        await deleteApplication(target.id);
        setApps((prev) => prev.filter((a) => a.id !== target.id));
        toast.success("Aplicação excluída");
      } catch (e) {
        toast.error((e as Error).message ?? "Não foi possível excluir");
      }
    });
  }

  function handleSaved(updated: AppRow) {
    setApps((prev) => {
      const idx = prev.findIndex((a) => a.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
    setDialogOpen(false);
    toast.success(editing ? "Aplicação atualizada" : "Aplicação criada");
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar aplicação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Aplicação
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_2fr_1fr_auto] px-5 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 gap-4">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nome</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Branch</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Observações</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
          {canEdit && <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ações</span>}
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-800">
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-gray-400 dark:text-slate-600">
              Nenhuma aplicação encontrada
            </div>
          )}
          {filtered.map((app) => (
            <div key={app.id} className="grid grid-cols-[2fr_1fr_2fr_1fr_auto] px-5 py-3 gap-4 items-center group hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate">{app.name}</span>
                {app.repoUrl && (
                  <a href={app.repoUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <span className="font-mono text-xs text-gray-500 dark:text-slate-500 truncate">{app.defaultBranch}</span>
              <span className="text-sm text-gray-500 dark:text-slate-500 truncate">{app.notes ?? <span className="text-gray-300 dark:text-slate-700">—</span>}</span>
              <span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                    app.isActive
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                      : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                  }`}
                >
                  {app.isActive ? "Ativa" : "Inativa"}
                </span>
              </span>
              {canEdit && (
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggle(app)}
                    title={app.isActive ? "Desativar" : "Ativar"}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    disabled={isPending}
                  >
                    {app.isActive ? (
                      <ToggleRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(app)}
                    title="Editar"
                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    disabled={isPending}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(app)}
                    title="Excluir"
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    disabled={isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <AppFormDialog
          app={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Excluir aplicação?</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
              Tem certeza que deseja excluir{" "}
              <strong className="text-gray-800 dark:text-slate-200">{confirmDelete.name}</strong>? Esta ação não
              poderá ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDoDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Create / Edit Form Dialog ─── */
function AppFormDialog({
  app,
  onClose,
  onSaved,
}: {
  app: AppRow | null;
  onClose: () => void;
  onSaved: (a: AppRow) => void;
}) {
  const [name, setName] = useState(app?.name ?? "");
  const [repoUrl, setRepoUrl] = useState(app?.repoUrl ?? "");
  const [defaultBranch, setDefaultBranch] = useState(app?.defaultBranch ?? "master");
  const [notes, setNotes] = useState(app?.notes ?? "");
  const [isActive, setIsActive] = useState(app?.isActive ?? true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setError("");
    startTransition(async () => {
      try {
        if (app) {
          await updateApplication(app.id, {
            name: name.trim(),
            repoUrl: repoUrl.trim() || undefined,
            defaultBranch: defaultBranch.trim() || "master",
            notes: notes.trim() || undefined,
          });
          onSaved({ ...app, name: name.trim(), repoUrl: repoUrl.trim() || null, defaultBranch: defaultBranch.trim() || "master", notes: notes.trim() || null, isActive });
        } else {
          const result = await createApplication({
            name: name.trim(),
            repoUrl: repoUrl.trim() || undefined,
            defaultBranch: defaultBranch.trim() || "master",
            notes: notes.trim() || undefined,
          });
          onSaved({
            id: result.id,
            name: name.trim(),
            repoUrl: repoUrl.trim() || null,
            defaultBranch: defaultBranch.trim() || "master",
            notes: notes.trim() || null,
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        setError((e as Error).message ?? "Erro ao salvar");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-5">
          {app ? "Editar Aplicação" : "Nova Aplicação"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="Ex: WSAPP"
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Branch padrão</label>
            <input
              type="text"
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
              placeholder="master"
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">URL do repositório</label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Observações</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações opcionais"
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {app && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-slate-300">Ativa</label>
            </div>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 flex items-center gap-1.5"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {app ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
