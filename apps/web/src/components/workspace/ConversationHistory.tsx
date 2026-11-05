'use client';

import { X, MessageSquare, Plus, Trash2, Clock, Sparkles } from 'lucide-react';
import { WorkspaceConversation } from '@/data/workspace-data';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationsChange?: () => void;
  conversations: WorkspaceConversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationHistory({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationHistoryProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#242633]/20 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white border-l border-[#E9EAF0] shadow-floating flex flex-col justify-between animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="h-14 px-5 border-b border-[#E9EAF0] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#242633]">
              <div className="w-7 h-7 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 stroke-[1.75]" />
              </div>
              <span>Conversation Threads</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] flex items-center justify-center transition-colors"
              aria-label="Close conversation history"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button Container */}
          <div className="p-3.5 border-b border-[#E9EAF0] bg-[#FAFAFC]">
            <button
              type="button"
              onClick={() => {
                onNewConversation();
                onClose();
              }}
              className="w-full h-9 px-3 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-subtle shadow-[#7185E8]/25 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Start New Thread</span>
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2 text-xs">
            {conversations.length === 0 ? (
              <div className="py-12 text-center text-[#858A99] space-y-2">
                <MessageSquare className="w-7 h-7 mx-auto opacity-30 text-[#7185E8]" />
                <p>No previous conversations found.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectConversation(conv.id);
                        onClose();
                      }
                    }}
                    className={`group w-full p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isActive
                        ? 'border-[#7185E8]/40 bg-[#EEF0FF]/60 text-[#242633] shadow-xs'
                        : 'border-[#E9EAF0] bg-white hover:bg-[#F7F8FA] hover:border-[#D8DAE5] text-[#525666] hover:text-[#242633]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#7185E8]' : 'text-[#858A99]'
                          }`}
                        />
                        <span className="font-semibold text-xs truncate">
                          {conv.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#858A99] font-mono">
                        <span>{conv.updatedAt || conv.createdAt}</span>
                        <span>&bull;</span>
                        <span>{conv.messages.length} messages</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-1 rounded-lg text-[#858A99] hover:text-[#E55353] hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer stats */}
          <div className="p-3.5 border-t border-[#E9EAF0] bg-[#FAFAFC] text-[11px] text-[#858A99] flex items-center justify-between font-mono">
            <span>{conversations.length} saved threads</span>
            <span className="flex items-center gap-1 text-[#7185E8] font-sans font-medium">
              <Sparkles className="w-3 h-3" />
              DocuMind AI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

