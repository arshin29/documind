'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles, Layers, FileCheck, Loader2, AlertCircle } from 'lucide-react';
import { AppShell, useApp } from '@/components/layout/AppShell';
import {
  DocumentItem,
  parseDateAdded,
  parseFileSizeInBytes,
} from '@/data/mock-data';
import {
  DocumentsToolbar,
  DocumentSortOption,
  ViewMode,
} from '@/components/documents/DocumentsToolbar';
import {
  DocumentTypeFilter,
  DocumentStatusFilter,
} from '@/components/documents/DocumentFilters';
import { DocumentsTable } from '@/components/documents/DocumentsTable';
import { DocumentsGrid } from '@/components/documents/DocumentsGrid';
import { DocumentEmptyState } from '@/components/documents/DocumentEmptyState';
import { RenameDocumentModal } from '@/components/documents/RenameDocumentModal';
import { DeleteDocumentModal } from '@/components/documents/DeleteDocumentModal';

function DocumentsContent() {
  const router = useRouter();
  const {
    documents,
    isLoading,
    error,
    refreshDocuments,
    openUploadModal,
    openDocumentDrawer,
    deleteDocument,
    renameDocument,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentTypeFilter>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<DocumentSortOption>('recently-added');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Modal states for Rename and Delete
  const [renamingDoc, setRenamingDoc] = useState<DocumentItem | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);

  // Compute counts for filter badges
  const typeCounts = useMemo(() => {
    return {
      ALL: documents.length,
      PDF: documents.filter((d) => d.type === 'PDF').length,
      DOCX: documents.filter((d) => d.type === 'DOCX').length,
      TXT: documents.filter((d) => d.type === 'TXT').length,
    };
  }, [documents]);

  const statusCounts = useMemo(() => {
    return {
      ALL: documents.length,
      Ready: documents.filter((d) => d.status === 'Ready').length,
      Processing: documents.filter((d) => d.status === 'Processing').length,
      Failed: documents.filter((d) => d.status === 'Failed').length,
    };
  }, [documents]);

  const totalChunks = useMemo(() => {
    return documents.reduce((acc, doc) => acc + (doc.chunksCount || 0), 0);
  }, [documents]);

  // Filter and sort documents
  const filteredAndSortedDocs = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    const filtered = documents.filter((doc) => {
      const matchesSearch =
        !query ||
        doc.title.toLowerCase().includes(query) ||
        doc.summary.toLowerCase().includes(query) ||
        (doc.author && doc.author.toLowerCase().includes(query)) ||
        doc.keyTopics.some((topic) => topic.toLowerCase().includes(query));

      const matchesType =
        selectedType === 'ALL' || doc.type === selectedType;

      const matchesStatus =
        selectedStatus === 'ALL' || doc.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recently-added': {
          const dateDiff = parseDateAdded(b.dateAdded) - parseDateAdded(a.dateAdded);
          return dateDiff !== 0 ? dateDiff : b.id.localeCompare(a.id);
        }
        case 'oldest-first': {
          const dateDiff = parseDateAdded(a.dateAdded) - parseDateAdded(b.dateAdded);
          return dateDiff !== 0 ? dateDiff : a.id.localeCompare(b.id);
        }
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'largest-first':
          return parseFileSizeInBytes(b.size) - parseFileSizeInBytes(a.size);
        case 'smallest-first':
          return parseFileSizeInBytes(a.size) - parseFileSizeInBytes(b.size);
        default:
          return 0;
      }
    });
  }, [documents, searchTerm, selectedType, selectedStatus, sortBy]);

  const handleResetFilters = () => {
    setSelectedType('ALL');
    setSelectedStatus('ALL');
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E9EAF0]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#242633] tracking-tight">
              My Documents
            </h1>
            <span className="text-xs font-semibold text-[#7185E8] bg-[#EEF0FF] px-2.5 py-0.5 rounded-full border border-[#E0E4FA]">
              {documents.length} files
            </span>
          </div>
          <p className="text-xs text-[#858A99] mt-1">
            Knowledge library repository and indexed documents across your workspace.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Quick Metrics Badge on Desktop */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E9EAF0] shadow-subtle text-xs text-[#858A99]">
            <span className="flex items-center gap-1 font-mono text-[#242633]">
              <Layers className="w-3.5 h-3.5 text-[#7185E8]" />
              {totalChunks} chunks
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-[#29A36A]">
              <FileCheck className="w-3.5 h-3.5" />
              {statusCounts.Ready} ready
            </span>
          </div>

          {/* Ask AI Workspace Shortcut */}
          <button
            type="button"
            onClick={() => router.push('/workspace')}
            className="h-9 px-3 rounded-xl bg-white border border-[#E9EAF0] hover:border-[#D8DAE5] text-xs font-medium text-[#242633] flex items-center gap-1.5 shadow-subtle hover:bg-[#F7F8FA] transition-all"
            title="Open AI Workspace"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7185E8]" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {/* Primary Upload Document Button */}
          <button
            type="button"
            onClick={openUploadModal}
            className="h-9 px-4 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-white text-xs font-semibold flex items-center gap-1.5 shadow-subtle shadow-[#7185E8]/25 transition-all cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload Document</span>
          </button>
        </div>
      </section>

      {/* 2. Search and Filter Toolbar */}
      <DocumentsToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        typeCounts={typeCounts}
        statusCounts={statusCounts}
        totalFiltered={filteredAndSortedDocs.length}
      />

      {/* Error alert if any */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-[#FEF7ED] border border-[#FBE3CD] text-[#E6A13A] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => refreshDocuments()}
            className="font-medium underline hover:text-[#242633]"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Document Library Display / Empty States */}
      {isLoading && documents.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white border border-[#E9EAF0] shadow-subtle flex flex-col items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#7185E8] mb-3" />
          <p className="text-sm font-semibold text-[#242633]">Loading documents...</p>
          <p className="text-xs text-[#858A99] mt-1">Connecting to workspace database.</p>
        </div>
      ) : documents.length === 0 ? (
        <DocumentEmptyState
          type="no-documents"
          onUpload={openUploadModal}
        />
      ) : filteredAndSortedDocs.length === 0 ? (
        searchTerm ? (
          <DocumentEmptyState
            type="no-search-results"
            searchTerm={searchTerm}
            onClearSearch={handleClearSearch}
          />
        ) : (
          <DocumentEmptyState
            type="no-filter-matches"
            onResetFilters={handleResetFilters}
          />
        )
      ) : viewMode === 'list' ? (
        <DocumentsTable
          documents={filteredAndSortedDocs}
          totalDocumentsCount={documents.length}
          onPreview={openDocumentDrawer}
          onRename={(doc) => setRenamingDoc(doc)}
          onDelete={(doc) => setDeletingDoc(doc)}
        />
      ) : (
        <div className="space-y-4">
          <DocumentsGrid
            documents={filteredAndSortedDocs}
            onPreview={openDocumentDrawer}
            onRename={(doc) => setRenamingDoc(doc)}
            onDelete={(doc) => setDeletingDoc(doc)}
          />
          {/* Grid View Summary Bar */}
          <div className="px-4 py-3 rounded-2xl bg-white border border-[#E9EAF0] shadow-card flex items-center justify-between text-[11px] text-[#858A99]">
            <span>
              Showing <span className="font-semibold text-[#242633]">{filteredAndSortedDocs.length}</span> of {documents.length} documents
            </span>
            <span className="font-mono text-[#7185E8] bg-[#EEF0FF] px-2 py-0.5 rounded-md border border-[#E0E4FA]">
              Grid View &bull; {totalChunks} indexed chunks
            </span>
          </div>
        </div>
      )}

      {/* Rename Document Dialog */}
      <RenameDocumentModal
        document={renamingDoc}
        isOpen={Boolean(renamingDoc)}
        onClose={() => setRenamingDoc(null)}
        onRename={(id, newTitle) => renameDocument(id, newTitle)}
      />

      {/* Delete Document Confirmation Dialog */}
      <DeleteDocumentModal
        document={deletingDoc}
        isOpen={Boolean(deletingDoc)}
        onClose={() => setDeletingDoc(null)}
        onConfirmDelete={(id) => deleteDocument(id)}
      />
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <AppShell>
      <DocumentsContent />
    </AppShell>
  );
}

