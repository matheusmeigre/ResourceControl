import { getDashboardStats } from "@/lib/actions/jobs";
import Link from "next/link";
import { Briefcase, AppWindow, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { cn, STATUS_COLORS, STATUS_LABELS_PT, STATUS_ORDER } from "@/lib/utils";
import type { AppEntryStatus } from "@/db/schema";

export const metadata = { title: "Dashboard — Controle de Ajuste de Recurso" };

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      label: "Jobs Ativos",
      value: stats.activeJobs,
      icon: Briefcase,
      iconBg: "bg-blue-50 dark:bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
      accent: "border-t-blue-500",
    },
    {
      label: "Apps em Andamento",
      value: stats.appsInProgress,
      icon: AppWindow,
      iconBg: "bg-purple-50 dark:bg-purple-500/10",
      iconColor: "text-purple-600 dark:text-purple-400",
      accent: "border-t-purple-500",
    },
    {
      label: "Aguardando Aprovação",
      value: stats.awaitingApproval,
      icon: Clock,
      iconBg: "bg-amber-50 dark:bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
      accent: "border-t-amber-500",
    },
    {
      label: "Prontos para Deploy PP",
      value: stats.readyForPP,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      accent: "border-t-emerald-500",
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Visão geral dos ajustes de recurso</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={cn(
              "bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800",
              "border-t-2 p-5 flex items-center gap-4",
              card.accent
            )}
          >
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", card.iconBg)}>
              <card.icon className={cn("w-5 h-5", card.iconColor)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 leading-none mb-1">
                {card.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Overview */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">
          Pipeline — distribuição de apps por etapa
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {STATUS_ORDER.map((s) => {
            const count = stats.statusBreakdown[s];
            return (
              <Link
                key={s}
                href="/jobs"
                className={cn(
                  "rounded-lg p-2.5 text-center border transition-all hover:shadow-sm",
                  STATUS_COLORS[s],
                  count === 0 ? "opacity-40" : "opacity-100"
                )}
              >
                <p className="text-lg font-bold leading-none mb-1">{count}</p>
                <p className="text-[11px] font-medium leading-tight">{STATUS_LABELS_PT[s]}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="font-semibold text-gray-800 dark:text-slate-200">Jobs Recentes</h2>
          <Link
            href="/jobs"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.recentJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 dark:text-slate-500 text-sm">Nenhum job ativo no momento</p>
            <Link href="/jobs/new" className="mt-3 inline-flex text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              Criar primeiro job →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {stats.recentJobs.map((job) => {
              const pct = job.totalApps > 0
                ? Math.round((job.completedApps / job.totalApps) * 100)
                : 0;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-slate-100 truncate mb-0.5">{job.title}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {job.changeType}
                      {job.fromValue && job.toValue && (
                        <span className="ml-1 font-mono">{job.fromValue} → {job.toValue}</span>
                      )}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            pct === 100 ? "bg-emerald-500" : "bg-blue-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0 tabular-nums">
                        {job.completedApps}/{job.totalApps}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

