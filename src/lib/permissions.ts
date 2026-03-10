/**
 * All permission action strings available in the application.
 * Used for type-safe permission checks.
 */
export const PERMISSIONS = {
  JOB_CREATE: "job:create",
  JOB_EDIT: "job:edit",
  JOB_DELETE: "job:delete",
  JOB_UPDATE_STATUS: "job:update-status",
  JOB_VIEW: "job:view",
  JOB_BULK_UPDATE: "job:bulk-update",
  JOB_ARCHIVE: "job:archive",
  JOB_CLONE: "job:clone",
  APP_CREATE: "app:create",
  APP_EDIT: "app:edit",
  APP_DELETE: "app:delete",
  USER_MANAGE: "user:manage",
  HISTORY_VIEW: "history:view",
  EXPORT_DATA: "export:data",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Check if a user has a specific permission.
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  permission: Permission
): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(permission);
}

/**
 * Check if a user has all of the specified permissions.
 */
export function hasAllPermissions(
  userPermissions: string[] | undefined,
  perms: Permission[]
): boolean {
  return perms.every((p) => hasPermission(userPermissions, p));
}

/**
 * Check if a user has any of the specified permissions.
 */
export function hasAnyPermission(
  userPermissions: string[] | undefined,
  perms: Permission[]
): boolean {
  return perms.some((p) => hasPermission(userPermissions, p));
}
