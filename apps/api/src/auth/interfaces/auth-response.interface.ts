import { WorkspaceRole, MemberStatus } from '@prisma/client';

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  avatarColor: string | null;
  avatarInitials: string | null;
  bio: string | null;
  timezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeWorkspace {
  id: string;
  name: string;
  description: string | null;
  plan: string;
  storageLimitBytes: number;
  role?: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterResponse {
  accessToken: string;
  user: SafeUser;
  workspace: SafeWorkspace;
}

export interface LoginResponse {
  accessToken: string;
  user: SafeUser;
}

export interface MembershipInfo {
  id: string;
  role: WorkspaceRole;
  status: MemberStatus;
  joinedAt: Date;
  workspace: SafeWorkspace;
}

export interface MeResponse {
  user: SafeUser;
  memberships: MembershipInfo[];
}

