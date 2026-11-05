'use client';

import React, { useState } from 'react';
import {
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Key,
  Laptop,
  AlertTriangle,
} from 'lucide-react';
import { LogoutModal } from './LogoutModal';
import { DeleteAccountModal } from './DeleteAccountModal';

interface SecuritySettingsProps {
  userEmail: string;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
}

export function SecuritySettings({
  userEmail,
  onLogout,
  onDeleteAccount,
}: SecuritySettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Enter your current password.';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'New password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess('Password updated successfully');
    setTimeout(() => setPasswordSuccess(null), 3000);
  };

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    if (onLogout) onLogout();
  };

  const handleConfirmDelete = () => {
    setDeleteModalOpen(false);
    if (onDeleteAccount) onDeleteAccount();
  };

  return (
    <div className="space-y-6">
      <LogoutModal
        isOpen={logoutModalOpen}
        userEmail={userEmail}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        userEmail={userEmail}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Main Security Configuration Panel */}
      <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E9EAF0]">
          <div>
            <h2 className="text-base font-bold text-[#242633] tracking-tight">
              Security & Credentials
            </h2>
            <p className="text-xs text-[#858A99] mt-0.5">
              Password credentials, active browser sessions and account protection.
            </p>
          </div>
          {(passwordSuccess || statusNotice) && (
            <span className="text-xs text-[#29A36A] font-semibold flex items-center gap-1.5 bg-[#EDF8F2] px-3 py-1 rounded-full border border-[#D4EEDB]">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              {passwordSuccess || statusNotice}
            </span>
          )}
        </div>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-[#7185E8]" />
            <h3 className="text-xs font-bold text-[#242633]">Password Management</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <label className="text-xs font-semibold text-[#242633] pt-2">
              Current Password
            </label>
            <div className="sm:col-span-2 relative max-w-md">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: '' }));
                }}
                className={`w-full h-10 pl-3.5 pr-10 rounded-xl bg-white border text-xs text-[#242633] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all ${
                  errors.currentPassword ? 'border-red-400 bg-red-50/20' : 'border-[#E9EAF0]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-3 text-[#858A99] hover:text-[#242633] cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.currentPassword && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.currentPassword}</span>
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-[#E9EAF0] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <label className="text-xs font-semibold text-[#242633] pt-2">
              New Password
            </label>
            <div className="sm:col-span-2 relative max-w-md">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                }}
                placeholder="At least 8 characters"
                className={`w-full h-10 pl-3.5 pr-10 rounded-xl bg-white border text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all ${
                  errors.newPassword ? 'border-red-400 bg-red-50/20' : 'border-[#E9EAF0]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 text-[#858A99] hover:text-[#242633] cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.newPassword && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.newPassword}</span>
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-[#E9EAF0] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <label className="text-xs font-semibold text-[#242633] pt-2">
              Confirm New Password
            </label>
            <div className="sm:col-span-2 relative max-w-md">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                className={`w-full h-10 pl-3.5 pr-10 rounded-xl bg-white border text-xs text-[#242633] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all ${
                  errors.confirmPassword ? 'border-red-400 bg-red-50/20' : 'border-[#E9EAF0]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-[#858A99] hover:text-[#242633] cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.confirmPassword && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white shadow-subtle shadow-[#7185E8]/20 transition-all cursor-pointer active:scale-98"
            >
              Update Password
            </button>
          </div>
        </form>

        {/* Active Sessions */}
        <div className="pt-6 border-t border-[#E9EAF0] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#7185E8]" />
              <div>
                <h3 className="text-xs font-bold text-[#242633]">Active Sessions</h3>
                <p className="text-[11px] text-[#858A99]">Authorized devices currently logged into your account</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              className="h-8 px-3 rounded-xl border border-[#E9EAF0] hover:bg-[#F7F8FA] text-xs font-semibold text-[#858A99] hover:text-[#242633] transition-all cursor-pointer self-start sm:self-auto"
            >
              Log Out Other Sessions
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#E9EAF0] flex items-center justify-center text-[#7185E8] shadow-xs">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-[#242633]">Desktop Chrome &bull; macOS</p>
                <p className="text-[11px] text-[#858A99]">San Francisco, USA &bull; Active right now</p>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold text-[#29A36A] bg-[#EDF8F2] px-2 py-0.5 rounded-md border border-[#D4EEDB]">
              Current Device
            </span>
          </div>
        </div>

        {/* Danger Zone: Account Deletion */}
        <div className="pt-6 border-t border-[#E9EAF0]">
          <div className="p-5 rounded-2xl border border-red-200 bg-red-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Delete Account &amp; Workspace</span>
              </h3>
              <p className="text-[11px] text-[#858A99] leading-relaxed max-w-md">
                Permanently deletes your personal profile, disassociates all indexed documents and destroys vector cache embeddings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white shadow-subtle shadow-red-600/20 transition-all cursor-pointer shrink-0 active:scale-98"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
