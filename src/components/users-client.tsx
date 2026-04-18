"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Loader2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createUser, updateUser, toggleUserActive, deleteUser } from "@/lib/actions/users";

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string | null;
  isActive: boolean | null;
  locale: string | null;
  createdAt: string | null;
}

interface Props {
  users: UserRow[];
  roles: Role[];
  currentUserId: string;
}

export default function UsersClient({ users: initial, roles, currentUserId }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setDialogOpen(true);
  }

  function handleToggle(u: UserRow) {
    if (u.id === currentUserId) {
      toast.error("Você não pode desativar sua própria conta");
      return;
    }
    startTransition(async () => {
      try {
        await toggleUserActive(u.id, !u.isActive);
        setUsers((prev) =>
          prev.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x))
        );
        toast.success(u.isActive ? "Usuário desativado" : "Usuário ativado");
      } catch (e) {
        toast.error((e as Error).message ?? "Erro ao alterar status");
      }
    });
  }

  function handleDelete(u: UserRow) {
    if (u.id === currentUserId) {
      toast.error("Você não pode excluir sua própria conta");
      return;
    }
    setConfirmDelete(u);
  }

  function confirmDoDelete() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    startTransition(async () => {
      try {
        await deleteUser(target.id);
        setUsers((prev) => prev.filter((u) => u.id !== target.id));
        toast.success("Usuário excluído");
      } catch (e) {
        toast.error((e as Error).message ?? "Não foi possível excluir");
      }
    });
  }

  function handleSaved(updated: UserRow) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
    setDialogOpen(false);
    toast.success(editing ? "Usuário atualizado" : "Usuário criado");
  }

  const roleLabel = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.name ?? roleId;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] px-5 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 gap-4">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nome</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">E-mail</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Perfil</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ações</span>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-800">
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-gray-400 dark:text-slate-600">
              Nenhum usuário encontrado
            </div>
          )}
          {filtered.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[2fr_3fr_1fr_1fr_auto] px-5 py-3 gap-4 items-center group hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                {u.name}
                {u.id === currentUserId && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full">você</span>
                )}
              </span>
              <span className="text-sm text-gray-500 dark:text-slate-500 truncate">{u.email}</span>
              <span className="text-sm text-gray-700 dark:text-slate-300 capitalize">{roleLabel(u.roleId)}</span>
              <span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                    u.isActive
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                      : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                  }`}
                >
                  {u.isActive ? "Ativo" : "Inativo"}
                </span>
              </span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleToggle(u)}
                  title={u.isActive ? "Desativar" : "Ativar"}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-40"
                  disabled={isPending || u.id === currentUserId}
                >
                  {u.isActive ? (
                    <ToggleRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(u)}
                  title="Editar"
                  className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  disabled={isPending}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  title="Excluir"
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40"
                  disabled={isPending || u.id === currentUserId}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Dialog */}
      {dialogOpen && (
        <UserFormDialog
          user={editing}
          roles={roles}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Excluir usuário?</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
              Tem certeza que deseja excluir{" "}
              <strong className="text-gray-800 dark:text-slate-200">{confirmDelete.name}</strong>?
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

/* ─── User Form Dialog ─── */
function UserFormDialog({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  roles: Role[];
  onClose: () => void;
  onSaved: (u: UserRow) => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [roleId, setRoleId] = useState(user?.roleId ?? (roles[0]?.id ?? ""));
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Nome e e-mail são obrigatórios"); return; }
    if (!user && !password.trim()) { setError("Senha é obrigatória para novos usuários"); return; }
    setError("");
    const roleName = roles.find((r) => r.id === roleId)?.name ?? null;
    startTransition(async () => {
      try {
        if (user) {
          await updateUser(user.id, {
            name: name.trim(),
            email: email.trim(),
            roleId,
            password: password.trim() || undefined,
          });
          onSaved({ ...user, name: name.trim(), email: email.trim(), roleId, roleName });
        } else {
          await createUser({
            name: name.trim(),
            email: email.trim(),
            roleId,
            password: password.trim(),
            locale: "pt-BR",
          });
          onSaved({
            id: crypto.randomUUID(),
            name: name.trim(),
            email: email.trim(),
            roleId,
            roleName,
            isActive: true,
            locale: "pt-BR",
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
          {user ? "Editar Usuário" : "Novo Usuário"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Perfil</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {user ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={user ? "••••••••" : "Mínimo 8 caracteres"}
              className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
              {user ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
