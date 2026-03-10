"use server";

import { db } from "@/db";
import { applications, appJobEntries } from "@/db/schema";
import { eq, sql, like, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { CreateAppFormData } from "@/types";

export async function getApplications(search?: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const conditions = search
    ? [like(applications.name, `%${search}%`)]
    : [];

  const rows = await db
    .select({
      id: applications.id,
      name: applications.name,
      repoUrl: applications.repoUrl,
      defaultBranch: applications.defaultBranch,
      notes: applications.notes,
      isActive: applications.isActive,
      createdAt: applications.createdAt,
      jobCount: sql<number>`(
        SELECT COUNT(*) FROM app_job_entries WHERE application_id = ${applications.id}
      )`,
    })
    .from(applications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(applications.name);

  return rows;
}

export async function createApplication(data: CreateAppFormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.APP_CREATE)) {
    throw new Error("Forbidden");
  }

  const id = generateId();
  await db.insert(applications).values({
    id,
    name: data.name.trim(),
    repoUrl: data.repoUrl || null,
    defaultBranch: data.defaultBranch || "master",
    notes: data.notes || null,
  });

  revalidatePath("/applications");
  return { id };
}

export async function updateApplication(
  id: string,
  data: Partial<CreateAppFormData>
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.APP_EDIT)) {
    throw new Error("Forbidden");
  }

  await db
    .update(applications)
    .set({
      name: data.name?.trim(),
      repoUrl: data.repoUrl || null,
      defaultBranch: data.defaultBranch,
      notes: data.notes || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(applications.id, id));

  revalidatePath("/applications");
}

export async function deleteApplication(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.APP_DELETE)) {
    throw new Error("Forbidden");
  }

  // Check if used in any job
  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appJobEntries)
    .where(eq(appJobEntries.applicationId, id));

  if (usage.count > 0) {
    throw new Error(`Cannot delete: application is used in ${usage.count} job(s)`);
  }

  await db.delete(applications).where(eq(applications.id, id));
  revalidatePath("/applications");
}

export async function toggleApplicationActive(id: string, isActive: boolean) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.APP_EDIT)) {
    throw new Error("Forbidden");
  }

  await db
    .update(applications)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(applications.id, id));

  revalidatePath("/applications");
}
