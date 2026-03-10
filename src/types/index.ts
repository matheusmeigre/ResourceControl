import { AppEntryStatus, JobStatus } from "@/db/schema";

// ─── Extended types with joins ────────────────────────────────────────────────

export interface UserSession {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  locale: string;
}

export interface JobWithStats {
  id: string;
  title: string;
  description: string | null;
  changeType: string;
  fromValue: string | null;
  toValue: string | null;
  status: JobStatus;
  targetDate: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  totalApps: number;
  completedApps: number;
  createdByName: string;
}

export interface AppJobEntryWithApp {
  id: string;
  jobId: string;
  applicationId: string;
  applicationName: string;
  status: AppEntryStatus;
  branchName: string | null;
  suffixOverride: string | null;
  prUrl: string | null;
  notes: string | null;
  deployedHoAt: string | null;
  deployedPpAt: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  appJobEntryId: string;
  fromStatus: AppEntryStatus | null;
  toStatus: AppEntryStatus;
  changedById: string;
  changedByName: string;
  note: string | null;
  changedAt: string;
  applicationName: string;
}

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  locale: string;
  createdAt: string;
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface CreateJobFormData {
  title: string;
  description?: string;
  changeType: string;
  fromValue?: string;
  toValue?: string;
  targetDate?: string;
  selectedAppIds: string[];
  appOverrides: Record<string, { suffixOverride?: string; notes?: string; branchName?: string }>;
}

export interface CreateAppFormData {
  name: string;
  repoUrl?: string;
  defaultBranch: string;
  notes?: string;
}

export interface CreateUserFormData {
  name: string;
  email: string;
  password: string;
  roleId: string;
  locale: string;
}

export interface UpdateStatusFormData {
  status: AppEntryStatus;
  note?: string;
  branchName?: string;
  prUrl?: string;
  deployedHoAt?: string;
  deployedPpAt?: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
