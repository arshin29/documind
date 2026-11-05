'use client';

import React, { useState } from 'react';
import { X, AlertCircle, UserPlus, Mail, Shield } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (member: { name: string; email: string; role: 'Owner' | 'Editor' | 'Viewer'; avatarInitials: string }) => void;
}

export function InviteMemberModal({ isOpen, onClose, onInvite }: InviteMemberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Editor' | 'Viewer'>('Editor');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const initials = name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'TM';

    onInvite({
      name: name.trim(),
      email: email.trim(),
      role,
      avatarInitials: initials,
    });

    setName('');
    setEmail('');
    setRole('Editor');
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E9EAF0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#242633]">Invite Team Member</h3>
              <p className="text-[11px] text-[#858A99]">Grant access to knowledge documents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#242633]">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Miller"
              className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#E9EAF0] text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all"
            />
            {errors.name && (
              <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#242633]">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#E9EAF0] text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all"
            />
            {errors.email && (
              <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#242633]">Workspace Role</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'Editor', label: 'Editor', desc: 'Can upload and query documents' },
                { id: 'Viewer', label: 'Viewer', desc: 'Can view and query only' },
              ].map((r) => {
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#7185E8] bg-[#EEF0FF] text-[#242633] shadow-xs'
                        : 'border-[#E9EAF0] bg-white text-[#525666] hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <span className="font-bold text-xs block text-[#242633]">{r.label}</span>
                    <span className="text-[10px] text-[#858A99] block mt-0.5">{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E9EAF0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-[#E9EAF0] text-xs font-semibold text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white shadow-subtle shadow-[#7185E8]/20 transition-all cursor-pointer active:scale-98"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
