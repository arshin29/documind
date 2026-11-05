'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Sparkles,
  Files,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { INITIAL_DOCUMENTS, DocumentItem } from '@/data/mock-data';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpload: () => void;
  documents?: DocumentItem[];
}

export function CommandPalette({ isOpen, onClose, onOpenUpload, documents = INITIAL_DOCUMENTS }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener for Cmd+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredDocs = useMemo(() => {
    if (!query.trim()) return documents.slice(0, 4);
    const q = query.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.keyTopics.some((t) => t.toLowerCase().includes(q))
    );
  }, [query, documents]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Palette Box */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[#E9EAF0] shadow-card overflow-hidden z-10">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 h-12 border-b border-[#E9EAF0] gap-2.5">
          <Search className="w-4 h-4 text-[#858A99] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, topics, or jump to..."
            className="w-full bg-transparent text-xs text-[#242633] placeholder:text-[#858A99] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[11px] text-[#858A99] hover:text-[#242633]"
            >
              Clear
            </button>
          )}
          <kbd className="text-[10px] font-mono text-[#858A99] px-1.5 py-0.5 rounded bg-[#F7F8FA] border border-[#E9EAF0]">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="p-3 max-h-[360px] overflow-y-auto space-y-3 text-xs">
          {/* Quick Actions */}
          {!query && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-[#858A99]">
                Quick Actions
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    onClose();
                    onOpenUpload();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F8FA] text-[#242633] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-xs">Upload document</span>
                  </div>
                  <span className="text-[11px] text-[#858A99] font-mono">PDF, DOCX, TXT</span>
                </button>

                <button
                  onClick={() => navigateTo('/workspace')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F8FA] text-[#242633] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-xs">Open AI Workspace</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#858A99]" />
                </button>

                <button
                  onClick={() => navigateTo('/documents')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F8FA] text-[#242633] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#F7F8FA] text-[#858A99] flex items-center justify-center">
                      <Files className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-xs">Browse all documents</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#858A99]" />
                </button>
              </div>
            </div>
          )}

          {/* Documents Section */}
          <div>
            <div className="px-2 py-1 text-[11px] font-semibold text-[#858A99] flex justify-between">
              <span>Documents</span>
              <span className="font-mono text-[10px] bg-[#F7F8FA] px-1.5 py-0.5 rounded border border-[#E9EAF0]">{filteredDocs.length}</span>
            </div>

            {filteredDocs.length > 0 ? (
              <div className="space-y-1">
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => navigateTo(`/workspace?doc=${doc.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#F7F8FA] text-[#242633] transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate text-[#242633] group-hover:text-[#7185E8] transition-colors">
                          {doc.title}
                        </p>
                        <p className="text-[11px] text-[#858A99] truncate">
                          {doc.summary}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[#858A99] bg-[#F7F8FA] px-1.5 py-0.5 rounded border border-[#E9EAF0] shrink-0 font-medium">
                      {doc.type}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-[#858A99] text-xs">
                No matching documents for &quot;{query}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#E9EAF0] bg-[#F7F8FA] flex items-center justify-between text-[11px] text-[#858A99]">
          <span>Navigation: <kbd className="font-mono bg-white px-1.5 py-0.5 border border-[#E9EAF0] rounded text-[10px]">↑</kbd> <kbd className="font-mono bg-white px-1.5 py-0.5 border border-[#E9EAF0] rounded text-[10px]">↓</kbd></span>
          <span className="font-mono text-[10px] font-semibold text-[#7185E8]">DocuMind</span>
        </div>
      </div>
    </div>
  );
}
