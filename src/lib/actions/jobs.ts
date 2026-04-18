"use server";

import { db } from "@/db";
import {
  jobs,
  appJobEntries,
  applications,
  users,
  statusHistory,
} from "@/db/schema";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateId, STATUS_ORDER } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { CreateJobFormData, AppJobEntryWithApp, JobWithStats } from "@/types";
import type { AppEntryStatus } from "@/db/schema";

// ─── Job CRUD ─────────────────────────────────────────────────────────────────

/**
 * Reconciles stale IN_PROGRESS jobs whose every entry is already CONCLUIDO.
 * Called implicitly by getJobs so no manual intervention is needed.
 */
async function reconcileCompletedJobs() {
  await db
    .update(jobs)
    .set({ status: "COMPLETED", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(jobs.status, "IN_PROGRESS"),
        sql`(
          SELECT COUNT(*) FROM app_job_entries WHERE job_id = ${jobs.id}
        ) > 0`,
        sql`(
          SELECT COUNT(*) FROM app_job_entries
          WHERE job_id = ${jobs.id} AND status != 'CONCLUIDO'
        ) = 0`
      )
    );
}

export async function getJobs(statusFilter?: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await reconcileCompletedJobs();

  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
      changeType: jobs.changeType,
      fromValue: jobs.fromValue,
      toValue: jobs.toValue,
      status: jobs.status,
      targetDate: jobs.targetDate,
      createdById: jobs.createdById,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      createdByName: users.name,
      totalApps: sql<number>`(
        SELECT COUNT(*) FROM app_job_entries WHERE job_id = ${jobs.id}
      )`,
      completedApps: sql<number>`(
        SELECT COUNT(*) FROM app_job_entries
        WHERE job_id = ${jobs.id} AND status = 'CONCLUIDO'
      )`,
    })
    .from(jobs)
    .leftJoin(users, eq(jobs.createdById, users.id))
    .where(
      statusFilter && statusFilter !== "all"
        ? eq(jobs.status, statusFilter as "IN_PROGRESS" | "COMPLETED" | "CANCELLED")
        : undefined
    )
    .orderBy(desc(jobs.createdAt));

  return rows as JobWithStats[];
}

export async function getJobById(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const [job] = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
      changeType: jobs.changeType,
      fromValue: jobs.fromValue,
      toValue: jobs.toValue,
      status: jobs.status,
      targetDate: jobs.targetDate,
      createdById: jobs.createdById,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      createdByName: users.name,
      totalApps: sql<number>`(
        SELECT COUNT(*) FROM app_job_entries WHERE job_id = ${jobs.id}
      )`,
      completedApps: sql<number>`(
        SELECT COUNT(*) FROM app_job_entries
        WHERE job_id = ${jobs.id} AND status = 'CONCLUIDO'
      )`,
    })
    .from(jobs)
    .leftJoin(users, eq(jobs.createdById, users.id))
    .where(eq(jobs.id, id))
    .limit(1);

  return job as JobWithStats | undefined;
}

export async function getJobEntries(jobId: string): Promise<AppJobEntryWithApp[]> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const rows = await db
    .select({
      id: appJobEntries.id,
      jobId: appJobEntries.jobId,
      applicationId: appJobEntries.applicationId,
      applicationName: applications.name,
      status: appJobEntries.status,
      branchName: appJobEntries.branchName,
      suffixOverride: appJobEntries.suffixOverride,
      prUrl: appJobEntries.prUrl,
      notes: appJobEntries.notes,
      deployedHoAt: appJobEntries.deployedHoAt,
      deployedPpAt: appJobEntries.deployedPpAt,
      assignedToId: appJobEntries.assignedToId,
      assignedToName: users.name,
      order: appJobEntries.order,
      createdAt: appJobEntries.createdAt,
      updatedAt: appJobEntries.updatedAt,
    })
    .from(appJobEntries)
    .innerJoin(applications, eq(appJobEntries.applicationId, applications.id))
    .leftJoin(users, eq(appJobEntries.assignedToId, users.id))
    .where(eq(appJobEntries.jobId, jobId))
    .orderBy(appJobEntries.order, applications.name);

  return rows as AppJobEntryWithApp[];
}

export async function createJob(data: CreateJobFormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.JOB_CREATE)) {
    throw new Error("Forbidden");
  }
  if (data.selectedAppIds.length === 0) {
    throw new Error("Select at least one application");
  }

  const jobId = generateId();
  await db.insert(jobs).values({
    id: jobId,
    title: data.title.trim(),
    description: data.description || null,
    changeType: data.changeType.trim(),
    fromValue: data.fromValue || null,
    toValue: data.toValue || null,
    targetDate: data.targetDate || null,
    createdById: session.user.id,
  });

  // Create one AppJobEntry per selected app
  const entryValues = data.selectedAppIds.map((appId, idx) => {
    const override = data.appOverrides?.[appId] ?? {};
    return {
      id: generateId(),
      jobId,
      applicationId: appId,
      status: "PENDENTE" as AppEntryStatus,
      branchName: override.branchName || null,
      suffixOverride: override.suffixOverride || null,
      notes: override.notes || null,
      order: idx,
    };
  });

  await db.insert(appJobEntries).values(entryValues);

  revalidatePath("/jobs");
  return { id: jobId };
}

