'use client';

import { SafeUser } from '@/lib/api';

export interface UserProfile {
  fullName: string;
  email: string;
  role: string;
  avatarColor: string;
  avatarInitials: string;
  bio?: string;
  timezone?: string;
}

export interface UserPreferences {
  appearance: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  documentProcessingNotifications: boolean;
  weeklyDigest: boolean;
  defaultDocumentView: 'list' | 'grid';
  autoSummarize: boolean;
  semanticSearch: boolean;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  avatarInitials: string;
  joinedDate: string;
  status: 'Active' | 'Pending';
}

export interface WorkspaceData {
  name: string;
  description: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  planPrice: string;
  billingCycle: 'monthly' | 'annually';
  members: WorkspaceMember[];
  storageLimitBytes: number;
}

const DEFAULT_PROFILE: UserProfile = {
  fullName: '',
  email: '',
  role: 'Workspace Administrator',
  avatarColor: '#7185E8',
  avatarInitials: '',
  bio: '',
  timezone: 'Asia/Kolkata',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  appearance: 'light',
  emailNotifications: true,
  documentProcessingNotifications: true,
  weeklyDigest: false,
  defaultDocumentView: 'list',
  autoSummarize: true,
  semanticSearch: true,
};

const DEFAULT_WORKSPACE: WorkspaceData = {
  name: 'My Workspace',
  description: '',
  plan: 'Pro',
  planPrice: '$29 / user / month',
  billingCycle: 'monthly',
  storageLimitBytes: 2 * 1024 * 1024 * 1024, // 2 GB in bytes
  members: [],
};

const STORAGE_KEYS = {
  PROFILE: 'documind_settings_profile',
  PREFERENCES: 'documind_settings_preferences',
  WORKSPACE: 'documind_settings_workspace',
};

// In-memory store
let profileStore: UserProfile = { ...DEFAULT_PROFILE };
let preferencesStore: UserPreferences = { ...DEFAULT_PREFERENCES };
let workspaceStore: WorkspaceData = { ...DEFAULT_WORKSPACE };

// Listeners
type SettingsListener = () => void;
const listeners = new Set<SettingsListener>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Settings listener error', e);
    }
  });
}

function loadFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (savedProfile) {
      profileStore = { ...DEFAULT_PROFILE, ...JSON.parse(savedProfile) };
    }
    const savedPreferences = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (savedPreferences) {
      preferencesStore = { ...DEFAULT_PREFERENCES, ...JSON.parse(savedPreferences) };
    }
    const savedWorkspace = localStorage.getItem(STORAGE_KEYS.WORKSPACE);
    if (savedWorkspace) {
      workspaceStore = { ...DEFAULT_WORKSPACE, ...JSON.parse(savedWorkspace) };
    }
  } catch {
    // Ignore storage parse errors
  }
}

// Initial hydration attempt
if (typeof window !== 'undefined') {
  loadFromStorage();
}

export function getProfile(): UserProfile {
  return profileStore;
}

export function syncUserProfileWithBackend(backendUser: SafeUser): UserProfile {
  const updatedName = backendUser.name || '';
  const initials =
    backendUser.avatarInitials ||
    (updatedName
      ? updatedName
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0].toUpperCase())
          .slice(0, 2)
          .join('')
      : 'U');

  profileStore = {
    ...profileStore,
    fullName: updatedName,
    email: backendUser.email || '',
    avatarColor: backendUser.avatarColor || '#7185E8',
    avatarInitials: initials,
    bio: backendUser.bio || '',
    timezone:
      backendUser.timezone && backendUser.timezone !== 'UTC'
        ? backendUser.timezone
        : 'Asia/Kolkata',
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profileStore));
    } catch {}
  }
  notify();
  return profileStore;
}

export function syncWorkspaceWithBackend(
  backendWorkspace: {
    id: string;
    name: string;
    description: string | null;
    plan?: string;
    storageLimitBytes?: number;
  } | null | undefined,
  user: SafeUser,
): WorkspaceData {
  if (!backendWorkspace) return workspaceStore;

  const currentMembers = workspaceStore.members || [];
  const userMember: WorkspaceMember = {
    id: `mem-${user.id}`,
    name: user.name || 'Workspace Owner',
    email: user.email,
    role: 'Owner',
    avatarInitials:
      user.avatarInitials ||
      (user.name
        ? user.name.slice(0, 2).toUpperCase()
        : 'U'),
    joinedDate: user.createdAt
      ? new Date(user.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Recently',
    status: 'Active',
  };

  workspaceStore = {
    ...workspaceStore,
    name: backendWorkspace.name || `${user.name || 'User'}'s Workspace`,
    description: backendWorkspace.description || '',
    plan: (backendWorkspace.plan as any) || 'Pro',
    storageLimitBytes:
      backendWorkspace.storageLimitBytes || 2 * 1024 * 1024 * 1024,
    members:
      currentMembers.length > 0 && currentMembers.some((m) => m.email === user.email)
        ? currentMembers
        : [userMember],
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(workspaceStore));
    } catch {}
  }
  notify();
  return workspaceStore;
}

export function updateProfile(updates: Partial<UserProfile>): UserProfile {
  profileStore = {
    ...profileStore,
    ...updates,
    avatarInitials:
      updates.fullName !== undefined
        ? updates.fullName
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0].toUpperCase())
            .slice(0, 2)
            .join('') || 'U'
        : profileStore.avatarInitials,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profileStore));
    } catch {}
  }
  notify();
  return profileStore;
}

export function getPreferences(): UserPreferences {
  return preferencesStore;
}

export function updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
  preferencesStore = { ...preferencesStore, ...updates };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferencesStore));
    } catch {}
  }
  notify();
  return preferencesStore;
}

export function getWorkspace(): WorkspaceData {
  return workspaceStore;
}

export function updateWorkspace(updates: Partial<WorkspaceData>): WorkspaceData {
  workspaceStore = { ...workspaceStore, ...updates };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(workspaceStore));
    } catch {}
  }
  notify();
  return workspaceStore;
}

export function addWorkspaceMember(member: Omit<WorkspaceMember, 'id' | 'joinedDate' | 'status'>): WorkspaceMember {
  const newMember: WorkspaceMember = {
    id: `mem-${Date.now()}`,
    ...member,
    joinedDate: 'Just now',
    status: 'Active',
  };
  workspaceStore = {
    ...workspaceStore,
    members: [...workspaceStore.members, newMember],
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(workspaceStore));
    } catch {}
  }
  notify();
  return newMember;
}

export function removeWorkspaceMember(id: string): void {
  workspaceStore = {
    ...workspaceStore,
    members: workspaceStore.members.filter((m) => m.id !== id),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKSPACE, JSON.stringify(workspaceStore));
    } catch {}
  }
  notify();
}

export function resetAllSettings(): void {
  profileStore = { ...DEFAULT_PROFILE };
  preferencesStore = { ...DEFAULT_PREFERENCES };
  workspaceStore = { ...DEFAULT_WORKSPACE };
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
      localStorage.removeItem(STORAGE_KEYS.WORKSPACE);
    } catch {}
  }
  notify();
}

export function subscribeSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
