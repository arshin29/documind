'use client';

import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  Users,
  Sparkles,
} from 'lucide-react';
import {
  WorkspaceData,
  updateWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
} from '@/data/settings-store';
import { InviteMemberModal } from './InviteMemberModal';

interface WorkspaceSettingsProps {
  workspace: WorkspaceData;
  onWorkspaceUpdated?: (updated: WorkspaceData) => void;
}

export function WorkspaceSettings({
  workspace,
  onWorkspaceUpdated,
}: WorkspaceSettingsProps) {
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description);
  const [nameError, setNameError] = useState<string | null>(null);

  const [autoSummarize, setAutoSummarize] = useState(true);
  const [semanticSearch, setSemanticSearch] = useState(true);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setNameError('Workspace name cannot be empty.');
      return;
    }
    if (workspaceName.trim().length < 2) {
      setNameError('Workspace name must be at least 2 characters.');
      return;
    }

    const updated = updateWorkspace({
      name: workspaceName.trim(),
      description: description.trim(),
    });

    if (onWorkspaceUpdated) {
      onWorkspaceUpdated(updated);
    }

    setNameError(null);
    setFeedback('Workspace details updated');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleInviteSuccess = (member: {
    name: string;
    email: string;
    role: 'Owner' | 'Editor' | 'Viewer';
    avatarInitials: string;
  }) => {
    addWorkspaceMember(member);
    setFeedback(`Invitation sent to ${member.email}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemoveMember = (id: string, name: string) => {
    if (confirm(`Remove ${name} from this workspace?`)) {
      removeWorkspaceMember(id);
      setFeedback(`${name} removed`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Owner':
        return 'bg-[#EEF0FF] text-[#7185E8] border-[#E0E4FA]';
      case 'Editor':
        return 'bg-[#EDF8F2] text-[#29A36A] border-[#D4EEDB]';
      default:
        return 'bg-[#F7F8FA] text-[#858A99] border-[#E9EAF0]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInviteSuccess}
      />

      {/* Main Workspace Configuration Panel */}
      <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E9EAF0]">
          <div>
            <h2 className="text-base font-bold text-[#242633] tracking-tight">
              Workspace Settings
            </h2>
            <p className="text-xs text-[#858A99] mt-0.5">
              Organization identity, subscription tier and AI pipeline defaults.
            </p>
          </div>
          {feedback && (
            <span className="text-xs text-[#29A36A] font-semibold flex items-center gap-1.5 bg-[#EDF8F2] px-3 py-1 rounded-full border border-[#D4EEDB]">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              {feedback}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveWorkspace} className="space-y-5">
          {/* Workspace Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <label className="text-xs font-semibold text-[#242633] pt-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#858A99]" />
              <span>Workspace Name</span>
            </label>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                className={`w-full max-w-md h-10 px-3.5 rounded-xl bg-white border text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all ${
                  nameError ? 'border-red-400 bg-red-50/20' : 'border-[#E9EAF0]'
                }`}
              />
              {nameError && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{nameError}</span>
                </p>
              )}
            </div>
          </div>

          {/* Plan Tier */}
          <div className="border-t border-[#E9EAF0] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
            <label className="text-xs font-semibold text-[#242633]">
              Subscription Plan
            </label>
            <div className="sm:col-span-2 flex items-center gap-3 text-xs">
              <span className="font-mono text-xs font-bold text-[#7185E8] bg-[#EEF0FF] px-2.5 py-1 rounded-lg border border-[#E0E4FA]">
                {workspace.plan} Tier
              </span>
              <span className="text-[#858A99] font-medium">{workspace.planPrice}</span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-[#E9EAF0] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
            <div>
              <label className="text-xs font-semibold text-[#242633] block">
                Workspace Purpose
              </label>
              <span className="text-[11px] text-[#858A99]">Mission statement or project scope</span>
            </div>
            <div className="sm:col-span-2">
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full max-w-md p-3 rounded-xl bg-white border border-[#E9EAF0] text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Intelligence Pipeline Toggles */}
          <div className="border-t border-[#E9EAF0] pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#7185E8]" />
              <h3 className="text-xs font-bold text-[#242633]">Intelligence Processing Pipeline</h3>
            </div>
            <div className="divide-y divide-[#E9EAF0]">
              <div className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#242633]">Automated Document Ingestion</p>
                  <p className="text-[11px] text-[#858A99] mt-0.5">
                    Extract topics, metrics and generate summaries automatically
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoSummarize}
                    onChange={(e) => setAutoSummarize(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-[#E9EAF0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7185E8] shadow-xs" />
                </label>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#242633]">Vector Embedding Indexing</p>
                  <p className="text-[11px] text-[#858A99] mt-0.5">
                    Chunk documents for precision citation matching in AI Workspace
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={semanticSearch}
                    onChange={(e) => setSemanticSearch(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-[#E9EAF0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7185E8] shadow-xs" />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E9EAF0] flex items-center justify-end">
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white shadow-subtle shadow-[#7185E8]/20 transition-all cursor-pointer active:scale-98"
            >
              Save Workspace
            </button>
          </div>
        </form>
      </div>

      {/* Team Members Management Panel */}
      <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E9EAF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#242633] tracking-tight">
                Team Members ({workspace.members.length})
              </h2>
              <p className="text-xs text-[#858A99] mt-0.5">
                Collaborators with role-based access to workspace documents.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white shadow-subtle shadow-[#7185E8]/20 transition-all cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Invite Member</span>
          </button>
        </div>

        <div className="divide-y divide-[#E9EAF0]">
          {workspace.members.map((member) => (
            <div
              key={member.id}
              className="py-3 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#EEF0FF] text-[#7185E8] font-bold flex items-center justify-center text-xs shrink-0 border border-[#E0E4FA]">
                  {member.avatarInitials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-[#242633] truncate">
                    {member.name}
                  </p>
                  <p className="text-[11px] text-[#858A99] truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getRoleBadge(
                    member.role
                  )}`}
                >
                  {member.role}
                </span>

                {member.role !== 'Owner' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className="w-7 h-7 rounded-lg text-[#858A99] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