export async function updateJobStatus(
  jobId: string,
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.JOB_ARCHIVE)) {
    throw new Error("Forbidden");
  }

  await db
    .update(jobs)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(jobs.id, jobId));

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}

export async function deleteJob(jobId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.JOB_DELETE)) {
    throw new Error("Forbidden");
  }

  await db.delete(jobs).where(eq(jobs.id, jobId));
  revalidatePath("/jobs");
}

export async function cloneJob(jobId: string, newTitle: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.JOB_CLONE)) {
    throw new Error("Forbidden");
  }

  const [source] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!source) throw new Error("Job not found");

  const sourceEntries = await db
    .select()
    .from(appJobEntries)
    .where(eq(appJobEntries.jobId, jobId));

  const newJobId = generateId();
  await db.insert(jobs).values({
    id: newJobId,
    title: newTitle.trim(),
    description: source.description,
    changeType: source.changeType,
    fromValue: source.fromValue,
    toValue: source.toValue,
    targetDate: null,
    createdById: session.user.id,
    status: "IN_PROGRESS",
  });

  if (sourceEntries.length > 0) {
    await db.insert(appJobEntries).values(
      sourceEntries.map((e) => ({
        id: generateId(),
        jobId: newJobId,
        applicationId: e.applicationId,
        status: "PENDENTE" as AppEntryStatus,
        branchName: e.branchName,
        suffixOverride: e.suffixOverride,
        notes: null,
        order: e.order,
      }))
    );
  }

  revalidatePath("/jobs");
  return { id: newJobId };
}

// ─── App Entry Status Updates ────────────────────────────────────────────────

export async function updateEntryStatus(
  entryId: string,
  toStatus: AppEntryStatus,
  opts?: {
    note?: string;
    branchName?: string;
    prUrl?: string;
    deployedHoAt?: string;
    deployedPpAt?: string;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.JOB_UPDATE_STATUS)) {
    throw new Error("Forbidden");
  }

  const [entry] = await db
    .select()
    .from(appJobEntries)
    .where(eq(appJobEntries.id, entryId))
    .limit(1);
  if (!entry) throw new Error("Entry not found");

  const fromStatus = entry.status;

  const updateData: Partial<typeof appJobEntries.$inferInsert> = {
    status: toStatus,
    updatedAt: new Date().toISOString(),
  };

  if (opts?.branchName !== undefined) updateData.branchName = opts.branchName;
  if (opts?.prUrl !== undefined) updateData.prUrl = opts.prUrl;
  if (opts?.deployedHoAt !== undefined) updateData.deployedHoAt = opts.deployedHoAt;
  if (opts?.deployedPpAt !== undefined) updateData.deployedPpAt = opts.deployedPpAt;

  // Auto-set deploy timestamps when status changes
  if (toStatus === "DEPLOY_HO" && !entry.deployedHoAt) {
    updateData.deployedHoAt = new Date().toISOString();
  }
  if (toStatus === "DEPLOY_PP" && !entry.deployedPpAt) {
    updateData.deployedPpAt = new Date().toISOString();
  }

  await db
    .update(appJobEntries)
    .set(updateData)
    .where(eq(appJobEntries.id, entryId));

  // Record in history
  await db.insert(statusHistory).values({
    id: generateId(),
    appJobEntryId: entryId,
    fromStatus: fromStatus as AppEntryStatus,
    toStatus,
    changedById: session.user.id,
    note: opts?.note || null,
  });

  // Auto-complete job when all entries reach CONCLUIDO
  if (toStatus === "CONCLUIDO") {
    const [{ pendingCount }] = await db
      .select({ pendingCount: sql<number>`count(*)` })
      .from(appJobEntries)
      .where(and(eq(appJobEntries.jobId, entry.jobId), sql`${appJobEntries.status} != 'CONCLUIDO'`));

    if (Number(pendingCount) === 0) {
      await db
        .update(jobs)
        .set({ status: "COMPLETED", updatedAt: new Date().toISOString() })
        .where(and(eq(jobs.id, entry.jobId), eq(jobs.status, "IN_PROGRESS")));
      revalidatePath("/jobs");
    }
  }

  revalidatePath(`/jobs/${entry.jobId}`);
}

