'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Sparkles,
  Eye,
  Download,
  Trash2,
  Edit3,
  MoreHorizontal,
} from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';
import { triggerDocumentDownload } from '@/lib/documents';

interface DocumentsTableProps {
  documents: DocumentItem[];
  totalDocumentsCount: number;
  onPreview: (doc: DocumentItem) => void;
  onRename: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

interface MenuState {
  doc: DocumentItem;
  top: number;
  left: number;
  openAbove: boolean;
}

const MENU_WIDTH = 176; // w-44 = 11rem = 176px
const ESTIMATED_MENU_HEIGHT = 196; // 4 items + divider + 1 item + vertical padding

function calculateMenuPosition(
  anchorEl: HTMLElement,
  menuEl?: HTMLElement | null,
) {
  const rect = anchorEl.getBoundingClientRect();
  const menuHeight = menuEl?.offsetHeight || ESTIMATED_MENU_HEIGHT;
  const menuWidth = MENU_WIDTH;

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const shouldOpenAbove =
    spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;

  let top: number;
  if (shouldOpenAbove) {
    top = Math.max(8, rect.top - menuHeight - 4);
  } else {
    top = Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 4);
  }

  // Align right edge of menu with right edge of button
  let left = rect.right - menuWidth;
  // Ensure menu stays within horizontal viewport boundaries on small screens
  if (left < 8) {
    left = 8;
  } else if (left + menuWidth > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - menuWidth - 8);
  }

  return { top, left, openAbove: shouldOpenAbove };
}

