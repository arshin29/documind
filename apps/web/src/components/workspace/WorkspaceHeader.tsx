'use client';

import { FileText, Sparkles, ChevronDown, Plus, Layers, Bot } from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';

interface WorkspaceHeaderProps {
  document: DocumentItem;
  allDocuments: DocumentItem[];
  onSelectDocument: (docId: string) => void;
  mobileActiveTab: 'document' | 'chat';
  onMobileTabChange: (tab: 'document' | 'chat') => void;
  onNewConversation: () => void;
  conversationCount?: number;
}

export function WorkspaceHeader({
  document,
  allDocuments,
  onSelectDocument,
  mobileActiveTab,
  onMobileTabChange,
  onNewConversation,
  conversationCount,
}: WorkspaceHeaderProps) {
  const getFormatBadge = (type: DocumentItem['type']) => {
    switch (type) {
      case 'PDF':
        return 'text-[#7185E8] bg-[#EEF0FF] border-[#E0E4FA]';
      case 'DOCX':
        return 'text-[#29A36A] bg-[#EDF8F2] border-[#D4EEDB]';
      case 'TXT':
        return 'text-[#E6A13A] bg-[#FEF7ED] border-[#FCE7D0]';
      default:
        return 'text-[#858A99] bg-[#F7F8FA] border-[#E9EAF0]';
    }
  };

  return (
    <div className="space-y-3 pb-3 shrink-0">
      {/* Top Header Row */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9EAF0]">
        {/* Left: Title & Document Context */}
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#242633] tracking-tight">
              AI Workspace
            </h1>
            <span className="text-[11px] font-semibold text-[#7185E8] bg-[#EEF0FF] px-2 py-0.5 rounded-full border border-[#E0E4FA]">
              Interactive
            </span>
          </div>

          <span className="hidden sm:inline text-[#D8DAE5]">&bull;</span>

          {/* Document Selector Dropdown */}
          <div className="relative flex items-center min-w-0">
            <div className="relative flex items-center">
              <FileText className="w-3.5 h-3.5 text-[#858A99] absolute left-2.5 pointer-events-none stroke-[1.75]" />
              <select
                value={document.id}
                aria-label="Select document to query"
                onChange={(e) => onSelectDocument(e.target.value)}
                className="appearance-none pl-8 pr-7 py-1.5 rounded-xl bg-white border border-[#E9EAF0] hover:border-[#D8DAE5] text-xs font-semibold text-[#242633] cursor-pointer focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 shadow-subtle max-w-[220px] sm:max-w-[280px] truncate transition-all"
              >
                {allDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#858A99] absolute right-2 pointer-events-none stroke-[1.75]" />
            </div>

            {/* Format Pill */}
            <span
              className={`ml-1.5 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getFormatBadge(
                document.type
              )}`}
            >
              {document.type}
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Metadata chips */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E9EAF0] shadow-subtle text-xs text-[#858A99]">
            <span className="flex items-center gap-1 font-mono text-[#242633]">
              <Layers className="w-3.5 h-3.5 text-[#7185E8]" />
              {document.pages || 10} pages
            </span>
            <span>&bull;</span>
            <span className="font-mono text-[#525666]">{document.chunksCount} chunks</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-[#29A36A] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#29A36A]" />
              {document.status}
            </span>
          </div>

          {/* New Thread Action */}
          <button
            type="button"
            onClick={onNewConversation}
            className="h-8 px-3 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-subtle shadow-[#7185E8]/25 transition-all cursor-pointer active:scale-98"
            title="Start new conversation thread"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Thread</span>
          </button>
        </div>
      </section>

      {/* Mobile Tab Switcher (Document vs Assistant) */}
      <div className="lg:hidden">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white border border-[#E9EAF0] shadow-subtle">
          <button
            type="button"
            onClick={() => onMobileTabChange('document')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mobileActiveTab === 'document'
                ? 'bg-[#EEF0FF] text-[#7185E8] shadow-xs'
                : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Document ({document.pages || 10}p)</span>
          </button>

          <button
            type="button"
            onClick={() => onMobileTabChange('chat')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mobileActiveTab === 'chat'
                ? 'bg-[#EEF0FF] text-[#7185E8] shadow-xs'
                : 'text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7185E8]" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>
    </div>
  );
}

