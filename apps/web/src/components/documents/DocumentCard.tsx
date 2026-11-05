'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Eye,
  Sparkles,
  Download,
  Edit3,
  Trash2,
} from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';
import { triggerDocumentDownload } from '@/lib/documents';

interface DocumentCardProps {
  document: DocumentItem;
  onPreview: (doc: DocumentItem) => void;
  onRename: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

// Helpers for stylish visual document preview cards matching approved Overview aesthetics
function getCategoryForDoc(doc: DocumentItem): { label: string; bg: string; text: string } {
  const title = doc.title.toLowerCase();
  if (title.includes('report') || title.includes('annual')) {
    return { label: 'Product', bg: 'bg-[#EDF8F2]', text: 'text-[#29A36A]' };
  }
  if (title.includes('research') || title.includes('user')) {
    return { label: 'Research', bg: 'bg-[#EEF0FF]', text: 'text-[#7185E8]' };
  }
  if (title.includes('market') || title.includes('growth')) {
    return { label: 'Marketing', bg: 'bg-[#FEF7ED]', text: 'text-[#E6A13A]' };
  }
  if (title.includes('financial') || title.includes('earning')) {
    return { label: 'Operations', bg: 'bg-[#F4EEFB]', text: 'text-[#9A8AE8]' };
  }
  if (title.includes('legal') || title.includes('nda')) {
    return { label: 'Legal', bg: 'bg-[#EDF5FD]', text: 'text-[#4A88D9]' };
  }
  return { label: 'Document', bg: 'bg-[#F7F8FA]', text: 'text-[#858A99]' };
}

function getAvatarForAuthor(author?: string): { initials: string; bg: string } {
  if (!author) return { initials: 'AK', bg: 'bg-[#7185E8]' };
  if (author.includes('Finance')) return { initials: 'FT', bg: 'bg-[#29A36A]' };
  if (author.includes('UX') || author.includes('Product')) return { initials: 'PR', bg: 'bg-[#7185E8]' };
  if (author.includes('Marketing') || author.includes('Growth')) return { initials: 'MK', bg: 'bg-[#E6A13A]' };
  if (author.includes('Legal')) return { initials: 'LC', bg: 'bg-[#9A8AE8]' };
  return { initials: 'AK', bg: 'bg-[#7185E8]' };
}

export function DocumentCard({
  document: doc,
  onPreview,
  onRename,
  onDelete,
}: DocumentCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close actions menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const category = getCategoryForDoc(doc);
  const author = getAvatarForAuthor(doc.author);
  const displayTitle = doc.title.replace(/\.[^/.]+$/, '');

  const getStatusBadge = (status: DocumentItem['status']) => {
    switch (status) {
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EDF8F2] text-[#29A36A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#29A36A]" />
            Ready
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EEF0FF] text-[#7185E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] animate-pulse" />
            Processing
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF7ED] text-[#E6A13A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E6A13A]" />
            Failed
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onPreview(doc)}
      className="group bg-white rounded-2xl border border-[#E9EAF0] p-3.5 shadow-subtle hover:shadow-card hover:border-[#D8DAE5] transition-all duration-200 cursor-pointer flex flex-col justify-between relative"
    >
      {/* Visual Document Preview Canvas */}
      <div className="w-full h-32 bg-[#F7F8FA] rounded-xl border border-[#EFF0F6] p-3 flex flex-col justify-between overflow-hidden relative group-hover:bg-[#F2F4FA] transition-colors">
        {/* Category Pill & Format Badge */}
        <div className="flex items-center justify-between z-10">
          <span
            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${category.bg} ${category.text}`}
          >
            {category.label}
          </span>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/80 border border-[#E9EAF0] text-[#7185E8]">
            {doc.type}
          </span>
        </div>

        {/* Simulated Document Layout Graphics */}
        <div className="space-y-1.5 py-1">
          {/* Miniature headline */}
          <div className="w-3/4 h-1.5 rounded-full bg-[#D8DAE5]" />
          {/* Miniature text lines */}
          <div className="w-full h-1 rounded-full bg-[#E9EAF0]" />
          <div className="w-5/6 h-1 rounded-full bg-[#E9EAF0]" />
          <div className="w-2/3 h-1 rounded-full bg-[#E9EAF0]" />

          {/* Visual accent element based on doc title hash */}
          <div className="pt-1 flex items-center gap-1.5">
            <div className="w-3.5 h-1.5 rounded-xs bg-[#7185E8]/30" />
            <div className="w-6 h-1.5 rounded-xs bg-[#7185E8]/20" />
            <div className="w-3 h-1.5 rounded-xs bg-[#9A8AE8]/20" />
          </div>
        </div>

        {/* Preview Bottom Metadata Bar */}
        <div className="w-full flex items-center justify-between text-[10px] text-[#858A99] border-t border-[#E9EAF0]/60 pt-1.5">
          <span>{doc.pages || 12} pages</span>
          <span className="inline-flex items-center gap-1 font-mono text-[#242633] font-medium">
            <Sparkles className="w-2.5 h-2.5 text-[#7185E8]" />
            {doc.chunksCount} chunks
          </span>
        </div>
      </div>

      {/* Main Card Body */}
      <div className="pt-3 pb-1 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-xs text-[#242633] truncate group-hover:text-[#7185E8] transition-colors"
            title={doc.title}
          >
            {displayTitle}
          </h3>
          {getStatusBadge(doc.status)}
        </div>

        <p className="text-[11px] text-[#858A99] line-clamp-2 leading-relaxed">
          {doc.summary}
        </p>

        {/* Topics Chips */}
        {doc.keyTopics && doc.keyTopics.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {doc.keyTopics.slice(0, 2).map((topic) => (
              <span
                key={topic}
                className="px-1.5 py-0.5 rounded text-[10px] bg-[#F7F8FA] border border-[#E9EAF0] text-[#858A99] truncate max-w-[130px]"
              >
                {topic}
              </span>
            ))}
            {doc.keyTopics.length > 2 && (
              <span className="text-[10px] text-[#A2A7B5] self-center">
                +{doc.keyTopics.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Author, Size, Date and Actions */}
      <div className="pt-2.5 mt-2 border-t border-[#E9EAF0]/70 flex items-center justify-between text-[11px]">
        {/* Author & Date */}
        <div className="flex items-center gap-1.5 text-[#858A99] min-w-0">
          <div
            className={`w-4 h-4 rounded-full ${author.bg} text-white flex items-center justify-center text-[8px] font-semibold shrink-0`}
          >
            {author.initials}
          </div>
          <span className="font-mono text-xs text-[#525666]">{doc.size}</span>
          <span>&bull;</span>
          <span className="truncate">{doc.dateAdded}</span>
        </div>

        {/* Action Menu Trigger */}
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="relative shrink-0"
        >
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 rounded-lg hover:bg-[#F7F8FA] text-[#858A99] hover:text-[#242633] inline-flex items-center justify-center transition-colors"
            title="Document actions"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-xl border border-[#E9EAF0] shadow-dropdown py-1 z-30 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onPreview(doc);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#242633] hover:bg-[#F4F5F9] transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-[#858A99]" />
                <span>Preview details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/workspace?doc=${doc.id}`);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#242633] hover:bg-[#F4F5F9] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7185E8]" />
                <span>Ask in AI Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  triggerDocumentDownload(doc);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#242633] hover:bg-[#F4F5F9] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#858A99]" />
                <span>Download metadata</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onRename(doc);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#242633] hover:bg-[#F4F5F9] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#858A99]" />
                <span>Rename document</span>
              </button>

              <div className="my-1 border-t border-[#E9EAF0]" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(doc);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#E55353] hover:bg-[#FDF2F2] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#E55353]" />
                <span>Delete document</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

