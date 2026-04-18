import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomUUID } from "crypto";
import { AppEntryStatus } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return randomUUID();
}

/**
 * Returns the ordered list of all pipeline statuses.
 */
export const STATUS_ORDER: AppEntryStatus[] = [
  "PENDENTE",
  "BRANCH_CRIADA",
  "YML_EDITADO",
  "PR_ABERTO",
  "AGUARDANDO_APROVACAO",
  "PR_APROVADO",
  "DEPLOY_HO",
  "DEPLOY_PP",
  "CONCLUIDO",
];

/**
 * Returns the next status in the pipeline, or null if already at the end.
 */
export function getNextStatus(
  current: AppEntryStatus
): AppEntryStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1 || idx === STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

/**
 * Status display labels in pt-BR.
 */
export const STATUS_LABELS_PT: Record<AppEntryStatus, string> = {
  PENDENTE: "Pendente",
  BRANCH_CRIADA: "Branch Criada",
  YML_EDITADO: "YML Editado",
  PR_ABERTO: "PR Aberto",
  AGUARDANDO_APROVACAO: "Aguardando Aprovação",
  PR_APROVADO: "PR Aprovado",
  DEPLOY_HO: "Deploy HO",
  DEPLOY_PP: "Deploy PP",
  CONCLUIDO: "Concluído",
};

export const STATUS_LABELS_EN: Record<AppEntryStatus, string> = {
  PENDENTE: "Pending",
  BRANCH_CRIADA: "Branch Created",
  YML_EDITADO: "YML Edited",
  PR_ABERTO: "PR Opened",
  AGUARDANDO_APROVACAO: "Awaiting Approval",
  PR_APROVADO: "PR Approved",
  DEPLOY_HO: "Deploy Staging",
  DEPLOY_PP: "Deploy Production",
  CONCLUIDO: "Done",
};

/**
 * Status color CSS classes (Tailwind) — badge colors.
 */
export const STATUS_COLORS: Record<AppEntryStatus, string> = {
  PENDENTE:             "bg-gray-100   text-gray-700   border-gray-200   dark:bg-slate-800       dark:text-slate-300  dark:border-slate-700",
  BRANCH_CRIADA:        "bg-blue-100   text-blue-700   border-blue-200   dark:bg-blue-950/40     dark:text-blue-400   dark:border-blue-800",
  YML_EDITADO:          "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40   dark:text-indigo-400 dark:border-indigo-800",
  PR_ABERTO:            "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40   dark:text-orange-400 dark:border-orange-800",
  AGUARDANDO_APROVACAO: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40   dark:text-yellow-400 dark:border-yellow-800",
  PR_APROVADO:          "bg-lime-100   text-lime-700   border-lime-200   dark:bg-lime-950/40     dark:text-lime-400   dark:border-lime-800",
  DEPLOY_HO:            "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40   dark:text-purple-400 dark:border-purple-800",
  DEPLOY_PP:            "bg-green-100  text-green-700  border-green-200  dark:bg-green-950/40    dark:text-green-400  dark:border-green-800",
  CONCLUIDO:            "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
};

/**
 * Format a date string to a locale-friendly display.
 */
export function formatDate(date: string | null | undefined, locale = "pt-BR"): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Calculate the progress percentage of a job (how many entries are CONCLUIDO).
 */
export function calcProgress(entries: { status: AppEntryStatus }[]): number {
  if (entries.length === 0) return 0;
  const done = entries.filter((e) => e.status === "CONCLUIDO").length;
  return Math.round((done / entries.length) * 100);
}

/**
 * Count entries per status for a job summary.
 */
export function countByStatus(
  entries: { status: AppEntryStatus }[]
): Record<AppEntryStatus, number> {
  const counts = {} as Record<AppEntryStatus, number>;
  for (const s of STATUS_ORDER) counts[s] = 0;
  for (const e of entries) counts[e.status]++;
  return counts;
}
