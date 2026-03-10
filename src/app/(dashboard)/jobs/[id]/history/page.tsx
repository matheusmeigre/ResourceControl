import { getJobById, getJobHistory } from "@/lib/actions/jobs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { cn, STATUS_COLORS, STATUS_LABELS_PT } from "@/lib/utils";
import type { AppEntryStatus } from "@/db/schema";

export default async function JobHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job, history] = await Promise.all([getJobById(id), getJobHistory(id)]);
  if (!job) notFound();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-400 mb-6">
        <Link href="/jobs" className="hover:text-gray-600">Jobs</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/jobs/${id}`} className="hover:text-gray-600 truncate max-w-xs">
          {job.title}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium">Histórico</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Status</h1>
          <p className="text-gray-500 mt-1 text-sm">{job.title}</p>
        </div>
        <Link
          href={`/jobs/${id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao job
        </Link>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-gray-400">Nenhuma alteração registrada ainda</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-[1fr_1fr_1fr_2fr_2fr] gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">App</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">De</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Para</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Por</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quando / Nota</span>
          </div>

          <div className="divide-y divide-gray-50">
            {history.map((h) => (
              <div key={h.id} className="px-5 py-3 grid grid-cols-[1fr_1fr_1fr_2fr_2fr] gap-4 items-center hover:bg-gray-50">
                <span className="font-medium text-sm text-gray-800 truncate">
                  {h.applicationName}
                </span>
                <div>
                  {h.fromStatus ? (
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-xs border",
                        STATUS_COLORS[h.fromStatus as AppEntryStatus]
                      )}
                    >
                      {STATUS_LABELS_PT[h.fromStatus as AppEntryStatus]}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </div>
                <div>
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs border",
                      STATUS_COLORS[h.toStatus as AppEntryStatus]
                    )}
                  >
                    {STATUS_LABELS_PT[h.toStatus as AppEntryStatus]}
                  </span>
                </div>
                <span className="text-sm text-gray-600 truncate">{h.changedByName}</span>
                <div>
                  <p className="text-xs text-gray-400">
                    {new Date(h.changedAt).toLocaleString("pt-BR")}
                  </p>
                  {h.note && (
                    <p className="text-xs text-gray-600 italic mt-0.5">{h.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
