"use client";

import { useState, useTransition, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateEntryStatus,
  bulkUpdateStatus,
  updateEntryDetails,
  updateJobStatus,
  cloneJob,
  deleteJob,
} from "@/lib/actions/jobs";
import { StatusBadge } from "./status-badge";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  cn,
  STATUS_ORDER,
  STATUS_LABELS_PT,
  countByStatus,
  STATUS_COLORS,
} from "@/lib/utils";
import type { JobWithStats, AppJobEntryWithApp } from "@/types";
import type { AppEntryStatus } from "@/db/schema";
import {
  LayoutList,
  Columns,
  ExternalLink,
  Copy,
  GitBranch,
  Trash2,
  ArchiveIcon,
  CopyIcon,
  Loader2,
  ChevronRight,
  X,
  Check,
  Clock,
  Calendar,
} from "lucide-react";

interface Props {
  job: JobWithStats;
  initialEntries: AppJobEntryWithApp[];
  userPermissions: string[];
}

type View = "table" | "kanban";

export function JobDetailClient({ job, initialEntries, userPermissions }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [view, setView] = useState<View>("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [editingEntry, setEditingEntry] = useState<AppJobEntryWithApp | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneTitle, setCloneTitle] = useState(`${job.title} (cópia)`);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canEdit = hasPermission(userPermissions, PERMISSIONS.JOB_UPDATE_STATUS);
  const canBulk = hasPermission(userPermissions, PERMISSIONS.JOB_BULK_UPDATE);
  const canDelete = hasPermission(userPermissions, PERMISSIONS.JOB_DELETE);
  const canClone = hasPermission(userPermissions, PERMISSIONS.JOB_CLONE);
  const canArchive = hasPermission(userPermissions, PERMISSIONS.JOB_ARCHIVE);

  const totalApps = entries.length;
  const completedApps = entries.filter((e) => e.status === "CONCLUIDO").length;
  const pct = totalApps > 0 ? Math.round((completedApps / totalApps) * 100) : 0;
  const counts = countByStatus(entries);

  const handleStatusChange = useCallback(
    (entryId: string, toStatus: AppEntryStatus) => {
      // Optimistic update
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, status: toStatus } : e))
      );
      startTransition(async () => {
        try {
          await updateEntryStatus(entryId, toStatus);
          toast.success(`Status atualizado: ${STATUS_LABELS_PT[toStatus]}`);
        } catch {
          // Rollback
          setEntries(initialEntries);
          toast.error("Erro ao atualizar status");
        }
      });
    },
    [initialEntries]
  );

  const handleBulkStatus = useCallback(
    (toStatus: AppEntryStatus) => {
      if (selectedIds.size === 0) return;
      const ids = Array.from(selectedIds);

      // Optimistic
      setEntries((prev) =>
        prev.map((e) => (ids.includes(e.id) ? { ...e, status: toStatus } : e))
      );
      setSelectedIds(new Set());

      startTransition(async () => {
        try {
          await bulkUpdateStatus(ids, toStatus);
          toast.success(
            `${ids.length} app(s) marcadas como ${STATUS_LABELS_PT[toStatus]}`
          );
        } catch {
          setEntries(initialEntries);
          toast.error("Erro ao atualizar status em lote");
        }
      });
    },
    [initialEntries, selectedIds]
  );

  const handleSaveEntryDetails = async (
    entryId: string,
    data: { branchName?: string; prUrl?: string; notes?: string }
  ) => {
    try {
      await updateEntryDetails(entryId, data);
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, ...data } : e))
      );
      setEditingEntry(null);
      toast.success("Dados atualizados");
    } catch {
      toast.error("Erro ao atualizar dados");
    }
  };

  const handleClone = () => {
    startTransition(async () => {
      try {
        const result = await cloneJob(job.id, cloneTitle);
        toast.success("Job clonado com sucesso!");
        setShowCloneDialog(false);
        router.push(`/jobs/${result.id}`);
      } catch {
        toast.error("Erro ao clonar job");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteJob(job.id);
        toast.success("Job excluído");
        router.push("/jobs");
      } catch {
        toast.error("Erro ao excluir job");
      }
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      try {
        await updateJobStatus(job.id, "COMPLETED");
        toast.success("Job arquivado como Concluído");
        router.refresh();
      } catch {
        toast.error("Erro ao arquivar job");
      }
    });
  };

  function copyResume() {
    const byStatus: Record<string, string[]> = {};
    for (const e of entries) {
      if (!byStatus[e.status]) byStatus[e.status] = [];
      byStatus[e.status].push(e.applicationName);
    }

    let text = `📋 ${job.title}\n`;
    text += `${job.changeType}${job.fromValue && job.toValue ? `: ${job.fromValue} → ${job.toValue}` : ""}\n`;
    text += `Progresso: ${completedApps}/${totalApps} (${pct}%)\n\n`;

    for (const status of STATUS_ORDER) {
      const apps = byStatus[status];
      if (apps && apps.length > 0) {
        text += `--- ${STATUS_LABELS_PT[status]} (${apps.length}) ---\n`;
        text += apps.join(", ") + "\n\n";
      }
    }

    navigator.clipboard.writeText(text);
    toast.success("Resumo copiado para a área de transferência!");
  }

  return (
    <div className="p-8 max-w-full">
      {/* Job Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.push("/jobs")}
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                Jobs
                <ChevronRight className="w-3 h-3" />
              </button>
              <span className="text-sm text-gray-800 font-medium truncate">
                {job.title}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {job.title}
            </h1>
            {job.description && (
              <p className="text-gray-500 mt-1 text-sm">{job.description}</p>
            )}
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {job.fromValue && job.toValue && (
                <span className="text-sm text-gray-600">
                  <span className="font-medium">{job.changeType}:</span>{" "}
                  <span className="font-mono bg-red-50 text-red-600 px-1 rounded text-xs">
                    {job.fromValue}
                  </span>{" "}
                  →{" "}
                  <span className="font-mono bg-green-50 text-green-700 px-1 rounded text-xs">
                    {job.toValue}
                  </span>
                </span>
              )}
              {job.targetDate && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(job.targetDate).toLocaleDateString("pt-BR")}
                </span>
              )}
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                por {job.createdByName}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={copyResume}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Resumo
            </button>
            {canClone && (
              <button
                onClick={() => setShowCloneDialog(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                Clonar
              </button>
            )}
            {canArchive && job.status === "IN_PROGRESS" && (
              <button
                onClick={handleArchive}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArchiveIcon className="w-3.5 h-3.5" />
                Arquivar
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress + status summary */}
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {completedApps}/{totalApps} apps concluídas ({pct}%)
            </span>
            <span className="text-xs text-gray-400">
              {totalApps - completedApps} pendentes
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct === 100 ? "bg-emerald-500" : "bg-blue-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Status counters */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
              <span
                key={s}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border",
                  STATUS_COLORS[s]
                )}
              >
                {STATUS_LABELS_PT[s]}: <strong>{counts[s]}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* View toggle + Bulk actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                view === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutList className="w-4 h-4" />
              Tabela
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                view === "kanban"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Columns className="w-4 h-4" />
              Kanban
            </button>
          </div>

          {/* History link */}
          <a
            href={`/jobs/${job.id}/history`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <Clock className="w-4 h-4" />
            Histórico
          </a>
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Salvando...
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {canBulk && selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          onApply={handleBulkStatus}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Main content */}
      {view === "table" ? (
        <JobTable
          entries={entries}
          canEdit={canEdit}
          canBulk={canBulk}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onStatusChange={handleStatusChange}
          onEditEntry={setEditingEntry}
        />
      ) : (
        <KanbanBoard
          entries={entries}
          canEdit={canEdit}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Edit entry dialog */}
      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          onSave={handleSaveEntryDetails}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Clone dialog */}
      {showCloneDialog && (
        <SimpleDialog
          title="Clonar Job"
          onClose={() => setShowCloneDialog(false)}
          onConfirm={handleClone}
          isPending={isPending}
          confirmLabel="Clonar"
        >
          <p className="text-sm text-gray-600 mb-3">
            Um novo job será criado com as mesmas aplicações. Todos os status serão resetados.
          </p>
          <input
            type="text"
            value={cloneTitle}
            onChange={(e) => setCloneTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </SimpleDialog>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <SimpleDialog
          title="Excluir Job"
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          isPending={isPending}
          confirmLabel="Excluir"
          danger
        >
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir este job? Esta ação não pode ser desfeita.
          </p>
        </SimpleDialog>
      )}
    </div>
  );
}

