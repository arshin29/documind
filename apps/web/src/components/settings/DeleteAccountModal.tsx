'use client';

import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail?: string;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm account removal.');
      return;
    }
    setError(null);
    onConfirm();
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E9EAF0] flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-700">Delete Account</h3>
              <p className="text-[11px] text-red-500">Irreversible action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#858A99] hover:text-[#242633] hover:bg-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-[#858A99] leading-relaxed">
            This action will permanently delete your account, cancel all active subscriptions, revoke access to your documents, and remove your workspace data. <strong className="text-[#242633]">This cannot be undone.</strong>
          </p>

          <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E9EAF0] space-y-1.5">
            <label className="text-xs font-medium text-[#242633] block">
              Type <span className="font-mono font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="DELETE"
              className="w-full h-9 px-3 rounded-lg bg-white border border-[#E9EAF0] text-xs text-[#242633] font-mono focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all placeholder:text-[#858A99]/50"
            />
            {error && (
              <p className="text-[11px] font-medium text-red-600 mt-1">{error}</p>
            )}
          </div>

          <div className="pt-3 border-t border-[#E9EAF0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-[#E9EAF0] text-xs font-medium text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmText.trim().toUpperCase() !== 'DELETE'}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white shadow-sm transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Permanently Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
