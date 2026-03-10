import { getJobs } from "@/lib/actions/jobs";
import Link from "next/link";
import { Plus, ArrowRight, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/db/schema";

export const metadata = { title: "Jobs — Controle de Ajuste de Recurso" };

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "Todos",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluídos",
  CANCELLED: "Cancelados",
};

const JOB_STATUS_BADGES: Record<JobStatus, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status || "IN_PROGRESS";
  const jobs = await getJobs(filter === "all" ? undefined : filter);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Lotes de ajuste de recurso</p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Job
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={`/jobs?status=${value}`}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              filter === value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Jobs grid */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChevronDown className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Nenhum job encontrado</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter === "IN_PROGRESS"
              ? "Crie um novo job para começar"
              : "Não há jobs com este status"}
          </p>
          {filter === "IN_PROGRESS" && (
            <Link
              href="/jobs/new"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Criar novo job
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const pct =
              job.totalApps > 0
                ? Math.round((job.completedApps / job.totalApps) * 100)
                : 0;

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                {/* Status + title */}
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 mt-0.5",
                      JOB_STATUS_BADGES[job.status]
                    )}
                  >
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                  <h3 className="font-semibold text-gray-900 leading-snug flex-1 group-hover:text-blue-700 transition-colors">
                    {job.title}
                  </h3>
                </div>

                {/* Change info */}
                {job.fromValue && job.toValue && (
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">{job.changeType}:</span>{" "}
                    <span className="font-mono bg-red-50 text-red-600 px-1 rounded">
                      {job.fromValue}
                    </span>{" "}
                    →{" "}
                    <span className="font-mono bg-green-50 text-green-700 px-1 rounded">
                      {job.toValue}
                    </span>
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  <span>por {job.createdByName}</span>
                  {job.targetDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(job.targetDate).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Progresso</span>
                    <span>
                      {job.completedApps}/{job.totalApps} apps ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct === 100 ? "bg-emerald-500" : "bg-blue-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-end mt-3">
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