// ─── JobTable ─────────────────────────────────────────────────────────────────

function JobTable({
  entries,
  canEdit,
  canBulk,
  selectedIds,
  onSelectChange,
  onStatusChange,
  onEditEntry,
}: {
  entries: AppJobEntryWithApp[];
  canEdit: boolean;
  canBulk: boolean;
  selectedIds: Set<string>;
  onSelectChange: (ids: Set<string>) => void;
  onStatusChange: (id: string, status: AppEntryStatus) => void;
  onEditEntry: (entry: AppJobEntryWithApp) => void;
}) {
  const allSelected = entries.length > 0 && selectedIds.size === entries.length;

  function toggleAll() {
    if (allSelected) {
      onSelectChange(new Set());
    } else {
      onSelectChange(new Set(entries.map((e) => e.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectChange(next);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {canBulk && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                </th>
              )}
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Aplicação
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Branch
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Sufixo
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                PR
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                HO
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                PP
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Notas
              </th>
              {canEdit && (
                <th className="w-14 px-4 py-3"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  Nenhuma aplicação neste job
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    selectedIds.has(entry.id) && "bg-blue-50 hover:bg-blue-50"
                  )}
                >
                  {canBulk && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry.id)}
                        onChange={() => toggleOne(entry.id)}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {entry.applicationName}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={entry.status}
                      editable={canEdit}
                      onStatusChange={(s) => onStatusChange(entry.id, s)}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-32 truncate">
                    {entry.branchName || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {entry.suffixOverride || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {entry.prUrl ? (
                      <a
                        href={entry.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                      >
                        PR <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {entry.deployedHoAt
                      ? new Date(entry.deployedHoAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {entry.deployedPpAt
                      ? new Date(entry.deployedPpAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-40 truncate">
                    {entry.notes || "—"}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onEditEntry(entry)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded"
                        title="Editar dados"
                      >
                        <GitBranch className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KanbanBoard ──────────────────────────────────────────────────────────────

function KanbanBoard({
  entries,
  canEdit,
  onStatusChange,
}: {
  entries: AppJobEntryWithApp[];
  canEdit: boolean;
  onStatusChange: (id: string, status: AppEntryStatus) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const grouped: Record<AppEntryStatus, AppJobEntryWithApp[]> = {} as Record<
    AppEntryStatus,
    AppJobEntryWithApp[]
  >;
  for (const s of STATUS_ORDER) grouped[s] = [];
  for (const entry of entries) grouped[entry.status].push(entry);

  const activeEntry = activeId ? entries.find((e) => e.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !canEdit) return;
    const toStatus = over.id as AppEntryStatus;
    const entry = entries.find((e) => e.id === active.id);
    if (entry && entry.status !== toStatus) {
      onStatusChange(active.id as string, toStatus);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              entries={grouped[status]}
              canEdit={canEdit}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeEntry && <KanbanCardContent entry={activeEntry} isOverlay />}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  entries,
  canEdit,
}: {
  status: AppEntryStatus;
  entries: AppJobEntryWithApp[];
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="w-52 flex-shrink-0">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-lg border-b-2",
          STATUS_COLORS[status]
        )}
      >
        <span className="text-xs font-semibold">{STATUS_LABELS_PT[status]}</span>
        <span className="text-xs font-bold">{entries.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-b-lg min-h-32 p-2 space-y-2 transition-colors",
          isOver ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-slate-800/40"
        )}
      >
        {entries.map((entry) => (
          <KanbanCard key={entry.id} entry={entry} canEdit={canEdit} />
        ))}
        {entries.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-300 dark:text-slate-600">
            —
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  entry,
  canEdit,
}: {
  entry: AppJobEntryWithApp;
  canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: entry.id, disabled: !canEdit });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canEdit ? listeners : {})}
      {...(canEdit ? attributes : {})}
      className={cn(
        "touch-none",
        isDragging && "opacity-40"
      )}
    >
      <KanbanCardContent entry={entry} canEdit={canEdit} />
    </div>
  );
}

function KanbanCardContent({
  entry,
  canEdit,
  isOverlay,
}: {
  entry: AppJobEntryWithApp;
  canEdit?: boolean;
  isOverlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 shadow-sm select-none",
        canEdit && "cursor-grab active:cursor-grabbing",
        isOverlay && "shadow-xl border-blue-400 rotate-1 opacity-95"
      )}
    >
      <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 mb-1 leading-tight">
        {entry.applicationName}
      </p>
      {entry.suffixOverride && (
        <p className="text-xs text-purple-600 dark:text-purple-400 font-mono mb-1">
          {entry.suffixOverride}
        </p>
      )}
      {entry.branchName && (
        <p className="text-xs text-gray-400 font-mono truncate mb-1">
          {entry.branchName}
        </p>
      )}
      {entry.prUrl && (
        <a
          href={entry.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5 mb-1"
          onClick={(e) => e.stopPropagation()}
        >
          PR <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
      {entry.notes && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic truncate">
          {entry.notes}
        </p>
      )}
    </div>
  );
}

// ─── Bulk Actions Bar ─────────────────────────────────────────────────────────

function BulkActionsBar({
  count,
  onApply,
  onClear,
}: {
  count: number;
  onApply: (status: AppEntryStatus) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-10 mb-4 bg-blue-600 text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
      <Check className="w-4 h-4" />
      <span className="text-sm font-medium">{count} selecionada(s)</span>
      <div className="relative ml-auto">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Marcar como
          <ChevronRight className="w-3.5 h-3.5 rotate-90" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-52">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onApply(s);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      STATUS_COLORS[s].split(" ")[0]
                    )}
                  />
                  {STATUS_LABELS_PT[s]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={onClear}
        className="ml-1 p-1 rounded hover:bg-blue-500 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Edit Entry Dialog ────────────────────────────────────────────────────────

function EditEntryDialog({
  entry,
  onSave,
  onClose,
}: {
  entry: AppJobEntryWithApp;
  onSave: (
    id: string,
    data: { branchName?: string; prUrl?: string; notes?: string; suffixOverride?: string }
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [branchName, setBranchName] = useState(entry.branchName || "");
  const [prUrl, setPrUrl] = useState(entry.prUrl || "");
  const [notes, setNotes] = useState(entry.notes || "");
  const [suffixOverride, setSuffixOverride] = useState(entry.suffixOverride || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(entry.id, { branchName, prUrl, notes, suffixOverride });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{entry.applicationName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Ex: release/alteracao_repo4"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sufixo Especial
            </label>
            <input
              type="text"
              value={suffixOverride}
              onChange={(e) => setSuffixOverride(e.target.value)}
              placeholder="Ex: -repo3-cache"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL do PR
            </label>
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas / Caso Especial
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: MSANXC — mudar -repo3 para -repo4 (caso diferente)"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Simple Dialog ─────────────────────────────────────────────────────────────

function SimpleDialog({
  title,
  children,
  onClose,
  onConfirm,
  isPending,
  confirmLabel,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  confirmLabel: string;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-5">{children}</div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "flex-1 py-2 text-sm font-medium text-white rounded-lg flex items-center justify-center gap-1.5",
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
