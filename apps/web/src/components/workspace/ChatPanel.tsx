'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Plus, History, Bot } from 'lucide-react';
import { DocumentItem, WorkspaceMessage } from '@/data/mock-data';
import { WorkspaceConversation } from '@/data/workspace-data';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ConversationHistory } from './ConversationHistory';

interface ChatPanelProps {
  document: DocumentItem;
  conversation: WorkspaceConversation | null;
  conversations: WorkspaceConversation[];
  isGenerating: boolean;
  onSendMessage: (query: string) => void;
  onRegenerateMessage: (msgId: string) => void;
  onNavigateToPage: (page: number, documentId?: string) => void;
  onSelectConversation: (convId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (convId: string) => void;
}

export function ChatPanel({
  document,
  conversation,
  conversations,
  isGenerating,
  onSendMessage,
  onRegenerateMessage,
  onNavigateToPage,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ChatPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = conversation?.messages || [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isGenerating]);

  return (
    <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden relative">
      {/* AI Assistant Header: Subtle lavender-tinted background */}
      <div className="h-14 px-4 sm:px-5 border-b border-[#DDE1EB] flex items-center justify-between shrink-0 bg-[#F3F2FF] z-10">
        {/* Left: AI ASSISTANT Section Label, Icon, Title & Active Document Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#7185E8] uppercase bg-[#EAE8FE] px-2 py-0.5 rounded border border-[#DAD8F8] shrink-0">
            AI ASSISTANT
          </span>

          <div className="w-7 h-7 rounded-lg bg-white text-[#7185E8] border border-[#DAD8F8] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 stroke-[2]" />
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-bold text-[#242633] truncate leading-tight">
              Intelligence Assistant
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[#858A99] truncate mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#29A36A] shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[190px]" title={document.title}>
                {document.title}
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Actions: New Thread & History Drawer */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNewConversation}
            className="h-8 px-2.5 rounded-xl border border-[#DAD8F8] hover:border-[#7185E8]/40 bg-white hover:bg-[#EAE8FE]/50 text-xs font-semibold text-[#242633] flex items-center gap-1.5 transition-all shadow-subtle cursor-pointer active:scale-95"
            title="Start new conversation"
          >
            <Plus className="w-3.5 h-3.5 text-[#7185E8] stroke-[2.5]" />
            <span className="hidden sm:inline">New Thread</span>
          </button>

          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="h-8 px-2.5 rounded-xl border border-[#DAD8F8] hover:border-[#7185E8]/40 bg-white hover:bg-[#EAE8FE]/50 text-[#858A99] hover:text-[#242633] transition-all shadow-subtle flex items-center gap-1.5 relative cursor-pointer active:scale-95"
            title="Conversation history"
            aria-label="Conversation history"
          >
            <History className="w-3.5 h-3.5 stroke-[1.75]" />
            {conversations.length > 0 && (
              <span className="font-mono text-[10px] font-bold text-[#7185E8] bg-[#EEF0FF] px-1.5 py-0.2 rounded-full border border-[#DAD8F8]">
                {conversations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Message List or Welcome State: Very light chat conversation background #FAFAFD */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col bg-[#FAFAFD]">
        {messages.length === 0 ? (
          <SuggestedQuestions
            documentTitle={document.title}
            onSelectQuestion={onSendMessage}
          />
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onNavigateToPage={onNavigateToPage}
                onRegenerate={onRegenerateMessage}
              />
            ))}

            {isGenerating &&
              !messages.some((m) => m.sender === 'assistant' && !m.content) && (
                <div className="flex items-start gap-2.5 my-3.5 max-w-lg animate-in fade-in duration-150 text-left">
                  <div className="w-7 h-7 rounded-xl bg-[#EEF0FF] text-[#7185E8] border border-[#DAD8F8] flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-sm bg-white border border-[#E9EAF0] text-xs text-[#858A99] flex items-center gap-2 shadow-card">
                    <span className="w-2 h-2 rounded-full bg-[#7185E8] animate-pulse" />
                    <span className="text-[#242633] font-medium">
                      Synthesizing document context with citations...
                    </span>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Composer */}
      <ChatComposer
        onSendMessage={onSendMessage}
        isGenerating={isGenerating}
        placeholder={`Ask questions about ${document.title}...`}
      />

      {/* Conversation History Drawer */}
      <ConversationHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        activeConversationId={conversation?.id || ''}
        onSelectConversation={onSelectConversation}
        onNewConversation={onNewConversation}
        onDeleteConversation={onDeleteConversation}
      />
    </div>
  );
}

