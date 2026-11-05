'use client';

import { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';

interface RenameDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (id: string, newTitle: string) => void;
}

export function RenameDocumentModal({
  document: doc,
  isOpen,
  onClose,
  onRename,
}: RenameDocumentModalProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setError('');
    }
  }, [doc, isOpen]);

  if (!isOpen || !doc) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Document title cannot be empty.');
      return;
    }
    onRename(doc.id, trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#242633]/20 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl border border-[#E9EAF0] p-6 z-10 shadow-floating animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-[#E9EAF0]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EEF0FF] text-[#7185E8] flex items-center justify-center">
              <Edit3 className="w-3.5 h-3.5 stroke-[1.75]" />
            </div>
            <h3 className="text-sm font-semibold text-[#242633]">Rename document</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#F7F8FA] text-[#858A99] hover:text-[#242633] inline-flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="doc-rename-input"
              className="block text-xs font-medium text-[#242633] mb-1.5"
            >
              Document title
            </label>
            <input
              id="doc-rename-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              className="w-full h-9 px-3 rounded-xl bg-white border border-[#E9EAF0] text-xs text-[#242633] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-colors"
            />
            {error && (
              <p className="text-[11px] text-[#E55353] mt-1.5">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E9EAF0]">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-xl border border-[#E9EAF0] hover:border-[#D8DAE5] bg-white text-xs font-medium text-[#858A99] hover:text-[#242633] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white shadow-subtle shadow-[#7185E8]/25 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

