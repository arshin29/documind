'use client';

import React from 'react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail?: string;
}

export function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
}: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card w-full max-w-sm overflow-hidden">
        <div className="p-6 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-[#242633]">Sign Out</h3>
            <p className="text-xs text-[#858A99] mt-1 leading-relaxed">
              Are you sure you want to end your current session?
            </p>
          </div>

          {userEmail && (
            <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] text-xs text-[#858A99]">
              Active account:{' '}
              <span className="text-[#242633] font-semibold">{userEmail}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E9EAF0]">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-[#E9EAF0] text-xs font-medium text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5E72D6] text-xs font-semibold text-white shadow-sm transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