export async function bulkUpdateStatus(
  entryIds: string[],
  toStatus: AppEntryStatus,
  note?: string
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.JOB_BULK_UPDATE)) {
    throw new Error("Forbidden");
  }
  if (entryIds.length === 0) return;

  // Get current statuses for history
  const currentEntries = await db
    .select({ id: appJobEntries.id, status: appJobEntries.status, jobId: appJobEntries.jobId })
    .from(appJobEntries)
    .where(inArray(appJobEntries.id, entryIds));

  const now = new Date().toISOString();

  // Bulk update
  await db
    .update(appJobEntries)
    .set({ status: toStatus, updatedAt: now })
    .where(inArray(appJobEntries.id, entryIds));

  // Record history for each
  const historyValues = currentEntries.map((e) => ({
    id: generateId(),
    appJobEntryId: e.id,
    fromStatus: e.status as AppEntryStatus,
    toStatus,
    changedById: session.user.id,
    note: note || null,
    changedAt: now,
  }));
  if (historyValues.length > 0) {
    await db.insert(statusHistory).values(historyValues);
  }

  // Revalidate all affected job pages
  const jobIds = [...new Set(currentEntries.map((e) => e.jobId))];
  for (const jobId of jobIds) {
    revalidatePath(`/jobs/${jobId}`);
  }

  // Auto-complete jobs where all entries are now CONCLUIDO
  if (toStatus === "CONCLUIDO") {
    for (const jobId of jobIds) {
      const [{ pendingCount }] = await db
        .select({ pendingCount: sql<number>`count(*)` })
        .from(appJobEntries)
        .where(and(eq(appJobEntries.jobId, jobId), sql`${appJobEntries.status} != 'CONCLUIDO'`));

      if (Number(pendingCount) === 0) {
        await db
          .update(jobs)
          .set({ status: "COMPLETED", updatedAt: new Date().toISOString() })
          .where(and(eq(jobs.id, jobId), eq(jobs.status, "IN_PROGRESS")));
      }
    }
    revalidatePath("/jobs");
  }
}

export async function updateEntryDetails(
  entryId: string,
  data: {
    branchName?: string | null;
    suffixOverride?: string | null;
    prUrl?: string | null;
    notes?: string | null;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.JOB_UPDATE_STATUS)) {
    throw new Error("Forbidden");
  }

  const [entry] = await db
    .select({ jobId: appJobEntries.jobId })
    .from(appJobEntries)
    .where(eq(appJobEntries.id, entryId))
    .limit(1);
  if (!entry) throw new Error("Entry not found");

  await db
    .update(appJobEntries)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(appJobEntries.id, entryId));

  revalidatePath(`/jobs/${entry.jobId}`);
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function getJobHistory(jobId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.HISTORY_VIEW)) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      id: statusHistory.id,
      appJobEntryId: statusHistory.appJobEntryId,
      fromStatus: statusHistory.fromStatus,
      toStatus: statusHistory.toStatus,
      changedById: statusHistory.changedById,
      changedByName: users.name,
      note: statusHistory.note,
      changedAt: statusHistory.changedAt,
      applicationName: applications.name,
    })
    .from(statusHistory)
    .innerJoin(appJobEntries, eq(statusHistory.appJobEntryId, appJobEntries.id))
    .innerJoin(applications, eq(appJobEntries.applicationId, applications.id))
    .innerJoin(users, eq(statusHistory.changedById, users.id))
    .where(eq(appJobEntries.jobId, jobId))
    .orderBy(desc(statusHistory.changedAt));

  return rows;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const [activeJobsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(eq(jobs.status, "IN_PROGRESS"));

  const [appsInProgress] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appJobEntries)
    .innerJoin(jobs, eq(appJobEntries.jobId, jobs.id))
    .where(
      and(
        eq(jobs.status, "IN_PROGRESS"),
        sql`${appJobEntries.status} != 'CONCLUIDO'`
      )
    );

  const [awaitingApproval] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appJobEntries)
    .innerJoin(jobs, eq(appJobEntries.jobId, jobs.id))
    .where(
      and(
        eq(jobs.status, "IN_PROGRESS"),
        eq(appJobEntries.status, "AGUARDANDO_APROVACAO")
      )
    );

  const [readyForPP] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appJobEntries)
    .innerJoin(jobs, eq(appJobEntries.jobId, jobs.id))
    .where(
      and(
        eq(jobs.status, "IN_PROGRESS"),
        eq(appJobEntries.status, "PR_APROVADO")
      )
    );

  const recentJobs = await getJobs("IN_PROGRESS");

  // App-entry count per status across all IN_PROGRESS jobs
  const statusRows = await db
    .select({ status: appJobEntries.status, count: sql<number>`count(*)` })
    .from(appJobEntries)
    .innerJoin(jobs, eq(appJobEntries.jobId, jobs.id))
    .where(eq(jobs.status, "IN_PROGRESS"))
    .groupBy(appJobEntries.status);

  const statusBreakdown = Object.fromEntries(
    STATUS_ORDER.map((s) => [s, 0])
  ) as Record<AppEntryStatus, number>;
  for (const row of statusRows) {
    statusBreakdown[row.status as AppEntryStatus] = Number(row.count);
  }

  return {
    activeJobs: activeJobsCount.count,
    appsInProgress: appsInProgress.count,
    awaitingApproval: awaitingApproval.count,
    readyForPP: readyForPP.count,
    recentJobs: recentJobs.slice(0, 5),
    statusBreakdown,
  };
}
