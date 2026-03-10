import { sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
  real,
} from "drizzle-orm/sqlite-core";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id),
  locale: text("locale").notNull().default("pt-BR"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Roles ───────────────────────────────────────────────────────────────────

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Permissions ─────────────────────────────────────────────────────────────

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  action: text("action").notNull().unique(),
  description: text("description"),
});

export const rolePermissions = sqliteTable("role_permissions", {
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id),
  permissionId: text("permission_id")
    .notNull()
    .references(() => permissions.id),
});

// ─── Applications (catalog) ──────────────────────────────────────────────────

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  repoUrl: text("repo_url"),
  defaultBranch: text("default_branch").notNull().default("master"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobStatusEnum = [
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type JobStatus = (typeof jobStatusEnum)[number];

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  changeType: text("change_type").notNull(), // e.g. "storageClassSuffix", "memory_limit"
  fromValue: text("from_value"),             // e.g. "-repo3"
  toValue: text("to_value"),                 // e.g. "-repo4"
  status: text("status").notNull().default("IN_PROGRESS").$type<JobStatus>(),
  targetDate: text("target_date"),           // ISO date string
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── App-Job Entries (the tracking record) ───────────────────────────────────

export const appEntryStatusEnum = [
  "PENDENTE",
  "BRANCH_CRIADA",
  "YML_EDITADO",
  "PR_ABERTO",
  "AGUARDANDO_APROVACAO",
  "PR_APROVADO",
  "DEPLOY_HO",
  "DEPLOY_PP",
  "CONCLUIDO",
] as const;
export type AppEntryStatus = (typeof appEntryStatusEnum)[number];

export const appJobEntries = sqliteTable("app_job_entries", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  applicationId: text("application_id")
    .notNull()
    .references(() => applications.id),
  status: text("status")
    .notNull()
    .default("PENDENTE")
    .$type<AppEntryStatus>(),
  branchName: text("branch_name"),
  suffixOverride: text("suffix_override"), // when app needs different suffix
  prUrl: text("pr_url"),
  notes: text("notes"),         // free text for special cases
  deployedHoAt: text("deployed_ho_at"),
  deployedPpAt: text("deployed_pp_at"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  order: real("order").notNull().default(0), // for ordering within a job
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Status History (audit trail) ────────────────────────────────────────────

export const statusHistory = sqliteTable("status_history", {
  id: text("id").primaryKey(),
  appJobEntryId: text("app_job_entry_id")
    .notNull()
    .references(() => appJobEntries.id, { onDelete: "cascade" }),
  fromStatus: text("from_status").$type<AppEntryStatus>(),
  toStatus: text("to_status").notNull().$type<AppEntryStatus>(),
  changedById: text("changed_by_id")
    .notNull()
    .references(() => users.id),
  note: text("note"),
  changedAt: text("changed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type AppJobEntry = typeof appJobEntries.$inferSelect;
export type NewAppJobEntry = typeof appJobEntries.$inferInsert;
export type StatusHistoryRecord = typeof statusHistory.$inferSelect;
