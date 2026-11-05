'use client';

import { DocumentItem } from '@/data/mock-data';
import { DocumentCard } from './DocumentCard';

interface DocumentsGridProps {
  documents: DocumentItem[];
  onPreview: (doc: DocumentItem) => void;
  onRename: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
}

export function DocumentsGrid({
  documents,
  onPreview,
  onRename,
  onDelete,
}: DocumentsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 animate-in fade-in duration-200">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onPreview={onPreview}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

