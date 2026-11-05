'use client';

import React, { useState, useEffect } from 'react';
import { AppShell, useApp } from '@/components/layout/AppShell';
import {
  SettingsNavigation,
  SettingsSection,
} from '@/components/settings/SettingsNavigation';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { PreferenceSettings } from '@/components/settings/PreferenceSettings';
import { WorkspaceSettings } from '@/components/settings/WorkspaceSettings';
import { StorageSettings } from '@/components/settings/StorageSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import {
  getProfile,
  getPreferences,
  getWorkspace,
  subscribeSettings,
  UserProfile,
  UserPreferences,
  WorkspaceData,
  resetAllSettings,
} from '@/data/settings-store';
import { calculateStorageAnalytics } from '@/lib/storage-utils';
import { logoutApi } from '@/lib/api';

function SettingsContent() {
  const { documents, openDocumentDrawer, user, workspace: appWorkspace, logout } = useApp();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [profile, setProfile] = useState<UserProfile>(getProfile);
  const [preferences, setPreferences] = useState<UserPreferences>(getPreferences);
  const [workspace, setWorkspace] = useState<WorkspaceData>(getWorkspace);

  // Sync profile when authenticated user is loaded or updated
  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        fullName: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        timezone: user.timezone && user.timezone !== 'UTC' ? user.timezone : 'Asia/Kolkata',
        avatarColor: user.avatarColor || '#7185E8',
        avatarInitials: user.avatarInitials || (user.name ? user.name.slice(0, 2).toUpperCase() : 'U'),
      }));
    }
  }, [user]);

  // Sync workspace when authenticated workspace is loaded or updated
  useEffect(() => {
    if (appWorkspace) {
      setWorkspace((prev) => ({
        ...prev,
        name: appWorkspace.name,
        description: appWorkspace.description || '',
        plan: (appWorkspace.plan as any) || prev.plan,
        storageLimitBytes: appWorkspace.storageLimitBytes || prev.storageLimitBytes,
      }));
    }
  }, [appWorkspace]);

  // Subscribe to changes in settings store
  useEffect(() => {
    return subscribeSettings(() => {
      setProfile({ ...getProfile() });
      setPreferences({ ...getPreferences() });
      setWorkspace({ ...getWorkspace() });
    });
  }, []);

  const storageAnalytics = calculateStorageAnalytics(documents);

  const handleLogout = () => {
    logout();
  };

  const handleDeleteAccount = () => {
    resetAllSettings();
    logout();
  };

  const currentWorkspaceName = appWorkspace?.name || workspace.name || 'My Workspace';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Page Header */}
      <div className="pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#242633] tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#858A99] mt-0.5">
            Manage your account, workspace configuration and application preferences.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FF] border border-[#E0E4FC] text-xs font-medium text-[#7185E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] animate-pulse" />
            Workspace: <strong className="font-semibold text-[#242633]">{currentWorkspaceName}</strong>
          </span>
        </div>
      </div>

      {/* Responsive Two-Column Settings Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Column */}
        <div className="md:col-span-4 lg:col-span-3 sticky top-20">
          <SettingsNavigation
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            storageUsagePercent={storageAnalytics.usagePercentage}
          />
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-8 lg:col-span-9 min-w-0">
          {activeSection === 'profile' && (
            <ProfileSettings
              profile={profile}
              onProfileUpdated={setProfile}
            />
          )}

          {activeSection === 'preferences' && (
            <PreferenceSettings
              preferences={preferences}
              onPreferencesUpdated={setPreferences}
            />
          )}

          {activeSection === 'workspace' && (
            <WorkspaceSettings
              workspace={workspace}
              onWorkspaceUpdated={setWorkspace}
            />
          )}

          {activeSection === 'storage' && (
            <StorageSettings
              documents={documents}
              onOpenDocument={openDocumentDrawer}
            />
          )}

          {activeSection === 'security' && (
            <SecuritySettings
              userEmail={user?.email || profile.email}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}
