"use client";

import { useState } from "react";
import { cn, STATUS_COLORS, STATUS_LABELS_PT, STATUS_ORDER } from "@/lib/utils";
import type { AppEntryStatus } from "@/db/schema";
import { ChevronDown, Check } from "lucide-react";

interface StatusBadgeProps {
  status: AppEntryStatus;
  editable?: boolean;
  onStatusChange?: (newStatus: AppEntryStatus) => void;
  locale?: string;
}

const STATUS_LABELS = STATUS_LABELS_PT;

export function StatusBadge({
  status,
  editable = false,
  onStatusChange,
}: StatusBadgeProps) {
  const [open, setOpen] = useState(false);

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        STATUS_COLORS[status],
        editable && "cursor-pointer hover:opacity-80 select-none"
      )}
      onClick={() => editable && setOpen((v) => !v)}
    >
      {STATUS_LABELS[status]}
      {editable && <ChevronDown className="w-3 h-3" />}
    </span>
  );

  if (!editable) return badge;

  return (
    <div className="relative inline-block">
      {badge}
      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-44">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onStatusChange?.(s);
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-50 text-left"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    s === "PENDENTE" && "bg-gray-400",
                    s === "BRANCH_CRIADA" && "bg-blue-500",
                    s === "YML_EDITADO" && "bg-indigo-500",
                    s === "PR_ABERTO" && "bg-orange-500",
                    s === "AGUARDANDO_APROVACAO" && "bg-yellow-500",
                    s === "PR_APROVADO" && "bg-lime-500",
                    s === "DEPLOY_HO" && "bg-purple-500",
                    s === "DEPLOY_PP" && "bg-green-500",
                    s === "CONCLUIDO" && "bg-emerald-500"
                  )}
                />
                <span className={cn(s === status && "font-semibold")}>
                  {STATUS_LABELS[s]}
                </span>
                {s === status && (
                  <Check className="w-3 h-3 ml-auto text-gray-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
