'use client';

import { X, Trash2 } from 'lucide-react';
import { DocumentItem } from '@/data/mock-data';

interface DeleteDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
}

export function DeleteDocumentModal({
  document: doc,
  isOpen,
  onClose,
  onConfirmDelete,
}: DeleteDocumentModalProps) {
  if (!isOpen || !doc) return null;

  const handleDelete = () => {
    onConfirmDelete(doc.id);
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
        <div className="flex items-start justify-between pb-3 border-b border-[#E9EAF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FDF2F2] text-[#E55353] flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#242633]">Delete document</h3>
              <p className="text-[11px] text-[#858A99] mt-0.5">
                Confirm removal from library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#F7F8FA] text-[#858A99] hover:text-[#242633] inline-flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs text-[#525666] leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-[#242633]">&ldquo;{doc.title}&rdquo;</span>?
          </p>
          <p className="text-[11px] text-[#858A99] leading-relaxed">
            Indexed chunks, semantic embeddings and document citations will be purged from the repository.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-[#E9EAF0]">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-xl border border-[#E9EAF0] hover:border-[#D8DAE5] bg-white text-xs font-medium text-[#858A99] hover:text-[#242633] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-9 px-4 rounded-xl bg-[#E55353] hover:bg-[#D64545] text-xs font-semibold text-white shadow-subtle shadow-[#E55353]/25 transition-colors"
          >
            Delete Document
          </button>
        </div>
      </div>
    </div>
  );
}

