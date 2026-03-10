"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createJob } from "@/lib/actions/jobs";
import { ChevronRight, ChevronLeft, Check, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateJobFormData } from "@/types";

interface App {
  id: string;
  name: string;
  repoUrl: string | null;
  defaultBranch: string;
  notes: string | null;
  isActive: boolean | number;
  createdAt: string;
  jobCount: number;
}

interface Props {
  apps: App[];
}

const STEPS = ["Informações", "Aplicações", "Config. Especiais"];

export function JobWizardClient({ apps }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changeType, setChangeType] = useState("");
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<
    Record<string, { suffixOverride?: string; branchName?: string; notes?: string }>
  >({});

  const activeApps = apps.filter((a) => a.isActive);
  const filteredApps = activeApps.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function toggleApp(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === activeApps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeApps.map((a) => a.id)));
    }
  }

  function setOverride(appId: string, key: "suffixOverride" | "branchName" | "notes", value: string) {
    setOverrides((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], [key]: value },
    }));
  }

  const canNext =
    step === 0
      ? title.trim() && changeType.trim()
      : step === 1
      ? selectedIds.size > 0
      : true;

  function handleSubmit() {
    const data: CreateJobFormData = {
      title,
      description,
      changeType,
      fromValue,
      toValue,
      targetDate,
      selectedAppIds: Array.from(selectedIds),
      appOverrides: overrides,
    };

    startTransition(async () => {
      try {
        const result = await createJob(data);
        toast.success("Job criado com sucesso!");
        router.push(`/jobs/${result.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao criar job");
      }
    });
  }

  const selectedAppsForOverrides = Array.from(selectedIds)
    .map((id) => activeApps.find((a) => a.id === id))
    .filter(Boolean) as App[];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Criar Novo Job</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure o lote de ajuste de recurso</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
                  i < step
                    ? "bg-blue-600 text-white"
                    : i === step
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500"
                )}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-sm",
                  i === step ? "font-medium text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-8 h-px flex-shrink-0", i < step ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-700")} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        {/* Step 0: Job Info */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Título do Job <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Migração storageClassSuffix repo3 → repo4"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Tipo de Mudança <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
                placeholder="Ex: storageClassSuffix, memoryLimit, cpuRequest"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Valor Atual (De)
                </label>
                <input
                  type="text"
                  value={fromValue}
                  onChange={(e) => setFromValue(e.target.value)}
                  placeholder="Ex: -repo3"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Novo Valor (Para)
                </label>
                <input
                  type="text"
                  value={toValue}
                  onChange={(e) => setToValue(e.target.value)}
                  placeholder="Ex: -repo4"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Data Alvo{" "}
                <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Descrição{" "}
                <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Descreva o objetivo deste job de ajuste..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 1: Select Apps */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.size > 0 ? (
                  <span className="font-semibold text-blue-600">
                    {selectedIds.size} aplicação(ões) selecionada(s)
                  </span>
                ) : (
                  "Selecione as aplicações que farão parte deste job"
                )}
              </p>
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIds.size === activeApps.length ? "Desmarcar Todas" : "Selecionar Todas"}
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar aplicações..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-1 border border-gray-100 dark:border-slate-700 rounded-lg p-2">
              {filteredApps.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Nenhuma aplicação encontrada
                </p>
              ) : (
                filteredApps.map((app) => (
                  <label
                    key={app.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      selectedIds.has(app.id)
                        ? "bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        : "hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(app.id)}
                      onChange={() => toggleApp(app.id)}
                      className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {app.name}
                    </span>
                    {app.repoUrl && (
                      <span className="text-xs text-gray-400 truncate ml-auto">
                        {app.defaultBranch}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>

            {selectedIds.size === 0 && (
              <p className="text-xs text-red-500 mt-2">
                Selecione ao menos uma aplicação para continuar
              </p>
            )}
          </div>
        )}

        {/* Step 2: Overrides */}
        {step === 2 && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Configure parâmetros específicos para aplicações que diferem do padrão.
              Todos os campos são opcionais.
            </p>

            {selectedAppsForOverrides.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma aplicação selecionada.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {selectedAppsForOverrides.map((app) => (
                  <div key={app.id} className="border border-gray-100 dark:border-slate-700 rounded-lg p-4">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-3">
                      {app.name}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Sufixo Especial
                        </label>
                        <input
                          type="text"
                          value={overrides[app.id]?.suffixOverride || ""}
                          onChange={(e) =>
                            setOverride(app.id, "suffixOverride", e.target.value)
                          }
                          placeholder="Ex: -repo3-cache"
                          className="w-full px-2.5 py-1.5 rounded border border-gray-200 dark:border-slate-600 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Nome da Branch
                        </label>
                        <input
                          type="text"
                          value={overrides[app.id]?.branchName || ""}
                          onChange={(e) =>
                            setOverride(app.id, "branchName", e.target.value)
                          }
                          placeholder="Ex: release/alteracao_repo4"
                          className="w-full px-2.5 py-1.5 rounded border border-gray-200 dark:border-slate-600 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Observações
                      </label>
                      <input
                        type="text"
                        value={overrides[app.id]?.notes || ""}
                        onChange={(e) =>
                          setOverride(app.id, "notes", e.target.value)
                        }
                        placeholder="Ex: mudar -repo3 para -repo4 (caso especial)"
                        className="w-full px-2.5 py-1.5 rounded border border-gray-200 dark:border-slate-600 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 0 ? "Cancelar" : "Anterior"}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isPending || !canNext}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Criando..." : "Criar Job"}
          </button>
        )}
      </div>
    </div>
  );
}