export function DocumentsTable({
  documents,
  totalDocumentsCount,
  onPreview,
  onRename,
  onDelete,
}: DocumentsTableProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuState | null>(null);

  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = useCallback(() => {
    setActiveMenu(null);
  }, []);

  const toggleMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    doc: DocumentItem,
  ) => {
    e.stopPropagation();
    if (activeMenu?.doc.id === doc.id) {
      closeMenu();
    } else {
      const button = e.currentTarget;
      triggerButtonRef.current = button;
      const pos = calculateMenuPosition(button, menuDropdownRef.current);
      setActiveMenu({
        doc,
        top: pos.top,
        left: pos.left,
        openAbove: pos.openAbove,
      });
    }
  };

  // Recompute position on resize, scroll, and handle outside clicks / escape key
  useEffect(() => {
    if (!activeMenu || !triggerButtonRef.current) return;

    const handleUpdate = () => {
      if (!triggerButtonRef.current) return;
      const pos = calculateMenuPosition(
        triggerButtonRef.current,
        menuDropdownRef.current,
      );
      setActiveMenu((prev) => (prev ? { ...prev, ...pos } : null));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeMenu();
        triggerButtonRef.current?.focus();
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuDropdownRef.current &&
        !menuDropdownRef.current.contains(target) &&
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [activeMenu, closeMenu]);

  const getStatusBadge = (status: DocumentItem['status']) => {
    switch (status) {
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EDF8F2] text-[#29A36A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#29A36A]" />
            Ready
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF0FF] text-[#7185E8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7185E8] animate-pulse" />
            Processing
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF7ED] text-[#E6A13A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E6A13A]" />
            Failed
          </span>
        );
    }
  };

  const getFormatBadge = (type: DocumentItem['type']) => {
    switch (type) {
      case 'PDF':
        return (
          <span className="font-mono text-[11px] font-medium text-[#7185E8] bg-[#EEF0FF] px-2 py-0.5 rounded-md border border-[#E0E4FA]">
            PDF
          </span>
        );
      case 'DOCX':
        return (
          <span className="font-mono text-[11px] font-medium text-[#29A36A] bg-[#EDF8F2] px-2 py-0.5 rounded-md border border-[#D4EEDB]">
            DOCX
          </span>
        );
      case 'TXT':
        return (
          <span className="font-mono text-[11px] font-medium text-[#E6A13A] bg-[#FEF7ED] px-2 py-0.5 rounded-md border border-[#FCE7D0]">
            TXT
          </span>
        );
    }
  };

  const getFormatIconContainer = (type: DocumentItem['type']) => {
    switch (type) {
      case 'PDF':
        return 'bg-[#EEF0FF] text-[#7185E8]';
      case 'DOCX':
        return 'bg-[#EDF8F2] text-[#29A36A]';
      case 'TXT':
        return 'bg-[#FEF7ED] text-[#E6A13A]';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[760px]">
          <thead>
            <tr className="border-b border-[#E9EAF0] text-[#858A99] text-[11px] font-medium bg-[#FAFAFC]">
              <th className="py-3 px-4 font-medium">Document</th>
              <th className="py-3 px-3 font-medium">Format</th>
              <th className="py-3 px-3 font-medium">Date Added</th>
              <th className="py-3 px-3 font-medium">Size</th>
              <th className="py-3 px-3 font-medium">Chunks</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9EAF0]/70">
            {documents.map((doc) => {
              const isMenuOpen = activeMenu?.doc.id === doc.id;

              return (
                <tr
                  key={doc.id}
                  onClick={() => onPreview(doc)}
                  className="hover:bg-[#F7F8FA] cursor-pointer transition-colors group"
                >
                  {/* Document Column: Icon, Title & Summary */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl ${getFormatIconContainer(
                          doc.type,
                        )} flex items-center justify-center shrink-0 shadow-xs`}
                      >
                        <FileText className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <div className="min-w-0 max-w-[260px] sm:max-w-[340px]">
                        <p className="font-semibold text-xs text-[#242633] truncate group-hover:text-[#7185E8] transition-colors">
                          {doc.title}
                        </p>
                        <p className="text-[11px] text-[#858A99] truncate mt-0.5">
                          {doc.summary}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Format Column */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getFormatBadge(doc.type)}
                  </td>

                  {/* Date Added Column */}
                  <td className="py-3 px-3 text-[#858A99] text-xs whitespace-nowrap font-mono">
                    {doc.dateAdded}
                  </td>

                  {/* Size Column */}
                  <td className="py-3 px-3 text-[#525666] font-mono text-xs whitespace-nowrap">
                    {doc.size}
                  </td>

                  {/* Chunks Column */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#242633] bg-[#F7F8FA] px-2 py-0.5 rounded-md border border-[#E9EAF0]">
                        <Sparkles className="w-2.5 h-2.5 text-[#7185E8]" />
                        {doc.chunksCount} chunks
                      </span>
                      {doc.embeddingStatus && (
                        <span
                          className={`text-[9px] font-mono tracking-tight pl-1 ${
                            doc.embeddingStatus === 'COMPLETED'
                              ? 'text-[#29A36A]'
                              : doc.embeddingStatus === 'PROCESSING'
                              ? 'text-[#7185E8]'
                              : doc.embeddingStatus === 'FAILED'
                              ? 'text-[#E55353]'
                              : 'text-[#858A99]'
                          }`}
                          title={`Vector Status: ${doc.embeddingStatus}`}
                        >
                          {doc.embeddingStatus === 'COMPLETED'
                            ? '● vectorized'
                            : doc.embeddingStatus === 'PROCESSING'
                            ? '● vectorizing...'
                            : doc.embeddingStatus === 'FAILED'
                            ? '● vector failed'
                            : '○ pending vector'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Column */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getStatusBadge(doc.status)}
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-4 text-right">
                    <div
                      className="inline-flex items-center gap-1 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/workspace?doc=${doc.id}`)}
                        className="w-7 h-7 rounded-lg hover:bg-[#EEF0FF] text-[#858A99] hover:text-[#7185E8] inline-flex items-center justify-center transition-colors"
                        title="Ask in AI Workspace"
                      >
                        <Sparkles className="w-3.5 h-3.5 stroke-[1.75]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onPreview(doc)}
                        className="w-7 h-7 rounded-lg hover:bg-[#F4F5F9] text-[#858A99] hover:text-[#242633] inline-flex items-center justify-center transition-colors"
                        title="Preview Document Details"
                      >
                        <Eye className="w-3.5 h-3.5 stroke-[1.75]" />
                      </button>

                      {/* Dropdown Menu Trigger Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleMenu(e, doc)}
                        className={`w-7 h-7 rounded-lg text-[#858A99] hover:text-[#242633] inline-flex items-center justify-center transition-colors ${isMenuOpen ? 'bg-[#EEF0FF] text-[#7185E8]' : 'hover:bg-[#F4F5F9]'
                          }`}
                        title="More options"
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-3 bg-[#FAFAFC] border-t border-[#E9EAF0] flex items-center justify-between text-[11px] text-[#858A99]">
        <span>
          Showing{' '}
          <span className="font-semibold text-[#242633]">
            {documents.length}
          </span>{' '}
          of {totalDocumentsCount} documents
        </span>
        <span className="font-mono text-[#858A99]">
          All chunks indexed &bull; Ready for AI queries
        </span>
      </div>

      {/* Floating Actions Dropdown Menu rendered via React Portal */}
      {mounted &&
        activeMenu &&
        createPortal(
          <div
            ref={menuDropdownRef}
            role="menu"
            aria-orientation="vertical"
            style={{
              position: 'fixed',
              top: `${activeMenu.top}px`,
              left: `${activeMenu.left}px`,
              zIndex: 9999,
            }}
            className={`w-44 bg-white rounded-xl border border-[#E9EAF0] shadow-dropdown py-1 text-xs text-left animate-in fade-in duration-100 ${activeMenu.openAbove
                ? 'slide-in-from-bottom-1'
                : 'slide-in-from-top-1'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const doc = activeMenu.doc;
                closeMenu();
                onPreview(doc);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[#242633] hover:bg-[#F4F5F9] transition-colors focus:bg-[#F4F5F9] focus:outline-none"
            >
              <Eye className="w-3.5 h-3.5 text-[#858A99]" />
              <span>Preview details</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const doc = activeMenu.doc;
                closeMenu();
                router.push(`/workspace?doc=${doc.id}`);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[#242633] hover:bg-[#F4F5F9] transition-colors focus:bg-[#F4F5F9] focus:outline-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7185E8]" />
              <span>Ask AI</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const doc = activeMenu.doc;
                closeMenu();
                triggerDocumentDownload(doc);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[#242633] hover:bg-[#F4F5F9] transition-colors focus:bg-[#F4F5F9] focus:outline-none"
            >
              <Download className="w-3.5 h-3.5 text-[#858A99]" />
              <span>Download metadata</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const doc = activeMenu.doc;
                closeMenu();
                onRename(doc);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[#242633] hover:bg-[#F4F5F9] transition-colors focus:bg-[#F4F5F9] focus:outline-none"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#858A99]" />
              <span>Rename document</span>
            </button>

            <div className="my-1 border-t border-[#E9EAF0]" />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const doc = activeMenu.doc;
                closeMenu();
                onDelete(doc);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[#E55353] hover:bg-[#FDF2F2] transition-colors focus:bg-[#FDF2F2] focus:outline-none"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#E55353]" />
              <span>Delete document</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
