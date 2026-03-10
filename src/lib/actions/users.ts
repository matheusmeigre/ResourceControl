"use server";

import { db } from "@/db";
import { users, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { CreateUserFormData } from "@/types";

export async function getUsers() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.USER_MANAGE)) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
      locale: users.locale,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .orderBy(users.name);

  return rows;
}

export async function getRoles() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return db.select().from(roles).orderBy(roles.name);
}

export async function createUser(data: CreateUserFormData) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.USER_MANAGE)) {
    throw new Error("Forbidden");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.insert(users).values({
    id: generateId(),
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    passwordHash,
    roleId: data.roleId,
    locale: data.locale || "pt-BR",
  });

  revalidatePath("/admin/users");
}

export async function updateUser(
  id: string,
  data: Partial<CreateUserFormData>
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.USER_MANAGE)) {
    throw new Error("Forbidden");
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name) updateData.name = data.name.trim();
  if (data.email) updateData.email = data.email.trim().toLowerCase();
  if (data.roleId) updateData.roleId = data.roleId;
  if (data.locale) updateData.locale = data.locale;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
  }

  await db.update(users).set(updateData).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.USER_MANAGE)) {
    throw new Error("Forbidden");
  }
  // Prevent deactivating yourself
  if (id === session.user.id) throw new Error("Cannot deactivate your own account");

  await db
    .update(users)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id));

  revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!hasPermission(session.user.permissions, PERMISSIONS.USER_MANAGE)) {
    throw new Error("Forbidden");
  }
  if (id === session.user.id) throw new Error("Cannot delete your own account");

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/users");
}
