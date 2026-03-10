import "dotenv/config";
import { db } from "./index";
import {
  roles,
  permissions,
  rolePermissions,
  users,
  applications,
} from "./schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function seed() {
  console.log("🌱 Seeding database...");

  // ── Roles ──────────────────────────────────────────────────────────────────
  const roleData = [
    { id: "role-admin", name: "admin", description: "Full access to everything" },
    { id: "role-gestor", name: "gestor", description: "View-only with export access" },
    { id: "role-editor", name: "editor", description: "Can create and edit jobs/apps" },
    { id: "role-viewer", name: "viewer", description: "Read-only access" },
  ];

  for (const role of roleData) {
    await db.insert(roles).values(role).onConflictDoNothing();
  }
  console.log("✅ Roles created");

  // ── Permissions ────────────────────────────────────────────────────────────
  const permData = [
    { id: "perm-job-create", action: "job:create", description: "Create new jobs" },
    { id: "perm-job-edit", action: "job:edit", description: "Edit job metadata" },
    { id: "perm-job-delete", action: "job:delete", description: "Delete jobs" },
    { id: "perm-job-update-status", action: "job:update-status", description: "Update app status in jobs" },
    { id: "perm-job-view", action: "job:view", description: "View jobs and their entries" },
    { id: "perm-job-bulk-update", action: "job:bulk-update", description: "Bulk update multiple statuses" },
    { id: "perm-job-archive", action: "job:archive", description: "Archive/complete jobs" },
    { id: "perm-app-create", action: "app:create", description: "Add apps to catalog" },
    { id: "perm-app-edit", action: "app:edit", description: "Edit app catalog entries" },
    { id: "perm-app-delete", action: "app:delete", description: "Delete apps from catalog" },
    { id: "perm-user-manage", action: "user:manage", description: "Manage users and roles" },
    { id: "perm-history-view", action: "history:view", description: "View status history" },
    { id: "perm-export-data", action: "export:data", description: "Export data as CSV" },
    { id: "perm-job-clone", action: "job:clone", description: "Clone existing jobs" },
  ];

  for (const perm of permData) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }
  console.log("✅ Permissions created");

  // ── Role ↔ Permission mappings ────────────────────────────────────────────
  const adminPerms = permData.map((p) => p.id); // admin gets everything

  const gestorPerms = [
    "perm-job-view",
    "perm-history-view",
    "perm-export-data",
  ];

  const editorPerms = [
    "perm-job-create",
    "perm-job-edit",
    "perm-job-update-status",
    "perm-job-view",
    "perm-job-bulk-update",
    "perm-job-archive",
    "perm-job-clone",
    "perm-app-create",
    "perm-app-edit",
    "perm-history-view",
    "perm-export-data",
  ];

  const viewerPerms = ["perm-job-view"];

  const roleMappings: { roleId: string; permIds: string[] }[] = [
    { roleId: "role-admin", permIds: adminPerms },
    { roleId: "role-gestor", permIds: gestorPerms },
    { roleId: "role-editor", permIds: editorPerms },
    { roleId: "role-viewer", permIds: viewerPerms },
  ];

  for (const { roleId, permIds } of roleMappings) {
    for (const permissionId of permIds) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId })
        .onConflictDoNothing();
    }
  }
  console.log("✅ Role-permission mappings created");

  // ── Admin user ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);
  await db
    .insert(users)
    .values({
      id: randomUUID(),
      name: "Admin",
      email: "admin@empresa.com",
      passwordHash,
      roleId: "role-admin",
      locale: "pt-BR",
    })
    .onConflictDoNothing();
  console.log("✅ Admin user created (admin@empresa.com / admin123)");

  // ── Sample applications from the notepad example ──────────────────────────
  const sampleApps = [
    "MSAttOcorrenciaTecnica",
    "MSDOC",
    "MSEEMAIL",
    "WSADC",
    "WSDCGD",
    "WSDOC",
    "WSGAL",
    "WSGBR",
    "WSGCL",
    "WSGDA",
    "WSGUC",
    "WSHSI",
    "WSIMG",
    "WSLIG",
    "WSMTUC",
    "WSPAG",
    "WSREDFLAG",
    "WSRELIG",
    "MSANXC",
    "MSGOT",
    "MSOSCOM",
    "MSOSGCD",
    "WSCLI",
    "WSGUE",
  ];

  for (const name of sampleApps) {
    await db
      .insert(applications)
      .values({
        id: randomUUID(),
        name,
        defaultBranch: "master",
      })
      .onConflictDoNothing();
  }
  console.log(`✅ ${sampleApps.length} sample applications created`);

  console.log("\n🎉 Seed complete!");
  console.log("   Login: admin@empresa.com");
  console.log("   Password: admin123");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
