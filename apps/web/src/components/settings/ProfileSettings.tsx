'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  AlertCircle,
  User,
  Mail,
  FileText,
  Globe,
  Loader2,
  Lock,
} from 'lucide-react';
import { UserProfile, updateProfile } from '@/data/settings-store';
import { useApp } from '@/components/layout/AppShell';

interface ProfileSettingsProps {
  profile: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
}

const AVATAR_COLOR_PALETTES = [
  '#7185E8', // Blue-violet (primary)
  '#29A36A', // Emerald green
  '#E6A13A', // Amber warm
  '#4A5FD9', // Indigo rich
  '#1F8A55', // Forest green
];

const DEFAULT_TIMEZONE = 'UTC+05:30 (India Standard Time)';

function resolveTimezone(tz?: string | null): string {
  if (!tz || tz === 'UTC') return DEFAULT_TIMEZONE;
  return tz;
}

export function ProfileSettings({
  profile,
  onProfileUpdated,
}: ProfileSettingsProps) {
  const { user, updateUserProfile } = useApp();

  const [formData, setFormData] = useState({
    fullName: user?.name || profile.fullName || '',
    email: user?.email || profile.email || '',
    bio: user?.bio || '',
    timezone: resolveTimezone(user?.timezone || profile.timezone),
    avatarColor: user?.avatarColor || profile.avatarColor || '#7185E8',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Sync form data whenever authenticated user state loads or changes
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        timezone: resolveTimezone(user.timezone),
        avatarColor: user.avatarColor || '#7185E8',
      });
    }
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      newErrors.fullName = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      newErrors.fullName = 'Full name cannot exceed 100 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    setSavedFeedback(null);

    const trimmedName = formData.fullName.trim();

    try {
      // 1. Persist to backend through single source of truth
      const updatedUser = await updateUserProfile({
        name: trimmedName,
        bio: formData.bio.trim(),
        timezone: formData.timezone,
        avatarColor: formData.avatarColor,
      });

      // 2. Update local state store
      const updatedProfile = updateProfile({
        fullName: updatedUser.name || trimmedName,
        email: updatedUser.email,
        bio: updatedUser.bio || formData.bio.trim(),
        timezone: updatedUser.timezone || formData.timezone,
        avatarColor: updatedUser.avatarColor || formData.avatarColor,
        avatarInitials: updatedUser.avatarInitials || undefined,
      });

      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }

      setSavedFeedback('Profile updated successfully');
      setTimeout(() => {
        setSavedFeedback(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSaveError(
        (err as Error).message || 'Failed to update profile. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.name || profile.fullName || '',
      email: user?.email || profile.email || '',
      bio: user?.bio || '',
      timezone: resolveTimezone(user?.timezone || profile.timezone),
      avatarColor: user?.avatarColor || profile.avatarColor || '#7185E8',
    });
    setErrors({});
    setSaveError(null);
  };

  const currentInitials =
    formData.fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'U';

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-6 sm:p-8 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E9EAF0]">
        <div>
          <h2 className="text-base font-bold text-[#242633] tracking-tight">
            Profile Settings
          </h2>
          <p className="text-xs text-[#858A99] mt-0.5">
            Your personal information, presence and identity across DocuMind.
          </p>
        </div>
        {savedFeedback && (
          <span className="text-xs text-[#29A36A] font-semibold flex items-center gap-1.5 bg-[#EDF8F2] px-3 py-1 rounded-full border border-[#D4EEDB] animate-in fade-in duration-200">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            {savedFeedback}
          </span>
        )}
      </div>

      {saveError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar and Identity Preview */}
        <div className="flex items-center gap-5 pb-6 border-b border-[#E9EAF0]">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-base font-bold shadow-subtle shrink-0 transition-colors"
            style={{ backgroundColor: formData.avatarColor }}
          >
            {currentInitials}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#242633]">Avatar Color Theme</p>
            <p className="text-[11px] text-[#858A99]">Choose your brand accent for documents and comments</p>
            <div className="flex items-center gap-2 pt-1">
              {AVATAR_COLOR_PALETTES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, avatarColor: color }))}
                  className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                    formData.avatarColor === color
                      ? 'border-[#242633] scale-110 shadow-xs'
                      : 'border-white hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select avatar color ${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Full Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <label className="text-xs font-semibold text-[#242633] pt-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#858A99]" />
              <span>Full Name</span>
            </label>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={formData.fullName}
                disabled={isSaving}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                placeholder="e.g. Jane Doe"
                className={`w-full max-w-md h-10 px-3.5 rounded-xl bg-white border text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all ${
                  errors.fullName ? 'border-red-400 bg-red-50/20' : 'border-[#E9EAF0]'
                }`}
              />
              {errors.fullName && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>
          </div>

          {/* Protected Email Address */}
          <div className="border-t border-[#E9EAF0] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <div>
              <label className="text-xs font-semibold text-[#242633] pt-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#858A99]" />
                <span>Email Address</span>
              </label>
              <span className="text-[11px] text-[#858A99] flex items-center gap-1 mt-0.5">
                <Lock className="w-3 h-3 text-[#858A99]" />
                Protected field
              </span>
            </div>
            <div className="sm:col-span-2">
              <input
                type="email"
                value={formData.email}
                readOnly
                disabled
                className="w-full max-w-md h-10 px-3.5 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] text-xs text-[#858A99] cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-[#858A99] mt-1">
                Account email is tied to workspace authentication and cannot be changed here.
              </p>
            </div>
          </div>

          {/* Bio */}
          <div className="border-t border-[#E9EAF0] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <div>
              <label className="text-xs font-semibold text-[#242633] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#858A99]" />
                <span>Bio & Role</span>
              </label>
              <span className="text-[11px] text-[#858A99] block mt-0.5">Brief description of your role</span>
            </div>
            <div className="sm:col-span-2">
              <textarea
                rows={3}
                value={formData.bio}
                disabled={isSaving}
                onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Brief summary of your responsibilities..."
                className="w-full max-w-md p-3 rounded-xl bg-white border border-[#E9EAF0] text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="border-t border-[#E9EAF0] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <label className="text-xs font-semibold text-[#242633] pt-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#858A99]" />
              <span>Timezone</span>
            </label>
            <div className="sm:col-span-2">
              <select
                value={formData.timezone}
                disabled={isSaving}
                onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full max-w-md h-10 px-3.5 rounded-xl bg-white border border-[#E9EAF0] text-xs font-medium text-[#242633] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all cursor-pointer"
              >
                <option value="UTC-08:00 (Pacific Time)">UTC-08:00 (Pacific Time)</option>
                <option value="UTC-05:00 (Eastern Time)">UTC-05:00 (Eastern Time)</option>
                <option value="UTC+00:00 (London, GMT)">UTC+00:00 (London, GMT)</option>
                <option value="UTC+01:00 (Berlin, Paris)">UTC+01:00 (Berlin, Paris)</option>
                <option value="UTC+05:30 (India Standard Time)">UTC+05:30 (India Standard Time)</option>
                <option value="UTC+08:00 (Singapore, Tokyo)">UTC+08:00 (Singapore, Tokyo)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clear Save and Cancel Actions */}
        <div className="pt-4 border-t border-[#E9EAF0] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-9 px-4 rounded-xl border border-[#E9EAF0] hover:bg-[#F7F8FA] text-xs font-semibold text-[#858A99] hover:text-[#242633] transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white shadow-subtle shadow-[#7185E8]/20 transition-all cursor-pointer active:scale-98 flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
