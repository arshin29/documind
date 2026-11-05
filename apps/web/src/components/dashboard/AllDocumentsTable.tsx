'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  FileText,
  Filter,
  ArrowUpRight,
  MoreHorizontal,
  Sparkles,
  Eye,
  Trash2,
} from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';

interface AllDocumentsTableProps {
  documents: DocumentItem[];
  onOpenDrawer: (doc: DocumentItem) => void;
  onDeleteDocument?: (id: string) => void;
  maxDisplay?: number;
}

interface MenuState {
  doc: DocumentItem;
  top: number;
  left: number;
  openAbove: boolean;
}

const MENU_WIDTH = 144; // w-36 = 9rem = 144px
const ESTIMATED_MENU_HEIGHT = 120;

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

  let left = rect.right - menuWidth;
  if (left < 8) {
    left = 8;
  } else if (left + menuWidth > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - menuWidth - 8);
  }

  return { top, left, openAbove: shouldOpenAbove };
}

export function AllDocumentsTable({
  documents,
  onOpenDrawer,
  onDeleteDocument,
  maxDisplay = 6,
}: AllDocumentsTableProps) {
  const [mounted, setMounted] = useState(false);
  const [filterType, setFilterType] = useState<
    'ALL' | 'PDF' | 'DOCX' | 'TXT'
  >('ALL');
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

  const filteredDocs =
    filterType === 'ALL'
      ? documents
      : documents.filter((d) => d.type === filterType);

  const displayDocs = filteredDocs.slice(0, maxDisplay);

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

  return (
    <div className="bg-white rounded-2xl border border-[#E9EAF0] shadow-card overflow-hidden">
      {/* Header and Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-[#E9EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <h2 className="text-sm font-bold text-[#242633] tracking-tight">
            All Documents
          </h2>
          <p className="text-xs text-[#858A99] mt-0.5">
            Indexed library and knowledge base assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Format quick filters */}
          <div className="flex items-center bg-[#F7F8FA] p-0.5 rounded-xl border border-[#E9EAF0]">
            {(['ALL', 'PDF', 'DOCX', 'TXT'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  filterType === type
                    ? 'bg-white text-[#242633] shadow-xs font-semibold'
                    : 'text-[#858A99] hover:text-[#242633]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <Link
            href="/documents"
            className="h-8 px-2.5 rounded-xl border border-[#E9EAF0] text-xs font-medium text-[#858A99] hover:text-[#242633] hover:bg-[#F7F8FA] flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" />
          </Link>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[620px]">
          <thead>
            <tr className="border-b border-[#E9EAF0] text-[#858A99] text-[11px] font-medium bg-[#FAFAFC]">
              <th className="py-3 px-4 font-medium">Document</th>
              <th className="py-3 px-3 font-medium">Format</th>
              <th className="py-3 px-3 font-medium">Date Added</th>
              <th className="py-3 px-3 font-medium">Chunks</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9EAF0]/70">
            {displayDocs.length > 0 ? (
              displayDocs.map((doc) => {
                const isMenuOpen = activeMenu?.doc.id === doc.id;

                return (
                  <tr
                    key={doc.id}
                    onClick={() => onOpenDrawer(doc)}
                    className="hover:bg-[#F7F8FA] cursor-pointer transition-colors group"
                  >
                    {/* Document title and size */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 stroke-[1.75]" />
                        </div>
                        <div className="min-w-0 max-w-[200px] sm:max-w-[280px]">
                          <p className="font-semibold text-xs text-[#242633] truncate group-hover:text-[#7185E8] transition-colors">
                            {doc.title}
                          </p>
                          <p className="text-[11px] text-[#858A99] font-mono">
                            {doc.size}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Format badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getFormatBadge(doc.type)}
                    </td>

                    {/* Date Added */}
                    <td className="py-3 px-3 text-[#858A99] text-xs whitespace-nowrap font-mono">
                      {doc.dateAdded}
                    </td>

                    {/* Chunks / Intelligence column */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#242633] bg-[#F7F8FA] px-2 py-0.5 rounded-md border border-[#E9EAF0]">
                        <Sparkles className="w-2.5 h-2.5 text-[#7185E8]" />
                        {doc.chunksCount} chunks
                      </span>
                    </td>

                    {/* Status column */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(doc.status)}
                    </td>

                    {/* Action button */}
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleMenu(e, doc)}
                        className={`w-7 h-7 rounded-lg text-[#858A99] hover:text-[#242633] inline-flex items-center justify-center transition-colors ${
                          isMenuOpen
                            ? 'bg-[#EEF0FF] text-[#7185E8]'
                            : 'hover:bg-[#F7F8FA]'
                        }`}
                        title="Document options"
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-[#858A99] text-xs"
                >
                  No documents match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
            className={`w-36 bg-white rounded-xl border border-[#E9EAF0] shadow-dropdown py-1 z-30 text-left text-xs animate-in fade-in duration-100 ${
              activeMenu.openAbove
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
                onOpenDrawer(doc);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#242633] hover:bg-[#F4F5F9] transition-colors focus:bg-[#F4F5F9] focus:outline-none"
            >
              <Eye className="w-3.5 h-3.5 text-[#858A99]" />
              <span>Preview</span>
            </button>
            <Link
              href={`/workspace?doc=${activeMenu.doc.id}`}
              onClick={closeMenu}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#242633] hover:bg-[#F4F5F9] transition-colors focus:bg-[#F4F5F9] focus:outline-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7185E8]" />
              <span>Ask AI</span>
            </Link>
            {onDeleteDocument && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const doc = activeMenu.doc;
                  closeMenu();
                  onDeleteDocument(doc.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#E55353] hover:bg-[#FDF2F2] transition-colors focus:bg-[#FDF2F2] focus:outline-none"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#E55353]" />
                <span>Delete</span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
