import { getDashboardStats } from "@/lib/actions/jobs";
import Link from "next/link";
import { Briefcase, AppWindow, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { cn, STATUS_COLORS, STATUS_LABELS_PT } from "@/lib/utils";
import type { AppEntryStatus } from "@/db/schema";

export const metadata = { title: "Dashboard — Controle de Ajuste de Recurso" };

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      label: "Jobs Ativos",
      value: stats.activeJobs,
      icon: Briefcase,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Apps em Andamento",
      value: stats.appsInProgress,
      icon: AppWindow,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      label: "Aguardando Aprovação",
      value: stats.awaitingApproval,
      icon: Clock,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
    {
      label: "Prontos para Deploy PP",
      value: stats.readyForPP,
      icon: CheckCircle2,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral dos ajustes de recurso</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
          >
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", card.iconBg)}>
              <card.icon className={cn("w-5 h-5", card.iconColor)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 leading-tight">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status legend */}
      <div className="mb-6 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {(["PENDENTE","BRANCH_CRIADA","YML_EDITADO","PR_ABERTO","AGUARDANDO_APROVACAO","PR_APROVADO","DEPLOY_HO","DEPLOY_PP","CONCLUIDO"] as AppEntryStatus[]).map((s) => (
          <div key={s} className={cn("rounded-lg p-2 text-center border", STATUS_COLORS[s])}>
            <p className="text-xs font-medium leading-tight">{STATUS_LABELS_PT[s]}</p>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Jobs Recentes</h2>
          <Link
            href="/jobs"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.recentJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">Nenhum job ativo no momento</p>
            <Link href="/jobs/new" className="mt-3 inline-flex text-sm text-blue-600 hover:text-blue-700 font-medium">
              Criar primeiro job →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recentJobs.map((job) => {
              const pct = job.totalApps > 0
                ? Math.round((job.completedApps / job.totalApps) * 100)
                : 0;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate mb-0.5">{job.title}</p>
                    <p className="text-xs text-gray-400">
                      {job.changeType}
                      {job.fromValue && job.toValue && (
                        <span className="ml-1 font-mono">{job.fromValue} → {job.toValue}</span>
                      )}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {job.completedApps}/{job.totalApps}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
