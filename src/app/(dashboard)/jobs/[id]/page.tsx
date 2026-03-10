import { getJobById, getJobEntries } from "@/lib/actions/jobs";
import { notFound } from "next/navigation";
import { JobDetailClient } from "@/components/job-detail-client";
import { auth } from "@/lib/auth";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job, entries, session] = await Promise.all([
    getJobById(id),
    getJobEntries(id),
    auth(),
  ]);

  if (!job) notFound();

  return (
    <JobDetailClient
      job={job}
      initialEntries={entries}
      userPermissions={session?.user?.permissions ?? []}
    />
  );
}
